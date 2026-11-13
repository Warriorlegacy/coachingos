# CoachingOS — Comprehensive Test Plan

## 1. Test Objectives

Ensure CoachingOS satisfies all production-grade criteria:
1. **Multi-Tenancy & RBAC**: Rigorous verification that no user can access data from another centre, and that roles (`teacher`, `student`, `guardian`, `accountant`, `centre_admin`, `centre_owner`) are strictly confined to their authorized records.
2. **Attendance Domain**: Verification of unique attendance sessions, bulk marking, correction audit trails, and offline synchronization conflict detection.
3. **Homework & Grading**: Verification of submission deadlines, role checks on grading, and feedback delivery.
4. **Assessment & Progress**: Validation that marks out-of-range are rejected (`marks < 0` or `marks > max_marks`), and calculations for pass rates and averages are exact.
5. **Fee Ledger & Invoicing**: Strict testing of decimal-safe integer math, partial payments, discount tracking, balance reconciliation, and receipt generation.
6. **Student Data Management**: CSV import with row-level validation, duplicate admission number detection, and sanitized exports.
7. **Accessibility & Responsive PWA**: Verification across Mobile (375px), Tablet (768px), and Desktop (1280px) viewports with zero critical WCAG 2.1 AA violations.

---

## 2. Test Execution Matrix

| Test Suite | Framework | Target Files | Verification Method |
|---|---|---|---|
| **Unit & Math Tests** | Vitest | `tests/unit/*.test.ts` | Decimal arithmetic, CSV parser, conflict detector, token crypto |
| **API Integration Tests** | Vitest | `tests/api/*.test.ts` | Full HTTP request/response against real SQLite database |
| **End-to-End User Journeys** | Playwright | `tests/e2e/*.spec.ts` | Mobile, tablet, and desktop browser journeys |
| **Accessibility Audits** | axe-core | `tests/e2e/*.spec.ts` | Zero WCAG 2.1 A/AA violations on all major role portals |
