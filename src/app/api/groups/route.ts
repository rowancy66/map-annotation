import { NextResponse } from 'next/server';
import { isLoggedIn } from '@/lib/server/auth';
import { createGroup, updateGroup, deleteGroup } from '@/lib/server/groups';

export async function POST(request: Request) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const mapId = typeof body?.mapId === 'string' ? body.mapId : '';
  const name = typeof body?.name === 'string' ? body.name.trim() : '';

  if (!mapId || !name) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  const group = await createGroup(mapId, name, body.parentId, body.color);
  return NextResponse.json({ group });
}

export async function PUT(request: Request) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';

  if (!id) {
    return NextResponse.json({ error: '缺少分组 ID' }, { status: 400 });
  }

  await updateGroup(id, {
    name: typeof body.name === 'string' ? body.name.trim() : undefined,
    color: typeof body.color === 'string' ? body.color : undefined,
    parent_id: body.parent_id !== undefined ? body.parent_id : undefined,
    sort_order: typeof body.sort_order === 'number' ? body.sort_order : undefined,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';

  if (!id) {
    return NextResponse.json({ error: '缺少分组 ID' }, { status: 400 });
  }

  await deleteGroup(id);
  return NextResponse.json({ ok: true });
}