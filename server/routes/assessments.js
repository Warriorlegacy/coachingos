// server/routes/assessments.js
import { Hono } from 'hono';
import { getDatabase } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateId } from '../crypto.js';

export const assessmentRoutes = new Hono();

// List Assessments
assessmentRoutes.get('/', requireAuth(), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const membership = c.get('membership');
  const db = getDatabase();

  const batchId = c.req.query('batchId');

  let sql = `
    SELECT asm.*, b.name AS batch_name, sub.name AS subject_name,
           COUNT(DISTINCT sc.id) AS graded_students_count,
           ROUND(AVG(sc.marks_obtained), 1) AS average_score
    FROM assessments asm
    JOIN batches b ON b.id = asm.batch_id
    JOIN subjects sub ON sub.id = asm.subject_id
    LEFT JOIN assessment_scores sc ON sc.assessment_id = asm.id AND sc.is_absent = 0 AND sc.is_exempt = 0
    WHERE asm.centre_id = ?
  `;
  const params = [centre.id];

  if (membership.role === 'teacher') {
    sql += ` AND asm.batch_id IN (SELECT batch_id FROM batch_teachers WHERE teacher_user_id = ?)`;
    params.push(user.id);
  } else if (membership.role === 'student') {
    sql += ` AND asm.batch_id IN (SELECT batch_id FROM enrollments WHERE student_id IN (SELECT id FROM students WHERE user_id = ?))`;
    params.push(user.id);
  }

  if (batchId) {
    sql += ` AND asm.batch_id = ?`;
    params.push(batchId);
  }

  sql += ` GROUP BY asm.id ORDER BY asm.assessment_date DESC`;
  const assessments = await db.all(sql, params);

  // If student, attach their own score
  if (membership.role === 'student') {
    const student = await db.get("SELECT id FROM students WHERE user_id = ?", [user.id]);
    if (student) {
      for (const a of assessments) {
        const sc = await db.get("SELECT marks_obtained, is_absent, is_exempt, teacher_comments FROM assessment_scores WHERE assessment_id = ? AND student_id = ?", [a.id, student.id]);
        a.myScore = sc || null;
      }
    }
  }

  return c.json({ assessments });
});

// Create Assessment
assessmentRoutes.post('/', requireAuth(), requireRole(['centre_owner', 'centre_admin', 'teacher']), async (c) => {
  const centre = c.get('centre');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));

  const { batchId, title, subjectId, assessmentDate, maxMarks, passingMarks, instructions } = body;
  if (!batchId || !title || !assessmentDate || !maxMarks) {
    return c.json({ error: 'batchId, title, assessmentDate, and maxMarks are required', code: 'INVALID_INPUT' }, 400);
  }

  const numMax = Number(maxMarks);
  const numPass = passingMarks !== undefined ? Number(passingMarks) : Math.round(numMax * 0.4);

  if (numMax <= 0 || numPass < 0 || numPass > numMax) {
    return c.json({ error: 'Passing marks must be between 0 and maximum marks', code: 'INVALID_MARKS_RANGE' }, 400);
  }

  const batch = await db.get("SELECT subject_id FROM batches WHERE id = ? AND centre_id = ?", [batchId, centre.id]);
  if (!batch) {
    return c.json({ error: 'Batch not found', code: 'NOT_FOUND' }, 404);
  }

  const asmId = generateId('asm');
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO assessments (id, centre_id, batch_id, title, subject_id, assessment_date, max_marks, passing_marks, instructions, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [asmId, centre.id, batchId, title.trim(), subjectId || batch.subject_id, assessmentDate, numMax, numPass, instructions || null, now]
  );

  const created = await db.get("SELECT * FROM assessments WHERE id = ?", [asmId]);
  return c.json({ assessment: created }, 201);
});

// Get Assessment Details & Scores
assessmentRoutes.get('/:id', requireAuth(), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const membership = c.get('membership');
  const asmId = c.req.param('id');
  const db = getDatabase();

  const assessment = await db.get(
    `SELECT asm.*, b.name AS batch_name, sub.name AS subject_name
     FROM assessments asm
     JOIN batches b ON b.id = asm.batch_id
     JOIN subjects sub ON sub.id = asm.subject_id
     WHERE asm.id = ? AND asm.centre_id = ?`,
    [asmId, centre.id]
  );

  if (!assessment) {
    return c.json({ error: 'Assessment not found', code: 'NOT_FOUND' }, 404);
  }

  // Get active roster for this batch
  const roster = await db.all(
    `SELECT s.id AS student_id, s.admission_no, s.first_name, s.last_name,
            sc.id AS score_id, sc.marks_obtained, sc.is_absent, sc.is_exempt, sc.teacher_comments
     FROM enrollments e
     JOIN students s ON s.id = e.student_id
     LEFT JOIN assessment_scores sc ON sc.assessment_id = ? AND sc.student_id = s.id
     WHERE e.batch_id = ? AND e.status = 'active'
     ORDER BY s.first_name ASC`,
    [asmId, assessment.batch_id]
  );

  // If student or parent, restrict scores to self/child
  let studentScores = roster;
  if (membership.role === 'student') {
    const stu = await db.get("SELECT id FROM students WHERE user_id = ?", [user.id]);
    studentScores = roster.filter(r => stu && r.student_id === stu.id);
  } else if (membership.role === 'parent_guardian') {
    const linkedRows = await db.all(
      `SELECT sg.student_id FROM student_guardians sg
       JOIN guardians g ON g.id = sg.guardian_id
       WHERE g.user_id = ?`,
      [user.id]
    );
    const linkedStudentIds = new Set(linkedRows.map(r => r.student_id));
    studentScores = roster.filter(r => linkedStudentIds.has(r.student_id));
  }

  return c.json({
    assessment,
    scores: studentScores,
  });
});

// Record / Update Scores for an Assessment
assessmentRoutes.post('/:id/scores', requireAuth(), requireRole(['centre_owner', 'centre_admin', 'teacher']), async (c) => {
  const user = c.get('user');
  const asmId = c.req.param('id');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));
  const { scores } = body;

  if (!Array.isArray(scores)) {
    return c.json({ error: 'scores array is required', code: 'INVALID_INPUT' }, 400);
  }

  const assessment = await db.get("SELECT max_marks FROM assessments WHERE id = ?", [asmId]);
  if (!assessment) {
    return c.json({ error: 'Assessment not found', code: 'NOT_FOUND' }, 404);
  }

  const now = new Date().toISOString();
  let savedCount = 0;

  for (const s of scores) {
    const studentId = s.studentId || s.student_id;
    const isAbsent = s.isAbsent || s.is_absent ? 1 : 0;
    const isExempt = s.isExempt || s.is_exempt ? 1 : 0;
    let marks = s.marksObtained !== undefined && s.marksObtained !== null ? Number(s.marksObtained) : null;

    if (marks !== null && !isAbsent && !isExempt) {
      if (marks < 0 || marks > assessment.max_marks) {
        return c.json({
          error: `Marks for student (${marks}) must be between 0 and maximum marks (${assessment.max_marks})`,
          code: 'MARKS_OUT_OF_RANGE',
        }, 400);
      }
    }

    const existing = await db.get("SELECT id FROM assessment_scores WHERE assessment_id = ? AND student_id = ?", [asmId, studentId]);

    if (!existing) {
      await db.run(
        `INSERT INTO assessment_scores (id, assessment_id, student_id, marks_obtained, is_absent, is_exempt, teacher_comments, recorded_by, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [generateId('as'), asmId, studentId, marks, isAbsent, isExempt, s.teacherComments || null, user.id, now]
      );
    } else {
      await db.run(
        `UPDATE assessment_scores
         SET marks_obtained = ?, is_absent = ?, is_exempt = ?, teacher_comments = ?, recorded_by = ?, recorded_at = ?
         WHERE id = ?`,
        [marks, isAbsent, isExempt, s.teacherComments || null, user.id, now, existing.id]
      );
    }
    savedCount++;
  }

  return c.json({ success: true, savedCount });
});
