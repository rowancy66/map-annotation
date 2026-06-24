import { NextResponse } from 'next/server';
import { listMaps, createMap } from '@/lib/server/maps';

export async function GET() {
  const maps = await listMaps();
  return NextResponse.json({ maps });
}

export async function POST(request: Request) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';

  if (!name) {
    return NextResponse.json({ error: '请输入地图名称' }, { status: 400 });
  }

  const mapProject = await createMap(name, description);
  return NextResponse.json({ mapProject });
}