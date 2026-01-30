// Supabase Edge Function (Deno) - generate-ai-report
// Generates professional reports from orders using Google GenAI.
// Deploy: supabase functions deploy generate-ai-report
// Set GOOGLE_GENAI_API_KEY in function secrets.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GOOGLE_GENAI_URL =
  Deno.env.get('GOOGLE_GENAI_ENDPOINT') ||
  'https://generative.googleapis.com/v1beta2/models/text-bison-001:generateText';
const GOOGLE_GENAI_KEY = Deno.env.get('GOOGLE_GENAI_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const payload = await req.json();
    const orders = (payload as { orders?: unknown[] }).orders || [];

    if (!GOOGLE_GENAI_KEY) {
      const summary = fallbackSummary(orders as Record<string, unknown>[]);
      return new Response(JSON.stringify({ report: summary }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = buildPrompt(orders as Record<string, unknown>[]);
    const aiRes = await fetch(GOOGLE_GENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GOOGLE_GENAI_KEY}`,
      },
      body: JSON.stringify({
        prompt: { text: prompt },
        temperature: 0.2,
        maxOutputTokens: 512,
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: txt }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = (await aiRes.json()) as Record<string, unknown>;
    const report =
      (json?.candidates as { content?: string }[])?.[0]?.content ||
      (json?.outputs as { content?: string }[])?.[0]?.content ||
      JSON.stringify(json);
    return new Response(JSON.stringify({ report }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildPrompt(orders: Record<string, unknown>[]): string {
  const header = `You are a helpful assistant that writes a concise professional sales report for a POS system. Summarize orders, totals, top-selling items, and recommendations.`;
  const bodyLines = orders.map((o: Record<string, unknown>) => {
    const when = o.created_at ? ` at ${o.created_at}` : '';
    const itemsList = (o.items as { qty?: number; name?: string }[]) || [];
    const items = itemsList.map((it) => `${it.qty ?? 1}x ${it.name}`).join(', ') || 'no items';
    return `Order ${o.id}${when}: ${items} — total ${o.total ?? 'N/A'}`;
  });
  return `${header}\n\nOrders:\n${bodyLines.join('\n')}\n\nProvide:\n- A one-paragraph executive summary\n- Top 3 selling items\n- Recommended actions for staff/marketing\n- A short subject line for emailing the report`;
}

function fallbackSummary(orders: Record<string, unknown>[]): string {
  const totalOrders = orders.length;
  const totalValue = orders.reduce((s: number, o: Record<string, unknown>) => s + (Number(o.total) || 0), 0);
  const itemCounts: Record<string, number> = {};
  for (const o of orders) {
    const items = (o.items as { name?: string; qty?: number }[]) || [];
    for (const it of items) {
      const name = it.name ?? 'Unknown';
      itemCounts[name] = (itemCounts[name] || 0) + (it.qty ?? 1);
    }
  }
  const top =
    Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((r) => `${r[0]} (${r[1]})`)
      .join(', ') || 'none';
  return `Orders: ${totalOrders} — Total value: ${totalValue}. Top items: ${top}.`;
}
