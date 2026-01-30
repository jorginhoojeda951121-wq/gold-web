/**
 * Google Actions Center - Integration Examples
 * 
 * Copy and adapt these examples for your use case
 */

// ============================================
// EXAMPLE 1: Initialize in Main Application
// ============================================

import { initializeActionsCenter, getActionsCenter } from '@/lib/googleActionsCenter';
import { initializeOrderHandler, getOrderHandler } from '@/lib/googleOrderHandler';
import { initializeWebSocket, getWebSocketManager } from '@/lib/posWebSocketManager';

export async function setupGoogleActionsCenter() {
  // Initialize Actions Center Manager
  const actionsCenter = initializeActionsCenter({
    businessId: process.env.VITE_BUSINESS_ID!,
    businessName: process.env.VITE_BUSINESS_NAME!,
    checkoutBaseUrl: process.env.VITE_CHECKOUT_BASE_URL!,
  });

  console.log('✓ Actions Center initialized');

  // Initialize Order Handler
  const orderHandler = initializeOrderHandler(
    process.env.VITE_BUSINESS_ID!,
    process.env.VITE_WEBHOOK_SECRET!,
    process.env.VITE_POS_WEBSOCKET_URL!
  );

  console.log('✓ Order Handler initialized');

  // Initialize WebSocket (server-side only)
  if (typeof window === 'undefined') {
    const wsManager = initializeWebSocket(process.env.VITE_BUSINESS_ID!);
    wsManager.initializeServer(3001);
    console.log('✓ WebSocket server started on port 3001');
  }

  return { actionsCenter, orderHandler };
}

// ============================================
// EXAMPLE 2: Generate Menu Feed
// ============================================

import { generateMenuFeed, cacheMenuFeed } from '@/lib/googleMenuFeedManager';

export async function generateAndCacheMenuFeed(businessId: string) {
  try {
    // Generate JSON feed
    const jsonFeed = await generateMenuFeed(businessId, 'json');
    await cacheMenuFeed(businessId, jsonFeed, 'json');
    console.log('✓ JSON feed generated and cached');

    // Generate XML feed
    const xmlFeed = await generateMenuFeed(businessId, 'xml');
    await cacheMenuFeed(businessId, xmlFeed, 'xml');
    console.log('✓ XML feed generated and cached');

    // Log feed URLs
    const baseUrl = process.env.VITE_CHECKOUT_BASE_URL;
    console.log(`JSON Feed: ${baseUrl}/functions/v1/google-menu-feed?businessId=${businessId}&format=json`);
    console.log(`XML Feed: ${baseUrl}/functions/v1/google-menu-feed?businessId=${businessId}&format=xml`);

  } catch (error) {
    console.error('Error generating feeds:', error);
    throw error;
  }
}

// ============================================
// EXAMPLE 3: Process Order Manually
// ============================================

import { getOrderHandler } from '@/lib/googleOrderHandler';

export async function handleGoogleOrderManually(
  customerEmail: string,
  customerName: string,
  items: any[]
) {
  const handler = getOrderHandler();

  const orderData = {
    orderId: `GORDER-${Date.now()}`,
    source: 'google' as const,
    customerEmail,
    customerName,
    customerPhone: '555-1234',
    items: items.map(item => ({
      menuItemId: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
    })),
    subtotal: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    tax: items.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 0.1,
    total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.1,
    paymentMethod: 'credit_card' as const,
    orderType: 'pickup' as const,
    createdAt: new Date().toISOString(),
    status: 'pending' as const,
  };

  return handler.processGoogleOrder(orderData);
}

// ============================================
// EXAMPLE 4: Real-time Order Tracking
// ============================================

import { useGoogleOrderNotifications, useOrderStatusPolling } from '@/hooks/useGoogleOrderNotifications';

export function OrderTracker({ orderId }: { orderId: string }) {
  const { notification } = useGoogleOrderNotifications(orderId);
  const { order, loading, refetch } = useOrderStatusPolling(orderId, 3000);

  return (
    <div className="p-6 bg-white rounded-lg border">
      <h2 className="text-2xl font-bold mb-4">Order Tracking</h2>

      {loading ? (
        <p className="text-gray-500">Loading order details...</p>
      ) : order ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Order Number</p>
            <p className="text-xl font-bold">{order.order_number}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-lg font-semibold capitalize">{order.status}</p>
          </div>

          {order.estimated_ready_time && (
            <div>
              <p className="text-sm text-gray-600">Estimated Ready Time</p>
              <p className="text-lg">{order.estimated_ready_time}</p>
            </div>
          )}

          {notification && notification.message && (
            <div className="p-3 bg-blue-100 border border-blue-300 rounded">
              <p className="text-blue-900">{notification.message}</p>
            </div>
          )}

          <button
            onClick={() => refetch()}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Status
          </button>
        </div>
      ) : (
        <p className="text-red-500">Order not found</p>
      )}
    </div>
  );
}

// ============================================
// EXAMPLE 5: Send POS Notification
// ============================================

import { getWebSocketManager } from '@/lib/posWebSocketManager';

export function notifyPOSTerminals(order: any) {
  const wsManager = getWebSocketManager();

  // Notify all terminals in the business
  wsManager.notifyOrderReceived({
    orderId: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    orderType: order.order_type,
    items: order.items.map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      modifiers: item.modifiers || [],
    })),
    specialInstructions: order.special_instructions,
    estimatedReadyTime: '30 minutes',
    priority: 'normal',
    timestamp: new Date().toISOString(),
  });

  console.log(`✓ Notification sent to ${wsManager.getConnectedTerminals().length} terminals`);
}

// ============================================
// EXAMPLE 6: WebSocket Client for POS Terminal
// ============================================

export class POSTerminalClient {
  private ws: WebSocket | null = null;
  private businessId: string;
  private terminalId: string;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(businessId: string, terminalId: string) {
    this.businessId = businessId;
    this.terminalId = terminalId;
  }

  connect(wsUrl: string = 'ws://localhost:3001'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('Connected to POS server');

          // Register terminal
          this.ws!.send(
            JSON.stringify({
              event: 'register_terminal',
              terminalId: this.terminalId,
              terminalName: `POS-${this.terminalId}`,
            })
          );

          resolve();
        };

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);

          if (message.type === 'order_received') {
            // Play sound notification
            this.playNotification();

            // Call registered handlers
            const handler = this.messageHandlers.get('order_received');
            if (handler) handler(message.data);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('Disconnected from POS server');
          // Auto-reconnect after 5 seconds
          setTimeout(() => this.connect(wsUrl), 5000);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  onOrderReceived(handler: (order: any) => void) {
    this.messageHandlers.set('order_received', handler);
  }

  acknowledgeOrder(orderId: string) {
    if (this.ws) {
      this.ws.send(
        JSON.stringify({
          event: 'order_acknowledged',
          orderId,
        })
      );
    }
  }

  markOrderReady(orderId: string, estimatedTime?: string) {
    if (this.ws) {
      this.ws.send(
        JSON.stringify({
          event: 'order_ready',
          orderId,
          estimatedTime,
        })
      );
    }
  }

  private playNotification() {
    // Play sound (use Web Audio API or HTML5 audio)
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(err => console.error('Error playing sound:', err));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// ============================================
// EXAMPLE 7: Handle Payment Webhook
// ============================================

import { supabase } from '@/lib/supabaseClient';

export async function handlePaymentNotification(
  orderId: string,
  paymentStatus: 'success' | 'failed'
) {
  try {
    // Call the payment webhook function
    const { data, error } = await supabase.functions.invoke('google-payment-webhook', {
      body: {
        orderId,
        googleOrderId: `GORDER-${orderId}`,
        paymentStatus,
        amount: 0, // Will be fetched from order
        currency: 'USD',
        transactionId: `TXN-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    });

    if (error) throw error;

    console.log('✓ Payment notification processed:', data);
    return data;
  } catch (error) {
    console.error('Error handling payment:', error);
    throw error;
  }
}

// ============================================
// EXAMPLE 8: Get Order Status
// ============================================

export async function getOrderStatusExample(orderId: string) {
  const handler = getOrderHandler();

  const status = await handler.getOrderStatus(orderId);

  const statusMap: Record<string, string> = {
    pending: '⏳ Waiting for confirmation',
    confirmed: '✓ Confirmed - preparing',
    in_progress: '👨‍🍳 Being prepared',
    ready: '🎉 Ready for pickup',
    completed: '✅ Completed',
    cancelled: '❌ Cancelled',
  };

  return statusMap[status || 'pending'] || 'Unknown status';
}

// ============================================
// EXAMPLE 9: React Component - Order Form
// ============================================

import { useState } from 'react';

export function GoogleOrderForm({ onOrderSubmit }: { onOrderSubmit: (order: any) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const order = {
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      items,
      subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      tax: items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 0.1,
    };

    onOrderSubmit(order);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Your Name"
        value={customerInfo.name}
        onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
        className="w-full px-4 py-2 border rounded"
      />

      <input
        type="email"
        placeholder="Your Email"
        value={customerInfo.email}
        onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})}
        className="w-full px-4 py-2 border rounded"
      />

      <button type="submit" className="w-full px-4 py-2 bg-blue-500 text-white rounded">
        Place Order
      </button>
    </form>
  );
}

// ============================================
// EXAMPLE 10: Testing - Mock Order
// ============================================

export async function testOrderFlow() {
  const testOrder = {
    orderId: `TEST-${Date.now()}`,
    source: 'google',
    customerEmail: 'test@example.com',
    customerName: 'Test Customer',
    customerPhone: '555-1234',
    items: [
      {
        menuItemId: 'burger-1',
        name: 'Classic Burger',
        quantity: 2,
        unitPrice: 9.99,
        totalPrice: 19.98,
      },
      {
        menuItemId: 'fries-1',
        name: 'Fries',
        quantity: 1,
        unitPrice: 3.99,
        totalPrice: 3.99,
      },
    ],
    subtotal: 23.97,
    tax: 2.40,
    total: 26.37,
    paymentMethod: 'credit_card',
    orderType: 'pickup',
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  console.log('📋 Test Order:', testOrder);

  // This would call your edge function
  // const result = await supabase.functions.invoke('process-google-order', { body: testOrder });
  // console.log('✓ Order processed:', result);

  return testOrder;
}

export default {
  setupGoogleActionsCenter,
  generateAndCacheMenuFeed,
  handleGoogleOrderManually,
  notifyPOSTerminals,
  POSTerminalClient,
  handlePaymentNotification,
  getOrderStatusExample,
  testOrderFlow,
};
