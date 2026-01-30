// Supabase Edge Function (Deno) - generate-ai-report
import { serve } from 'std/server'

const GOOGLE_GENAI_URL = Deno.env.get('GOOGLE_GENAI_ENDPOINT') || 'https://generative.googleapis.com/v1beta2/models/text-bison-001:generateText';
const GOOGLE_GENAI_KEY = Deno.env.get('GOOGLE_GENAI_API_KEY') || '';

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const payload = await req.json();
    const orders = payload.orders || [];

    if (!GOOGLE_GENAI_KEY) {
      // Simple fallback summary
      const summary = fallbackSummary(orders);
      return new Response(JSON.stringify({ report: summary }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const prompt = buildPrompt(orders);
    const aiRes = await fetch(GOOGLE_GENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GOOGLE_GENAI_KEY}`,
      },
      body: JSON.stringify({ prompt: { text: prompt }, temperature: 0.2, maxOutputTokens: 512 }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: txt }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const json = await aiRes.json();
    const report = (json?.candidates && json.candidates[0]?.content) || json?.outputs?.[0]?.content || JSON.stringify(json);
    return new Response(JSON.stringify({ report }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});

function buildPrompt(orders: any[]) {
  const header = `You are a helpful assistant that writes a concise professional sales report for a POS system. Summarize orders, totals, top-selling items, and recommendations.`;
  const bodyLines = orders.map((o: any) => {
    const when = o.created_at ? ` at ${o.created_at}` : '';
    const items = (o.items || []).map((it: any) => `${it.qty}x ${it.name}`).join(', ') || 'no items';
    return `Order ${o.id}${when}: ${items} — total ${o.total ?? 'N/A'}`;
  });
  return `${header}\n\nOrders:\n${bodyLines.join('\n')}\n\nProvide:\n- A one-paragraph executive summary\n- Top 3 selling items\n- Recommended actions for staff/marketing\n- A short subject line for emailing the report`;
}

function fallbackSummary(orders: any[]) {
  const totalOrders = orders.length;
  const totalValue = orders.reduce((s: number, o: any) => s + (o.total || 0), 0);
  const itemCounts: Record<string, number> = {};
  for (const o of orders) {
    for (const it of (o.items || [])) itemCounts[it.name] = (itemCounts[it.name] || 0) + it.qty;
  }
  const top = Object.entries(itemCounts).sort((a,b) => b[1]-a[1]).slice(0,3).map(r=>`${r[0]} (${r[1]})`).join(', ') || 'none';
  return `Orders: ${totalOrders} — Total value: ${totalValue}. Top items: ${top}.`;
}
