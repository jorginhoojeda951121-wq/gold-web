/**
 * useGoogleOrderNotifications Hook
 * Real-time updates for order notifications from POS
 * Listens to order updates via Supabase Realtime
 */

import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';

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

  useEffect(() => {
    if (!orderId) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel('order-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `google_order_id=eq.${orderId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as Record<string, unknown>;
          setNotification({
            orderId: String(updatedOrder.id),
            orderNumber: String(updatedOrder.order_number ?? ''),
            status: (updatedOrder.status as OrderNotification['status']) ?? 'pending',
            message: updatedOrder.notes as string | undefined,
            estimatedTime: updatedOrder.estimated_ready_time as string | undefined,
          });
          setIsConnected(true);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsConnected(true);
        if (status === 'CHANNEL_ERROR') setError('Failed to subscribe to order updates');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

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
 * Fallback when Realtime is unavailable
 */
export function useOrderStatusPolling(orderId?: string, interval = 5000) {
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderStatus = useCallback(async (targetOrderId: string) => {
    const supabase = getSupabase();
    try {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('orders')
        .select('*')
        .eq('google_order_id', targetOrderId)
        .single();

      if (queryError) {
        setError('Order not found');
        return;
      }

      setOrder(data as Record<string, unknown>);
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

    fetchOrderStatus(orderId);
    const intervalRef = setInterval(() => fetchOrderStatus(orderId), interval);

    return () => clearInterval(intervalRef);
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
 * Establishes WebSocket connection to POS terminal (optional)
 * Sends real-time order notifications
 */
export function useGoogleOrderWebSocket(businessId?: string) {
  const [connected, setConnected] = useState(false);
  const [terminals, setTerminals] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = { current: null as WebSocket | null };

  useEffect(() => {
    if (!businessId) return;

    const wsUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_POS_WEBSOCKET_URL || 'ws://localhost:3001';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ event: 'register_business', businessId }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'terminals_update') setTerminals(data.terminals || []);
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection failed');
      setConnected(false);
    };

    ws.onclose = () => setConnected(false);

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [businessId]);

  const sendNotification = useCallback((notification: OrderNotification) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'send_order_notification', notification }));
    }
  }, []);

  const broadcastAlert = useCallback(
    (title: string, message: string, priority: 'info' | 'warning' | 'error' = 'info') => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event: 'send_alert', title, message, priority }));
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
