# CoachingOS — Data Dictionary & Schema Specification

**Engine:** SQLite 3 / Cloudflare D1  
**Convention:** All IDs use prefixed cryptographically random hex/nanoid strings (e.g. `ctr_...`, `stu_...`, `att_...`). All monetary amounts are non-negative integer minor units (paise / cents). All timestamps are ISO 8601 UTC strings.

---

## 1. Core Tenancy & Identity

### `centres`
- `id` TEXT PRIMARY KEY (e.g. `ctr_abc123`)
- `name` TEXT NOT NULL
- `code` TEXT NOT NULL UNIQUE (short slug)
- `timezone` TEXT NOT NULL DEFAULT 'Asia/Kolkata'
- `currency` TEXT NOT NULL DEFAULT 'INR'
- `locale` TEXT NOT NULL DEFAULT 'en-IN'
- `phone` TEXT
- `email` TEXT
- `address` TEXT
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

### `users`
- `id` TEXT PRIMARY KEY (e.g. `usr_xyz789`)
- `email` TEXT NOT NULL UNIQUE
- `name` TEXT NOT NULL
- `phone` TEXT
- `password_hash` TEXT NOT NULL
- `avatar_url` TEXT
- `is_system_admin` INTEGER NOT NULL DEFAULT 0
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

### `memberships`
- `id` TEXT PRIMARY KEY (e.g. `mbr_001`)
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `user_id` TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `role` TEXT NOT NULL CHECK(role IN ('centre_owner', 'centre_admin', 'teacher', 'student', 'parent_guardian', 'accountant'))
- `status` TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'invited', 'suspended'))
- `created_at` TEXT NOT NULL
- UNIQUE(centre_id, user_id)

### `invitations`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `email` TEXT NOT NULL
- `role` TEXT NOT NULL
- `token` TEXT NOT NULL UNIQUE
- `expires_at` TEXT NOT NULL
- `accepted_at` TEXT
- `created_by` TEXT REFERENCES users(id)
- `created_at` TEXT NOT NULL

---

## 2. Academic & Course Structure

### `academic_sessions`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `name` TEXT NOT NULL (e.g. "2026-2027")
- `start_date` TEXT NOT NULL
- `end_date` TEXT NOT NULL
- `is_current` INTEGER NOT NULL DEFAULT 0
- `created_at` TEXT NOT NULL

### `subjects`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `name` TEXT NOT NULL (e.g. "Mathematics", "Physics")
- `code` TEXT
- `created_at` TEXT NOT NULL
- UNIQUE(centre_id, name)

### `batches`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `academic_session_id` TEXT REFERENCES academic_sessions(id)
- `name` TEXT NOT NULL (e.g. "Class 10 CBSE Math Morning")
- `grade_level` TEXT NOT NULL (e.g. "Grade 10")
- `subject_id` TEXT NOT NULL REFERENCES subjects(id)
- `capacity` INTEGER NOT NULL DEFAULT 30
- `room_or_link` TEXT
- `status` TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'completed'))
- `created_at` TEXT NOT NULL

### `batch_teachers`
- `id` TEXT PRIMARY KEY
- `batch_id` TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE
- `teacher_user_id` TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `is_primary` INTEGER NOT NULL DEFAULT 1
- `created_at` TEXT NOT NULL
- UNIQUE(batch_id, teacher_user_id)

---

## 3. Students, Guardians & Enrollments

### `students`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `admission_no` TEXT NOT NULL
- `first_name` TEXT NOT NULL
- `last_name` TEXT NOT NULL
- `user_id` TEXT REFERENCES users(id)
- `date_of_birth` TEXT
- `gender` TEXT
- `grade_level` TEXT NOT NULL
- `enrollment_date` TEXT NOT NULL
- `status` TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'graduated', 'withdrawn'))
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL
- UNIQUE(centre_id, admission_no)

### `guardians`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `user_id` TEXT REFERENCES users(id)
- `name` TEXT NOT NULL
- `relationship` TEXT NOT NULL (e.g. "Father", "Mother", "Guardian")
- `phone` TEXT NOT NULL
- `email` TEXT
- `address` TEXT
- `created_at` TEXT NOT NULL

### `student_guardians`
- `id` TEXT PRIMARY KEY
- `student_id` TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE
- `guardian_id` TEXT NOT NULL REFERENCES guardians(id) ON DELETE CASCADE
- `is_primary` INTEGER NOT NULL DEFAULT 1
- `created_at` TEXT NOT NULL
- UNIQUE(student_id, guardian_id)

### `enrollments`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `batch_id` TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE
- `student_id` TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE
- `enrolled_at` TEXT NOT NULL
- `status` TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'dropped', 'completed'))
- UNIQUE(batch_id, student_id)

---

## 4. Timetable & Schedule

### `timetable_rules`
- `id` TEXT PRIMARY KEY
- `batch_id` TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE
- `day_of_week` INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6)
- `start_time` TEXT NOT NULL (e.g. "09:00")
- `end_time` TEXT NOT NULL (e.g. "10:30")
- `period_label` TEXT NOT NULL DEFAULT 'Period 1'
- `room` TEXT
- `created_at` TEXT NOT NULL

### `timetable_exceptions`
- `id` TEXT PRIMARY KEY
- `batch_id` TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE
- `exception_date` TEXT NOT NULL
- `action` TEXT NOT NULL CHECK(action IN ('cancelled', 'rescheduled', 'extra_class'))
- `new_start_time` TEXT
- `new_end_time` TEXT
- `reason` TEXT
- `created_at` TEXT NOT NULL

---

## 5. Attendance Domain

### `attendance_sessions`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `batch_id` TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE
- `date` TEXT NOT NULL (YYYY-MM-DD)
- `period` TEXT NOT NULL DEFAULT 'Period 1'
- `taken_by_user_id` TEXT NOT NULL REFERENCES users(id)
- `taken_at` TEXT NOT NULL
- `notes` TEXT
- UNIQUE(centre_id, batch_id, date, period)

### `attendance_records`
- `id` TEXT PRIMARY KEY
- `session_id` TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE
- `student_id` TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE
- `status` TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused'))
- `remarks` TEXT
- `last_edited_by` TEXT REFERENCES users(id)
- `last_edited_at` TEXT
- `edit_reason` TEXT
- UNIQUE(session_id, student_id)

---

## 6. Homework & Submissions

### `assignments`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `batch_id` TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE
- `teacher_user_id` TEXT NOT NULL REFERENCES users(id)
- `title` TEXT NOT NULL
- `instructions` TEXT NOT NULL
- `subject_id` TEXT REFERENCES subjects(id)
- `assigned_date` TEXT NOT NULL
- `due_date` TEXT NOT NULL
- `max_points` INTEGER NOT NULL DEFAULT 100
- `submission_mode` TEXT NOT NULL DEFAULT 'both' CHECK(submission_mode IN ('text', 'file', 'both'))
- `attachment_url` TEXT
- `created_at` TEXT NOT NULL

### `submissions`
- `id` TEXT PRIMARY KEY
- `assignment_id` TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE
- `student_id` TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE
- `submitted_at` TEXT NOT NULL
- `text_content` TEXT
- `file_url` TEXT
- `status` TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted', 'graded', 'resubmission_requested'))
- `score` INTEGER CHECK(score IS NULL OR (score >= 0))
- `feedback` TEXT
- `graded_by` TEXT REFERENCES users(id)
- `graded_at` TEXT
- UNIQUE(assignment_id, student_id)

---

## 7. Assessments & Learning Progress

### `assessments`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `batch_id` TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE
- `title` TEXT NOT NULL
- `subject_id` TEXT REFERENCES subjects(id)
- `assessment_date` TEXT NOT NULL
- `max_marks` INTEGER NOT NULL CHECK(max_marks > 0)
- `passing_marks` INTEGER NOT NULL CHECK(passing_marks >= 0 AND passing_marks <= max_marks)
- `instructions` TEXT
- `created_at` TEXT NOT NULL

### `assessment_scores`
- `id` TEXT PRIMARY KEY
- `assessment_id` TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE
- `student_id` TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE
- `marks_obtained` INTEGER CHECK(marks_obtained IS NULL OR (marks_obtained >= 0))
- `is_absent` INTEGER NOT NULL DEFAULT 0
- `is_exempt` INTEGER NOT NULL DEFAULT 0
- `teacher_comments` TEXT
- `recorded_by` TEXT REFERENCES users(id)
- `recorded_at` TEXT NOT NULL
- UNIQUE(assessment_id, student_id)

---

## 8. Fees, Invoices & Payment Ledger (Decimal-Safe)

### `fee_heads`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `name` TEXT NOT NULL (e.g. "Monthly Tuition", "Study Material", "Annual Exam Fee")
- `is_recurring` INTEGER NOT NULL DEFAULT 0
- `default_amount_cents` INTEGER NOT NULL DEFAULT 0 CHECK(default_amount_cents >= 0)
- `created_at` TEXT NOT NULL
- UNIQUE(centre_id, name)

### `invoices`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `invoice_number` TEXT NOT NULL (e.g. "INV-2026-0001")
- `student_id` TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE
- `issue_date` TEXT NOT NULL
- `due_date` TEXT NOT NULL
- `subtotal_cents` INTEGER NOT NULL CHECK(subtotal_cents >= 0)
- `discount_cents` INTEGER NOT NULL DEFAULT 0 CHECK(discount_cents >= 0)
- `discount_reason` TEXT
- `total_cents` INTEGER NOT NULL CHECK(total_cents >= 0)
- `paid_cents` INTEGER NOT NULL DEFAULT 0 CHECK(paid_cents >= 0)
- `status` TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'partially_paid', 'paid', 'cancelled'))
- `created_at` TEXT NOT NULL
- UNIQUE(centre_id, invoice_number)

### `invoice_items`
- `id` TEXT PRIMARY KEY
- `invoice_id` TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE
- `fee_head_id` TEXT REFERENCES fee_heads(id)
- `description` TEXT NOT NULL
- `amount_cents` INTEGER NOT NULL CHECK(amount_cents >= 0)

### `payment_entries`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `invoice_id` TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE
- `student_id` TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE
- `payment_date` TEXT NOT NULL
- `amount_cents` INTEGER NOT NULL CHECK(amount_cents > 0)
- `payment_mode` TEXT NOT NULL CHECK(payment_mode IN ('cash', 'upi_ref', 'bank_transfer', 'cheque', 'external_card'))
- `reference_note` TEXT
- `recorded_by_user_id` TEXT NOT NULL REFERENCES users(id)
- `created_at` TEXT NOT NULL

### `receipts`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `receipt_number` TEXT NOT NULL (e.g. "RCP-2026-0001")
- `payment_entry_id` TEXT NOT NULL REFERENCES payment_entries(id) ON DELETE CASCADE
- `student_id` TEXT NOT NULL REFERENCES students(id)
- `issued_at` TEXT NOT NULL
- UNIQUE(centre_id, receipt_number)

---

## 9. Notices, In-App Alerts & Audit Trails

### `notices`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `title` TEXT NOT NULL
- `content` TEXT NOT NULL
- `priority` TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal', 'important', 'urgent'))
- `audience_type` TEXT NOT NULL CHECK(audience_type IN ('all_centre', 'batch', 'individual'))
- `batch_id` TEXT REFERENCES batches(id)
- `student_id` TEXT REFERENCES students(id)
- `published_by_user_id` TEXT NOT NULL REFERENCES users(id)
- `expires_at` TEXT
- `created_at` TEXT NOT NULL

### `notifications`
- `id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `title` TEXT NOT NULL
- `message` TEXT NOT NULL
- `category` TEXT NOT NULL DEFAULT 'general' CHECK(category IN ('general', 'attendance', 'homework', 'assessment', 'fee', 'notice'))
- `is_read` INTEGER NOT NULL DEFAULT 0
- `action_url` TEXT
- `created_at` TEXT NOT NULL

### `audit_events`
- `id` TEXT PRIMARY KEY
- `centre_id` TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE
- `actor_user_id` TEXT NOT NULL REFERENCES users(id)
- `event_type` TEXT NOT NULL (e.g. "attendance.corrected", "marks.updated", "payment.recorded", "student.deleted", "guardian.unlinked")
- `entity_type` TEXT NOT NULL
- `entity_id` TEXT NOT NULL
- `old_values_json` TEXT
- `new_values_json` TEXT
- `reason` TEXT
- `ip_address` TEXT
- `user_agent` TEXT
- `created_at` TEXT NOT NULL
