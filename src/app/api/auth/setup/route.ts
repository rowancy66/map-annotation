import { NextResponse } from 'next/server';
import { hasAdminPassword, trySetAdminPassword, createSession, requireSetupToken } from '@/lib/server/auth';

export async function GET() {
  const configured = await hasAdminPassword();
  return NextResponse.json({
    configured,
    setupTokenRequired: process.env.NODE_ENV === 'production',
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';
  const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : '';
  const setupToken = body?.setupToken;

  // 如果密码已设置，拒绝重复设置
  const alreadySet = await hasAdminPassword();
  if (alreadySet) {
    return NextResponse.json({ error: '管理密码已设置，如需重置请联系部署者' }, { status: 403 });
  }

  try {
    const tokenError = requireSetupToken(setupToken);
    if (tokenError) {
      return NextResponse.json({ error: tokenError }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '初始化配置错误' },
      { status: 500 }
    );
  }

  if (!password || password.length < 6) {
    return NextResponse.json({ error: '密码至少需要 6 个字符' }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: '两次输入的密码不一致' }, { status: 400 });
  }

  const created = await trySetAdminPassword(password);
  if (!created) {
    return NextResponse.json({ error: '管理密码已设置，如需重置请联系部署者' }, { status: 403 });
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
