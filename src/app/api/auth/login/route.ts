import { NextResponse } from 'next/server';
import { verifyAdminPassword, createSession } from '@/lib/server/auth';

const LOGIN_WINDOW_MS = 1000 * 60 * 5;
const LOGIN_MAX_ATTEMPTS = 5;
const RETRY_AFTER_SECONDS = Math.ceil(LOGIN_WINDOW_MS / 1000);

type LoginAttempt = {
  count: number;
  firstAttemptAt: number;
};

const globalForLoginRateLimit = globalThis as typeof globalThis & {
  __mapmarkLoginAttempts?: Map<string, LoginAttempt>;
};

const loginAttempts = globalForLoginRateLimit.__mapmarkLoginAttempts ?? new Map<string, LoginAttempt>();
globalForLoginRateLimit.__mapmarkLoginAttempts = loginAttempts;

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwardedFor) return forwardedFor;

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}

function getRetryAfterMs(attempt: LoginAttempt, now: number) {
  const elapsed = now - attempt.firstAttemptAt;
  return Math.max(0, LOGIN_WINDOW_MS - elapsed);
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  const now = Date.now();
  const currentAttempt = loginAttempts.get(clientKey);

  if (currentAttempt) {
    const retryAfterMs = getRetryAfterMs(currentAttempt, now);
    if (retryAfterMs === 0) {
      loginAttempts.delete(clientKey);
    } else if (currentAttempt.count >= LOGIN_MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: '尝试过于频繁，请稍后再试' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
          },
        }
      );
    }
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!password) {
    return NextResponse.json({ error: '请输入管理密码' }, { status: 400 });
  }

  const valid = await verifyAdminPassword(password);
  if (!valid) {
    const previous = loginAttempts.get(clientKey);
    if (!previous || getRetryAfterMs(previous, now) === 0) {
      loginAttempts.set(clientKey, { count: 1, firstAttemptAt: now });
    } else {
      loginAttempts.set(clientKey, {
        count: previous.count + 1,
        firstAttemptAt: previous.firstAttemptAt,
      });
    }

    return NextResponse.json(
      { error: '密码错误' },
      {
        status: 401,
        headers: {
          'Retry-After': String(RETRY_AFTER_SECONDS),
        },
      }
    );
  }

  loginAttempts.delete(clientKey);

  const session = await createSession();
  const response = NextResponse.json({ loggedIn: true });
  response.cookies.set(session.cookieName, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(session.expiresAt),
  });
  return response;
}
