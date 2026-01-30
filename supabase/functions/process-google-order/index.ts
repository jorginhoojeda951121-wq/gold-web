/**
 * Supabase Edge Function: process-google-order
 * Handles incoming orders from Google Actions Center.
 * Deploy: supabase functions deploy process-google-order
 * POST /functions/v1/process-google-order
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

interface GoogleOrderRequest {
  orderId: string;
  customerId?: string;
  customerEmail: string;
  customerPhone?: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee?: number;
  total: number;
  paymentMethod: string;
  orderType: string;
  specialInstructions?: string;
}

interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: unknown[];
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
    });
  }

  try {
    const orderRequest = (await req.json()) as GoogleOrderRequest;

    if (!orderRequest.customerEmail || !orderRequest.items?.length) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
      });
    }

    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `G${timestamp}${random}`;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: orderRequest.customerName,
        customer_email: orderRequest.customerEmail,
        customer_phone: orderRequest.customerPhone,
        items: orderRequest.items,
        subtotal: orderRequest.subtotal,
        tax: orderRequest.tax,
        delivery_fee: orderRequest.deliveryFee || 0,
        total: orderRequest.total,
        payment_method: orderRequest.paymentMethod,
        order_type: orderRequest.orderType,
        special_instructions: orderRequest.specialInstructions,
        source: 'google',
        google_order_id: orderRequest.orderId,
        status: 'pending',
        estimated_ready_time: '30 minutes',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const posWebhookUrl = Deno.env.get('POS_WEBHOOK_URL');
    if (posWebhookUrl) {
      try {
        await fetch(posWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Order-Source': 'google',
          },
          body: JSON.stringify({
            event: 'order_received',
            orderId: order.id,
            orderNumber: order.order_number,
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            items: order.items,
            total: order.total,
            orderType: order.order_type,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch {
        // Don't fail the order if webhook fails
      }
    }

    try {
      await supabase.functions.invoke('send-order-confirmation', {
        body: {
          email: orderRequest.customerEmail,
          customerName: orderRequest.customerName,
          orderNumber,
          items: orderRequest.items,
          total: orderRequest.total,
          orderType: orderRequest.orderType,
        },
      });
    } catch {
      // Email optional
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        status: 'pending',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: 'Failed to process order', details: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
