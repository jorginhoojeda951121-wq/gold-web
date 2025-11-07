import { getSupabase } from './supabase';

export interface SubscriptionStatus {
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  expiryDate: Date | null;
  subscriptionStartDate: Date | null;
  requiresPayment: boolean;
  renewalAmount: number;
  gracePeriodEndDate: Date | null;
  isFreeTrial: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  percentageRemaining: number;
}

const FREE_TRIAL_MONTHS = 11;
const ANNUAL_RENEWAL_AMOUNT = 3000; // INR
const GRACE_PERIOD_DAYS = 7; // Grace period after expiry before blocking access

/**
 * Calculate subscription expiry date based on start date
 * Free trial: 11 months from start date
 * After payment: 12 months from last payment date
 */
export function calculateExpiryDate(
  startDate: Date,
  lastPaymentDate: Date | null
): Date {
  const baseDate = lastPaymentDate || startDate;
  const expiryDate = new Date(baseDate);
  
  if (lastPaymentDate) {
    // After first payment, it's 12 months from payment date
    expiryDate.setMonth(expiryDate.getMonth() + 12);
  } else {
    // Free trial period: 11 months
    expiryDate.setMonth(expiryDate.getMonth() + FREE_TRIAL_MONTHS);
  }
  
  return expiryDate;
}

/**
 * Check if user is within free trial period (first 11 months)
 */
export function isWithinFreeTrial(startDate: Date): boolean {
  const now = new Date();
  const trialEndDate = new Date(startDate);
  trialEndDate.setMonth(trialEndDate.getMonth() + FREE_TRIAL_MONTHS);
  
  return now <= trialEndDate;
}

/**
 * Get subscription status for a user
 * Always fetches exact account creation date from Supabase auth.users
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const supabase = getSupabase();
  
  try {
    // First, always get the exact user creation date from auth.users
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user?.created_at) {
      console.error('Error fetching user data:', userError);
      return {
        isActive: false,
        isExpired: true,
        daysRemaining: 0,
        expiryDate: null,
        subscriptionStartDate: null,
        requiresPayment: true,
        renewalAmount: ANNUAL_RENEWAL_AMOUNT,
        gracePeriodEndDate: null,
        isFreeTrial: false,
        hoursRemaining: 0,
        minutesRemaining: 0,
        percentageRemaining: 0,
      };
    }

    // Get exact account creation date from auth.users
    const accountCreationDate = new Date(userData.user.created_at);
    
    // Fetch user subscription data from Supabase
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    // If subscription record exists, use it; otherwise use account creation date
    let startDate: Date;
    let lastPaymentDate: Date | null = null;
    let isPaid = false;

    if (subscription && !error) {
      // Use subscription_start_date if available, otherwise fall back to account creation
      startDate = subscription.subscription_start_date 
        ? new Date(subscription.subscription_start_date)
        : accountCreationDate;
      
      lastPaymentDate = subscription.last_payment_date
        ? new Date(subscription.last_payment_date)
        : null;
      
      isPaid = subscription.is_paid || false;
    } else {
      // No subscription record, use account creation date
      startDate = accountCreationDate;
    }

    // Calculate expiry date
    const expiryDate = calculateExpiryDate(startDate, lastPaymentDate);
    const now = new Date();
    const isExpired = now > expiryDate;
    const gracePeriodEnd = new Date(expiryDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);
    
    // Calculate time remaining
    const timeDiff = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    // Calculate percentage remaining (for progress bar)
    const totalPeriod = lastPaymentDate 
      ? 12 * 30 * 24 * 60 * 60 * 1000 // 12 months in milliseconds
      : FREE_TRIAL_MONTHS * 30 * 24 * 60 * 60 * 1000; // 11 months in milliseconds
    const elapsed = now.getTime() - startDate.getTime();
    const percentageRemaining = Math.max(0, Math.min(100, ((totalPeriod - elapsed) / totalPeriod) * 100));
    
    const requiresPayment = isExpired && now > gracePeriodEnd;
    const isActive = !requiresPayment;
    const isFreeTrial = !lastPaymentDate;

    return {
      isActive,
      isExpired: isExpired && now > gracePeriodEnd,
      daysRemaining: Math.max(0, daysRemaining),
      expiryDate,
      subscriptionStartDate: startDate,
      requiresPayment,
      renewalAmount: ANNUAL_RENEWAL_AMOUNT,
      gracePeriodEndDate: gracePeriodEnd,
      isFreeTrial,
      hoursRemaining: Math.max(0, hoursRemaining),
      minutesRemaining: Math.max(0, minutesRemaining),
      percentageRemaining,
    };
  } catch (error) {
    console.error('Error in getSubscriptionStatus:', error);
    // Return expired status on error
    return {
      isActive: false,
      isExpired: true,
      daysRemaining: 0,
      expiryDate: null,
      subscriptionStartDate: null,
      requiresPayment: true,
      renewalAmount: ANNUAL_RENEWAL_AMOUNT,
      gracePeriodEndDate: null,
      isFreeTrial: false,
      hoursRemaining: 0,
      minutesRemaining: 0,
      percentageRemaining: 0,
    };
  }
}

/**
 * Initialize subscription record for a new user
 */
export async function initializeSubscription(userId: string, email: string): Promise<void> {
  const supabase = getSupabase();
  
  try {
    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return; // Already initialized
    }

    // Get exact user creation date from auth.users
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.created_at) {
      console.error('Error fetching user creation date:', userError);
      throw new Error('Unable to fetch user creation date');
    }
    
    // Use exact account creation date from auth.users
    const startDate = new Date(userData.user.created_at);

    // Create subscription record
    const { error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        email,
        subscription_start_date: startDate.toISOString(),
        status: 'active',
        is_paid: false, // Free trial, not paid yet
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error initializing subscription:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in initializeSubscription:', error);
    // Don't throw - allow user to continue, subscription check will handle it
  }
}

/**
 * Record payment for subscription renewal
 */
export async function recordSubscriptionPayment(
  userId: string,
  paymentAmount: number,
  paymentDate: Date = new Date()
): Promise<void> {
  const supabase = getSupabase();
  
  try {
    // Update subscription with payment
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        last_payment_date: paymentDate.toISOString(),
        is_paid: true,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in recordSubscriptionPayment:', error);
    throw error;
  }
}

