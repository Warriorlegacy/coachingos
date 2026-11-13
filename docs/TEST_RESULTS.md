# CoachingOS — Automated Test Execution Results

**Execution Date:** 13 November 2026  
**Environment:** Windows 11 / Node.js v22.23.1 / Chromium 133 / Playwright 1.65.0  

---

## 1. Summary

| Test Suite | Total Tests | Passed | Failed | Execution Time |
|---|---|---|---|---|
| **Vitest Unit Tests** (`tests/unit/domain.test.ts`) | 4 | 4 | 0 | 22 ms |
| **Vitest API Integration** (`tests/api/api.test.ts`) | 13 | 13 | 0 | 47 ms |
| **Playwright E2E (Desktop Chrome)** (`tests/e2e/app.spec.ts`) | 5 | 5 | 0 | 5.2 s |
| **Playwright E2E (Mobile Chrome)** (`tests/e2e/app.spec.ts`) | 5 | 5 | 0 | 4.3 s |
| **WCAG 2.1 AA Accessibility Audit** (`@axe-core/playwright`) | 2 | 2 | 0 | 3.4 s |
| **TypeScript Typecheck** (`tsc --noEmit`) | Full codebase | Clean | 0 | 3.1 s |
| **Production Build** (`vite build`) | 47 modules | Clean | 0 | 4.28 s |
| **TOTALS** | **27** | **27** | **0** | **100% Pass** |

---

## 2. API & Unit Test Details

- `Domain Unit Tests > Password & Token Cryptography`: Hashes and verifies passwords via PBKDF2/SHA-512, signs & verifies session tokens, detects tampered payloads.
- `Domain Unit Tests > Decimal-Safe Financial Arithmetic`: Verifies integer minor units (paise/cents) eliminate floating-point roundoff errors across subtotals, discounts, and payments.
- `Domain Unit Tests > CSV Injection Sanitization`: Verifies spreadsheet formulas (`=`, `+`, `-`, `@`) are escaped.
- `Health & Integrations`: Verifies `/api/v1/health` and `/api/v1/integrations` report truthful status with no fake credentials.
- `Authentication & RBAC`: Verifies 1-click persona logins for `centre_owner` and `teacher`.
- `Guardian IDOR Protection`: Verifies parent can view linked child (`Rohan Gupta`) and receives `403 Forbidden` attempting to view unlinked student (`Aarav Mehra`).
- `Student Duplicate Admission Check`: Verifies duplicate admission numbers are rejected with `409 DUPLICATE_ADMISSION_NO`.
- `Attendance Correction Audit`: Verifies status modification requires mandatory edit reason and creates immutable `audit_events` row.
- `Homework Grading Bounds`: Verifies score greater than `max_points` fails with `400 SCORE_OUT_OF_RANGE`.
- `Assessment Marks Bounds`: Verifies test marks greater than `max_marks` fails with `400 MARKS_OUT_OF_RANGE`.
- `Fee Ledger & Receipt Generation`: Verifies partial payment updates invoice status and issues receipt `RCP-2026-XXXX`.
- `CSV Bulk Import Dry Run`: Validates CSV structure, identifies duplicate rows, and reports errors without modifying database.

---

## 3. End-to-End Browser Journeys

1. **Landing & Login view**: Renders brand, value proposition, and 6 live demo persona buttons.
2. **Owner Persona Dashboard**: Logs in via 1-click persona, lands on Overview with live KPIs, active centre indicator, and quick actions.
3. **Student Directory & 360° Profile**: Navigates to directory, filters students, opens 360 profile showing attendance rate, linked guardians, and fee invoices.
4. **Classroom Attendance**: Opens batch roster, tests one-tap "Mark All Present", and tests status saving.
5. **Accessibility Scan (axe-core)**: Zero WCAG 2.1 A and AA violations across both desktop and mobile viewports.
