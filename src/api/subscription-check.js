// Server-side subscription check utility
// This can be used as middleware for API routes

const FREE_TRIAL_MONTHS = 11;
const ANNUAL_RENEWAL_AMOUNT = 10; // INR - Changed to 10 for testing, change back to 3000 after testing
const GRACE_PERIOD_DAYS = 7;

/**
 * Calculate subscription expiry date
 */
function calculateExpiryDate(startDate, lastPaymentDate) {
  const baseDate = lastPaymentDate || startDate;
  const expiryDate = new Date(baseDate);
  
  if (lastPaymentDate) {
    expiryDate.setMonth(expiryDate.getMonth() + 12);
  } else {
    expiryDate.setMonth(expiryDate.getMonth() + FREE_TRIAL_MONTHS);
  }
  
  return expiryDate;
}

/**
 * Check if subscription is active
 * This function should be called with subscription data from database
 */
function isSubscriptionActive(subscription) {
  if (!subscription) {
    return false;
  }

  const startDate = subscription.subscription_start_date 
    ? new Date(subscription.subscription_start_date)
    : new Date(subscription.created_at || Date.now());
  
  const lastPaymentDate = subscription.last_payment_date
    ? new Date(subscription.last_payment_date)
    : null;
  
  const expiryDate = calculateExpiryDate(startDate, lastPaymentDate);
  const now = new Date();
  const isExpired = now > expiryDate;
  const gracePeriodEnd = new Date(expiryDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);
  
  const requiresPayment = isExpired && now > gracePeriodEnd;
  
  return !requiresPayment;
}

/**
 * Middleware to check subscription status
 * This should be used after authentication middleware
 * 
 * Usage:
 * app.post('/api/sync/upload', authenticateUser, checkSubscription, handleUpload);
 */
function checkSubscription(req, res, next) {
  // This assumes req.user or req.userId is set by authentication middleware
  const userId = req.user?.id || req.userId;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
  }

  // In a real implementation, you would fetch subscription from database here
  // For now, this is a placeholder that should be implemented with your database
  // Example:
  // const subscription = await db.getSubscription(userId);
  // if (!isSubscriptionActive(subscription)) {
  //   return res.status(403).json({
  //     success: false,
  //     message: 'Subscription expired. Please renew to continue using the service.',
  //     requiresPayment: true,
  //   });
  // }

  // For now, allow access (client-side checks will handle blocking)
  // TODO: Implement proper database check when authentication is added to API routes
  next();
}

module.exports = {
  isSubscriptionActive,
  checkSubscription,
  calculateExpiryDate,
  FREE_TRIAL_MONTHS,
  ANNUAL_RENEWAL_AMOUNT,
  GRACE_PERIOD_DAYS,
};

