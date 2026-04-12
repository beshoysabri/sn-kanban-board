import { useState, useRef, useEffect, memo } from 'react';
import type { KanbanBoard, BoardMeta, ViewMode } from '../types/kanban';
import { ExportMenu } from './shared/ExportMenu';

interface Props {
  board: KanbanBoard;
  onUpdateMeta: (partial: Partial<BoardMeta>) => void;
  onToggleSidebar: () => void;
  onShowShortcuts: () => void;
  onOpenSchemaEditor: () => void;
  onAddCard: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const VIEW_ICONS: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
  { key: 'list', label: 'List', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> },
  { key: 'board', label: 'Board', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="5" height="18" rx="1" /><rect x="10" y="3" width="5" height="12" rx="1" /><rect x="17" y="3" width="5" height="15" rx="1" /></svg> },
  { key: 'table', label: 'Table', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /></svg> },
  { key: 'analytics', label: 'Analytics', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> },
];

export const BoardHeader = memo(function BoardHeader({
  board, onUpdateMeta, onToggleSidebar, onShowShortcuts, onOpenSchemaEditor, onAddCard, searchQuery, onSearchChange,
}: Props) {
  const { meta } = board;
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(meta.title);
  const [descDraft, setDescDraft] = useState(meta.description);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTitleDraft(meta.title); }, [meta.title]);
  useEffect(() => { setDescDraft(meta.description); }, [meta.description]);
  useEffect(() => { if (editing) { titleRef.current?.focus(); titleRef.current?.select(); } }, [editing]);

  const handleSave = () => {
    onUpdateMeta({ title: titleDraft.trim(), description: descDraft.trim() });
    setEditing(false);
  };

  // Per-view groupBy/subGroupBy keys
  const viewPrefix = meta.viewMode === 'list' ? 'list' : meta.viewMode === 'table' ? 'table' : 'board';
  const groupByKey = `${viewPrefix}GroupBy`;
  const subGroupByKey = `${viewPrefix}SubGroupBy`;
  const currentGroupBy = (meta as unknown as Record<string, string>)[groupByKey] || 'status';
  const currentSubGroupBy = (meta as unknown as Record<string, string>)[subGroupByKey] || '';

  return (
    <div className="kb-header">
      <div className="kb-header-left">
        <button className="kb-icon-btn kb-hamburger" onClick={onToggleSidebar} title="Toggle sidebar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {editing ? (
          <div className="kb-title-edit">
            <input ref={titleRef} className="kb-title-input" value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)} placeholder="Page title"
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }} />
            <input className="kb-subtitle-input" value={descDraft}
              onChange={e => setDescDraft(e.target.value)} placeholder="Subtitle (optional)"
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }} />
            <button className="btn-primary btn-sm" onClick={handleSave}>Save</button>
          </div>
        ) : (
          <div className="kb-title-display" onDoubleClick={() => { setTitleDraft(meta.title || ''); setDescDraft(meta.description || ''); setEditing(true); }}>
            <span className="kb-title-text">{meta.title || 'Kanban Board'}</span>
            {meta.description && <span className="kb-subtitle-text">{meta.description}</span>}
          </div>
        )}
        {!editing && (
          <div className="kb-view-toggle">
            {VIEW_ICONS.map(v => (
              <button key={v.key} className={`kb-view-btn ${meta.viewMode === v.key ? 'active' : ''}`}
                onClick={() => onUpdateMeta({ viewMode: v.key })} title={v.label}>
                {v.icon}
                <span className="kb-view-btn-label">{v.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* View-specific group-by / sub-group-by / sort controls */}
      {!editing && meta.viewMode !== 'analytics' && (
        <div className="kb-header-controls">
          <select className="kb-control-select form-select" title="Group by"
            value={currentGroupBy} onChange={e => onUpdateMeta({ [groupByKey]: e.target.value })}>
            <option value="status">Group: Status</option>
            <option value="group">Group: Group</option>
          </select>
          <select className="kb-control-select form-select" title="Sub-group by"
            value={currentSubGroupBy} onChange={e => onUpdateMeta({ [subGroupByKey]: e.target.value })}>
            <option value="">Swim: None</option>
            <option value="group">Swim: Group</option>
            <option value="subGroup">Swim: Sub-Group</option>
            <option value="status">Swim: Status</option>
          </select>
        </div>
      )}

      <div className="kb-header-right">
        <div className="kb-search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="Search..." value={searchQuery}
            onChange={e => onSearchChange(e.target.value)} className="kb-search-input" />
        </div>
        <ExportMenu board={board} />
        <button className="kb-icon-btn" onClick={onOpenSchemaEditor} title="Board settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
        <button className="kb-icon-btn" onClick={onShowShortcuts} title="Keyboard shortcuts (?)">
          <span style={{ fontSize: 14, fontWeight: 700 }}>?</span>
        </button>
        <button className="btn-primary kb-add-btn" onClick={onAddCard}>+ Card</button>
      </div>
    </div>
  );
});
