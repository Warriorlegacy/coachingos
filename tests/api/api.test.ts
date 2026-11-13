// tests/api/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../server/app.js';
import { initDatabase, _resetDatabaseForTesting } from '../../server/db.js';
import { seedDemoData } from '../../server/seed.js';

describe('CoachingOS API Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    _resetDatabaseForTesting();
    const db = await initDatabase(':memory:');
    seedDemoData(db);
    app = createApp();
  });

  afterAll(() => {
    _resetDatabaseForTesting();
  });

  describe('1. Health & Integration Endpoints', () => {
    it('returns 200 and healthy status from /api/v1/health', async () => {
      const res = await app.request('/api/v1/health');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('healthy');
      expect(data.app).toBe('CoachingOS');
      expect(data.database.ready).toBe(true);
    });

    it('reports truthful integration status without fake claims', async () => {
      const res = await app.request('/api/v1/integrations');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.payments.gatewayConfigured).toBe(false);
      expect(data.payments.disclaimer).toContain('Manual payment recording');
      expect(data.database.driver).toContain('SQLite');
    });
  });

  describe('2. Authentication & Demo Persona Login', () => {
    it('allows 1-click demo login for centre_owner and sets session cookie', async () => {
      const res = await app.request('/api/v1/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'centre_owner' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.role).toBe('centre_owner');
      expect(data.user.email).toBe('owner@coachingos.demo');
      expect(data.activeCentre.code).toBe('apex-academy');
      expect(data.csrfToken).toBeDefined();

      const cookie = res.headers.get('set-cookie');
      expect(cookie).toContain('coachingos_session=');
    });

    it('allows 1-click demo login for teacher role', async () => {
      const res = await app.request('/api/v1/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'teacher' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.role).toBe('teacher');
      expect(data.user.name).toBe('Vikram Sen');
    });
  });

  describe('3. Student Management & Guardian IDOR Protection', () => {
    let ownerToken: string;
    let guardianToken: string;

    beforeAll(async () => {
      const ownerRes = await app.request('/api/v1/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'centre_owner' }),
      });
      const ownerData = await ownerRes.json();
      ownerToken = ownerData.sessionToken;

      const parentRes = await app.request('/api/v1/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'parent_guardian' }),
      });
      const parentData = await parentRes.json();
      guardianToken = parentData.sessionToken;
    });

    it('owner can list all students in centre', async () => {
      const res = await app.request('/api/v1/students', {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.students.length).toBeGreaterThanOrEqual(6);
    });

    it('guardian can only access linked child (Rohan Gupta) and is blocked from unlinked students', async () => {
      // Rohan Gupta is linked (stu_01)
      const resLinked = await app.request('/api/v1/students/stu_01', {
        headers: { Authorization: `Bearer ${guardianToken}` },
      });
      expect(resLinked.status).toBe(200);
      const linkedData = await resLinked.json();
      expect(linkedData.student.first_name).toBe('Rohan');

      // Aarav Mehra is NOT linked (stu_02) -> Must be 403 Forbidden!
      const resUnlinked = await app.request('/api/v1/students/stu_02', {
        headers: { Authorization: `Bearer ${guardianToken}` },
      });
      expect(resUnlinked.status).toBe(403);
    });

    it('rejects student creation with duplicate admission number', async () => {
      const res = await app.request('/api/v1/students', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admissionNo: 'APEX-2026-001', // Already exists in seed
          firstName: 'Duplicate',
          lastName: 'Student',
          gradeLevel: 'Grade 10',
        }),
      });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.code).toBe('DUPLICATE_ADMISSION_NO');
    });
  });

  describe('4. Attendance Taking, Audit Trails & Corrections', () => {
    let teacherToken: string;

    beforeAll(async () => {
      const teacherRes = await app.request('/api/v1/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'teacher' }),
      });
      const teacherData = await teacherRes.json();
      teacherToken = teacherData.sessionToken;
    });

    it('submits attendance records and returns session ID', async () => {
      const res = await app.request('/api/v1/attendance/submit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${teacherToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchId: 'btc_math_10',
          date: '2026-11-20',
          period: 'Period 2',
          records: [
            { studentId: 'stu_01', status: 'present' },
            { studentId: 'stu_02', status: 'late', remarks: 'Bus breakdown' },
          ],
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isNew).toBe(true);
    });

    it('requires a mandatory edit reason when correcting an existing attendance record', async () => {
      // Missing editReason should fail with 400 REASON_REQUIRED
      const resFail = await app.request('/api/v1/attendance/records/rec_01', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${teacherToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'absent',
          editReason: '',
        }),
      });
      expect(resFail.status).toBe(400);

      // Valid edit with reason creates audit log
      const resPass = await app.request('/api/v1/attendance/records/rec_01', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${teacherToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'excused',
          editReason: 'Parent submitted doctor consultation slip',
        }),
      });
      expect(resPass.status).toBe(200);
      const data = await resPass.json();
      expect(data.record.status).toBe('excused');
    });
  });

  describe('5. Homework & Grading Range Validation', () => {
    let teacherToken: string;

    beforeAll(async () => {
      const teacherRes = await app.request('/api/v1/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'teacher' }),
      });
      const teacherData = await teacherRes.json();
      teacherToken = teacherData.sessionToken;
    });

    it('rejects homework score higher than max_points', async () => {
      // hw_01 max points is 50
      const res = await app.request('/api/v1/homework/hw_01/grade', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${teacherToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: 'sub_01',
          score: 95, // Exceeds 50
          feedback: 'Too generous',
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('SCORE_OUT_OF_RANGE');
    });
  });

  describe('6. Assessment Marks Entry & Validation', () => {
    let teacherToken: string;

    beforeAll(async () => {
      const teacherRes = await app.request('/api/v1/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'teacher' }),
      });
      const teacherData = await teacherRes.json();
      teacherToken = teacherData.sessionToken;
    });

    it('rejects test scores greater than max_marks', async () => {
      // asm_01 max_marks is 100
      const res = await app.request('/api/v1/assessments/asm_01/scores', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${teacherToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scores: [{ studentId: 'stu_01', marksObtained: 120 }],
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('MARKS_OUT_OF_RANGE');
    });
  });

  describe('7. Fee Ledger, Invoices & Receipt Generation', () => {
    let accountantToken: string;

    beforeAll(async () => {
      const accountantRes = await app.request('/api/v1/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'accountant' }),
      });
      const accountantData = await accountantRes.json();
      accountantToken = accountantData.sessionToken;
    });

    it('records partial payment, updates invoice status, and issues receipt', async () => {
      // inv_02 has balance of 200000 cents (₹2,000)
      const res = await app.request('/api/v1/fees/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accountantToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: 'inv_02',
          amountCents: 200000,
          paymentMode: 'bank_transfer',
          referenceNote: 'NEFT transfer Ref 88291039',
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.newStatus).toBe('paid');
      expect(data.receiptNumber).toMatch(/^RCP-\d{4}-\d{4}$/);
      expect(data.disclaimer).toContain('Manual payment recording');
    });
  });

  describe('8. CSV Bulk Student Import Preview & Dry Run', () => {
    let ownerToken: string;

    beforeAll(async () => {
      const ownerRes = await app.request('/api/v1/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'centre_owner' }),
      });
      const ownerData = await ownerRes.json();
      ownerToken = ownerData.sessionToken;
    });

    it('validates CSV rows, detects duplicate admission numbers, and reports errors without inserting', async () => {
      const csv = `admission_no,first_name,last_name,grade_level
APEX-2026-001,Duplicate,Person,Grade 10
APEX-2026-999,Fresh,Student,Grade 11`;

      const res = await app.request('/api/v1/students/import-csv', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvContent: csv, dryRun: true }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.dryRun).toBe(true);
      expect(data.errorCount).toBe(1);
      expect(data.errors[0].error).toContain('already exists');
      expect(data.validCount).toBe(1);
    });
  });
});
