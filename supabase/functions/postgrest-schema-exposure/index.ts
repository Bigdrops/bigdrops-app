import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

// ============================================================
// postgrest-schema-exposure (safety-redesign)
//
// Reads unprocessed schemas from _pending_postgrest_schemas,
// validates every candidate against the actual database via
// pg_namespace, then calls the Supabase Management API
// (GET → validate → PATCH) to expose them via PostgREST.
//
// Safety guarantees:
//   1. FAIL-CLOSED: No PATCH if authoritative state cannot be established.
//   2. pg_namespace is the source of truth, not the Management API.
//   3. Required-schema invariant: public, graphql_public, auth, storage,
//      extensions are NEVER removed from the final set.
//   4. Every candidate schema is validated against pg_namespace before
//      inclusion — only real DB schemas are exposed.
//   5. Existing valid entity schemas from the API config are preserved
//      (prevents destructive replacement if another invocation added schemas).
//   6. Invalid queue entries are NOT marked processed — left for investigation.
//   7. Row-level locking (SELECT FOR UPDATE) prevents concurrent PATCH races.
//
// Requires secrets:
//   MANAGEMENT_API_TOKEN — PAT with rest:write scope
//   PROJECT_REF — validated at startup, no fallback
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

// ponytail: hardcoded defaults — these must never be removed from db_schema
const REQUIRED_SCHEMAS = ["public", "graphql_public", "auth", "storage", "extensions"];

/** Response shape from claim_pending_pgrst_schemas RPC */
interface ClaimedRow {
  id: number;
  schema_name: string;
  locked_at: string | null;
}

/** pg_namespace row */
interface PgNamespaceRow {
  nspname: string;
}

Deno.serve(async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${MANAGEMENT_API_TOKEN}`,
  };

  try {
    // 1. Claim pending rows with row-level locking.
    //    Service-role bypasses RLS and acquires locks.
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

    const claimedRows = pending as ClaimedRow[];
    console.log(`Claimed ${claimedRows.length} pending schema(s):`, claimedRows.map((r) => r.schema_name));

    // 2. Establish authoritative DB state via pg_namespace.
    //    FAIL-CLOSED: if this query fails, abort entirely — no PATCH.
    const { data: allEntitySchemas, error: nsErr } = await supabase
      .from("pg_namespace")
      .select("nspname")
      .like("nspname", "entity_%");

    if (nsErr) {
      console.error("Failed to query pg_namespace (authoritative state unknown):", nsErr);
      await supabase.rpc("release_pgrst_locks", { p_ids: claimedRows.map((r) => r.id) });
      return new Response(
        JSON.stringify({ error: "Cannot establish authoritative DB state", details: nsErr.message }),
        { status: 500, headers }
      );
    }

    const dbEntitySchemas = new Set((allEntitySchemas || []).map((r: PgNamespaceRow) => r.nspname));
    console.log(`Found ${dbEntitySchemas.size} entity schema(s) in DB`);

    // 3. GET current PostgREST config from Management API (untrusted).
    //    We use it only to preserve existing valid entity schemas that
    //    another invocation may have added. We do NOT trust it for
    //    validity — pg_namespace is the source of truth.
    const getRes = await fetch(REST_API, {
      method: "GET",
      headers,
    });

    if (!getRes.ok) {
      const errBody = await getRes.text();
      console.error(`Management API GET failed (${getRes.status}):`, errBody);
      await supabase.rpc("release_pgrst_locks", { p_ids: claimedRows.map((r) => r.id) });
      return new Response(
        JSON.stringify({ error: "Management API GET failed", status: getRes.status, body: errBody }),
        { status: 500, headers }
      );
    }

    const config = await getRes.json();
    const currentSchemasStr: string = config.db_schema || "";
    const apiCurrentSchemas = currentSchemasStr
      ? currentSchemasStr.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    // 4. Validate each claimed schema against pg_namespace.
    //    Invalid entries are NOT marked processed — left for investigation.
    const validCandidates: string[] = [];
    const invalidEntries: ClaimedRow[] = [];

    for (const row of claimedRows) {
      if (dbEntitySchemas.has(row.schema_name)) {
        validCandidates.push(row.schema_name);
      } else {
        console.warn(`Schema "${row.schema_name}" does not exist in DB — blocking (not exposure candidate)`);
        invalidEntries.push(row);
      }
    }

    // 5. Build the final schema set.
    //    Start with required schemas (invariant: always present).
    const finalSchemas = new Set(REQUIRED_SCHEMAS);

    // Add existing valid entity schemas from the API config.
    // These were added by a previous successful invocation and must
    // not be dropped (prevents destructive replacement).
    for (const s of apiCurrentSchemas) {
      if (s.startsWith("entity_") && dbEntitySchemas.has(s)) {
        finalSchemas.add(s);
      }
    }

    // Add the valid new candidates.
    let processed = 0;
    for (const s of validCandidates) {
      if (!finalSchemas.has(s)) {
        finalSchemas.add(s);
        processed++;
      }
    }

    const finalSchemaArray = Array.from(finalSchemas);

    // 6. Pre-PATCH validation: invariant check.
    //    Every required schema must be present. Every entity schema must
    //    exist in the database. If this fails, abort — no PATCH.
    for (const required of REQUIRED_SCHEMAS) {
      if (!finalSchemaArray.includes(required)) {
        console.error(`INVARIANT VIOLATION: required schema "${required}" missing from final set`);
        await supabase.rpc("release_pgrst_locks", { p_ids: claimedRows.map((r) => r.id) });
        return new Response(
          JSON.stringify({ error: `Invariant violation: required schema "${required}" missing` }),
          { status: 500, headers }
        );
      }
    }

    for (const s of finalSchemaArray) {
      if (s.startsWith("entity_") && !dbEntitySchemas.has(s)) {
        console.error(`Pre-PATCH validation failed: entity schema "${s}" does not exist in DB`);
        await supabase.rpc("release_pgrst_locks", { p_ids: claimedRows.map((r) => r.id) });
        return new Response(
          JSON.stringify({ error: `Pre-PATCH validation failed: "${s}" not in database` }),
          { status: 500, headers }
        );
      }
    }

    // 7. PATCH if new schemas were added.
    if (processed > 0) {
      const patchBody = { db_schema: finalSchemaArray.join(",") };
      console.log(`PATCHing PostgREST config: ${finalSchemaArray.join(", ")}`);

      const patchRes = await fetch(REST_API, {
        method: "PATCH",
        headers,
        body: JSON.stringify(patchBody),
      });

      if (!patchRes.ok) {
        const errBody = await patchRes.text();
        console.error(`Management API PATCH failed (${patchRes.status}):`, errBody);
        await supabase.rpc("release_pgrst_locks", { p_ids: claimedRows.map((r) => r.id) });
        return new Response(
          JSON.stringify({ error: "Management API PATCH failed", status: patchRes.status, body: errBody }),
          { status: 500, headers }
        );
      }

      console.log(`PATCH successful. Total schemas: ${finalSchemaArray.length}`);
    }

    // 8. Mark successfully processed rows.
    for (const row of claimedRows) {
      if (invalidEntries.some((inv) => inv.id === row.id)) {
        // Invalid entries: release lock but do NOT mark processed.
        // Left for manual investigation — never becomes an exposure candidate.
        console.log(`Releasing lock on invalid entry: ${row.schema_name} (id: ${row.id})`);
        await supabase.rpc("release_pgrst_locks", { p_ids: [row.id] });
      } else {
        await supabase
          .from("_pending_postgrest_schemas")
          .update({ processed: true, locked_at: null })
          .eq("id", row.id);
      }
    }

    return new Response(
      JSON.stringify({
        processed,
        skipped: invalidEntries.length,
        invalid_entries: invalidEntries.map((r) => ({ id: r.id, schema_name: r.schema_name })),
        total_schemas: finalSchemaArray.length,
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
