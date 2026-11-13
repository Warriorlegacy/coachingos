// server/routes/notices.js
import { Hono } from 'hono';
import { getDatabase } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateId } from '../crypto.js';

export const noticeRoutes = new Hono();

// List Notices (Role & Audience filtered)
noticeRoutes.get('/', requireAuth(), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const membership = c.get('membership');
  const db = getDatabase();

  let sql = `
    SELECT n.*, u.name AS publisher_name, b.name AS batch_name
    FROM notices n
    JOIN users u ON u.id = n.published_by_user_id
    LEFT JOIN batches b ON b.id = n.batch_id
    WHERE n.centre_id = ?
  `;
  const params = [centre.id];

  // RBAC Filter: Students and Guardians only see 'all_centre' or their assigned batch/student notices
  if (membership.role === 'student') {
    sql += ` AND (
      n.audience_type = 'all_centre'
      OR n.batch_id IN (SELECT batch_id FROM enrollments WHERE student_id IN (SELECT id FROM students WHERE user_id = ?))
      OR n.student_id IN (SELECT id FROM students WHERE user_id = ?)
    )`;
    params.push(user.id, user.id);
  } else if (membership.role === 'parent_guardian') {
    sql += ` AND (
      n.audience_type = 'all_centre'
      OR n.student_id IN (
        SELECT sg.student_id FROM student_guardians sg
        JOIN guardians g ON g.id = sg.guardian_id
        WHERE g.user_id = ?
      )
    )`;
    params.push(user.id);
  }

  sql += ` ORDER BY n.created_at DESC`;
  const notices = await db.all(sql, params);

  return c.json({ notices });
});

// Publish Notice
noticeRoutes.post('/', requireAuth(), requireRole(['centre_owner', 'centre_admin', 'teacher']), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));

  const { title, content, priority = 'normal', audienceType = 'all_centre', batchId, studentId, expiresAt } = body;
  if (!title || !content) {
    return c.json({ error: 'title and content are required', code: 'INVALID_INPUT' }, 400);
  }

  const noticeId = generateId('ntc');
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO notices (id, centre_id, title, content, priority, audience_type, batch_id, student_id, published_by_user_id, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [noticeId, centre.id, title.trim(), content.trim(), priority, audienceType, batchId || null, studentId || null, user.id, expiresAt || null, now]
  );

  const notice = await db.get("SELECT * FROM notices WHERE id = ?", [noticeId]);
  return c.json({ notice }, 201);
});

// In-App Notifications Inbox
noticeRoutes.get('/notifications', requireAuth(), async (c) => {
  const user = c.get('user');
  const centre = c.get('centre');
  const db = getDatabase();

  const notifications = await db.all(
    `SELECT * FROM notifications WHERE user_id = ? AND centre_id = ? ORDER BY created_at DESC LIMIT 50`,
    [user.id, centre.id]
  );

  const unreadCount = await db.get(
    `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND centre_id = ? AND is_read = 0`,
    [user.id, centre.id]
  )?.count || 0;

  return c.json({ notifications, unreadCount });
});

// Mark Notification as Read
noticeRoutes.post('/notifications/:id/read', requireAuth(), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = getDatabase();

  await db.run("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [id, user.id]);
  return c.json({ success: true });
});
