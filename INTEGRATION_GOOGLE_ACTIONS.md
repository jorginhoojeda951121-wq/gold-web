# Google Actions Center & GenAI Integration

This document describes the integration of the **google-actions-center-with-calendar** add-on into the main Gold Crafts project.

## What Was Integrated

### 1. Google Actions Center (orders from Google)

- **Routes**
  - `/order` — Checkout page when customers click "Order" from Google (public).
  - `/order-confirmation` — Order confirmation and tracking (public).
- **Pages**
  - `src/pages/GoogleOrderCheckout.tsx` — Collects customer info and submits order via Edge Function.
  - `src/pages/OrderConfirmation.tsx` — Shows order details and status.
- **Lib**
  - `src/lib/googleMenuFeedManager.ts` — Menu feed generation (JSON/XML) for Google Merchant Center.
- **Hooks**
  - `src/hooks/useGoogleOrderNotifications.ts` — Realtime order updates and optional WebSocket/POS hooks.

### 2. GenAI Reports

- **Route**
  - `/reports/ai` — AI-generated reports from order data (protected).
- **Page**
  - `src/pages/GenAIReports.tsx` — Paste orders JSON and request a report via Edge Function.
- **Lib**
  - `src/lib/googleGenAI.ts` — Client-side fallback summary (optional; main flow uses Edge Function).

### 3. Supabase Edge Functions

All under `supabase/functions/`:

| Function                 | Purpose                                      |
|--------------------------|----------------------------------------------|
| `process-google-order`   | Receives order from checkout, saves to DB.  |
| `google-menu-feed`       | Serves menu feed (JSON/XML) to Google.      |
| `google-payment-webhook` | Handles payment status, updates order.      |
| `generate-ai-report`     | Generates AI report from orders (GenAI).     |
| `send-order-confirmation` | Sends confirmation email (Resend). Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. |
| `process-google-calendar-webhooks` | Syncs Google Calendar changes to `appointments` table. |

Deploy from project root:

```bash
supabase functions deploy process-google-order
supabase functions deploy google-menu-feed
supabase functions deploy google-payment-webhook
supabase functions deploy generate-ai-report
supabase functions deploy send-order-confirmation
supabase functions deploy process-google-calendar-webhooks
```

Set secrets in Supabase Dashboard: `GOOGLE_GENAI_API_KEY`; optionally `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for order emails; `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Calendar webhook token refresh.

## Environment Variables

See **ENV_SETUP.md** for:

- `VITE_CHECKOUT_BASE_URL` — Base URL for order links (e.g. `https://your-domain.com`).
- Optional: `POS_WEBHOOK_URL`, `VITE_POS_WEBSOCKET_URL`.
- Edge Function secrets: `GOOGLE_GENAI_API_KEY`, `GOOGLE_GENAI_ENDPOINT`, `POS_WEBHOOK_URL`.

## Database Requirements

For **Google Actions Center** to work end-to-end:

1. **`orders` table** — Run the migration:
   ```sql
   -- Run: database-migrations/google-actions-orders.sql
   ```
   This creates the `orders` table with: `order_number`, `google_order_id`, `customer_name`, `customer_email`, `customer_phone`, `items` (JSONB), `subtotal`, `tax`, `delivery_fee`, `total`, `payment_method`, `order_type`, `special_instructions`, `source`, `status`, `estimated_ready_time`, `payment_status`, `payment_transaction_id`, `created_at`, `updated_at`.

2. **Menu feed** — Run the migration:
   ```sql
   -- Run: database-migrations/google-actions-menu-feed.sql
   ```
   This creates `businesses`, `menu_items`, and `google_menu_feeds`. Add at least one business and menu items for the feed to be non-empty.

3. **AI Reports** do not require extra tables; they use the Edge Function and optional `GOOGLE_GENAI_API_KEY`.

4. **Google Calendar webhook** — Run the migration:
   ```sql
   -- Run: database-migrations/google-calendar-tables.sql
   ```
   This creates `calendar_tokens`, `appointments`, and `appointment_notifications`. The Edge Function `process-google-calendar-webhooks` syncs Calendar event deletions/cancellations to `appointments`. OAuth and event creation (e.g. `calendarEventManager`, booking UI) are separate; see `google-actions-center-with-calendar/README_CALENDAR.md` for full Calendar setup.

## Quick Links

- **Checkout (test):** `https://your-domain.com/order?source=google&item=ITEM_ID&name=Item%20Name&price=10.99`
- **Menu feed (JSON):** `https://YOUR_PROJECT.supabase.co/functions/v1/google-menu-feed?businessId=xxx&format=json`
- **AI Reports:** After login, go to **/reports/ai**.
