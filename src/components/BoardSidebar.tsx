import { useState, memo } from 'react';
import type { KanbanBoard } from '../types/kanban';
import { getColorHex, hexToRgba } from '../lib/colors';

interface Props {
  board: KanbanBoard;
  selectedStatusId: string | null;
  onSelectStatus: (id: string | null) => void;
  onAddCard: () => void;
  onOpenSchemaEditor: () => void;
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}

export const BoardSidebar = memo(function BoardSidebar({
  board, selectedStatusId, onSelectStatus, onAddCard, onOpenSchemaEditor, sidebarOpen, onCloseSidebar,
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const totalCards = board.cards.length;

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleClick = (id: string | null) => {
    onSelectStatus(id);
    onCloseSidebar();
  };

  return (
    <>
      {sidebarOpen && <div className="kb-sidebar-overlay" onClick={onCloseSidebar} />}
      <aside className={`kb-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="kb-sidebar-header">
          <span className="kb-sidebar-title">My Boards</span>
          <span className="kb-sidebar-count">{totalCards} card{totalCards !== 1 ? 's' : ''}</span>
        </div>

        <div className="kb-sidebar-list">
          <div className={`kb-sidebar-item ${selectedStatusId === null ? 'selected' : ''}`}
            onClick={() => handleClick(null)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="22 12 16 12 14 15 10 9 8 12 2 12" />
            </svg>
            <span className="kb-sidebar-name">All Cards</span>
          </div>

          {board.statuses.map(status => {
            const colorHex = getColorHex(status.color) || '#a1a1aa';
            const isCollapsed = collapsed[status.id];
            const statusCards = board.cards.filter(c => c.statusId === status.id);

            return (
              <div key={status.id} className="kb-sidebar-section">
                <div
                  className={`kb-sidebar-section-header ${selectedStatusId === status.id ? 'filtered' : ''}`}
                  style={{ background: hexToRgba(colorHex, 0.08) }}
                  onClick={() => handleClick(status.id)}
                  onDoubleClick={() => toggleCollapse(status.id)}
                >
                  <span className="kb-sidebar-section-dot" style={{ background: colorHex }} />
                  <span className="kb-sidebar-section-name">{status.name}</span>
                  <span className="kb-sidebar-section-count"
                    style={{ background: hexToRgba(colorHex, 0.15), color: colorHex }}>
                    {statusCards.length}
                  </span>
                  <span className={`kb-sidebar-section-arrow ${isCollapsed ? 'collapsed' : ''}`}
                    onClick={e => { e.stopPropagation(); toggleCollapse(status.id); }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>
                {!isCollapsed && statusCards.map(card => (
                  <div key={card.id} className="kb-sidebar-item kb-sidebar-card-item">
                    <span className="kb-sidebar-name">{card.title || 'Untitled'}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="kb-sidebar-footer">
          <button className="kb-sidebar-add-btn" onClick={onAddCard}>+ Add Card</button>
          <button className="kb-sidebar-add-btn" onClick={onOpenSchemaEditor}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Settings
          </button>
        </div>
      </aside>
    </>
  );
});
