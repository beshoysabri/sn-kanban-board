import { useState, useCallback, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { v4 as uuid } from 'uuid';
import { KanbanGroupComponent } from './KanbanGroup';
import { CardModal } from './CardModal';
import { BoardHeader } from './BoardHeader';
import { BoardSidebar } from './BoardSidebar';
import { ListView } from './ListView';
import { AnalyticsView } from './AnalyticsView';
import { ShortcutsHelp } from './shared/ShortcutsHelp';
import { createNewCard, createNewGroup, createDefaultBoard } from '../lib/markdown';
import type { KanbanBoard as BoardType, KanbanCard, KanbanGroup, BoardMeta, SubGroup } from '../types/kanban';

interface Props {
  board: BoardType;
  onChange: (board: BoardType) => void;
}

export function KanbanBoard({ board, onChange }: Props) {
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const boardRef = useRef(board);
  boardRef.current = board;

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Lazy-load TableView
  const [TableView, setTableView] = useState<React.ComponentType<{ board: BoardType; onCardClick: (card: KanbanCard) => void }> | null>(null);
  useEffect(() => {
    if (board.meta.viewMode === 'table' && !TableView) {
      import('./TableView').then(mod => setTableView(() => mod.TableView));
    }
  }, [board.meta.viewMode, TableView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); return; }
      switch (e.key) {
        case '?': e.preventDefault(); setShowShortcuts(v => !v); break;
        case 'n': case 'N':
          if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); handleQuickAddCard(); } break;
        case 'l': case 'L':
          if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); handleQuickAddGroup(); } break;
        case 'v': case 'V':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const cur = boardRef.current;
            const views: BoardType['meta']['viewMode'][] = ['list', 'board', 'table', 'analytics'];
            const idx = views.indexOf(cur.meta.viewMode);
            const next = views[(idx + 1) % views.length];
            onChange({ ...cur, meta: { ...cur.meta, viewMode: next } });
          } break;
        case 'Escape': if (showShortcuts) setShowShortcuts(false); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChange, showShortcuts]);

  const updateBoard = useCallback(
    (updater: (groups: KanbanGroup[]) => KanbanGroup[]) => {
      const cur = boardRef.current;
      const newGroups = updater(cur.groups.map((g) => ({ ...g, cards: [...g.cards] })));
      onChange({ ...cur, groups: newGroups });
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
        updateBoard((groups) => {
          const [moved] = groups.splice(source.index, 1);
          groups.splice(destination.index, 0, moved);
          return groups;
        });
        return;
      }
      updateBoard((groups) => {
        const srcGroup = groups.find((g) => g.id === source.droppableId);
        const destGroup = groups.find((g) => g.id === destination.droppableId);
        if (!srcGroup || !destGroup) return groups;
        const [movedCard] = srcGroup.cards.splice(source.index, 1);
        destGroup.cards.splice(destination.index, 0, movedCard);
        return groups;
      });
      showToast('Card moved');
    },
    [updateBoard, showToast]
  );

  const handleAddCard = useCallback(
    (groupId: string, title: string) => {
      const card = createNewCard(title);
      updateBoard((groups) => {
        const group = groups.find((g) => g.id === groupId);
        if (group) group.cards.push(card);
        return groups;
      });
      showToast('Card created');
    },
    [updateBoard, showToast]
  );

  const handleQuickAddCard = useCallback(() => {
    const cur = boardRef.current;
    if (cur.groups.length === 0) return;
    const target = selectedGroupId
      ? cur.groups.find(g => g.id === selectedGroupId) || cur.groups[0]
      : cur.groups[0];
    const card = createNewCard('New Card');
    updateBoard((groups) => {
      const group = groups.find((g) => g.id === target.id);
      if (group) group.cards.push(card);
      return groups;
    });
    showToast('Card created');
  }, [updateBoard, showToast, selectedGroupId]);

  const handleQuickAddGroup = useCallback(() => {
    const group = createNewGroup('New Group');
    const cur = boardRef.current;
    onChange({ ...cur, groups: [...cur.groups, group] });
    showToast('Group created');
  }, [onChange, showToast]);

  const handleDeleteGroup = useCallback(
    (groupId: string) => { updateBoard((groups) => groups.filter((g) => g.id !== groupId)); showToast('Group deleted'); },
    [updateBoard, showToast]
  );

  const handleDuplicateGroup = useCallback(
    (groupId: string) => {
      updateBoard((groups) => {
        const idx = groups.findIndex((g) => g.id === groupId);
        if (idx === -1) return groups;
        const original = groups[idx];
        const dup: KanbanGroup = {
          id: uuid(), title: `${original.title} (copy)`, color: original.color,
          cards: original.cards.map((c) => ({ ...c, id: uuid() })), wipLimit: original.wipLimit,
        };
        groups.splice(idx + 1, 0, dup);
        return groups;
      });
      showToast('Group duplicated');
    },
    [updateBoard, showToast]
  );

  const handleRenameGroup = useCallback(
    (groupId: string, title: string) => {
      updateBoard((groups) => { const g = groups.find((g) => g.id === groupId); if (g) g.title = title; return groups; });
    },
    [updateBoard]
  );

  const handleSetGroupColor = useCallback(
    (groupId: string, color: string) => {
      updateBoard((groups) => { const g = groups.find((g) => g.id === groupId); if (g) g.color = color; return groups; });
    },
    [updateBoard]
  );

  const handleSetWipLimit = useCallback(
    (groupId: string, limit: number) => {
      updateBoard((groups) => { const g = groups.find((g) => g.id === groupId); if (g) g.wipLimit = limit; return groups; });
    },
    [updateBoard]
  );

  const handleReorderGroups = useCallback(
    (newGroups: KanbanGroup[]) => { const cur = boardRef.current; onChange({ ...cur, groups: newGroups }); },
    [onChange]
  );

  const handleSaveCard = useCallback(
    (updatedCard: KanbanCard) => {
      updateBoard((groups) => {
        for (const group of groups) {
          const idx = group.cards.findIndex((c) => c.id === updatedCard.id);
          if (idx !== -1) { group.cards[idx] = updatedCard; break; }
        }
        return groups;
      });
    },
    [updateBoard]
  );

  const handleDeleteCard = useCallback(
    (cardId: string) => {
      updateBoard((groups) => {
        for (const group of groups) {
          const idx = group.cards.findIndex((c) => c.id === cardId);
          if (idx !== -1) { group.cards.splice(idx, 1); break; }
        }
        return groups;
      });
      showToast('Card deleted');
    },
    [updateBoard, showToast]
  );

  const handleAddSubGroup = useCallback(() => {
    const name = prompt('Sub-group name:');
    if (!name?.trim()) return;
    const cur = boardRef.current;
    const sg: SubGroup = { id: uuid(), name: name.trim(), color: '' };
    onChange({ ...cur, subGroups: [...cur.subGroups, sg] });
    showToast('Sub-group created');
  }, [onChange, showToast]);

  const handleAddGroupFromForm = () => {
    const trimmed = newGroupTitle.trim();
    if (!trimmed) return;
    const group = createNewGroup(trimmed);
    const cur = boardRef.current;
    onChange({ ...cur, groups: [...cur.groups, group] });
    setNewGroupTitle('');
    setAddingGroup(false);
    showToast('Group created');
  };

  if (board.groups.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <h2 className="empty-state-title">No board yet</h2>
        <p className="empty-state-text">Get started with a default Kanban board or add your own groups.</p>
        <div className="empty-state-actions">
          <button className="empty-state-primary" onClick={() => onChange(createDefaultBoard())}>Create Default Board</button>
          <button className="empty-state-secondary" onClick={() => {
            const group = createNewGroup('My Group');
            onChange({ ...boardRef.current, groups: [group] });
          }}>Start Empty</button>
        </div>
      </div>
    );
  }

  const renderView = () => {
    if (board.meta.viewMode === 'analytics') return <AnalyticsView board={board} />;
    if (board.meta.viewMode === 'table') {
      if (TableView) return <TableView board={board} onCardClick={setEditingCard} />;
      return <div className="loading"><div className="loading-spinner" /></div>;
    }
    if (board.meta.viewMode === 'list') {
      return (
        <ListView
          groups={board.groups}
          onCardClick={setEditingCard}
          onAddCard={handleAddCard}
          onDragEnd={handleDragEnd}
          onAddGroup={(title: string) => {
            const group = createNewGroup(title);
            onChange({ ...boardRef.current, groups: [...boardRef.current.groups, group] });
            showToast('Group created');
          }}
        />
      );
    }
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board" type="LANE" direction="horizontal">
          {(provided) => (
            <div className="kanban-board" ref={provided.innerRef} {...provided.droppableProps}>
              {board.groups.map((group, index) => (
                <Draggable key={group.id} draggableId={group.id} index={index}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                      className={`lane-wrapper ${snapshot.isDragging ? 'lane-dragging' : ''}`}>
                      <KanbanGroupComponent
                        group={group}
                        subGroups={board.subGroups}
                        onCardClick={setEditingCard}
                        onAddCard={handleAddCard}
                        onDeleteGroup={handleDeleteGroup}
                        onDuplicateGroup={handleDuplicateGroup}
                        onRenameGroup={handleRenameGroup}
                        onSetGroupColor={handleSetGroupColor}
                        onSetWipLimit={handleSetWipLimit}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              <div className="add-lane-container">
                {addingGroup ? (
                  <div className="add-lane-form">
                    <input className="add-lane-input" value={newGroupTitle}
                      onChange={(e) => setNewGroupTitle(e.target.value)} placeholder="Group title..." autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddGroupFromForm(); if (e.key === 'Escape') { setAddingGroup(false); setNewGroupTitle(''); } }}
                      onBlur={() => { if (!newGroupTitle.trim()) setAddingGroup(false); }} />
                    <div className="add-lane-buttons">
                      <button className="confirm-add-lane" onClick={handleAddGroupFromForm}>Add</button>
                      <button className="cancel-add-lane" onClick={() => { setAddingGroup(false); setNewGroupTitle(''); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="add-lane-btn" onClick={() => setAddingGroup(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Group
                  </button>
                )}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );
  };

  return (
    <div className={`kb-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <BoardHeader
        board={board}
        onUpdateMeta={handleUpdateMeta}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
        onShowShortcuts={() => setShowShortcuts(true)}
        onAddCard={handleQuickAddCard}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="kb-body">
        <BoardSidebar
          board={board}
          selectedGroupId={selectedGroupId}
          onSelectGroup={setSelectedGroupId}
          onAddCard={handleQuickAddCard}
          onAddGroup={handleQuickAddGroup}
          onAddSubGroup={handleAddSubGroup}
          onReorderGroups={handleReorderGroups}
          sidebarOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
        />

        <div className="kb-content">
          {renderView()}
        </div>
      </div>

      {editingCard && (
        <CardModal
          card={editingCard}
          subGroups={board.subGroups}
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
