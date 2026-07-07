import { NextResponse } from 'next/server';
import { isLoggedIn } from '@/lib/server/auth';
import {
  batchDeleteAnnotations,
  batchUpdateAnnotationField,
  deleteAnnotation,
  findPointAnnotationByName,
  requireExistingAnnotation,
  saveAnnotation,
  validateAnnotationPayload,
} from '@/lib/server/maps';
import { batchMoveAnnotationsToGroup, requireExistingGroup } from '@/lib/server/groups';
import { Annotation } from '@/lib/types';

export async function POST(request: Request) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const annotation = body?.annotation as Annotation | undefined;
  const annotations = body?.annotations as Omit<Annotation, 'id' | 'created_at' | 'updated_at'>[] | undefined;

  try {
    if (annotation) {
      await validateAnnotationPayload(annotation);
      const saved = await saveAnnotation(annotation);
      return NextResponse.json({ data: saved });
    }

    if (annotations) {
      const now = new Date().toISOString();
      const savedItems: Annotation[] = [];

      for (const item of annotations) {
        const existing =
          item.type === 'point' && item.name
            ? await findPointAnnotationByName(item.map_id, item.name)
            : null;

        const nextAnnotation = {
          ...(existing || {}),
          ...item,
          id: existing?.id || crypto.randomUUID(),
          description: item.description || existing?.description || '',
          geometry: item.geometry || existing?.geometry,
          custom_fields:
            existing && item.custom_fields.length > 0
              ? existing.custom_fields.map((field) => {
                  const incoming = item.custom_fields.find((entry) => entry.fieldId === field.fieldId);
                  if (!incoming || incoming.value == null || incoming.value === '') return field;
                  return incoming;
                }).concat(item.custom_fields.filter((entry) => !existing.custom_fields.some((field) => field.fieldId === entry.fieldId)))
              : item.custom_fields,
          created_at: existing?.created_at || now,
          updated_at: now,
        } as Annotation;
        await validateAnnotationPayload(nextAnnotation);
        savedItems.push(await saveAnnotation(nextAnnotation));
      }

      return NextResponse.json({ data: savedItems });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存标注失败' },
      { status: 400 }
    );
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
    try {
      await requireExistingAnnotation(id);
      await deleteAnnotation(id);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : '删除标注失败' },
        { status: 400 }
      );
    }
  }

  if (ids.length > 0) {
    try {
      await Promise.all(ids.map((annotationId) => requireExistingAnnotation(annotationId)));
      await batchDeleteAnnotations(ids);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : '批量删除标注失败' },
        { status: 400 }
      );
    }
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
  const fieldId = typeof body?.fieldId === 'string' ? body.fieldId : '';
  const fieldValue =
    typeof body?.fieldValue === 'string' || typeof body?.fieldValue === 'number' || body?.fieldValue === null
      ? body.fieldValue
      : undefined;

  if (annotationIds.length > 0) {
    try {
      const existingAnnotations = await Promise.all(annotationIds.map((annotationId: string) => requireExistingAnnotation(annotationId)));

      if (fieldId && fieldValue !== undefined) {
        const updatedItems = await batchUpdateAnnotationField(annotationIds, fieldId, fieldValue);
        return NextResponse.json({ ok: true, data: updatedItems });
      }

      if (groupId) {
        const group = await requireExistingGroup(groupId);
        const mismatched = existingAnnotations.some((annotation) => annotation.map_id !== group.map_id);
        if (mismatched) {
          return NextResponse.json({ error: '分组不属于这些标注所在的地图' }, { status: 400 });
        }
      }

      await batchMoveAnnotationsToGroup(annotationIds, groupId);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : '移动标注失败' },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ error: '缺少参数' }, { status: 400 });
}
