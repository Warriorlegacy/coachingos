// server/crypto.js - Universal Edge & Node Cryptographic Utilities
import crypto from 'node:crypto';

const DEFAULT_SECRET = process.env.SESSION_SECRET || 'coachingos-dev-session-secret-must-be-changed-in-production-32chars';

export function hashPassword(password, salt = null) {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 10000, 64, 'sha512').toString('hex');
  return `${actualSalt}:${hash}`;
}

export function verifyPassword(password, combinedHash) {
  if (!combinedHash || !combinedHash.includes(':')) return false;
  const [salt, originalHash] = combinedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
}

export function generateToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateId(prefix = 'id') {
  const rand = crypto.randomBytes(12).toString('hex');
  return `${prefix}_${rand}`;
}

export function signSession(payload, secret = DEFAULT_SECRET) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifySession(token, secret = DEFAULT_SECRET) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const jsonStr = Buffer.from(data, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr);
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}
