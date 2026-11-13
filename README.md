# CoachingOS

> **Mobile-First Operating System for Independent Tutors & Coaching Centres**

CoachingOS unifies student records, guardian communications, batch scheduling, rapid classroom attendance, homework grading, continuous learning progress, and decimal-safe fee collection in one streamlined, production-ready system.

---

## 🚀 Key Highlights

- **Fast Classroom Attendance**: Mobile-optimized roster taking attendance in under 15 seconds per batch with one-tap bulk actions, offline PWA queueing, and mandatory audit reasons for corrections.
- **7-Tier Server-Enforced RBAC**: Isolated views and security barriers for `centre_owner`, `centre_admin`, `teacher`, `student`, `parent_guardian`, and `accountant`.
- **Decimal-Safe Financial Arithmetic**: All fees, discounts, partial payments, and receipts are computed in integer minor units (paise / cents), completely eliminating floating-point rounding errors.
- **AI Pedagogical Assistant**: Lesson planning, grounded parent progress letters, and courteous fee reminders powered by Gemini 1.5 Flash, Groq Llama 3.3, and Cloudflare Workers AI with built-in heuristic fallbacks.
- **Student 360° Profile & Guardian Protection**: Server-enforced IDOR protection ensuring guardians only access authorized children.
- **Free-First Cloudflare & Node Dual Runtime**: Runs seamlessly on Cloudflare Workers + D1 and portable Node.js / Docker / local environments.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, PWA manifest
- **Backend**: Hono v4, Node.js 22, Web Crypto / PBKDF2 cryptography
- **Database**: SQLite 3 (WAL mode) / Cloudflare D1
- **Testing**: Vitest (Unit & API Integration), Playwright (End-to-End Desktop & Mobile), axe-core (WCAG 2.1 AA)

---

## 🏃 Local Quickstart

```bash
# 1. Install dependencies
npm install --no-audit --no-fund

# 2. Run automated verification (typecheck + tests + build)
npm run check

# 3. Start local production server
npm start
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎭 1-Click Demo Sandbox Personas

When `ALLOW_DEMO=true` (enabled by default in sandbox mode), you can test any role instantly with 1 click on the login screen:

| Role | Synthetic Persona | Key Focus Area |
|---|---|---|
| **Centre Owner** | Ramesh Sharma (`owner@coachingos.demo`) | Full institute management, KPIs, staff, billing |
| **Centre Admin** | Anita Verma (`admin@coachingos.demo`) | Batches, enrollments, timetable conflict rules |
| **Teacher** | Vikram Sen (`teacher@coachingos.demo`) | Assigned batch attendance, homework & test grading |
| **Student** | Rohan Gupta (`student@coachingos.demo`) | Personal schedule, homework submissions & results |
| **Parent / Guardian** | Sunil Gupta (`parent@coachingos.demo`) | Child attendance, test performance, fee receipts |
| **Accountant** | Deepak Patel (`accountant@coachingos.demo`) | Invoices, manual payment entries & receipts |

---

## 🧪 Testing & Quality Assurance

```bash
# Run Vitest unit & API integration tests
npm test

# Run Playwright E2E browser journeys across Desktop & Mobile
npm run test:e2e

# Run complete quality gate
npm run check
```

**Test Verification Summary:**
- **Vitest**: 17 passed / 0 failed
- **Playwright E2E**: 10 passed / 0 failed (Chromium Desktop 1280px & Pixel 5 Mobile 375px)
- **Accessibility**: 100% WCAG 2.1 AA compliant (zero axe violations)

---

## 📚 Documentation Links

- [PRD & Business Mandate](docs/PRD.md)
- [System Architecture & Trust Boundaries](docs/ARCHITECTURE.md)
- [Data Dictionary & Schema (36 Tables)](docs/DATA_DICTIONARY.md)
- [API Reference](docs/API.md)
- [Security, Privacy & Threat Model](docs/SECURITY_AND_PRIVACY.md)
- [Free-First Stack Quota Audit](docs/FREE_STACK_AUDIT.md)
- [Deployment & Operations Guide](docs/DEPLOYMENT.md)
- [Test Plan & Results](docs/TEST_RESULTS.md)
- [Architectural Assumptions](docs/ASSUMPTIONS.md)
