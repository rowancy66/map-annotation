import { NextResponse } from 'next/server';
import { isLoggedIn } from '@/lib/server/auth';
import { getOrCreateDefaultMap, listAnnotations, updateFieldTemplates } from '@/lib/server/maps';
import { listGroups } from '@/lib/server/groups';
import { FieldTemplate } from '@/lib/types';

export async function GET() {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }

  const mapProject = await getOrCreateDefaultMap();
  const annotations = mapProject ? await listAnnotations(mapProject.id) : [];
  const groups = mapProject ? await listGroups(mapProject.id) : [];

  return NextResponse.json({
    loggedIn,
    mapProject,
    annotations,
    groups,
  });
}

export async function PUT(request: Request) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const mapId = typeof body?.mapId === 'string' ? body.mapId : '';
  const templates = Array.isArray(body?.templates) ? (body.templates as FieldTemplate[]) : null;

  if (!mapId || !templates) {
    return NextResponse.json({ error: '参数不完整' }, { status: 400 });
  }

  await updateFieldTemplates(mapId, templates);
  return NextResponse.json({ ok: true });
}
