'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { MapPin, Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MapItem {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/auth/login');
      return;
    }
    if (user) loadMaps();
  }, [user, authLoading]);

  const loadMaps = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('maps')
      .select('id, name, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setMaps((data as MapItem[]) || []);
    setLoading(false);
  };

  const createMap = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('maps')
      .insert({
        user_id: user.id,
        name: `新地图 ${maps.length + 1}`,
        description: '',
        center: [116.4074, 39.9042],
        zoom: 12,
        field_templates: [],
      })
      .select()
      .single();

    if (!error && data) {
      router.push('/map');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的地图</h1>
            <p className="text-gray-500 mt-1">管理你的地图标注项目</p>
          </div>
          <button
            onClick={createMap}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            新建地图
          </button>
        </div>

        {maps.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-600 mb-2">还没有地图项目</h2>
            <p className="text-gray-400 mb-6">创建你的第一个地图标注项目</p>
            <button
              onClick={createMap}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              创建地图
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {maps.map((map) => (
              <button
                key={map.id}
                onClick={() => router.push('/map')}
                className="bg-white rounded-xl shadow-sm border p-6 text-left hover:shadow-md hover:border-blue-200 transition group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">{map.name}</h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {map.description || '暂无描述'}
                </p>
                <p className="text-xs text-gray-400">
                  创建于 {new Date(map.created_at).toLocaleDateString('zh-CN')}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
