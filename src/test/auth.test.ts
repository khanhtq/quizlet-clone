import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hashPassword, verifyPassword, signSessionToken, verifySessionToken } from '@/server/auth/session';
import { checkRateLimit, resetRateLimit } from '@/server/auth/rate-limit';
import { register, login } from '@/server/auth';
import { nanoid } from 'nanoid';

const mockCookieStore = new Map<string, { value: string }>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => mockCookieStore.get(name),
    set: (name: string, value: string) => mockCookieStore.set(name, { value }),
    delete: (name: string) => mockCookieStore.delete(name),
  }),
  headers: async () => new Headers(),
}));

describe('Auth Unit & Integration Tests', () => {
  describe('Password Hashing', () => {
    it('should hash and verify passwords correctly', async () => {
      const password = 'mySecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword('wrongPassword', hash)).toBe(false);
    });
  });

  describe('JWT Session Tokens', () => {
    it('should create and verify valid session tokens', async () => {
      const payload = { userId: 'user_123', email: 'test@example.com' };
      const token = await signSessionToken(payload);

      expect(typeof token).toBe('string');
      const verified = await verifySessionToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(payload.userId);
      expect(verified?.email).toBe(payload.email);
    });

    it('should return null for invalid or tampered tokens', async () => {
      const verified = await verifySessionToken('invalid.jwt.token');
      expect(verified).toBeNull();
    });
  });

  describe('Database Rate Limiter', () => {
    const testKey = 'test_rate_limit_key';

    beforeEach(async () => {
      await resetRateLimit(testKey);
    });

    it('should allow up to the limit and then block', async () => {
      const limit = 3;
      const windowMs = 60000;

      // Attempt 1
      const res1 = await checkRateLimit(testKey, limit, windowMs);
      expect(res1.success).toBe(true);
      expect(res1.remaining).toBe(2);

      // Attempt 2
      const res2 = await checkRateLimit(testKey, limit, windowMs);
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(1);

      // Attempt 3
      const res3 = await checkRateLimit(testKey, limit, windowMs);
      expect(res3.success).toBe(true);
      expect(res3.remaining).toBe(0);

      // Attempt 4 (Blocked)
      const res4 = await checkRateLimit(testKey, limit, windowMs);
      expect(res4.success).toBe(false);
      expect(res4.remaining).toBe(0);

      // Reset
      await resetRateLimit(testKey);
      const res5 = await checkRateLimit(testKey, limit, windowMs);
      expect(res5.success).toBe(true);
      expect(res5.remaining).toBe(2);
    });
  });

  describe('Register and Login Flows', () => {
    let email: string;
    const password = 'StrongPassword123!';
    let ip: string;

    beforeEach(async () => {
      ip = `192.168.1.${nanoid(4)}`;
      email = `testuser_${nanoid(6)}@example.com`;
      await resetRateLimit(`signup:${ip}`);
    });

    it('should register a new user successfully', async () => {
      const res = await register({ email, password }, ip);
      expect(res.success).toBe(true);
      expect(res.user?.email).toBe(email.toLowerCase());
      expect(mockCookieStore.get('quizlet_session')?.value).toBeDefined();
    });

    it('should prevent duplicate email registration', async () => {
      // First registration
      await register({ email, password }, ip);
      // Second registration should fail
      const res = await register({ email, password }, ip);
      expect(res.success).toBe(false);
      expect(res.error).toContain('đã được sử dụng');
    });

    it('should reject weak password', async () => {
      const res = await register({ email: 'new@example.com', password: '123' }, ip);
      expect(res.success).toBe(false);
      expect(res.error).toContain('8 ký tự');
    });

    it('should login with correct credentials', async () => {
      await register({ email, password }, ip);
      const res = await login({ email, password }, ip);
      expect(res.success).toBe(true);
      expect(res.user?.email).toBe(email.toLowerCase());
    });

    it('should reject wrong password with generic error', async () => {
      await register({ email, password }, ip);
      const res = await login({ email, password: 'WrongPassword!' }, ip);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Email hoặc mật khẩu không chính xác.');
    });

    it('should rate-limit login after 5 failed attempts', async () => {
      const testEmail = `ratelimit_${nanoid(6)}@example.com`;
      const testIp = '10.0.0.99';

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        const res = await login({ email: testEmail, password: 'wrong' }, testIp);
        expect(res.success).toBe(false);
      }

      // 6th attempt should hit rate limit
      const blockedRes = await login({ email: testEmail, password: 'wrong' }, testIp);
      expect(blockedRes.success).toBe(false);
      expect(blockedRes.error).toContain('quá 5 lần');
    });
  });
});
