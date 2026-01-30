// Minimal wrapper for Google Generative AI usage.
// Provides a safe fallback if the API key or endpoint is not configured.
// For server-side report generation, use the Supabase Edge Function generate-ai-report.

export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

export type Order = {
  id: string;
  business_id?: string;
  created_at?: string;
  total?: number;
  items?: OrderItem[];
  customer_name?: string;
};

const GOOGLE_GENAI_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.GOOGLE_GENAI_ENDPOINT ||
  'https://generative.googleapis.com/v1beta2/models/text-bison-001:generateText';
const GOOGLE_GENAI_KEY = (import.meta as unknown as { env?: Record<string, string> }).env?.GOOGLE_GENAI_API_KEY || '';

export async function generateOrderSummaryReport(
  orders: Order[],
  opts?: { maxTokens?: number }
): Promise<string> {
  if (!GOOGLE_GENAI_KEY) {
    return fallbackSummary(orders);
  }

  const prompt = buildPrompt(orders);
  try {
    const res = await fetch(GOOGLE_GENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GOOGLE_GENAI_KEY}`,
      },
      body: JSON.stringify({
        prompt: { text: prompt },
        temperature: 0.2,
        maxOutputTokens: opts?.maxTokens ?? 512,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return `AI generation failed: ${res.status} ${text}`;
    }

    const json = await res.json();
    const aiText =
      (json?.candidates && json.candidates[0]?.content) ||
      json?.outputs?.[0]?.content ||
      JSON.stringify(json);
    return aiText;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return `AI generation error: ${message}`;
  }
}

function buildPrompt(orders: Order[]): string {
  const header = `You are a helpful assistant that writes a concise professional sales report for a POS system. Summarize orders, totals, top-selling items, and recommendations.`;
  const bodyLines = orders.map((o) => {
    const when = o.created_at ? ` at ${o.created_at}` : '';
    const items = (o.items || []).map((it) => `${it.qty}x ${it.name}`).join(', ') || 'no items';
    return `Order ${o.id}${when}: ${items} — total ${o.total ?? 'N/A'}`;
  });
  return `${header}\n\nOrders:\n${bodyLines.join('\n')}\n\nProvide:\n- A one-paragraph executive summary\n- Top 3 selling items\n- Recommended actions for staff/marketing\n- A short subject line for emailing the report`;
}

function fallbackSummary(orders: Order[]): string {
  const totalOrders = orders.length;
  const totalValue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const itemCounts: Record<string, number> = {};
  for (const o of orders) {
    for (const it of o.items || []) {
      itemCounts[it.name] = (itemCounts[it.name] || 0) + it.qty;
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
