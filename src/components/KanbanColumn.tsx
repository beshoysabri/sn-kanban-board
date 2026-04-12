import { useState, useRef, useEffect, memo } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { KanbanCardComponent } from './KanbanCard';
import { getColorHex, hexToRgba, LABEL_COLORS } from '../lib/colors';
import type { KanbanCard, KanbanBoard, GroupDef } from '../types/kanban';

interface ColumnDef {
  id: string;
  name: string;
  color: string;
  wipLimit?: number;
}

interface Props {
  column: ColumnDef;
  cards: KanbanCard[];
  board: KanbanBoard;
  subGroupBy: string;
  onCardClick: (card: KanbanCard) => void;
  onAddCard: (columnId: string, title: string) => void;
  onDeleteColumn: (id: string) => void;
  onRenameColumn: (id: string, name: string) => void;
  onSetColumnColor: (id: string, color: string) => void;
  onSetWipLimit: (id: string, limit: number) => void;
}

export const KanbanColumnComponent = memo(function KanbanColumnComponent({
  column, cards, board, subGroupBy, onCardClick, onAddCard,
  onDeleteColumn, onRenameColumn, onSetColumnColor, onSetWipLimit,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [wipDraft, setWipDraft] = useState(String(column.wipLimit || 0));
  const [showWipInput, setShowWipInput] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);
  const wipInputRef = useRef<HTMLInputElement>(null);
  const colColor = getColorHex(column.color);
  const wipExceeded = (column.wipLimit || 0) > 0 && cards.length > (column.wipLimit || 0);

  useEffect(() => { setTitle(column.name); }, [column.name]);
  useEffect(() => { if (isEditing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [isEditing]);
  useEffect(() => { if (addingCard && cardInputRef.current) cardInputRef.current.focus(); }, [addingCard]);
  useEffect(() => { if (showWipInput && wipInputRef.current) { wipInputRef.current.focus(); wipInputRef.current.select(); } }, [showWipInput]);
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setShowMenu(false); setShowColorPicker(false); setShowWipInput(false); }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const finishEditing = () => {
    setIsEditing(false);
    const trimmed = title.trim();
    if (trimmed && trimmed !== column.name) onRenameColumn(column.id, trimmed);
    else setTitle(column.name);
  };

  const submitCard = () => {
    const trimmed = newCardTitle.trim();
    if (trimmed) { onAddCard(column.id, trimmed); setNewCardTitle(''); }
  };

  // Resolve sub-group definitions for row rendering
  const getSubGroupRows = (): { def: GroupDef | null; cards: KanbanCard[] }[] => {
    if (!subGroupBy) return [{ def: null, cards }];

    let defs: GroupDef[] = [];
    let getField: (c: KanbanCard) => string = () => '';

    if (subGroupBy === 'group') { defs = board.groups; getField = c => c.groupId; }
    else if (subGroupBy === 'subGroup') { defs = board.subGroups; getField = c => c.subGroupId; }
    else return [{ def: null, cards }];

    const rows: { def: GroupDef | null; cards: KanbanCard[] }[] = [];
    for (const d of defs) {
      const filtered = cards.filter(c => getField(c) === d.id);
      if (filtered.length > 0) rows.push({ def: d, cards: filtered });
    }
    const ungrouped = cards.filter(c => !getField(c) || !defs.some(d => d.id === getField(c)));
    if (ungrouped.length > 0) rows.push({ def: null, cards: ungrouped });
    return rows.length > 0 ? rows : [{ def: null, cards }];
  };

  const subGroupRows = getSubGroupRows();
  const hasSubGroups = subGroupRows.length > 1 || (subGroupRows.length === 1 && subGroupRows[0].def !== null);

  return (
    <div className={`kanban-lane ${colColor ? 'lane-tinted' : ''} ${wipExceeded ? 'wip-exceeded' : ''}`}
      style={colColor ? { '--lane-accent': colColor } as React.CSSProperties : undefined}>
      <div className="lane-header" style={colColor ? { background: hexToRgba(colColor, 0.08) } : undefined}>
        <span className="kb-lane-dot" style={{ backgroundColor: colColor || '#a1a1aa' }} />
        {isEditing ? (
          <input ref={inputRef} className="lane-title-input" value={title}
            onChange={e => setTitle(e.target.value)} onBlur={finishEditing}
            onKeyDown={e => { if (e.key === 'Enter') finishEditing(); if (e.key === 'Escape') { setTitle(column.name); setIsEditing(false); } }} />
        ) : (
          <h3 className="lane-title" onDoubleClick={() => setIsEditing(true)}>
            {column.name}
            <span className="kb-lane-count" style={colColor ? { background: hexToRgba(colColor, 0.15), color: colColor } : undefined}>
              {cards.length}
            </span>
            {(column.wipLimit || 0) > 0 && <span className="wip-badge">/ {column.wipLimit}</span>}
          </h3>
        )}
        <div className="lane-actions" ref={menuRef}>
          <button className="lane-menu-btn" onClick={() => { setShowMenu(!showMenu); setShowColorPicker(false); setShowWipInput(false); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          {showMenu && (
            <div className="lane-menu">
              <button onClick={() => { setShowMenu(false); setIsEditing(true); }}>Rename</button>
              <button onClick={() => setShowColorPicker(!showColorPicker)}>
                Color {colColor && <span className="menu-color-preview" style={{ backgroundColor: colColor }} />}
              </button>
              {showColorPicker && (
                <div className="lane-color-picker">
                  <div className="color-preview" style={{ background: colColor || '#888' }} />
                  <button className={`color-swatch-sm no-color ${!column.color ? 'selected' : ''}`}
                    onClick={() => { onSetColumnColor(column.id, ''); setShowColorPicker(false); setShowMenu(false); }} title="No color" />
                  {LABEL_COLORS.map(c => (
                    <button key={c.name}
                      className={`color-swatch-sm ${column.color.toLowerCase() === c.name.toLowerCase() ? 'selected' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => { onSetColumnColor(column.id, c.name); setShowColorPicker(false); setShowMenu(false); }} title={c.name} />
                  ))}
                </div>
              )}
              <button onClick={() => setShowWipInput(!showWipInput)}>
                WIP Limit {(column.wipLimit || 0) > 0 && <span style={{ fontSize: 11, opacity: 0.6 }}>{column.wipLimit}</span>}
              </button>
              {showWipInput && (
                <div className="wip-input-row" onClick={e => e.stopPropagation()}>
                  <input ref={wipInputRef} type="number" min="0" className="wip-input-inline"
                    value={wipDraft} onChange={e => setWipDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const n = parseInt(wipDraft, 10);
                        if (!isNaN(n) && n >= 0) onSetWipLimit(column.id, n);
                        setShowWipInput(false); setShowMenu(false);
                      }
                    }}
                    onBlur={() => {
                      const n = parseInt(wipDraft, 10);
                      if (!isNaN(n) && n >= 0) onSetWipLimit(column.id, n);
                      setShowWipInput(false);
                    }}
                    placeholder="0 = unlimited"
                  />
                </div>
              )}
              <div className="lane-menu-divider" />
              <button className="danger" onClick={() => { setShowMenu(false); onDeleteColumn(column.id); }}>Delete</button>
            </div>
          )}
        </div>
      </div>

      <Droppable droppableId={column.id} type="CARD">
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps}
            className={`lane-cards ${snapshot.isDraggingOver ? 'drag-over' : ''}`}>
            {hasSubGroups ? (
              subGroupRows.map((row) => {
                const sgColor = row.def ? (getColorHex(row.def.color) || '#a1a1aa') : '';
                return (
                  <div key={row.def?.id || '__ungrouped'} className="sub-group-section">
                    {row.def && (
                      <div className="sub-group-header" style={sgColor ? { background: hexToRgba(sgColor, 0.1) } : undefined}>
                        <span className="sub-group-dot" style={{ background: sgColor }} />
                        <span className="sub-group-name">{row.def.name}</span>
                        <span className="sub-group-count">{row.cards.length}</span>
                      </div>
                    )}
                    {!row.def && <div className="sub-group-header"><span className="sub-group-name" style={{ opacity: 0.5 }}>Ungrouped</span></div>}
                    {row.cards.map(card => {
                      const globalIdx = cards.indexOf(card);
                      return <KanbanCardComponent key={card.id} card={card} index={globalIdx} onClick={onCardClick} />;
                    })}
                  </div>
                );
              })
            ) : (
              cards.map((card, index) => (
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
            onChange={e => setNewCardTitle(e.target.value)} placeholder="Card title..."
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitCard(); } if (e.key === 'Escape') { setAddingCard(false); setNewCardTitle(''); } }}
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
