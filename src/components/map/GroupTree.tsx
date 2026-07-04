'use client';

import { useState, useCallback } from 'react';
import { Group } from '@/lib/types';
import { apiSend } from '@/lib/api';
import {
  FolderOpen, Plus, ChevronRight, ChevronDown,
  Edit3, Trash2, MoreHorizontal, Palette,
} from 'lucide-react';

interface GroupTreeProps {
  groups: Group[];
  mapId: string;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onGroupsChange: () => void;
  annotationCountByGroup: Record<string, number>;
}

const GROUP_COLORS = ['#1a4735', '#2d6b52', '#c0392b', '#2c6fbb', '#d4954e', '#6b7280', '#7c3aed', '#db2777', '#ea580c', '#0891b2'];

export default function GroupTree({
  groups,
  mapId,
  selectedGroupId,
  onSelectGroup,
  onGroupsChange,
  annotationCountByGroup,
}: GroupTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; group: Group } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [changingColor, setChangingColor] = useState<string | null>(null);

  // 构建树形结构
  const rootGroups = groups.filter((g) => !g.parent_id);
  const childrenOf = (parentId: string) => groups.filter((g) => g.parent_id === parentId);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, group: Group) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, group });
  };

  const handleRename = useCallback(async (groupId: string) => {
    if (!renameValue.trim()) { setRenaming(null); return; }
    try {
      await apiSend('/api/groups', 'PUT', { id: groupId, name: renameValue.trim() });
      onGroupsChange();
    } catch (err) {
      console.error('重命名失败:', err);
    }
    setRenaming(null);
  }, [renameValue, onGroupsChange]);

  const handleDelete = useCallback(async (groupId: string) => {
    try {
      await apiSend('/api/groups', 'DELETE', { id: groupId });
      if (selectedGroupId === groupId) onSelectGroup(null);
      onGroupsChange();
    } catch (err) {
      console.error('删除分组失败:', err);
    }
    setContextMenu(null);
  }, [onGroupsChange, onSelectGroup, selectedGroupId]);

  const handleCreateSubGroup = useCallback(async (parentId: string | null) => {
    const name = prompt('请输入分组名称：');
    if (!name?.trim()) return;
    try {
      await apiSend('/api/groups', 'POST', { mapId, name: name.trim(), parentId });
      if (parentId) {
        setExpanded((prev) => { const n = new Set(prev); n.add(parentId); return n; });
      }
      onGroupsChange();
    } catch (err) {
      console.error('创建分组失败:', err);
    }
    setContextMenu(null);
  }, [mapId, onGroupsChange]);

  const handleColorChange = useCallback(async (groupId: string, color: string) => {
    try {
      await apiSend('/api/groups', 'PUT', { id: groupId, color });
      onGroupsChange();
    } catch (err) {
      console.error('更新颜色失败:', err);
    }
    setChangingColor(null);
  }, [onGroupsChange]);

  // 关闭右键菜单
  const closeContextMenu = () => setContextMenu(null);
  const onContextMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    closeContextMenu();
  }, []);

  const renderGroup = (group: Group, depth: number = 0) => {
    const children = childrenOf(group.id);
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(group.id);
    const isSelected = selectedGroupId === group.id;
    const count = annotationCountByGroup[group.id] ?? 0;
    const showColorPicker = changingColor === group.id;

    return (
      <div key={group.id}>
        <div
          className={`group flex items-center gap-1 px-2 py-1.5 rounded-xl cursor-pointer transition-all text-sm ${
            isSelected ? 'font-medium' : ''
          }`}
          style={Object.assign(
            { paddingLeft: `${12 + depth * 16}px` },
            isSelected ? { background: 'rgba(26,71,53,0.06)', color: 'var(--primary)' } : { color: 'var(--muted)' }
          )}
          onClick={() => onSelectGroup(isSelected ? null : group.id)}
          onContextMenu={(e) => handleContextMenu(e, group)}
        >
          {/* 展开/折叠图标 */}
          <button
            onClick={(e) => { e.stopPropagation(); toggle(group.id); }}
            className="p-0.5 opacity-50 hover:opacity-100"
            aria-label={isExpanded ? '折叠' : '展开'}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <span className="w-3.5 h-3.5 inline-block" />
            )}
          </button>

          {/* 颜色标记 (可点击换色) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setChangingColor(changingColor === group.id ? null : group.id);
            }}
            className="w-4 h-4 rounded shrink-0 transition-transform hover:scale-110"
            style={{ background: group.color || '#d1d5db' }}
            title="点击更换颜色"
            aria-label="更换颜色"
          />

          {/* 名称 */}
          {renaming === group.id ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => handleRename(group.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(group.id); if (e.key === 'Escape') setRenaming(null); }}
              className="flex-1 min-w-0 rounded-lg px-2 py-1 text-sm outline-none"
              style={{ border: '1px solid var(--primary)', boxShadow: '0 0 0 1px rgba(26,71,53,0.12)', background: 'rgba(255,255,255,0.8)' }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 min-w-0 truncate">{group.name}</span>
          )}

          {/* 标注数量 */}
          <span className="text-xs ml-auto shrink-0" style={{ color: 'var(--faint)' }}>{count || ''}</span>

          {/* 更多按钮 */}
          <button
            onClick={(e) => handleContextMenu(e, group)}
            className="rounded-full p-0.5 opacity-0 group-hover:opacity-50 hover:opacity-100"
            aria-label="更多操作"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 颜色选择器 */}
        {showColorPicker && (
          <div
            className="flex flex-wrap gap-1 px-2 py-1.5 ml-8 rounded-lg"
            style={{ background: 'var(--bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {GROUP_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleColorChange(group.id, c)}
                className="w-5 h-5 rounded-full transition-all duration-150 hover:scale-125"
                style={{
                  background: c,
                  outline: group.color === c ? '2px solid var(--ink)' : 'none',
                  outlineOffset: '2px',
                }}
                title={c}
                aria-label={`设置颜色 ${c}`}
              />
            ))}
            <button
              onClick={() => handleColorChange(group.id, '')}
              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-150 hover:scale-125"
              style={{ background: 'var(--border)', color: 'var(--muted)' }}
              title="清除颜色"
              aria-label="清除颜色"
            >
              ✕
            </button>
          </div>
        )}

        {/* 子分组 */}
        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => renderGroup(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-2">
      {/* 全部标注 */}
      <div
        className={`mb-1 flex items-center gap-2 rounded-xl px-3 py-1.5 cursor-pointer text-sm ${
          selectedGroupId === null ? 'font-medium' : ''
        }`}
        style={selectedGroupId === null ? { background: 'rgba(26,71,53,0.06)', color: 'var(--primary)' } : { color: 'var(--muted)' }}
        onClick={() => onSelectGroup(null)}
      >
        <FolderOpen className="w-4 h-4" style={{ color: 'var(--faint)' }} />
        <span>全部标注</span>
        <span className="ml-auto text-xs" style={{ color: 'var(--faint)' }}>
          {Object.values(annotationCountByGroup).reduce((a, b) => a + b, 0) || ''}
        </span>
      </div>

      {/* 分组树 */}
      {rootGroups.map((group) => renderGroup(group))}

      {/* 无分组状态 */}
      {rootGroups.length === 0 && (
        <p className="py-4 text-center text-xs" style={{ color: 'var(--faint)' }}>暂无分组，右键「全部标注」可新建</p>
      )}

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed z-[9999] min-w-[148px] rounded-[20px] border py-1 shadow-[0_24px_60px_rgba(37,28,18,0.16)]"
          style={{ left: contextMenu.x, top: contextMenu.y, borderColor: 'var(--border)', background: 'var(--surface-strong)' }}
          onClick={onContextMenuClick}
        >
          <button
            onClick={() => handleCreateSubGroup(contextMenu.group.id)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition"
            style={{ color: 'var(--ink)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            新建子分组
          </button>
          <button
            onClick={() => {
              setRenaming(contextMenu.group.id);
              setRenameValue(contextMenu.group.name);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition"
            style={{ color: 'var(--ink)' }}
          >
            <Edit3 className="w-3.5 h-3.5" />
            重命名
          </button>
          <button
            onClick={() => {
              setChangingColor(contextMenu.group.id);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition"
            style={{ color: 'var(--ink)' }}
          >
            <Palette className="w-3.5 h-3.5" />
            更换颜色
          </button>
          <button
            onClick={() => handleDelete(contextMenu.group.id)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition"
            style={{ color: 'var(--danger)' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除
          </button>
        </div>
      )}

      {/* 点击空白关闭右键菜单 */}
      {contextMenu && (
        <div className="fixed inset-0 z-[9998]" onClick={closeContextMenu} />
      )}
    </div>
  );
}
