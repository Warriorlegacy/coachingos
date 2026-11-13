# Changelog — CoachingOS

All notable changes to this project are documented in this file.

## [1.0.0] - 2026-11-13

### Added
- **Core Multi-Tenant Engine**: SQLite 3 & Cloudflare D1 dual-runtime database adapter with full foreign key constraints, indexes, and automated migrations.
- **7-Tier Server-Enforced RBAC**: Roles for `centre_owner`, `centre_admin`, `teacher`, `student`, `parent_guardian`, `accountant`, and `platform_operator`.
- **Student & Guardian Directory**: Unique admission number per centre, student profiles, multiple guardian relationships, CSV bulk import with dry-run error preview, and formula-injection-safe CSV export.
- **Batches & Timetable Engine**: Class capacity management, teacher assignments, timetable rules with schedule conflict detection.
- **Sub-15s Classroom Attendance**: Fast mobile attendance taking, one-tap "Mark All Present", status toggling (present, absent, late, excused), mandatory audit reason on record corrections, and offline PWA queue sync.
- **Homework & Submissions Engine**: Task distribution, student submission workflow (text notes and attachments), and rubric-based grading with bounds check `[0, max_points]`.
- **Assessments & Continuous Learning Progress**: Unit tests, marks entry matrix, pass rate tracking, and individual student progress cards without toxic public leaderboards.
- **Decimal-Safe Fee Ledger**: Integer minor unit arithmetic (paise / cents), itemized fee heads, student invoices, manual payment recording (Cash, UPI Reference, Bank Transfer), balance reconciliation, and receipt generation.
- **Centre Notices & Broadcasts**: Targeted announcements with priority badges (normal, important, urgent).
- **AI Pedagogical Assistant**: Multi-provider AI adapter (Gemini 1.5 Flash, Groq Llama 3.3, Cloudflare AI) with deterministic rule-based fallbacks for lesson planning, grounded parent progress letters, and polite fee reminders.
- **Immutable Audit Trail**: Event logging for attendance modifications, marks adjustments, and payment entries.
- **Testing & Accessibility**: 17 Vitest unit and API integration tests + 10 Playwright E2E browser tests across desktop and mobile with zero WCAG 2.1 AA accessibility violations.
- **Production Build & Documentation**: Complete documentation suite (`PRD.md`, `ARCHITECTURE.md`, `DATA_DICTIONARY.md`, `API.md`, `SECURITY_AND_PRIVACY.md`, `FREE_STACK_AUDIT.md`, `DEPLOYMENT.md`, `TEST_RESULTS.md`, `ASSUMPTIONS.md`).
