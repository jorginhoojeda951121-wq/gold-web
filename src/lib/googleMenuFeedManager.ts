/**
 * Google Menu Feed Manager
 * Serves menu feeds to Google Merchant Center in JSON and XML formats
 * Includes action links for checkout redirect
 */

import { getSupabase } from '@/lib/supabase';

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  availability?: string;
  prepTime?: number;
  dietary?: string[];
}

export interface MenuFeedItem {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  price: number;
  availability: string;
  action_link: string;
  category: string;
  prep_time_minutes?: number;
  dietary_restrictions?: string[];
}

export interface MenuFeedRequest {
  businessId: string;
  format: 'json' | 'xml';
}

/**
 * Generate and serve menu feed to Google
 */
export async function generateMenuFeed(
  businessId: string,
  format: 'json' | 'xml' = 'json'
): Promise<string> {
  const supabase = getSupabase();
  try {
    const { data: menuItems, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true);

    if (error) throw error;

    if (!menuItems || menuItems.length === 0) {
      return format === 'json' ? '{"items": []}' : '<?xml version="1.0"?><feed></feed>';
    }

    const items: MenuItem[] = menuItems.map((item: Record<string, unknown>) => ({
      id: String(item.id),
      name: String(item.name),
      description: item.description as string | undefined,
      price: Number(item.price),
      category: String(item.category || 'Uncategorized'),
      imageUrl: item.image_url as string | undefined,
      availability: (item.availability as string) || 'available',
      prepTime: item.prep_time_minutes as number | undefined,
      dietary: item.dietary_restrictions as string[] | undefined,
    }));

    if (format === 'xml') {
      return generateXMLFeed(items, businessId);
    }
    return generateJSONFeed(items, businessId);
  } catch (error) {
    console.error('Error generating menu feed:', error);
    throw error;
  }
}

function getCheckoutBaseUrl(): string {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  return env.VITE_CHECKOUT_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
}

function generateJSONFeed(items: MenuItem[], businessId: string): string {
  const checkoutBaseUrl = getCheckoutBaseUrl();

  const feedItems: MenuFeedItem[] = items.map(item => ({
    id: item.id,
    title: item.name,
    description: item.description,
    image_url: item.imageUrl,
    price: item.price,
    availability: item.availability === 'available' ? 'in stock' : 'out of stock',
    action_link: `${checkoutBaseUrl}/order?source=google&item=${item.id}&name=${encodeURIComponent(item.name)}&price=${item.price}`,
    category: item.category,
    prep_time_minutes: item.prepTime,
    dietary_restrictions: item.dietary,
  }));

  const feed = {
    version: '1.0',
    provider: { id: businessId, name: 'Gold Crafts POS' },
    catalog: {
      items: feedItems,
      lastUpdated: new Date().toISOString(),
      totalItems: feedItems.length,
    },
  };

  return JSON.stringify(feed, null, 2);
}

function generateXMLFeed(items: MenuItem[], businessId: string): string {
  const checkoutBaseUrl = getCheckoutBaseUrl();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<feed xmlns="http://www.w3.org/2005/Atom">\n';
  xml += '  <title>Menu Feed - Gold Crafts POS</title>\n';
  xml += `  <id>tag:gold-crafts:${businessId}</id>\n`;
  xml += `  <updated>${new Date().toISOString()}</updated>\n`;
  xml += '  <author><name>Gold Crafts POS</name></author>\n';

  for (const item of items) {
    const actionLink = `${checkoutBaseUrl}/order?source=google&item=${item.id}&name=${encodeURIComponent(item.name)}&price=${item.price}`;
    xml += '  <entry>\n';
    xml += `    <id>tag:gold-crafts:item:${escapeXml(item.id)}</id>\n`;
    xml += `    <title>${escapeXml(item.name)}</title>\n`;
    if (item.description) xml += `    <summary>${escapeXml(item.description)}</summary>\n`;
    xml += `    <category term="${escapeXml(item.category)}" />\n`;
    xml += '    <content type="xhtml">\n';
    xml += '      <div xmlns="http://www.w3.org/1999/xhtml">\n';
    xml += `        <h3>${escapeXml(item.name)}</h3>\n`;
    if (item.description) xml += `        <p>${escapeXml(item.description)}</p>\n`;
    if (item.imageUrl) xml += `        <img src="${escapeXml(item.imageUrl)}" alt="${escapeXml(item.name)}" />\n`;
    xml += `        <p class="price">$${item.price.toFixed(2)}</p>\n`;
    if (item.prepTime) xml += `        <p class="prep-time">Prep time: ${item.prepTime} minutes</p>\n`;
    if (item.dietary?.length) xml += `        <p class="dietary">${escapeXml(item.dietary.join(', '))}</p>\n`;
    xml += '      </div>\n    </content>\n';
    xml += `    <link href="${escapeXml(actionLink)}" rel="alternate" title="Order ${escapeXml(item.name)}" />\n`;
    xml += `    <published>${new Date().toISOString()}</published>\n`;
    xml += `    <updated>${new Date().toISOString()}</updated>\n`;
    xml += '  </entry>\n';
  }

  xml += '</feed>';
  return xml;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Save menu feed to cache/database
 */
export async function cacheMenuFeed(
  businessId: string,
  feedData: string,
  format: 'json' | 'xml'
): Promise<void> {
  const supabase = getSupabase();
  try {
    const { error } = await supabase
      .from('google_menu_feeds')
      .upsert(
        {
          business_id: businessId,
          feed_data: feedData,
          feed_format: format,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'business_id,feed_format' }
      );

    if (error) throw error;
  } catch (error) {
    console.error('Error caching menu feed:', error);
  }
}

/**
 * Get cached menu feed
 */
export async function getCachedMenuFeed(
  businessId: string,
  format: 'json' | 'xml' = 'json'
): Promise<string | null> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('google_menu_feeds')
      .select('feed_data')
      .eq('business_id', businessId)
      .eq('feed_format', format)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return (data?.feed_data as string) ?? null;
  } catch (error) {
    console.error('Error fetching cached menu feed:', error);
    return null;
  }
}
