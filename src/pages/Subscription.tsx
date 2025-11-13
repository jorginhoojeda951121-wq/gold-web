import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabase } from "@/lib/supabase";
import { getSubscriptionStatus, recordSubscriptionPayment, SubscriptionStatus } from "@/lib/subscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  IndianRupee,
  Loader2,
  ArrowLeft,
  Crown,
  Banknote,
  Smartphone,
  Wallet,
  QrCode,
  Timer
} from "lucide-react";
import { format } from "date-fns";

export const Subscription = () => {
  const supabase = getSupabase();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false); // Start as false to show UI immediately
  const [processing, setProcessing] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0 });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

  // Update time remaining every minute
  useEffect(() => {
    if (!subscriptionStatus?.expiryDate) return;

    const updateTime = () => {
      const now = new Date();
      const expiry = subscriptionStatus.expiryDate!;
      const diff = expiry.getTime() - now.getTime();

      if (diff > 0) {
        setTimeRemaining({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        });
      } else {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0 });
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [subscriptionStatus?.expiryDate]);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          navigate("/auth", { replace: true });
          return;
        }

        setUserId(session.user.id);
        const status = await getSubscriptionStatus(session.user.id);
        setSubscriptionStatus(status);
      } catch (error) {
        console.error('Error checking subscription:', error);
        toast({
          title: "Error",
          description: "Failed to load subscription status. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
    // Refresh every 5 minutes
    const interval = setInterval(checkSubscription, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [navigate, toast, supabase]);

  const handlePayment = async (paymentMethod: string) => {
    if (!userId || !subscriptionStatus) return;

    setSelectedPaymentMethod(paymentMethod);
    setProcessing(true);
    try {
      // In a real implementation, you would integrate with a payment gateway here
      toast({
        title: "Payment Processing",
        description: `Processing payment via ${paymentMethod}. Please complete the transaction.`,
        duration: 5000,
      });

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Payment Instructions",
        description: `Please complete payment of ₹${subscriptionStatus.renewalAmount} using ${paymentMethod}. Contact support if you need assistance.`,
        duration: 10000,
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setSelectedPaymentMethod(null);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!userId || !subscriptionStatus) return;

    const confirmed = window.confirm(
      `Are you sure you want to mark the subscription as paid? This will extend your subscription for 12 months from today.`
    );

    if (!confirmed) return;

    setProcessing(true);
    try {
      await recordSubscriptionPayment(userId, subscriptionStatus.renewalAmount);
      
      // Refresh subscription status
      const newStatus = await getSubscriptionStatus(userId);
      setSubscriptionStatus(newStatus);

      toast({
        title: "Payment Recorded",
        description: "Your subscription has been renewed successfully!",
      });

      // Redirect to dashboard after successful payment
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 2000);
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Always show page structure - never block with full-screen spinner
  // Show loading/error states within the page content

  const isExpired = subscriptionStatus?.isExpired || subscriptionStatus?.requiresPayment;
  const isActive = subscriptionStatus?.isActive && !isExpired;
  const isInGracePeriod = subscriptionStatus?.isExpired && !subscriptionStatus?.requiresPayment;

  // Payment methods
  const paymentMethods = [
    { id: 'upi', name: 'UPI', icon: Smartphone, description: 'Pay via UPI (PhonePe, Google Pay, etc.)' },
    { id: 'card', name: 'Credit/Debit Card', icon: CreditCard, description: 'Visa, Mastercard, RuPay' },
    { id: 'netbanking', name: 'Net Banking', icon: Banknote, description: 'All major banks' },
    { id: 'wallet', name: 'Wallet', icon: Wallet, description: 'Paytm, Amazon Pay, etc.' },
    { id: 'qr', name: 'QR Code', icon: QrCode, description: 'Scan and pay' },
  ];

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/dashboard")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="space-y-6">
        {/* Status Bar with Progress */}
        <Card className="border-2">
          <CardContent className="pt-6">
            {loading && !subscriptionStatus ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Loading subscription status...</span>
              </div>
            ) : !subscriptionStatus ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Unable to load subscription status. Please try again later.
                </AlertDescription>
              </Alert>
            ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isActive ? (
                    <>
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <div>
                        <h3 className="text-xl font-bold text-green-600">Subscription Active</h3>
                        <p className="text-sm text-muted-foreground">
                          {subscriptionStatus.isFreeTrial ? "Free Trial Period" : "Paid Subscription"}
                        </p>
                      </div>
                    </>
                  ) : isInGracePeriod ? (
                    <>
                      <Clock className="h-6 w-6 text-yellow-600" />
                      <div>
                        <h3 className="text-xl font-bold text-yellow-600">Grace Period</h3>
                        <p className="text-sm text-muted-foreground">Renew soon to continue</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-6 w-6 text-red-600" />
                      <div>
                        <h3 className="text-xl font-bold text-red-600">Subscription Expired</h3>
                        <p className="text-sm text-muted-foreground">Payment required</p>
                      </div>
                    </>
                  )}
                </div>
                <Badge variant={isActive ? "default" : isInGracePeriod ? "secondary" : "destructive"} className="text-lg px-4 py-2">
                  {subscriptionStatus.isFreeTrial ? "Free Trial" : "Paid"}
                </Badge>
              </div>

              {/* Progress Bar */}
              {isActive && subscriptionStatus.expiryDate && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Time Remaining</span>
                    <span className="font-semibold">
                      {subscriptionStatus.daysRemaining} days, {subscriptionStatus.hoursRemaining} hours
                    </span>
                  </div>
                  <Progress 
                    value={subscriptionStatus.percentageRemaining} 
                    className="h-3"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Started: {subscriptionStatus.subscriptionStartDate ? format(subscriptionStatus.subscriptionStartDate, "PPP") : "N/A"}</span>
                    <span>Expires: {subscriptionStatus.expiryDate ? format(subscriptionStatus.expiryDate, "PPP") : "N/A"}</span>
                  </div>
                </div>
              )}

              {/* Countdown Timer */}
              {isActive && subscriptionStatus.expiryDate && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Timer className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Time Until Next Renewal</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{timeRemaining.days}</div>
                      <div className="text-xs text-muted-foreground">Days</div>
                    </div>
                    <div className="text-2xl text-blue-400">:</div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{timeRemaining.hours}</div>
                      <div className="text-xs text-muted-foreground">Hours</div>
                    </div>
                    <div className="text-2xl text-blue-400">:</div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{timeRemaining.minutes}</div>
                      <div className="text-xs text-muted-foreground">Minutes</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Details Card */}
        {subscriptionStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Subscription Details
            </CardTitle>
            <CardDescription>
              View and manage your subscription information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Subscription Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Account Created</p>
                <p className="font-semibold text-lg">
                  {subscriptionStatus.subscriptionStartDate
                    ? format(subscriptionStatus.subscriptionStartDate, "PPP 'at' p")
                    : "N/A"}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Expiry Date</p>
                <p className="font-semibold text-lg">
                  {subscriptionStatus.expiryDate
                    ? format(subscriptionStatus.expiryDate, "PPP 'at' p")
                    : "N/A"}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Days Remaining</p>
                <p className="font-semibold text-lg">
                  {subscriptionStatus.daysRemaining > 0
                    ? `${subscriptionStatus.daysRemaining} days`
                    : "Expired"}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Renewal Amount</p>
                <p className="font-semibold text-lg flex items-center gap-1">
                  <IndianRupee className="h-5 w-5" />
                  {subscriptionStatus.renewalAmount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Subscription Method */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Subscription Method</h4>
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <Crown className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="font-semibold">
                    {subscriptionStatus.isFreeTrial ? "Free Trial (11 Months)" : "Annual Subscription (12 Months)"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionStatus.isFreeTrial 
                      ? "Enjoying your free trial period. Renew after 11 months for continued access."
                      : "Active paid subscription. Renews annually."}
                  </p>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {isExpired && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Subscription Expired</AlertTitle>
                <AlertDescription>
                  Your subscription has expired. Please renew to continue using the service.
                  {subscriptionStatus.gracePeriodEndDate && (
                    <span className="block mt-2">
                      Grace period ended on: {format(subscriptionStatus.gracePeriodEndDate, "PPP")}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {isInGracePeriod && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Grace Period</AlertTitle>
                <AlertDescription>
                  Your subscription has expired, but you're still in the grace period.
                  Please renew before the grace period ends to avoid service interruption.
                  {subscriptionStatus.gracePeriodEndDate && (
                    <span className="block mt-2">
                      Grace period ends on: {format(subscriptionStatus.gracePeriodEndDate, "PPP")}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {isActive && subscriptionStatus.daysRemaining <= 30 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Renewal Reminder</AlertTitle>
                <AlertDescription>
                  Your subscription will expire in {subscriptionStatus.daysRemaining} days.
                  Please renew to avoid service interruption.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        )}

        {/* Payment Section */}
        {isExpired && subscriptionStatus && (
          <Card className="border-2 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Renew Subscription
              </CardTitle>
              <CardDescription>
                Choose a payment method to renew your subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-lg border border-orange-200">
                <p className="text-sm text-muted-foreground mb-2">Annual renewal amount:</p>
                <p className="text-4xl font-bold flex items-center gap-2">
                  <IndianRupee className="h-8 w-8" />
                  {subscriptionStatus.renewalAmount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Valid for 12 months from payment date</p>
              </div>

              {/* Payment Methods */}
              <div>
                <h4 className="font-semibold mb-4">Select Payment Method</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <Button
                        key={method.id}
                        variant={selectedPaymentMethod === method.id ? "default" : "outline"}
                        className="h-auto p-4 flex flex-col items-start gap-2"
                        onClick={() => handlePayment(method.id)}
                        disabled={processing}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <Icon className="h-5 w-5" />
                          <div className="text-left flex-1">
                            <p className="font-semibold">{method.name}</p>
                            <p className="text-xs text-muted-foreground">{method.description}</p>
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Actions */}
              <div className="flex gap-4 pt-4 border-t">
                <Button
                  onClick={() => handlePayment('upi')}
                  disabled={processing}
                  className="flex-1"
                  size="lg"
                >
                  {processing && selectedPaymentMethod === 'upi' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Smartphone className="h-4 w-4 mr-2" />
                      Pay Now (UPI)
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleMarkAsPaid}
                  disabled={processing}
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Note: In production, this would integrate with a payment gateway.
                Contact support for payment instructions or use "Mark as Paid" after completing payment.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Active Subscription Info */}
        {isActive && subscriptionStatus && (
          <Card>
            <CardHeader>
              <CardTitle>Subscription Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Free Trial:</span>
                <span className="font-semibold">11 months from account creation</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Renewal:</span>
                <span className="font-semibold">₹3,000 annually after free trial</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment:</span>
                <span className="font-semibold">Contact support to complete payment</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
