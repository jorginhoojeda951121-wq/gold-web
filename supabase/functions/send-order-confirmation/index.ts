/**
 * Supabase Edge Function: send-order-confirmation
 * Sends order confirmation email to customer (Resend API or no-op if not configured).
 * Deploy: supabase functions deploy send-order-confirmation
 * Set RESEND_API_KEY and RESEND_FROM_EMAIL in function secrets.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'no-reply@retailmarketingpro.in';

interface OrderConfirmationPayload {
  email: string;
  customerName: string;
  orderNumber: string;
  items?: { name: string; quantity: number; totalPrice?: number; unitPrice?: number }[];
  total?: number;
  orderType?: string;
  estimatedReadyTime?: string;
}

function buildEmailHtml(p: OrderConfirmationPayload): string {
  const itemsList =
    p.items
      ?.map(
        (i) =>
          `<li>${escapeHtml(i.name)} x${i.quantity} — $${((i.totalPrice ?? (i.unitPrice ?? 0) * i.quantity)).toFixed(2)}</li>`
      )
      .join('') || '<li>No items listed</li>';
  const total = (p.total ?? 0).toFixed(2);
  const orderType = (p.orderType || 'pickup').replace('_', ' ');
  const readyTime = p.estimatedReadyTime ? ` Estimated ready: ${p.estimatedReadyTime}.` : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order Confirmation</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h1 style="color:#1a1a1a;">Order Confirmed</h1>
  <p>Hi ${escapeHtml(p.customerName)},</p>
  <p>Thank you for your order. We've received it and will start preparing it right away.</p>
  <p><strong>Order number:</strong> ${escapeHtml(p.orderNumber)}</p>
  <p><strong>Order type:</strong> ${escapeHtml(orderType)}</p>
  <ul>${itemsList}</ul>
  <p><strong>Total:</strong> $${total}</p>
  <p>${readyTime}</p>
  <p>You'll receive a notification when your order is ready.</p>
  <p>— Gold Crafts Team</p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
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
    const body = (await req.json()) as OrderConfirmationPayload;

    if (!body.email) {
      return new Response(JSON.stringify({ error: 'Missing email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!RESEND_API_KEY) {
      console.log('send-order-confirmation: RESEND_API_KEY not set, skipping email to', body.email);
      return new Response(JSON.stringify({ ok: true, skipped: 'no RESEND_API_KEY' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const html = buildEmailHtml(body);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [body.email],
        subject: `Order Confirmation #${body.orderNumber}`,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Resend API error:', res.status, text);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: text }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = (await res.json()) as { id?: string };
    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('send-order-confirmation error:', message);
    return new Response(
      JSON.stringify({ error: 'Internal error', details: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
