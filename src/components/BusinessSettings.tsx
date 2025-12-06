import { useState, useEffect } from "react";
import { Settings, CreditCard, Bell, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUserStorage } from "@/hooks/useUserStorage";
import { enqueueChange } from "@/lib/sync";
import { getCurrentUserId } from "@/lib/userStorage";
import { hasPermission, clearRoleCache } from "@/lib/permissions";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PaymentSettings {
  upiId: string;
  businessName: string;
  gstNumber: string;
  bankAccount: string;
  ifscCode: string;
}

interface NotificationSettings {
  lowStock: boolean;
  newOrders: boolean;
  payments: boolean;
  employeeAttendance: boolean;
  subscriptionExpiry: boolean;
}

export const BusinessSettings = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [canEditBusiness, setCanEditBusiness] = useState(false);
  const [canEditPayment, setCanEditPayment] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check permissions on mount with timeout
  useEffect(() => {
    let cancelled = false;
    
    const checkPermissions = async () => {
      try {
        // Clear role cache to ensure fresh permission check
        // This helps if user role was updated or if cache was stale
        clearRoleCache();
        
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise<[boolean, boolean]>((_, reject) => 
          setTimeout(() => reject(new Error('Permission check timeout')), 5000)
        );
        
        const permissionPromise = Promise.all([
          hasPermission('canEditBusinessSettings'),
          hasPermission('canEditPaymentSettings')
        ]);
        
        const [canEditBiz, canEditPay] = await Promise.race([
          permissionPromise,
          timeoutPromise
        ]) as [boolean, boolean];
        
        if (!cancelled) {
          setCanEditBusiness(canEditBiz);
          setCanEditPayment(canEditPay);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        // Default to allowing edits if permission check fails (graceful degradation)
        // This ensures admins can access settings even if permission check has issues
        if (!cancelled) {
          setCanEditBusiness(true);
          setCanEditPayment(true);
          setLoading(false);
        }
      }
    };
    
    checkPermissions();
    
    return () => {
      cancelled = true;
    };
  }, []);

  const { data: businessSettings, updateData: setBusinessSettings } = useUserStorage('businessSettings', {
    businessName: "Golden Treasures",
    address: "123 Jewelry Street, Mumbai",
    phone: "+91 8910921128",
    email: "info@goldentreasures.com",
    gstNumber: "27XXXXX1234X1Z5",
    currency: "INR",
    timezone: "Asia/Kolkata"
  });

  const { data: paymentSettings, updateData: setPaymentSettings } = useUserStorage<PaymentSettings>('paymentSettings', {
    upiId: "goldentreasures@paytm",
    businessName: "Golden Treasures Pvt Ltd",
    gstNumber: "27XXXXX1234X1Z5",
    bankAccount: "1234567890123456",
    ifscCode: "HDFC0001234"
  });

  const { data: notificationSettings, updateData: setNotificationSettings } = useUserStorage<NotificationSettings>('notificationSettings', {
    lowStock: true,
    newOrders: true,
    payments: true,
    employeeAttendance: true,
    subscriptionExpiry: true
  });

  const handleSaveBusinessSettings = async () => {
    await setBusinessSettings(businessSettings);
    
    // Sync to Supabase - convert to key-value format
    const userId = await getCurrentUserId();
    if (userId) {
      Object.entries(businessSettings).forEach(([key, value]) => {
        enqueueChange('settings', 'upsert', {
          key: `business_${key}`,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          user_id: userId,
        });
      });
    }
    
    toast({
      title: "Settings Saved",
      description: "Business settings have been updated successfully."
    });
  };

  const handleSavePaymentSettings = async () => {
    await setPaymentSettings(paymentSettings);
    
    // Sync to Supabase - convert to key-value format
    const userId = await getCurrentUserId();
    if (userId) {
      Object.entries(paymentSettings).forEach(([key, value]) => {
        enqueueChange('settings', 'upsert', {
          key: `payment_${key}`,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          user_id: userId,
        });
      });
    }
    
    toast({
      title: "Payment Settings Updated",
      description: "UPI and payment details have been saved."
    });
  };

  const handleToggleNotification = async (key: keyof NotificationSettings) => {
    const updated = {
      ...notificationSettings,
      [key]: !notificationSettings[key]
    };
    await setNotificationSettings(updated);
    
    // Sync to Supabase
    const userId = await getCurrentUserId();
    if (userId) {
      enqueueChange('settings', 'upsert', {
        key: `notification_${key}`,
        value: JSON.stringify(updated[key]),
        user_id: userId,
      });
    }
    
    toast({
      title: "Notification Updated",
      description: `${key} notifications ${notificationSettings[key] ? 'disabled' : 'enabled'}.`
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Business Settings</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Configure your business preferences and system settings
        </p>
      </div>

      {/* Permission Warning */}
      {!canEditBusiness && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            You don't have permission to edit business settings. Only owners and admins can modify these settings.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>General Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={businessSettings.businessName}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, businessName: e.target.value })}
                    disabled={!canEditBusiness}
                  />
                </div>
                <div>
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={businessSettings.gstNumber}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, gstNumber: e.target.value })}
                    disabled={!canEditBusiness}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">Business Address</Label>
                <Textarea
                  id="address"
                  value={businessSettings.address}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
                  disabled={!canEditBusiness}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={businessSettings.phone}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
                    disabled={!canEditBusiness}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={businessSettings.email}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
                    disabled={!canEditBusiness}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value="INR" disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Currency is fixed to Indian Rupee (₹)
                  </p>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={businessSettings.timezone} 
                    onValueChange={(value) => 
                      setBusinessSettings({ ...businessSettings, timezone: value })
                    }
                    disabled={!canEditBusiness}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">India Standard Time</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="Europe/London">Greenwich Mean Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleSaveBusinessSettings} 
                className="w-full"
                disabled={!canEditBusiness}
              >
                Save General Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Payment Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="upiId">UPI ID</Label>
                <Input
                  id="upiId"
                  value={paymentSettings.upiId}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, upiId: e.target.value })}
                  placeholder="yourstore@paytm"
                  disabled={!canEditPayment}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  This UPI ID will be used for accepting payments in the app
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessNamePayment">Registered Business Name</Label>
                  <Input
                    id="businessNamePayment"
                    value={paymentSettings.businessName}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, businessName: e.target.value })}
                    disabled={!canEditPayment}
                  />
                </div>
                <div>
                  <Label htmlFor="gstNumberPayment">GST Number</Label>
                  <Input
                    id="gstNumberPayment"
                    value={paymentSettings.gstNumber}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, gstNumber: e.target.value })}
                    disabled={!canEditPayment}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bankAccount">Bank Account Number</Label>
                  <Input
                    id="bankAccount"
                    value={paymentSettings.bankAccount}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, bankAccount: e.target.value })}
                    disabled={!canEditPayment}
                  />
                </div>
                <div>
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    value={paymentSettings.ifscCode}
                    disabled={!canEditPayment}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, ifscCode: e.target.value })}
                  />
                </div>
              </div>

              <Button 
                onClick={handleSavePaymentSettings} 
                className="w-full"
                disabled={!canEditPayment}
              >
                Save Payment Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(notificationSettings).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {key === 'lowStock' && 'Get notified when items are running low'}
                      {key === 'newOrders' && 'Receive alerts for new customer orders'}
                      {key === 'payments' && 'Get notified about payment updates'}
                      {key === 'employeeAttendance' && 'Alerts for employee attendance issues'}
                      {key === 'subscriptionExpiry' && 'Reminders for system maintenance'}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => handleToggleNotification(key as keyof NotificationSettings)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
