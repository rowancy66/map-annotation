import { NextResponse } from 'next/server';
import { isLoggedIn } from '@/lib/server/auth';
import { getMapById, getOrCreateDefaultMap, listAnnotations, updateMap, deleteMap } from '@/lib/server/maps';
import { listGroups } from '@/lib/server/groups';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const loggedIn = await isLoggedIn();

  const mapProject = await getMapById(id);
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

  const updates: { name?: string; description?: string; center?: [number, number]; zoom?: number } = {};
  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (typeof body.description === 'string') updates.description = body.description.trim();
  if (Array.isArray(body.center)) updates.center = body.center;
  if (typeof body.zoom === 'number') updates.zoom = body.zoom;

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