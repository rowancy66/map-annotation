'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { apiGet, apiSend } from '@/lib/api';
import { MapProject } from '@/lib/types';
import { MapPin, Plus, Trash2, Edit3, Loader2, AlertTriangle, Clock, Layers } from 'lucide-react';

interface MapListItem extends MapProject {
  annotation_count: number;
}

export default function AdminDashboard() {
  const { isLoggedIn, logout } = useAuth();
  const router = useRouter();
  const [maps, setMaps] = useState<MapListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadMaps = async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ maps: MapListItem[] }>('/api/maps');
      setMaps(data.maps);
    } catch (err) {
      console.error('加载地图列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) loadMaps();
  }, [isLoggedIn]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const data = await apiSend<{ mapProject: MapProject }>('/api/maps', 'POST', {
        name: newName.trim(),
        description: newDesc.trim(),
      });
      setMaps((prev) => [{ ...data.mapProject, annotation_count: 0 }, ...prev]);
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
    } catch (err) {
      console.error('创建地图失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (mapId: string) => {
    try {
      await apiSend('/api/maps/' + mapId, 'DELETE');
      setMaps((prev) => prev.filter((m) => m.id !== mapId));
    } catch (err) {
      console.error('删除地图失败:', err);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#f2eee8' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#78a587' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f2eee8' }}>
      {/* 顶栏 */}
      <header className="h-14 flex items-center justify-between px-6" style={{ background: '#faf8f4', borderBottom: '1px solid rgba(150,175,155,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: '#78a587' }}>
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-semibold" style={{ color: '#3a403c' }}>地图标注平台</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: '#aab2ac' }}>管理员</span>
          <button
            onClick={logout}
            className="text-sm transition px-2 py-1 rounded"
            style={{ color: '#aab2ac' }}
          >
            退出登录
          </button>
        </div>
      </header>

      {/* 主体 */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">我的地图</h2>
            <p className="text-sm text-gray-400 mt-1">共 {maps.length} 张地图</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl font-medium transition shadow-sm"
            style={{ background: '#78a587' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#6a9580'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#78a587'; }}
          >
            <Plus className="w-4 h-4" />
            新建地图
          </button>
        </div>

        {/* 地图卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {maps.map((map) => (
            <div
              key={map.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group"
            >
              {/* 缩略图区域 */}
              <div className="h-36 relative flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f2eee8, #ece7e0)' }}>
                <div className="text-center">
                  <MapPin className="w-10 h-10 mx-auto mb-1" style={{ color: '#78a587', opacity: 0.3 }} />
                  <p className="text-xs font-mono" style={{ color: '#aab2ac' }}>{map.annotation_count} 个标注</p>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push('/admin?mapId=' + map.id); }}
                    className="p-1.5 bg-white/90 rounded-lg shadow-sm hover:bg-white transition"
                    title="编辑"
                    aria-label="编辑"
                  >
                    <Edit3 className="w-3.5 h-3.5" style={{ color: '#78a587' }} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(map.id); }}
                    className="p-1.5 bg-white/90 rounded-lg shadow-sm hover:bg-white transition"
                    title="删除"
                    aria-label="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>

              {/* 信息区域 */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{map.name}</h3>
                {map.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{map.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {map.annotation_count} 条
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(map.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* 空状态 */}
          {maps.length === 0 && (
            <div className="col-span-full text-center py-16">
              <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">还没有地图，点击右上角创建</p>
            </div>
          )}
        </div>
      </main>

      {/* 新建地图弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">新建地图</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">地图名称 *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如：土地成交数据"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none transition"
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#78a587'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(120,165,135,0.12)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                    autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">备注（可选）</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="地图用途说明..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none resize-none"
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#78a587'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(120,165,135,0.12)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 transition"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="px-4 py-2 text-white rounded-xl text-sm font-medium disabled:opacity-40 transition flex items-center gap-2"
                style={{ background: newName.trim() && !creating ? '#78a587' : '#c0c4be' }}
                onMouseEnter={(e) => { if (newName.trim() && !creating) e.currentTarget.style.background = '#6a9580'; }}
                onMouseLeave={(e) => { if (newName.trim() && !creating) e.currentTarget.style.background = '#78a587'; }}
              >
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">确认删除</h3>
                <p className="text-xs text-gray-500">此操作不可撤销，地图及所有标注将永久删除</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 transition"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}