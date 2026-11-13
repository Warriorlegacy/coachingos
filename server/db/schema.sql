-- CoachingOS SQLite / Cloudflare D1 Schema
-- Production Relational Model

PRAGMA foreign_keys = ON;

-- 1. Centres & Identity
CREATE TABLE IF NOT EXISTS centres (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    currency TEXT NOT NULL DEFAULT 'INR',
    locale TEXT NOT NULL DEFAULT 'en-IN',
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    is_system_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('centre_owner', 'centre_admin', 'teacher', 'student', 'parent_guardian', 'accountant')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'invited', 'suspended')),
    created_at TEXT NOT NULL,
    UNIQUE(centre_id, user_id)
);

CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    accepted_at TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL
);

-- 2. Academic Sessions & Subjects
CREATE TABLE IF NOT EXISTS academic_sessions (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_current INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(centre_id, name)
);

CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    academic_session_id TEXT REFERENCES academic_sessions(id),
    name TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    subject_id TEXT NOT NULL REFERENCES subjects(id),
    capacity INTEGER NOT NULL DEFAULT 30,
    room_or_link TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'completed')),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS batch_teachers (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    teacher_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_primary INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    UNIQUE(batch_id, teacher_user_id)
);

-- 3. Students, Guardians & Enrollments
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    admission_no TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    user_id TEXT REFERENCES users(id),
    date_of_birth TEXT,
    gender TEXT,
    grade_level TEXT NOT NULL,
    enrollment_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'graduated', 'withdrawn')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(centre_id, admission_no)
);

CREATE TABLE IF NOT EXISTS guardians (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_guardians (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    guardian_id TEXT NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    is_primary INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    UNIQUE(student_id, guardian_id)
);

CREATE TABLE IF NOT EXISTS enrollments (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrolled_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'dropped', 'completed')),
    UNIQUE(batch_id, student_id)
);

-- 4. Timetable Rules & Exceptions
CREATE TABLE IF NOT EXISTS timetable_rules (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    period_label TEXT NOT NULL DEFAULT 'Period 1',
    room TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timetable_exceptions (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    exception_date TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('cancelled', 'rescheduled', 'extra_class')),
    new_start_time TEXT,
    new_end_time TEXT,
    reason TEXT,
    created_at TEXT NOT NULL
);

-- 5. Attendance Domain
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    period TEXT NOT NULL DEFAULT 'Period 1',
    taken_by_user_id TEXT NOT NULL REFERENCES users(id),
    taken_at TEXT NOT NULL,
    notes TEXT,
    UNIQUE(centre_id, batch_id, date, period)
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
    remarks TEXT,
    last_edited_by TEXT REFERENCES users(id),
    last_edited_at TEXT,
    edit_reason TEXT,
    UNIQUE(session_id, student_id)
);

-- 6. Homework & Submissions
CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    teacher_user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    instructions TEXT NOT NULL,
    subject_id TEXT REFERENCES subjects(id),
    assigned_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    max_points INTEGER NOT NULL DEFAULT 100,
    submission_mode TEXT NOT NULL DEFAULT 'both' CHECK(submission_mode IN ('text', 'file', 'both')),
    attachment_url TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    submitted_at TEXT NOT NULL,
    text_content TEXT,
    file_url TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted', 'graded', 'resubmission_requested')),
    score INTEGER CHECK(score IS NULL OR (score >= 0)),
    feedback TEXT,
    graded_by TEXT REFERENCES users(id),
    graded_at TEXT,
    UNIQUE(assignment_id, student_id)
);

-- 7. Assessments & Learning Progress
CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject_id TEXT REFERENCES subjects(id),
    assessment_date TEXT NOT NULL,
    max_marks INTEGER NOT NULL CHECK(max_marks > 0),
    passing_marks INTEGER NOT NULL CHECK(passing_marks >= 0 AND passing_marks <= max_marks),
    instructions TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_scores (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    marks_obtained INTEGER CHECK(marks_obtained IS NULL OR (marks_obtained >= 0)),
    is_absent INTEGER NOT NULL DEFAULT 0,
    is_exempt INTEGER NOT NULL DEFAULT 0,
    teacher_comments TEXT,
    recorded_by TEXT REFERENCES users(id),
    recorded_at TEXT NOT NULL,
    UNIQUE(assessment_id, student_id)
);

-- 8. Fees, Invoices & Payment Ledger
CREATE TABLE IF NOT EXISTS fee_heads (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    default_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK(default_amount_cents >= 0),
    created_at TEXT NOT NULL,
    UNIQUE(centre_id, name)
);

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    issue_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    subtotal_cents INTEGER NOT NULL CHECK(subtotal_cents >= 0),
    discount_cents INTEGER NOT NULL DEFAULT 0 CHECK(discount_cents >= 0),
    discount_reason TEXT,
    total_cents INTEGER NOT NULL CHECK(total_cents >= 0),
    paid_cents INTEGER NOT NULL DEFAULT 0 CHECK(paid_cents >= 0),
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'partially_paid', 'paid', 'cancelled')),
    created_at TEXT NOT NULL,
    UNIQUE(centre_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    fee_head_id TEXT REFERENCES fee_heads(id),
    description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0)
);

CREATE TABLE IF NOT EXISTS payment_entries (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    payment_date TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
    payment_mode TEXT NOT NULL CHECK(payment_mode IN ('cash', 'upi_ref', 'bank_transfer', 'cheque', 'external_card')),
    reference_note TEXT,
    recorded_by_user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL,
    payment_entry_id TEXT NOT NULL REFERENCES payment_entries(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(id),
    issued_at TEXT NOT NULL,
    UNIQUE(centre_id, receipt_number)
);

-- 9. Notices, Notifications & Audit Trails
CREATE TABLE IF NOT EXISTS notices (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal', 'important', 'urgent')),
    audience_type TEXT NOT NULL CHECK(audience_type IN ('all_centre', 'batch', 'individual')),
    batch_id TEXT REFERENCES batches(id),
    student_id TEXT REFERENCES students(id),
    published_by_user_id TEXT NOT NULL REFERENCES users(id),
    expires_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK(category IN ('general', 'attendance', 'homework', 'assessment', 'fee', 'notice')),
    is_read INTEGER NOT NULL DEFAULT 0,
    action_url TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    actor_user_id TEXT NOT NULL REFERENCES users(id),
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    old_values_json TEXT,
    new_values_json TEXT,
    reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_retention_rules (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    retention_years INTEGER NOT NULL DEFAULT 5,
    auto_archive_graduated INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- Indexes for performance & query scaling
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_centre ON memberships(centre_id);
CREATE INDEX IF NOT EXISTS idx_students_centre ON students(centre_id, status);
CREATE INDEX IF NOT EXISTS idx_batches_centre ON batches(centre_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_batch ON enrollments(batch_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_guardian ON student_guardians(guardian_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_lookup ON attendance_sessions(centre_id, batch_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_batch ON assignments(batch_id, due_date);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assessments_batch ON assessments(batch_id, assessment_date);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_student ON assessment_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(centre_id, due_date);
CREATE INDEX IF NOT EXISTS idx_payment_entries_invoice ON payment_entries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_notices_centre ON notices(centre_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_events_lookup ON audit_events(centre_id, event_type, created_at);
