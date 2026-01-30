/**
 * Supabase Edge Function: google-payment-webhook
 * 
 * Handles payment notification webhooks from Google
 * Updates order status and notifies POS system
 * 
 * Deployment:
 * supabase functions deploy google-payment-webhook
 * 
 * Usage:
 * POST /functions/v1/google-payment-webhook
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

interface PaymentWebhookPayload {
  orderId: string;
  googleOrderId: string;
  paymentStatus: 'success' | 'failed' | 'pending' | 'cancelled';
  amount: number;
  currency: string;
  transactionId?: string;
  timestamp: string;
  signature?: string;
}

serve(async (req: Request) => {
  // Enable CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Signature',
      },
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.json() as PaymentWebhookPayload;

    // Validate webhook payload
    if (!payload.orderId && !payload.googleOrderId) {
      return new Response(
        JSON.stringify({ error: 'Missing orderId or googleOrderId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.paymentStatus) {
      return new Response(
        JSON.stringify({ error: 'Missing paymentStatus' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .or(`id.eq.${payload.orderId},google_order_id.eq.${payload.googleOrderId}`)
      .single();

    if (orderError) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update order status based on payment status
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
        newStatus = 'pending';
        notes = 'Payment pending processing.';
        break;
      case 'cancelled':
        newStatus = 'cancelled';
        notes = 'Payment cancelled by customer.';
        break;
    }

    // Update order in database
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        notes,
        payment_status: payload.paymentStatus,
        payment_transaction_id: payload.transactionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update order' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If payment successful, notify POS system
    if (payload.paymentStatus === 'success') {
      try {
        const posWebhookUrl = Deno.env.get('POS_WEBHOOK_URL');
        if (posWebhookUrl) {
          const notificationPayload = {
            event: 'payment_completed',
            orderId: order.id,
            orderNumber: order.order_number,
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            items: order.items,
            total: order.total,
            orderType: order.order_type,
            specialInstructions: order.special_instructions,
            transactionId: payload.transactionId,
            timestamp: new Date().toISOString(),
          };

          await fetch(posWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Type': 'payment_notification',
            },
            body: JSON.stringify(notificationPayload),
          });

          console.log(`POS webhook sent for payment confirmation on order ${order.id}`);
        }
      } catch (webhookError) {
        console.error('Error notifying POS:', webhookError);
        // Don't fail the webhook response if POS notification fails
      }

      // Send order confirmation email
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
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        status: newStatus,
        message: notes,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process webhook',
        details: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
