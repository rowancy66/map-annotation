import { NextResponse } from 'next/server';
import { clearSession, SESSION_COOKIE_NAME } from '@/lib/server/auth';

export async function POST() {
  await clearSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });
  return response;
}
