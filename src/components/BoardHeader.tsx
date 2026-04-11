import { useState, useRef, useEffect, memo } from 'react';
import type { KanbanBoard, BoardMeta, ViewMode } from '../types/kanban';
import { ExportMenu } from './shared/ExportMenu';

interface Props {
  board: KanbanBoard;
  onUpdateMeta: (partial: Partial<BoardMeta>) => void;
  onToggleSidebar: () => void;
  onShowShortcuts: () => void;
  onAddCard: () => void;
}

export const BoardHeader = memo(function BoardHeader({
  board,
  onUpdateMeta,
  onToggleSidebar,
  onShowShortcuts,
  onAddCard,
}: Props) {
  const { meta, lanes } = board;
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(meta.title);
  const [descDraft, setDescDraft] = useState(meta.description);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTitleDraft(meta.title); }, [meta.title]);
  useEffect(() => { setDescDraft(meta.description); }, [meta.description]);
  useEffect(() => { if (editing) { titleRef.current?.focus(); titleRef.current?.select(); } }, [editing]);

  const cardCount = lanes.reduce((sum, l) => sum + l.cards.length, 0);

  const finishEdit = () => {
    setEditing(false);
    const trimTitle = titleDraft.trim();
    const trimDesc = descDraft.trim();
    const updates: Partial<BoardMeta> = {};
    if (trimTitle !== meta.title) updates.title = trimTitle;
    if (trimDesc !== meta.description) updates.description = trimDesc;
    if (Object.keys(updates).length > 0) onUpdateMeta(updates);
  };

  const cancelEdit = () => {
    setTitleDraft(meta.title);
    setDescDraft(meta.description);
    setEditing(false);
  };

  const setView = (v: ViewMode) => onUpdateMeta({ viewMode: v });

  return (
    <div className="kb-header">
      {/* Hamburger — mobile only */}
      <button className="kb-menu-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="2" y1="4" x2="16" y2="4" />
          <line x1="2" y1="9" x2="16" y2="9" />
          <line x1="2" y1="14" x2="16" y2="14" />
        </svg>
      </button>

      <div className="kb-header-left">
        {editing ? (
          <div className="kb-title-edit">
            <input
              ref={titleRef}
              className="kb-title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') finishEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              onBlur={finishEdit}
              placeholder="Board title..."
            />
            <input
              className="kb-subtitle-input"
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') finishEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              onBlur={finishEdit}
              placeholder="Description..."
            />
          </div>
        ) : (
          <div className="kb-title-display" onDoubleClick={() => setEditing(true)}>
            <span className="kb-title-text">{meta.title || 'Untitled Board'}</span>
            <span className="kb-subtitle-text">{meta.description || 'Double-click to edit'}</span>
          </div>
        )}
        <div className="board-stats">
          <span>{lanes.length} {lanes.length === 1 ? 'column' : 'columns'}</span>
          <span className="board-stat-sep">&middot;</span>
          <span>{cardCount} {cardCount === 1 ? 'card' : 'cards'}</span>
        </div>
      </div>

      <div className="kb-view-toggle">
        <button
          className={`view-toggle-btn ${meta.viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setView('list')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span className="view-label">List</span>
        </button>
        <button
          className={`view-toggle-btn ${meta.viewMode === 'board' ? 'active' : ''}`}
          onClick={() => setView('board')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span className="view-label">Board</span>
        </button>
      </div>

      <div className="kb-header-right">
        <button className="btn-primary kb-add-card-btn" onClick={onAddCard}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="view-label">Add Card</span>
        </button>
        <ExportMenu board={board} />
        <button className="kb-icon-btn" onClick={onShowShortcuts} title="Keyboard shortcuts">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  );
});
