// server/routes/fees.js - Decimal-Safe Fees, Invoicing & Receipts
import { Hono } from 'hono';
import { getDatabase } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateId } from '../crypto.js';

export const feeRoutes = new Hono();

// Fee Heads
feeRoutes.get('/heads', requireAuth(), async (c) => {
  const centre = c.get('centre');
  const db = getDatabase();
  const heads = await db.all("SELECT * FROM fee_heads WHERE centre_id = ? ORDER BY name ASC", [centre.id]);
  return c.json({ heads });
});

feeRoutes.post('/heads', requireAuth(), requireRole(['centre_owner', 'centre_admin', 'accountant']), async (c) => {
  const centre = c.get('centre');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));
  const { name, isRecurring = 0, defaultAmountCents = 0 } = body;

  if (!name || typeof name !== 'string') {
    return c.json({ error: 'Fee head name is required', code: 'INVALID_INPUT' }, 400);
  }

  const existing = await db.get("SELECT id FROM fee_heads WHERE centre_id = ? AND name = ?", [centre.id, name.trim()]);
  if (existing) {
    return c.json({ error: `Fee head "${name}" already exists`, code: 'DUPLICATE_FEE_HEAD' }, 409);
  }

  const headId = generateId('fh');
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO fee_heads (id, centre_id, name, is_recurring, default_amount_cents, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [headId, centre.id, name.trim(), isRecurring ? 1 : 0, Math.max(0, Math.floor(Number(defaultAmountCents))), now]
  );

  const head = await db.get("SELECT * FROM fee_heads WHERE id = ?", [headId]);
  return c.json({ head }, 201);
});

// List Invoices (with decimal-safe balance calculations)
feeRoutes.get('/invoices', requireAuth(), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const membership = c.get('membership');
  const db = getDatabase();

  const studentId = c.req.query('studentId');
  const status = c.req.query('status');

  let sql = `
    SELECT inv.*, s.admission_no, s.first_name, s.last_name, s.grade_level,
           (inv.total_cents - inv.paid_cents) AS balance_cents
    FROM invoices inv
    JOIN students s ON s.id = inv.student_id
    WHERE inv.centre_id = ?
  `;
  const params = [centre.id];

  // RBAC Filter: Guardians only see linked students; Students only see self
  if (membership.role === 'parent_guardian') {
    sql += ` AND s.id IN (
      SELECT sg.student_id FROM student_guardians sg
      JOIN guardians g ON g.id = sg.guardian_id
      WHERE g.user_id = ?
    )`;
    params.push(user.id);
  } else if (membership.role === 'student') {
    sql += ` AND s.user_id = ?`;
    params.push(user.id);
  }

  if (studentId) {
    sql += ` AND inv.student_id = ?`;
    params.push(studentId);
  }
  if (status && status !== 'all') {
    sql += ` AND inv.status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY inv.due_date DESC`;
  const invoices = await db.all(sql, params);

  return c.json({ invoices });
});

// Create Invoice
feeRoutes.post('/invoices', requireAuth(), requireRole(['centre_owner', 'centre_admin', 'accountant']), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));

  const { studentId, dueDate, items, discountCents = 0, discountReason } = body;
  if (!studentId || !dueDate || !Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'studentId, dueDate, and items array are required', code: 'INVALID_INPUT' }, 400);
  }

  const student = await db.get("SELECT id, admission_no FROM students WHERE id = ? AND centre_id = ?", [studentId, centre.id]);
  if (!student) {
    return c.json({ error: 'Student not found', code: 'NOT_FOUND' }, 404);
  }

  // Calculate subtotal in integer minor units (paise / cents)
  let subtotalCents = 0;
  for (const item of items) {
    const amt = Math.max(0, Math.floor(Number(item.amountCents || item.amount_cents || 0)));
    subtotalCents += amt;
  }

  const disc = Math.max(0, Math.floor(Number(discountCents)));
  const totalCents = Math.max(0, subtotalCents - disc);

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const invId = generateId('inv');

  // Generate unique sequential invoice number
  const countRow = await db.get("SELECT COUNT(*) AS count FROM invoices WHERE centre_id = ?", [centre.id]);
  const seq = (countRow?.count || 0) + 1;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;

  await db.run(
    `INSERT INTO invoices (id, centre_id, invoice_number, student_id, issue_date, due_date, subtotal_cents, discount_cents, discount_reason, total_cents, paid_cents, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'unpaid', ?)`,
    [invId, centre.id, invoiceNumber, studentId, today, dueDate, subtotalCents, disc, discountReason || null, totalCents, now]
  );

  for (const item of items) {
    const amt = Math.max(0, Math.floor(Number(item.amountCents || item.amount_cents || 0)));
    await db.run(
      `INSERT INTO invoice_items (id, invoice_id, fee_head_id, description, amount_cents)
       VALUES (?, ?, ?, ?, ?)`,
      [generateId('ii'), invId, item.feeHeadId || null, item.description || 'Fee Item', amt]
    );
  }

  await db.run(
    `INSERT INTO audit_events (id, centre_id, actor_user_id, event_type, entity_type, entity_id, new_values_json, created_at)
     VALUES (?, ?, ?, 'invoice.created', 'invoice', ?, ?, ?)`,
    [generateId('aud'), centre.id, user.id, invId, JSON.stringify({ invoiceNumber, totalCents, studentId }), now]
  );

  const invoice = await db.get("SELECT * FROM invoices WHERE id = ?", [invId]);
  return c.json({ invoice }, 201);
});

// Record Manual Payment Entry (Cash, UPI Ref, Bank Transfer) & Generate Receipt
feeRoutes.post('/payments', requireAuth(), requireRole(['centre_owner', 'centre_admin', 'accountant']), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const db = getDatabase();
  const body = await c.req.json().catch(() => ({}));

  const { invoiceId, amountCents, paymentMode, referenceNote, paymentDate } = body;
  if (!invoiceId || !amountCents || !paymentMode) {
    return c.json({ error: 'invoiceId, amountCents, and paymentMode are required', code: 'INVALID_INPUT' }, 400);
  }

  const validModes = ['cash', 'upi_ref', 'bank_transfer', 'cheque', 'external_card'];
  if (!validModes.includes(paymentMode)) {
    return c.json({ error: `paymentMode must be one of: ${validModes.join(', ')}`, code: 'INVALID_PAYMENT_MODE' }, 400);
  }

  const invoice = await db.get("SELECT * FROM invoices WHERE id = ? AND centre_id = ?", [invoiceId, centre.id]);
  if (!invoice) {
    return c.json({ error: 'Invoice not found', code: 'NOT_FOUND' }, 404);
  }

  const payAmt = Math.max(0, Math.floor(Number(amountCents)));
  if (payAmt <= 0) {
    return c.json({ error: 'Payment amount must be greater than zero', code: 'INVALID_AMOUNT' }, 400);
  }

  const remainingBalance = invoice.total_cents - invoice.paid_cents;
  if (payAmt > remainingBalance) {
    return c.json({
      error: `Payment amount (${payAmt}) exceeds outstanding invoice balance (${remainingBalance})`,
      code: 'EXCEEDS_BALANCE'
    }, 400);
  }

  const now = new Date().toISOString();
  const payDate = paymentDate || now.slice(0, 10);
  const payId = generateId('pay');

  // Insert Payment Entry
  await db.run(
    `INSERT INTO payment_entries (id, centre_id, invoice_id, student_id, payment_date, amount_cents, payment_mode, reference_note, recorded_by_user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [payId, centre.id, invoiceId, invoice.student_id, payDate, payAmt, paymentMode, referenceNote || null, user.id, now]
  );

  // Reconcile Invoice Paid Cents & Status
  const newPaidCents = invoice.paid_cents + payAmt;
  const newStatus = newPaidCents >= invoice.total_cents ? 'paid' : 'partially_paid';

  await db.run(
    `UPDATE invoices SET paid_cents = ?, status = ? WHERE id = ?`,
    [newPaidCents, newStatus, invoiceId]
  );

  // Generate Receipt
  const receiptCount = await db.get("SELECT COUNT(*) AS count FROM receipts WHERE centre_id = ?", [centre.id]);
  const seq = (receiptCount?.count || 0) + 1;
  const receiptNumber = `RCP-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
  const receiptId = generateId('rcp');

  await db.run(
    `INSERT INTO receipts (id, centre_id, receipt_number, payment_entry_id, student_id, issued_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [receiptId, centre.id, receiptNumber, payId, invoice.student_id, now]
  );

  // Audit event
  await db.run(
    `INSERT INTO audit_events (id, centre_id, actor_user_id, event_type, entity_type, entity_id, new_values_json, reason, created_at)
     VALUES (?, ?, ?, 'payment.recorded', 'payment_entry', ?, ?, 'Manual payment recorded', ?)`,
    [generateId('aud'), centre.id, user.id, payId, JSON.stringify({ amountCents: payAmt, paymentMode, receiptNumber }), now]
  );

  return c.json({
    success: true,
    paymentId: payId,
    receiptId,
    receiptNumber,
    newPaidCents,
    newStatus,
    disclaimer: 'Notice: Manual payment recording is an administrative ledger entry, not a payment gateway transaction.',
  }, 201);
});

// View Receipt
feeRoutes.get('/receipts/:id', requireAuth(), async (c) => {
  const centre = c.get('centre');
  const user = c.get('user');
  const membership = c.get('membership');
  const receiptId = c.req.param('id');
  const db = getDatabase();

  const receipt = await db.get(
    `SELECT r.*, p.amount_cents, p.payment_date, p.payment_mode, p.reference_note,
            s.admission_no, s.first_name, s.last_name, s.grade_level,
            inv.invoice_number, inv.total_cents, inv.paid_cents
     FROM receipts r
     JOIN payment_entries p ON p.id = r.payment_entry_id
     JOIN students s ON s.id = r.student_id
     JOIN invoices inv ON inv.id = p.invoice_id
     WHERE r.id = ? AND r.centre_id = ?`,
    [receiptId, centre.id]
  );

  if (!receipt) {
    return c.json({ error: 'Receipt not found', code: 'NOT_FOUND' }, 404);
  }

  // RBAC Check for Parent/Student
  if (membership.role === 'parent_guardian') {
    const isLinked = await db.get(
      `SELECT 1 FROM student_guardians sg
       JOIN guardians g ON g.id = sg.guardian_id
       WHERE sg.student_id = ? AND g.user_id = ?`,
      [receipt.student_id, user.id]
    );
    if (!isLinked) return c.json({ error: 'Access denied', code: 'FORBIDDEN' }, 403);
  } else if (membership.role === 'student') {
    const stu = await db.get("SELECT id FROM students WHERE user_id = ?", [user.id]);
    if (!stu || stu.id !== receipt.student_id) return c.json({ error: 'Access denied', code: 'FORBIDDEN' }, 403);
  }

  return c.json({ receipt, centre });
});
