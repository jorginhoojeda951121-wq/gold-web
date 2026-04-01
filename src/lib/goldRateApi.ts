/**
 * Gold Rate API Integration
 * Fetches real-time gold rates from external providers (e.g., goldapi.io)
 * MCX rates for INR
 */

export interface ExternalGoldRate {
  price: number;
  price_gram_24k: number;
  price_gram_22k: number;
  price_gram_18k: number;
  price_gram_14k: number;
  currency: string;
  timestamp: number;
}

const GOLD_API_KEY = (import.meta as any).env?.VITE_GOLD_API_KEY || '';
const GOLD_API_URL = 'https://www.goldapi.io/api/XAU/INR';

export async function fetchLiveGoldRates(): Promise<ExternalGoldRate | null> {
  if (!GOLD_API_KEY) {
    console.warn('Gold API Key missing. Please set VITE_GOLD_API_KEY.');
    return null;
  }

  try {
    const response = await fetch(GOLD_API_URL, {
      method: 'GET',
      headers: {
        'x-access-token': GOLD_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Gold API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // goldapi.io returns price per ounce by default, but also provides gram prices
    return {
      price: data.price,
      price_gram_24k: data.price_gram_24k,
      price_gram_22k: data.price_gram_22k,
      price_gram_18k: data.price_gram_18k,
      price_gram_14k: data.price_gram_14k,
      currency: data.currency,
      timestamp: data.timestamp,
    };
  } catch (error) {
    console.error('Failed to fetch live gold rates:', error);
    return null;
  }
}

/**
 * Cache rates to IndexedDB for offline/fallback use
 */
export async function cacheGoldRates(rates: ExternalGoldRate) {
  const { idbSet } = await import('./indexedDb');
  await idbSet('cached_gold_rates', {
    ...rates,
    cachedAt: new Date().toISOString()
  });
}

/**
 * Get cached rates if available
 */
export async function getCachedGoldRates() {
  const { idbGet } = await import('./indexedDb');
  return await idbGet<ExternalGoldRate & { cachedAt: string }>('cached_gold_rates');
}
