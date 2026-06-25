'use client';

import { useState, useCallback } from 'react';
import { Group } from '@/lib/types';
import { apiSend } from '@/lib/api';
import {
  FolderOpen, Folder, Plus, ChevronRight, ChevronDown,
  Edit3, Trash2, MoreHorizontal, Loader2,
} from 'lucide-react';

interface GroupTreeProps {
  groups: Group[];
  mapId: string;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onGroupsChange: () => void;
  annotationCountByGroup: Record<string, number>;
}

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
  const [creating, setCreating] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);

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

    return (
      <div key={group.id}>
        <div
          className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-all text-sm ${
            isSelected
              ? 'font-medium'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          style={Object.assign(
            { paddingLeft: `${12 + depth * 16}px` },
            isSelected ? { background: 'rgba(120,165,135,0.04)', color: '#78a587' } : {}
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

          {/* 文件夹图标 */}
          {group.color ? (
            <div className="w-4 h-4 rounded" style={{ background: group.color }} />
          ) : (
            isExpanded ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <Folder className="w-4 h-4 text-amber-500" />
          )}

          {/* 名称 */}
          {renaming === group.id ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={(e) => { handleRename(group.id); e.currentTarget.style.borderColor = '#5b7b5a'; }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(group.id); if (e.key === 'Escape') setRenaming(null); }}
              className="flex-1 min-w-0 px-1 py-0.5 border rounded text-sm outline-none"
              style={{ borderColor: '#78a587', boxShadow: '0 0 0 1px rgba(120,165,135,0.2)' }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 min-w-0 truncate">{group.name}</span>
          )}

          {/* 标注数量 */}
          <span className="text-xs text-gray-400 ml-auto shrink-0">{count || ''}</span>

          {/* 更多按钮 */}
          <button
            onClick={(e) => handleContextMenu(e, group)}
            className="p-0.5 opacity-0 group-hover:opacity-50 hover:opacity-100"
            aria-label="更多操作"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

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
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-sm mb-1 ${
          selectedGroupId === null
            ? 'font-medium'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        style={selectedGroupId === null ? { background: 'rgba(120,165,135,0.04)', color: '#78a587' } : undefined}
        onClick={() => onSelectGroup(null)}
      >
        <FolderOpen className="w-4 h-4 text-gray-400" />
        <span>全部标注</span>
        <span className="ml-auto text-xs text-gray-400">
          {Object.values(annotationCountByGroup).reduce((a, b) => a + b, 0) || ''}
        </span>
      </div>

      {/* 分组树 */}
      {rootGroups.map((group) => renderGroup(group))}

      {/* 无分组状态 */}
      {rootGroups.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">暂无分组，右键「全部标注」可新建</p>
      )}

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed z-[9999] bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={onContextMenuClick}
        >
          <button
            onClick={() => {
              const parentId = contextMenu.group.id;
              handleCreateSubGroup(parentId);
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
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
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
          >
            <Edit3 className="w-3.5 h-3.5" />
            重命名
          </button>
          <button
            onClick={() => handleDelete(contextMenu.group.id)}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
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