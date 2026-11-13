// server/routes/homework.js
import { Hono } from 'hono';
import { getDatabase } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateId } from '../crypto.js';

export const homeworkRoutes = new Hono();

// List Homework Assignments
homeworkRoutes.get('/', requireAuth(), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const membership = c.get('membership');
  const db = getDatabase();

  const batchId = c.req.query('batchId');

  let sql = `
    SELECT a.*, b.name AS batch_name, sub.name AS subject_name, u.name AS teacher_name,
           COUNT(DISTINCT s.id) AS submission_count,
           COUNT(DISTINCT e.student_id) AS total_students
    FROM assignments a
    JOIN batches b ON b.id = a.batch_id
    JOIN subjects sub ON sub.id = a.subject_id
    JOIN users u ON u.id = a.teacher_user_id
    LEFT JOIN submissions s ON s.assignment_id = a.id
    LEFT JOIN enrollments e ON e.batch_id = b.id AND e.status = 'active'
    WHERE a.centre_id = ?
  `;
  const params = [centre.id];

  if (membership.role === 'teacher') {
    sql += ` AND a.batch_id IN (SELECT batch_id FROM batch_teachers WHERE teacher_user_id = ?)`;
    params.push(user.id);
  } else if (membership.role === 'student') {
    sql += ` AND a.batch_id IN (SELECT batch_id FROM enrollments WHERE student_id IN (SELECT id FROM students WHERE user_id = ?))`;
    params.push(user.id);
  }

  if (batchId) {
    sql += ` AND a.batch_id = ?`;
    params.push(batchId);
  }

  sql += ` GROUP BY a.id ORDER BY a.due_date DESC`;
  const assignments = await db.all(sql, params);

  // If student, attach their own submission status
  if (membership.role === 'student') {
    const student = await db.get("SELECT id FROM students WHERE user_id = ?", [user.id]);
    if (student) {
      for (const a of assignments) {
        const sub = await db.get("SELECT id, submitted_at, status, score, feedback FROM submissions WHERE assignment_id = ? AND student_id = ?", [a.id, student.id]);
        a.mySubmission = sub || null;
      }
    }
  }

  return c.json({ assignments });
});

// Create Homework Assignment
homeworkRoutes.post('/', requireAuth(), requireRole(['centre_owner', 'centre_admin', 'teacher']), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));

  const { batchId, title, instructions, subjectId, assignedDate, dueDate, maxPoints = 100, submissionMode = 'both', attachmentUrl } = body;
  if (!batchId || !title || !instructions || !dueDate) {
    return c.json({ error: 'batchId, title, instructions, and dueDate are required', code: 'INVALID_INPUT' }, 400);
  }

  const batch = await db.get("SELECT subject_id FROM batches WHERE id = ? AND centre_id = ?", [batchId, centre.id]);
  if (!batch) {
    return c.json({ error: 'Batch not found', code: 'NOT_FOUND' }, 404);
  }

  const assignmentId = generateId('hw');
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO assignments (id, centre_id, batch_id, teacher_user_id, title, instructions, subject_id, assigned_date, due_date, max_points, submission_mode, attachment_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      assignmentId,
      centre.id,
      batchId,
      user.id,
      title.trim(),
      instructions.trim(),
      subjectId || batch.subject_id,
      assignedDate || now.slice(0, 10),
      dueDate,
      Number(maxPoints),
      submissionMode,
      attachmentUrl || null,
      now
    ]
  );

  const created = await db.get("SELECT * FROM assignments WHERE id = ?", [assignmentId]);
  return c.json({ assignment: created }, 201);
});

// Get Homework Details & Submissions
homeworkRoutes.get('/:id', requireAuth(), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const membership = c.get('membership');
  const assignmentId = c.req.param('id');
  const db = getDatabase();

  const assignment = await db.get(
    `SELECT a.*, b.name AS batch_name, sub.name AS subject_name, u.name AS teacher_name
     FROM assignments a
     JOIN batches b ON b.id = a.batch_id
     JOIN subjects sub ON sub.id = a.subject_id
     JOIN users u ON u.id = a.teacher_user_id
     WHERE a.id = ? AND a.centre_id = ?`,
    [assignmentId, centre.id]
  );

  if (!assignment) {
    return c.json({ error: 'Assignment not found', code: 'NOT_FOUND' }, 404);
  }

  let submissions = [];
  let mySubmission = null;

  if (['centre_owner', 'centre_admin', 'teacher'].includes(membership.role)) {
    submissions = await db.all(
      `SELECT sub.*, s.admission_no, s.first_name, s.last_name
       FROM submissions sub
       JOIN students s ON s.id = sub.student_id
       WHERE sub.assignment_id = ?
       ORDER BY sub.submitted_at DESC`,
      [assignmentId]
    );
  } else if (membership.role === 'student') {
    const student = await db.get("SELECT id FROM students WHERE user_id = ?", [user.id]);
    if (student) {
      mySubmission = await db.get("SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?", [assignmentId, student.id]);
    }
  }

  return c.json({
    assignment,
    submissions,
    mySubmission,
  });
});

// Student Submit Homework
homeworkRoutes.post('/:id/submit', requireAuth(), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const assignmentId = c.req.param('id');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));

  const { textContent, fileUrl } = body;
  if (!textContent && !fileUrl) {
    return c.json({ error: 'Text content or file URL submission is required', code: 'EMPTY_SUBMISSION' }, 400);
  }

  // Find student record for user
  const student = await db.get("SELECT id FROM students WHERE user_id = ? AND centre_id = ?", [user.id, centre.id]);
  if (!student) {
    return c.json({ error: 'No enrolled student profile linked to this user account', code: 'NO_STUDENT_PROFILE' }, 403);
  }

  const assignment = await db.get("SELECT id, due_date FROM assignments WHERE id = ? AND centre_id = ?", [assignmentId, centre.id]);
  if (!assignment) {
    return c.json({ error: 'Assignment not found', code: 'NOT_FOUND' }, 404);
  }

  const now = new Date().toISOString();
  const existing = await db.get("SELECT id, status FROM submissions WHERE assignment_id = ? AND student_id = ?", [assignmentId, student.id]);

  if (!existing) {
    const subId = generateId('sub');
    await db.run(
      `INSERT INTO submissions (id, assignment_id, student_id, submitted_at, text_content, file_url, status)
       VALUES (?, ?, ?, ?, ?, ?, 'submitted')`,
      [subId, assignmentId, student.id, now, textContent || null, fileUrl || null]
    );
  } else {
    // Update submission if permitted
    await db.run(
      `UPDATE submissions
       SET submitted_at = ?, text_content = ?, file_url = ?, status = 'submitted'
       WHERE id = ?`,
      [now, textContent || null, fileUrl || null, existing.id]
    );
  }

  return c.json({ success: true, message: 'Homework submitted successfully', submittedAt: now });
});

// Teacher Grade Submission
homeworkRoutes.post('/:id/grade', requireAuth(), requireRole(['centre_owner', 'centre_admin', 'teacher']), async (c) => {
  const user = c.get('user');
  const assignmentId = c.req.param('id');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));

  const { submissionId, score, feedback, status = 'graded' } = body;
  if (!submissionId || score === undefined) {
    return c.json({ error: 'submissionId and score are required', code: 'INVALID_INPUT' }, 400);
  }

  const assignment = await db.get("SELECT max_points FROM assignments WHERE id = ?", [assignmentId]);
  if (!assignment) {
    return c.json({ error: 'Assignment not found', code: 'NOT_FOUND' }, 404);
  }

  const numScore = Number(score);
  if (numScore < 0 || numScore > assignment.max_points) {
    return c.json({
      error: `Score must be between 0 and maximum points (${assignment.max_points})`,
      code: 'SCORE_OUT_OF_RANGE'
    }, 400);
  }

  const now = new Date().toISOString();
  await db.run(
    `UPDATE submissions
     SET score = ?, feedback = ?, status = ?, graded_by = ?, graded_at = ?
     WHERE id = ?`,
    [numScore, feedback || null, status, user.id, now, submissionId]
  );

  return c.json({ success: true, score: numScore, status, gradedAt: now });
});
