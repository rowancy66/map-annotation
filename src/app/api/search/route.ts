import { NextRequest, NextResponse } from 'next/server';

const TIANDITU_KEY = process.env.TIANDITU_KEY || 'e1d6600951ce0b9692ec71ebc7f03170';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const queryType = searchParams.get('queryType') || '1';
  const start = searchParams.get('start') || '0';
  const count = searchParams.get('count') || '10';
  const level = searchParams.get('level') || '12';
  const mapBound = searchParams.get('mapBound') || '';

  if (!keyword.trim()) {
    return NextResponse.json({ status: 'INF', pois: [] });
  }

  const postStr: Record<string, unknown> = {
    keyWord: keyword.trim(),
    queryType,
    level: Number(level),
    start: Number(start),
    count: Number(count),
  };
  if (mapBound) postStr.mapBound = mapBound;

  const url = `https://api.tianditu.gov.cn/v2/search?postStr=${encodeURIComponent(JSON.stringify(postStr))}&type=query&tk=${TIANDITU_KEY}`;

  try {
    // 转发浏览器请求头（User-Agent、Accept 等），让天地图识别为浏览器端请求
    const headers: Record<string, string> = {
      'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0 (compatible)',
      'Referer': request.headers.get('referer') || 'http://localhost:3000',
      'Accept': 'application/json, text/plain, */*',
    };
    const origin = request.headers.get('origin');
    if (origin) headers['Origin'] = origin;

    const res = await fetch(url, { headers });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: 'ERROR', msg: '搜索服务请求失败' }, { status: 502 });
  }
}
