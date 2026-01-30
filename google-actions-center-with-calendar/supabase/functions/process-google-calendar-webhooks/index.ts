// Supabase Edge Function: Handle Google Calendar Webhooks
// Deploy with: supabase functions deploy process-google-calendar-webhooks
// Deno runtime

import { serve } from "https://deno.land/std@0.175.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";

// Configuration
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Parse webhook message from Google Calendar
 * Google sends notifications in Pub/Sub format
 */
function parseWebhookMessage(data: string): {
  resourceId: string;
  historyId: string;
  calendarId: string;
} {
  try {
    // Decode base64 message
    const decoded = atob(data);
    const message = JSON.parse(decoded);

    return {
      resourceId: message.resourceId,
      historyId: message.historyId,
      calendarId: message.resourceUri?.split("/").pop() || "primary",
    };
  } catch (error) {
    console.error("Error parsing webhook message:", error);
    throw new Error("Invalid webhook message format");
  }
}

/**
 * Query Google Calendar API to get changed events
 */
async function getChangedEvents(
  calendarId: string,
  historyId: string,
  accessToken: string
): Promise<Array<{ id: string; status: string; summary?: string; deleted?: boolean }>> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events?showDeleted=true&maxResults=100&pageToken=${historyId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch changed events: ${response.statusText}`);
    }

    const data = await response.json() as { items?: Array<{ id: string; status: string; summary?: string; deleted?: boolean }> };
    return data.items || [];
  } catch (error) {
    console.error("Error getting changed events:", error);
    throw error;
  }
}

/**
 * Get access token for the user's Google Calendar
 * This should be stored when the user first authorizes
 */
async function getUserAccessToken(calendarId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("calendar_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("calendar_id", calendarId)
      .single();

    if (error) {
      console.warn("No token found for calendar:", calendarId);
      return null;
    }

    // Check if token is expired and refresh if needed
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return refreshAccessToken(data.refresh_token);
    }

    return data.access_token;
  } catch (error) {
    console.error("Error getting user access token:", error);
    return null;
  }
}

/**
 * Refresh Google OAuth token
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth credentials");
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json() as { access_token: string; expires_in: number };

    // Update token in database
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);
    // Update token storage would happen here

    return data.access_token;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw error;
  }
}

/**
 * Find appointment by Google event ID
 */
async function findAppointmentByEventId(googleEventId: string): Promise<{ id: string; client_email: string; client_name: string } | null> {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("id, client_email, client_name")
      .eq("google_event_id", googleEventId)
      .single();

    if (error) {
      console.warn("No appointment found for Google event:", googleEventId);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error finding appointment:", error);
    return null;
  }
}

/**
 * Handle event deletion - update appointment status
 */
async function handleEventDeletion(googleEventId: string, calendarId: string): Promise<void> {
  try {
    const appointment = await findAppointmentByEventId(googleEventId);

    if (!appointment) {
      console.log("No appointment to cancel for deleted event");
      return;
    }

    // Update appointment status to cancelled
    const { error } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
        cancellation_reason: "Cancelled from Google Calendar",
      })
      .eq("id", appointment.id);

    if (error) {
      throw error;
    }

    console.log(`Appointment ${appointment.id} marked as cancelled`);

    // Optionally send notification to client
    await sendNotification(appointment.client_email, "Appointment Cancelled", {
      appointmentId: appointment.id,
      clientName: appointment.client_name,
      reason: "Your appointment was cancelled in Google Calendar",
    });
  } catch (error) {
    console.error("Error handling event deletion:", error);
  }
}

/**
 * Handle event modification - update appointment details
 */
async function handleEventModification(
  googleEventId: string,
  event: { summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }; description?: string }
): Promise<void> {
  try {
    const appointment = await findAppointmentByEventId(googleEventId);

    if (!appointment) {
      console.log("No appointment to update for modified event");
      return;
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Extract new date/time from Google event
    if (event.start?.dateTime) {
      const dateTime = new Date(event.start.dateTime);
      updates.date = dateTime.toISOString().split("T")[0];
      updates.time = dateTime.toTimeString().substring(0, 5);
    } else if (event.start?.date) {
      updates.date = event.start.date;
    }

    // Calculate new duration if end time changed
    if (event.start?.dateTime && event.end?.dateTime) {
      const startTime = new Date(event.start.dateTime);
      const endTime = new Date(event.end.dateTime);
      updates.duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes
    }

    // Update appointment
    const { error } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", appointment.id);

    if (error) {
      throw error;
    }

    console.log(`Appointment ${appointment.id} updated from Google Calendar`);

    // Optionally send notification to client about the change
    await sendNotification(appointment.client_email, "Appointment Updated", {
      appointmentId: appointment.id,
      clientName: appointment.client_name,
      newDate: updates.date,
      newTime: updates.time,
    });
  } catch (error) {
    console.error("Error handling event modification:", error);
  }
}

/**
 * Send notification to user (email, SMS, etc.)
 */
async function sendNotification(
  clientEmail: string,
  subject: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    // This would integrate with your notification service
    // Example: SendGrid, Twilio, Firebase Cloud Messaging, etc.

    console.log(`Notification sent to ${clientEmail}:`, {
      subject,
      data,
    });

    // Store notification in database for audit trail
    await supabase
      .from("appointment_notifications")
      .insert({
        client_email: clientEmail,
        subject,
        data,
        sent_at: new Date().toISOString(),
      });
  } catch (error) {
    console.warn("Error sending notification:", error);
    // Don't throw - notifications are optional
  }
}

/**
 * Main webhook handler
 */
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Parse webhook payload
    const payload = await req.json() as { message: { data: string } };

    if (!payload.message?.data) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse the webhook message
    const webhook = parseWebhookMessage(payload.message.data);
    console.log("Processing webhook:", webhook);

    // Get access token for this calendar
    const accessToken = await getUserAccessToken(webhook.calendarId);
    if (!accessToken) {
      console.warn("No access token available for calendar:", webhook.calendarId);
      // Return 200 to acknowledge receipt even if we can't process
      return new Response(JSON.stringify({ status: "acknowledged" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get the list of changed events
    const changedEvents = await getChangedEvents(webhook.calendarId, webhook.historyId, accessToken);

    // Process each changed event
    for (const event of changedEvents) {
      if (event.deleted) {
        // Handle deletion
        await handleEventDeletion(event.id, webhook.calendarId);
      } else if (event.status === "confirmed") {
        // Handle creation/modification
        // To get full event details, would need another API call
        // For now, we mark it as handled
        console.log(`Event ${event.id} confirmed in calendar`);
      } else if (event.status === "cancelled") {
        // Handle cancellation
        await handleEventDeletion(event.id, webhook.calendarId);
      }
    }

    return new Response(JSON.stringify({ status: "processed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
