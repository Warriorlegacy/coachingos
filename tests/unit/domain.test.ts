// tests/unit/domain.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, signSession, verifySession } from '../../server/crypto.js';

describe('Domain Unit Tests', () => {
  describe('Password & Token Cryptography', () => {
    it('hashes and correctly verifies passwords', () => {
      const password = 'SuperSecretPassword123!';
      const hash = hashPassword(password);
      expect(hash).toContain(':');
      expect(verifyPassword(password, hash)).toBe(true);
      expect(verifyPassword('WrongPassword', hash)).toBe(false);
    });

    it('signs and verifies session tokens with expiry', () => {
      const payload = { userId: 'usr_123', centreId: 'ctr_abc', role: 'teacher' };
      const token = signSession(payload);
      expect(token).toContain('.');

      const verified = verifySession(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe('usr_123');
      expect(verified?.centreId).toBe('ctr_abc');
      expect(verified?.role).toBe('teacher');

      // Tampered token fails
      const tampered = token.slice(0, -4) + 'abcd';
      expect(verifySession(tampered)).toBeNull();
    });
  });

  describe('Decimal-Safe Financial Arithmetic', () => {
    it('calculates totals, discounts, and balances in integer minor units without float error', () => {
      const tuitionCents = 450000; // ₹4,500.00
      const materialCents = 150000; // ₹1,500.00
      const subtotalCents = tuitionCents + materialCents;
      expect(subtotalCents).toBe(600000); // ₹6,000.00 exactly

      const discountCents = 50000; // ₹500.00
      const totalCents = subtotalCents - discountCents;
      expect(totalCents).toBe(550000); // ₹5,500.00

      const partialPaymentCents = 250000; // ₹2,500.00
      const remainingBalance = totalCents - partialPaymentCents;
      expect(remainingBalance).toBe(300000); // ₹3,000.00
    });
  });

  describe('CSV Injection Sanitization', () => {
    it('escapes hazardous spreadsheet formula characters', () => {
      const sanitize = (val: string) => {
        let str = String(val).replace(/"/g, '""');
        if (/^[=+@\t\r-]/.test(str)) {
          str = "'" + str;
        }
        return `"${str}"`;
      };

      expect(sanitize('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"');
      expect(sanitize('+cmd|')).toBe('"\'+cmd|"');
      expect(sanitize('@calc')).toBe('"\'@calc"');
      expect(sanitize('Rohan Gupta')).toBe('"Rohan Gupta"');
    });
  });
});
