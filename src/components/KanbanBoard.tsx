import { useState, useCallback, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { KanbanColumnComponent } from './KanbanColumn';
import { KanbanCardComponent } from './KanbanCard';
import { CardModal } from './CardModal';
import { BoardHeader } from './BoardHeader';
import { BoardSidebar } from './BoardSidebar';
import { ListView } from './ListView';
import { AnalyticsView } from './AnalyticsView';
import { ShortcutsHelp } from './shared/ShortcutsHelp';
import { getColorHex, hexToRgba } from '../lib/colors';
import { createNewCard, createNewStatus, createDefaultBoard } from '../lib/markdown';
import type { KanbanBoard as BoardType, KanbanCard, BoardMeta } from '../types/kanban';

interface Props {
  board: BoardType;
  onChange: (board: BoardType) => void;
}

export function KanbanBoard({ board, onChange }: Props) {
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const boardRef = useRef(board);
  boardRef.current = board;

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Lazy-load TableView and SchemaEditor
  const [TableView, setTableView] = useState<React.ComponentType<any> | null>(null);
  const [SchemaEditor, setSchemaEditor] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    if (board.meta.viewMode === 'table' && !TableView) {
      import('./TableView').then(mod => setTableView(() => mod.TableView));
    }
  }, [board.meta.viewMode, TableView]);

  useEffect(() => {
    if (showSchemaEditor && !SchemaEditor) {
      import('./SchemaEditor').then(mod => setSchemaEditor(() => mod.SchemaEditor));
    }
  }, [showSchemaEditor, SchemaEditor]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); return; }
      switch (e.key) {
        case '?': e.preventDefault(); setShowShortcuts(v => !v); break;
        case 'n': case 'N':
          if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); handleQuickAddCard(); } break;
        case 'v': case 'V':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const views: BoardType['meta']['viewMode'][] = ['list', 'board', 'table', 'analytics'];
            const idx = views.indexOf(boardRef.current.meta.viewMode);
            handleUpdateMeta({ viewMode: views[(idx + 1) % views.length] });
          } break;
        case 'Escape': if (showShortcuts) setShowShortcuts(false); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcuts]);

  // --- Search filtering ---
  const filteredCards = searchQuery.trim()
    ? board.cards.filter(c => {
        const q = searchQuery.toLowerCase();
        return c.title.toLowerCase().includes(q)
          || c.description.toLowerCase().includes(q)
          || c.label.toLowerCase().includes(q);
      })
    : board.cards;

  // --- Helpers ---
  const getColumns = useCallback(() => {
    const groupBy = board.meta.boardGroupBy || 'status';
    if (groupBy === 'group') return board.groups.map(g => ({ id: g.id, name: g.name, color: g.color, wipLimit: 0 }));
    return board.statuses.map(s => ({ id: s.id, name: s.name, color: s.color, wipLimit: s.wipLimit }));
  }, [board]);

  const getColumnField = useCallback((): 'statusId' | 'groupId' => {
    return (board.meta.boardGroupBy === 'group') ? 'groupId' : 'statusId';
  }, [board.meta.boardGroupBy]);

  const getCardsForColumn = useCallback((columnId: string) => {
    const field = getColumnField();
    return filteredCards.filter(c => c[field] === columnId);
  }, [filteredCards, getColumnField]);

  // --- Card Mutations ---
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

      const cur = boardRef.current;

      if (type === 'LANE') {
        // Reorder columns (statuses or groups)
        const groupBy = cur.meta.boardGroupBy || 'status';
        if (groupBy === 'group') {
          const arr = [...cur.groups];
          const [moved] = arr.splice(source.index, 1);
          arr.splice(destination.index, 0, moved);
          onChange({ ...cur, groups: arr });
        } else {
          const arr = [...cur.statuses];
          const [moved] = arr.splice(source.index, 1);
          arr.splice(destination.index, 0, moved);
          onChange({ ...cur, statuses: arr });
        }
        return;
      }

      // Card drag
      const field = getColumnField();
      const cards = [...cur.cards];

      // Find the card in the source column's ordered cards
      const srcCards = cards.filter(c => c[field] === source.droppableId);
      const card = srcCards[source.index];
      if (!card) return;

      // Remove from current position
      const cardIdx = cards.findIndex(c => c.id === card.id);
      cards.splice(cardIdx, 1);

      // Update column assignment if cross-column
      const updatedCard = { ...card };
      if (source.droppableId !== destination.droppableId) {
        updatedCard[field] = destination.droppableId;
      }

      // Find insertion position in flat array
      const destCards = cards.filter(c => c[field] === destination.droppableId);
      if (destination.index >= destCards.length) {
        // Append after last card in destination column
        const lastDestCard = destCards[destCards.length - 1];
        const insertAfter = lastDestCard ? cards.indexOf(lastDestCard) + 1 : cards.length;
        cards.splice(insertAfter, 0, updatedCard);
      } else {
        const targetCard = destCards[destination.index];
        const insertAt = cards.indexOf(targetCard);
        cards.splice(insertAt, 0, updatedCard);
      }

      onChange({ ...cur, cards });
      if (source.droppableId !== destination.droppableId) showToast('Card moved');
    },
    [onChange, showToast, getColumnField]
  );

  const handleAddCard = useCallback(
    (columnId: string, title: string) => {
      const cur = boardRef.current;
      const card = createNewCard(title);
      const field = getColumnField();
      card[field] = columnId;
      // If column is status and there's a first status, set it
      if (field === 'statusId') card.statusId = columnId;
      else if (field === 'groupId') card.groupId = columnId;
      onChange({ ...cur, cards: [...cur.cards, card] });
      showToast('Card created');
    },
    [onChange, showToast, getColumnField]
  );

  const handleQuickAddCard = useCallback(() => {
    const cur = boardRef.current;
    const columns = getColumns();
    if (columns.length === 0) return;
    const target = selectedStatusId
      ? columns.find(c => c.id === selectedStatusId) || columns[0]
      : columns[0];
    const card = createNewCard('New Card');
    const field = getColumnField();
    card[field] = target.id;
    onChange({ ...cur, cards: [...cur.cards, card] });
    showToast('Card created');
  }, [onChange, showToast, getColumns, selectedStatusId, getColumnField]);

  const handleSaveCard = useCallback(
    (updatedCard: KanbanCard) => {
      const cur = boardRef.current;
      onChange({ ...cur, cards: cur.cards.map(c => c.id === updatedCard.id ? updatedCard : c) });
    },
    [onChange]
  );

  const handleDeleteCard = useCallback(
    (cardId: string) => {
      const cur = boardRef.current;
      onChange({ ...cur, cards: cur.cards.filter(c => c.id !== cardId) });
      showToast('Card deleted');
    },
    [onChange, showToast]
  );

  const handleMoveCard = useCallback(
    (cardId: string, toColumnId: string) => {
      const cur = boardRef.current;
      const field = getColumnField();
      onChange({ ...cur, cards: cur.cards.map(c => c.id === cardId ? { ...c, [field]: toColumnId } : c) });
    },
    [onChange, getColumnField]
  );

  // --- Column Mutations ---
  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      const cur = boardRef.current;
      const groupBy = cur.meta.boardGroupBy || 'status';
      if (groupBy === 'group') {
        const remaining = cur.groups.filter(g => g.id !== columnId);
        const fallbackId = remaining[0]?.id || '';
        const cards = cur.cards.map(c => c.groupId === columnId ? { ...c, groupId: fallbackId } : c);
        onChange({ ...cur, groups: remaining, cards });
      } else {
        const remaining = cur.statuses.filter(s => s.id !== columnId);
        const fallbackId = remaining[0]?.id || '';
        const cards = cur.cards.map(c => c.statusId === columnId ? { ...c, statusId: fallbackId } : c);
        onChange({ ...cur, statuses: remaining, cards });
      }
      showToast('Column deleted');
    },
    [onChange, showToast]
  );

  const handleRenameColumn = useCallback(
    (columnId: string, name: string) => {
      const cur = boardRef.current;
      const groupBy = cur.meta.boardGroupBy || 'status';
      if (groupBy === 'group') {
        onChange({ ...cur, groups: cur.groups.map(g => g.id === columnId ? { ...g, name } : g) });
      } else {
        onChange({ ...cur, statuses: cur.statuses.map(s => s.id === columnId ? { ...s, name } : s) });
      }
    },
    [onChange]
  );

  const handleSetColumnColor = useCallback(
    (columnId: string, color: string) => {
      const cur = boardRef.current;
      const groupBy = cur.meta.boardGroupBy || 'status';
      if (groupBy === 'group') {
        onChange({ ...cur, groups: cur.groups.map(g => g.id === columnId ? { ...g, color } : g) });
      } else {
        onChange({ ...cur, statuses: cur.statuses.map(s => s.id === columnId ? { ...s, color } : s) });
      }
    },
    [onChange]
  );

  const handleSetWipLimit = useCallback(
    (columnId: string, limit: number) => {
      const cur = boardRef.current;
      onChange({ ...cur, statuses: cur.statuses.map(s => s.id === columnId ? { ...s, wipLimit: limit } : s) });
    },
    [onChange]
  );

  const handleAddColumnFromForm = () => {
    const trimmed = newColumnTitle.trim();
    if (!trimmed) return;
    const cur = boardRef.current;
    const status = createNewStatus(trimmed);
    onChange({ ...cur, statuses: [...cur.statuses, status] });
    setNewColumnTitle('');
    setAddingColumn(false);
    showToast('Status created');
  };

  // --- Empty state ---
  if (board.statuses.length === 0 && board.groups.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <h2 className="empty-state-title">No board yet</h2>
        <p className="empty-state-text">Get started with a default Kanban board or add your own.</p>
        <div className="empty-state-actions">
          <button className="empty-state-primary" onClick={() => onChange(createDefaultBoard())}>Create Default Board</button>
          <button className="empty-state-secondary" onClick={() => {
            const status = createNewStatus('To Do');
            onChange({ ...boardRef.current, statuses: [status] });
          }}>Start Empty</button>
        </div>
      </div>
    );
  }

  // --- Render Views ---
  const columns = getColumns();
  // Board with search-filtered cards for passing to views
  const viewBoard = searchQuery.trim() ? { ...board, cards: filteredCards } : board;

  const renderView = () => {
    if (board.meta.viewMode === 'analytics') return <AnalyticsView board={board} />;
    if (board.meta.viewMode === 'table') {
      if (TableView) return <TableView board={viewBoard} onCardClick={setEditingCard} onUpdateCard={handleSaveCard} onMoveCard={handleMoveCard} />;
      return <div className="loading"><div className="loading-spinner" /></div>;
    }
    if (board.meta.viewMode === 'list') {
      return (
        <ListView
          board={viewBoard}
          onCardClick={setEditingCard}
          onAddCard={handleAddCard}
          onDragEnd={handleDragEnd}
        />
      );
    }
    // Compute sub-group rows for grid layout
    const subGroupBy = board.meta.boardSubGroupBy;
    let subGroupDefs: { id: string; name: string; color: string }[] = [];
    let getSubGroupField: (c: KanbanCard) => string = () => '';
    if (subGroupBy === 'group') { subGroupDefs = board.groups; getSubGroupField = c => c.groupId; }
    else if (subGroupBy === 'subGroup') { subGroupDefs = board.subGroups; getSubGroupField = c => c.subGroupId; }

    const hasGridLayout = subGroupBy && subGroupDefs.length > 0;

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={`kanban-board ${hasGridLayout ? 'kanban-grid' : ''}`}>
          {/* Column headers row */}
          {hasGridLayout && (
            <div className="kanban-grid-header-row">
              <div className="kanban-grid-row-label" />
              {columns.map(col => {
                const colColor = getColorHex(col.color);
                return (
                  <div key={col.id} className="kanban-grid-col-header" style={colColor ? { background: hexToRgba(colColor, 0.08) } : undefined}>
                    <span className="kb-lane-dot" style={{ backgroundColor: colColor || '#a1a1aa' }} />
                    <span className="kanban-grid-col-name">{col.name}</span>
                    <span className="kb-lane-count" style={colColor ? { background: hexToRgba(colColor, 0.15), color: colColor } : undefined}>
                      {getCardsForColumn(col.id).length}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {hasGridLayout ? (
            // Grid layout: sub-group rows × columns
            <>
              {subGroupDefs.map(sg => {
                const sgColor = getColorHex(sg.color) || '#a1a1aa';
                return (
                  <div key={sg.id} className="kanban-grid-row">
                    <div className="kanban-grid-row-label" style={{ background: hexToRgba(sgColor, 0.08) }}>
                      <span className="sub-group-dot" style={{ background: sgColor }} />
                      <span className="sub-group-name">{sg.name}</span>
                    </div>
                    {columns.map(col => {
                      const cellCards = getCardsForColumn(col.id).filter(c => getSubGroupField(c) === sg.id);
                      const cellColor = getColorHex(col.color);
                      return (
                        <div key={col.id} className="kanban-grid-cell"
                          style={cellColor ? { borderTop: `2px solid ${hexToRgba(cellColor, 0.3)}` } : undefined}>
                          <Droppable droppableId={`${col.id}__${sg.id}`} type="CARD">
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.droppableProps}
                                className={`lane-cards ${snapshot.isDraggingOver ? 'drag-over' : ''}`}>
                                {cellCards.map((card, idx) => (
                                  <KanbanCardComponent key={card.id} card={card} index={idx} onClick={setEditingCard} />
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {/* Ungrouped row */}
              {(() => {
                const ungrouped = filteredCards.filter(c => !getSubGroupField(c) || !subGroupDefs.some(sg => sg.id === getSubGroupField(c)));
                if (ungrouped.length === 0) return null;
                return (
                  <div className="kanban-grid-row">
                    <div className="kanban-grid-row-label"><span className="sub-group-name" style={{ opacity: 0.5 }}>Ungrouped</span></div>
                    {columns.map(col => {
                      const field = getColumnField();
                      const cellCards = ungrouped.filter(c => c[field] === col.id);
                      return (
                        <div key={col.id} className="kanban-grid-cell">
                          <Droppable droppableId={`${col.id}__ungrouped`} type="CARD">
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.droppableProps}
                                className={`lane-cards ${snapshot.isDraggingOver ? 'drag-over' : ''}`}>
                                {cellCards.map((card, idx) => (
                                  <KanbanCardComponent key={card.id} card={card} index={idx} onClick={setEditingCard} />
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </>
          ) : (
            // Standard column layout (no sub-grouping)
            <Droppable droppableId="board" type="LANE" direction="horizontal">
              {(provided) => (
                <div className="kanban-board-inner" ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'contents' }}>
                  {columns.map((col, index) => (
                    <Draggable key={col.id} draggableId={col.id} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                          className={`lane-wrapper ${snapshot.isDragging ? 'lane-dragging' : ''}`}>
                          <KanbanColumnComponent
                            column={col}
                            cards={getCardsForColumn(col.id)}
                            onCardClick={setEditingCard}
                            onAddCard={handleAddCard}
                            onDeleteColumn={handleDeleteColumn}
                            onRenameColumn={handleRenameColumn}
                            onSetColumnColor={handleSetColumnColor}
                            onSetWipLimit={handleSetWipLimit}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  <div className="add-lane-container">
                    {addingColumn ? (
                      <div className="add-lane-form">
                        <input className="add-lane-input" value={newColumnTitle}
                          onChange={e => setNewColumnTitle(e.target.value)} placeholder="Status name..." autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleAddColumnFromForm(); if (e.key === 'Escape') { setAddingColumn(false); setNewColumnTitle(''); } }}
                          onBlur={() => { if (!newColumnTitle.trim()) setAddingColumn(false); }} />
                        <div className="add-lane-buttons">
                          <button className="confirm-add-lane" onClick={handleAddColumnFromForm}>Add</button>
                          <button className="cancel-add-lane" onClick={() => { setAddingColumn(false); setNewColumnTitle(''); }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="add-lane-btn" onClick={() => setAddingColumn(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Status
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          )}
        </div>
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
        onOpenSchemaEditor={() => setShowSchemaEditor(true)}
        onAddCard={handleQuickAddCard}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="kb-body">
        <BoardSidebar
          board={board}
          selectedStatusId={selectedStatusId}
          onSelectStatus={setSelectedStatusId}
          onAddCard={handleQuickAddCard}
          onOpenSchemaEditor={() => setShowSchemaEditor(true)}
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
          board={board}
          onSave={handleSaveCard}
          onDelete={handleDeleteCard}
          onClose={() => setEditingCard(null)}
        />
      )}

      {showSchemaEditor && SchemaEditor && (
        <SchemaEditor board={board} onUpdateBoard={onChange} onClose={() => setShowSchemaEditor(false)} />
      )}

      {showShortcuts && <ShortcutsHelp onClose={() => setShowShortcuts(false)} />}
      {toast && <div className="kb-toast">{toast}</div>}
    </div>
  );
}
