// server/routes/attendance.js
import { Hono } from 'hono';
import { getDatabase } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateId } from '../crypto.js';

export const attendanceRoutes = new Hono();

// Get or Prepare Attendance Session for a Batch & Date
attendanceRoutes.get('/session', requireAuth(), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const membership = c.get('membership');
  const db = getDatabase();

  const batchId = c.req.query('batchId');
  const date = c.req.query('date') || new Date().toISOString().slice(0, 10);
  const period = c.req.query('period') || 'Period 1';

  if (!batchId) {
    return c.json({ error: 'batchId is required', code: 'INVALID_INPUT' }, 400);
  }

  // Teacher RBAC Check
  if (membership.role === 'teacher') {
    const isAssigned = await db.get("SELECT 1 FROM batch_teachers WHERE batch_id = ? AND teacher_user_id = ?", [batchId, user.id]);
    if (!isAssigned) {
      return c.json({ error: 'Access denied: You are not assigned to this batch', code: 'FORBIDDEN' }, 403);
    }
  }

  // Check if session already exists
  const session = await db.get(
    `SELECT * FROM attendance_sessions
     WHERE centre_id = ? AND batch_id = ? AND date = ? AND period = ?`,
    [centre.id, batchId, date, period]
  );

  let records = [];
  if (session) {
    records = await db.all(
      `SELECT ar.*, s.admission_no, s.first_name, s.last_name, s.grade_level
       FROM attendance_records ar
       JOIN students s ON s.id = ar.student_id
       WHERE ar.session_id = ?
       ORDER BY s.first_name ASC`,
      [session.id]
    );
  } else {
    // Generate empty template from active enrolled students
    const roster = await db.all(
      `SELECT s.id AS student_id, s.admission_no, s.first_name, s.last_name, s.grade_level
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       WHERE e.batch_id = ? AND e.status = 'active'
       ORDER BY s.first_name ASC`,
      [batchId]
    );

    records = roster.map(s => ({
      student_id: s.student_id,
      admission_no: s.admission_no,
      first_name: s.first_name,
      last_name: s.last_name,
      grade_level: s.grade_level,
      status: 'present', // Default to present for quick mobile taking
      remarks: '',
    }));
  }

  return c.json({
    exists: !!session,
    session,
    batchId,
    date,
    period,
    records,
  });
});

// Submit / Record Attendance (Creates or Replaces Session Records)
attendanceRoutes.post('/submit', requireAuth(), requireRole(['centre_owner', 'centre_admin', 'teacher']), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const membership = c.get('membership');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));

  const { batchId, date, period = 'Period 1', records, notes } = body;
  if (!batchId || !date || !Array.isArray(records)) {
    return c.json({ error: 'batchId, date, and records array are required', code: 'INVALID_INPUT' }, 400);
  }

  // Teacher RBAC Check
  if (membership.role === 'teacher') {
    const isAssigned = await db.get("SELECT 1 FROM batch_teachers WHERE batch_id = ? AND teacher_user_id = ?", [batchId, user.id]);
    if (!isAssigned) {
      return c.json({ error: 'Access denied: You are not assigned to this batch', code: 'FORBIDDEN' }, 403);
    }
  }

  const now = new Date().toISOString();
  let session = await db.get(
    `SELECT * FROM attendance_sessions
     WHERE centre_id = ? AND batch_id = ? AND date = ? AND period = ?`,
    [centre.id, batchId, date, period]
  );

  let isNew = false;
  if (!session) {
    const sessionId = generateId('att_ses');
    await db.run(
      `INSERT INTO attendance_sessions (id, centre_id, batch_id, date, period, taken_by_user_id, taken_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, centre.id, batchId, date, period, user.id, now, notes || null]
    );
    session = { id: sessionId, centre_id: centre.id, batch_id: batchId, date, period };
    isNew = true;
  }

  // Insert or Upsert Records
  let savedCount = 0;
  for (const r of records) {
    const validStatus = ['present', 'absent', 'late', 'excused'].includes(r.status) ? r.status : 'present';
    const existingRec = await db.get("SELECT id, status FROM attendance_records WHERE session_id = ? AND student_id = ?", [session.id, r.studentId || r.student_id]);

    if (!existingRec) {
      await db.run(
        `INSERT INTO attendance_records (id, session_id, student_id, status, remarks)
         VALUES (?, ?, ?, ?, ?)`,
        [generateId('att_rec'), session.id, r.studentId || r.student_id, validStatus, r.remarks || null]
      );
      savedCount++;
    } else if (existingRec.status !== validStatus) {
      // Record correction with audit logging
      await db.run(
        `UPDATE attendance_records
         SET status = ?, remarks = ?, last_edited_by = ?, last_edited_at = ?, edit_reason = ?
         WHERE id = ?`,
        [validStatus, r.remarks || null, user.id, now, r.editReason || 'Batch attendance update', existingRec.id]
      );

      await db.run(
        `INSERT INTO audit_events (id, centre_id, actor_user_id, event_type, entity_type, entity_id, old_values_json, new_values_json, reason, created_at)
         VALUES (?, ?, ?, 'attendance.corrected', 'attendance_record', ?, ?, ?, ?, ?)`,
        [
          generateId('aud'),
          centre.id,
          user.id,
          existingRec.id,
          JSON.stringify({ status: existingRec.status }),
          JSON.stringify({ status: validStatus, remarks: r.remarks }),
          r.editReason || 'Session record update',
          now,
        ]
      );
      savedCount++;
    }
  }

  return c.json({
    success: true,
    sessionId: session.id,
    isNew,
    savedCount,
  });
});

// Single Record Correction with Mandatory Audit Reason
attendanceRoutes.put('/records/:id', requireAuth(), requireRole(['centre_owner', 'centre_admin', 'teacher']), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const recordId = c.req.param('id');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));

  const { status, remarks, editReason } = body;
  if (!status || !['present', 'absent', 'late', 'excused'].includes(status)) {
    return c.json({ error: 'Valid status (present, absent, late, excused) is required', code: 'INVALID_INPUT' }, 400);
  }
  if (!editReason || editReason.trim().length < 3) {
    return c.json({ error: 'A clear reason for attendance correction is mandatory for audit trail', code: 'REASON_REQUIRED' }, 400);
  }

  const existing = await db.get(
    `SELECT ar.*, s.centre_id
     FROM attendance_records ar
     JOIN attendance_sessions s ON s.id = ar.session_id
     WHERE ar.id = ? AND s.centre_id = ?`,
    [recordId, centre.id]
  );

  if (!existing) {
    return c.json({ error: 'Attendance record not found', code: 'NOT_FOUND' }, 404);
  }

  const now = new Date().toISOString();
  await db.run(
    `UPDATE attendance_records
     SET status = ?, remarks = ?, last_edited_by = ?, last_edited_at = ?, edit_reason = ?
     WHERE id = ?`,
    [status, remarks || null, user.id, now, editReason.trim(), recordId]
  );

  await db.run(
    `INSERT INTO audit_events (id, centre_id, actor_user_id, event_type, entity_type, entity_id, old_values_json, new_values_json, reason, created_at)
     VALUES (?, ?, ?, 'attendance.corrected', 'attendance_record', ?, ?, ?, ?, ?)`,
    [
      generateId('aud'),
      centre.id,
      user.id,
      recordId,
      JSON.stringify({ status: existing.status, remarks: existing.remarks }),
      JSON.stringify({ status, remarks }),
      editReason.trim(),
      now,
    ]
  );

  const updated = await db.get("SELECT * FROM attendance_records WHERE id = ?", [recordId]);
  return c.json({ success: true, record: updated });
});

// Offline Attendance Queue Sync
attendanceRoutes.post('/sync-offline', requireAuth(), requireRole(['centre_owner', 'centre_admin', 'teacher']), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));
  const { queue } = body;

  if (!Array.isArray(queue) || queue.length === 0) {
    return c.json({ syncedCount: 0, conflicts: [] });
  }

  let syncedCount = 0;
  const conflicts = [];
  const now = new Date().toISOString();

  for (const item of queue) {
    const { batchId, date, period = 'Period 1', records, clientTimestamp } = item;
    // Check if session was already modified on server after client timestamp
    const existingSession = await db.get(
      `SELECT * FROM attendance_sessions
       WHERE centre_id = ? AND batch_id = ? AND date = ? AND period = ?`,
      [centre.id, batchId, date, period]
    );

    if (existingSession && clientTimestamp && existingSession.taken_at > clientTimestamp) {
      conflicts.push({
        batchId,
        date,
        period,
        reason: 'Server already has newer attendance record submitted by another user.',
      });
      continue;
    }

    // Process submission safely
    let sessionId = existingSession ? existingSession.id : generateId('att_ses');
    if (!existingSession) {
      await db.run(
        `INSERT INTO attendance_sessions (id, centre_id, batch_id, date, period, taken_by_user_id, taken_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sessionId, centre.id, batchId, date, period, user.id, now]
      );
    }

    if (Array.isArray(records)) {
      for (const r of records) {
        const validStatus = ['present', 'absent', 'late', 'excused'].includes(r.status) ? r.status : 'present';
        const sId = r.studentId || r.student_id;
        const exists = await db.get("SELECT id FROM attendance_records WHERE session_id = ? AND student_id = ?", [sessionId, sId]);
        if (!exists) {
          await db.run(
            `INSERT INTO attendance_records (id, session_id, student_id, status, remarks)
             VALUES (?, ?, ?, ?, ?)`,
            [generateId('att_rec'), sessionId, sId, validStatus, r.remarks || 'Offline synced']
          );
        } else {
          await db.run(
            `UPDATE attendance_records SET status = ?, remarks = ? WHERE id = ?`,
            [validStatus, r.remarks || 'Offline synced', exists.id]
          );
        }
      }
    }
    syncedCount++;
  }

  return c.json({ success: true, syncedCount, conflicts });
});

// Student Attendance History (Role-guarded)
attendanceRoutes.get('/student/:id', requireAuth(), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const membership = c.get('membership');
  const studentId = c.req.param('id');
  const db = getDatabase();

  // IDOR Protection: Guardian verification
  if (membership.role === 'parent_guardian') {
    const isLinked = await db.get(
      `SELECT 1 FROM student_guardians sg
       JOIN guardians g ON g.id = sg.guardian_id
       WHERE sg.student_id = ? AND g.user_id = ?`,
      [studentId, user.id]
    );
    if (!isLinked) {
      return c.json({ error: 'Access denied: Guardian not linked to this student', code: 'FORBIDDEN' }, 403);
    }
  } else if (membership.role === 'student') {
    const student = await db.get("SELECT user_id FROM students WHERE id = ?", [studentId]);
    if (!student || student.user_id !== user.id) {
      return c.json({ error: 'Access denied: You may only view your own attendance', code: 'FORBIDDEN' }, 403);
    }
  }

  const history = await db.all(
    `SELECT ar.id, ar.status, ar.remarks, ar.edit_reason,
            s.date, s.period, b.name AS batch_name, sub.name AS subject_name
     FROM attendance_records ar
     JOIN attendance_sessions s ON s.id = ar.session_id
     JOIN batches b ON b.id = s.batch_id
     JOIN subjects sub ON sub.id = b.subject_id
     WHERE ar.student_id = ? AND s.centre_id = ?
     ORDER BY s.date DESC LIMIT 50`,
    [studentId, centre.id]
  );

  const stats = await db.get(
    `SELECT 
       COUNT(*) AS total_sessions,
       SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS present_count,
       SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) AS late_count,
       SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
       SUM(CASE WHEN ar.status = 'excused' THEN 1 ELSE 0 END) AS excused_count
     FROM attendance_records ar
     JOIN attendance_sessions s ON s.id = ar.session_id
     WHERE ar.student_id = ? AND s.centre_id = ?`,
    [studentId, centre.id]
  );

  const total = Number(stats.total_sessions || 0);
  const present = Number(stats.present_count || 0);
  const late = Number(stats.late_count || 0);
  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

  return c.json({
    studentId,
    stats: { ...stats, attendanceRate: rate },
    history,
  });
});
