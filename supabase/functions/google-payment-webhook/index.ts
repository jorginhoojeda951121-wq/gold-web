/**
 * Supabase Edge Function: google-payment-webhook
 * Handles payment notification webhooks from Google. Updates order status.
 * Deploy: supabase functions deploy google-payment-webhook
 * POST /functions/v1/google-payment-webhook
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

interface PaymentWebhookPayload {
  orderId?: string;
  googleOrderId?: string;
  paymentStatus: 'success' | 'failed' | 'pending' | 'cancelled';
  amount?: number;
  currency?: string;
  transactionId?: string;
  timestamp?: string;
  signature?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Signature',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = (await req.json()) as PaymentWebhookPayload;

    if (!payload.orderId && !payload.googleOrderId) {
      return new Response(JSON.stringify({ error: 'Missing orderId or googleOrderId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!payload.paymentStatus) {
      return new Response(JSON.stringify({ error: 'Missing paymentStatus' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let query = supabase.from('orders').select('*');
    if (payload.googleOrderId) {
      query = query.eq('google_order_id', payload.googleOrderId);
    } else if (payload.orderId) {
      query = query.eq('id', payload.orderId);
    } else {
      return new Response(JSON.stringify({ error: 'Missing orderId or googleOrderId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const { data: order, error: orderError } = await query.single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let newStatus = 'pending';
    let notes = '';

    switch (payload.paymentStatus) {
      case 'success':
        newStatus = 'confirmed';
        notes = `Payment successful. Transaction ID: ${payload.transactionId || 'N/A'}`;
        break;
      case 'failed':
        newStatus = 'cancelled';
        notes = 'Payment failed. Order cancelled.';
        break;
      case 'pending':
        notes = 'Payment pending processing.';
        break;
      case 'cancelled':
        newStatus = 'cancelled';
        notes = 'Payment cancelled by customer.';
        break;
    }

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      notes,
      payment_status: payload.paymentStatus,
      payment_transaction_id: payload.transactionId,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase.from('orders').update(updatePayload).eq('id', order.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to update order' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (payload.paymentStatus === 'success') {
      const posWebhookUrl = Deno.env.get('POS_WEBHOOK_URL');
      if (posWebhookUrl) {
        try {
          await fetch(posWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Webhook-Type': 'payment_notification' },
            body: JSON.stringify({
              event: 'payment_completed',
              orderId: order.id,
              orderNumber: order.order_number,
              transactionId: payload.transactionId,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch {
          // Don't fail response
        }
      }

      try {
        await supabase.functions.invoke('send-order-confirmation', {
          body: {
            email: order.customer_email,
            customerName: order.customer_name,
            orderNumber: order.order_number,
            items: order.items,
            total: order.total,
            orderType: order.order_type,
            estimatedReadyTime: order.estimated_ready_time,
          },
        });
      } catch {
        // Email optional
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        status: newStatus,
        message: notes,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: 'Failed to process webhook', details: message }),
      { status: 500,
        headers: { 'Content-Type': 'application/json' } }
    );
  }
});
