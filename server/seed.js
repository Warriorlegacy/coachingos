// server/seed.js - Synthetic Demo Data for CoachingOS
import { hashPassword, generateId } from './crypto.js';

export function seedDemoData(db) {
  const existing = db.get("SELECT COUNT(*) AS count FROM centres");
  if (existing && existing.count > 0) {
    return; // Already seeded
  }

  const now = new Date().toISOString();
  const todayStr = now.slice(0, 10);
  const passwordHash = hashPassword('DemoPass123!');

  // 1. Centre
  const centreId = 'ctr_apex_01';
  db.run(
    `INSERT INTO centres (id, name, code, timezone, currency, locale, phone, email, address, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      centreId,
      'Apex Science & Commerce Academy',
      'apex-academy',
      'Asia/Kolkata',
      'INR',
      'en-IN',
      '+91 98765 43210',
      'info@apexacademy.edu',
      'Plot 42, Knowledge Park III, Greater Noida, UP, India',
      now,
      now
    ]
  );

  // 2. Users for all 6 roles
  const users = [
    { id: 'usr_owner_01', email: 'owner@coachingos.demo', name: 'Ramesh Sharma', role: 'centre_owner' },
    { id: 'usr_admin_01', email: 'admin@coachingos.demo', name: 'Anita Verma', role: 'centre_admin' },
    { id: 'usr_teacher_01', email: 'teacher@coachingos.demo', name: 'Vikram Sen', role: 'teacher' },
    { id: 'usr_student_01', email: 'student@coachingos.demo', name: 'Rohan Gupta', role: 'student' },
    { id: 'usr_parent_01', email: 'parent@coachingos.demo', name: 'Sunil Gupta', role: 'parent_guardian' },
    { id: 'usr_accountant_01', email: 'accountant@coachingos.demo', name: 'Deepak Patel', role: 'accountant' },
  ];

  for (const u of users) {
    db.run(
      `INSERT INTO users (id, email, name, phone, password_hash, avatar_url, is_system_admin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [u.id, u.email, u.name, '+91 98000 00000', passwordHash, null, now, now]
    );

    db.run(
      `INSERT INTO memberships (id, centre_id, user_id, role, status, created_at)
       VALUES (?, ?, ?, ?, 'active', ?)`,
      [`mbr_${u.id}`, centreId, u.id, u.role, now]
    );
  }

  // 3. Academic Session
  const sessionId = 'ses_2026_27';
  db.run(
    `INSERT INTO academic_sessions (id, centre_id, name, start_date, end_date, is_current, created_at)
     VALUES (?, ?, '2026-2027', '2026-04-01', '2027-03-31', 1, ?)`,
    [sessionId, centreId, now]
  );

  // 4. Subjects
  const subjects = [
    { id: 'sub_math', name: 'Mathematics', code: 'MATH' },
    { id: 'sub_phy', name: 'Physics', code: 'PHY' },
    { id: 'sub_chem', name: 'Chemistry', code: 'CHEM' },
    { id: 'sub_acc', name: 'Accountancy', code: 'ACC' },
  ];
  for (const s of subjects) {
    db.run(
      `INSERT INTO subjects (id, centre_id, name, code, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [s.id, centreId, s.name, s.code, now]
    );
  }

  // 5. Batches
  const batch1 = 'btc_math_10';
  const batch2 = 'btc_phy_12';
  db.run(
    `INSERT INTO batches (id, centre_id, academic_session_id, name, grade_level, subject_id, capacity, room_or_link, status, created_at)
     VALUES (?, ?, ?, 'Class 10 CBSE Mathematics', 'Grade 10', 'sub_math', 30, 'Room 101 / Hall A', 'active', ?)`,
    [batch1, centreId, sessionId, now]
  );
  db.run(
    `INSERT INTO batches (id, centre_id, academic_session_id, name, grade_level, subject_id, capacity, room_or_link, status, created_at)
     VALUES (?, ?, ?, 'Class 12 CBSE Physics', 'Grade 12', 'sub_phy', 25, 'Room 203 / Lab B', 'active', ?)`,
    [batch2, centreId, sessionId, now]
  );

  // Link teacher to batches
  db.run(`INSERT INTO batch_teachers (id, batch_id, teacher_user_id, is_primary, created_at) VALUES (?, ?, ?, 1, ?)`, ['bt_01', batch1, 'usr_teacher_01', now]);
  db.run(`INSERT INTO batch_teachers (id, batch_id, teacher_user_id, is_primary, created_at) VALUES (?, ?, ?, 1, ?)`, ['bt_02', batch2, 'usr_teacher_01', now]);

  // 6. Students
  const students = [
    { id: 'stu_01', adm: 'APEX-2026-001', first: 'Rohan', last: 'Gupta', grade: 'Grade 10', userId: 'usr_student_01' },
    { id: 'stu_02', adm: 'APEX-2026-002', first: 'Aarav', last: 'Mehra', grade: 'Grade 10', userId: null },
    { id: 'stu_03', adm: 'APEX-2026-003', first: 'Ananya', last: 'Sharma', grade: 'Grade 10', userId: null },
    { id: 'stu_04', adm: 'APEX-2026-004', first: 'Diya', last: 'Iyer', grade: 'Grade 10', userId: null },
    { id: 'stu_05', adm: 'APEX-2026-005', first: 'Kabir', last: 'Khan', grade: 'Grade 12', userId: null },
    { id: 'stu_06', adm: 'APEX-2026-006', first: 'Tanya', last: 'Joshi', grade: 'Grade 12', userId: null },
  ];

  for (const s of students) {
    db.run(
      `INSERT INTO students (id, centre_id, admission_no, first_name, last_name, user_id, date_of_birth, gender, grade_level, enrollment_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '2010-05-15', 'other', ?, '2026-04-05', 'active', ?, ?)`,
      [s.id, centreId, s.adm, s.first, s.last, s.userId, s.grade, now, now]
    );

    // Enroll students in batches
    if (s.grade === 'Grade 10') {
      db.run(
        `INSERT INTO enrollments (id, centre_id, batch_id, student_id, enrolled_at, status)
         VALUES (?, ?, ?, ?, '2026-04-05', 'active')`,
        [`enr_${s.id}_${batch1}`, centreId, batch1, s.id]
      );
    } else {
      db.run(
        `INSERT INTO enrollments (id, centre_id, batch_id, student_id, enrolled_at, status)
         VALUES (?, ?, ?, ?, '2026-04-05', 'active')`,
        [`enr_${s.id}_${batch2}`, centreId, batch2, s.id]
      );
    }
  }

  // 7. Guardians
  const guardianId = 'grd_01';
  db.run(
    `INSERT INTO guardians (id, centre_id, user_id, name, relationship, phone, email, address, created_at)
     VALUES (?, ?, 'usr_parent_01', 'Sunil Gupta', 'Father', '+91 98111 22233', 'parent@coachingos.demo', 'A-44, Sector 15, Noida', ?)`,
    [guardianId, centreId, now]
  );

  db.run(
    `INSERT INTO student_guardians (id, student_id, guardian_id, is_primary, created_at)
     VALUES (?, 'stu_01', ?, 1, ?)`,
    ['sg_01', guardianId, now]
  );

  // 8. Timetable Rules
  db.run(
    `INSERT INTO timetable_rules (id, batch_id, day_of_week, start_time, end_time, period_label, room, created_at)
     VALUES (?, ?, 1, '09:00', '10:30', 'Morning Session', 'Room 101', ?)`,
    ['ttr_01', batch1, now]
  );
  db.run(
    `INSERT INTO timetable_rules (id, batch_id, day_of_week, start_time, end_time, period_label, room, created_at)
     VALUES (?, ?, 3, '09:00', '10:30', 'Morning Session', 'Room 101', ?)`,
    ['ttr_02', batch1, now]
  );
  db.run(
    `INSERT INTO timetable_rules (id, batch_id, day_of_week, start_time, end_time, period_label, room, created_at)
     VALUES (?, ?, 5, '09:00', '10:30', 'Morning Session', 'Room 101', ?)`,
    ['ttr_03', batch1, now]
  );

  // 9. Attendance Session & Records
  const attSessionId = 'att_ses_01';
  db.run(
    `INSERT INTO attendance_sessions (id, centre_id, batch_id, date, period, taken_by_user_id, taken_at, notes)
     VALUES (?, ?, ?, ?, 'Period 1', 'usr_teacher_01', ?, 'Standard morning attendance')`,
    [attSessionId, centreId, batch1, todayStr, now]
  );

  db.run(`INSERT INTO attendance_records (id, session_id, student_id, status, remarks) VALUES (?, ?, 'stu_01', 'present', 'On time')`, ['rec_01', attSessionId]);
  db.run(`INSERT INTO attendance_records (id, session_id, student_id, status, remarks) VALUES (?, ?, 'stu_02', 'present', 'On time')`, ['rec_02', attSessionId]);
  db.run(`INSERT INTO attendance_records (id, session_id, student_id, status, remarks) VALUES (?, ?, 'stu_03', 'late', '10 mins traffic delay')`, ['rec_03', attSessionId]);
  db.run(`INSERT INTO attendance_records (id, session_id, student_id, status, remarks) VALUES (?, ?, 'stu_04', 'absent', 'Unwell, informed by parent')`, ['rec_04', attSessionId]);

  // 10. Homework & Submissions
  const hwId1 = 'hw_01';
  db.run(
    `INSERT INTO assignments (id, centre_id, batch_id, teacher_user_id, title, instructions, subject_id, assigned_date, due_date, max_points, submission_mode, created_at)
     VALUES (?, ?, ?, 'usr_teacher_01', 'Quadratic Equations Practice Set', 'Complete NCERT Chapter 4 Exercises 4.1 to 4.3 with full workings.', 'sub_math', '2026-11-08', '2026-11-15', 50, 'both', ?)`,
    [hwId1, centreId, batch1, now]
  );

  // Student submission for Rohan
  db.run(
    `INSERT INTO submissions (id, assignment_id, student_id, submitted_at, text_content, status, score, feedback, graded_by, graded_at)
     VALUES (?, ?, 'stu_01', '2026-11-10T14:30:00Z', 'Completed all 15 problems. Attached step-by-step solutions.', 'graded', 46, 'Outstanding work! Very neat proofs on question 7.', 'usr_teacher_01', ?)`,
    ['sub_01', hwId1, now]
  );

  // 11. Assessments & Scores
  const asmId1 = 'asm_01';
  db.run(
    `INSERT INTO assessments (id, centre_id, batch_id, title, subject_id, assessment_date, max_marks, passing_marks, instructions, created_at)
     VALUES (?, ?, ?, 'Algebra & Quadratic Mid-Term Test', 'sub_math', '2026-11-05', 100, 40, 'Calculators strictly prohibited. Show all calculation steps.', ?)`,
    [asmId1, centreId, batch1, now]
  );

  db.run(`INSERT INTO assessment_scores (id, assessment_id, student_id, marks_obtained, is_absent, is_exempt, teacher_comments, recorded_by, recorded_at)
          VALUES ('as_01', ?, 'stu_01', 88, 0, 0, 'Top percentile performance. Excellent algebra mastery.', 'usr_teacher_01', ?)`, [asmId1, now]);
  db.run(`INSERT INTO assessment_scores (id, assessment_id, student_id, marks_obtained, is_absent, is_exempt, teacher_comments, recorded_by, recorded_at)
          VALUES ('as_02', ?, 'stu_02', 74, 0, 0, 'Good effort, revise quadratic formula derivations.', 'usr_teacher_01', ?)`, [asmId1, now]);
  db.run(`INSERT INTO assessment_scores (id, assessment_id, student_id, marks_obtained, is_absent, is_exempt, teacher_comments, recorded_by, recorded_at)
          VALUES ('as_03', ?, 'stu_03', 92, 0, 0, 'Flawless problem solving and precision.', 'usr_teacher_01', ?)`, [asmId1, now]);
  db.run(`INSERT INTO assessment_scores (id, assessment_id, student_id, marks_obtained, is_absent, is_exempt, teacher_comments, recorded_by, recorded_at)
          VALUES ('as_04', ?, 'stu_04', 62, 0, 0, 'Needs further practice on word problems.', 'usr_teacher_01', ?)`, [asmId1, now]);

  // 12. Fee Heads
  const headTuition = 'fh_tuition';
  const headKit = 'fh_kit';
  db.run(`INSERT INTO fee_heads (id, centre_id, name, is_recurring, default_amount_cents, created_at) VALUES (?, ?, 'Monthly Tuition', 1, 450000, ?)`, [headTuition, centreId, now]);
  db.run(`INSERT INTO fee_heads (id, centre_id, name, is_recurring, default_amount_cents, created_at) VALUES (?, ?, 'Study Material Kit', 0, 150000, ?)`, [headKit, centreId, now]);

  // 13. Invoices, Payments & Receipts
  const inv1 = 'inv_01';
  db.run(
    `INSERT INTO invoices (id, centre_id, invoice_number, student_id, issue_date, due_date, subtotal_cents, discount_cents, discount_reason, total_cents, paid_cents, status, created_at)
     VALUES (?, ?, 'INV-2026-0001', 'stu_01', '2026-11-01', '2026-11-10', 600000, 50000, 'Early enrollment concession', 550000, 550000, 'paid', ?)`,
    [inv1, centreId, now]
  );
  db.run(`INSERT INTO invoice_items (id, invoice_id, fee_head_id, description, amount_cents) VALUES ('ii_01', ?, ?, 'Monthly Tuition - November 2026', 450000)`, [inv1, headTuition]);
  db.run(`INSERT INTO invoice_items (id, invoice_id, fee_head_id, description, amount_cents) VALUES ('ii_02', ?, ?, 'Study Material Pack Grade 10', 150000)`, [inv1, headKit]);

  const pay1 = 'pay_01';
  db.run(
    `INSERT INTO payment_entries (id, centre_id, invoice_id, student_id, payment_date, amount_cents, payment_mode, reference_note, recorded_by_user_id, created_at)
     VALUES (?, ?, ?, 'stu_01', '2026-11-03', 550000, 'upi_ref', 'UPI Ref: 9482710384 / HDFC Bank', 'usr_accountant_01', ?)`,
    [pay1, centreId, inv1, now]
  );

  db.run(
    `INSERT INTO receipts (id, centre_id, receipt_number, payment_entry_id, student_id, issued_at)
     VALUES ('rcp_01', ?, 'RCP-2026-0001', ?, 'stu_01', ?)`,
    [centreId, pay1, now]
  );

  // Aarav Mehra partially paid invoice
  const inv2 = 'inv_02';
  db.run(
    `INSERT INTO invoices (id, centre_id, invoice_number, student_id, issue_date, due_date, subtotal_cents, discount_cents, total_cents, paid_cents, status, created_at)
     VALUES (?, ?, 'INV-2026-0002', 'stu_02', '2026-11-01', '2026-11-15', 450000, 0, 450000, 250000, 'partially_paid', ?)`,
    [inv2, centreId, now]
  );
  db.run(`INSERT INTO invoice_items (id, invoice_id, fee_head_id, description, amount_cents) VALUES ('ii_03', ?, ?, 'Monthly Tuition - November 2026', 450000)`, [inv2, headTuition]);

  db.run(
    `INSERT INTO payment_entries (id, centre_id, invoice_id, student_id, payment_date, amount_cents, payment_mode, reference_note, recorded_by_user_id, created_at)
     VALUES ('pay_02', ?, ?, 'stu_02', '2026-11-04', 250000, 'cash', 'Cash installment paid at reception', 'usr_accountant_01', ?)`,
    [centreId, inv2, now]
  );
  db.run(`INSERT INTO receipts (id, centre_id, receipt_number, payment_entry_id, student_id, issued_at) VALUES ('rcp_02', ?, 'RCP-2026-0002', 'pay_02', 'stu_02', ?)`, [centreId, now]);

  // 14. Notices
  db.run(
    `INSERT INTO notices (id, centre_id, title, content, priority, audience_type, published_by_user_id, created_at)
     VALUES ('ntc_01', ?, 'Winter Schedule & Special Doubt Clearance Sessions', 'Special weekend doubt clearing sessions for Grade 10 Mathematics will begin from this Saturday at 08:30 AM in Room 101.', 'important', 'all_centre', 'usr_owner_01', ?)`,
    [centreId, now]
  );

  // 15. In-App Notifications
  db.run(
    `INSERT INTO notifications (id, user_id, centre_id, title, message, category, is_read, action_url, created_at)
     VALUES ('notif_01', 'usr_student_01', ?, 'New Assignment Graded', 'Your submission for Quadratic Equations Practice Set has been graded: 46/50.', 'homework', 0, '/homework', ?)`,
    [centreId, now]
  );

  // 16. Audit Log
  db.run(
    `INSERT INTO audit_events (id, centre_id, actor_user_id, event_type, entity_type, entity_id, old_values_json, new_values_json, reason, ip_address, created_at)
     VALUES ('aud_01', ?, 'usr_owner_01', 'centre.initialized', 'centre', ?, NULL, '{"name":"Apex Science & Commerce Academy"}', 'Initial setup and demo seed', '127.0.0.1', ?)`,
    [centreId, centreId, now]
  );

  console.log('[Seed] Demo data successfully loaded for Apex Academy.');
}
