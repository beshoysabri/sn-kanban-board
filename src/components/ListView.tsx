import { useState, memo } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { getColorHex, hexToRgba } from '../lib/colors';
import { formatDueDate } from '../lib/dates';
import { Linkify } from './shared/Linkify';
import type { KanbanBoard, KanbanCard } from '../types/kanban';

interface Props {
  board: KanbanBoard;
  onCardClick: (card: KanbanCard) => void;
  onAddCard: (statusId: string, title: string) => void;
  onDragEnd: (result: DropResult) => void;
}

export const ListView = memo(function ListView({ board, onCardClick, onAddCard, onDragEnd }: Props) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="list-view">
        {board.statuses.map(status => (
          <ListGroup
            key={status.id}
            statusId={status.id}
            statusName={status.name}
            statusColor={status.color}
            cards={board.cards.filter(c => c.statusId === status.id)}
            onCardClick={onCardClick}
            onAddCard={onAddCard}
          />
        ))}
      </div>
    </DragDropContext>
  );
});

const ListGroup = memo(function ListGroup({
  statusId, statusName, statusColor, cards, onCardClick, onAddCard,
}: {
  statusId: string;
  statusName: string;
  statusColor: string;
  cards: KanbanCard[];
  onCardClick: (card: KanbanCard) => void;
  onAddCard: (statusId: string, title: string) => void;
}) {
  const color = getColorHex(statusColor);
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const submitCard = () => {
    const trimmed = newTitle.trim();
    if (trimmed) { onAddCard(statusId, trimmed); setNewTitle(''); }
  };

  return (
    <div className="list-group">
      <div className="list-group-header"
        style={color ? { '--lane-accent': color } as React.CSSProperties : undefined}
        onClick={() => setCollapsed(!collapsed)}>
        <svg className={`list-group-chevron ${collapsed ? 'collapsed' : ''}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span className="kb-lane-dot" style={{ backgroundColor: color || '#a1a1aa' }} />
        <span className="list-group-title">{statusName}</span>
        <span className="kb-lane-count" style={color ? { background: hexToRgba(color, 0.15), color } : undefined}>
          {cards.length}
        </span>
      </div>
      {!collapsed && (
        <Droppable droppableId={statusId} type="CARD">
          {(provided, snapshot) => (
            <div ref={provided.innerRef} {...provided.droppableProps}
              className={`list-group-body ${snapshot.isDraggingOver ? 'list-drag-over' : ''}`}>
              {cards.length === 0 && !snapshot.isDraggingOver && (
                <div className="list-empty-group">No cards</div>
              )}
              {cards.map((card, index) => (
                <ListCard key={card.id} card={card} index={index} onClick={onCardClick} />
              ))}
              {provided.placeholder}
              {adding ? (
                <div className="list-add-card">
                  <input className="list-add-input" value={newTitle}
                    onChange={e => setNewTitle(e.target.value)} placeholder="Card title..." autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitCard(); } if (e.key === 'Escape') { setAdding(false); setNewTitle(''); } }}
                    onBlur={() => { if (!newTitle.trim()) { setAdding(false); setNewTitle(''); } }} />
                  <button className="list-add-confirm" onClick={submitCard} disabled={!newTitle.trim()}>Add</button>
                  <button className="list-add-cancel" onClick={() => { setAdding(false); setNewTitle(''); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button className="list-add-btn" onClick={() => setAdding(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add card
                </button>
              )}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
});

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
