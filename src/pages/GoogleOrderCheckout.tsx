/**
 * Google Order Checkout Page
 * Handles order redirect from Google Actions Center
 * Processes order and sends to POS system
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: unknown[];
}

export default function GoogleOrderCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<{
    items: OrderItem[];
    subtotal: number;
    tax: number;
    total: number;
    orderType: string;
  } | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    const loadOrderData = async () => {
      try {
        const source = searchParams.get('source');
        const itemId = searchParams.get('item');
        const itemName = searchParams.get('name');
        const price = searchParams.get('price');

        if (source !== 'google') {
          setError('Invalid order source');
          return;
        }

        if (!itemId || !itemName || !price) {
          setError('Missing order items');
          return;
        }

        const order: OrderItem = {
          menuItemId: itemId,
          name: decodeURIComponent(itemName),
          quantity: 1,
          unitPrice: parseFloat(price),
          totalPrice: parseFloat(price),
        };

        setOrderData({
          items: [order],
          subtotal: parseFloat(price),
          tax: parseFloat(price) * 0.1,
          total: parseFloat(price) * 1.1,
          orderType: 'pickup',
        });

        setLoading(false);
      } catch (err) {
        console.error('Error loading order:', err);
        setError('Failed to load order');
        setLoading(false);
      }
    };

    loadOrderData();
  }, [searchParams]);

  const handleSubmitOrder = async () => {
    try {
      if (!customerInfo.name || !customerInfo.email) {
        toast({
          title: 'Error',
          description: 'Please provide name and email',
          variant: 'destructive',
        });
        return;
      }

      if (!orderData) return;

      setLoading(true);

      const googleOrderId = `GORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const orderPayload = {
        orderId: googleOrderId,
        source: 'google',
        customerId: undefined,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        customerName: customerInfo.name,
        items: orderData.items,
        subtotal: orderData.subtotal,
        tax: orderData.tax,
        deliveryFee: 0,
        total: orderData.total,
        paymentMethod: 'credit_card',
        orderType: orderData.orderType,
        specialInstructions: '',
        estimatedReadyTime: '30 minutes',
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      const supabase = getSupabase();
      const { data, error: fnError } = await supabase.functions.invoke('process-google-order', {
        body: orderPayload,
      });

      if (fnError) throw fnError;

      toast({
        title: 'Success',
        description: `Order received! Order #${data?.orderNumber || googleOrderId}`,
      });

      setTimeout(() => {
        navigate('/order-confirmation?orderId=' + googleOrderId);
      }, 1500);
    } catch (err) {
      console.error('Error submitting order:', err);
      toast({
        title: 'Error',
        description: 'Failed to submit order. Please try again.',
        variant: 'destructive',
      });
      setError('Failed to submit order');
      setLoading(false);
    }
  };

  if (loading && !orderData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading order...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="mb-6">{error}</p>
          <Button onClick={() => navigate('/')} className="w-full">
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-8">Complete Your Order</h1>

          <div className="bg-gray-100 p-6 rounded-lg mb-8">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3">
              {orderData?.items?.map((item: OrderItem, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.name} x{item.quantity}</span>
                  <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-300 mt-4 pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${orderData?.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>${orderData?.tax?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${orderData?.total?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold">Your Information</h2>

            <div>
              <label className="block text-sm font-medium mb-1">Full Name *</label>
              <input
                type="text"
                value={customerInfo.name}
                onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                value={customerInfo.email}
                onChange={e => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={customerInfo.phone}
                onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Order Type</h2>
            <div className="flex gap-4">
              {['pickup', 'delivery', 'dine_in'].map(type => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="orderType"
                    value={type}
                    checked={orderData?.orderType === type}
                    onChange={e => orderData && setOrderData({ ...orderData, orderType: e.target.value })}
                  />
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmitOrder}
            disabled={loading}
            className="w-full h-12 text-lg font-semibold"
          >
            {loading ? 'Processing...' : `Pay $${orderData?.total?.toFixed(2)}`}
          </Button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Payment is securely processed by Google. You will receive a confirmation email shortly.
          </p>
        </Card>
      </div>
    </div>
  );
}
