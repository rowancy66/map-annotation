import { NextResponse } from 'next/server';
import { isLoggedIn, verifyAdminPassword, createSession } from '@/lib/server/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!password) {
    return NextResponse.json({ error: '请输入管理密码' }, { status: 400 });
  }

  const valid = await verifyAdminPassword(password);
  if (!valid) {
    return NextResponse.json({ error: '密码错误' }, { status: 401 });
  }

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