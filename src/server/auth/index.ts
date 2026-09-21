import { cookies } from 'next/headers';
import { db, users, userSettings } from '@/server/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  sessionCookieConfig,
  SessionPayload,
} from './session';
import { checkRateLimit, resetRateLimit } from './rate-limit';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'Email không hợp lệ' }),
  password: z
    .string()
    .min(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
    .max(100, { message: 'Mật khẩu không được quá 100 ký tự' }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'Email không hợp lệ' }),
  password: z.string().min(1, { message: 'Vui lòng nhập mật khẩu' }),
});

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
  };
}

export async function register(
  input: z.infer<typeof registerSchema>,
  clientIp = 'unknown'
): Promise<AuthResult> {
  const allowSignup = process.env.ALLOW_SIGNUP !== 'false';
  if (!allowSignup) {
    return {
      success: false,
      error: 'Tính năng đăng ký tài khoản mới hiện đang tạm khóa.',
    };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.',
    };
  }

  const { email, password } = parsed.data;

  // Rate limit signup by IP: max 5 signups per 15 minutes
  const signupRate = await checkRateLimit(`signup:${clientIp}`, 5, 15 * 60 * 1000);
  if (!signupRate.success) {
    return {
      success: false,
      error: 'Bạn đã thực hiện quá nhiều lượt đăng ký. Vui lòng thử lại sau ít phút.',
    };
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    return {
      success: false,
      error: 'Email này đã được sử dụng.',
    };
  }

  const passwordHash = await hashPassword(password);
  const userId = nanoid();
  const now = Date.now();

  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    createdAt: now,
  });

  await db.insert(userSettings).values({
    userId,
    theme: 'system',
    meaningLanguage: 'both',
    newCardsPerDay: 20,
    timezone: 'Asia/Ho_Chi_Minh',
    ttsAutoplay: false,
    defaultDirection: 'term',
  });

  const token = await signSessionToken({ userId, email });
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieConfig.name, token, sessionCookieConfig.options);

  return {
    success: true,
    user: { id: userId, email },
  };
}

export async function login(
  input: z.infer<typeof loginSchema>,
  clientIp = 'unknown'
): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.',
    };
  }

  const { email, password } = parsed.data;
  const rateLimitKey = `login:${clientIp}:${email}`;

  // 5 attempts per minute per IP+email
  const rateResult = await checkRateLimit(rateLimitKey, 5, 60 * 1000);
  if (!rateResult.success) {
    return {
      success: false,
      error: 'Đã thử đăng nhập sai quá 5 lần. Vui lòng thử lại sau 1 phút.',
    };
  }

  const user = await db.select().from(users).where(eq(users.email, email)).get();
  if (!user) {
    // Generic error, do not reveal if email exists
    return {
      success: false,
      error: 'Email hoặc mật khẩu không chính xác.',
    };
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    return {
      success: false,
      error: 'Email hoặc mật khẩu không chính xác.',
    };
  }

  // Reset rate limit on successful login
  await resetRateLimit(rateLimitKey);

  const token = await signSessionToken({ userId: user.id, email: user.email });
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieConfig.name, token, sessionCookieConfig.options);

  return {
    success: true,
    user: { id: user.id, email: user.email },
  };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieConfig.name);
}

export async function getCurrentUser(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(sessionCookieConfig.name);
    if (!sessionCookie?.value) {
      return null;
    }
    return await verifySessionToken(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export * from './session';
export * from './rate-limit';
