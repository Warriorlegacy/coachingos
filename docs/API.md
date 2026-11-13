# CoachingOS — API Specification & Route Reference

**Base Path:** `/api/v1`  
**Authentication:** Signed HTTP-only session cookie `coachingos_session` + CSRF header `x-csrf-token` on mutating requests (`POST`, `PUT`, `DELETE`, `PATCH`).  
**Error Conventions:** Standard JSON response `{ error: string, code: string, details?: any }`.  
**Success Conventions:** JSON `{ data: any, meta?: any }` or resource object directly.

---

## 1. Authentication & Session

- `POST /api/v1/auth/login`
  - Body: `{ email: string, password: string }`
  - Response 200: `{ user: UserProfile, activeCentre: CentreProfile, role: string, csrfToken: string }`
  - Sets: `coachingos_session` HTTP-only cookie.
- `POST /api/v1/auth/demo-login` (Available when `ALLOW_DEMO=true`)
  - Body: `{ role: "centre_owner" | "centre_admin" | "teacher" | "student" | "parent_guardian" | "accountant" }`
  - Response 200: Sets session for corresponding synthetic persona.
- `POST /api/v1/auth/logout`
  - Response 200: Clears session cookie.
- `GET /api/v1/auth/me`
  - Response 200: Returns authenticated user profile, active centre, memberships, CSRF token.
- `POST /api/v1/auth/switch-centre`
  - Body: `{ centreId: string }`
  - Response 200: Switches active centre context in session.

---

## 2. Centre & Setup

- `GET /api/v1/centre`
  - Response: Centre details, academic sessions, subjects, grades.
- `PUT /api/v1/centre` (Role: `centre_owner`, `centre_admin`)
  - Body: `{ name, phone, email, address, timezone, currency, locale }`
- `GET /api/v1/centre/staff` (Role: `centre_owner`, `centre_admin`)
  - Response: List of staff members, roles, assigned batches.
- `POST /api/v1/centre/staff/invite` (Role: `centre_owner`, `centre_admin`)
  - Body: `{ email, role, batchIds?: string[] }`
- `POST /api/v1/centre/seed-demo` (Role: `centre_owner`)
  - Populates sample realistic centre data (classes, students, attendance, homework, exams, invoices).

---

## 3. Students & Guardians

- `GET /api/v1/students`
  - Query: `batchId?: string, search?: string, grade?: string, status?: string`
  - Response: Array of students, linked batches, guardians.
- `POST /api/v1/students` (Role: `centre_owner`, `centre_admin`)
  - Body: `{ admissionNo, firstName, lastName, gradeLevel, enrollmentDate, guardian?: { name, phone, email, relationship } }`
- `GET /api/v1/students/:id`
  - Response: Full profile, attendance rate, enrolled batches, invoices, test scores.
- `PUT /api/v1/students/:id` (Role: `centre_owner`, `centre_admin`)
- `DELETE /api/v1/students/:id` (Role: `centre_owner`)
  - Requires explicit confirmation reason; logged in audit log.
- `POST /api/v1/students/import-csv` (Role: `centre_owner`, `centre_admin`)
  - Body: `{ csvContent: string, dryRun?: boolean }`
  - Response: `{ totalRows, validRows, duplicates, errors: RowError[], importedCount }`
- `GET /api/v1/students/export` (Role: `centre_owner`, `centre_admin`)
  - Response: `text/csv` stream with sanitized columns.
- `POST /api/v1/students/:id/guardians` (Role: `centre_owner`, `centre_admin`)
  - Body: `{ name, relationship, phone, email, isPrimary }`
- `DELETE /api/v1/students/:id/guardians/:guardianId` (Role: `centre_owner`, `centre_admin`)
  - Unlinks guardian with mandatory audit logging.

---

## 4. Batches & Timetable

- `GET /api/v1/batches`
  - Response: Batches filtered by role (teachers see only assigned batches; admins see all).
- `POST /api/v1/batches` (Role: `centre_owner`, `centre_admin`)
  - Body: `{ name, gradeLevel, subjectId, teacherUserIds: string[], capacity, roomOrLink }`
- `GET /api/v1/batches/:id`
  - Response: Batch details, enrolled students, assigned teachers, timetable rules.
- `PUT /api/v1/batches/:id`
- `POST /api/v1/batches/:id/enroll` (Role: `centre_owner`, `centre_admin`)
  - Body: `{ studentIds: string[] }`
- `POST /api/v1/batches/:id/unenroll` (Role: `centre_owner`, `centre_admin`)
  - Body: `{ studentId: string }`
- `GET /api/v1/timetable`
  - Query: `batchId?: string, teacherId?: string`
  - Response: Timetable rules and upcoming calendar schedule with conflict detection indicators.
- `POST /api/v1/timetable/rules` (Role: `centre_owner`, `centre_admin`)
  - Body: `{ batchId, dayOfWeek, startTime, endTime, periodLabel, room }`
  - Validates: Teacher/room conflicts.

---

## 5. Attendance

- `GET /api/v1/attendance/session`
  - Query: `batchId: string, date: string, period?: string`
  - Response: Existing attendance session and records, or template roster for taking attendance.
- `POST /api/v1/attendance/submit` (Role: `centre_owner`, `centre_admin`, `teacher`)
  - Body: `{ batchId: string, date: string, period?: string, records: { studentId: string, status: 'present'|'absent'|'late'|'excused', remarks?: string }[], notes?: string }`
  - Enforces: Teacher assignment check, unique `(centre_id, batch_id, date, period)`.
- `PUT /api/v1/attendance/records/:recordId` (Role: `centre_owner`, `centre_admin`, `teacher`)
  - Body: `{ status: string, remarks?: string, editReason: string }`
  - Action: Updates record and logs before/after diff to `audit_events`.
- `POST /api/v1/attendance/sync-offline` (Offline PWA Queue)
  - Body: `{ sessions: QueuedAttendanceSession[] }`
  - Response: `{ synced: number, conflicts: ConflictReport[] }`
- `GET /api/v1/attendance/student/:studentId` (Role: Owner, Admin, Teacher, Student self, Linked Guardian)
  - Response: Detailed attendance percentage, breakdown, calendar history.

---

## 6. Homework & Submissions

- `GET /api/v1/homework`
  - Query: `batchId?: string, status?: string`
- `POST /api/v1/homework` (Role: `centre_owner`, `centre_admin`, `teacher`)
  - Body: `{ batchId, title, instructions, subjectId, assignedDate, dueDate, maxPoints, submissionMode, attachmentUrl? }`
- `GET /api/v1/homework/:id`
  - Response: Assignment metadata, submission stats, submissions list (for teacher/admin) or student's own submission.
- `POST /api/v1/homework/:id/submit` (Role: `student`)
  - Body: `{ textContent?: string, fileUrl?: string }`
- `POST /api/v1/homework/:id/grade` (Role: `teacher`, `centre_admin`, `centre_owner`)
  - Body: `{ submissionId: string, score: number, feedback: string, status: 'graded' | 'resubmission_requested' }`

---

## 7. Assessments & Learning Progress

- `GET /api/v1/assessments`
  - Query: `batchId?: string`
- `POST /api/v1/assessments` (Role: `centre_owner`, `centre_admin`, `teacher`)
  - Body: `{ batchId, title, subjectId, assessmentDate, maxMarks, passingMarks, instructions? }`
- `GET /api/v1/assessments/:id`
  - Response: Assessment details, scores list, class average, pass percentage.
- `POST /api/v1/assessments/:id/scores` (Role: `teacher`, `centre_admin`, `centre_owner`)
  - Body: `{ scores: { studentId: string, marksObtained: number | null, isAbsent: boolean, isExempt: boolean, teacherComments?: string }[] }`
  - Validates: `0 <= marksObtained <= maxMarks`.
- `GET /api/v1/reports/student/:studentId` (Role: Owner, Admin, Teacher, Student self, Linked Guardian)
  - Response: Holistic report card (attendance %, assignment completion %, assessment performance trajectory).

---

## 8. Fees, Invoices & Payment Ledger

- `GET /api/v1/fees/heads`
- `POST /api/v1/fees/heads` (Role: `centre_owner`, `centre_admin`, `accountant`)
- `GET /api/v1/fees/invoices`
  - Query: `studentId?: string, status?: string`
- `POST /api/v1/fees/invoices` (Role: `centre_owner`, `centre_admin`, `accountant`)
  - Body: `{ studentId, dueDate, items: { feeHeadId?, description, amountCents }[], discountCents?: number, discountReason?: string }`
- `POST /api/v1/fees/payments` (Role: `centre_owner`, `centre_admin`, `accountant`)
  - Body: `{ invoiceId: string, amountCents: number, paymentMode: 'cash'|'upi_ref'|'bank_transfer'|'cheque'|'external_card', referenceNote?: string, paymentDate: string }`
  - Action: Credits invoice, recalculates balance, issues receipt.
- `GET /api/v1/fees/receipts/:id`
  - Response: Printable receipt details with student and centre header.

---

## 9. Notices & Alerts

- `GET /api/v1/notices`
  - Response: Notices visible to authenticated user's role and enrolled batches.
- `POST /api/v1/notices` (Role: `centre_owner`, `centre_admin`, `teacher`)
  - Body: `{ title, content, priority, audienceType, batchId?, studentId?, expiresAt? }`
- `GET /api/v1/notifications`
  - Response: User's in-app notification inbox.
- `POST /api/v1/notifications/:id/read`

---

## 10. AI Pedagogical Assistant

- `POST /api/v1/ai/lesson-plan`
  - Body: `{ subject: string, topic: string, gradeLevel: string, durationMinutes: number }`
- `POST /api/v1/ai/progress-summary`
  - Body: `{ studentId: string }`
  - Generates: Grounded summary derived strictly from student's real DB records.
- `POST /api/v1/ai/fee-reminder`
  - Body: `{ invoiceId: string }`
  - Generates: Professional reminder template with student name and balance.
