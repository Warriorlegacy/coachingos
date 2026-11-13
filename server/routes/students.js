// server/routes/students.js
import { Hono } from 'hono';
import { getDatabase } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateId } from '../crypto.js';

export const studentRoutes = new Hono();

// List Students (Scoped to Centre)
studentRoutes.get('/', requireAuth(), (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const membership = c.get('membership');
  const db = getDatabase();

  const batchId = c.req.query('batchId');
  const grade = c.req.query('grade');
  const status = c.req.query('status') || 'active';
  const search = c.req.query('search');

  let sql = `
    SELECT s.id, s.admission_no, s.first_name, s.last_name, s.grade_level, s.enrollment_date, s.status,
           COUNT(DISTINCT e.batch_id) AS batch_count
    FROM students s
    LEFT JOIN enrollments e ON e.student_id = s.id AND e.status = 'active'
    WHERE s.centre_id = ?
  `;
  const params = [centre.id];

  // RBAC Filter: If role is guardian, only return linked children!
  if (membership.role === 'parent_guardian') {
    sql += ` AND s.id IN (
      SELECT sg.student_id
      FROM student_guardians sg
      JOIN guardians g ON g.id = sg.guardian_id
      WHERE g.user_id = ?
    )`;
    params.push(user.id);
  } else if (membership.role === 'student') {
    // If student, only return self!
    sql += ` AND s.user_id = ?`;
    params.push(user.id);
  } else if (membership.role === 'teacher') {
    // If teacher, only return students in teacher's assigned batches!
    sql += ` AND s.id IN (
      SELECT e2.student_id
      FROM enrollments e2
      JOIN batch_teachers bt ON bt.batch_id = e2.batch_id
      WHERE bt.teacher_user_id = ?
    )`;
    params.push(user.id);
  }

  if (batchId) {
    sql += ` AND e.batch_id = ?`;
    params.push(batchId);
  }
  if (grade) {
    sql += ` AND s.grade_level = ?`;
    params.push(grade);
  }
  if (status && status !== 'all') {
    sql += ` AND s.status = ?`;
    params.push(status);
  }
  if (search) {
    sql += ` AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_no LIKE ?)`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  sql += ` GROUP BY s.id ORDER BY s.first_name ASC`;

  const students = db.all(sql, params);
  return c.json({ students });
});

// Create Student
studentRoutes.post('/', requireAuth(), requireRole(['centre_owner', 'centre_admin']), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));

  const { admissionNo, firstName, lastName, gradeLevel, enrollmentDate, guardian } = body;
  if (!admissionNo || !firstName || !lastName || !gradeLevel) {
    return c.json({ error: 'Admission number, first name, last name, and grade level are required', code: 'INVALID_INPUT' }, 400);
  }

  // Check duplicate admission number
  const existing = db.get("SELECT id FROM students WHERE centre_id = ? AND admission_no = ?", [centre.id, admissionNo.trim()]);
  if (existing) {
    return c.json({ error: `Student with admission number "${admissionNo}" already exists in this centre.`, code: 'DUPLICATE_ADMISSION_NO' }, 409);
  }

  const now = new Date().toISOString();
  const studentId = generateId('stu');
  const enrollDate = enrollmentDate || now.slice(0, 10);

  db.run(
    `INSERT INTO students (id, centre_id, admission_no, first_name, last_name, grade_level, enrollment_date, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [studentId, centre.id, admissionNo.trim(), firstName.trim(), lastName.trim(), gradeLevel.trim(), enrollDate, now, now]
  );

  // Link guardian if provided
  if (guardian && guardian.name && guardian.phone) {
    const guardianId = generateId('grd');
    db.run(
      `INSERT INTO guardians (id, centre_id, name, relationship, phone, email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [guardianId, centre.id, guardian.name.trim(), guardian.relationship || 'Guardian', guardian.phone.trim(), guardian.email || null, now]
    );

    db.run(
      `INSERT INTO student_guardians (id, student_id, guardian_id, is_primary, created_at)
       VALUES (?, ?, ?, 1, ?)`,
      [generateId('sg'), studentId, guardianId, now]
    );
  }

  db.run(
    `INSERT INTO audit_events (id, centre_id, actor_user_id, event_type, entity_type, entity_id, new_values_json, created_at)
     VALUES (?, ?, ?, 'student.created', 'student', ?, ?, ?)`,
    [generateId('aud'), centre.id, user.id, studentId, JSON.stringify({ admissionNo, firstName, lastName, gradeLevel }), now]
  );

  const student = db.get("SELECT * FROM students WHERE id = ?", [studentId]);
  return c.json({ student }, 201);
});

// Get Student Detail
studentRoutes.get('/:id', requireAuth(), (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const membership = c.get('membership');
  const studentId = c.req.param('id');
  const db = getDatabase();

  const student = db.get("SELECT * FROM students WHERE id = ? AND centre_id = ?", [studentId, centre.id]);
  if (!student) {
    return c.json({ error: 'Student not found', code: 'NOT_FOUND' }, 404);
  }

  // IDOR Protection: If guardian, verify relationship!
  if (membership.role === 'parent_guardian') {
    const isLinked = db.get(
      `SELECT 1 FROM student_guardians sg
       JOIN guardians g ON g.id = sg.guardian_id
       WHERE sg.student_id = ? AND g.user_id = ?`,
      [studentId, user.id]
    );
    if (!isLinked) {
      return c.json({ error: 'Access denied: You are not authorized to view this student', code: 'FORBIDDEN' }, 403);
    }
  } else if (membership.role === 'student' && student.user_id !== user.id) {
    return c.json({ error: 'Access denied: You may only view your own student record', code: 'FORBIDDEN' }, 403);
  }

  // Guardians
  const guardians = db.all(
    `SELECT g.id, g.name, g.relationship, g.phone, g.email, sg.is_primary
     FROM student_guardians sg
     JOIN guardians g ON g.id = sg.guardian_id
     WHERE sg.student_id = ?`,
    [studentId]
  );

  // Enrolled Batches
  const batches = db.all(
    `SELECT b.id, b.name, b.grade_level, sub.name AS subject_name, e.enrolled_at
     FROM enrollments e
     JOIN batches b ON b.id = e.batch_id
     JOIN subjects sub ON sub.id = b.subject_id
     WHERE e.student_id = ? AND e.status = 'active'`,
    [studentId]
  );

  // Attendance stats
  const attStats = db.get(
    `SELECT 
       COUNT(*) AS total_sessions,
       SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count,
       SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late_count,
       SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
       SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) AS excused_count
     FROM attendance_records
     WHERE student_id = ?`,
    [studentId]
  );

  // Invoices & Balance (Hidden from teachers)
  let invoices = [];
  if (['centre_owner', 'centre_admin', 'accountant', 'parent_guardian'].includes(membership.role)) {
    invoices = db.all(
      `SELECT id, invoice_number, issue_date, due_date, total_cents, paid_cents, status
       FROM invoices
       WHERE student_id = ?
       ORDER BY due_date DESC`,
      [studentId]
    );
  }

  return c.json({
    student,
    guardians,
    batches,
    attendance: attStats,
    invoices,
  });
});

// CSV Bulk Import
studentRoutes.post('/import-csv', requireAuth(), requireRole(['centre_owner', 'centre_admin']), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));
  const { csvContent, dryRun } = body;

  if (!csvContent || typeof csvContent !== 'string') {
    return c.json({ error: 'Valid CSV content is required', code: 'INVALID_INPUT' }, 400);
  }

  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return c.json({ error: 'CSV must contain at least a header and one row', code: 'INVALID_CSV' }, 400);
  }

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const admIdx = headers.findIndex(h => h.includes('admission') || h.includes('adm_no') || h.includes('id'));
  const firstIdx = headers.findIndex(h => h.includes('first') || h.includes('fname') || h.includes('name'));
  const lastIdx = headers.findIndex(h => h.includes('last') || h.includes('lname'));
  const gradeIdx = headers.findIndex(h => h.includes('grade') || h.includes('class'));

  if (admIdx === -1 || firstIdx === -1) {
    return c.json({ error: 'CSV must contain at least "admission_no" and "first_name" columns', code: 'MISSING_COLUMNS' }, 400);
  }

  const existingAdmNos = new Set(
    db.all("SELECT admission_no FROM students WHERE centre_id = ?", [centre.id]).map(s => s.admission_no.toLowerCase())
  );

  const errors = [];
  const validRows = [];
  const seenInBatch = new Set();
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const admNo = row[admIdx];
    const first = row[firstIdx];
    const last = lastIdx !== -1 && row[lastIdx] ? row[lastIdx] : '';
    const grade = gradeIdx !== -1 && row[gradeIdx] ? row[gradeIdx] : 'Grade 10';

    if (!admNo || !first) {
      errors.push({ row: i + 1, error: 'Admission number and first name are required' });
      continue;
    }

    const admLower = admNo.toLowerCase();
    if (existingAdmNos.has(admLower)) {
      errors.push({ row: i + 1, error: `Admission number "${admNo}" already exists in database` });
      continue;
    }
    if (seenInBatch.has(admLower)) {
      errors.push({ row: i + 1, error: `Duplicate admission number "${admNo}" found in CSV` });
      continue;
    }

    seenInBatch.add(admLower);
    validRows.push({
      admissionNo: admNo,
      firstName: first,
      lastName: last,
      gradeLevel: grade,
      enrollmentDate: today,
    });
  }

  if (dryRun) {
    return c.json({
      dryRun: true,
      totalRows: lines.length - 1,
      validCount: validRows.length,
      errorCount: errors.length,
      errors,
      preview: validRows.slice(0, 5),
    });
  }

  // Commit import
  let importedCount = 0;
  for (const s of validRows) {
    const studentId = generateId('stu');
    db.run(
      `INSERT INTO students (id, centre_id, admission_no, first_name, last_name, grade_level, enrollment_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [studentId, centre.id, s.admissionNo, s.firstName, s.lastName, s.gradeLevel, s.enrollmentDate, now, now]
    );
    importedCount++;
  }

  db.run(
    `INSERT INTO audit_events (id, centre_id, actor_user_id, event_type, entity_type, entity_id, new_values_json, created_at)
     VALUES (?, ?, ?, 'students.imported_csv', 'centre', ?, ?, ?)`,
    [generateId('aud'), centre.id, user.id, centre.id, JSON.stringify({ importedCount, errorsCount: errors.length }), now]
  );

  return c.json({
    success: true,
    importedCount,
    errorCount: errors.length,
    errors,
  });
});

// CSV Export (Formula-Injection Protected)
studentRoutes.get('/export/csv', requireAuth(), requireRole(['centre_owner', 'centre_admin']), (c) => {
  const centre = c.get('centre');
  const db = getDatabase();

  const students = db.all(
    `SELECT s.admission_no, s.first_name, s.last_name, s.grade_level, s.enrollment_date, s.status,
            g.name AS guardian_name, g.phone AS guardian_phone
     FROM students s
     LEFT JOIN student_guardians sg ON sg.student_id = s.id AND sg.is_primary = 1
     LEFT JOIN guardians g ON g.id = sg.guardian_id
     WHERE s.centre_id = ?
     ORDER BY s.admission_no ASC`,
    [centre.id]
  );

  // Sanitize formula injection
  const sanitize = (val) => {
    if (!val) return '""';
    let str = String(val).replace(/"/g, '""');
    if (/^[=+@\t\r-]/.test(str)) {
      str = "'" + str;
    }
    return `"${str}"`;
  };

  const csvRows = [
    ['Admission No', 'First Name', 'Last Name', 'Grade Level', 'Enrollment Date', 'Status', 'Guardian Name', 'Guardian Phone'].join(',')
  ];

  for (const s of students) {
    csvRows.push([
      sanitize(s.admission_no),
      sanitize(s.first_name),
      sanitize(s.last_name),
      sanitize(s.grade_level),
      sanitize(s.enrollment_date),
      sanitize(s.status),
      sanitize(s.guardian_name),
      sanitize(s.guardian_phone),
    ].join(','));
  }

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="students-${centre.code}.csv"`);
  return c.text(csvRows.join('\n'));
});
