'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [showStats, setShowStats] = useState(false);

  const loadMaps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ maps: MapListItem[] }>('/api/maps');
      setMaps(data.maps);
    } catch (err) {
      console.error('加载地图列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    queueMicrotask(() => {
      void loadMaps();
    });
  }, [isLoggedIn, loadMaps]);

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

  const thumbGradients = [
    'linear-gradient(135deg, #e8f0ec 0%, #d1dfd8 50%, #b8cec3 100%)',
    'linear-gradient(135deg, #f0ece8 0%, #ddd5cc 50%, #c8beb2 100%)',
    'linear-gradient(135deg, #e8ecf0 0%, #d1d8df 50%, #b8c3ce 100%)',
    'linear-gradient(135deg, #ece8f0 0%, #d8d1df 50%, #c3b8ce 100%)',
  ];

  const totalAnnotations = maps.reduce((sum, m) => sum + m.annotation_count, 0);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* 顶栏 */}
      <header className="h-14 flex items-center justify-between px-6" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'var(--primary)' }}>
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>地图管理</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--faint)' }}>管理员</span>
          <button
            onClick={logout}
            className="text-sm transition px-2 py-1 rounded"
            style={{ color: 'var(--faint)' }}
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
            <h2 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>我的地图</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>共 {maps.length} 张地图，{totalAnnotations} 条标注</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium text-sm transition"
              style={{ color: 'var(--muted)', border: '1px solid var(--border)', background: 'var(--surface)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
            >
              📊 统计
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl font-medium transition shadow-sm"
              style={{ background: 'var(--primary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--primary)'; }}
            >
              <Plus className="w-4 h-4" />
              新建地图
            </button>
          </div>
        </div>

        {/* 统计概览 */}
        {showStats && (
          <div className="mb-6 p-5 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>数据概览</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'var(--primary-light)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>{maps.length}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>地图总数</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'rgba(44,111,187,0.08)' }}>
                <div className="text-2xl font-bold" style={{ color: '#2c6fbb' }}>{totalAnnotations}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>标注总数</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'rgba(192,57,43,0.08)' }}>
                <div className="text-2xl font-bold" style={{ color: '#c0392b' }}>{maps.filter(m => m.annotation_count > 0).length}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>活跃地图</div>
              </div>
            </div>
          </div>
        )}

        {/* 地图卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {maps.map((map, idx) => (
            <div
              key={map.id}
              className="rounded-xl border overflow-hidden group transition-all duration-250"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(26,71,53,0.12)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              {/* 缩略图区域 */}
              <div className="h-36 relative flex items-center justify-center" style={{ background: thumbGradients[idx % thumbGradients.length] }}>
                <div className="text-center">
                  <MapPin className="w-10 h-10 mx-auto mb-1" style={{ color: 'var(--primary)', opacity: 0.25 }} />
                  <p className="text-xs font-mono" style={{ color: 'var(--faint)' }}>{map.annotation_count} 个标注</p>
                </div>
                <div className="absolute top-0 right-0 px-2.5 py-1 text-xs font-medium rounded-bl-xl" style={{ background: 'rgba(26,71,53,0.7)', color: 'white' }}>
                  {map.annotation_count} 条
                </div>
                <div className="absolute top-2 right-12 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push('/admin?mapId=' + map.id); }}
                    className="p-1.5 rounded-lg shadow-sm transition"
                    style={{ background: 'rgba(255,255,255,0.9)' }}
                    title="编辑"
                    aria-label="编辑"
                  >
                    <Edit3 className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(map.id); }}
                    className="p-1.5 rounded-lg shadow-sm transition"
                    style={{ background: 'rgba(255,255,255,0.9)' }}
                    title="删除"
                    aria-label="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
                  </button>
                </div>
              </div>

              {/* 信息区域 */}
              <div className="p-4">
                <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>{map.name}</h3>
                {map.description && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--muted)' }}>{map.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: 'var(--faint)' }}>
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
              <MapPin className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--border)' }} />
              <p className="text-sm" style={{ color: 'var(--faint)' }}>还没有地图，点击右上角创建</p>
            </div>
          )}
        </div>
      </main>

      {/* 新建地图弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" style={{ background: 'var(--surface)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>新建地图</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>地图名称 *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如：土地成交数据"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(26,71,53,0.12)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>备注（可选）</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="地图用途说明..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(26,71,53,0.12)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl text-sm transition"
                style={{ background: 'var(--bg)', color: 'var(--muted)' }}
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="px-4 py-2 text-white rounded-xl text-sm font-medium disabled:opacity-40 transition flex items-center gap-2"
                style={{ background: newName.trim() && !creating ? 'var(--primary)' : 'var(--border)' }}
                onMouseEnter={(e) => { if (newName.trim() && !creating) e.currentTarget.style.background = 'var(--primary-hover)'; }}
                onMouseLeave={(e) => { if (newName.trim() && !creating) e.currentTarget.style.background = 'var(--primary)'; }}
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
          <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(192,57,43,0.1)' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>确认删除</h3>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>此操作不可撤销，地图及所有标注将永久删除</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-sm transition"
                style={{ background: 'var(--bg)', color: 'var(--muted)' }}
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-white rounded-xl text-sm font-medium transition"
                style={{ background: 'var(--danger)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#a33226'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--danger)'; }}
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
