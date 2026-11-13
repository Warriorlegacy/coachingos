// server/middleware/security.js - Production Security Headers & Protection
import crypto from 'node:crypto';

export function securityHeaders() {
  return async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set('requestId', requestId);

    await next();

    // Standard production security headers
    c.header('X-Request-Id', requestId);
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
    );
  };
}
