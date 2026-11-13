# CoachingOS — Production Deployment & Operations Guide

## 1. Verified Live Production Deployment

| Parameter | Production Value |
|---|---|
| **Live Production URL** | **https://coachingos-app-qbyu.netlify.app** |
| **Hosting Platform** | Netlify Edge / Production CDN |
| **Site ID** | `3662be4e-1fa8-4657-be59-f131c9560c33` |
| **Deploy ID** | `6af6e55bde50cd9b20355b7f` |
| **Deploy Status** | `ready` (Verified 200 OK) |
| **GitHub Repository** | `https://github.com/Warriorlegacy/coachingos` |
| **CI / CD Pipeline** | GitHub Actions (`CoachingOS CI`) — **Passing Green (1m22s)** |
| **Verification Timestamp** | 13 November 2026, 15:55 IST |
| **Live Asset Bundle** | `assets/index-DigL0MKu.js` (300 kB uncompressed, 78 kB gzipped) |

---

## 2. Multi-Runtime Architecture

CoachingOS is engineered with a **dual-runtime** design:
1. **Container / Node.js Runtime**: Single-port HTTP service serving both `/api/v1` and the compiled React SPA from `public/`. Ideal for Render, Docker, WorkBuddy, Railway, VPS, or local development.
2. **Edge / Cloudflare Workers Runtime**: Runs via `server/worker.js`, using Cloudflare D1 for relational persistence and Workers Static Assets for static files.

---

## 2. Local Production Run

```bash
# 1. Install dependencies
npm install --no-audit --no-fund

# 2. Run quality checks
npm run check

# 3. Start production server
npm start
```

The application will bind to `0.0.0.0:3000` (or `PORT` environment variable).
- URL: `http://localhost:3000`
- API Health: `http://localhost:3000/api/v1/health`

---

## 3. Environment Variables Reference

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | Optional | `3000` | Port for the HTTP server |
| `NODE_ENV` | Optional | `production` | Environment mode |
| `SESSION_SECRET` | Recommended | `coachingos-dev-...` | HMAC secret for session cookies |
| `ALLOW_DEMO` | Optional | `true` | Enables 1-click persona logins on public preview |
| `DATABASE_FILE` | Optional | `data/coachingos.db` | Path to persistent SQLite database |
| `DEFAULT_TIMEZONE` | Optional | `Asia/Kolkata` | Fallback centre timezone |
| `DEFAULT_CURRENCY` | Optional | `INR` | Fallback currency (INR, USD, EUR) |
| `GEMINI_API_KEY` | Optional | `""` | Google Gemini 1.5 Flash for AI lesson plans |
| `GROQ_API_KEY` | Optional | `""` | Groq Llama 3.3 for AI features |
| `RESEND_API_KEY` | Optional | `""` | Resend transactional email integration |

---

## 4. Cloudflare Workers & D1 Deployment

When deploying to Cloudflare Workers:
```bash
# 1. Create D1 database
cf d1 create coachingos-db

# 2. Execute schema migration
cf d1 execute coachingos-db --file=server/db/schema.sql

# 3. Build static frontend
npm run build

# 4. Deploy worker with assets
cf deploy
```

---

## 5. Security & Clickjacking Guardrail

- The application sets `X-Frame-Options: DENY` and `Content-Security-Policy`.
- Reverse proxies (such as preview hosts) that embed the app in an iframe may rewrite `frame-ancestors`. For custom domain customer deployments, ensure the upstream DNS/proxy retains these security headers.
