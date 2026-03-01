import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

Deno.serve(async (_req: Request) => {
  try {
    // Use service role key to bypass RLS (system-level operation)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    // Find due reminders:
    // - Not completed
    // - Not already notified
    // - event_time minus notify_before_minutes is in the past (notification window is open)
    // - event_time is not more than 6 hours ago (don't notify very old items)
    const { data: reminders, error: queryError } = await supabase
      .from("reminders")
      .select("*")
      .eq("completed", false)
      .is("last_notified_at", null)
      .gt("event_time", sixHoursAgo.toISOString())
      .lte("event_time", new Date(now.getTime() + 60 * 60 * 1000).toISOString()); // Within next hour + notify_before window

    if (queryError) {
      return jsonResponse({ error: queryError.message }, 500);
    }

    // Filter by notify_before_minutes
    const dueReminders = (reminders || []).filter((r: {
      event_time: string;
      notify_before_minutes: number;
    }) => {
      const eventTime = new Date(r.event_time);
      const notifyAt = new Date(
        eventTime.getTime() - (r.notify_before_minutes || 15) * 60 * 1000
      );
      return now >= notifyAt;
    });

    let notificationsSent = 0;

    for (const reminder of dueReminders) {
      // Fetch user's push subscriptions
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", reminder.user_id);

      if (!subscriptions || subscriptions.length === 0) continue;

      const eventTime = new Date(reminder.event_time);
      const timeStr = eventTime.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      const payload = JSON.stringify({
        title: `⏰ ${reminder.title}`,
        body: `${reminder.description || reminder.title}\n${timeStr}`,
        tag: `reminder-${reminder.id}`,
        url: "/",
      });

      for (const sub of subscriptions) {
        try {
          // Send web push notification
          await sendWebPush(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth_key },
            },
            payload
          );
          notificationsSent++;
        } catch (err) {
          console.error(
            `Failed to send push to ${sub.endpoint}:`,
            err instanceof Error ? err.message : err
          );
          // If subscription is invalid (410 Gone), remove it
          if (err instanceof Error && err.message.includes("410")) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }
        }
      }

      // Mark as notified
      await supabase
        .from("reminders")
        .update({ last_notified_at: now.toISOString() })
        .eq("id", reminder.id);
    }

    return jsonResponse({
      success: true,
      checked: dueReminders.length,
      notificationsSent,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string
) {
  // Use the web-push protocol
  // For self-hosted Supabase, we use a simplified approach
  // that posts to the push endpoint with proper VAPID headers
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high",
    },
    body: payload,
  });

  if (!response.ok) {
    throw new Error(`Push failed: ${response.status} ${response.statusText}`);
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
