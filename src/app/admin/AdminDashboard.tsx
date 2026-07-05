'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { apiGet, apiSend } from '@/lib/api';
import { MapProject } from '@/lib/types';
import { AlertTriangle, Edit3, FileText, Loader2, LogOut, MapPinned, Plus, Search, Share2, Trash2 } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');

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

  const thumbGradients = [
    'linear-gradient(135deg, #f4efe2 0%, #efe7d6 58%, #e4dac5 100%)',
    'linear-gradient(135deg, #edf2f0 0%, #e2e9e5 58%, #d5ddd8 100%)',
    'linear-gradient(135deg, #f0f3f7 0%, #e5ebf2 58%, #d9e0e9 100%)',
    'linear-gradient(135deg, #f5f0eb 0%, #ebe3da 58%, #ddd3c6 100%)',
  ];

  const totalAnnotations = maps.reduce((sum, map) => sum + map.annotation_count, 0);
  const filteredMaps = maps.filter((map) => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return true;
    return map.name.toLowerCase().includes(keyword) || (map.description || '').toLowerCase().includes(keyword);
  });

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
        <main className="admin-gallery">
          <section className="admin-gallery-topbar">
            <div className="admin-gallery-tabs" aria-label="地图分类">
              <button type="button" className="admin-gallery-tab is-active">
                <span>我的地图</span>
                <em>{maps.length}</em>
              </button>
            </div>

            <div className="admin-gallery-tools">
              <label className="admin-gallery-search">
                <Search className="h-4 w-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索地图名..."
                />
              </label>

              <button type="button" className="admin-gallery-trash">
                回收站
                <span>0</span>
              </button>
            </div>
          </section>

          <section className="admin-gallery-utility">
            <div className="admin-gallery-stats">
              <div className="admin-gallery-stat">
                <span>地图总数</span>
                <strong>{maps.length}</strong>
              </div>
              <div className="admin-gallery-stat">
                <span>标注总数</span>
                <strong>{totalAnnotations}</strong>
              </div>
              <div className="admin-gallery-stat">
                <span>当前结果</span>
                <strong>{filteredMaps.length}</strong>
              </div>
            </div>

            <div className="admin-gallery-actions">
              <button onClick={() => setShowCreate(true)} className="primary-button inline-flex items-center gap-2 px-4 py-2 text-sm font-medium">
                <Plus className="h-4 w-4" />
                新建地图
              </button>

              <button onClick={logout} className="ghost-button admin-gallery-logout">
                <LogOut className="h-3.5 w-3.5" />
                退出
              </button>
            </div>
          </section>

          <section className="admin-gallery-section">
            {filteredMaps.length === 0 ? (
              <div className="paper-panel px-6 py-20 text-center">
                <MapPinned className="mx-auto mb-4 h-12 w-12" style={{ color: 'var(--faint)' }} />
                <p className="text-lg" style={{ color: 'var(--muted)' }}>
                  {maps.length === 0 ? '还没有地图，先新建一个项目' : '没有匹配到地图'}
                </p>
              </div>
            ) : (
              <div className="admin-gallery-grid">
                {filteredMaps.map((map, idx) => (
                  <article
                    key={map.id}
                    className="admin-gallery-card"
                  >
                    <div className="admin-gallery-card-head">
                      <div className="admin-gallery-card-index">{String(idx + 1).padStart(2, '0')}</div>
                      <div className="admin-gallery-card-badge">标注: {map.annotation_count}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push('/admin?mapId=' + map.id)}
                      className="admin-gallery-card-preview"
                      style={{ background: thumbGradients[idx % thumbGradients.length] }}
                      aria-label={`打开地图 ${map.name}`}
                    >
                      <MapPinned className="h-7 w-7" style={{ color: 'rgba(31,52,45,0.28)' }} />
                    </button>

                    <div className="admin-gallery-card-main">
                      <button type="button" onClick={() => router.push('/admin?mapId=' + map.id)} className="min-w-0 text-left">
                        <h3 className="admin-gallery-card-title">{map.name}</h3>
                      </button>
                      <p className="admin-gallery-card-desc">{map.description || '地图项目'}</p>
                    </div>

                    <div className="admin-gallery-card-meta">
                      <span>{map.annotation_count} 条标注</span>
                    </div>

                    <div className="admin-gallery-card-actions">
                      <button
                        onClick={() => setDeleteConfirm(map.id)}
                        className="admin-gallery-icon-button"
                        title="删除"
                        aria-label="删除"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        className="admin-gallery-icon-button"
                        title="文档"
                        aria-label="文档"
                      >
                        <FileText className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => router.push('/admin?mapId=' + map.id)}
                        className="admin-gallery-icon-button"
                        title="编辑"
                        aria-label="编辑"
                      >
                        <Edit3 className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        className="admin-gallery-icon-button"
                        title="分享"
                        aria-label="分享"
                      >
                        <Share2 className="h-5 w-5" />
                      </button>
                    </div>
                  </article>
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
