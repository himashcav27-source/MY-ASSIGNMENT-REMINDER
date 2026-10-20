
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const cronSecret = Deno.env.get("CRON_SECRET")!;
const deviceSetupToken = Deno.env.get("DEVICE_SETUP_TOKEN")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin":
    "https://himashcav27-source.github.io",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-token, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

webpush.setVapidDetails(
  "mailto:reminders@example.com",
  vapidPublicKey,
  vapidPrivateKey
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Register a phone/browser for push notifications.
  if (req.headers.get("x-device-token") === deviceSetupToken) {
    try {
      const { subscription } = await req.json();

      if (
        !subscription?.endpoint ||
        !subscription?.keys?.p256dh ||
        !subscription?.keys?.auth
      ) {
        return jsonResponse(
          { error: "Invalid push subscription" },
          400
        );
      }

      const { data: existing, error: lookupError } = await supabase
        .from("push_subscriptions")
        .select("id")
        .filter("subscription->>endpoint", "eq", subscription.endpoint)
        .limit(1);

      if (lookupError) throw lookupError;

      if (!existing?.length) {
        const { error } = await supabase
          .from("push_subscriptions")
          .insert({
            user_id: null,
            subscription,
          });

        if (error) throw error;
      }

      return jsonResponse({
        message: "Phone registered successfully!",
      });
    } catch (error) {
      console.error("Registration failed:", error);
      return jsonResponse(
        { error: "Phone registration failed" },
        500
      );
    }
  }

  // Scheduled reminder requests require the private cron secret.
  if (req.headers.get("x-cron-secret") !== cronSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const indiaDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const [year, month, day] = indiaDate.split("-").map(Number);
    const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));

    const deadline = [
      tomorrow.getUTCFullYear(),
      String(tomorrow.getUTCMonth() + 1).padStart(2, "0"),
      String(tomorrow.getUTCDate()).padStart(2, "0"),
    ].join("-");

    const { data: assignments, error: assignmentError } = await supabase
      .from("assignments")
      .select("id, subject, assignment_name, deadline")
      .eq("deadline", deadline)
      .eq("completed", false);

    if (assignmentError) throw assignmentError;

    if (!assignments?.length) {
      return jsonResponse({
        message: "No pending assignments due tomorrow.",
        deadline,
      });
    }

    const { data: subscriptions, error: subscriptionError } =
      await supabase
        .from("push_subscriptions")
        .select("id, subscription");

    if (subscriptionError) throw subscriptionError;

    if (!subscriptions?.length) {
      return jsonResponse({
        message: "No push subscriptions are registered.",
        assignmentsFound: assignments.length,
      });
    }

    let sent = 0;
    let failed = 0;

    for (const assignment of assignments) {
      const payload = JSON.stringify({
        title: "MIT Assignment Reminder 💜",
        body: `${assignment.subject}: ${assignment.assignment_name} is due tomorrow!`,
        url: "/MY-ASSIGNMENT-REMINDER/",
      });

      for (const row of subscriptions) {
        try {
          await webpush.sendNotification(row.subscription, payload);
          sent++;
        } catch (error) {
          failed++;
          console.error("Push delivery failed:", error);

          const statusCode = (error as { statusCode?: number })?.statusCode;

          if (statusCode === 404 || statusCode === 410) {
            const { error: deleteError } = await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", row.id);

            if (deleteError) {
              console.error("Could not remove expired subscription:", deleteError);
            }
          }
        }
      }
    }

    return jsonResponse({
      message: "Reminder check completed.",
      deadline,
      assignmentsFound: assignments.length,
      notificationsSent: sent,
      notificationsFailed: failed,
    });
  } catch (error) {
    console.error("Reminder function error:", error);
    return jsonResponse(
      { error: "Reminder check failed. Check the function logs." },
      500
    );
  }
});
