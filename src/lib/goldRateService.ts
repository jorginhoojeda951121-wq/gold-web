// Gold Rate Service - Shared logic for live gold rate fetching and management
// Works for both web and mobile contexts

export interface GoldRate {
  rate24K: number;
  rate22K: number;
  rate20K: number;
  rate18K: number;
  rate14K: number;
  rateSilver: number;
  lastUpdated: string;
  updatedBy?: string;
  source?: 'api' | 'manual' | 'ibja';
}

export interface GoldRateHistory {
  rates: GoldRate;
  date: string;
}

export interface GoldRateStore {
  currentRates: GoldRate;
  rateHistory: GoldRate[];
  apiKey?: string;
  autoFetch: boolean;
  rateSource: 'api' | 'manual' | 'ibja';
}

export const DEFAULT_RATES: GoldRate = {
  rate24K: 7200,
  rate22K: 6600,
  rate20K: 6000,
  rate18K: 5400,
  rate14K: 4200,
  rateSilver: 95,
  lastUpdated: new Date().toISOString(),
  source: 'manual',
};

export const PURITY_MULTIPLIERS: Record<string, number> = {
  rate24K: 1.0,
  rate22K: 0.916,
  rate20K: 0.833,
  rate18K: 0.75,
  rate14K: 0.583,
};

/**
 * Auto-calculate lower purity rates from a 24K base rate
 */
export function calculatePurityRates(rate24K: number, rateSilver: number = DEFAULT_RATES.rateSilver): Omit<GoldRate, 'lastUpdated' | 'updatedBy' | 'source'> {
  return {
    rate24K: Math.round(rate24K),
    rate22K: Math.round(rate24K * PURITY_MULTIPLIERS.rate22K),
    rate20K: Math.round(rate24K * PURITY_MULTIPLIERS.rate20K),
    rate18K: Math.round(rate24K * PURITY_MULTIPLIERS.rate18K),
    rate14K: Math.round(rate24K * PURITY_MULTIPLIERS.rate14K),
    rateSilver: Math.round(rateSilver),
  };
}

interface GoldApiResponse {
  price: number;
  price_gram_24k: number;
  price_gram_22k: number;
  price_gram_18k: number;
  price_gram_14k: number;
}

/**
 * Fetch live gold rate from GoldAPI.io in INR
 * API: https://www.goldapi.io/api/XAU/INR
 */
export async function fetchLiveGoldRate(apiKey: string): Promise<GoldRate> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API key is required. Get one free at goldapi.io');
  }

  const response = await fetch('https://www.goldapi.io/api/XAU/INR', {
    headers: {
      'x-access-token': apiKey.trim(),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid API key. Check your goldapi.io credentials.');
    if (response.status === 429) throw new Error('Rate limit exceeded. Please wait before refreshing.');
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data: GoldApiResponse = await response.json();

  if (!data.price_gram_24k) {
    throw new Error('Invalid response from API. Check your API key.');
  }

  const rate24K = Math.round(data.price_gram_24k);
  const calculated = calculatePurityRates(rate24K);

  return {
    ...calculated,
    // Use API's own 22K and 18K if available, otherwise calculated
    rate22K: data.price_gram_22k ? Math.round(data.price_gram_22k) : calculated.rate22K,
    rate18K: data.price_gram_18k ? Math.round(data.price_gram_18k) : calculated.rate18K,
    rate14K: data.price_gram_14k ? Math.round(data.price_gram_14k) : calculated.rate14K,
    lastUpdated: new Date().toISOString(),
    source: 'api',
  };
}

/**
 * Local storage key for web
 */
export const STORAGE_KEY_WEB = 'gold_rate_settings_v2';

/**
 * AsyncStorage key for mobile
 */
export const STORAGE_KEY_MOBILE = 'gold_rate_settings_v2';

export const DEFAULT_STORE: GoldRateStore = {
  currentRates: DEFAULT_RATES,
  rateHistory: [],
  apiKey: 'goldapi-sopsmn7ehkm0-io',
  autoFetch: false,
  rateSource: 'api',
};
