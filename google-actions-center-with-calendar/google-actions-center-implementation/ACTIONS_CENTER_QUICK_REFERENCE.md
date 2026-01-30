# Google Actions Center Quick Reference

Fast lookup guide for Google Actions Center integration.

---

## Installation

```bash
# No additional packages needed
# Uses existing: supabase, socket.io (if real-time needed)

npm install socket.io  # For WebSocket POS notifications
```

---

## Quick Start (5 minutes)

### 1. Initialize Managers
```typescript
import { initializeActionsCenter, initializeOrderHandler, initializeWebSocket } from '@/lib';

// At app startup
initializeActionsCenter({
  businessId: process.env.VITE_BUSINESS_ID,
  businessName: process.env.VITE_BUSINESS_NAME,
  checkoutBaseUrl: process.env.VITE_CHECKOUT_BASE_URL,
});

initializeOrderHandler(
  process.env.VITE_BUSINESS_ID,
  process.env.VITE_WEBHOOK_SECRET,
  process.env.VITE_POS_WEBSOCKET_URL
);

initializeWebSocket(process.env.VITE_BUSINESS_ID).initializeServer(3001);
```

### 2. Generate Menu Feed
```typescript
const manager = getActionsCenter();
const feed = await manager.generateMenuFeedJSON(menuItems);
await manager.saveMenuFeed(feed, 'json');
```

### 3. Serve Feed Endpoint
```typescript
// GET /api/google/menu-feed?format=json
const feed = await manager.getMenuFeed('json');
return new Response(feed, {
  headers: { 'Content-Type': 'application/json' }
});
```

### 4. Register with Google
- Go to Google Merchant Center
- Add feed URL: `https://yourpos.com/api/google/menu-feed`
- Wait for approval

---

## Core API

### Menu Feed Manager

| Method | Purpose |
|--------|---------|
| `generateMenuFeedJSON(items)` | Generate JSON feed |
| `generateMenuFeedXML(items)` | Generate XML feed |
| `saveMenuFeed(feed, format)` | Save to database |
| `getMenuFeed(format)` | Get current feed |
| `buildActionLink(id, name, price, params)` | Build checkout URL |
| `getFeedUrl(format)` | Get public feed URL |

### Order Handler

| Method | Purpose |
|--------|---------|
| `processGoogleOrder(order)` | Process incoming order |
| `getOrderStatus(orderId)` | Get order status |
| `updateOrderStatus(orderId, status, notes)` | Update status |
| `getGoogleOrders(limit)` | Get Google orders |
| `handlePaymentNotification(orderId, status)` | Handle payment |
| `verifyWebhookSignature(payload, signature)` | Verify webhook |

### WebSocket Manager

| Method | Purpose |
|--------|---------|
| `initializeServer(port)` | Start WebSocket server |
| `notifyOrderReceived(notification)` | Send to POS |
| `sendAlert(title, message, priority)` | Send alert |
| `sendToTerminal(terminalId, message)` | Send to specific terminal |
| `getConnectedTerminals()` | Get online terminals |
| `getNotificationHistory(limit)` | Get past notifications |

---

## Data Structures

### MenuItem
```typescript
{
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  availability: 'available' | 'unavailable';
  prepTime?: number;
  dietary?: string[];
}
```

### GoogleOrderData
```typescript
{
  orderId: string;
  source: 'google';
  customerEmail: string;
  customerName: string;
  items: OrderLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  orderType: 'pickup' | 'delivery' | 'dine_in';
  specialInstructions?: string;
}
```

### OrderNotification
```typescript
{
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderType: 'pickup' | 'delivery' | 'dine_in';
  items: OrderItem[];
  specialInstructions?: string;
  priority?: 'normal' | 'high' | 'urgent';
  timestamp: string;
}
```

---

## Environment Variables

```bash
VITE_BUSINESS_ID=your-business-id
VITE_BUSINESS_NAME=Your Business Name
VITE_CHECKOUT_BASE_URL=https://yourpos.com
VITE_POS_WEBHOOK_URL=http://pos-system:8000/webhook
VITE_POS_WEBSOCKET_URL=ws://pos-system:3001
VITE_WEBHOOK_SECRET=random-secret-key
```

---

## Common Patterns

### Handle Google Checkout Redirect
```typescript
const params = new URLSearchParams(window.location.search);
if (params.get('source') === 'google') {
  const item = {
    id: params.get('item'),
    name: params.get('name'),
    price: parseFloat(params.get('price')),
  };
  addToCart(item);
}
```

### Process Order from Checkout
```typescript
const result = await orderHandler.processGoogleOrder({
  orderId: generateId(),
  customerEmail: form.email,
  customerName: form.name,
  items: cart.items,
  total: cart.total,
  paymentMethod: 'credit_card',
  orderType: 'pickup',
  source: 'google',
  createdAt: new Date().toISOString(),
  status: 'pending',
});
```

### Notify POS via WebSocket
```typescript
await websocket.notifyOrderReceived({
  orderId: order.id,
  orderNumber: order.order_number,
  customerName: order.customer_name,
  orderType: order.order_type,
  items: order.items,
  timestamp: new Date().toISOString(),
});
```

### Connect POS Terminal
```typescript
// Client-side on POS terminal
const socket = io(process.env.VITE_POS_WEBSOCKET_URL);

socket.emit('register_terminal', {
  terminalId: 'kitchen-1',
  terminalName: 'Kitchen Display',
});

socket.on('pos_notification', (msg) => {
  if (msg.type === 'order_received') {
    playSound();
    displayOrder(msg.data);
  }
});
```

### Update Order Status
```typescript
await orderHandler.updateOrderStatus(
  orderId,
  'in_progress',
  'Being prepared'
);

// Later
await orderHandler.updateOrderStatus(
  orderId,
  'ready',
  'Ready for pickup'
);
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/google/menu-feed` | GET | Serve menu to Google |
| `/api/orders/google` | POST | Receive new order |
| `/api/orders/{id}/status` | GET | Check order status |
| `/api/webhook/google-order` | POST | Receive webhook |
| `/functions/v1/process-google-order` | POST | Edge function |

---

## Error Handling

```typescript
try {
  const result = await orderHandler.processGoogleOrder(order);
} catch (error) {
  if (error.message.includes('validation')) {
    // Invalid order data
    return res.status(400).json({ error: 'Invalid order' });
  } else if (error.message.includes('database')) {
    // Database error
    return res.status(500).json({ error: 'Database error' });
  }
  throw error;
}
```

---

## Testing

### Test Menu Feed
```bash
curl https://yourpos.com/api/google/menu-feed?format=json
```

### Test Order Processing
```bash
curl -X POST https://yourpos.com/api/orders/google \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-123",
    "customerEmail": "test@example.com",
    "customerName": "Test User",
    "items": [...],
    "total": 25.00,
    "paymentMethod": "credit_card",
    "orderType": "pickup"
  }'
```

---

## Performance Tips

1. **Cache Menu Feed** - Update once daily unless real-time needed
2. **Batch Notifications** - Group multiple orders if possible
3. **Use Webhooks** - Faster than polling for status updates
4. **WebSocket** - Best for real-time POS notifications
5. **Database Indexing** - Index `google_order_id` and `source` columns

---

## Security Checklist

- [ ] Use HTTPS for all endpoints
- [ ] Validate webhook signatures
- [ ] Rate limit order endpoint
- [ ] Sanitize all user input
- [ ] Rotate webhook secrets regularly
- [ ] Log all orders for audit trail
- [ ] Encrypt sensitive data
- [ ] Use environment variables for secrets

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Feed not in Google | Check URL is public, validate format |
| Orders not arriving | Verify webhook URL, check firewall |
| WebSocket not connecting | Check CORS, verify port is open |
| Slow notifications | Optimize database queries, check network |
| Missing orders | Check database connection, verify business_id |
| Payment failing | Check payment gateway, verify signature |

---

## File Structure

```
src/lib/
├── googleActionsCenter.ts    (380 lines)
├── googleOrderHandler.ts     (350 lines)
└── posWebSocketManager.ts    (420 lines)

supabase/functions/
└── process-google-order/
    └── index.ts              (120 lines)

Documentation:
├── GOOGLE_ACTIONS_CENTER_SETUP.md
├── ACTIONS_CENTER_EXAMPLES.ts
├── ACTIONS_CENTER_INTEGRATION_CHECKLIST.md
└── ACTIONS_CENTER_QUICK_REFERENCE.md
```

---

## Key Concepts

**Action Link**: URL that redirects customer from Google to your checkout
```
https://yourpos.com/order?source=google&item=burger&price=9.99
```

**Menu Feed**: JSON/XML document sent to Google with menu items and action links
- Updated daily or in real-time
- Contains item details and prices
- Hosted at public endpoint

**Webhook**: HTTP POST when payment complete
- POS receives order details
- Notifies kitchen
- Updates order status

**WebSocket**: Real-time connection between server and POS terminals
- Instant order notifications
- Two-way communication
- Persistent connection

---

## Resources

- [Google Actions Center Docs](https://support.google.com/business/answer/9689656)
- [Menu Feed Specification](https://developers.google.com/my-business/content/menu-feed)
- [Merchant Center Help](https://support.google.com/merchants)
- [Socket.io Documentation](https://socket.io/docs/)

---

## Support

For issues or questions:
1. Check [GOOGLE_ACTIONS_CENTER_SETUP.md](GOOGLE_ACTIONS_CENTER_SETUP.md)
2. Review [ACTIONS_CENTER_EXAMPLES.ts](ACTIONS_CENTER_EXAMPLES.ts)
3. Check troubleshooting section above
4. Review logs and error messages
5. Contact support team

---

**Last Updated**: 2024  
**Version**: 1.0  
**Status**: Production Ready ✅
