import { useState, useRef, memo } from 'react';
import type { KanbanBoard, KanbanGroup } from '../types/kanban';
import { getColorHex, hexToRgba } from '../lib/colors';

interface Props {
  board: KanbanBoard;
  selectedGroupId: string | null;
  onSelectGroup: (id: string | null) => void;
  onAddCard: () => void;
  onAddGroup: () => void;
  onAddSubGroup: () => void;
  onReorderGroups: (groups: KanbanGroup[]) => void;
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}

export const BoardSidebar = memo(function BoardSidebar({
  board, selectedGroupId, onSelectGroup, onAddCard, onAddGroup, onAddSubGroup,
  onReorderGroups, sidebarOpen, onCloseSidebar,
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const totalCards = board.groups.reduce((sum, g) => sum + g.cards.length, 0);
  const dragRef = useRef<string | null>(null);

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleItemClick = (id: string | null) => {
    onSelectGroup(id);
    onCloseSidebar();
  };

  const handleDrop = (targetId: string) => {
    if (!dragRef.current || dragRef.current === targetId) return;
    const sorted = [...board.groups];
    const fromIdx = sorted.findIndex(g => g.id === dragRef.current);
    const toIdx = sorted.findIndex(g => g.id === targetId);
    if (fromIdx >= 0 && toIdx >= 0) {
      const [moved] = sorted.splice(fromIdx, 1);
      sorted.splice(toIdx, 0, moved);
      onReorderGroups(sorted);
    }
    dragRef.current = null;
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
          <div className={`kb-sidebar-item ${selectedGroupId === null ? 'selected' : ''}`}
            onClick={() => handleItemClick(null)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="22 12 16 12 14 15 10 9 8 12 2 12" />
            </svg>
            <span className="kb-sidebar-name">All Cards</span>
          </div>

          {board.groups.map(group => {
            const colorHex = getColorHex(group.color) || '#a1a1aa';
            const isCollapsed = collapsed[group.id];

            return (
              <div key={group.id} className="kb-sidebar-section">
                <div
                  className={`kb-sidebar-section-header ${selectedGroupId === group.id ? 'filtered' : ''}`}
                  style={{ background: hexToRgba(colorHex, 0.08) }}
                  draggable
                  onClick={() => handleItemClick(group.id)}
                  onDoubleClick={() => toggleCollapse(group.id)}
                  onDragStart={() => { dragRef.current = group.id; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(group.id)}
                  onDragEnd={() => { dragRef.current = null; }}
                >
                  <span className="kb-sidebar-drag-handle" title="Drag to reorder">&#x2807;</span>
                  <span className="kb-sidebar-section-dot" style={{ background: colorHex }} />
                  <span className="kb-sidebar-section-name">{group.title}</span>
                  <span className="kb-sidebar-section-count"
                    style={{ background: hexToRgba(colorHex, 0.15), color: colorHex }}>
                    {group.cards.length}
                  </span>
                  <span className={`kb-sidebar-section-arrow ${isCollapsed ? 'collapsed' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleCollapse(group.id); }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>

                {!isCollapsed && group.cards.map(card => (
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
          <button className="kb-sidebar-add-btn" onClick={onAddGroup}>+ Add Group</button>
          <button className="kb-sidebar-add-btn" onClick={onAddSubGroup}>+ Add Sub-group</button>
        </div>
      </aside>
    </>
  );
});
