import { NextResponse } from 'next/server';
import { isLoggedIn } from '@/lib/server/auth';
import { getMapById, getPublicMapById, listAnnotations, updateMap, deleteMap } from '@/lib/server/maps';
import { listGroups } from '@/lib/server/groups';
import { MapSettings } from '@/lib/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const loggedIn = await isLoggedIn();

  const mapProject = loggedIn ? await getMapById(id) : await getPublicMapById(id);
  if (!mapProject) {
    return NextResponse.json({ error: '地图不存在' }, { status: 404 });
  }

  const annotations = await listAnnotations(id);
  const groups = await listGroups(id);

  return NextResponse.json({ loggedIn, mapProject, annotations, groups });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: '参数不完整' }, { status: 400 });
  }

  const updates: { name?: string; description?: string; center?: [number, number]; zoom?: number; settings?: MapSettings } = {};
  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (typeof body.description === 'string') updates.description = body.description.trim();
  if (
    Array.isArray(body.center) &&
    body.center.length === 2 &&
    body.center.every((item: unknown) => typeof item === 'number' && Number.isFinite(item))
  ) {
    updates.center = body.center as [number, number];
  }
  if (typeof body.zoom === 'number' && Number.isFinite(body.zoom)) updates.zoom = body.zoom;
  if (body.settings && typeof body.settings === 'object') {
    updates.settings = {
      isPublic: body.settings.isPublic !== false,
      showNames: body.settings.showNames !== false,
      defaultNames: {
        point: typeof body.settings.defaultNames?.point === 'string' ? body.settings.defaultNames.point : '',
        line: typeof body.settings.defaultNames?.line === 'string' ? body.settings.defaultNames.line : '',
        polygon: typeof body.settings.defaultNames?.polygon === 'string' ? body.settings.defaultNames.polygon : '',
      },
    };
  }

  await updateMap(id, updates);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }

  await deleteMap(id);
  return NextResponse.json({ ok: true });
}
