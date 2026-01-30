/**
 * Supabase Edge Function: process-google-order
 * 
 * Handles incoming orders from Google Actions Center
 * Processes payment, updates database, notifies POS
 * 
 * Deployment:
 * supabase functions deploy process-google-order
 * 
 * Trigger:
 * Called when user completes checkout from Google
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
  modifiers?: any[];
}

serve(async (req: Request) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
    });
  }

  try {
    const orderRequest = await req.json() as GoogleOrderRequest;

    // Validate request
    if (!orderRequest.customerEmail || !orderRequest.items.length) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
      });
    }

    // Generate order number
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    const orderNumber = `G${timestamp}${random}`;

    // Insert order into database
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
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Send order to POS system via webhook
    const posWebhookUrl = Deno.env.get('POS_WEBHOOK_URL');
    if (posWebhookUrl) {
      try {
        const webhookPayload = {
          event: 'order_received',
          orderId: order.id,
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          items: order.items,
          total: order.total,
          orderType: order.order_type,
          specialInstructions: order.special_instructions,
          timestamp: new Date().toISOString(),
        };

        await fetch(posWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Order-Source': 'google',
          },
          body: JSON.stringify(webhookPayload),
        });

        console.log(`POS webhook sent for order ${order.id}`);
      } catch (webhookError) {
        console.error('POS webhook failed:', webhookError);
        // Don't fail the order if webhook fails
      }
    }

    // Send confirmation email
    try {
      await supabase.functions.invoke('send-order-confirmation', {
        body: {
          email: orderRequest.customerEmail,
          customerName: orderRequest.customerName,
          orderNumber: orderNumber,
          items: orderRequest.items,
          total: orderRequest.total,
          orderType: orderRequest.orderType,
        },
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        status: 'pending',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing order:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process order',
        details: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
