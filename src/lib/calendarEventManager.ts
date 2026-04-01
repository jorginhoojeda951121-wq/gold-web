/**
 * Calendar Event Manager
 * Handles creation, updating, and deletion of calendar events
 * Syncs appointments with Google Calendar
 */

import { getGoogleCalendarClient } from './googleCalendarClient';
import type { GoogleCalendarEvent } from './googleCalendarClient';
import { getSupabase } from './supabase';
import { dbPut, dbGetById, dbDelete } from './indexedDb';

export interface CalendarEventSyncData {
  appointmentId: string;
  googleEventId: string;
  calendarId: string;
  syncedAt: string;
  lastModified: string;
  status: 'synced' | 'pending' | 'failed';
  errorMessage?: string;
}

class CalendarEventManager {
  private syncDataStore = 'calendarEventSync';

  /**
   * Create an event in Google Calendar when appointment is booked
   */
  async createCalendarEvent(
    calendarId: string,
    appointment: {
      id: string;
      clientName: string;
      clientEmail: string;
      serviceName: string;
      startTime: string; // ISO 8601
      endTime: string; // ISO 8601
      staffEmail?: string;
      notes?: string;
      meetingLink?: string;
    }
  ): Promise<{ googleEventId: string; htmlLink: string }> {
    const client = getGoogleCalendarClient();
    if (!client || !client.isAuthenticated()) {
      throw new Error('Google Calendar not authenticated');
    }

    try {
      const event: GoogleCalendarEvent = {
        summary: `${appointment.serviceName} - ${appointment.clientName}`,
        description: `Appointment ID: ${appointment.id}\n${
          appointment.notes ? `Notes: ${appointment.notes}\n` : ''
        }${appointment.meetingLink ? `Meeting Link: ${appointment.meetingLink}\n` : ''}Client: ${appointment.clientName}\nEmail: ${appointment.clientEmail}`,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        visibility: 'private', // Don't expose details in shared calendars
        guestCanModify: false, // Prevent guests from modifying
        reminders: {
          useDefault: true,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'notification', minutes: 15 }, // 15 minutes before
          ],
        },
        attendees: [
          {
            email: appointment.clientEmail,
            displayName: appointment.clientName,
            optional: false,
          },
        ],
      };

      // Add staff as attendee if email provided
      if (appointment.staffEmail) {
        event.attendees?.push({
          email: appointment.staffEmail,
          optional: false,
        });
      }

      const result = await client.createEvent(calendarId, event);

      // Store sync information
      const syncData: CalendarEventSyncData = {
        appointmentId: appointment.id,
        googleEventId: result.id,
        calendarId,
        syncedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        status: 'synced',
      };

      await dbPut(this.syncDataStore, syncData);

      return {
        googleEventId: result.id,
        htmlLink: result.htmlLink,
      };
    } catch (error: any) {
      console.error('Error creating calendar event:', error);

      // Try to store failed sync attempt
      try {
        const syncData: CalendarEventSyncData = {
          appointmentId: appointment.id,
          googleEventId: '',
          calendarId,
          syncedAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        };
        await dbPut(this.syncDataStore, syncData);
      } catch (storageError) {
        console.warn('Could not store sync failure:', storageError);
      }

      throw error;
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateCalendarEvent(
    calendarId: string,
    googleEventId: string,
    appointmentId: string,
    updates: {
      clientName?: string;
      serviceName?: string;
      startTime?: string;
      endTime?: string;
      notes?: string;
    }
  ): Promise<void> {
    const client = getGoogleCalendarClient();
    if (!client || !client.isAuthenticated()) {
      throw new Error('Google Calendar not authenticated');
    }

    try {
      const event: Partial<GoogleCalendarEvent> = {
        startTime: updates.startTime,
        endTime: updates.endTime,
      };

      if (updates.clientName || updates.serviceName) {
        event.summary = `${updates.serviceName || ''} - ${updates.clientName || ''}`.trim();
      }

      if (updates.notes) {
        event.description = `Appointment ID: ${appointmentId}\nNotes: ${updates.notes}`;
      }

      await client.updateEvent(calendarId, googleEventId, event);

      // Update sync record
      const syncData = await dbGetById<CalendarEventSyncData>(
        this.syncDataStore,
        appointmentId
      );

      if (syncData) {
        syncData.lastModified = new Date().toISOString();
        syncData.status = 'synced';
        await dbPut(this.syncDataStore, syncData);
      }
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event when appointment is cancelled
   */
  async deleteCalendarEvent(
    calendarId: string,
    googleEventId: string,
    appointmentId: string
  ): Promise<void> {
    const client = getGoogleCalendarClient();
    if (!client || !client.isAuthenticated()) {
      throw new Error('Google Calendar not authenticated');
    }

    try {
      await client.deleteEvent(calendarId, googleEventId);

      // Remove sync record
      const syncData = await dbGetById<CalendarEventSyncData>(
        this.syncDataStore,
        appointmentId
      );

      if (syncData) {
        await dbDelete(this.syncDataStore, appointmentId);
      }
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  /**
   * Handle webhook notification about a deleted event
   * Updates the POS system when staff manually deletes an appointment
   */
  async handleEventDeletionWebhook(
    calendarId: string,
    eventId: string
  ): Promise<{ appointmentId: string; action: string }> {
    try {
      // Find the appointment that corresponds to this Google event
      const syncData = await this.findSyncDataByGoogleEventId(eventId);

      if (!syncData) {
        console.warn(`No local appointment found for deleted Google event: ${eventId}`);
        return {
          appointmentId: '',
          action: 'not_found',
        };
      }

      const appointmentId = syncData.appointmentId;

      // Update Supabase to mark appointment as cancelled
      const supabase = getSupabase();
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      if (error) {
        console.error('Error updating appointment status in Supabase:', error);
      }

      // Update local IndexedDB
      const appointment = await dbGetById('appointments', appointmentId);

      if (appointment) {
        (appointment as any).status = 'cancelled';
        await dbPut('appointments', appointment);
      }

      // Remove sync record
      await dbDelete(this.syncDataStore, appointmentId);

      return {
        appointmentId,
        action: 'cancelled',
      };
    } catch (error) {
      console.error('Error handling event deletion webhook:', error);
      throw error;
    }
  }

  /**
   * Handle webhook notification about a modified event
   * Updates appointment details if event is modified in Google Calendar
   */
  async handleEventModificationWebhook(
    calendarId: string,
    eventId: string,
    eventData: {
      summary?: string;
      start?: { dateTime: string };
      end?: { dateTime: string };
      description?: string;
    }
  ): Promise<{ appointmentId: string; action: string }> {
    try {
      const syncData = await this.findSyncDataByGoogleEventId(eventId);

      if (!syncData) {
        console.warn(`No local appointment found for modified Google event: ${eventId}`);
        return {
          appointmentId: '',
          action: 'not_found',
        };
      }

      const appointmentId = syncData.appointmentId;

      // Parse updated information
      const updates: any = {};

      if (eventData.start?.dateTime) {
        updates.date = eventData.start.dateTime.split('T')[0];
        updates.time = eventData.start.dateTime.split('T')[1].substring(0, 5);
      }

      if (eventData.end?.dateTime) {
        const endTime = new Date(eventData.end.dateTime);
        const startTime = new Date(eventData.start?.dateTime || new Date());
        updates.duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes
      }

      // Update Supabase
      const supabase = getSupabase();
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('appointments')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', appointmentId);

        if (error) {
          console.error('Error updating appointment in Supabase:', error);
        }
      }

      // Update local IndexedDB
      const appointment = await dbGetById('appointments', appointmentId) as any;

      if (appointment) {
        Object.assign(appointment, updates);
        await dbPut('appointments', appointment);
      }

      // Update sync record
      if (syncData) {
        syncData.lastModified = new Date().toISOString();
        syncData.status = 'synced';
        await dbPut(this.syncDataStore, syncData);
      }

      return {
        appointmentId,
        action: 'updated',
      };
    } catch (error) {
      console.error('Error handling event modification webhook:', error);
      throw error;
    }
  }

  /**
   * Get sync data for an appointment
   */
  async getSyncData(appointmentId: string): Promise<CalendarEventSyncData | null> {
    try {
      return await dbGetById<CalendarEventSyncData>(this.syncDataStore, appointmentId);
    } catch (error) {
      console.error('Error retrieving sync data:', error);
      return null;
    }
  }

  /**
   * Find sync data by Google Event ID
   */
  private async findSyncDataByGoogleEventId(
    googleEventId: string
  ): Promise<CalendarEventSyncData | null> {
    try {
      const { dbGetAll } = await import('./indexedDb');
      const allSync = await dbGetAll<CalendarEventSyncData>(this.syncDataStore);

      return (
        allSync?.find(sync => sync.googleEventId === googleEventId) || null
      );
    } catch (error) {
      console.error('Error finding sync data by Google Event ID:', error);
      return null;
    }
  }

  /**
   * Retry failed syncs
   */
  async retryFailedSyncs(): Promise<void> {
    try {
      const { dbGetAll } = await import('./indexedDb');
      const allSync = await dbGetAll<CalendarEventSyncData>(this.syncDataStore);

      const failedSyncs = (allSync || []).filter(sync => sync.status === 'failed');

      for (const syncData of failedSyncs) {
        try {
          // Get appointment details from Supabase
          const supabase = getSupabase();
          const { data: appointment, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', syncData.appointmentId)
            .single();

          if (error || !appointment) continue;

          // Try to create event again
          const result = await this.createCalendarEvent(syncData.calendarId, {
            id: appointment.id,
            clientName: appointment.clientName,
            clientEmail: appointment.clientEmail,
            serviceName: appointment.service,
            startTime: `${appointment.date}T${appointment.time}`,
            endTime: new Date(
              new Date(
                `${appointment.date}T${appointment.time}`
              ).getTime() +
                appointment.duration * 60 * 1000
            ).toISOString(),
            notes: appointment.notes,
          });

          // Update sync record
          syncData.googleEventId = result.googleEventId;
          syncData.status = 'synced';
          syncData.lastModified = new Date().toISOString();
          await dbPut(this.syncDataStore, syncData);
        } catch (error) {
          console.warn(`Failed to retry sync for ${syncData.appointmentId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error retrying failed syncs:', error);
    }
  }

  /**
   * Clear all sync data
   */
  async clearAllSyncData(): Promise<void> {
    try {
      const { dbGetAll, dbDelete } = await import('./indexedDb');
      const allSync = await dbGetAll<CalendarEventSyncData>(this.syncDataStore);

      for (const sync of allSync || []) {
        await dbDelete(this.syncDataStore, sync.appointmentId);
      }
    } catch (error) {
      console.error('Error clearing sync data:', error);
    }
  }
}

// Singleton instance
let calendarEventManager: CalendarEventManager | null = null;

/**
 * Get or create the singleton CalendarEventManager instance
 */
export function getCalendarEventManager(): CalendarEventManager {
  if (!calendarEventManager) {
    calendarEventManager = new CalendarEventManager();
  }
  return calendarEventManager;
}
