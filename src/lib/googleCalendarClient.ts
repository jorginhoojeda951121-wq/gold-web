/**
 * Google Calendar API Client
 * Handles OAuth 2.0 authentication and Calendar API operations
 */

import { getSupabase } from './supabase';

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  location?: string;
  htmlLink?: string;
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  guestCanModify?: boolean;
  attendees?: Array<{
    email: string;
    displayName?: string;
    optional?: boolean;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'notification';
      minutes: number;
    }>;
  };
}

export interface GoogleOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  expires_at?: string;
  token_type: string;
}

class GoogleCalendarClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private scopes = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'];

  constructor() {
    this.clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '';
    this.clientSecret = (import.meta as any).env.VITE_GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = `${window.location.origin}/google-auth-callback`;
  }

  /**
   * Check if user has a valid authenticated session
   */
  async isAuthenticated(userId?: string): Promise<boolean> {
    const tokens = await this.getStoredTokens(userId);
    if (!tokens) return false;

    // Check if expired
    if (tokens.expires_at && new Date(tokens.expires_at) < new Date()) {
      if (!tokens.refresh_token) return false;
      try {
        await this.refreshTokens(tokens.refresh_token, userId);
        return true;
      } catch (error) {
        console.error('Failed to refresh tokens:', error);
        return false;
      }
    }

    return !!tokens.access_token;
  }

  /**
   * Get the Google OAuth authorization URL
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      access_type: 'offline', // Required for refresh token
      prompt: 'consent',      // Force consent to ensure refresh token is provided
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access/refresh tokens
   */
  async exchangeCodeForToken(code: string, userId?: string): Promise<GoogleOAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    const tokens = await response.json() as GoogleOAuthTokens;
    await this.storeTokens(tokens, userId);
    return tokens;
  }

  /**
   * Create a new event on Google Calendar
   */
  async createEvent(calendarId: string, event: GoogleCalendarEvent): Promise<{ id: string; htmlLink: string }> {
    const token = await this.getValidAccessToken();
    
    const body = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: { dateTime: event.startTime },
      end: { dateTime: event.endTime },
      attendees: event.attendees?.map(a => ({ email: a.email, displayName: a.displayName })),
      reminders: event.reminders,
      visibility: event.visibility,
    };

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create event: ${error.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Update an existing event on Google Calendar
   */
  async updateEvent(calendarId: string, eventId: string, updates: Partial<GoogleCalendarEvent>): Promise<void> {
    const token = await this.getValidAccessToken();
    
    const body: any = {};
    if (updates.summary) body.summary = updates.summary;
    if (updates.description) body.description = updates.description;
    if (updates.startTime) body.start = { dateTime: updates.startTime };
    if (updates.endTime) body.end = { dateTime: updates.endTime };
    if (updates.location) body.location = updates.location;
    if (updates.attendees) body.attendees = updates.attendees;

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to update event: ${error.error?.message || response.statusText}`);
    }
  }

  /**
   * Delete an event from Google Calendar
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    const token = await this.getValidAccessToken();
    
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 410) { // 410 Gone is fine, it means it's already deleted
      const error = await response.json();
      throw new Error(`Failed to delete event: ${error.error?.message || response.statusText}`);
    }
  }

  /**
   * Setup push notifications (webhooks) for a calendar
   */
  async setupPushNotifications(calendarId: string, webhookUrl: string): Promise<{ resourceId: string; expiration: string }> {
    const token = await this.getValidAccessToken();
    const id = `channel-${Date.now()}`;
    
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        type: 'web_hook',
        address: webhookUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to setup watch: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      resourceId: data.resourceId,
      expiration: data.expiration,
    };
  }

  /**
   * Internal: Get a fresh access token (refreshes if needed)
   */
  private async getValidAccessToken(): Promise<string> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: tokens, error } = await supabase
      .from('calendar_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !tokens) throw new Error('Google Calendar tokens not found');

    if (tokens.expires_at && new Date(tokens.expires_at) < new Date()) {
      if (!tokens.refresh_token) throw new Error('Refresh token missing');
      return await this.refreshTokens(tokens.refresh_token, user.id);
    }

    return tokens.access_token;
  }

  /**
   * Internal: Refresh access token using refresh token
   */
  private async refreshTokens(refreshToken: string, userId?: string): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    
    const supabase = getSupabase();
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (activeUserId) {
      await supabase.from('calendar_tokens').update({
        access_token: data.access_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }).eq('user_id', activeUserId);
    }

    return data.access_token;
  }

  /**
   * Internal: Store tokens in Supabase
   */
  private async storeTokens(tokens: GoogleOAuthTokens, userId?: string) {
    const supabase = getSupabase();
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!activeUserId) return;

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Get calendar ID (usually primary)
    const access_token = tokens.access_token;
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const profile = await profileRes.json();
    const calendarId = profile.email || 'primary';

    const { error } = await supabase.from('calendar_tokens').upsert({
      user_id: activeUserId,
      calendar_id: calendarId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id, calendar_id' });

    if (error) throw error;
  }

  /**
   * Internal: Get stored tokens
   */
  private async getStoredTokens(userId?: string) {
    const supabase = getSupabase();
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!activeUserId) return null;

    const { data, error } = await supabase
      .from('calendar_tokens')
      .select('*')
      .eq('user_id', activeUserId)
      .limit(1)
      .single();

    if (error) return null;
    return data;
  }
}

let instance: GoogleCalendarClient | null = null;

export const initializeGoogleCalendarClient = () => {
  if (!instance) instance = new GoogleCalendarClient();
  return instance;
};

export const getGoogleCalendarClient = () => {
  if (!instance) instance = new GoogleCalendarClient();
  return instance;
};
