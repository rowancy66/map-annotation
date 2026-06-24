import { NextResponse } from 'next/server';
import { isLoggedIn } from '@/lib/server/auth';
import {
  batchDeleteAnnotations,
  deleteAnnotation,
  getAnnotationById,
  saveAnnotation,
} from '@/lib/server/maps';
import { batchMoveAnnotationsToGroup } from '@/lib/server/groups';
import { Annotation } from '@/lib/types';

export async function POST(request: Request) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const annotation = body?.annotation as Annotation | undefined;
  const annotations = body?.annotations as Omit<Annotation, 'id' | 'created_at' | 'updated_at'>[] | undefined;

  if (annotation) {
    const saved = await saveAnnotation(annotation);
    return NextResponse.json({ data: saved });
  }

  if (annotations) {
    const now = new Date().toISOString();
    const savedItems = await Promise.all(
      annotations.map((item) =>
        saveAnnotation({
          ...item,
          id: crypto.randomUUID(),
          created_at: now,
          updated_at: now,
        } as Annotation)
      )
    );
    return NextResponse.json({ data: savedItems });
  }

  return NextResponse.json({ error: '缺少标注数据' }, { status: 400 });
}

export async function DELETE(request: Request) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  const ids = Array.isArray(body?.ids) ? (body.ids as unknown[]).filter((item): item is string => typeof item === 'string') : [];

  if (id) {
    await deleteAnnotation(id);
    return NextResponse.json({ ok: true });
  }

  if (ids.length > 0) {
    await batchDeleteAnnotations(ids);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: '缺少标注 ID' }, { status: 400 });
}

export async function PUT(request: Request) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const annotationIds = Array.isArray(body?.annotationIds) ? body.annotationIds.filter((item: unknown): item is string => typeof item === 'string') : [];
  const groupId = typeof body?.groupId === 'string' ? body.groupId : null;

  if (annotationIds.length > 0) {
    await batchMoveAnnotationsToGroup(annotationIds, groupId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: '缺少参数' }, { status: 400 });
}