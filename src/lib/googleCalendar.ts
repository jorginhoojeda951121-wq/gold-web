/**
 * Google Calendar Integration for Reservations
 * Automatically sync reservations to Google Calendar
 */

import { getSupabase } from './supabase';

// Google Calendar API configuration
const GOOGLE_CALENDAR_API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY || '';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.events';

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  colorId?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

interface Reservation {
  id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  event_type: string;
  event_date: string;
  event_description?: string;
  pickup_date?: string;
  return_date?: string;
  status: string;
  special_requests?: string;
  total_amount: number;
}

// Event color IDs in Google Calendar
const EVENT_COLORS = {
  wedding: '10', // Green
  anniversary: '11', // Red
  engagement: '9', // Blue
  birthday: '5', // Yellow
  festival: '6', // Orange
  other: '8', // Gray
};

// Status colors
const STATUS_COLORS = {
  pending: '5', // Yellow
  confirmed: '10', // Green
  ready: '9', // Blue
  picked_up: '7', // Cyan
  returned: '8', // Gray
  cancelled: '11', // Red
};

/**
 * Initialize Google Calendar API
 */
export async function initializeGoogleCalendar(): Promise<boolean> {
  try {
    // Load the Google API client library
    await loadGoogleAPI();
    
    // Initialize the client
    await new Promise<void>((resolve, reject) => {
      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({
            apiKey: GOOGLE_CALENDAR_API_KEY,
            clientId: GOOGLE_CLIENT_ID,
            discoveryDocs: GOOGLE_API_DISCOVERY_DOCS,
            scope: GOOGLE_SCOPES,
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize Google Calendar API:', error);
    return false;
  }
}

/**
 * Load Google API script dynamically
 */
function loadGoogleAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof gapi !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google API'));
    document.body.appendChild(script);
  });
}

/**
 * Sign in to Google Account
 */
export async function signInToGoogle(): Promise<boolean> {
  try {
    if (!gapi?.auth2) {
      await initializeGoogleCalendar();
    }

    const auth = gapi.auth2.getAuthInstance();
    if (!auth) {
      throw new Error('Google Auth not initialized');
    }

    if (auth.isSignedIn.get()) {
      return true;
    }

    await auth.signIn();
    return auth.isSignedIn.get();
  } catch (error) {
    console.error('Failed to sign in to Google:', error);
    return false;
  }
}

/**
 * Sign out from Google Account
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    const auth = gapi.auth2.getAuthInstance();
    if (auth) {
      await auth.signOut();
    }
  } catch (error) {
    console.error('Failed to sign out from Google:', error);
  }
}

/**
 * Check if user is signed in to Google
 */
export function isGoogleSignedIn(): boolean {
  try {
    const auth = gapi?.auth2?.getAuthInstance();
    return auth?.isSignedIn?.get() || false;
  } catch {
    return false;
  }
}

/**
 * Create a calendar event from a reservation
 */
export async function createCalendarEvent(reservation: Reservation): Promise<string | null> {
  try {
    if (!isGoogleSignedIn()) {
      const signedIn = await signInToGoogle();
      if (!signedIn) {
        throw new Error('Not signed in to Google Calendar');
      }
    }

    const event = reservationToCalendarEvent(reservation);

    const response = await gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      sendUpdates: 'all',
    });

    // Store the Google Calendar event ID in Supabase
    if (response.result.id) {
      await saveCalendarEventId(reservation.id, response.result.id);
    }

    return response.result.id || null;
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    return null;
  }
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(reservation: Reservation, calendarEventId: string): Promise<boolean> {
  try {
    if (!isGoogleSignedIn()) {
      const signedIn = await signInToGoogle();
      if (!signedIn) {
        throw new Error('Not signed in to Google Calendar');
      }
    }

    const event = reservationToCalendarEvent(reservation);

    await gapi.client.calendar.events.update({
      calendarId: 'primary',
      eventId: calendarEventId,
      resource: event,
      sendUpdates: 'all',
    });

    return true;
  } catch (error) {
    console.error('Failed to update calendar event:', error);
    return false;
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(calendarEventId: string): Promise<boolean> {
  try {
    if (!isGoogleSignedIn()) {
      return false;
    }

    await gapi.client.calendar.events.delete({
      calendarId: 'primary',
      eventId: calendarEventId,
      sendUpdates: 'all',
    });

    return true;
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    return false;
  }
}

/**
 * Convert reservation to Google Calendar event
 */
function reservationToCalendarEvent(reservation: Reservation): CalendarEvent {
  const eventDate = new Date(reservation.event_date);
  const pickupDate = reservation.pickup_date ? new Date(reservation.pickup_date) : null;
  
  // Set event time to 10:00 AM local time
  eventDate.setHours(10, 0, 0, 0);
  
  // Event ends at 6:00 PM
  const endDate = new Date(eventDate);
  endDate.setHours(18, 0, 0, 0);

  const eventEmoji = {
    wedding: '💍',
    anniversary: '❤️',
    engagement: '💎',
    birthday: '🎂',
    festival: '🪔',
    other: '📦',
  }[reservation.event_type] || '📦';

  const statusEmoji = {
    pending: '⏳',
    confirmed: '✅',
    ready: '📦',
    picked_up: '🚚',
    returned: '↩️',
    cancelled: '❌',
  }[reservation.status] || '⏳';

  const description = `
${statusEmoji} Status: ${reservation.status.toUpperCase()}

👤 Customer: ${reservation.customer_name}
📞 Phone: ${reservation.customer_phone}
${reservation.customer_email ? `📧 Email: ${reservation.customer_email}` : ''}

${eventEmoji} Event: ${reservation.event_type.toUpperCase()}
${reservation.event_description ? `📝 ${reservation.event_description}` : ''}

${pickupDate ? `📅 Pickup Date: ${pickupDate.toLocaleDateString()}` : ''}
${reservation.return_date ? `🔙 Return Date: ${new Date(reservation.return_date).toLocaleDateString()}` : ''}

${reservation.special_requests ? `⭐ Special Requests:\n${reservation.special_requests}` : ''}

💰 Total Amount: ₹${reservation.total_amount.toLocaleString('en-IN')}

🔗 Reservation ID: ${reservation.id}
  `.trim();

  const event: CalendarEvent = {
    summary: `${eventEmoji} ${reservation.event_type.toUpperCase()}: ${reservation.customer_name}`,
    description: description,
    location: 'Your Jewelry Store', // You can make this configurable
    start: {
      dateTime: eventDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    colorId: EVENT_COLORS[reservation.event_type as keyof typeof EVENT_COLORS] || EVENT_COLORS.other,
    status: reservation.status === 'cancelled' ? 'cancelled' : 'confirmed',
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 * 7 }, // 1 week before
        { method: 'email', minutes: 24 * 60 * 3 }, // 3 days before
        { method: 'popup', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 60 }, // 1 hour before
      ],
    },
  };

  // Add customer email if available
  if (reservation.customer_email) {
    event.attendees = [
      {
        email: reservation.customer_email,
        displayName: reservation.customer_name,
      },
    ];
  }

  return event;
}

/**
 * Save Google Calendar event ID to Supabase
 */
async function saveCalendarEventId(reservationId: string, calendarEventId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    
    // Add calendar_event_id column if it doesn't exist (handled by migration)
    await supabase
      .from('reservations')
      .update({ 
        calendar_event_id: calendarEventId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId);
  } catch (error) {
    console.error('Failed to save calendar event ID:', error);
  }
}

/**
 * Get calendar event ID for a reservation
 */
export async function getCalendarEventId(reservationId: string): Promise<string | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('reservations')
      .select('calendar_event_id')
      .eq('id', reservationId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.calendar_event_id || null;
  } catch (error) {
    console.error('Failed to get calendar event ID:', error);
    return null;
  }
}

/**
 * Sync reservation to Google Calendar
 * This is the main function to call when creating/updating reservations
 */
export async function syncReservationToCalendar(reservation: Reservation): Promise<boolean> {
  try {
    // Check if calendar event already exists
    const existingEventId = await getCalendarEventId(reservation.id);

    if (existingEventId) {
      // Update existing event
      return await updateCalendarEvent(reservation, existingEventId);
    } else {
      // Create new event
      const eventId = await createCalendarEvent(reservation);
      return eventId !== null;
    }
  } catch (error) {
    console.error('Failed to sync reservation to calendar:', error);
    return false;
  }
}

/**
 * Remove reservation from Google Calendar
 */
export async function removeReservationFromCalendar(reservationId: string): Promise<boolean> {
  try {
    const calendarEventId = await getCalendarEventId(reservationId);
    
    if (!calendarEventId) {
      return true; // No event to delete
    }

    const deleted = await deleteCalendarEvent(calendarEventId);
    
    if (deleted) {
      // Clear the calendar_event_id from database
      const supabase = getSupabase();
      await supabase
        .from('reservations')
        .update({ calendar_event_id: null })
        .eq('id', reservationId);
    }

    return deleted;
  } catch (error) {
    console.error('Failed to remove reservation from calendar:', error);
    return false;
  }
}

/**
 * Get Google Calendar authorization status
 */
export function getGoogleCalendarStatus(): {
  isInitialized: boolean;
  isSignedIn: boolean;
  userEmail: string | null;
} {
  try {
    const auth = gapi?.auth2?.getAuthInstance();
    const isSignedIn = auth?.isSignedIn?.get() || false;
    const user = auth?.currentUser?.get();
    const profile = user?.getBasicProfile();

    return {
      isInitialized: !!auth,
      isSignedIn,
      userEmail: profile?.getEmail() || null,
    };
  } catch {
    return {
      isInitialized: false,
      isSignedIn: false,
      userEmail: null,
    };
  }
}

/**
 * Open Google Calendar in new tab to view event
 */
export function openEventInGoogleCalendar(calendarEventId: string): void {
  const url = `https://calendar.google.com/calendar/u/0/r/eventedit/${calendarEventId}`;
  window.open(url, '_blank');
}

// Declare gapi types for TypeScript
declare global {
  const gapi: any;
}

export default {
  initializeGoogleCalendar,
  signInToGoogle,
  signOutFromGoogle,
  isGoogleSignedIn,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  syncReservationToCalendar,
  removeReservationFromCalendar,
  getGoogleCalendarStatus,
  openEventInGoogleCalendar,
};

