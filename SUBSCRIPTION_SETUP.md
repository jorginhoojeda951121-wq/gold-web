# Subscription System Setup Guide

This document explains how to set up and use the subscription system for the Gold Crafts Manager application.

## Overview

The application implements a subscription-based access control system with the following features:

- **Free Trial**: 11 months from user signup
- **Annual Renewal**: ₹3,000 INR per year after the free trial period
- **Grace Period**: 7 days after expiry before access is blocked
- **Automatic Access Control**: Unpaid users are automatically redirected to the subscription page

## Database Setup

### 1. Create the Subscription Table

Run the SQL migration file to create the `user_subscriptions` table in your Supabase database:

```bash
# In Supabase SQL Editor, run:
database-migrations/subscription-table.sql
```

This will create:
- `user_subscriptions` table with all necessary fields
- Row Level Security (RLS) policies
- Indexes for performance
- Automatic timestamp updates

### 2. Verify Table Creation

After running the migration, verify the table exists:

```sql
SELECT * FROM user_subscriptions LIMIT 1;
```

## How It Works

### Subscription Lifecycle

1. **User Signup**: When a user signs up, a subscription record is automatically created with:
   - `subscription_start_date`: User creation date
   - `is_paid`: `false` (free trial)
   - `status`: `active`

2. **Free Trial Period**: Users have 11 months of free access from signup date

3. **Expiry**: After 11 months, the subscription expires

4. **Grace Period**: 7 days after expiry, users can still access but are shown warnings

5. **Blocked Access**: After grace period, users are redirected to `/subscription` page and cannot access protected routes

6. **Renewal**: After payment of ₹3,000, subscription is extended for 12 months from payment date

### Access Control

The system uses multiple layers of protection:

1. **Client-Side (`RequireAuth` component)**:
   - Checks subscription status on every protected route
   - Redirects to `/subscription` if payment is required
   - Blocks access to all protected routes

2. **Server-Side (API routes)**:
   - Middleware available in `src/api/subscription-check.js`
   - Can be integrated when authentication is added to API routes

## Files Created/Modified

### New Files

1. **`src/lib/subscription.ts`**
   - Core subscription logic
   - Functions: `getSubscriptionStatus()`, `initializeSubscription()`, `recordSubscriptionPayment()`

2. **`src/pages/Subscription.tsx`**
   - Subscription status page
   - Payment interface
   - Shows subscription details and renewal options

3. **`src/api/subscription-check.js`**
   - Server-side subscription check middleware
   - For use with Express API routes

4. **`database-migrations/subscription-table.sql`**
   - Database schema for subscriptions

### Modified Files

1. **`src/components/RequireAuth.tsx`**
   - Added subscription status checking
   - Redirects expired users to subscription page

2. **`src/components/Auth.tsx`**
   - Initializes subscription on user sign-in

3. **`src/App.tsx`**
   - Added `/subscription` route

## Usage

### For Users

1. **Check Subscription Status**:
   - Navigate to `/subscription` to view current status
   - See days remaining, expiry date, and renewal amount

2. **Renew Subscription**:
   - Click "Pay Now" on the subscription page
   - Follow payment instructions
   - Use "Mark as Paid" after completing payment (admin function)

### For Developers

#### Check Subscription Status Programmatically

```typescript
import { getSubscriptionStatus } from '@/lib/subscription';

const status = await getSubscriptionStatus(userId);
if (status.requiresPayment) {
  // Block access
}
```

#### Record Payment

```typescript
import { recordSubscriptionPayment } from '@/lib/subscription';

await recordSubscriptionPayment(userId, 3000, new Date());
```

#### Initialize Subscription for New User

```typescript
import { initializeSubscription } from '@/lib/subscription';

await initializeSubscription(userId, email);
```

## Payment Integration

Currently, the system includes a placeholder for payment processing. To integrate a real payment gateway:

1. **Update `Subscription.tsx`**:
   - Replace `handlePayment()` with your payment gateway integration
   - Use webhooks to automatically update subscription status

2. **Payment Gateway Options**:
   - Razorpay (popular in India)
   - Stripe
   - PayU
   - Other Indian payment gateways

3. **Webhook Handler**:
   - Create an endpoint to receive payment confirmations
   - Call `recordSubscriptionPayment()` on successful payment

## Testing

### Test Scenarios

1. **New User (Free Trial)**:
   - Sign up → Should have 11 months free access
   - Check subscription status → Should show active

2. **Expired User**:
   - Set `subscription_start_date` to 12 months ago
   - Try to access protected route → Should redirect to `/subscription`

3. **Grace Period**:
   - Set expiry to 3 days ago
   - Should show warning but allow access

4. **Payment Recording**:
   - Record payment → Subscription should extend 12 months from payment date

## Troubleshooting

### Subscription Not Initializing

- Check Supabase connection
- Verify `user_subscriptions` table exists
- Check browser console for errors
- Ensure user has proper permissions

### Users Not Being Blocked

- Verify `RequireAuth` is wrapping protected routes
- Check subscription status in database
- Verify expiry date calculation

### Payment Not Recording

- Check database permissions
- Verify user_id matches
- Check for RLS policy issues

## Security Considerations

1. **Row Level Security (RLS)**: Enabled on subscription table
2. **Client-Side Checks**: Can be bypassed - always verify server-side for critical operations
3. **Payment Verification**: Always verify payments server-side via webhooks
4. **Admin Access**: Service role can manage all subscriptions

## Future Enhancements

- [ ] Payment gateway integration
- [ ] Email notifications for expiry warnings
- [ ] Admin dashboard for subscription management
- [ ] Multiple subscription tiers
- [ ] Prorated billing
- [ ] Subscription cancellation flow

## Support

For issues or questions:
1. Check the console logs for errors
2. Verify database schema matches migration
3. Test subscription status functions directly
4. Contact development team

