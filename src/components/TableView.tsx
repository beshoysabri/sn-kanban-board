import { memo, useState, useRef, useEffect, useCallback } from 'react';
// colors not needed for table view
import { formatDueDate } from '../lib/dates';
import type { KanbanBoard, KanbanCard, StatusDef, GroupDef, Priority } from '../types/kanban';

interface Props {
  board: KanbanBoard;
  onCardClick: (card: KanbanCard) => void;
  onUpdateCard: (card: KanbanCard) => void;
  onMoveCard: (cardId: string, toColumnId: string) => void;
}

type SortKey = 'title' | 'group' | 'subGroup' | 'priority' | 'dueDate' | 'label' | 'tasks' | 'comments';
type SortDir = 'asc' | 'desc';

interface Row {
  card: KanbanCard;
  status: StatusDef | undefined;
  group: GroupDef | undefined;
  subGroup: GroupDef | undefined;
}

const PRIORITY_ORDER: Record<Priority, number> = { critical: 4, high: 3, medium: 2, low: 1, '': 0 };

const COLUMNS: { key: SortKey; label: string; editable: boolean }[] = [
  { key: 'title', label: 'Title', editable: true },
  { key: 'group', label: 'Status', editable: true },
  { key: 'subGroup', label: 'Group', editable: true },
  { key: 'priority', label: 'Priority', editable: true },
  { key: 'dueDate', label: 'Due Date', editable: true },
  { key: 'label', label: 'Label', editable: true },
  { key: 'tasks', label: 'Tasks', editable: false },
  { key: 'comments', label: 'Comments', editable: false },
];

function compareRows(a: Row, b: Row, sortKey: SortKey, sortDir: SortDir): number {
  let cmp = 0;
  switch (sortKey) {
    case 'title': cmp = a.card.title.localeCompare(b.card.title); break;
    case 'group': cmp = (a.status?.name || '').localeCompare(b.status?.name || ''); break;
    case 'subGroup': cmp = (a.subGroup?.name || '').localeCompare(b.subGroup?.name || ''); break;
    case 'priority': cmp = PRIORITY_ORDER[a.card.priority] - PRIORITY_ORDER[b.card.priority]; break;
    case 'dueDate': cmp = (a.card.dueDate || '').localeCompare(b.card.dueDate || ''); break;
    case 'label': cmp = a.card.label.localeCompare(b.card.label); break;
    case 'tasks': {
      const aT = a.card.checklist.length, bT = b.card.checklist.length;
      const aD = aT ? a.card.checklist.filter(i => i.done).length / aT : 0;
      const bD = bT ? b.card.checklist.filter(i => i.done).length / bT : 0;
      cmp = aD - bD || aT - bT; break;
    }
    case 'comments': cmp = a.card.comments.length - b.card.comments.length; break;
  }
  return sortDir === 'asc' ? cmp : -cmp;
}

// Inline edit cell
function EditCell({ value, onSave, type = 'text' }: {
  value: string; onSave: (v: string) => void; type?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);

  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  const commit = () => { onSave(draft); };

  return (
    <input
      ref={ref}
      type={type}
      className="table-edit-input"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onSave(value); }}
      onClick={e => e.stopPropagation()}
    />
  );
}

function SelectCell({ value, options, onSave }: {
  value: string; options: { value: string; label: string }[]; onSave: (v: string) => void;
}) {
  const ref = useRef<HTMLSelectElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <select
      ref={ref}
      className="table-edit-select form-select"
      value={value}
      onChange={e => onSave(e.target.value)}
      onBlur={() => onSave(value)}
      onClick={e => e.stopPropagation()}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export const TableView = memo(function TableView({ board, onCardClick, onUpdateCard, onMoveCard }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingCell, setEditingCell] = useState<{ cardId: string; column: SortKey } | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const statusMap = new Map(board.statuses.map(s => [s.id, s]));
  const groupMap = new Map(board.groups.map(g => [g.id, g]));
  const subGroupMap = new Map(board.subGroups.map(sg => [sg.id, sg]));

  const rows: Row[] = board.cards.map(card => ({
    card,
    status: card.statusId ? statusMap.get(card.statusId) : undefined,
    group: card.groupId ? groupMap.get(card.groupId) : undefined,
    subGroup: card.subGroupId ? subGroupMap.get(card.subGroupId) : undefined,
  }));

  const sorted = [...rows].sort((a, b) => compareRows(a, b, sortKey, sortDir));

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const startEdit = useCallback((cardId: string, column: SortKey) => {
    const col = COLUMNS.find(c => c.key === column);
    if (col?.editable) setEditingCell({ cardId, column });
  }, []);

  const saveCell = useCallback((cardId: string, column: SortKey, value: string) => {
    setEditingCell(null);
    const row = rows.find(r => r.card.id === cardId);
    if (!row) return;

    if (column === 'group') {
      // Change card's status
      if (value !== row.card.statusId) {
        onUpdateCard({ ...row.card, statusId: value });
      }
      return;
    }

    const updated = { ...row.card };
    switch (column) {
      case 'title': updated.title = value || 'Untitled'; break;
      case 'subGroup': updated.groupId = value; break;
      case 'priority': updated.priority = value as Priority; break;
      case 'dueDate': updated.dueDate = value; break;
      case 'label': updated.label = value; break;
      default: return;
    }
    onUpdateCard(updated);
  }, [rows, onUpdateCard, onMoveCard]);

  const isEditing = (cardId: string, col: SortKey) =>
    editingCell?.cardId === cardId && editingCell?.column === col;

  const priorityOptions = [
    { value: '', label: 'None' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  const statusOptions = board.statuses.map(s => ({ value: s.id, label: s.name }));

  const groupOptions = [
    { value: '', label: 'None' },
    ...board.groups.map(g => ({ value: g.id, label: g.name })),
  ];

  return (
    <div className="table-view">
      <table className="kb-table">
        <thead>
          <tr>
            {COLUMNS.map(col => (
              <th key={col.key} onClick={() => handleSort(col.key)}>
                {col.label}
                {sortKey === col.key && (
                  <span className="sort-indicator">{sortDir === 'asc' ? ' \u25B2' : ' \u25BC'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => {
            const { card, status, group } = row;
            const dateInfo = formatDueDate(card.dueDate);
            const totalTasks = card.checklist.length;
            const doneTasks = card.checklist.filter(i => i.done).length;

            return (
              <tr key={card.id}>
                {/* Title — single click opens modal, double click edits inline */}
                <td className="table-cell-title"
                  onClick={() => {
                    if (isEditing(card.id, 'title')) return;
                    if (clickTimer.current) clearTimeout(clickTimer.current);
                    clickTimer.current = setTimeout(() => { onCardClick(card); clickTimer.current = null; }, 250);
                  }}
                  onDoubleClick={() => {
                    if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
                    startEdit(card.id, 'title');
                  }}
                >
                  {isEditing(card.id, 'title') ? (
                    <EditCell value={card.title} onSave={v => saveCell(card.id, 'title', v)} />
                  ) : (
                    card.title || 'Untitled'
                  )}
                </td>

                {/* Group */}
                <td onDoubleClick={() => startEdit(card.id, 'group')}>
                  {isEditing(card.id, 'group') ? (
                    <SelectCell value={card.statusId} options={statusOptions} onSave={v => saveCell(card.id, 'group', v)} />
                  ) : (
                    <span className="table-cell-muted">{status?.name || '-'}</span>
                  )}
                </td>

                {/* Group */}
                <td onDoubleClick={() => startEdit(card.id, 'subGroup')}>
                  {isEditing(card.id, 'subGroup') ? (
                    <SelectCell value={card.groupId} options={groupOptions} onSave={v => saveCell(card.id, 'subGroup', v)} />
                  ) : (
                    <span className="table-cell-muted">{group?.name || '-'}</span>
                  )}
                </td>

                {/* Priority */}
                <td onDoubleClick={() => startEdit(card.id, 'priority')}>
                  {isEditing(card.id, 'priority') ? (
                    <SelectCell value={card.priority} options={priorityOptions} onSave={v => saveCell(card.id, 'priority', v)} />
                  ) : (
                    card.priority ? <span className={`card-priority priority-${card.priority}`}>{card.priority}</span> : <span className="table-cell-muted">-</span>
                  )}
                </td>

                {/* Due Date */}
                <td onDoubleClick={() => startEdit(card.id, 'dueDate')}>
                  {isEditing(card.id, 'dueDate') ? (
                    <EditCell value={card.dueDate} type="date" onSave={v => saveCell(card.id, 'dueDate', v)} />
                  ) : (
                    dateInfo ? <span className={`card-date-badge date-${dateInfo.status}`}>{dateInfo.text}</span> : <span className="table-cell-muted">-</span>
                  )}
                </td>

                {/* Label */}
                <td onDoubleClick={() => startEdit(card.id, 'label')}>
                  {isEditing(card.id, 'label') ? (
                    <EditCell value={card.label} onSave={v => saveCell(card.id, 'label', v)} />
                  ) : (
                    card.label || <span className="table-cell-muted">-</span>
                  )}
                </td>

                {/* Tasks (read-only, click opens modal) */}
                <td className="table-cell-muted" onClick={() => onCardClick(card)}>
                  {totalTasks > 0 ? `${doneTasks}/${totalTasks}` : '-'}
                </td>

                {/* Comments (read-only, click opens modal) */}
                <td className="table-cell-muted" onClick={() => onCardClick(card)}>
                  {card.comments.length > 0 ? card.comments.length : '-'}
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr><td colSpan={8} className="table-cell-muted" style={{ textAlign: 'center', padding: 24 }}>No cards yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
});
