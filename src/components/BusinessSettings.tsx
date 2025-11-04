import { useState } from "react";
import { Settings, CreditCard, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";

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

  const { data: businessSettings, updateData: setBusinessSettings } = useOfflineStorage('businessSettings', {
    businessName: "Golden Treasures",
    address: "123 Jewelry Street, Mumbai",
    phone: "+91 98765 43210",
    email: "info@goldentreasures.com",
    gstNumber: "27XXXXX1234X1Z5",
    currency: "INR",
    timezone: "Asia/Kolkata"
  });

  const { data: paymentSettings, updateData: setPaymentSettings } = useOfflineStorage<PaymentSettings>('paymentSettings', {
    upiId: "goldentreasures@paytm",
    businessName: "Golden Treasures Pvt Ltd",
    gstNumber: "27XXXXX1234X1Z5",
    bankAccount: "1234567890123456",
    ifscCode: "HDFC0001234"
  });

  const { data: notificationSettings, updateData: setNotificationSettings } = useOfflineStorage<NotificationSettings>('notificationSettings', {
    lowStock: true,
    newOrders: true,
    payments: true,
    employeeAttendance: true,
    subscriptionExpiry: true
  });

  const handleSaveBusinessSettings = () => {
    setBusinessSettings(businessSettings);
    toast({
      title: "Settings Saved",
      description: "Business settings have been updated successfully."
    });
  };

  const handleSavePaymentSettings = () => {
    setPaymentSettings(paymentSettings);
    toast({
      title: "Payment Settings Updated",
      description: "UPI and payment details have been saved."
    });
  };

  const handleToggleNotification = (key: keyof NotificationSettings) => {
    setNotificationSettings({
      ...notificationSettings,
      [key]: !notificationSettings[key]
    });
    toast({
      title: "Notification Updated",
      description: `${key} notifications ${notificationSettings[key] ? 'disabled' : 'enabled'}.`
    });
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Business Settings</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Configure your business preferences and system settings
        </p>
      </div>

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
                  />
                </div>
                <div>
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={businessSettings.gstNumber}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, gstNumber: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">Business Address</Label>
                <Textarea
                  id="address"
                  value={businessSettings.address}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={businessSettings.phone}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={businessSettings.email}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={businessSettings.currency} onValueChange={(value) => 
                    setBusinessSettings({ ...businessSettings, currency: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                      <SelectItem value="USD">US Dollar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={businessSettings.timezone} onValueChange={(value) => 
                    setBusinessSettings({ ...businessSettings, timezone: value })
                  }>
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

              <Button onClick={handleSaveBusinessSettings} className="w-full">
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
                  />
                </div>
                <div>
                  <Label htmlFor="gstNumberPayment">GST Number</Label>
                  <Input
                    id="gstNumberPayment"
                    value={paymentSettings.gstNumber}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, gstNumber: e.target.value })}
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
                  />
                </div>
                <div>
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    value={paymentSettings.ifscCode}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, ifscCode: e.target.value })}
                  />
                </div>
              </div>

              <Button onClick={handleSavePaymentSettings} className="w-full">
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