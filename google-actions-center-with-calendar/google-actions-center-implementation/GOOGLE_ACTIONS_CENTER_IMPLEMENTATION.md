# Google Actions Center - Complete Implementation Guide

## Overview

This guide implements the full Google Actions Center (Ordering Redirect) flow:

1. **Step A: Create Action Links** - Menu feed generation with checkout URLs
2. **Step B: Handle Notifications** - Webhooks and WebSockets for POS integration

## Architecture

```
Google Actions Center
    ↓
Menu Feed (JSON/XML)
    ↓
Customer Clicks "Order"
    ↓
Redirect to /order?source=google
    ↓
GoogleOrderCheckout Page
    ↓
Supabase Edge Function: process-google-order
    ↓
Order Saved in Database
    ↓
Notify POS via Webhook + WebSocket
    ↓
POS Terminal Receives Alert
    ↓
Payment Webhook → Confirmation Email
```

## Implementation Steps

### 1. Setup Environment Variables

Add to `.env.local`:

```env
# Google Actions Center
VITE_BUSINESS_ID=your-business-id
VITE_BUSINESS_NAME=Your Business Name
VITE_CHECKOUT_BASE_URL=https://yourpos.com

# POS System Integration
VITE_POS_WEBHOOK_URL=https://yourpos.com/webhook/google-order
VITE_POS_WEBSOCKET_URL=ws://localhost:3001
VITE_WEBHOOK_SECRET=your-webhook-secret-key

# Supabase Functions
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Database Setup

Create required tables:

```sql
-- Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  prep_time_minutes INTEGER,
  dietary_restrictions TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Google Menu Feeds Cache
CREATE TABLE IF NOT EXISTS google_menu_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  feed_data TEXT NOT NULL,
  feed_format VARCHAR(10), -- 'json' or 'xml'
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, feed_format)
);

-- Orders Table (Enhanced)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS:
  google_order_id VARCHAR UNIQUE,
  payment_status VARCHAR DEFAULT 'pending',
  payment_transaction_id VARCHAR,
  pos_acknowledged BOOLEAN DEFAULT false,
  pos_acknowledged_at TIMESTAMP,
  estimated_ready_time VARCHAR;

-- Order Notifications
CREATE TABLE IF NOT EXISTS order_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  notification_type VARCHAR NOT NULL, -- 'order_received', 'order_ready', etc.
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Deploy Supabase Functions

```bash
# Deploy menu feed function
supabase functions deploy google-menu-feed

# Deploy order processing function
supabase functions deploy process-google-order

# Deploy payment webhook handler
supabase functions deploy google-payment-webhook

# Deploy calendar webhooks (existing)
supabase functions deploy process-google-calendar-webhooks

# Deploy email confirmation (existing)
supabase functions deploy send-email
```

### 4. Register Menu Feed with Google Merchant Center

1. Go to [Google Merchant Center](https://merchantcenter.google.com/)
2. Add a new product feed
3. Set Feed URL: `https://yourpos.com/functions/v1/google-menu-feed?businessId=YOUR_BUSINESS_ID&format=json`
4. Set update frequency: Hourly or Real-time
5. Submit for approval

### 5. Client-Side Integration

**Initialize in App.tsx or main component:**

```typescript
import { initializeActionsCenter, getActionsCenter } from '@/lib/googleActionsCenter';
import { initializeOrderHandler } from '@/lib/googleOrderHandler';
import { initializeWebSocket } from '@/lib/posWebSocketManager';

useEffect(() => {
  // Initialize Actions Center Manager
  initializeActionsCenter({
    businessId: process.env.VITE_BUSINESS_ID,
    businessName: process.env.VITE_BUSINESS_NAME,
    checkoutBaseUrl: process.env.VITE_CHECKOUT_BASE_URL,
  });

  // Initialize Order Handler
  initializeOrderHandler(
    process.env.VITE_BUSINESS_ID,
    process.env.VITE_WEBHOOK_SECRET,
    process.env.VITE_POS_WEBSOCKET_URL
  );

  // Initialize WebSocket Server (runs on server side)
  if (typeof window === 'undefined') {
    initializeWebSocket(process.env.VITE_BUSINESS_ID).initializeServer(3001);
  }
}, []);
```

**Use Order Notifications Hook:**

```typescript
import { useGoogleOrderNotifications, useOrderStatusPolling } from '@/hooks/useGoogleOrderNotifications';

function OrderTracker({ orderId }: { orderId: string }) {
  const { notification } = useGoogleOrderNotifications(orderId);
  const { order, loading } = useOrderStatusPolling(orderId);

  return (
    <div>
      <h2>Order #{order?.order_number}</h2>
      <p>Status: {order?.status}</p>
      {notification && <Alert message={notification.message} />}
    </div>
  );
}
```

## API Endpoints

### Menu Feed Endpoint

**GET** `/functions/v1/google-menu-feed`

```bash
curl "https://yourpos.com/functions/v1/google-menu-feed?businessId=xxx&format=json"
```

**Response (JSON):**
```json
{
  "version": "1.0",
  "provider": {
    "id": "business-123",
    "name": "Your Business"
  },
  "catalog": {
    "items": [
      {
        "id": "item-1",
        "title": "Burger",
        "price": 9.99,
        "action_link": "https://yourpos.com/order?source=google&item=item-1&name=Burger&price=9.99"
      }
    ],
    "lastUpdated": "2026-01-29T00:00:00Z"
  }
}
```

### Order Checkout

**POST** `/order?source=google`

Renders checkout page where customer completes order:
- Customer enters name, email, phone
- Selects order type (pickup/delivery/dine-in)
- Reviews order and submits

### Process Order Edge Function

**POST** `/functions/v1/process-google-order`

```bash
curl -X POST https://yourpos.com/functions/v1/process-google-order \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "GORDER-xxx",
    "customerEmail": "customer@example.com",
    "customerName": "John Doe",
    "customerPhone": "555-1234",
    "items": [
      {
        "menuItemId": "item-1",
        "name": "Burger",
        "quantity": 2,
        "unitPrice": 9.99,
        "totalPrice": 19.98
      }
    ],
    "subtotal": 19.98,
    "tax": 1.60,
    "total": 21.58,
    "paymentMethod": "credit_card",
    "orderType": "pickup"
  }'
```

### Payment Webhook Handler

**POST** `/functions/v1/google-payment-webhook`

Called when payment is confirmed:

```json
{
  "orderId": "order-uuid",
  "googleOrderId": "GORDER-xxx",
  "paymentStatus": "success",
  "amount": 21.58,
  "currency": "USD",
  "transactionId": "txn-12345",
  "timestamp": "2026-01-29T12:00:00Z"
}
```

## Data Flow

### Order Creation Flow

```
1. Customer clicks "Order" on Google
2. Redirect to: /order?source=google&item=xxx&name=xxx&price=xxx
3. GoogleOrderCheckout component loads
4. Customer enters information
5. POST to /functions/v1/process-google-order
6. Edge function saves order to database
7. Edge function sends webhook to POS system
8. Edge function sends WebSocket notification
9. Redirect to /order-confirmation?orderId=xxx
10. Customer sees confirmation with order number
```

### POS Notification Flow

```
1. Order saved in database
2. Webhook sent to POS_WEBHOOK_URL with order details
3. WebSocket broadcasts notification to all connected POS terminals
4. POS terminal receives real-time alert:
   {
     type: 'order_received',
     data: {
       orderId: '...',
       orderNumber: 'G210129001',
       customerName: 'John Doe',
       items: [...],
       total: 21.58
     }
   }
5. POS staff confirms receipt: socket.emit('order_acknowledged')
6. Order marked as 'confirmed' in database
```

### Payment & Confirmation Flow

```
1. Google processes payment
2. Payment webhook sent to /functions/v1/google-payment-webhook
3. Edge function updates order status to 'confirmed'
4. Edge function sends notification to POS
5. Edge function sends confirmation email to customer
6. Customer checks order status at /order-confirmation page
7. Real-time updates via Supabase realtime subscription
8. POS terminal receives 'payment_completed' event
```

## Key Files

### Frontend Components
- `src/pages/GoogleOrderCheckout.tsx` - Checkout page for Google orders
- `src/pages/OrderConfirmation.tsx` - Order confirmation and tracking
- `src/hooks/useGoogleOrderNotifications.ts` - Real-time notification hooks

### Libraries
- `src/lib/googleActionsCenter.ts` - Menu feed generation
- `src/lib/googleOrderHandler.ts` - Order processing
- `src/lib/googleMenuFeedManager.ts` - Menu feed management
- `src/lib/posWebSocketManager.ts` - WebSocket server for POS
- `src/lib/webhookManager.ts` - Webhook management

### Supabase Functions
- `supabase/functions/google-menu-feed/` - Menu feed endpoint
- `supabase/functions/process-google-order/` - Order processing
- `supabase/functions/google-payment-webhook/` - Payment handling

## Testing

### Test Menu Feed
```bash
curl "http://localhost:8080/functions/v1/google-menu-feed?businessId=test&format=json" | jq
```

### Test Order Processing
```bash
curl -X POST http://localhost:8080/functions/v1/process-google-order \
  -H "Content-Type: application/json" \
  -d @order-test.json
```

### Test WebSocket
```javascript
const ws = new WebSocket('ws://localhost:3001');
ws.onopen = () => {
  ws.send(JSON.stringify({
    event: 'register_business',
    businessId: 'test-business'
  }));
};
ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

## Troubleshooting

### Menu Feed Not Updating
- Check: Menu items are marked `is_active = true`
- Check: Google Merchant Center has correct feed URL
- Check: Supabase function deployed: `supabase functions list`
- Solution: Manually trigger refresh in Merchant Center

### Orders Not Appearing in POS
- Check: POS webhook URL configured in env vars
- Check: Supabase function logs: `supabase functions logs process-google-order`
- Check: Order saved in database: `SELECT * FROM orders WHERE source = 'google'`
- Solution: Verify webhook endpoint is accessible

### WebSocket Notifications Not Working
- Check: WebSocket server running on port 3001
- Check: VITE_POS_WEBSOCKET_URL configured correctly
- Check: Browser console for connection errors
- Solution: Start WebSocket server manually if needed

### Payment Webhook Failures
- Check: Payment function deployed
- Check: Database tables created with all columns
- Check: Function environment variables set
- Solution: Check Supabase function logs

## Security Considerations

1. **Webhook Signature Verification** - Always verify webhook signatures
2. **CORS Configuration** - Restrict to trusted origins
3. **Input Validation** - Validate all order data
4. **Authentication** - Protect sensitive endpoints
5. **Rate Limiting** - Implement rate limits on public endpoints
6. **Encryption** - Use HTTPS for all communications

## Performance Optimization

1. **Menu Feed Caching** - Cache feeds with 1-hour TTL
2. **Database Indexing** - Index frequently queried columns
3. **WebSocket Scaling** - Use Redis adapter for multiple instances
4. **Pagination** - Limit menu items per response
5. **CDN** - Cache static assets

## Next Steps

1. Deploy to production
2. Test with Google Merchant Center
3. Configure POS webhook endpoint
4. Set up monitoring and logging
5. Train staff on new order flow
6. Monitor metrics and optimize

For questions or issues, refer to:
- [Google Actions Center Documentation](https://developers.google.com/actions)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Socket.io Documentation](https://socket.io/docs/)
