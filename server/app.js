// server/app.js - CoachingOS Main Application
import { Hono } from 'hono';
import { securityHeaders } from './middleware/security.js';
import { authMiddleware } from './middleware/auth.js';
import { getDatabaseStatus } from './db.js';

import { authRoutes } from './routes/auth.js';
import { centreRoutes } from './routes/centre.js';
import { studentRoutes } from './routes/students.js';
import { batchRoutes } from './routes/batches.js';
import { attendanceRoutes } from './routes/attendance.js';
import { homeworkRoutes } from './routes/homework.js';
import { assessmentRoutes } from './routes/assessments.js';
import { feeRoutes } from './routes/fees.js';
import { noticeRoutes } from './routes/notices.js';
import { aiRoutes } from './routes/ai.js';
import { reportRoutes } from './routes/reports.js';
import { integrationRoutes } from './routes/integrations.js';

export function createApp() {
  const app = new Hono();

  // Middleware
  app.use('*', securityHeaders());
  app.use('*', authMiddleware());

  // Health Endpoint
  app.get('/api/v1/health', (c) => {
    const status = getDatabaseStatus();
    return c.json({
      status: 'healthy',
      app: 'CoachingOS',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: status,
    });
  });

  // Mount API Routes
  app.route('/api/v1/auth', authRoutes);
  app.route('/api/v1/centre', centreRoutes);
  app.route('/api/v1/students', studentRoutes);
  app.route('/api/v1/batches', batchRoutes);
  app.route('/api/v1/attendance', attendanceRoutes);
  app.route('/api/v1/homework', homeworkRoutes);
  app.route('/api/v1/assessments', assessmentRoutes);
  app.route('/api/v1/fees', feeRoutes);
  app.route('/api/v1/notices', noticeRoutes);
  app.route('/api/v1/ai', aiRoutes);
  app.route('/api/v1/reports', reportRoutes);
  app.route('/api/v1/integrations', integrationRoutes);

  return app;
}
