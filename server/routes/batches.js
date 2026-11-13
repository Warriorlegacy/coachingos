// server/routes/batches.js
import { Hono } from 'hono';
import { getDatabase } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateId } from '../crypto.js';

export const batchRoutes = new Hono();

// List Batches
batchRoutes.get('/', requireAuth(), (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const membership = c.get('membership');
  const db = getDatabase();

  let sql = `
    SELECT b.id, b.name, b.grade_level, b.capacity, b.room_or_link, b.status,
           sub.name AS subject_name, sub.code AS subject_code,
           COUNT(DISTINCT e.student_id) AS enrolled_count,
           GROUP_CONCAT(DISTINCT u.name) AS teacher_names
    FROM batches b
    JOIN subjects sub ON sub.id = b.subject_id
    LEFT JOIN enrollments e ON e.batch_id = b.id AND e.status = 'active'
    LEFT JOIN batch_teachers bt ON bt.batch_id = b.id
    LEFT JOIN users u ON u.id = bt.teacher_user_id
    WHERE b.centre_id = ?
  `;
  const params = [centre.id];

  // RBAC Filter: Teachers only see assigned batches
  if (membership.role === 'teacher') {
    sql += ` AND b.id IN (SELECT batch_id FROM batch_teachers WHERE teacher_user_id = ?)`;
    params.push(user.id);
  } else if (membership.role === 'student') {
    sql += ` AND b.id IN (SELECT batch_id FROM enrollments WHERE student_id IN (SELECT id FROM students WHERE user_id = ?))`;
    params.push(user.id);
  }

  sql += ` GROUP BY b.id ORDER BY b.name ASC`;
  const batches = db.all(sql, params);

  return c.json({ batches });
});

// Create Batch
batchRoutes.post('/', requireAuth(), requireRole(['centre_owner', 'centre_admin']), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));

  const { name, gradeLevel, subjectId, capacity, roomOrLink, teacherUserIds } = body;
  if (!name || !gradeLevel || !subjectId) {
    return c.json({ error: 'Batch name, grade level, and subject are required', code: 'INVALID_INPUT' }, 400);
  }

  const batchId = generateId('btc');
  const now = new Date().toISOString();

  // Find active session
  const currentSession = db.get("SELECT id FROM academic_sessions WHERE centre_id = ? AND is_current = 1", [centre.id]);

  db.run(
    `INSERT INTO batches (id, centre_id, academic_session_id, name, grade_level, subject_id, capacity, room_or_link, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    [batchId, centre.id, currentSession ? currentSession.id : null, name.trim(), gradeLevel.trim(), subjectId, capacity || 30, roomOrLink || null, now]
  );

  // Assign teachers
  if (Array.isArray(teacherUserIds) && teacherUserIds.length > 0) {
    for (let i = 0; i < teacherUserIds.length; i++) {
      db.run(
        `INSERT INTO batch_teachers (id, batch_id, teacher_user_id, is_primary, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [generateId('bt'), batchId, teacherUserIds[i], i === 0 ? 1 : 0, now]
      );
    }
  }

  db.run(
    `INSERT INTO audit_events (id, centre_id, actor_user_id, event_type, entity_type, entity_id, new_values_json, created_at)
     VALUES (?, ?, ?, 'batch.created', 'batch', ?, ?, ?)`,
    [generateId('aud'), centre.id, user.id, batchId, JSON.stringify({ name, gradeLevel }), now]
  );

  const batch = db.get("SELECT * FROM batches WHERE id = ?", [batchId]);
  return c.json({ batch }, 201);
});

// Get Batch Details
batchRoutes.get('/:id', requireAuth(), (c) => {
  const centre = c.get('centre');
  const batchId = c.req.param('id');
  const db = getDatabase();

  const batch = db.get(
    `SELECT b.*, sub.name AS subject_name, sub.code AS subject_code
     FROM batches b
     JOIN subjects sub ON sub.id = b.subject_id
     WHERE b.id = ? AND b.centre_id = ?`,
    [batchId, centre.id]
  );

  if (!batch) {
    return c.json({ error: 'Batch not found', code: 'NOT_FOUND' }, 404);
  }

  const teachers = db.all(
    `SELECT u.id, u.name, u.email, bt.is_primary
     FROM batch_teachers bt
     JOIN users u ON u.id = bt.teacher_user_id
     WHERE bt.batch_id = ?`,
    [batchId]
  );

  const students = db.all(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, s.grade_level, e.enrolled_at
     FROM enrollments e
     JOIN students s ON s.id = e.student_id
     WHERE e.batch_id = ? AND e.status = 'active'
     ORDER BY s.first_name ASC`,
    [batchId]
  );

  const timetable = db.all(
    `SELECT * FROM timetable_rules WHERE batch_id = ? ORDER BY day_of_week ASC, start_time ASC`,
    [batchId]
  );

  return c.json({
    batch,
    teachers,
    students,
    timetable,
  });
});

// Enroll Students in Batch
batchRoutes.post('/:id/enroll', requireAuth(), requireRole(['centre_owner', 'centre_admin']), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const batchId = c.req.param('id');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));
  const { studentIds } = body;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return c.json({ error: 'studentIds array is required', code: 'INVALID_INPUT' }, 400);
  }

  const now = new Date().toISOString();
  let enrolledCount = 0;

  for (const sId of studentIds) {
    const existing = db.get("SELECT id FROM enrollments WHERE batch_id = ? AND student_id = ?", [batchId, sId]);
    if (!existing) {
      db.run(
        `INSERT INTO enrollments (id, centre_id, batch_id, student_id, enrolled_at, status)
         VALUES (?, ?, ?, ?, ?, 'active')`,
        [generateId('enr'), centre.id, batchId, sId, now]
      );
      enrolledCount++;
    }
  }

  db.run(
    `INSERT INTO audit_events (id, centre_id, actor_user_id, event_type, entity_type, entity_id, new_values_json, created_at)
     VALUES (?, ?, ?, 'batch.students_enrolled', 'batch', ?, ?, ?)`,
    [generateId('aud'), centre.id, user.id, batchId, JSON.stringify({ count: enrolledCount }), now]
  );

  return c.json({ success: true, enrolledCount });
});

// Timetable Rules with Conflict Detection
batchRoutes.get('/timetable/all', requireAuth(), (c) => {
  const centre = c.get('centre');
  const db = getDatabase();

  const rules = db.all(
    `SELECT tr.*, b.name AS batch_name, b.grade_level, sub.name AS subject_name,
            GROUP_CONCAT(u.name) AS teacher_names
     FROM timetable_rules tr
     JOIN batches b ON b.id = tr.batch_id
     JOIN subjects sub ON sub.id = b.subject_id
     LEFT JOIN batch_teachers bt ON bt.batch_id = b.id
     LEFT JOIN users u ON u.id = bt.teacher_user_id
     WHERE b.centre_id = ?
     GROUP BY tr.id
     ORDER BY tr.day_of_week ASC, tr.start_time ASC`,
    [centre.id]
  );

  return c.json({ rules });
});

// Add Timetable Rule with Conflict Checking
batchRoutes.post('/:id/timetable', requireAuth(), requireRole(['centre_owner', 'centre_admin']), async (c) => {
  const centre = c.get('centre');
  const batchId = c.req.param('id');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));

  const { dayOfWeek, startTime, endTime, periodLabel, room } = body;
  if (dayOfWeek === undefined || !startTime || !endTime) {
    return c.json({ error: 'dayOfWeek, startTime, and endTime are required', code: 'INVALID_INPUT' }, 400);
  }

  // Conflict Check: Is any assigned teacher of this batch already teaching another batch at this time?
  const teachers = db.all("SELECT teacher_user_id FROM batch_teachers WHERE batch_id = ?", [batchId]);
  for (const t of teachers) {
    const conflict = db.get(
      `SELECT tr.id, b.name AS conflicting_batch, tr.start_time, tr.end_time
       FROM timetable_rules tr
       JOIN batches b ON b.id = tr.batch_id
       JOIN batch_teachers bt ON bt.batch_id = b.id
       WHERE bt.teacher_user_id = ?
         AND tr.day_of_week = ?
         AND tr.batch_id != ?
         AND NOT (tr.end_time <= ? OR tr.start_time >= ?)`,
      [t.teacher_user_id, dayOfWeek, batchId, startTime, endTime]
    );

    if (conflict) {
      return c.json({
        error: `Teacher schedule conflict: Assigned teacher is already scheduled for "${conflict.conflicting_batch}" from ${conflict.start_time} to ${conflict.end_time}.`,
        code: 'SCHEDULE_CONFLICT',
        conflict,
      }, 409);
    }
  }

  const ruleId = generateId('ttr');
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO timetable_rules (id, batch_id, day_of_week, start_time, end_time, period_label, room, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [ruleId, batchId, dayOfWeek, startTime, endTime, periodLabel || 'Session', room || null, now]
  );

  const rule = db.get("SELECT * FROM timetable_rules WHERE id = ?", [ruleId]);
  return c.json({ rule }, 201);
});
