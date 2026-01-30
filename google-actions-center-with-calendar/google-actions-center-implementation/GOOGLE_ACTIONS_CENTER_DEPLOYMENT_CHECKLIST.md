# Google Actions Center - Quick Start Checklist

## Pre-Implementation Setup

- [ ] Google Merchant Center account created
- [ ] Google Cloud project setup
- [ ] Supabase project ready
- [ ] POS system webhook endpoint available
- [ ] Business registered in RMP system
- [ ] Menu items created in database
- [ ] HTTPS certificate configured

## Step 1: Environment Configuration

- [ ] Copy `.env.example.google-actions` to `.env.local`
- [ ] Fill in all required variables
- [ ] Test Supabase connection
- [ ] Verify webhook URLs are accessible
- [ ] Set webhook secret (min 32 characters)

## Step 2: Database Setup

- [ ] Create `menu_items` table
- [ ] Create `google_menu_feeds` table  
- [ ] Create `order_notifications` table
- [ ] Add columns to `orders` table:
  - `google_order_id` (unique)
  - `payment_status`
  - `payment_transaction_id`
  - `pos_acknowledged`
  - `pos_acknowledged_at`
  - `estimated_ready_time`
- [ ] Create indexes on frequently queried columns
- [ ] Enable Row Level Security (RLS) policies

## Step 3: Supabase Functions

- [ ] Deploy `google-menu-feed` function
  ```bash
  supabase functions deploy google-menu-feed
  ```

- [ ] Deploy `process-google-order` function
  ```bash
  supabase functions deploy process-google-order
  ```

- [ ] Deploy `google-payment-webhook` function
  ```bash
  supabase functions deploy google-payment-webhook
  ```

- [ ] Test each function with sample data
- [ ] Check function logs for errors

## Step 4: Frontend Setup

- [ ] Create `GoogleOrderCheckout` page (✓ Done)
- [ ] Create `OrderConfirmation` page (✓ Done)
- [ ] Add routes to `App.tsx` (✓ Done)
  - `/order` → GoogleOrderCheckout
  - `/order-confirmation` → OrderConfirmation
- [ ] Create notification hooks (✓ Done)
- [ ] Test checkout flow locally

## Step 5: Google Integration

- [ ] Log in to Google Merchant Center
- [ ] Add product feed with URL:
  ```
  https://yourpos.com/functions/v1/google-menu-feed?businessId=YOUR_BUSINESS_ID&format=json
  ```
- [ ] Set feed update frequency (hourly recommended)
- [ ] Submit feed for review
- [ ] Wait for Google approval (1-2 business days)
- [ ] Verify menu items appear in Google Search

## Step 6: POS System Integration

- [ ] Configure POS webhook endpoint
  - URL: Provide webhook URL to POS vendor
  - Method: POST
  - Headers: Include X-Webhook-Signature for verification
  
- [ ] Start WebSocket server (for real-time notifications)
  ```bash
  npm install socket.io
  node src/lib/posWebSocketManager.ts
  ```

- [ ] Test webhook delivery
- [ ] Configure POS to handle order notifications
- [ ] Test end-to-end order flow

## Step 7: Testing

### Unit Tests
- [ ] Test menu feed generation
- [ ] Test order validation
- [ ] Test webhook signature verification
- [ ] Test WebSocket connections

### Integration Tests
- [ ] Test complete order flow (Google → Checkout → POS)
- [ ] Test payment webhook handling
- [ ] Test real-time notifications
- [ ] Test error handling

### Manual Testing
- [ ] Create test order via checkout page
- [ ] Verify order appears in database
- [ ] Verify POS receives notification
- [ ] Verify customer receives confirmation email
- [ ] Verify order status updates in real-time
- [ ] Test with different order types (pickup, delivery, dine-in)

## Step 8: Monitoring & Logging

- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Configure database monitoring
- [ ] Set up webhook delivery monitoring
- [ ] Create alerts for:
  - Failed orders
  - Webhook failures
  - WebSocket disconnections
  - Payment processing delays

## Step 9: Security Review

- [ ] Enable RLS policies on sensitive tables
- [ ] Verify webhook signature validation
- [ ] Test rate limiting
- [ ] Audit access logs
- [ ] Review CORS configuration
- [ ] Test with various attack vectors

## Step 10: Performance Optimization

- [ ] Measure menu feed generation time
- [ ] Optimize database queries
- [ ] Cache menu feeds (1 hour TTL)
- [ ] Load test webhook endpoints
- [ ] Monitor WebSocket connections
- [ ] Test with concurrent orders

## Step 11: Deployment

- [ ] Deploy frontend to production
- [ ] Deploy Supabase functions to production
- [ ] Update environment variables
- [ ] Run smoke tests
- [ ] Monitor initial traffic

## Step 12: Post-Launch

- [ ] Train staff on Google order handling
- [ ] Communicate with customers
- [ ] Monitor metrics daily
- [ ] Address issues quickly
- [ ] Optimize based on data
- [ ] Plan Phase 2 features

## Troubleshooting Checklist

If experiencing issues:

- [ ] Check Supabase function logs
- [ ] Verify environment variables
- [ ] Test webhook endpoint accessibility
- [ ] Check browser console for errors
- [ ] Verify database records created
- [ ] Test with curl/Postman
- [ ] Review Google Merchant Center for errors
- [ ] Check POS system logs

## Key Metrics to Monitor

Once live, track:
- Daily order volume from Google
- Average order value
- Order fulfillment time
- Customer satisfaction scores
- Webhook success rate
- System uptime
- Average response times

## Support Resources

- [Implementation Guide](./GOOGLE_ACTIONS_CENTER_IMPLEMENTATION.md)
- [Quick Reference](./ACTIONS_CENTER_QUICK_REFERENCE.md)
- [Examples](./ACTIONS_CENTER_EXAMPLES.ts)
- [Google Documentation](https://developers.google.com/actions)
- [Supabase Docs](https://supabase.com/docs)

---

**Status:** Ready for deployment ✅

Last Updated: January 29, 2026
