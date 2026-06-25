import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const messages: string[] = [];
    const envVars = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'APP_SESSION_SECRET'];

    for (const key of envVars) {
      const val = process.env[key];
      messages.push(`${key}=${val ? val.substring(0, 16) + '...' : 'NOT SET'}`);
    }

    // 测试 @libsql/client 加载
    try {
      const { createClient } = await import('@libsql/client');
      messages.push('@libsql/client: 加载成功');
    } catch (e) {
      messages.push(`@libsql/client: 加载失败 - ${e instanceof Error ? e.message : String(e)}`);
    }

    return NextResponse.json({ diagnostics: messages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}