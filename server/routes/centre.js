// server/routes/centre.js
import { Hono } from 'hono';
import { getDatabase } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateId } from '../crypto.js';
import { seedDemoData } from '../seed.js';

export const centreRoutes = new Hono();

// Centre Details & Settings
centreRoutes.get('/', requireAuth(), async (c) => {
  const centre = c.get('centre');
  const db = getDatabase();

  const sessions = await db.all("SELECT * FROM academic_sessions WHERE centre_id = ? ORDER BY start_date DESC", [centre.id]);
  const subjects = await db.all("SELECT * FROM subjects WHERE centre_id = ? ORDER BY name ASC", [centre.id]);
  const retentionRules = await db.get("SELECT * FROM data_retention_rules WHERE centre_id = ?", [centre.id]);

  return c.json({
    centre,
    sessions,
    subjects,
    retentionRules: retentionRules || { retention_years: 5, auto_archive_graduated: 1 },
  });
});

// Update Centre Settings
centreRoutes.put('/', requireAuth(), requireRole(['centre_owner', 'centre_admin']), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const { name, phone, email, address, timezone, currency, locale } = body;
  const db = getDatabase();
  const now = new Date().toISOString();

  await db.run(
    `UPDATE centres
     SET name = COALESCE(?, name),
         phone = COALESCE(?, phone),
         email = COALESCE(?, email),
         address = COALESCE(?, address),
         timezone = COALESCE(?, timezone),
         currency = COALESCE(?, currency),
         locale = COALESCE(?, locale),
         updated_at = ?
     WHERE id = ?`,
    [name, phone, email, address, timezone, currency, locale, now, centre.id]
  );

  await db.run(
    `INSERT INTO audit_events (id, centre_id, actor_user_id, event_type, entity_type, entity_id, new_values_json, created_at)
     VALUES (?, ?, ?, 'centre.updated', 'centre', ?, ?, ?)`,
    [generateId('aud'), centre.id, user.id, centre.id, JSON.stringify(body), now]
  );

  const updated = await db.get("SELECT * FROM centres WHERE id = ?", [centre.id]);
  return c.json({ success: true, centre: updated });
});

// Staff Directory
centreRoutes.get('/staff', requireAuth(), async (c) => {
  const centre = c.get('centre');
  const db = getDatabase();

  const staff = await db.all(
    `SELECT u.id, u.name, u.email, u.phone, m.role, m.status, m.created_at AS joined_at
     FROM memberships m
     JOIN users u ON u.id = m.user_id
     WHERE m.centre_id = ? AND m.role IN ('centre_owner', 'centre_admin', 'teacher', 'accountant')
     ORDER BY u.name ASC`,
    [centre.id]
  );

  return c.json({ staff });
});

// Re-seed demo data endpoint
centreRoutes.post('/seed-demo', requireAuth(), requireRole(['centre_owner']), async (c) => {
  const db = getDatabase();
  seedDemoData(db);
  return c.json({ success: true, message: 'Demo data loaded successfully' });
});
