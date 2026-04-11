import { useState, memo } from 'react';
import type { KanbanBoard, KanbanLane } from '../types/kanban';
import { getColorHex, hexToRgba } from '../lib/colors';

interface Props {
  board: KanbanBoard;
  selectedLaneId: string | null;
  onSelectLane: (id: string | null) => void;
  onAddCard: () => void;
  onAddLane: () => void;
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}

export const BoardSidebar = memo(function BoardSidebar({
  board,
  selectedLaneId,
  onSelectLane,
  onAddCard,
  onAddLane,
  sidebarOpen,
  onCloseSidebar,
}: Props) {
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());
  const totalCards = board.lanes.reduce((sum, l) => sum + l.cards.length, 0);

  const toggleCollapse = (laneId: string) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev);
      if (next.has(laneId)) next.delete(laneId);
      else next.add(laneId);
      return next;
    });
  };

  const handleItemClick = (laneId: string | null) => {
    onSelectLane(laneId);
    onCloseSidebar();
  };

  return (
    <>
      {sidebarOpen && <div className="kb-sidebar-overlay" onClick={onCloseSidebar} />}
      <aside className={`kb-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="kb-sidebar-header">
          <span className="kb-sidebar-title">MY BOARDS</span>
          <span className="kb-sidebar-count">{totalCards} card{totalCards !== 1 ? 's' : ''}</span>
        </div>

        <div className="kb-sidebar-list">
          <button
            className={`kb-sidebar-item ${selectedLaneId === null ? 'selected' : ''}`}
            onClick={() => handleItemClick(null)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="22 12 16 12 14 15 10 9 8 12 2 12" />
            </svg>
            <span className="kb-sidebar-name">All Cards</span>
            <span className="kb-sidebar-pct">{totalCards}</span>
          </button>

          {board.lanes.map(lane => (
            <SidebarLaneSection
              key={lane.id}
              lane={lane}
              selected={selectedLaneId === lane.id}
              collapsed={collapsedLanes.has(lane.id)}
              onSelect={() => handleItemClick(lane.id)}
              onToggleCollapse={() => toggleCollapse(lane.id)}
            />
          ))}
        </div>

        <div className="kb-sidebar-footer">
          <button className="kb-footer-btn" onClick={onAddCard}>+ Add Card</button>
          <button className="kb-footer-btn" onClick={onAddLane}>+ Add Lane</button>
        </div>
      </aside>
    </>
  );
});

function SidebarLaneSection({
  lane,
  selected,
  collapsed,
  onSelect,
  onToggleCollapse,
}: {
  lane: KanbanLane;
  selected: boolean;
  collapsed: boolean;
  onSelect: () => void;
  onToggleCollapse: () => void;
}) {
  const colorHex = getColorHex(lane.color) || '#a1a1aa';

  return (
    <div className="kb-sidebar-section">
      <button
        className={`kb-sidebar-item ${selected ? 'selected' : ''}`}
        onClick={onSelect}
      >
        <span className="kb-lane-dot" style={{ background: colorHex }} />
        <span className="kb-sidebar-name">{lane.title}</span>
        <span
          className="kb-lane-count"
          style={{
            background: hexToRgba(colorHex, 0.15),
            color: colorHex,
          }}
        >
          {lane.cards.length}
        </span>
        <span
          className={`kb-lane-arrow ${collapsed ? 'collapsed' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {!collapsed && lane.cards.length > 0 && (
        <div className="kb-sidebar-cards">
          {lane.cards.map(card => (
            <div key={card.id} className="kb-sidebar-card-item">
              <span className="kb-sidebar-card-title">{card.title || 'Untitled'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
