import { useState, memo } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { getColorHex, hexToRgba } from '../lib/colors';
import { formatDueDate } from '../lib/dates';
import { Linkify } from './shared/Linkify';
import type { KanbanBoard, KanbanCard } from '../types/kanban';

interface Props {
  board: KanbanBoard;
  onCardClick: (card: KanbanCard) => void;
  onAddCard: (columnId: string, title: string, subGroupId?: string) => void;
  onDragEnd: (result: DropResult) => void;
}

function getGroupDefs(board: KanbanBoard, groupBy: string): { id: string; name: string; color: string }[] {
  if (groupBy === 'group') return board.groups;
  if (groupBy === 'subGroup') return board.subGroups;
  return board.statuses.map(s => ({ id: s.id, name: s.name, color: s.color }));
}

function getCardField(groupBy: string): (c: KanbanCard) => string {
  if (groupBy === 'group') return c => c.groupId;
  if (groupBy === 'subGroup') return c => c.subGroupId;
  return c => c.statusId;
}

function getSubGroupDefs(board: KanbanBoard, subGroupBy: string): { id: string; name: string; color: string }[] {
  if (subGroupBy === 'group') return board.groups;
  if (subGroupBy === 'subGroup') return board.subGroups;
  if (subGroupBy === 'status') return board.statuses.map(s => ({ id: s.id, name: s.name, color: s.color }));
  return [];
}

function getSubGroupCardField(subGroupBy: string): (c: KanbanCard) => string {
  if (subGroupBy === 'group') return c => c.groupId;
  if (subGroupBy === 'subGroup') return c => c.subGroupId;
  if (subGroupBy === 'status') return c => c.statusId;
  return () => '';
}

export const ListView = memo(function ListView({ board, onCardClick, onAddCard, onDragEnd }: Props) {
  const groupBy = board.meta.listGroupBy || 'status';
  const subGroupBy = board.meta.listSubGroupBy || '';
  const groupDefs = getGroupDefs(board, groupBy);
  const getField = getCardField(groupBy);
  const subGroupDefs = getSubGroupDefs(board, subGroupBy);
  const getSubField = getSubGroupCardField(subGroupBy);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="list-view">
        {groupDefs.map(gDef => {
          const groupCards = board.cards.filter(c => getField(c) === gDef.id);

          return (
            <div key={gDef.id} className="list-group">
              <ListGroupHeader name={gDef.name} color={gDef.color} count={groupCards.length} groupId={gDef.id} />

              {subGroupBy && subGroupDefs.length > 0 ? (
                // Sub-grouped: render sub-group sections within this group
                <>
                  {subGroupDefs.map(sgDef => {
                    const sgCards = groupCards.filter(c => getSubField(c) === sgDef.id);
                    if (sgCards.length === 0) return null;
                    const sgColor = getColorHex(sgDef.color) || '#a1a1aa';
                    return (
                      <div key={sgDef.id}>
                        <div className="list-sub-group-header" style={{ background: hexToRgba(sgColor, 0.06) }}>
                          <span className="sub-group-dot" style={{ background: sgColor }} />
                          <span className="sub-group-name">{sgDef.name}</span>
                          <span className="sub-group-count">{sgCards.length}</span>
                        </div>
                        <Droppable droppableId={`${gDef.id}__${sgDef.id}`} type="CARD">
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}
                              className={`list-group-body ${snapshot.isDraggingOver ? 'list-drag-over' : ''}`}>
                              {sgCards.map((card, index) => (
                                <ListCard key={card.id} card={card} index={index} onClick={onCardClick} />
                              ))}
                              {provided.placeholder}
                              <ListAddCard groupId={gDef.id} subGroupId={sgDef.id} onAddCard={onAddCard} />
                            </div>
                          )}
                        </Droppable>
                      </div>
                    );
                  })}
                  {/* Ungrouped cards */}
                  {(() => {
                    const ungrouped = groupCards.filter(c => !getSubField(c) || !subGroupDefs.some(sg => sg.id === getSubField(c)));
                    if (ungrouped.length === 0) return null;
                    return (
                      <div>
                        <div className="list-sub-group-header">
                          <span className="sub-group-name" style={{ opacity: 0.5 }}>Ungrouped</span>
                          <span className="sub-group-count">{ungrouped.length}</span>
                        </div>
                        <Droppable droppableId={`${gDef.id}__ungrouped`} type="CARD">
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}
                              className={`list-group-body ${snapshot.isDraggingOver ? 'list-drag-over' : ''}`}>
                              {ungrouped.map((card, index) => (
                                <ListCard key={card.id} card={card} index={index} onClick={onCardClick} />
                              ))}
                              {provided.placeholder}
                              <ListAddCard groupId={gDef.id} onAddCard={onAddCard} />
                            </div>
                          )}
                        </Droppable>
                      </div>
                    );
                  })()}
                </>
              ) : (
                // No sub-grouping: flat card list
                <Droppable droppableId={gDef.id} type="CARD">
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`list-group-body ${snapshot.isDraggingOver ? 'list-drag-over' : ''}`}>
                      {groupCards.length === 0 && !snapshot.isDraggingOver && (
                        <div className="list-empty-group">No cards</div>
                      )}
                      {groupCards.map((card, index) => (
                        <ListCard key={card.id} card={card} index={index} onClick={onCardClick} />
                      ))}
                      {provided.placeholder}
                      <ListAddCard groupId={gDef.id} onAddCard={onAddCard} />
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
});

function ListGroupHeader({ name, color, count }: { name: string; color: string; count: number; groupId: string }) {
  const hex = getColorHex(color);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="list-group-header"
      style={hex ? { '--lane-accent': hex } as React.CSSProperties : undefined}
      onClick={() => setCollapsed(!collapsed)}>
      <svg className={`list-group-chevron ${collapsed ? 'collapsed' : ''}`}
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
      <span className="kb-lane-dot" style={{ backgroundColor: hex || '#a1a1aa' }} />
      <span className="list-group-title">{name}</span>
      <span className="kb-lane-count" style={hex ? { background: hexToRgba(hex, 0.15), color: hex } : undefined}>
        {count}
      </span>
    </div>
  );
}

function ListAddCard({ groupId, subGroupId, onAddCard }: { groupId: string; subGroupId?: string; onAddCard: (id: string, title: string, sgId?: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const submit = () => {
    const trimmed = newTitle.trim();
    if (trimmed) { onAddCard(groupId, trimmed, subGroupId); setNewTitle(''); }
  };

  if (adding) {
    return (
      <div className="list-add-card">
        <input className="list-add-input" value={newTitle}
          onChange={e => setNewTitle(e.target.value)} placeholder="Card title..." autoFocus
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } if (e.key === 'Escape') { setAdding(false); setNewTitle(''); } }}
          onBlur={() => { if (!newTitle.trim()) { setAdding(false); setNewTitle(''); } }} />
        <button className="list-add-confirm" onClick={submit} disabled={!newTitle.trim()}>Add</button>
        <button className="list-add-cancel" onClick={() => { setAdding(false); setNewTitle(''); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button className="list-add-btn" onClick={() => setAdding(true)}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Add card
    </button>
  );
}

const ListCard = memo(function ListCard({ card, index, onClick }: {
  card: KanbanCard; index: number; onClick: (c: KanbanCard) => void;
}) {
  const labelBg = getColorHex(card.labelColor);
  const dateInfo = formatDueDate(card.dueDate);

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
          className={`list-card ${snapshot.isDragging ? 'list-card-dragging' : ''} ${labelBg ? 'list-card-tinted' : ''}`}
          onClick={() => onClick(card)}
          style={{ ...provided.draggableProps.style, ...(labelBg ? { '--card-accent': labelBg } as React.CSSProperties : {}) }}>
          <div className="list-card-content">
            <div className="list-card-main">
              <span className="list-card-title">{card.title}</span>
              {card.description && <span className="list-card-desc"><Linkify>{card.description}</Linkify></span>}
            </div>
            <div className="list-card-meta">
              {card.label && <span className="list-card-label">{card.label}</span>}
              {card.priority && <span className={`card-priority priority-${card.priority}`}>{card.priority}</span>}
              {dateInfo && (
                <span className={`card-date-badge date-${dateInfo.status}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {dateInfo.text}
                </span>
              )}
              {card.comments.length > 0 && (
                <span className="card-comment-count">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {card.comments.length}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
});
