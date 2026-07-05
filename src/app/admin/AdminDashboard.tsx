'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { apiGet, apiSend } from '@/lib/api';
import { MapProject } from '@/lib/types';
import { AlertTriangle, Edit3, Loader2, MapPinned, Plus, Trash2 } from 'lucide-react';

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
    'linear-gradient(135deg, #d6dbd8 0%, #c4cbc7 55%, #b0b7b2 100%)',
    'linear-gradient(135deg, #dfe4e2 0%, #ccd5d1 55%, #b4bfba 100%)',
    'linear-gradient(135deg, #d7dcd7 0%, #c4ccc6 55%, #aeb8b1 100%)',
    'linear-gradient(135deg, #e0e3e0 0%, #cfd5d0 55%, #b8c1bb 100%)',
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
    <div className="admin-shell">
      <div className="admin-frame">
        <header className="admin-strip">
          <div className="admin-strip-title">
            <div className="admin-strip-mark">
              <MapPinned className="h-4 w-4" />
            </div>
            <div className="admin-strip-meta">
              <div className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--faint)' }}>Map Directory</div>
              <h1 className="text-[22px] leading-none" style={{ color: 'var(--ink)' }}>地图管理</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="soft-pill">管理员</span>
            <button onClick={logout} className="ghost-button px-4 py-2 text-xs font-semibold workbench-hard-edge">
              退出登录
            </button>
          </div>
        </header>

        <main className="pt-5">
          <section>
            <div className="flex flex-col gap-4 border px-5 py-4 md:flex-row md:items-end md:justify-between" style={{ borderColor: 'var(--border)', background: 'var(--surface-strong)' }}>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--faint)' }}>Directory Control</div>
                <h2 className="mt-2 text-[18px] leading-none" style={{ color: 'var(--ink)' }}>地图目录</h2>
              </div>
              <button onClick={() => setShowCreate(true)} className="primary-button inline-flex items-center gap-2 px-4 py-2 text-sm font-medium workbench-hard-edge self-start md:self-auto">
                <Plus className="h-4 w-4" />
                新建地图
              </button>
            </div>

            <div className="admin-metric-grid">
              <div className="admin-metric">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--faint)' }}>地图数量</div>
                <div className="mt-3 text-[28px] leading-none" style={{ color: 'var(--ink)' }}>{maps.length}</div>
              </div>
              <div className="admin-metric">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--faint)' }}>标注总数</div>
                <div className="mt-3 text-[28px] leading-none" style={{ color: 'var(--ink)' }}>{totalAnnotations}</div>
              </div>
              <div className="admin-metric">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--faint)' }}>活跃地图</div>
                <div className="mt-3 text-[28px] leading-none" style={{ color: 'var(--ink)' }}>{activeMaps}</div>
              </div>
              <div className="admin-metric">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--faint)' }}>最后更新</div>
                <div className="mt-3 text-[14px] leading-tight" style={{ color: 'var(--ink)' }}>
                  {latestUpdatedAt ? formatTime(latestUpdatedAt) : '暂无记录'}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h3 className="text-[18px] font-semibold" style={{ color: 'var(--ink)' }}>全部地图</h3>
              <div className="hidden px-4 py-2 text-xs font-semibold tracking-[0.12em] md:block" style={{ background: 'var(--surface-muted)', color: 'var(--faint)', border: '1px solid var(--border)' }}>
                共 {maps.length} 张
              </div>
            </div>

            {maps.length === 0 ? (
              <div className="paper-panel px-6 py-20 text-center">
                <MapPinned className="mx-auto mb-4 h-12 w-12" style={{ color: 'var(--faint)' }} />
                <p className="text-lg" style={{ color: 'var(--muted)' }}>还没有地图，先新建一个项目</p>
              </div>
            ) : (
              <div className="admin-table overflow-hidden">
                <div
                  className="admin-table-row px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em]"
                  style={{ background: 'var(--surface-muted)', color: 'var(--faint)' }}
                >
                  <div>编号</div>
                  <div>地图名称</div>
                  <div>标注数</div>
                  <div>更新时间</div>
                  <div>说明</div>
                  <div className="text-right">操作</div>
                </div>
                {maps.map((map, idx) => (
                  <div
                    key={map.id}
                    className="admin-table-row px-4 py-3"
                    style={{ background: idx % 2 === 0 ? 'var(--surface-strong)' : 'var(--surface-panel)' }}
                  >
                    <div className="text-[12px] font-medium" style={{ color: 'var(--faint)' }}>
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <button type="button" onClick={() => router.push('/admin?mapId=' + map.id)} className="min-w-0 text-left">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 border" style={{ background: thumbGradients[idx % thumbGradients.length], borderColor: 'rgba(17,24,22,0.12)' }} />
                        <div className="min-w-0">
                          <div className="truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{map.name}</div>
                          <div className="truncate text-[12px]" style={{ color: 'var(--muted)' }}>{map.description || '—'}</div>
                        </div>
                      </div>
                    </button>
                    <div className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{map.annotation_count} 条</div>
                    <div className="text-[12px]" style={{ color: 'var(--muted)' }}>{formatTime(map.updated_at)}</div>
                    <div className="truncate text-[12px]" style={{ color: 'var(--faint)' }}>{map.description || '—'}</div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push('/admin?mapId=' + map.id)}
                        className="ghost-button p-2 workbench-hard-edge"
                        title="编辑"
                        aria-label="编辑"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(map.id)}
                        className="p-2 transition workbench-hard-edge"
                        style={{ background: 'var(--surface-strong)', color: 'var(--danger)', border: '1px solid rgba(185,87,73,0.18)' }}
                        title="删除"
                        aria-label="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="paper-panel w-full max-w-md p-6 mx-4 workbench-hard-edge">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>新建地图</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>地图名称 *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如：土地成交数据"
                  className="w-full px-3 py-2.5 text-sm outline-none transition workbench-hard-edge workbench-field"
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
                  className="w-full resize-none px-3 py-2.5 text-sm outline-none transition workbench-hard-edge workbench-field"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="ghost-button px-4 py-2 text-sm workbench-hard-edge">
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="primary-button flex items-center gap-2 px-4 py-2 text-sm font-medium disabled:opacity-40 workbench-hard-edge"
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
          <div className="paper-panel w-full max-w-sm p-6 mx-4 workbench-hard-edge">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border" style={{ background: 'rgba(192,57,43,0.1)', borderColor: 'rgba(185,87,73,0.18)' }}>
                <AlertTriangle className="h-5 w-5" style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>确认删除</h3>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>此操作不可撤销，地图及所有标注将永久删除。</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="ghost-button px-4 py-2 text-sm workbench-hard-edge">
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white transition workbench-hard-edge"
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
