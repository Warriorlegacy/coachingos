# CoachingOS — Free-First Stack & Infrastructure Audit

**Audit Date:** November 2026  
**Policy:** Initial deployment target $0 budget, zero surprise charges, clear quota ceilings, and transparent fallback adapters.

---

## 1. Verified Infrastructure Services

| Service | Provider | Exact Free Tier Quota / Limits | Role in CoachingOS | Fallback Mechanism |
|---|---|---|---|---|
| **Serverless Compute** | Cloudflare Workers Free | 100,000 req/day, 10ms CPU time/req | Edge API routes & Worker SSR | Portable Node.js HTTP server |
| **Relational Database** | Cloudflare D1 Free | 10 databases, 500 MB per DB, 5 GB account storage, 5M read rows/day | Tenancy & relational models | Local SQLite / `sql.js` file persistence |
| **Static Asset Hosting** | Cloudflare Pages / Workers Static Assets | Free tier bandwidth & asset requests | React SPA bundling | Express/Hono static file serving |
| **Object Storage** | Cloudflare R2 Free | 10 GB storage, 1M Class A ops, 10M Class B ops/month | Assignment attachments & exports | Local filesystem sandbox |
| **AI Pedagogical API** | Groq / Gemini / Workers AI Free | Groq: 30 RPM, Gemini: 15 RPM free tier, Cloudflare AI: free daily neuron allocation | Lesson plans, student progress summaries | Built-in rule-based heuristics |
| **Transactional Email** | Resend Free / Cloudflare Email | 3,000 emails/month (100/day limit) | Guardian notices & invites | In-app notification center |
| **Continuous Integration** | GitHub Actions Free | 2,000 build minutes/month for public/private repos | Typecheck, Vitest, Playwright | Local automated testing scripts |

---

## 2. Quota Guardrails

1. **AI Request Throttle**: All AI features run through a debounce and rate-limiting wrapper. If an API key is missing or quota is exhausted, the application gracefully returns clean, deterministic heuristic text templates with an advisory indicator.
2. **Database Row Query Efficiency**: All queries on high-volume tables (`attendance_records`, `audit_events`, `invoices`) use indexed lookup columns (`centre_id`, `batch_id`, `student_id`, `date`) to minimize scanned rows and respect D1 free quotas.
3. **No Automatic Paid Upgrades**: The system never includes payment processing SDKs or programmatic cloud resource scaling without human confirmation.
