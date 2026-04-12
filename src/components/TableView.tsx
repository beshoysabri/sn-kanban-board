import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { formatDueDate } from '../lib/dates';
import { getFieldLabel } from '../lib/fields';
import { getColorHex, hexToRgba } from '../lib/colors';
import type { KanbanBoard, KanbanCard, StatusDef, GroupDef, Priority } from '../types/kanban';

interface Props {
  board: KanbanBoard;
  onCardClick: (card: KanbanCard) => void;
  onUpdateCard: (card: KanbanCard) => void;
  onMoveCard: (cardId: string, toColumnId: string) => void;
}

type SortKey = string; // 'title' | 'status' | 'group' | ... | custom field IDs
type SortDir = 'asc' | 'desc';

interface Row {
  card: KanbanCard;
  status: StatusDef | undefined;
  group: GroupDef | undefined;
  subGroup: GroupDef | undefined;
}

const PRIORITY_ORDER: Record<Priority, number> = { critical: 4, high: 3, medium: 2, low: 1, '': 0 };

function getColumns(board: KanbanBoard): { key: SortKey; label: string; editable: boolean; isCustom?: boolean }[] {
  const fl = (id: string) => getFieldLabel(id, board.meta);
  const builtIn = [
    { key: 'title', label: fl('title'), editable: true },
    { key: 'status', label: fl('status'), editable: true },
    { key: 'group', label: fl('group'), editable: true },
    { key: 'subGroup', label: fl('subGroup'), editable: true },
    { key: 'priority', label: fl('priority'), editable: true },
    { key: 'dueDate', label: fl('dueDate'), editable: true },
    { key: 'label', label: fl('label'), editable: true },
    { key: 'tasks', label: fl('checklist'), editable: false },
    { key: 'comments', label: fl('comments'), editable: false },
  ];
  // Add custom field columns
  const custom = board.fields.map(f => ({
    key: `cf_${f.id}`, label: f.name, editable: true, isCustom: true,
  }));
  return [...builtIn, ...custom];
}

function compareRows(a: Row, b: Row, sortKey: SortKey, sortDir: SortDir): number {
  let cmp = 0;
  switch (sortKey) {
    case 'title': cmp = a.card.title.localeCompare(b.card.title); break;
    case 'status': cmp = (a.status?.name || '').localeCompare(b.status?.name || ''); break;
    case 'group': cmp = (a.group?.name || '').localeCompare(b.group?.name || ''); break;
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
    default:
      // Custom field sort
      if (sortKey.startsWith('cf_')) {
        const fId = sortKey.slice(3);
        cmp = (a.card.customFields[fId] || '').localeCompare(b.card.customFields[fId] || '');
      }
      break;
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

export const TableView = memo(function TableView({ board, onCardClick, onUpdateCard }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingCell, setEditingCell] = useState<{ cardId: string; column: SortKey } | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const COLUMNS = getColumns(board);

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

    const updated = { ...row.card };
    switch (column) {
      case 'title': updated.title = value || 'Untitled'; break;
      case 'status': updated.statusId = value; break;
      case 'group': updated.groupId = value; break;
      case 'subGroup': updated.subGroupId = value; break;
      case 'priority': updated.priority = value as Priority; break;
      case 'dueDate': updated.dueDate = value; break;
      case 'label': updated.label = value; break;
      default:
        // Custom field
        if (column.startsWith('cf_')) {
          const fId = column.slice(3);
          updated.customFields = { ...updated.customFields, [fId]: value };
          break;
        }
        return;
    }
    onUpdateCard(updated);
  }, [rows, onUpdateCard]);

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

  const subGroupOptions = [
    { value: '', label: 'None' },
    ...board.subGroups.map(sg => ({ value: sg.id, label: sg.name })),
  ];

  // Grouping logic
  const tableGroupBy = board.meta.tableGroupBy || '';
  const tableSubGroupBy = board.meta.tableSubGroupBy || '';

  function getGroupDefs(by: string): { id: string; name: string; color: string }[] {
    if (by === 'status') return board.statuses.map(s => ({ id: s.id, name: s.name, color: s.color }));
    if (by === 'group') return board.groups;
    if (by === 'subGroup') return board.subGroups;
    return [];
  }

  function getCardGroupField(by: string): (c: KanbanCard) => string {
    if (by === 'status') return c => c.statusId;
    if (by === 'group') return c => c.groupId;
    if (by === 'subGroup') return c => c.subGroupId;
    return () => '';
  }

  const groupDefs = getGroupDefs(tableGroupBy);
  const getGroupField = getCardGroupField(tableGroupBy);
  const subGroupDefs = getGroupDefs(tableSubGroupBy);
  const getSubGroupField = getCardGroupField(tableSubGroupBy);
  const hasGrouping = tableGroupBy && groupDefs.length > 0;

  // Build grouped sections
  const renderGroupedRows = () => {
    if (!hasGrouping) {
      return sorted.map(row => renderRow(row));
    }

    const sections: React.ReactNode[] = [];
    for (const gDef of groupDefs) {
      const gRows = sorted.filter(r => getGroupField(r.card) === gDef.id);
      if (gRows.length === 0) continue;
      const gColor = getColorHex(gDef.color);

      sections.push(
        <tr key={`g-${gDef.id}`} className="table-group-header-row">
          <td colSpan={COLUMNS.length} style={gColor ? { borderLeft: `3px solid ${gColor}`, background: hexToRgba(gColor, 0.06) } : undefined}>
            <span className="table-group-dot" style={gColor ? { background: gColor } : undefined} />
            <strong>{gDef.name}</strong>
            <span className="table-group-count">{gRows.length}</span>
          </td>
        </tr>
      );

      if (tableSubGroupBy && subGroupDefs.length > 0) {
        for (const sgDef of subGroupDefs) {
          const sgRows = gRows.filter(r => getSubGroupField(r.card) === sgDef.id);
          if (sgRows.length === 0) continue;
          const sgColor = getColorHex(sgDef.color);
          sections.push(
            <tr key={`sg-${gDef.id}-${sgDef.id}`} className="table-sub-group-header-row">
              <td colSpan={COLUMNS.length} style={sgColor ? { borderLeft: `3px solid ${sgColor}`, background: hexToRgba(sgColor, 0.04) } : undefined}>
                <span className="table-group-dot" style={sgColor ? { background: sgColor } : undefined} />
                {sgDef.name}
                <span className="table-group-count">{sgRows.length}</span>
              </td>
            </tr>
          );
          sgRows.forEach(row => sections.push(renderRow(row)));
        }
        // Ungrouped within this group
        const ungrouped = gRows.filter(r => !getSubGroupField(r.card) || !subGroupDefs.some(sg => sg.id === getSubGroupField(r.card)));
        if (ungrouped.length > 0) {
          sections.push(
            <tr key={`sg-${gDef.id}-ungrouped`} className="table-sub-group-header-row">
              <td colSpan={COLUMNS.length}><span style={{ opacity: 0.5 }}>Ungrouped</span> <span className="table-group-count">{ungrouped.length}</span></td>
            </tr>
          );
          ungrouped.forEach(row => sections.push(renderRow(row)));
        }
      } else {
        gRows.forEach(row => sections.push(renderRow(row)));
      }
    }

    // Cards not in any group
    const orphans = sorted.filter(r => !getGroupField(r.card) || !groupDefs.some(g => g.id === getGroupField(r.card)));
    if (orphans.length > 0) {
      sections.push(
        <tr key="g-ungrouped" className="table-group-header-row">
          <td colSpan={COLUMNS.length}><span style={{ opacity: 0.5 }}>Ungrouped</span> <span className="table-group-count">{orphans.length}</span></td>
        </tr>
      );
      orphans.forEach(row => sections.push(renderRow(row)));
    }

    return sections;
  };

  const renderRow = (row: Row) => {
    const { card, status, group, subGroup } = row;
    const dateInfo = formatDueDate(card.dueDate);
    const totalTasks = card.checklist.length;
    const doneTasks = card.checklist.filter(i => i.done).length;

    return (
      <tr key={card.id}>
        <td className="table-cell-title"
          onClick={() => { if (clickTimer.current) clearTimeout(clickTimer.current); clickTimer.current = setTimeout(() => { onCardClick(card); clickTimer.current = null; }, 250); }}
          onDoubleClick={() => { if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; } startEdit(card.id, 'title'); }}>
          {isEditing(card.id, 'title') ? <EditCell value={card.title} onSave={v => saveCell(card.id, 'title', v)} /> : card.title || 'Untitled'}
        </td>
        <td onDoubleClick={() => startEdit(card.id, 'status')}>
          {isEditing(card.id, 'status') ? <SelectCell value={card.statusId} options={statusOptions} onSave={v => saveCell(card.id, 'status', v)} /> : <span className="table-cell-muted">{status?.name || '-'}</span>}
        </td>
        <td onDoubleClick={() => startEdit(card.id, 'group')}>
          {isEditing(card.id, 'group') ? <SelectCell value={card.groupId} options={groupOptions} onSave={v => saveCell(card.id, 'group', v)} /> : <span className="table-cell-muted">{group?.name || '-'}</span>}
        </td>
        <td onDoubleClick={() => startEdit(card.id, 'subGroup')}>
          {isEditing(card.id, 'subGroup') ? <SelectCell value={card.subGroupId} options={subGroupOptions} onSave={v => saveCell(card.id, 'subGroup', v)} /> : <span className="table-cell-muted">{subGroup?.name || '-'}</span>}
        </td>
        <td onDoubleClick={() => startEdit(card.id, 'priority')}>
          {isEditing(card.id, 'priority') ? <SelectCell value={card.priority} options={priorityOptions} onSave={v => saveCell(card.id, 'priority', v)} /> : card.priority ? <span className={`card-priority priority-${card.priority}`}>{card.priority}</span> : <span className="table-cell-muted">-</span>}
        </td>
        <td onDoubleClick={() => startEdit(card.id, 'dueDate')}>
          {isEditing(card.id, 'dueDate') ? <EditCell value={card.dueDate} type="date" onSave={v => saveCell(card.id, 'dueDate', v)} /> : dateInfo ? <span className={`card-date-badge date-${dateInfo.status}`}>{dateInfo.text}</span> : <span className="table-cell-muted">-</span>}
        </td>
        <td onDoubleClick={() => startEdit(card.id, 'label')}>
          {isEditing(card.id, 'label') ? <EditCell value={card.label} onSave={v => saveCell(card.id, 'label', v)} /> : card.label || <span className="table-cell-muted">-</span>}
        </td>
        <td className="table-cell-muted" onClick={() => onCardClick(card)}>{totalTasks > 0 ? `${doneTasks}/${totalTasks}` : '-'}</td>
        <td className="table-cell-muted" onClick={() => onCardClick(card)}>{card.comments.length > 0 ? card.comments.length : '-'}</td>
        {board.fields.map(f => {
          const cfKey = `cf_${f.id}`;
          const cfVal = card.customFields[f.id] || '';
          return (
            <td key={cfKey} onDoubleClick={() => startEdit(card.id, cfKey)}>
              {isEditing(card.id, cfKey) ? (
                (f.type === 'select' || f.type === 'multiselect') ? (
                  <SelectCell value={cfVal} options={[{ value: '', label: '-' }, ...(f.options || []).map(o => ({ value: o, label: o }))]}
                    onSave={v => saveCell(card.id, cfKey, v)} />
                ) : (
                  <EditCell value={cfVal} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                    onSave={v => saveCell(card.id, cfKey, v)} />
                )
              ) : (
                f.type === 'url' && cfVal ? (
                  <a href={cfVal} target="_blank" rel="noopener noreferrer" className="kb-link" onClick={e => e.stopPropagation()}>{cfVal.length > 30 ? cfVal.slice(0, 27) + '...' : cfVal}</a>
                ) : f.type === 'media' && cfVal ? (
                  <span className="table-cell-muted">{cfVal.split('\n').filter(Boolean).length} link(s)</span>
                ) : f.type === 'checkbox' ? (
                  <span>{cfVal === 'true' ? '✓' : '-'}</span>
                ) : f.type === 'multiselect' && cfVal ? (
                  <span className="table-cell-muted">{cfVal}</span>
                ) : (
                  <span className="table-cell-muted">{cfVal || '-'}</span>
                )
              )}
            </td>
          );
        })}
      </tr>
    );
  };

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
          {renderGroupedRows()}
          {sorted.length === 0 && (
            <tr><td colSpan={8} className="table-cell-muted" style={{ textAlign: 'center', padding: 24 }}>No cards yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
});
