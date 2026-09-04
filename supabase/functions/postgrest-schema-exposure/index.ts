import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

// ============================================================
// postgrest-schema-exposure
//
// Reads unprocessed schemas from _pending_postgrest_schemas,
// calls the Supabase Management API (GET → merge → PATCH)
// to expose them via PostgREST, then marks them processed.
//
// Can be invoked:
//   1. Immediately by client after provision_entity() RPC
//   2. Periodically by external cron (cron-job.org) for recovery
//
// Concurrency safety:
//   Uses row-level locking (SELECT FOR UPDATE) on the queue table
//   to prevent two concurrent invocations from processing the same rows.
//   Each invocation claims its batch, processes, and marks done.
//   If PATCH fails, rows remain locked until the next invocation
//   clears the lock after a 60-second timeout (safe for cron intervals).
//
// Requires secrets:
//   MANAGEMENT_API_TOKEN — PAT with rest:write scope
//   Set via: supabase secrets set MANAGEMENT_API_TOKEN=<token>
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const MANAGEMENT_API_TOKEN = Deno.env.get("MANAGEMENT_API_TOKEN");
const PROJECT_REF = Deno.env.get("PROJECT_REF");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MANAGEMENT_API_TOKEN || !PROJECT_REF) {
  throw new Error(
    "Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MANAGEMENT_API_TOKEN, PROJECT_REF"
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MANAGEMENT_API_BASE = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;
const REST_API = `${MANAGEMENT_API_BASE}/postgrest`;

Deno.serve(async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${MANAGEMENT_API_TOKEN}`,
  };

  try {
    // 1. Fetch pending rows with SELECT FOR UPDATE to claim them.
    //    Service-role bypasses RLS and acquires row-level locks.
    //    Rows locked by a concurrent invocation are skipped.
    //    Rows locked > 60s ago are stale (crashed invocation) — re-claim.
    const { data: pending, error: fetchErr } = await supabase.rpc(
      "claim_pending_pgrst_schemas"
    );

    if (fetchErr) {
      console.error("Failed to claim pending schemas:", fetchErr);
      return new Response(
        JSON.stringify({ error: "Failed to claim pending schemas", details: fetchErr.message }),
        { status: 500, headers }
      );
    }

    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ processed: 0, skipped: 0, message: "No pending schemas" }), {
        headers,
      });
    }

    console.log(`Claimed ${pending.length} pending schema(s):`, pending.map((r: { schema_name: string }) => r.schema_name));

    // 2. GET current PostgREST config from Management API
    const getRes = await fetch(REST_API, {
      method: "GET",
      headers,
    });

    if (!getRes.ok) {
      const errBody = await getRes.text();
      console.error(`Management API GET failed (${getRes.status}):`, errBody);
      // Release lock on claimed rows so they can be retried
      await supabase.rpc("release_pgrst_locks", { p_ids: pending.map((r: { id: number }) => r.id) });
      return new Response(
        JSON.stringify({ error: `Management API GET failed`, status: getRes.status, body: errBody }),
        { status: 500, headers }
      );
    }

    const config = await getRes.json();
    const currentSchemasStr: string = config.db_schema || "";
    const currentSchemas = currentSchemasStr
      ? currentSchemasStr.split(",").map((s: string) => s.trim())
      : [];

    // 3. Build updated list — skip schemas already exposed
    let processed = 0;
    let skipped = 0;
    const updatedSchemas = [...currentSchemas];

    for (const row of pending) {
      const schemaName = row.schema_name;

      if (currentSchemas.includes(schemaName)) {
        console.log(`Schema ${schemaName} already exposed, marking processed`);
        skipped++;
        await supabase
          .from("_pending_postgrest_schemas")
          .update({ processed: true, locked_at: null })
          .eq("id", row.id);
        continue;
      }

      updatedSchemas.push(schemaName);
      processed++;
    }

    // 4. PATCH if new schemas were added
    if (processed > 0) {
      const patchRes = await fetch(REST_API, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ db_schema: updatedSchemas.join(",") }),
      });

      if (!patchRes.ok) {
        const errBody = await patchRes.text();
        console.error(`Management API PATCH failed (${patchRes.status}):`, errBody);
        // Release locks so next invocation retries
        await supabase.rpc("release_pgrst_locks", { p_ids: pending.map((r: { id: number }) => r.id) });
        return new Response(
          JSON.stringify({ error: `Management API PATCH failed`, status: patchRes.status, body: errBody }),
          { status: 500, headers }
        );
      }

      console.log(`PATCH successful. Total schemas: ${updatedSchemas.length}`);
    }

    // 5. Mark claimed rows as processed
    for (const row of pending) {
      await supabase
        .from("_pending_postgrest_schemas")
        .update({ processed: true, locked_at: null })
        .eq("id", row.id);
    }

    return new Response(
      JSON.stringify({
        processed,
        skipped,
        total_schemas: updatedSchemas.length,
        pending_remaining: 0,
      }),
      { headers }
    );
  } catch (err) {
    console.error("Fatal error in postgrest-schema-exposure:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown fatal error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
