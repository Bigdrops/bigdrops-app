import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  console.log("Push dispatch process started");

  if (!FCM_SERVER_KEY) {
    console.error("FCM_SERVER_KEY is missing in environment variables");
    return new Response(
      JSON.stringify({ error: "FCM_SERVER_KEY environment variable is missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const summary = {
    scanned: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    // 1. Fetch pending notifications
    // Criteria: state = 'unread', read_at IS NULL, dismissed_at IS NULL, user_id IS NOT NULL
    const { data: notifications, error: notifError } = await supabase
      .from("notifications")
      .select("*")
      .eq("state", "unread")
      .is("read_at", null)
      .is("dismissed_at", null)
      .not("user_id", "is", null);

    if (notifError) {
      console.error("Failed to fetch pending notifications:", notifError);
      throw notifError;
    }

    summary.scanned = notifications?.length || 0;

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify(summary), {
        headers: { "Content-Type": "application/json" },
      });
    }

    for (const notification of notifications) {
      try {
        // 2. Skip notifications that already have a successful push log
        const { data: existingLog } = await supabase
          .from("push_delivery_logs")
          .select("id")
          .eq("notification_id", notification.id)
          .eq("status", "sent")
          .maybeSingle();

        if (existingLog) {
          summary.skipped++;
          continue;
        }

        // 3. Respect push preferences
        // only send if user has at least one enabled notification_preferences row where channel = 'push'
        const { data: pref, error: prefError } = await supabase
          .from("notification_preferences")
          .select("enabled")
          .eq("user_id", notification.user_id)
          .eq("channel", "push")
          .eq("enabled", true)
          .limit(1)
          .maybeSingle();

        if (prefError) {
          console.error(`Preference lookup failed for user ${notification.user_id}:`, prefError);
          // Continue to next notification
          summary.failed++;
          continue;
        }

        if (!pref) {
          await logDelivery(notification.id, notification.user_id, null, "skipped", "No push preference enabled");
          summary.skipped++;
          continue;
        }

        // 4. Fetch active device tokens
        const { data: tokens, error: tokenError } = await supabase
          .from("push_device_tokens")
          .select("id, token")
          .eq("user_id", notification.user_id)
          .is("revoked_at", null);

        if (tokenError) {
          console.error(`Error fetching tokens for user ${notification.user_id}:`, tokenError);
          summary.failed++;
          continue;
        }

        if (!tokens || tokens.length === 0) {
          await logDelivery(notification.id, notification.user_id, null, "skipped", "No active tokens");
          summary.skipped++;
          continue;
        }

        // 5. Send push to each token
        for (const t of tokens) {
          try {
            const pushResult = await sendFCM(t.token, notification);
            if (pushResult.success) {
              await logDelivery(
                notification.id,
                notification.user_id,
                t.id,
                "sent",
                null,
                pushResult.messageId
              );
              summary.sent++;
            } else {
              await logDelivery(
                notification.id,
                notification.user_id,
                t.id,
                "failed",
                pushResult.error
              );
              summary.failed++;
            }
          } catch (tokenErr) {
            console.error(`Token dispatch error for ${t.id}:`, tokenErr);
            await logDelivery(
              notification.id,
              notification.user_id,
              t.id,
              "failed",
              tokenErr instanceof Error ? tokenErr.message : "Unknown token error"
            );
            summary.failed++;
          }
        }
      } catch (notifErr) {
        console.error(`Processing error for notification ${notification.id}:`, notifErr);
        summary.failed++;
        // Do not crash the whole loop
      }
    }

    return new Response(JSON.stringify(summary), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Fatal error in dispatch-push-notifications:", err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : "Unknown fatal error", 
        summary 
      }), 
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Logs the delivery attempt in push_delivery_logs.
 */
async function logDelivery(
  notificationId: string,
  userId: string,
  tokenId: string | null,
  status: "sent" | "failed" | "skipped",
  error: string | null,
  messageId?: string
) {
  const { error: insertError } = await supabase.from("push_delivery_logs").insert({
    notification_id: notificationId,
    user_id: userId,
    token_id: tokenId,
    provider: "fcm",
    provider_message_id: messageId || null,
    status,
    error: error || null,
    sent_at: status === "skipped" ? null : new Date().toISOString(),
  });

  if (insertError) {
    console.error(`Failed to log ${status} status for notification ${notificationId}:`, insertError);
  }
}

/**
 * Sends a push notification via FCM Legacy HTTP API.
 */
async function sendFCM(token: string, notification: any) {
  const payload = {
    to: token,
    notification: {
      title: notification.title,
      body: notification.message,
    },
    data: {
      notification_id: notification.id,
      route: notification.route || "",
      entity_type: notification.entity_type || "",
      entity_id: notification.entity_id || "",
      domain: notification.domain || "",
      generator_key: notification.generator_key || "",
    },
    priority: "high",
  };

  const response = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, error: `HTTP ${response.status}: ${errorText}` };
  }

  const result = await response.json();
  // FCM Legacy response structure: { multicast_id, success, failure, results: [{ message_id, error }] }
  if (result.success === 1) {
    return { success: true, messageId: result.results?.[0]?.message_id };
  } else {
    return { success: false, error: result.results?.[0]?.error || "FCM Delivery Failed" };
  }
}
