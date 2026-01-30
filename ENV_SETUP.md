# Environment Variables Setup

## Supabase Configuration (Required)

The application requires Supabase for database and authentication. Add the following environment variables to your `.env` file:

```env
# Supabase Configuration
# Get these values from your Supabase project dashboard:
# https://app.supabase.com/project/YOUR_PROJECT/settings/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
# Optional: Custom schema (defaults to 'public')
# VITE_SUPABASE_SCHEMA=public
```

### How to Get Supabase Credentials:

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project or select an existing one
3. Navigate to **Settings** → **API**
4. Copy the following values:
   - **Project URL** → Use as `VITE_SUPABASE_URL`
   - **anon/public key** → Use as `VITE_SUPABASE_ANON_KEY`

### Database Setup:

After setting up your Supabase project, run the database migrations in order (see `database-migrations/README.md` for details).

## PayU Integration Configuration

Add the following environment variables to your `.env` file:

```env
# PayU Payment Gateway Configuration
VITE_PAYU_MERCHANT_KEY=YzJnpD
VITE_PAYU_MERCHANT_SALT=2pinFW12vHgzgIGLHqCvvDI0i08C7tRc
VITE_PAYU_TEST_MODE=true
```

## Important Notes

1. **Test Mode**: Set `VITE_PAYU_TEST_MODE=true` for testing. Change to `false` for production.

2. **Production Keys**: When going live, replace the test keys with your production PayU merchant key and salt.

3. **Security**: Never commit your production keys to version control. Use environment variables or secure secret management.

4. **Webhook URL**: Configure your PayU webhook URL in PayU dashboard:
   - Test: `https://your-domain.com/api/payu-webhook`
   - Production: `https://your-domain.com/api/payu-webhook`

## Current Configuration

The following keys are already configured for testing:
- Merchant Key: `YzJnpD`
- Merchant Salt: `2pinFW12vHgzgIGLHqCvvDI0i08C7tRc`
- Test Mode: `true`

## Web3Forms (Contact / Support / Auth forms)

Add to your `.env` so Contact, Public Support, and Auth forms submit correctly:

```env
# Web3Forms – get key from https://web3forms.com
VITE_WEB3FORMS_ACCESS_KEY=your-web3forms-access-key
```

## Resend (order confirmation emails)

Add to your `.env` for reference; **order emails are sent by the Edge Function**, which reads from Supabase secrets:

```env
# Resend – same value must be set in Supabase as RESEND_API_KEY (see below)
VITE_RESEND_API_KEY=your-resend-api-key
```

**Important:** The `send-order-confirmation` Edge Function reads **Supabase secrets**. To use your `.env` Resend key there, run (after `npx supabase login` and `npx supabase link`):

```bash
npm run supabase:secrets-sync
```

This reads `VITE_RESEND_API_KEY` from `.env` and sets `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Supabase. Alternatively, set them manually in Supabase Dashboard → Edge Functions → Secrets. See `supabase/SECRETS_SETUP.md`.

## Google Actions Center & GenAI (Optional)

If you use the integrated Google Actions Center (orders from Google) and AI Reports:

```env
# Checkout base URL for Google order links (e.g. https://your-domain.com)
VITE_CHECKOUT_BASE_URL=https://your-domain.com

# Optional: POS webhook URL for order notifications
# POS_WEBHOOK_URL=https://your-pos.com/webhook

# Optional: WebSocket URL for real-time POS alerts
# VITE_POS_WEBSOCKET_URL=ws://localhost:3001
```

**Supabase Edge Function secrets** (set in Supabase Dashboard → Edge Functions → Secrets):

- `GOOGLE_GENAI_API_KEY` — For AI Reports (generate-ai-report function). Get from [Google AI Studio](https://makersuite.google.com/app/apikey).
- `GOOGLE_GENAI_ENDPOINT` — Optional override for GenAI API endpoint.
- `POS_WEBHOOK_URL` — Optional; URL your POS receives order and payment webhooks.
- **Order confirmation email:** `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (default in code: `no-reply@retailmarketingpro.in`) for send-order-confirmation. See `supabase/SECRETS_SETUP.md` for how to set. If not set, the function skips sending email.
- **Google Calendar webhook:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` for process-google-calendar-webhooks (token refresh). Optional if you don’t use Calendar sync.

**Deploy Edge Functions:**

```bash
supabase functions deploy process-google-order
supabase functions deploy google-menu-feed
supabase functions deploy google-payment-webhook
supabase functions deploy generate-ai-report
supabase functions deploy send-order-confirmation
supabase functions deploy process-google-calendar-webhooks
```

See `INTEGRATION_GOOGLE_ACTIONS.md` for routes and database requirements.

## Database Migration

Run the payment transactions table migration:
```sql
-- Run: database-migrations/payment-transactions-table.sql
```

This creates the `payment_transactions` table to track all payment transactions.

