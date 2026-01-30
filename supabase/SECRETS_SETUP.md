# Supabase Edge Function Secrets

Order confirmation emails are sent by the **send-order-confirmation** Edge Function, which reads **Supabase secrets**. You can use the Resend key from your `.env` in two ways.

## Option 1 — Sync from .env (recommended)

Reads `VITE_RESEND_API_KEY` and optional `VITE_RESEND_FROM_EMAIL` from your `.env` and sets Supabase secrets. Run after `npx supabase login` and `npx supabase link`:

```bash
npm run supabase:secrets-sync
```

This runs `scripts/sync-resend-secrets-to-supabase.mjs`, which pushes `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to Supabase from your `.env`.

## Option 2 — Dashboard

Supabase → Project Settings → Edge Functions → Secrets. Add:

| Secret | Value |
|--------|--------|
| `RESEND_API_KEY` | Same value as `VITE_RESEND_API_KEY` in your `.env` |
| `RESEND_FROM_EMAIL` | `no-reply@retailmarketingpro.in` |

## Option 3 — CLI (manual)

After `npx supabase login` and `npx supabase link`:

```bash
npx supabase secrets set RESEND_API_KEY=<paste-your-resend-api-key>
npx supabase secrets set RESEND_FROM_EMAIL=no-reply@retailmarketingpro.in
```

## Resend (order confirmation emails)

| Secret | Description |
|--------|-------------|
| `RESEND_API_KEY` | Your Resend API key (from resend.com → API Keys). |
| `RESEND_FROM_EMAIL` | Sender address; default in code is `no-reply@retailmarketingpro.in`. |

If `RESEND_API_KEY` is not set, the `send-order-confirmation` function skips sending and returns success so orders still complete.

## Other optional secrets

- `GOOGLE_GENAI_API_KEY` — For AI Reports (generate-ai-report).
- `POS_WEBHOOK_URL` — URL your POS receives order/payment webhooks.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — For Calendar webhook token refresh.
