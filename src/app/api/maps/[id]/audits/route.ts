import { NextResponse } from 'next/server';
import { isLoggedIn } from '@/lib/server/auth';
import { listMapAudits } from '@/lib/server/maps';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }

  const { id } = await params;
  const audits = await listMapAudits(id);
  return NextResponse.json({ audits });
}
