// server/routes/auth.js
import { Hono } from 'hono';
import { getDatabase } from '../db.js';
import { verifyPassword, signSession, generateToken } from '../crypto.js';

export const authRoutes = new Hono();

// Regular login
authRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required', code: 'INVALID_INPUT' }, 400);
  }

  const db = getDatabase();
  const user = db.get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return c.json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }, 401);
  }

  // Get user memberships
  const memberships = db.all(
    `SELECT m.id, m.centre_id, m.role, m.status, c.name AS centre_name, c.code, c.currency, c.timezone
     FROM memberships m
     JOIN centres c ON c.id = m.centre_id
     WHERE m.user_id = ? AND m.status = 'active'`,
    [user.id]
  );

  if (memberships.length === 0) {
    return c.json({ error: 'User does not belong to any active centre', code: 'NO_MEMBERSHIP' }, 403);
  }

  const primaryMembership = memberships[0];
  const csrfToken = generateToken(16);
  const sessionToken = signSession({
    userId: user.id,
    centreId: primaryMembership.centre_id,
    role: primaryMembership.role,
    csrfToken,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  c.header('Set-Cookie', `coachingos_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatar_url,
    },
    activeCentre: {
      id: primaryMembership.centre_id,
      name: primaryMembership.centre_name,
      code: primaryMembership.code,
      currency: primaryMembership.currency,
      timezone: primaryMembership.timezone,
    },
    role: primaryMembership.role,
    memberships,
    csrfToken,
    sessionToken,
  });
});

// 1-Click Demo Login for Testing / Sandbox
authRoutes.post('/demo-login', async (c) => {
  const allowDemo = process.env.ALLOW_DEMO !== 'false';
  if (!allowDemo) {
    return c.json({ error: 'Demo login is disabled in this environment', code: 'DEMO_DISABLED' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const targetRole = body.role || 'centre_owner';

  const roleEmailMap = {
    centre_owner: 'owner@coachingos.demo',
    centre_admin: 'admin@coachingos.demo',
    teacher: 'teacher@coachingos.demo',
    student: 'student@coachingos.demo',
    parent_guardian: 'parent@coachingos.demo',
    accountant: 'accountant@coachingos.demo',
  };

  const email = roleEmailMap[targetRole] || roleEmailMap.centre_owner;
  const db = getDatabase();
  const user = db.get("SELECT * FROM users WHERE email = ?", [email]);
  if (!user) {
    return c.json({ error: `Demo user for role ${targetRole} not found. Please seed the database.`, code: 'USER_NOT_FOUND' }, 404);
  }

  const membership = db.get(
    `SELECT m.id, m.centre_id, m.role, m.status, c.name AS centre_name, c.code, c.currency, c.timezone
     FROM memberships m
     JOIN centres c ON c.id = m.centre_id
     WHERE m.user_id = ? AND m.status = 'active'`,
    [user.id]
  );

  const csrfToken = generateToken(16);
  const sessionToken = signSession({
    userId: user.id,
    centreId: membership.centre_id,
    role: membership.role,
    csrfToken,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  c.header('Set-Cookie', `coachingos_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
    },
    activeCentre: {
      id: membership.centre_id,
      name: membership.centre_name,
      code: membership.code,
      currency: membership.currency,
      timezone: membership.timezone,
    },
    role: membership.role,
    csrfToken,
    sessionToken,
  });
});

// Logout
authRoutes.post('/logout', (c) => {
  c.header('Set-Cookie', 'coachingos_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return c.json({ success: true });
});

// Get Current User & Membership
authRoutes.get('/me', (c) => {
  const user = c.get('user');
  const membership = c.get('membership');
  const centre = c.get('centre');
  const csrfToken = c.get('csrfToken');

  if (!user) {
    return c.json({ authenticated: false, user: null }, 200);
  }

  const db = getDatabase();
  const memberships = db.all(
    `SELECT m.id, m.centre_id, m.role, c.name AS centre_name, c.code, c.currency, c.timezone
     FROM memberships m
     JOIN centres c ON c.id = m.centre_id
     WHERE m.user_id = ? AND m.status = 'active'`,
    [user.id]
  );

  return c.json({
    authenticated: true,
    user,
    activeCentre: centre,
    role: membership ? membership.role : null,
    memberships,
    csrfToken,
  });
});
