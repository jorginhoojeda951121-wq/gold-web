/**
 * Google Calendar Integration - Practical Code Examples
 * Real-world usage patterns for the appointment booking system
 */

// ============================================================================
// EXAMPLE 1: Initialize and Authenticate
// ============================================================================

import {
  initializeGoogleCalendarClient,
  getGoogleCalendarClient,
} from '@/lib/googleCalendarClient';
import { getAvailabilityManager } from '@/lib/availabilityManager';

// Initialize on app startup
export function initializeCalendarSystem() {
  try {
    const client = initializeGoogleCalendarClient();
    
    // Check if already authenticated
    if (!client.isAuthenticated()) {
      // Show login button to user
      const authUrl = client.getAuthorizationUrl();
      return { authenticated: false, authUrl };
    }
    
    return { authenticated: true };
  } catch (error) {
    console.error('Failed to initialize calendar:', error);
    return { authenticated: false, error: error.message };
  }
}

// Handle OAuth callback
export async function handleGoogleOAuthCallback(code: string) {
  try {
    const client = initializeGoogleCalendarClient();
    const tokens = await client.exchangeCodeForToken(code);
    
    console.log('OAuth successful, token expires in:', tokens.expires_in, 'seconds');
    
    return { success: true, expiresIn: tokens.expires_in };
  } catch (error) {
    console.error('OAuth failed:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EXAMPLE 2: Register Staff and Check Availability
// ============================================================================

import type { StaffMember } from '@/lib/availabilityManager';

export async function setupStaffAvailability() {
  const availabilityMgr = getAvailabilityManager();
  
  // Define your staff members
  const staffList: StaffMember[] = [
    {
      id: 'staff_john_001',
      name: 'John Smith - Barber',
      email: 'john@salon.com',
      calendarId: 'john@salon.com',
      workingHours: {
        start: 10,    // 10 AM
        end: 20,      // 8 PM (20:00)
        daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat (0=Sunday)
      },
    },
    {
      id: 'staff_jane_001',
      name: 'Jane Doe - Stylist',
      email: 'jane@salon.com',
      calendarId: 'jane@salon.com',
      workingHours: {
        start: 9,     // 9 AM
        end: 18,      // 6 PM
        daysOfWeek: [1, 2, 3, 4, 5],     // Mon-Fri only
      },
    },
  ];
  
  // Register all staff
  staffList.forEach(staff => {
    availabilityMgr.registerStaffMember(staff);
  });
  
  return staffList;
}

// Check availability for a specific staff member
export async function getStaffAvailability(
  staffId: string,
  dateStr: string // Format: 'YYYY-MM-DD'
) {
  const availabilityMgr = getAvailabilityManager();
  
  try {
    const availability = await availabilityMgr.checkStaffAvailability(
      staffId,
      dateStr
    );
    
    return {
      staffName: availability?.resourceName,
      date: dateStr,
      availableSlots: availability?.availableSlots || [],
      busyCount: availability?.busyPeriods.length || 0,
    };
  } catch (error) {
    console.error(`Error checking availability for ${staffId}:`, error);
    throw error;
  }
}

// Get next 7 days availability for a staff member
export async function getAvailabilityNextWeek(staffId: string) {
  const availabilityMgr = getAvailabilityManager();
  
  const weeklyAvailability = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    try {
      const availability = await availabilityMgr.checkStaffAvailability(
        staffId,
        dateStr
      );
      
      if (availability && availability.availableSlots.length > 0) {
        weeklyAvailability.push({
          date: dateStr,
          dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
          slotCount: availability.availableSlots.length,
          firstAvailable: availability.availableSlots[0],
          lastAvailable: availability.availableSlots[availability.availableSlots.length - 1],
        });
      }
    } catch (error) {
      console.warn(`Failed to check ${dateStr}:`, error);
    }
  }
  
  return weeklyAvailability;
}

// ============================================================================
// EXAMPLE 3: Find Ideal Meeting Times (Multiple Staff)
// ============================================================================

export async function findTeamMeetingTime(
  staffIds: string[],
  dateStr: string,
  duration: number = 60 // minutes
) {
  const availabilityMgr = getAvailabilityManager();
  
  try {
    // Get common available slots
    const commonSlots = await availabilityMgr.findCommonAvailability(
      staffIds,
      dateStr,
      duration
    );
    
    if (commonSlots.length === 0) {
      return {
        success: false,
        message: `No ${duration}-minute slots available for all staff on ${dateStr}`,
        suggestAlternativeDates: true,
      };
    }
    
    // Return the 3 earliest options
    return {
      success: true,
      count: commonSlots.length,
      recommendedSlots: commonSlots.slice(0, 3).map(slot => ({
        start: new Date(slot.start).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        end: new Date(slot.end).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        duration: slot.duration,
      })),
    };
  } catch (error) {
    console.error('Error finding team meeting time:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EXAMPLE 4: Book Appointment
// ============================================================================

import { getCalendarEventManager } from '@/lib/calendarEventManager';
import { getWebhookManager } from '@/lib/webhookManager';

export async function bookAppointment(
  staffId: string,
  staffEmail: string,
  staffCalendarId: string,
  appointmentData: {
    appointmentId: string;
    clientName: string;
    clientEmail: string;
    serviceName: string;
    servicePrice: number;
    startTime: string; // ISO 8601
    endTime: string;   // ISO 8601
    notes?: string;
    meetingLink?: string;
  }
) {
  const eventMgr = getCalendarEventManager();
  
  try {
    // Step 1: Create event on Google Calendar
    const googleResult = await eventMgr.createCalendarEvent(
      staffCalendarId,
      {
        id: appointmentData.appointmentId,
        clientName: appointmentData.clientName,
        clientEmail: appointmentData.clientEmail,
        serviceName: appointmentData.serviceName,
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime,
        staffEmail: staffEmail,
        notes: appointmentData.notes,
        meetingLink: appointmentData.meetingLink,
      }
    );
    
    // Step 2: Setup webhook for real-time sync (optional but recommended)
    const webhookMgr = getWebhookManager();
    try {
      const client = getGoogleCalendarClient();
      if (client?.isAuthenticated()) {
        const webhookResult = await client.setupPushNotifications(
          staffCalendarId,
          `${window.location.origin}/api/webhooks/google-calendar`
        );
        
        webhookMgr.registerWebhookChannel(
          webhookResult.resourceId,
          staffCalendarId,
          webhookResult.expiration
        );
        
        console.log('Webhook registered for automatic sync');
      }
    } catch (error) {
      console.warn('Webhook setup failed (non-critical):', error);
    }
    
    // Return success with Google Event ID for reference
    return {
      success: true,
      appointmentId: appointmentData.appointmentId,
      googleEventId: googleResult.googleEventId,
      calendarLink: googleResult.htmlLink,
      confirmationMessage: `Appointment booked with ${appointmentData.clientName} for ${appointmentData.serviceName}`,
    };
  } catch (error) {
    console.error('Failed to book appointment:', error);
    return {
      success: false,
      error: error.message,
      fallback: 'Appointment saved locally. Google Calendar sync will be retried.',
    };
  }
}

// ============================================================================
// EXAMPLE 5: Handle Appointment Modifications
// ============================================================================

export async function rescheduleAppointment(
  googleEventId: string,
  staffCalendarId: string,
  appointmentId: string,
  newStartTime: string, // ISO 8601
  newEndTime: string    // ISO 8601
) {
  const eventMgr = getCalendarEventManager();
  
  try {
    // Get sync data to find Google Event ID
    const syncData = await eventMgr.getSyncData(appointmentId);
    
    if (!syncData) {
      return {
        success: false,
        error: 'Appointment not synced with Google Calendar',
      };
    }
    
    // Update on Google Calendar
    await eventMgr.updateCalendarEvent(
      staffCalendarId,
      syncData.googleEventId,
      appointmentId,
      {
        startTime: newStartTime,
        endTime: newEndTime,
      }
    );
    
    return {
      success: true,
      message: 'Appointment rescheduled successfully',
      googleEventId: syncData.googleEventId,
    };
  } catch (error) {
    console.error('Failed to reschedule appointment:', error);
    return { success: false, error: error.message };
  }
}

export async function cancelAppointment(
  appointmentId: string,
  staffCalendarId: string
) {
  const eventMgr = getCalendarEventManager();
  
  try {
    const syncData = await eventMgr.getSyncData(appointmentId);
    
    if (!syncData) {
      return {
        success: false,
        error: 'Appointment not found in sync records',
      };
    }
    
    // Delete from Google Calendar
    await eventMgr.deleteCalendarEvent(
      staffCalendarId,
      syncData.googleEventId,
      appointmentId
    );
    
    return {
      success: true,
      message: 'Appointment cancelled',
      googleEventId: syncData.googleEventId,
    };
  } catch (error) {
    console.error('Failed to cancel appointment:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EXAMPLE 6: Monitor Sync Status
// ============================================================================

import { dbGetAll } from '@/lib/indexeddb';

export async function checkSyncStatus() {
  try {
    // Get all appointments
    const appointments = await dbGetAll('appointments');
    
    // Get all sync records
    const syncRecords = await dbGetAll('calendarEventSync');
    
    // Calculate statistics
    const synced = syncRecords?.filter(r => r.status === 'synced').length || 0;
    const failed = syncRecords?.filter(r => r.status === 'failed').length || 0;
    const pending = syncRecords?.filter(r => r.status === 'pending').length || 0;
    const total = syncRecords?.length || 0;
    
    return {
      totalAppointments: appointments?.length || 0,
      syncedCount: synced,
      failedCount: failed,
      pendingCount: pending,
      syncRate: total > 0 ? ((synced / total) * 100).toFixed(1) : '0',
      failedAppointments: syncRecords
        ?.filter(r => r.status === 'failed')
        .map(r => ({
          appointmentId: r.appointmentId,
          error: r.errorMessage,
        })) || [],
    };
  } catch (error) {
    console.error('Error checking sync status:', error);
    return { error: error.message };
  }
}

// Retry failed syncs
export async function retryFailedSyncs() {
  const eventMgr = getCalendarEventManager();
  
  try {
    await eventMgr.retryFailedSyncs();
    
    const status = await checkSyncStatus();
    return {
      success: true,
      status,
      message: 'Retry complete',
    };
  } catch (error) {
    console.error('Error retrying syncs:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EXAMPLE 7: Webhook Event Handling
// ============================================================================

export async function handleWebhookEventDeleted(
  calendarId: string,
  googleEventId: string
) {
  const webhookMgr = getWebhookManager();
  
  try {
    // This automatically:
    // 1. Finds the corresponding appointment
    // 2. Marks it as cancelled in Supabase
    // 3. Updates IndexedDB
    // 4. Sends notification to client
    
    await webhookMgr.handleEventDeletion(googleEventId, calendarId);
    
    return { success: true, action: 'appointment_cancelled' };
  } catch (error) {
    console.error('Error handling webhook deletion:', error);
    return { success: false, error: error.message };
  }
}

export async function handleWebhookEventModified(
  calendarId: string,
  googleEventId: string,
  eventData: {
    summary?: string;
    start?: { dateTime: string };
    end?: { dateTime: string };
    description?: string;
  }
) {
  const webhookMgr = getWebhookManager();
  
  try {
    // This automatically:
    // 1. Finds the corresponding appointment
    // 2. Updates date/time in Supabase
    // 3. Updates IndexedDB
    // 4. Sends notification to client
    
    await webhookMgr.handleEventModification(calendarId, googleEventId, eventData);
    
    return { success: true, action: 'appointment_updated' };
  } catch (error) {
    console.error('Error handling webhook modification:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EXAMPLE 8: Analytics & Reporting
// ============================================================================

export async function getAppointmentAnalytics(daysToAnalyze: number = 30) {
  const appointments = await dbGetAll('appointments');
  
  const now = new Date();
  const startDate = new Date(now.getTime() - daysToAnalyze * 24 * 60 * 60 * 1000);
  
  // Filter to date range
  const recentAppointments = appointments?.filter(apt => {
    const aptDate = new Date(apt.timestamp || 0);
    return aptDate >= startDate && aptDate <= now;
  }) || [];
  
  // Group by status
  const statuses = {
    scheduled: recentAppointments.filter(a => a.status === 'scheduled').length,
    completed: recentAppointments.filter(a => a.status === 'completed').length,
    cancelled: recentAppointments.filter(a => a.status === 'cancelled').length,
    noshow: recentAppointments.filter(a => a.status === 'no-show').length,
  };
  
  // Calculate revenue
  const revenue = recentAppointments
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + a.price, 0);
  
  // Group by staff (if available)
  const byStaff: Record<string, number> = {};
  recentAppointments.forEach(apt => {
    const staff = apt.staffMemberId || 'Unknown';
    byStaff[staff] = (byStaff[staff] || 0) + 1;
  });
  
  return {
    period: { days: daysToAnalyze, startDate, endDate: now },
    totalAppointments: recentAppointments.length,
    byStatus: statuses,
    revenue: revenue.toFixed(2),
    averagePerDay: (recentAppointments.length / daysToAnalyze).toFixed(1),
    byStaffMember: byStaff,
    cancellationRate: (
      (statuses.cancelled / recentAppointments.length) * 100
    ).toFixed(1),
  };
}

// ============================================================================
// EXAMPLE 9: Export/Import Availability Configuration
// ============================================================================

export async function exportAvailabilityConfig() {
  const availabilityMgr = getAvailabilityManager();
  
  const data = availabilityMgr.exportAvailabilityData();
  
  // Save to file
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `availability-backup-${new Date().toISOString()}.json`;
  link.click();
  
  return { success: true, message: 'Availability configuration exported' };
}

export async function importAvailabilityConfig(file: File) {
  const availabilityMgr = getAvailabilityManager();
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    availabilityMgr.importAvailabilityData(data);
    
    return {
      success: true,
      staffCount: data.staffMembers?.length || 0,
      roomCount: data.rooms?.length || 0,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EXAMPLE 10: Debug Utilities
// ============================================================================

export async function debugAppointmentSystem() {
  console.group('📅 Appointment System Debug');
  
  // Check authentication
  const client = getGoogleCalendarClient();
  console.log('✓ Google Calendar Auth:', client?.isAuthenticated());
  
  // Check staff
  const availabilityMgr = getAvailabilityManager();
  const staff = availabilityMgr.getStaffMembers();
  console.log('✓ Registered Staff:', staff.length, staff.map(s => s.name));
  
  // Check sync status
  const syncStatus = await checkSyncStatus();
  console.log('✓ Sync Status:', syncStatus);
  
  // Check local data
  const appointments = await dbGetAll('appointments');
  console.log('✓ Local Appointments:', appointments?.length);
  
  // Check webhooks
  const webhookMgr = getWebhookManager();
  const channels = webhookMgr.getRegisteredChannels();
  console.log('✓ Webhook Channels:', channels.length);
  
  console.groupEnd();
}
