'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { apiGet, apiSend } from '@/lib/api';
import { MapProject } from '@/lib/types';
import { AlertTriangle, ArrowUpRight, Clock, Edit3, Layers, Loader2, MapPin, Plus, Trash2 } from 'lucide-react';

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
    'linear-gradient(135deg, #f3ede3 0%, #e7dccb 55%, #d9c6ac 100%)',
    'linear-gradient(135deg, #f4f0e8 0%, #e5e0d5 55%, #d5ccc0 100%)',
    'linear-gradient(135deg, #eef1f0 0%, #dde4df 55%, #c8d2cb 100%)',
    'linear-gradient(135deg, #f0ece6 0%, #e4ddd3 55%, #cdbfae 100%)',
  ];

  const totalAnnotations = maps.reduce((sum, map) => sum + map.annotation_count, 0);
  const activeMaps = maps.filter((map) => map.annotation_count > 0).length;
  const latestUpdatedAt = maps[0]?.updated_at;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-6" style={{ background: 'var(--bg)' }}>
      <div className="paper-panel archive-shell mx-auto max-w-7xl overflow-hidden rounded-[32px]">
        <header className="border-b px-6 py-4 md:px-8" style={{ borderColor: 'var(--border)' }}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'var(--primary)' }}>
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="display-label">Admin Atlas</div>
                <h1 className="text-2xl leading-none md:text-3xl" style={{ color: 'var(--ink)' }}>地图管理</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="soft-pill">管理员</span>
              <button onClick={logout} className="ghost-button rounded-full px-4 py-2 text-xs font-semibold">
                退出登录
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-6 md:px-8 md:py-8">
          <section className="archive-grid grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
            <div className="paper-card relative overflow-hidden rounded-[30px] p-6 md:p-8">
              <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at top right, rgba(184,155,114,0.18), transparent 28%)' }} />
              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="soft-pill">目录控制台</div>
                    <h2 className="mt-5 text-3xl leading-[0.98] md:text-[3.15rem]" style={{ color: 'var(--ink)' }}>
                      同一套风格，
                      <br />
                      直接管理内容。
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setShowCreate(true)} className="primary-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
                      <Plus className="h-4 w-4" />
                      新建地图
                    </button>
                  </div>
                </div>
                <div className="mt-8 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.56)' }}>
                    <div className="text-[11px] font-medium" style={{ color: 'var(--faint)' }}>地图数量</div>
                    <div className="mt-2 text-3xl leading-none" style={{ color: 'var(--ink)' }}>{maps.length}</div>
                  </div>
                  <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.56)' }}>
                    <div className="text-[11px] font-medium" style={{ color: 'var(--faint)' }}>标注总数</div>
                    <div className="mt-2 text-3xl leading-none" style={{ color: 'var(--ink)' }}>{totalAnnotations}</div>
                  </div>
                  <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.56)' }}>
                    <div className="text-[11px] font-medium" style={{ color: 'var(--faint)' }}>活跃地图</div>
                    <div className="mt-2 text-3xl leading-none" style={{ color: 'var(--ink)' }}>{activeMaps}</div>
                  </div>
                  <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.56)' }}>
                    <div className="text-[11px] font-medium" style={{ color: 'var(--faint)' }}>最后更新</div>
                    <div className="mt-2 text-base leading-tight" style={{ color: 'var(--ink)' }}>
                      {latestUpdatedAt ? formatTime(latestUpdatedAt) : '暂无记录'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="paper-card rounded-[26px] p-5">
                <div className="text-[11px] font-medium mb-2" style={{ color: 'var(--faint)' }}>管理提示</div>
                <h3 className="text-2xl leading-tight" style={{ color: 'var(--ink)' }}>卡片即入口</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                  悬停即可编辑或删除，点击卡片主体进入对应地图的后台编辑页面。
                </p>
              </div>
              <div className="paper-card rounded-[26px] p-5">
                <div className="text-[11px] font-medium mb-2" style={{ color: 'var(--faint)' }}>当前状态</div>
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold tracking-[0.14em]" style={{ color: 'var(--faint)' }}>
                  <span>{maps.length} 个项目</span>
                  <span>{activeMaps} 个活跃项目</span>
                  <span>{totalAnnotations} 条标注</span>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h3 className="text-3xl" style={{ color: 'var(--ink)' }}>全部地图</h3>
              <div className="hidden rounded-full px-4 py-2 text-xs font-semibold tracking-[0.16em] md:block" style={{ background: 'rgba(255,255,255,0.56)', color: 'var(--faint)', border: '1px solid var(--border)' }}>
                共 {maps.length} 张
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {maps.map((map, idx) => (
                <div key={map.id} className="paper-card group overflow-hidden rounded-[28px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(37,28,18,0.14)]">
                  <div className="relative h-40 p-5" style={{ background: thumbGradients[idx % thumbGradients.length] }}>
                    <div className="absolute inset-[14px] rounded-[20px] border" style={{ borderColor: 'rgba(32,32,32,0.08)' }} />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ background: 'rgba(255,255,255,0.48)', color: 'var(--faint)' }}>
                          编号 {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <button
                            onClick={() => router.push('/admin?mapId=' + map.id)}
                            className="ghost-button rounded-full p-2"
                            title="编辑"
                            aria-label="编辑"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(map.id)}
                            className="rounded-full p-2 transition"
                            style={{ background: 'rgba(255,255,255,0.78)', color: 'var(--danger)', border: '1px solid rgba(185,87,73,0.18)' }}
                            title="删除"
                            aria-label="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <MapPin className="mb-3 h-10 w-10" style={{ color: 'rgba(31,52,45,0.28)' }} />
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'rgba(23,23,23,0.5)' }}>
                          {map.annotation_count} 个标注
                        </div>
                      </div>
                    </div>
                  </div>

                  <button type="button" onClick={() => router.push('/admin?mapId=' + map.id)} className="w-full p-5 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="truncate text-xl font-semibold" style={{ color: 'var(--ink)' }}>{map.name}</h3>
                      <ArrowUpRight className="h-4 w-4 shrink-0" style={{ color: 'var(--faint)' }} />
                    </div>
                    {map.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6" style={{ color: 'var(--muted)' }}>{map.description}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2 text-xs" style={{ color: 'var(--faint)' }}>
                      <span className="flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: 'rgba(23,23,23,0.04)' }}>
                        <Layers className="h-3 w-3" />
                        {map.annotation_count} 条
                      </span>
                      <span className="flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: 'rgba(23,23,23,0.04)' }}>
                        <Clock className="h-3 w-3" />
                        {formatTime(map.updated_at)}
                      </span>
                    </div>
                  </button>
                </div>
              ))}

              {maps.length === 0 && (
                <div className="paper-card col-span-full rounded-[28px] px-6 py-20 text-center">
                  <MapPin className="mx-auto mb-4 h-12 w-12" style={{ color: 'var(--faint)' }} />
                  <p className="text-lg" style={{ color: 'var(--muted)' }}>还没有地图，先新建一个项目</p>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="paper-panel w-full max-w-md rounded-[28px] p-6 mx-4">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>新建地图</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>地图名称 *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如：土地成交数据"
                  className="w-full rounded-2xl px-3 py-2.5 text-sm outline-none transition"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)', background: 'rgba(255,255,255,0.7)' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(26,71,53,0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
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
                  className="w-full resize-none rounded-2xl px-3 py-2.5 text-sm outline-none transition"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)', background: 'rgba(255,255,255,0.7)' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(26,71,53,0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="ghost-button rounded-full px-4 py-2 text-sm">
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="primary-button flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-40"
                style={{ background: newName.trim() && !creating ? 'var(--primary)' : 'var(--border)' }}
              >
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="paper-panel w-full max-w-sm rounded-[28px] p-6 mx-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'rgba(192,57,43,0.1)' }}>
                <AlertTriangle className="h-5 w-5" style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>确认删除</h3>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>此操作不可撤销，地图及所有标注将永久删除。</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="ghost-button rounded-full px-4 py-2 text-sm">
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="rounded-full px-4 py-2 text-sm font-medium text-white transition"
                style={{ background: 'var(--danger)' }}
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
