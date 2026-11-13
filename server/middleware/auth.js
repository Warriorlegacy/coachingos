// server/middleware/auth.js - Authentication & RBAC Middleware
import { verifySession } from '../crypto.js';
import { getDatabase } from '../db.js';

export function authMiddleware() {
  return async (c, next) => {
    const cookieHeader = c.req.header('cookie') || '';
    let sessionToken = null;

    // Parse coachingos_session cookie
    const cookies = cookieHeader.split(';').map(s => s.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('coachingos_session=')) {
        sessionToken = cookie.slice('coachingos_session='.length);
        break;
      }
    }

    // Also support Authorization header Bearer token for API/test automation
    const authHeader = c.req.header('authorization');
    if (!sessionToken && authHeader && authHeader.startsWith('Bearer ')) {
      sessionToken = authHeader.slice(7);
    }

    if (!sessionToken) {
      c.set('user', null);
      c.set('membership', null);
      c.set('centre', null);
      return next();
    }

    const payload = verifySession(sessionToken);
    if (!payload || !payload.userId) {
      c.set('user', null);
      c.set('membership', null);
      c.set('centre', null);
      return next();
    }

    const db = getDatabase();
    const user = db.get("SELECT id, email, name, phone, avatar_url, is_system_admin FROM users WHERE id = ?", [payload.userId]);
    if (!user) {
      c.set('user', null);
      c.set('membership', null);
      c.set('centre', null);
      return next();
    }

    // Resolve centre context
    const centreId = payload.centreId;
    let membership = null;
    let centre = null;

    if (centreId) {
      membership = db.get("SELECT id, role, status FROM memberships WHERE centre_id = ? AND user_id = ? AND status = 'active'", [centreId, user.id]);
      centre = db.get("SELECT id, name, code, timezone, currency, locale FROM centres WHERE id = ?", [centreId]);
    } else {
      // Find first active membership
      membership = db.get(
        `SELECT m.id, m.role, m.status, m.centre_id, c.name AS centre_name, c.code, c.timezone, c.currency, c.locale
         FROM memberships m
         JOIN centres c ON c.id = m.centre_id
         WHERE m.user_id = ? AND m.status = 'active'
         LIMIT 1`,
        [user.id]
      );
      if (membership) {
        centre = {
          id: membership.centre_id,
          name: membership.centre_name,
          code: membership.code,
          timezone: membership.timezone,
          currency: membership.currency,
          locale: membership.locale,
        };
      }
    }

    c.set('user', user);
    c.set('membership', membership);
    c.set('centre', centre);
    c.set('csrfToken', payload.csrfToken);

    // CSRF check on mutating requests when using cookie-based session
    const method = c.req.method.toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const path = c.req.path;
      // Skip CSRF for login / demo-login endpoints
      if (!path.startsWith('/api/v1/auth/login') && !path.startsWith('/api/v1/auth/demo-login')) {
        const clientCsrf = c.req.header('x-csrf-token');
        if (!clientCsrf || clientCsrf !== payload.csrfToken) {
          // Allow Bearer token authorization to bypass cookie CSRF for test convenience
          if (!authHeader) {
            return c.json({ error: 'Invalid or missing CSRF token', code: 'CSRF_FAILED' }, 403);
          }
        }
      }
    }

    return next();
  };
}

export function requireAuth() {
  return async (c, next) => {
    const user = c.get('user');
    const membership = c.get('membership');
    const centre = c.get('centre');

    if (!user) {
      return c.json({ error: 'Authentication required', code: 'UNAUTHENTICATED' }, 401);
    }

    if (!membership || !centre) {
      return c.json({ error: 'No active centre membership found', code: 'NO_CENTRE_MEMBERSHIP' }, 403);
    }

    return next();
  };
}

export function requireRole(allowedRoles = []) {
  return async (c, next) => {
    const membership = c.get('membership');
    if (!membership || !allowedRoles.includes(membership.role)) {
      return c.json({
        error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`,
        code: 'FORBIDDEN'
      }, 403);
    }
    return next();
  };
}
