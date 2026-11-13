// src/types/index.ts - Core Frontend Types
export type UserRole =
  | 'centre_owner'
  | 'centre_admin'
  | 'teacher'
  | 'student'
  | 'parent_guardian'
  | 'accountant';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
}

export interface Centre {
  id: string;
  name: string;
  code: string;
  timezone: string;
  currency: string;
  locale: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface Student {
  id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  grade_level: string;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'graduated' | 'withdrawn';
  batch_count?: number;
  batch_names?: string;
}

export interface Guardian {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  is_primary?: number;
}

export interface Batch {
  id: string;
  name: string;
  grade_level: string;
  subject_name: string;
  capacity: number;
  enrolled_count: number;
  room_or_link?: string;
  status: 'active' | 'archived' | 'completed';
  teacher_names?: string;
}

export interface TimetableRule {
  id: string;
  batch_id: string;
  batch_name?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  period_label: string;
  room?: string;
  teacher_names?: string;
}

export interface AttendanceRecord {
  id?: string;
  student_id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  grade_level: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
  edit_reason?: string;
}

export interface AttendanceSession {
  id: string;
  centre_id: string;
  batch_id: string;
  date: string;
  period: string;
  taken_at: string;
  notes?: string;
}

export interface Homework {
  id: string;
  batch_id: string;
  batch_name?: string;
  subject_name?: string;
  teacher_name?: string;
  title: string;
  instructions: string;
  assigned_date: string;
  due_date: string;
  max_points: number;
  submission_mode: 'text' | 'file' | 'both';
  attachment_url?: string;
  submission_count?: number;
  total_students?: number;
  mySubmission?: Submission | null;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  submitted_at: string;
  text_content?: string;
  file_url?: string;
  status: 'submitted' | 'graded' | 'resubmission_requested';
  score?: number;
  feedback?: string;
  first_name?: string;
  last_name?: string;
  admission_no?: string;
}

export interface Assessment {
  id: string;
  batch_id: string;
  batch_name?: string;
  subject_name?: string;
  title: string;
  assessment_date: string;
  max_marks: number;
  passing_marks: number;
  instructions?: string;
  average_score?: number;
  graded_students_count?: number;
  myScore?: {
    marks_obtained: number | null;
    is_absent: number;
    is_exempt: number;
    teacher_comments?: string;
  } | null;
}

export interface AssessmentScore {
  student_id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  marks_obtained: number | null;
  is_absent: boolean;
  is_exempt: boolean;
  teacher_comments?: string;
}

export interface FeeHead {
  id: string;
  name: string;
  is_recurring: number;
  default_amount_cents: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  student_id: string;
  first_name?: string;
  last_name?: string;
  admission_no?: string;
  grade_level?: string;
  issue_date: string;
  due_date: string;
  subtotal_cents: number;
  discount_cents: number;
  discount_reason?: string;
  total_cents: number;
  paid_cents: number;
  balance_cents: number;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
}

export interface Receipt {
  id: string;
  receipt_number: string;
  issued_at: string;
  amount_cents: number;
  payment_date: string;
  payment_mode: string;
  reference_note?: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  grade_level: string;
  invoice_number: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  audience_type: 'all_centre' | 'batch' | 'individual';
  publisher_name: string;
  batch_name?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  category: string;
  is_read: number;
  action_url?: string;
  created_at: string;
}
