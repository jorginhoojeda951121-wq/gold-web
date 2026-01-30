/**
 * Supabase Edge Function: process-google-calendar-webhooks
 * Handles Google Calendar push notifications; syncs event changes to appointments table.
 * Deploy: supabase functions deploy process-google-calendar-webhooks
 * Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET in function secrets for token refresh.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function parseWebhookMessage(data: string): {
  resourceId: string;
  historyId: string;
  calendarId: string;
} {
  try {
    const decoded = atob(data);
    const message = JSON.parse(decoded) as { resourceId?: string; historyId?: string; resourceUri?: string };
    const calendarId = message.resourceUri?.split('/').pop() || 'primary';
    return {
      resourceId: message.resourceId || '',
      historyId: message.historyId || '',
      calendarId,
    };
  } catch (err) {
    console.error('Error parsing webhook message:', err);
    throw new Error('Invalid webhook message format');
  }
}

async function getChangedEvents(
  calendarId: string,
  historyId: string,
  accessToken: string
): Promise<Array<{ id: string; status: string; summary?: string; deleted?: boolean }>> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?showDeleted=true&maxResults=100&pageToken=${historyId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!response.ok) throw new Error(`Failed to fetch changed events: ${response.statusText}`);
  const data = (await response.json()) as { items?: Array<{ id: string; status: string; summary?: string; deleted?: boolean }> };
  return data.items || [];
}

async function getUserAccessToken(calendarId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('calendar_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('calendar_id', calendarId)
    .single();

  if (error || !data) return null;
  const row = data as { access_token: string; refresh_token?: string; expires_at?: string };

  if (row.expires_at && new Date(row.expires_at) < new Date() && row.refresh_token) {
    return refreshAccessToken(row.refresh_token);
  }
  return row.access_token;
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Missing Google OAuth credentials');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });
  if (!response.ok) throw new Error('Failed to refresh token');
  const data = (await response.json()) as { access_token: string; expires_in: number };
  return data.access_token;
}

async function findAppointmentByEventId(
  googleEventId: string
): Promise<{ id: string; client_email: string; client_name: string } | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, client_email, client_name')
    .eq('google_event_id', googleEventId)
    .single();

  if (error || !data) return null;
  return data as { id: string; client_email: string; client_name: string };
}

async function handleEventDeletion(googleEventId: string): Promise<void> {
  const appointment = await findAppointmentByEventId(googleEventId);
  if (!appointment) return;

  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
      cancellation_reason: 'Cancelled from Google Calendar',
    })
    .eq('id', appointment.id);

  if (error) throw error;
  console.log(`Appointment ${appointment.id} marked as cancelled`);

  await sendNotification(appointment.client_email, 'Appointment Cancelled', {
    appointmentId: appointment.id,
    clientName: appointment.client_name,
    reason: 'Your appointment was cancelled in Google Calendar',
  });
}

async function sendNotification(
  clientEmail: string,
  subject: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('appointment_notifications').insert({
      client_email: clientEmail,
      subject,
      data,
      sent_at: new Date().toISOString(),
    });
  } catch {
    // optional
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = (await req.json()) as { message?: { data?: string } };
    if (!payload.message?.data) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const webhook = parseWebhookMessage(payload.message.data);
    const accessToken = await getUserAccessToken(webhook.calendarId);
    if (!accessToken) {
      return new Response(JSON.stringify({ status: 'acknowledged' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const changedEvents = await getChangedEvents(webhook.calendarId, webhook.historyId, accessToken);
    for (const event of changedEvents) {
      if (event.deleted || event.status === 'cancelled') {
        await handleEventDeletion(event.id);
      }
    }

    return new Response(JSON.stringify({ status: 'processed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
