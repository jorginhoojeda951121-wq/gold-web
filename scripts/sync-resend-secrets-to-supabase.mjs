#!/usr/bin/env node
/**
 * Reads VITE_RESEND_API_KEY (and optional from-email) from .env and sets
 * Supabase Edge Function secrets RESEND_API_KEY and RESEND_FROM_EMAIL.
 * Run: node scripts/sync-resend-secrets-to-supabase.mjs
 * Requires: npx supabase login and npx supabase link done first.
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env');

const DEFAULT_FROM_EMAIL = 'no-reply@retailmarketingpro.in';

function parseEnv(path) {
  if (!existsSync(path)) {
    console.error('.env not found at', path);
    process.exit(1);
  }
  const content = readFileSync(path, 'utf8');
  const out = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = parseEnv(envPath);
const resendKey = env.VITE_RESEND_API_KEY || env.RESEND_API_KEY;
const fromEmail = env.VITE_RESEND_FROM_EMAIL || env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;

if (!resendKey) {
  console.error('Missing VITE_RESEND_API_KEY or RESEND_API_KEY in .env');
  process.exit(1);
}

console.log('Setting Supabase secrets from .env (RESEND_API_KEY, RESEND_FROM_EMAIL)...');

const result = spawnSync(
  'npx',
  ['supabase', 'secrets', 'set', `RESEND_API_KEY=${resendKey}`, `RESEND_FROM_EMAIL=${fromEmail}`],
  { cwd: root, stdio: 'inherit', shell: true }
);

if (result.status !== 0) {
  console.error('Failed. Run: npx supabase login && npx supabase link');
  process.exit(1);
}
console.log('Done. Redeploy send-order-confirmation if needed: npx supabase functions deploy send-order-confirmation');
