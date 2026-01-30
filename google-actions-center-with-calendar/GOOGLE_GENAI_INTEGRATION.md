# Google GenAI Integration

This integration adds a minimal connector to Google Generative AI to produce professional reports and summaries from POS orders.

Files added:
- `src/lib/googleGenAI.ts` — client wrapper with fallback
- `supabase/functions/generate-ai-report/index.ts` — Edge function to generate reports from provided orders
- `src/pages/Reports.tsx` — simple UI to paste orders JSON and request a generated report

Environment variables:
- `GOOGLE_GENAI_API_KEY` — API key for Google Generative AI (server-side only)
- `GOOGLE_GENAI_ENDPOINT` — (optional) override the GenAI endpoint

Usage:
- Deploy the Supabase function and set `GOOGLE_GENAI_API_KEY` in the function's environment.
- From the frontend, POST order arrays to the function endpoint to receive a professional report.
