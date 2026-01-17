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

## Database Migration

Run the payment transactions table migration:
```sql
-- Run: database-migrations/payment-transactions-table.sql
```

This creates the `payment_transactions` table to track all payment transactions.

