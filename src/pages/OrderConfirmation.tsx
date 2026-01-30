/**
 * Order Confirmation Page
 * Shows confirmation after Google order is submitted
 * Provides order tracking information
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface OrderDetails {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderType: string;
  items: { name: string; quantity: number; totalPrice?: number; unitPrice?: number }[];
  createdAt: string;
  estimatedReadyTime?: string;
}

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const orderId = searchParams.get('orderId');

        if (!orderId) {
          setError('No order ID provided');
          setLoading(false);
          return;
        }

        const supabase = getSupabase();
        const { data, error: queryError } = await supabase
          .from('orders')
          .select('*')
          .eq('google_order_id', orderId)
          .single();

        if (queryError) {
          console.error('Query error:', queryError);
          setError('Order not found');
          setLoading(false);
          return;
        }

        if (data) {
          setOrder({
            id: data.id,
            orderNumber: data.order_number,
            status: data.status,
            total: data.total,
            customerName: data.customer_name,
            customerEmail: data.customer_email,
            customerPhone: data.customer_phone,
            orderType: data.order_type,
            items: data.items ?? [],
            createdAt: data.created_at,
            estimatedReadyTime: data.estimated_ready_time,
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading order:', err);
        setError('Failed to load order details');
        setLoading(false);
      }
    };

    loadOrder();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="mb-6">{error || 'Order not found'}</p>
          <Button onClick={() => navigate('/')} className="w-full">
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    ready: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-lg text-gray-600">
            Thank you for your order. We've received it and will start preparing it right away.
          </p>
        </div>

        <Card className="p-8 mb-8">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600">Order Number</p>
              <p className="text-2xl font-bold">{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Order Status</p>
              <div className="mt-2">
                <span
                  className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${statusColors[order.status] || 'bg-gray-100'}`}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <hr className="my-6" />

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Customer Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{order.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{order.customerEmail}</p>
              </div>
              {order.customerPhone && (
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{order.customerPhone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Order Type</p>
                <p className="font-medium capitalize">{order.orderType.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          <hr className="my-6" />

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Order Items</h2>
            <div className="space-y-2">
              {order.items?.map((item: { name: string; quantity: number; totalPrice?: number; unitPrice?: number }, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>
                    {item.name} <span className="text-gray-500">x{item.quantity}</span>
                  </span>
                  <span className="font-medium">
                    ${((item.totalPrice ?? (item.unitPrice ?? 0) * item.quantity)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <hr className="my-6" />

          <div className="flex justify-between text-lg font-bold">
            <span>Total Amount</span>
            <span>${order.total.toFixed(2)}</span>
          </div>

          {order.estimatedReadyTime && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-600">
                <strong>Estimated Ready Time:</strong> {order.estimatedReadyTime}
              </p>
            </div>
          )}
        </Card>

        <Card className="p-6 bg-blue-50 border-blue-200 mb-8">
          <h3 className="font-semibold mb-2">What's Next?</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">1.</span>
              <span>A confirmation email has been sent to {order.customerEmail}</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">2.</span>
              <span>
                Your order will be {order.orderType === 'delivery' ? 'prepared and delivered' : 'prepared for'}
                {order.estimatedReadyTime ? ` in approximately ${order.estimatedReadyTime}` : ''}
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">3.</span>
              <span>You'll receive a notification when your order is ready</span>
            </li>
          </ul>
        </Card>

        <div className="flex gap-4">
          <Button onClick={() => navigate('/')} variant="outline" className="flex-1">
            Back to Home
          </Button>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(order.orderNumber);
              alert('Order number copied to clipboard!');
            }}
            className="flex-1"
          >
            Copy Order Number
          </Button>
        </div>

        <div className="text-center mt-8 text-sm text-gray-600">
          <p>Need help? Contact us via the Support page.</p>
        </div>
      </div>
    </div>
  );
}
