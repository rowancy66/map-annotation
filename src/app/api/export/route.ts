import { NextResponse } from 'next/server';
import { isLoggedIn } from '@/lib/server/auth';
import { getMapById, listAnnotations } from '@/lib/server/maps';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export async function POST(request: Request) {
  try {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      return NextResponse.json({ error: '需要登录' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.mapId !== 'string' || !['xlsx', 'csv'].includes(body.format)) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }

    const { mapId, format } = body as { mapId: string; format: 'xlsx' | 'csv' };

    const mapProject = await getMapById(mapId);
    if (!mapProject) {
      return NextResponse.json({ error: '地图不存在' }, { status: 404 });
    }

    const annotations = await listAnnotations(mapId);
    const pointAnnotations = annotations.filter((a) => a.type === 'point');

    if (pointAnnotations.length === 0) {
      return NextResponse.json({ error: '没有可导出的点标注' }, { status: 400 });
    }

    const templates = mapProject.field_templates || [];
    const baseHeaders = ['编号', '位置', '经度', '纬度'];
    const customHeaders = templates.map((t) => t.name);
    const allHeaders = [...baseHeaders, ...customHeaders];

    const rows = pointAnnotations.map((a) => {
      const geom = a.geometry as { type: string; coordinates?: [number, number] };
      if (!Array.isArray(geom.coordinates) || geom.coordinates.length < 2) {
        throw new Error(`标注 ${a.id} 的坐标数据异常`);
      }
      const getFieldValue = (fieldId: string) => {
        const val = a.custom_fields.find((cf) => cf.fieldId === fieldId)?.value;
        return val?.toString() || '';
      };
      const row: Record<string, string | number> = {
        '编号': a.name,
        '位置': a.description,
        '经度': geom.coordinates[0],
        '纬度': geom.coordinates[1],
      };
      templates.forEach((field) => {
        row[field.name] = getFieldValue(field.id);
      });
      return row;
    });

    const mapName = (mapProject.name || '地图标注').replace(/[\\/:*?"<>|]/g, '_');
    const dateSuffix = new Date().toLocaleDateString('zh-CN');
    const fileName = `${mapName}_${dateSuffix}.${format}`;

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(rows, { header: allHeaders });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '标注数据');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        },
      });
    }

    const csv = Papa.unparse(rows, { columns: allHeaders });
    const buffer = Buffer.from(`\ufeff${csv}`, 'utf-8');
    return new Response(buffer, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error('导出接口错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导出失败' },
      { status: 500 }
    );
  }
}
