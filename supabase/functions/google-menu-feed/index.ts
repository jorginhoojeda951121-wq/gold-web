/**
 * Supabase Edge Function: google-menu-feed
 * Serves menu feed to Google Merchant Center (JSON/XML).
 * Deploy: supabase functions deploy google-menu-feed
 * GET /functions/v1/google-menu-feed?businessId=xxx&format=json
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const businessId = url.searchParams.get('businessId') || url.searchParams.get('business_id');
    const format = (url.searchParams.get('format') || 'json') as 'json' | 'xml';

    if (!businessId) {
      return new Response(JSON.stringify({ error: 'Missing businessId parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!['json', 'xml'].includes(format)) {
      return new Response(JSON.stringify({ error: 'Invalid format. Use json or xml.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: menuItems, error: queryError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (queryError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch menu items' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!menuItems || menuItems.length === 0) {
      const emptyFeed =
        format === 'json'
          ? JSON.stringify({ items: [], provider: { id: businessId } })
          : '<?xml version="1.0" encoding="UTF-8"?><feed></feed>';
      return new Response(emptyFeed, {
        status: 200,
        headers: {
          'Content-Type': format === 'json' ? 'application/json' : 'application/xml',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'max-age=3600',
        },
      });
    }

    const { data: businessData } = await supabase
      .from('businesses')
      .select('id, name, website_url')
      .eq('id', businessId)
      .single();

    const checkoutBaseUrl = (businessData as { website_url?: string })?.website_url || 'https://yourpos.com';
    const businessName = (businessData as { name?: string })?.name || 'Gold Crafts POS';

    const feed =
      format === 'json'
        ? generateJSONFeed(menuItems as Record<string, unknown>[], businessId, businessName, checkoutBaseUrl)
        : generateXMLFeed(menuItems as Record<string, unknown>[], businessId, businessName, checkoutBaseUrl);

    return new Response(feed, {
      status: 200,
      headers: {
        'Content-Type': format === 'json' ? 'application/json' : 'application/xml',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'max-age=3600',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'Internal server error', details: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

function generateJSONFeed(
  items: Record<string, unknown>[],
  businessId: string,
  businessName: string,
  checkoutBaseUrl: string
): string {
  const feedItems = items.map((item) => ({
    id: item.id,
    title: item.name,
    description: item.description || '',
    image_url: item.image_url || '',
    price: item.price,
    currency: 'USD',
    availability: item.is_active ? 'in stock' : 'out of stock',
    action_link: `${checkoutBaseUrl}/order?source=google&item=${item.id}&name=${encodeURIComponent(String(item.name))}&price=${item.price}`,
    category: item.category || 'Uncategorized',
    prep_time_minutes: item.prep_time_minutes ?? null,
    dietary_restrictions: item.dietary_restrictions || [],
  }));

  return JSON.stringify(
    {
      version: '1.0',
      provider: { id: businessId, name: businessName },
      catalog: { items: feedItems, lastUpdated: new Date().toISOString(), totalItems: feedItems.length },
    },
    null,
    2
  );
}

function generateXMLFeed(
  items: Record<string, unknown>[],
  businessId: string,
  businessName: string,
  checkoutBaseUrl: string
): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<feed xmlns="http://www.w3.org/2005/Atom">\n';
  xml += `  <title>Menu Feed - ${escapeXml(businessName)}</title>\n`;
  xml += `  <id>tag:gold-crafts:${escapeXml(businessId)}</id>\n`;
  xml += `  <updated>${new Date().toISOString()}</updated>\n`;
  xml += `  <author><name>${escapeXml(businessName)}</name></author>\n`;

  for (const item of items) {
    const actionLink = `${checkoutBaseUrl}/order?source=google&item=${item.id}&name=${encodeURIComponent(String(item.name))}&price=${item.price}`;
    xml += '  <entry>\n';
    xml += `    <id>tag:gold-crafts:item:${escapeXml(String(item.id))}</id>\n`;
    xml += `    <title>${escapeXml(String(item.name))}</title>\n`;
    if (item.description) xml += `    <summary>${escapeXml(String(item.description))}</summary>\n`;
    xml += `    <category term="${escapeXml(String(item.category || 'Uncategorized'))}" />\n`;
    xml += `    <content type="xhtml">\n      <div xmlns="http://www.w3.org/1999/xhtml">\n`;
    xml += `        <h3>${escapeXml(String(item.name))}</h3>\n`;
    if (item.description) xml += `        <p>${escapeXml(String(item.description))}</p>\n`;
    if (item.image_url) xml += `        <img src="${escapeXml(String(item.image_url))}" alt="${escapeXml(String(item.name))}" />\n`;
    xml += `        <p><strong>Price:</strong> $${Number(item.price).toFixed(2)}</p>\n`;
    if (item.prep_time_minutes) xml += `        <p><strong>Prep Time:</strong> ${item.prep_time_minutes} minutes</p>\n`;
    const dietary = item.dietary_restrictions as string[] | undefined;
    if (dietary?.length) xml += `        <p><strong>Dietary:</strong> ${escapeXml(dietary.join(', '))}</p>\n`;
    xml += `      </div>\n    </content>\n`;
    xml += `    <link href="${escapeXml(actionLink)}" rel="alternate" title="Order ${escapeXml(String(item.name))}" />\n`;
    xml += `    <published>${new Date().toISOString()}</published>\n`;
    xml += `    <updated>${new Date().toISOString()}</updated>\n  </entry>\n`;
  }

  xml += '</feed>';
  return xml;
}

function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
