// server/routes/reports.js
import { Hono } from 'hono';
import { getDatabase } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const reportRoutes = new Hono();

// Centre Executive KPI Summary
reportRoutes.get('/summary', requireAuth(), (c) => {
  const centre = c.get('centre');
  const db = getDatabase();

  const studentCounts = db.get(
    `SELECT 
       COUNT(*) AS total_students,
       SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_students
     FROM students WHERE centre_id = ?`,
    [centre.id]
  );

  const batchCount = db.get("SELECT COUNT(*) AS total_batches FROM batches WHERE centre_id = ? AND status = 'active'", [centre.id]);

  const attSummary = db.get(
    `SELECT 
       COUNT(*) AS total_records,
       SUM(CASE WHEN ar.status IN ('present', 'late') THEN 1 ELSE 0 END) AS attended_records
     FROM attendance_records ar
     JOIN attendance_sessions s ON s.id = ar.session_id
     WHERE s.centre_id = ?`,
    [centre.id]
  );

  const feeSummary = db.get(
    `SELECT 
       SUM(total_cents) AS total_invoiced_cents,
       SUM(paid_cents) AS total_collected_cents,
       SUM(total_cents - paid_cents) AS total_outstanding_cents
     FROM invoices WHERE centre_id = ? AND status != 'cancelled'`,
    [centre.id]
  );

  const hwSummary = db.get(
    `SELECT 
       COUNT(DISTINCT a.id) AS total_assignments,
       COUNT(DISTINCT sub.id) AS total_submissions
     FROM assignments a
     LEFT JOIN submissions sub ON sub.assignment_id = a.id
     WHERE a.centre_id = ?`,
    [centre.id]
  );

  const totalAtt = Number(attSummary?.total_records || 0);
  const attended = Number(attSummary?.attended_records || 0);
  const attRate = totalAtt > 0 ? Math.round((attended / totalAtt) * 100) : 100;

  return c.json({
    students: {
      total: studentCounts?.total_students || 0,
      active: studentCounts?.active_students || 0,
    },
    batches: batchCount?.total_batches || 0,
    attendanceRate: attRate,
    fees: {
      invoicedCents: Number(feeSummary?.total_invoiced_cents || 0),
      collectedCents: Number(feeSummary?.total_collected_cents || 0),
      outstandingCents: Number(feeSummary?.total_outstanding_cents || 0),
    },
    homework: {
      assignments: hwSummary?.total_assignments || 0,
      submissions: hwSummary?.total_submissions || 0,
    },
  });
});

// Audit Log Events (Owner / Admin only)
reportRoutes.get('/audit-log', requireAuth(), requireRole(['centre_owner', 'centre_admin']), (c) => {
  const centre = c.get('centre');
  const db = getDatabase();

  const events = db.all(
    `SELECT ae.*, u.name AS actor_name, u.email AS actor_email
     FROM audit_events ae
     JOIN users u ON u.id = ae.actor_user_id
     WHERE ae.centre_id = ?
     ORDER BY ae.created_at DESC LIMIT 100`,
    [centre.id]
  );

  return c.json({ events });
});
