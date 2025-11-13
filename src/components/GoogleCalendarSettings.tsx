import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Input } from "./ui/input";
import { useToast } from "./ui/use-toast";
import { Calendar, CheckCircle2, XCircle, RefreshCw, Settings, Link as LinkIcon } from "lucide-react";
import {
  initializeGoogleCalendar,
  signInToGoogle,
  signOutFromGoogle,
  getGoogleCalendarStatus,
} from "../lib/googleCalendar";
import { getSupabase } from "../lib/supabase";

interface CalendarSettings {
  auto_sync_enabled: boolean;
  default_location: string;
  include_customer_email: boolean;
  event_duration_hours: number;
  google_account_email: string | null;
}

export function GoogleCalendarSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [calendarStatus, setCalendarStatus] = useState({
    isInitialized: false,
    isSignedIn: false,
    userEmail: null as string | null,
  });

  const [settings, setSettings] = useState<CalendarSettings>({
    auto_sync_enabled: true,
    default_location: "Your Jewelry Store",
    include_customer_email: true,
    event_duration_hours: 8,
    google_account_email: null,
  });

  // Initialize Google Calendar on mount with timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const init = async () => {
      setIsInitializing(true);
      
      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn("Google Calendar initialization timeout - this may indicate a configuration issue");
          setIsInitializing(false);
        }
      }, 10000); // 10 second timeout

      try {
        // Check if API keys are configured
        const apiKey = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY;
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        
        if (!apiKey || !clientId) {
          console.warn("Google Calendar API keys not configured. Please set VITE_GOOGLE_CALENDAR_API_KEY and VITE_GOOGLE_CLIENT_ID in your .env file");
          if (isMounted) {
            clearTimeout(timeoutId);
            setIsInitializing(false);
          }
          return;
        }

        const initialized = await initializeGoogleCalendar();
        if (isMounted) {
          if (initialized) {
            updateStatus();
            await loadSettings();
            setInitError(null);
          } else {
            const errorMsg = "Google Calendar initialization failed. Please check your API keys and try again.";
            console.warn(errorMsg);
            setInitError(errorMsg);
          }
        }
      } catch (error: any) {
        console.error("Failed to initialize Google Calendar:", error);
        console.error("Error details:", error?.message, error?.stack);
        if (isMounted) {
          setInitError(error?.message || "Failed to initialize Google Calendar. Please check the console for details.");
        }
      } finally {
        if (isMounted) {
          clearTimeout(timeoutId);
          setIsInitializing(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const updateStatus = () => {
    try {
      const status = getGoogleCalendarStatus();
      setCalendarStatus(status);
    } catch (error) {
      console.error('Failed to update calendar status:', error);
      setCalendarStatus({
        isInitialized: false,
        isSignedIn: false,
        userEmail: null,
      });
    }
  };

  const loadSettings = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('google_calendar_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setSettings({
          auto_sync_enabled: data.auto_sync_enabled ?? true,
          default_location: data.default_location ?? "Your Jewelry Store",
          include_customer_email: data.include_customer_email ?? true,
          event_duration_hours: data.event_duration_hours ?? 8,
          google_account_email: data.google_account_email,
        });
      }
    } catch (error) {
      console.error("Failed to load calendar settings:", error);
    }
  };

  const saveSettings = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save settings",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('google_calendar_settings')
        .upsert({
          user_id: user.id,
          auto_sync_enabled: settings.auto_sync_enabled,
          default_location: settings.default_location,
          include_customer_email: settings.include_customer_email,
          event_duration_hours: settings.event_duration_hours,
          google_account_email: calendarStatus.userEmail,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your calendar settings have been updated",
      });
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const success = await signInToGoogle();
      
      if (success) {
        updateStatus();
        await saveSettings();
        toast({
          title: "Connected Successfully",
          description: "Google Calendar is now connected",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Could not connect to Google Calendar",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOutFromGoogle();
      updateStatus();
      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected",
      });
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if API keys are configured
  const apiKey = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isConfigured = !!(apiKey && clientId);

  if (isInitializing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Integration
          </CardTitle>
          <CardDescription>
            Automatically sync reservations to your Google Calendar with reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <Settings className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-amber-900 mb-1">Configuration Required</h4>
                <p className="text-sm text-amber-800 mb-3">
                  To enable Google Calendar integration, please configure the following environment variables:
                </p>
                <div className="space-y-1 text-xs font-mono bg-white p-2 rounded border border-amber-200">
                  <div>VITE_GOOGLE_CALENDAR_API_KEY=your_api_key</div>
                  <div>VITE_GOOGLE_CLIENT_ID=your_client_id</div>
                </div>
                <p className="text-xs text-amber-700 mt-2">
                  Contact your administrator or check the documentation for setup instructions.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Automatically sync reservations to your Google Calendar with reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Initialization Error */}
        {initError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900 mb-1">Initialization Error</h4>
                <p className="text-sm text-red-800">{initError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setInitError(null);
                    setIsInitializing(true);
                    // Retry initialization
                    const retry = async () => {
                      try {
                        const initialized = await initializeGoogleCalendar();
                        if (initialized) {
                          updateStatus();
                          await loadSettings();
                          setInitError(null);
                        }
                      } catch (error: any) {
                        setInitError(error?.message || "Retry failed");
                      } finally {
                        setIsInitializing(false);
                      }
                    };
                    retry();
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {calendarStatus.isSignedIn ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" />
              )}
              <span className="font-medium">
                {calendarStatus.isSignedIn ? "Connected" : "Not Connected"}
              </span>
            </div>
            
            {calendarStatus.isSignedIn ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={isLoading}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={handleSignIn}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Connect Google Calendar
              </Button>
            )}
          </div>

          {calendarStatus.userEmail && (
            <div className="text-sm text-gray-600">
              Connected as: <span className="font-medium">{calendarStatus.userEmail}</span>
            </div>
          )}

          {!calendarStatus.isSignedIn && (
            <p className="text-sm text-gray-500">
              Connect your Google Calendar to automatically sync reservation events with reminders
            </p>
          )}
        </div>

        {/* Settings (only show if connected) */}
        {calendarStatus.isSignedIn && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Sync Reservations</Label>
                  <p className="text-sm text-gray-500">
                    Automatically create calendar events for new reservations
                  </p>
                </div>
                <Switch
                  checked={settings.auto_sync_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, auto_sync_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Customer Email</Label>
                  <p className="text-sm text-gray-500">
                    Add customer as attendee to receive calendar invites
                  </p>
                </div>
                <Switch
                  checked={settings.include_customer_email}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, include_customer_email: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Default Event Location</Label>
                <Input
                  id="location"
                  value={settings.default_location}
                  onChange={(e) =>
                    setSettings({ ...settings, default_location: e.target.value })
                  }
                  placeholder="Your Jewelry Store"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Event Duration (hours)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="24"
                  value={settings.event_duration_hours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      event_duration_hours: parseInt(e.target.value) || 8,
                    })
                  }
                />
                <p className="text-sm text-gray-500">
                  Default duration for reservation events in your calendar
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                onClick={saveSettings}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Settings className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </>
        )}

        {/* Information Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">📅 Calendar Features:</h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Automatic event creation for new reservations</li>
            <li>• Smart reminders (1 week, 3 days, 1 day, 1 hour before)</li>
            <li>• Color-coded events by reservation type</li>
            <li>• Customer email invitations (optional)</li>
            <li>• Real-time sync when reservations are updated</li>
            <li>• Auto-delete events when reservations are cancelled</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

