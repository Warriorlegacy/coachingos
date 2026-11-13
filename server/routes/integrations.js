// server/routes/integrations.js - Truthful Integration Status
import { Hono } from 'hono';

export const integrationRoutes = new Hono();

integrationRoutes.get('/', (c) => {
  return c.json({
    email: {
      provider: process.env.RESEND_API_KEY ? 'Resend' : 'In-App Notifications (Native)',
      configured: !!process.env.RESEND_API_KEY,
      freeTierQuota: '3,000 emails/month on Resend Free',
    },
    ai: {
      provider: process.env.GEMINI_API_KEY ? 'Google Gemini 1.5 Flash' : process.env.GROQ_API_KEY ? 'Groq (Llama 3.3)' : 'Rule-Based Heuristics (Zero External Cost)',
      configured: !!(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY),
      freeTierQuota: 'Gemini free tier 15 RPM / Groq free tier 30 RPM',
    },
    database: {
      driver: 'SQLite 3 (ACID WAL Persistence)',
      durable: true,
      freeTierQuota: 'Cloudflare D1: 5 GB account storage, 10 databases',
    },
    storage: {
      provider: process.env.R2_BUCKET_NAME ? 'Cloudflare R2' : 'Local Sandbox File Store',
      configured: !!process.env.R2_BUCKET_NAME,
      freeTierQuota: '10 GB-month, 1M Class A operations on Cloudflare R2',
    },
    payments: {
      mode: 'Manual Payment Ledger (Cash, UPI QR, Bank Transfer, Cheque)',
      gatewayConfigured: false,
      disclaimer: 'Manual payment recording is an internal administrative ledger entry, not a payment gateway transaction.',
    },
  });
});
