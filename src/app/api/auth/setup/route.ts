import { NextResponse } from 'next/server';
import { hasAdminPassword, setAdminPassword, createSession } from '@/lib/server/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';
  const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : '';

  // 如果密码已设置，拒绝重复设置
  const alreadySet = await hasAdminPassword();
  if (alreadySet) {
    return NextResponse.json({ error: '管理密码已设置，如需重置请联系部署者' }, { status: 403 });
  }

  if (!password || password.length < 6) {
    return NextResponse.json({ error: '密码至少需要 6 个字符' }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: '两次输入的密码不一致' }, { status: 400 });
  }

  await setAdminPassword(password);
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