import { useState, useCallback, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { v4 as uuid } from 'uuid';
import { KanbanLaneComponent } from './KanbanLane';
import { CardModal } from './CardModal';
import { BoardHeader } from './BoardHeader';
import { BoardSidebar } from './BoardSidebar';
import { ListView } from './ListView';
import { AnalyticsView } from './AnalyticsView';
import { ShortcutsHelp } from './shared/ShortcutsHelp';
import { createNewCard, createNewLane, createDefaultBoard } from '../lib/markdown';
import type { KanbanBoard as BoardType, KanbanCard, KanbanLane, BoardMeta } from '../types/kanban';

interface Props {
  board: BoardType;
  onChange: (board: BoardType) => void;
}

export function KanbanBoard({ board, onChange }: Props) {
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [addingLane, setAddingLane] = useState(false);
  const [newLaneTitle, setNewLaneTitle] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedLaneId, setSelectedLaneId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const boardRef = useRef(board);
  boardRef.current = board;

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        return;
      }

      switch (e.key) {
        case '?':
          e.preventDefault();
          setShowShortcuts(v => !v);
          break;
        case 'n':
        case 'N':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleQuickAddCard();
          }
          break;
        case 'l':
        case 'L':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleQuickAddLane();
          }
          break;
        case 'v':
        case 'V':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const cur = boardRef.current;
            const newView = cur.meta.viewMode === 'board' ? 'list' : 'board';
            onChange({ ...cur, meta: { ...cur.meta, viewMode: newView } });
          }
          break;
        case 'Escape':
          if (showShortcuts) setShowShortcuts(false);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChange, showShortcuts]);

  const updateBoard = useCallback(
    (updater: (lanes: KanbanLane[]) => KanbanLane[]) => {
      const cur = boardRef.current;
      const newLanes = updater(cur.lanes.map((l) => ({ ...l, cards: [...l.cards] })));
      onChange({ ...cur, lanes: newLanes });
    },
    [onChange]
  );

  const handleUpdateMeta = useCallback(
    (partial: Partial<BoardMeta>) => {
      const cur = boardRef.current;
      onChange({ ...cur, meta: { ...cur.meta, ...partial } });
    },
    [onChange]
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, type } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;

      if (type === 'LANE') {
        updateBoard((lanes) => {
          const [moved] = lanes.splice(source.index, 1);
          lanes.splice(destination.index, 0, moved);
          return lanes;
        });
        return;
      }

      updateBoard((lanes) => {
        const srcLane = lanes.find((l) => l.id === source.droppableId);
        const destLane = lanes.find((l) => l.id === destination.droppableId);
        if (!srcLane || !destLane) return lanes;
        const [movedCard] = srcLane.cards.splice(source.index, 1);
        destLane.cards.splice(destination.index, 0, movedCard);
        return lanes;
      });
      showToast('Card moved');
    },
    [updateBoard, showToast]
  );

  const handleAddCard = useCallback(
    (laneId: string, title: string) => {
      const card = createNewCard(title);
      updateBoard((lanes) => {
        const lane = lanes.find((l) => l.id === laneId);
        if (lane) lane.cards.push(card);
        return lanes;
      });
      showToast('Card created');
    },
    [updateBoard, showToast]
  );

  const handleQuickAddCard = useCallback(() => {
    const cur = boardRef.current;
    if (cur.lanes.length === 0) return;
    const targetLane = selectedLaneId
      ? cur.lanes.find(l => l.id === selectedLaneId) || cur.lanes[0]
      : cur.lanes[0];
    const card = createNewCard('New Card');
    updateBoard((lanes) => {
      const lane = lanes.find((l) => l.id === targetLane.id);
      if (lane) lane.cards.push(card);
      return lanes;
    });
    showToast('Card created');
  }, [updateBoard, showToast, selectedLaneId]);

  const handleQuickAddLane = useCallback(() => {
    const lane = createNewLane('New Lane');
    const cur = boardRef.current;
    onChange({ ...cur, lanes: [...cur.lanes, lane] });
    showToast('Lane created');
  }, [onChange, showToast]);

  const handleDeleteLane = useCallback(
    (laneId: string) => {
      updateBoard((lanes) => lanes.filter((l) => l.id !== laneId));
      showToast('Lane deleted');
    },
    [updateBoard, showToast]
  );

  const handleDuplicateLane = useCallback(
    (laneId: string) => {
      updateBoard((lanes) => {
        const idx = lanes.findIndex((l) => l.id === laneId);
        if (idx === -1) return lanes;
        const original = lanes[idx];
        const duplicate: KanbanLane = {
          id: uuid(),
          title: `${original.title} (copy)`,
          color: original.color,
          cards: original.cards.map((c) => ({ ...c, id: uuid() })),
          wipLimit: original.wipLimit,
        };
        lanes.splice(idx + 1, 0, duplicate);
        return lanes;
      });
      showToast('Lane duplicated');
    },
    [updateBoard, showToast]
  );

  const handleRenameLane = useCallback(
    (laneId: string, title: string) => {
      updateBoard((lanes) => {
        const lane = lanes.find((l) => l.id === laneId);
        if (lane) lane.title = title;
        return lanes;
      });
    },
    [updateBoard]
  );

  const handleSetLaneColor = useCallback(
    (laneId: string, color: string) => {
      updateBoard((lanes) => {
        const lane = lanes.find((l) => l.id === laneId);
        if (lane) lane.color = color;
        return lanes;
      });
    },
    [updateBoard]
  );

  const handleSetWipLimit = useCallback(
    (laneId: string, limit: number) => {
      updateBoard((lanes) => {
        const lane = lanes.find((l) => l.id === laneId);
        if (lane) lane.wipLimit = limit;
        return lanes;
      });
    },
    [updateBoard]
  );

  const handleSaveCard = useCallback(
    (updatedCard: KanbanCard) => {
      updateBoard((lanes) => {
        for (const lane of lanes) {
          const idx = lane.cards.findIndex((c) => c.id === updatedCard.id);
          if (idx !== -1) {
            lane.cards[idx] = updatedCard;
            break;
          }
        }
        return lanes;
      });
    },
    [updateBoard]
  );

  const handleDeleteCard = useCallback(
    (cardId: string) => {
      updateBoard((lanes) => {
        for (const lane of lanes) {
          const idx = lane.cards.findIndex((c) => c.id === cardId);
          if (idx !== -1) {
            lane.cards.splice(idx, 1);
            break;
          }
        }
        return lanes;
      });
      showToast('Card deleted');
    },
    [updateBoard, showToast]
  );

  const handleReorderLanes = useCallback(
    (newLanes: KanbanLane[]) => {
      const cur = boardRef.current;
      onChange({ ...cur, lanes: newLanes });
    },
    [onChange]
  );

  const handleAddLane = () => {
    const trimmed = newLaneTitle.trim();
    if (!trimmed) return;
    const lane = createNewLane(trimmed);
    const cur = boardRef.current;
    onChange({ ...cur, lanes: [...cur.lanes, lane] });
    setNewLaneTitle('');
    setAddingLane(false);
    showToast('Lane created');
  };

  // Empty state
  if (board.lanes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <h2 className="empty-state-title">No board yet</h2>
        <p className="empty-state-text">Get started with a default Kanban board or add your own lanes.</p>
        <div className="empty-state-actions">
          <button className="empty-state-primary" onClick={() => onChange(createDefaultBoard())}>
            Create Default Board
          </button>
          <button
            className="empty-state-secondary"
            onClick={() => {
              const lane = createNewLane('My Lane');
              onChange({ ...boardRef.current, lanes: [lane] });
            }}
          >
            Start Empty
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`kb-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <BoardSidebar
        board={board}
        selectedLaneId={selectedLaneId}
        onSelectLane={setSelectedLaneId}
        onAddCard={handleQuickAddCard}
        onAddLane={handleQuickAddLane}
        onReorderLanes={handleReorderLanes}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
      />

      <div className="kb-content">
        <BoardHeader
          board={board}
          onUpdateMeta={handleUpdateMeta}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          onShowShortcuts={() => setShowShortcuts(true)}
          onAddCard={handleQuickAddCard}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {board.meta.viewMode === 'analytics' ? (
          <AnalyticsView board={board} />
        ) : board.meta.viewMode === 'list' ? (
          <ListView
            lanes={board.lanes}
            onCardClick={setEditingCard}
            onAddCard={handleAddCard}
            onDragEnd={handleDragEnd}
            onAddLane={(title: string) => {
              const lane = createNewLane(title);
              const cur = boardRef.current;
              onChange({ ...cur, lanes: [...cur.lanes, lane] });
              showToast('Lane created');
            }}
          />
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="board" type="LANE" direction="horizontal">
              {(provided) => (
                <div
                  className="kanban-board"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {board.lanes.map((lane, index) => (
                    <Draggable key={lane.id} draggableId={lane.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`lane-wrapper ${snapshot.isDragging ? 'lane-dragging' : ''}`}
                        >
                          <KanbanLaneComponent
                            lane={lane}
                            onCardClick={setEditingCard}
                            onAddCard={handleAddCard}
                            onDeleteLane={handleDeleteLane}
                            onDuplicateLane={handleDuplicateLane}
                            onRenameLane={handleRenameLane}
                            onSetLaneColor={handleSetLaneColor}
                            onSetWipLimit={handleSetWipLimit}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  <div className="add-lane-container">
                    {addingLane ? (
                      <div className="add-lane-form">
                        <input
                          className="add-lane-input"
                          value={newLaneTitle}
                          onChange={(e) => setNewLaneTitle(e.target.value)}
                          placeholder="Lane title..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddLane();
                            if (e.key === 'Escape') {
                              setAddingLane(false);
                              setNewLaneTitle('');
                            }
                          }}
                          onBlur={() => {
                            if (!newLaneTitle.trim()) {
                              setAddingLane(false);
                            }
                          }}
                        />
                        <div className="add-lane-buttons">
                          <button className="confirm-add-lane" onClick={handleAddLane}>Add</button>
                          <button className="cancel-add-lane" onClick={() => { setAddingLane(false); setNewLaneTitle(''); }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="add-lane-btn" onClick={() => setAddingLane(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Lane
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {editingCard && (
        <CardModal
          card={editingCard}
          onSave={handleSaveCard}
          onDelete={handleDeleteCard}
          onClose={() => setEditingCard(null)}
        />
      )}

      {showShortcuts && <ShortcutsHelp onClose={() => setShowShortcuts(false)} />}

      {toast && <div className="kb-toast">{toast}</div>}
    </div>
  );
}
