/**
 * useGoogleOrderNotifications Hook
 * Real-time WebSocket connection for order notifications from POS
 * Listens to order updates and broadcasts alerts
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface OrderNotification {
  orderId: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'ready' | 'completed' | 'cancelled';
  message?: string;
  estimatedTime?: string;
  priority?: 'normal' | 'high' | 'urgent';
}

export function useGoogleOrderNotifications(orderId?: string) {
  const [notification, setNotification] = useState<OrderNotification | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const subscribeToOrderUpdates = useCallback((targetOrderId: string) => {
    try {
      // Subscribe to real-time updates for this order
      const subscription = supabase
        .from(`orders:id=eq.${targetOrderId}`)
        .on('*', (payload) => {
          const updatedOrder = payload.new as any;

          setNotification({
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.order_number,
            status: updatedOrder.status,
            message: updatedOrder.notes,
            estimatedTime: updatedOrder.estimated_ready_time,
          });

          setIsConnected(true);
        })
        .subscribe();

      return subscription;
    } catch (err) {
      console.error('Error subscribing to order updates:', err);
      setError('Failed to subscribe to order updates');
      return null;
    }
  }, []);

  useEffect(() => {
    if (!orderId) return;

    const subscription = subscribeToOrderUpdates(orderId);

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [orderId, subscribeToOrderUpdates]);

  return {
    notification,
    isConnected,
    error,
    setNotification,
  };
}

/**
 * useOrderStatusPolling Hook
 * Polls order status from database at regular intervals
 * Fallback when WebSocket is unavailable
 */
export function useOrderStatusPolling(orderId?: string, interval: number = 5000) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrderStatus = useCallback(async (targetOrderId: string) => {
    try {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', targetOrderId)
        .single();

      if (queryError) {
        setError('Order not found');
        return;
      }

      setOrder(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to fetch order status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!orderId) return;

    // Initial fetch
    fetchOrderStatus(orderId);

    // Setup polling interval
    intervalRef.current = setInterval(() => {
      fetchOrderStatus(orderId);
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [orderId, interval, fetchOrderStatus]);

  return {
    order,
    loading,
    error,
    refetch: () => orderId && fetchOrderStatus(orderId),
  };
}

/**
 * useGoogleOrderWebSocket Hook
 * Establishes WebSocket connection to POS terminal
 * Sends real-time order notifications
 */
export function useGoogleOrderWebSocket(businessId?: string) {
  const [connected, setConnected] = useState(false);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!businessId) return;

    try {
      const wsUrl = process.env.VITE_POS_WEBSOCKET_URL || 'ws://localhost:3001';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);

        // Send authentication/registration
        ws.send(
          JSON.stringify({
            event: 'register_business',
            businessId,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'terminals_update') {
            setTerminals(data.terminals || []);
          }

          if (data.type === 'connection_confirmed') {
            console.log('Business registered:', data.businessId);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = () => {
        console.error('WebSocket error');
        setError('WebSocket connection failed');
        setConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setConnected(false);
      };

      wsRef.current = ws;

      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');
    }
  }, [businessId]);

  const sendNotification = useCallback(
    (notification: OrderNotification) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: 'send_order_notification',
            notification,
          })
        );
      }
    },
    []
  );

  const broadcastAlert = useCallback(
    (title: string, message: string, priority: 'info' | 'warning' | 'error' = 'info') => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: 'send_alert',
            title,
            message,
            priority,
          })
        );
      }
    },
    []
  );

  return {
    connected,
    terminals,
    error,
    sendNotification,
    broadcastAlert,
  };
}
