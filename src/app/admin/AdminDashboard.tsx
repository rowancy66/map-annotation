'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { apiGet, apiSend } from '@/lib/api';
import { MapProject } from '@/lib/types';
import { Edit3, FileText, Loader2, LogOut, MapPinned, Plus, Search, Share2, Trash2 } from 'lucide-react';

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
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  const showFeedback = useCallback((message: string) => {
    setFeedbackMessage(message);
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackMessage(null);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

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

  const handleOpenPublicMap = useCallback((mapId: string) => {
    window.open(`/map/${mapId}`, '_blank', 'noopener,noreferrer');
  }, []);

  const handleShareMap = useCallback(async (map: MapListItem) => {
    const shareUrl = `${window.location.origin}/map/${map.id}`;
    if (map.settings?.isPublic === false) {
      showFeedback('这张地图当前未公开，公开后才能正常分享');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      showFeedback('分享链接已复制');
    } catch {
      window.prompt('复制分享链接', shareUrl);
    }
  }, [showFeedback]);

  const thumbGradients = [
    'linear-gradient(135deg, #f7f6f3 0%, #efece3 58%, #e6e2d6 100%)',
    'linear-gradient(135deg, #f3f6f5 0%, #e7edea 58%, #dbe3de 100%)',
    'linear-gradient(135deg, #f4f6f8 0%, #e9eef3 58%, #dde4ec 100%)',
    'linear-gradient(135deg, #f6f4f1 0%, #ece7e0 58%, #e0d8cd 100%)',
  ];

  const totalAnnotations = maps.reduce((sum, map) => sum + map.annotation_count, 0);
  const filteredMaps = maps.filter((map) => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return true;
    return map.name.toLowerCase().includes(keyword) || (map.description || '').toLowerCase().includes(keyword);
  });

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-page)]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-default)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      {feedbackMessage && (
        <div
          className="fixed left-1/2 top-6 z-[9999] -translate-x-1/2 px-4 py-2 text-sm rounded-[var(--radius-md)] animate-fade-in"
          style={{ background: 'rgba(55,53,47,0.92)', color: 'white', boxShadow: 'var(--shadow-overlay)' }}
        >
          {feedbackMessage}
        </div>
      )}

      <header className="sticky top-0 z-50 h-14 bg-[var(--surface-primary)] border-b border-[var(--border-subtle)] px-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)]"
            style={{ background: 'var(--primary-default)', color: 'var(--text-inverse)' }}
          >
            <MapPinned className="w-4 h-4" />
          </div>
          <span className="font-semibold text-[15px] text-[var(--text-primary)] truncate">MapMark 控制台</span>
        </div>

        <div className="flex-1 max-w-md mx-4 hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索地图名称..."
              className="w-full h-9 pl-9 pr-3 text-sm bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--border-strong)] focus:shadow-[0_0_0_1px_var(--accent-default)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-[var(--radius-md)] text-[var(--text-inverse)] transition-colors"
            style={{ background: 'var(--primary-default)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary-default)')}
          >
            <Plus className="w-4 h-4" />
            新建地图
          </button>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-[var(--radius-md)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            退出
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div className="flex items-stretch gap-3">
            <div className="w-40 p-3 bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
              <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">地图总数</div>
              <div className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{maps.length}</div>
            </div>
            <div className="w-40 p-3 bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
              <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">标注总数</div>
              <div className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{totalAnnotations}</div>
            </div>
            <div className="w-40 p-3 bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
              <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">当前结果</div>
              <div className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{filteredMaps.length}</div>
            </div>
          </div>
        </div>

        <section>
          {filteredMaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
              <MapPinned className="h-12 w-12 mb-4" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-base text-[var(--text-secondary)]">
                {maps.length === 0 ? '还没有地图，先新建一个项目' : '没有匹配到地图'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaps.map((map, idx) => (
                <article
                  key={map.id}
                  className="group bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] overflow-hidden cursor-pointer transition-colors hover:border-[var(--border-default)] hover:shadow-[var(--shadow-raised)]"
                >
                  <div
                    className="h-[168px] relative overflow-hidden border-b border-[var(--border-subtle)]"
                    style={{ background: thumbGradients[idx % thumbGradients.length] }}
                  >
                    <div className="absolute inset-0 flex items-start justify-center pt-8">
                      <MapPinned className="h-7 w-7" style={{ color: 'rgba(55,53,47,0.28)' }} />
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 text-xs font-medium rounded-[var(--radius-sm)] text-[var(--text-inverse)]" style={{ background: 'rgba(55,53,47,0.72)' }}>
                      {map.annotation_count} 标注
                    </div>
                    <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(map.id); }}
                        className="flex items-center justify-center w-7 h-7 bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3">
                    <button type="button" onClick={() => router.push('/admin?mapId=' + map.id)} className="min-w-0 text-left">
                      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] truncate mb-1">{map.name}</h3>
                    </button>
                    <p className="text-[13px] leading-relaxed text-[var(--text-secondary)] line-clamp-2 min-h-[2.5rem] mb-2">
                      {map.description || '地图项目'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                      <span>{map.annotation_count} 条标注</span>
                      <span>{map.updated_at ? new Date(map.updated_at).toLocaleDateString() : '—'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenPublicMap(map.id); }}
                        className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                        title="查看前台"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push('/admin?mapId=' + map.id); }}
                        className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                        title="编辑"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleShareMap(map); }}
                        className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                        title="分享"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md mx-4 bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-overlay)]">
            <h3 className="text-base font-semibold mb-4 text-[var(--text-primary)]">新建地图</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[var(--text-secondary)]">地图名称 *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如：土地成交数据"
                  className="w-full h-9 px-3 text-sm bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--border-strong)] focus:shadow-[0_0_0_1px_var(--accent-default)]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[var(--text-secondary)]">备注（可选）</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="地图用途说明..."
                  rows={2}
                  className="w-full resize-none px-3 py-2 text-sm bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--border-strong)] focus:shadow-[0_0_0_1px_var(--accent-default)]"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="h-8 px-4 text-sm font-medium rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="h-8 px-4 text-sm font-medium rounded-[var(--radius-md)] text-[var(--text-inverse)] disabled:opacity-40 transition-colors"
                style={{ background: newName.trim() && !creating ? 'var(--primary-default)' : 'var(--border-default)' }}
              >
                {creating && <Loader2 className="inline w-3.5 h-3.5 animate-spin mr-1" />}
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm mx-4 bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-overlay)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]" style={{ background: 'var(--danger-bg)' }}>
                <AlertTriangle className="h-5 w-5" style={{ color: 'var(--danger-text)' }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">确认删除</h3>
                <p className="text-xs text-[var(--text-secondary)]">此操作不可撤销，地图及所有标注将永久删除。</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="h-8 px-4 text-sm font-medium rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="h-8 px-4 text-sm font-medium rounded-[var(--radius-md)] text-[var(--text-inverse)] transition-colors"
                style={{ background: 'var(--danger-text)' }}
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
