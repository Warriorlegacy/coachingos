# CoachingOS — Product Requirements Document (PRD)

**Product:** CoachingOS  
**Version:** 1.0.0  
**Target Date:** November 2026  
**Audience:** Independent tutors, group educators, coaching institutes, tuition academies  

---

## 1. Executive Summary & Vision

CoachingOS is a mobile-first, multi-role operating system engineered specifically for independent tutors and small-to-medium coaching centres (20–500 active students). Unlike generic enterprise school ERPs bloated with bureaucratic overhead, CoachingOS solves the exact high-frequency daily pain points of private coaching:
1. Fast, frictionless attendance tracking in under 15 seconds per batch with audit logging.
2. Structured homework assignment, text/file submissions, and fast rubric-based grading.
3. Continuous assessment recording, subject-level mastery metrics, and child progress reports without toxic public class rankings.
4. Decimal-safe fee tracking with itemized fee heads, manual payment recording (Cash, UPI, Bank Transfer), receipts, and overdue balance reconciliation.
5. Role-isolated communication: centre notices, in-app notification center, and guardian/student access.
6. Local-first PWA architecture with offline queueing for spotty classroom connectivity.

---

## 2. Target Persona & Buyer Profile

- **Primary Persona:** Coach / Centre Director (e.g. "Ramesh Sharma", runs "Apex Science Tutorials", 180 students across grades 9–12, 4 teachers, 8 batches).
  - Needs: Streamlined fee collection status, teacher workload visibility, student attendance rates, low operational overhead.
- **Secondary Persona:** Batch Teacher (e.g. "Priya Rao", teaches 10th Grade Mathematics).
  - Needs: Fast attendance taking on phone, clear homework submission list, fast score entry for weekly tests.
- **Consumer Personas:**
  - **Student:** Wants simple schedule, pending homework deadlines, score history, and notices.
  - **Parent / Guardian:** Wants transparent visibility into child's attendance, due dates, test performance, and verified payment receipts without calling the tutor every week.
  - **Accountant:** Needs fee ledger, invoice creation, payment recording, and balance reconciliation without clutter from academic data.

---

## 3. User Roles & Access Boundaries

| Role | Scope | Permitted Actions | Prohibited Actions |
|---|---|---|---|
| `centre_owner` | Full Centre | Centre configuration, staff invites, batch setups, fee policies, student/guardian management, data export/deletion | Cross-centre access |
| `centre_admin` | Full Centre | Batch schedules, student enrollment, fee collection, attendance oversight, notices | Deleting centre, altering owner |
| `teacher` | Assigned Batches | Take attendance, assign homework, review submissions, record marks | View unassigned batches, view student fee records |
| `student` | Self Only | View timetable, submit homework, view graded feedback, view personal marks, view notices | Access other students, access guardian notes |
| `parent_guardian` | Linked Children Only | View child attendance, child homework, child report card, child invoices/receipts, submit absence notes | Access unlinked students, modify academic records |
| `accountant` | Fee Workflows | Create invoices, record payments, issue receipts, view balances | View test marks, edit attendance, change batch teachers |
| `platform_operator`| Global | System health, tenant audit, migration checks | Modifying centre private records without cause |

---

## 4. Key Workflows & Functional Requirements

### 4.1 Centre Onboarding & Configuration
- Set Centre Name, Code, Address, Contact Email/Phone.
- Set Timezone (default `Asia/Kolkata`), Currency (`INR`, symbol `₹`), Academic Session (e.g., `2026-2027`).
- Define Subjects, Grades, and Working Days.
- One-click sample demo generator for instant trial and evaluation.

### 4.2 Student & Guardian Management
- Student records: Admission number (unique per centre), First/Last Name, Grade/Class, Date of Joining, Status (`active`, `inactive`, `graduated`).
- Guardian records: Name, Relationship (`Father`, `Mother`, `Guardian`), Phone, Email.
- Many-to-many relationship (`student_guardians`): A guardian can have multiple enrolled siblings; a student can have multiple authorized guardians.
- Bulk CSV Import: Dry-run preview, header mapping, duplicate admission number validation, row-by-row error reporting.
- Export student roster with sanitized fields.

### 4.3 Batches, Timetable & Conflict Detection
- Batches: Grade, Name, Subject, Assigned Teacher, Max Capacity, Meeting Link / Classroom Room.
- Timetable Rules: Day of week, Start time, End time.
- Conflict Engine: Detects when a teacher is double-booked or a room is assigned twice at overlapping times.
- Exceptions: Holidays and rescheduled periods.

### 4.4 Classroom Attendance (PWA-Optimized)
- Unique Session Identification: `centre_id + batch_id + date + period`.
- Attendance States: `present`, `absent`, `late`, `excused`.
- Rapid classroom UX: One-tap "Mark All Present", tap to toggle status.
- Correction Audit: When a record is updated after submission, actor, old state, new state, and reason are permanently logged to `audit_events`.
- Offline Sync: Mobile PWA queues attendance offline in client storage; synchronizes with server upon reconnection, flagging conflicting concurrent edits.

### 4.5 Homework & Submissions
- Homework: Title, Description, Subject, Batch, Assigned Date, Due Date, Max Points, Submission Types (`text`, `file`, `both`).
- Submissions: Student submits text and/or file reference. Timestamp validated against due date.
- Review & Grading: Teacher grades score `[0, max_points]`, provides qualitative feedback, marks status (`submitted`, `graded`, `resubmission_requested`).

### 4.6 Assessments & Academic Progress
- Assessments: Title, Subject, Batch, Exam Date, Max Marks, Passing Marks.
- Score recording: Numeric validation `0 <= score <= max_marks`. Supports `absent` and `exempt` flags.
- Visual Progress: Batch score distribution, individual mastery trajectory over time, student progress report card. Strictly no public shaming leaderboards.

### 4.7 Decimal-Safe Fees, Invoicing & Receipts
- Fee Heads: Recurring tuition, exam fees, registration, lab, study materials.
- Invoicing: Student invoice generation, line items, due date, discount with recorded justification.
- Decimal-Safe Ledger: All monetary amounts stored as integer minor units (paise / cents). Absolutely zero floating-point arithmetic.
- Manual Payment Recording: Supports `cash`, `upi_ref`, `bank_transfer`, `cheque`, `external_card`. Requires reference number and recorded date.
- Explicit Legal Guardrail: Manual payment recording is strictly an administrative ledger entry, not a payment gateway processing action.
- Receipts: Immutable receipt generation (`RCP-2026-XXXX`) issued only from verified payment entries.

### 4.8 Notices & In-App Communication
- Target Audiences: `all_centre`, `specific_batch`, `individual`.
- In-app notification center for all authenticated roles.
- Email integration adapter: Supports Resend / Cloudflare Workers Email with strict quota limits; gracefully disabled when unconfigured.

### 4.9 AI Pedagogical Assistant
- AI Lesson Plan & Quiz Generator for teachers.
- AI Student Performance Summary drafter (strictly derived from recorded attendance and test metrics).
- AI Fee Reminder message formatter.
- Fallback heuristics ensure 100% functionality even when AI API keys are not supplied.

---

## 5. Non-Functional Requirements & Guardrails

- **Zero Vendor Lock-In**: Portable dual runtime (Node.js + SQLite / Cloudflare Workers + D1).
- **Security & Privacy**: Strict server-side tenancy enforcement. Minor privacy protection. OWASP top 10 compliance. Rate limiting and CSRF protection.
- **Performance**: Sub-100ms API response times. Lightweight frontend bundles (<120 kB gzipped).
- **Accessibility**: WCAG 2.1 AA compliant, screen-reader friendly, accessible keyboard navigation.
