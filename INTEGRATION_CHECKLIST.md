# Integration Checklist – All Features Working

Use this checklist so **Web3Forms**, **Resend order emails**, **Google Actions**, and **AI Reports** work correctly.

---

## 1. Environment variables (`.env`)

Ensure your `.env` includes (see `ENV_SETUP.md` and `.env.example`):

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_WEB3FORMS_ACCESS_KEY` | Contact, Support, Auth forms (Web3Forms) |
| `VITE_RESEND_API_KEY` | Resend API key (same value must be in Supabase secrets) |

Restart the dev server after changing `.env`: `npm run dev`.

---

## 2. Supabase Edge Function secrets (Resend from .env)

**Easiest:** Sync your `.env` Resend key to Supabase (run after `npx supabase login` and `npx supabase link`):

```bash
npm run supabase:secrets-sync
```

This reads `VITE_RESEND_API_KEY` from `.env` and sets `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Supabase. Alternatively, set them manually in **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (same values as in `.env`).

Optional: `GOOGLE_GENAI_API_KEY` (AI Reports), `POS_WEBHOOK_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Calendar). See `supabase/SECRETS_SETUP.md`.

---

## 3. Deploy all Edge Functions

From project root, after `npx supabase login` and `npx supabase link`:

```bash
npm run supabase:deploy
```

Or deploy one by one:

```bash
npx supabase functions deploy process-google-order
npx supabase functions deploy google-menu-feed
npx supabase functions deploy google-payment-webhook
npx supabase functions deploy generate-ai-report
npx supabase functions deploy send-order-confirmation
npx supabase functions deploy process-google-calendar-webhooks
```

---

## 4. Database migrations

Run in Supabase SQL Editor (in order):

- `database-migrations/google-actions-orders.sql`
- `database-migrations/google-actions-menu-feed.sql`
- `database-migrations/google-calendar-tables.sql`

(Plus any base migrations if this is a fresh project.)

---

## 5. Quick checks

| Feature | How to verify |
|---------|----------------|
| **Web3Forms** | Submit Contact or Public Support form; message should be received. |
| **Order confirmation email** | Place a test order at `/order?source=google&item=1&name=Test&price=10`, complete checkout; customer email should get confirmation from `no-reply@retailmarketingpro.in`. |
| **Google checkout** | Open `/order?source=google&item=...&name=...&price=...`; checkout page loads and order saves. |
| **AI Reports** | Log in → Reports → AI Reports; paste orders JSON and click Generate. |
| **Menu feed** | `GET https://<project>.supabase.co/functions/v1/google-menu-feed?businessId=<id>&format=json` returns JSON (add businesses/menu_items for non-empty feed). |

---

## 6. Troubleshooting

- **Contact/Support form not sending:** Check `VITE_WEB3FORMS_ACCESS_KEY` in `.env` and restart dev server.
- **No order confirmation email:** Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Supabase Edge Function secrets and redeploy `send-order-confirmation`.
- **Functions not found:** Run `npm run supabase:deploy` and ensure the project is linked (`npx supabase link`).
