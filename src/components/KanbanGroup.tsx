import { useState, useRef, useEffect, memo } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { KanbanCardComponent } from './KanbanCard';
import { getColorHex, hexToRgba, LABEL_COLORS } from '../lib/colors';
import type { KanbanGroup as GroupType, KanbanCard, SubGroup } from '../types/kanban';

interface Props {
  group: GroupType;
  subGroups: SubGroup[];
  onCardClick: (card: KanbanCard) => void;
  onAddCard: (groupId: string, title: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onDuplicateGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, title: string) => void;
  onSetGroupColor: (groupId: string, color: string) => void;
  onSetWipLimit: (groupId: string, limit: number) => void;
}

export const KanbanGroupComponent = memo(function KanbanGroupComponent({
  group, subGroups, onCardClick, onAddCard, onDeleteGroup, onDuplicateGroup,
  onRenameGroup, onSetGroupColor, onSetWipLimit,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(group.title);
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);
  const groupColor = getColorHex(group.color);

  useEffect(() => { setTitle(group.title); }, [group.title]);
  useEffect(() => { if (isEditing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [isEditing]);
  useEffect(() => { if (addingCard && cardInputRef.current) cardInputRef.current.focus(); }, [addingCard]);
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setShowMenu(false); setShowColorPicker(false); }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const finishEditing = () => {
    setIsEditing(false);
    const trimmed = title.trim();
    if (trimmed && trimmed !== group.title) onRenameGroup(group.id, trimmed);
    else setTitle(group.title);
  };

  const submitCard = () => {
    const trimmed = newCardTitle.trim();
    if (trimmed) { onAddCard(group.id, trimmed); setNewCardTitle(''); }
  };

  // Sub-group rows
  const cardsBySubGroup = new Map<string, KanbanCard[]>();
  const ungroupedCards: KanbanCard[] = [];
  for (const card of group.cards) {
    if (card.subGroupId && subGroups.some(sg => sg.id === card.subGroupId)) {
      const arr = cardsBySubGroup.get(card.subGroupId) || [];
      arr.push(card);
      cardsBySubGroup.set(card.subGroupId, arr);
    } else {
      ungroupedCards.push(card);
    }
  }
  const hasSubGroups = subGroups.length > 0 && (cardsBySubGroup.size > 0 || ungroupedCards.length < group.cards.length);

  return (
    <div
      className={`kanban-lane ${groupColor ? 'lane-tinted' : ''} ${group.wipLimit > 0 && group.cards.length > group.wipLimit ? 'wip-exceeded' : ''}`}
      style={groupColor ? { '--lane-accent': groupColor } as React.CSSProperties : undefined}
    >
      <div className="lane-header" style={groupColor ? { background: hexToRgba(groupColor, 0.08) } : undefined}>
        <span className="kb-lane-dot" style={{ backgroundColor: groupColor || '#a1a1aa' }} />
        {isEditing ? (
          <input ref={inputRef} className="lane-title-input" value={title}
            onChange={(e) => setTitle(e.target.value)} onBlur={finishEditing}
            onKeyDown={(e) => { if (e.key === 'Enter') finishEditing(); if (e.key === 'Escape') { setTitle(group.title); setIsEditing(false); } }} />
        ) : (
          <h3 className="lane-title" onDoubleClick={() => setIsEditing(true)}>
            {group.title}
            <span className="kb-lane-count" style={groupColor ? { background: hexToRgba(groupColor, 0.15), color: groupColor } : undefined}>
              {group.cards.length}
            </span>
          </h3>
        )}
        <div className="lane-actions" ref={menuRef}>
          <button className="lane-menu-btn" onClick={() => { setShowMenu(!showMenu); setShowColorPicker(false); }} aria-label="Group options">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          {showMenu && (
            <div className="lane-menu">
              <button onClick={() => { setShowMenu(false); setIsEditing(true); }}>Rename</button>
              <button onClick={() => { setShowMenu(false); onDuplicateGroup(group.id); }}>Duplicate</button>
              <button onClick={() => setShowColorPicker(!showColorPicker)}>
                Color {groupColor && <span className="menu-color-preview" style={{ backgroundColor: groupColor }} />}
              </button>
              {showColorPicker && (
                <div className="lane-color-picker">
                  <div className="color-preview" style={{ background: groupColor || '#888' }} />
                  <button className={`color-swatch-sm no-color ${!group.color ? 'selected' : ''}`}
                    onClick={() => { onSetGroupColor(group.id, ''); setShowColorPicker(false); setShowMenu(false); }} title="No color" />
                  {LABEL_COLORS.map((c) => (
                    <button key={c.name}
                      className={`color-swatch-sm ${group.color.toLowerCase() === c.name.toLowerCase() ? 'selected' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => { onSetGroupColor(group.id, c.name); setShowColorPicker(false); setShowMenu(false); }} title={c.name} />
                  ))}
                  <label className={`color-swatch-sm custom-color ${group.color.startsWith('#') ? 'selected' : ''}`}
                    style={{ backgroundColor: group.color.startsWith('#') ? group.color : undefined }} title="Custom color">
                    <input type="color" className="hidden-color-input" value={getColorHex(group.color) || '#6366f1'}
                      onChange={(e) => onSetGroupColor(group.id, e.target.value)} />
                    {!group.color.startsWith('#') && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    )}
                  </label>
                </div>
              )}
              <button onClick={() => {
                const input = prompt('WIP limit (0 = unlimited):', String(group.wipLimit || 0));
                if (input !== null) { const n = parseInt(input, 10); if (!isNaN(n) && n >= 0) onSetWipLimit(group.id, n); }
                setShowMenu(false);
              }}>WIP Limit {group.wipLimit > 0 && <span style={{ fontSize: 11, opacity: 0.6 }}>{group.wipLimit}</span>}</button>
              <div className="lane-menu-divider" />
              <button className="danger" onClick={() => { setShowMenu(false); onDeleteGroup(group.id); }}>Delete Group</button>
            </div>
          )}
        </div>
      </div>

      <Droppable droppableId={group.id} type="CARD">
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps}
            className={`lane-cards ${snapshot.isDraggingOver ? 'drag-over' : ''}`}>
            {hasSubGroups ? (
              <>
                {subGroups.map(sg => {
                  const sgCards = cardsBySubGroup.get(sg.id);
                  if (!sgCards || sgCards.length === 0) return null;
                  const sgColor = getColorHex(sg.color) || '#a1a1aa';
                  return (
                    <div key={sg.id} className="sub-group-section">
                      <div className="sub-group-header" style={{ background: hexToRgba(sgColor, 0.1) }}>
                        <span className="sub-group-dot" style={{ background: sgColor }} />
                        <span className="sub-group-name">{sg.name}</span>
                        <span className="sub-group-count">{sgCards.length}</span>
                      </div>
                      {sgCards.map(card => (
                        <KanbanCardComponent key={card.id} card={card} index={group.cards.indexOf(card)} onClick={onCardClick} />
                      ))}
                    </div>
                  );
                })}
                {ungroupedCards.length > 0 && ungroupedCards.map(card => (
                  <KanbanCardComponent key={card.id} card={card} index={group.cards.indexOf(card)} onClick={onCardClick} />
                ))}
              </>
            ) : (
              group.cards.map((card, index) => (
                <KanbanCardComponent key={card.id} card={card} index={index} onClick={onCardClick} />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {addingCard ? (
        <div className="inline-add-card">
          <input ref={cardInputRef} className="inline-card-input" value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)} placeholder="Card title..."
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCard(); } if (e.key === 'Escape') { setAddingCard(false); setNewCardTitle(''); } }}
            onBlur={() => { if (!newCardTitle.trim()) { setAddingCard(false); setNewCardTitle(''); } }} />
          <div className="inline-add-actions">
            <button className="inline-add-confirm" onClick={submitCard} disabled={!newCardTitle.trim()}>Add</button>
            <button className="inline-add-cancel" onClick={() => { setAddingCard(false); setNewCardTitle(''); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>
      ) : (
        <button className="add-card-btn" onClick={() => setAddingCard(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Card
        </button>
      )}
    </div>
  );
});
