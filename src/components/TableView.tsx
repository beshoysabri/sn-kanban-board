import { memo, useState } from 'react';
import { getColorHex } from '../lib/colors';
import { formatDueDate } from '../lib/dates';
import type { KanbanBoard, KanbanCard, KanbanGroup, SubGroup, Priority } from '../types/kanban';

interface Props {
  board: KanbanBoard;
  onCardClick: (card: KanbanCard) => void;
}

type SortKey = 'title' | 'group' | 'subGroup' | 'priority' | 'dueDate' | 'label' | 'tasks' | 'comments';
type SortDir = 'asc' | 'desc';

interface Row {
  card: KanbanCard;
  group: KanbanGroup;
  subGroup: SubGroup | undefined;
}

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  '': 0,
};

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'group', label: 'Group' },
  { key: 'subGroup', label: 'Sub-group' },
  { key: 'priority', label: 'Priority' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'label', label: 'Label' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'comments', label: 'Comments' },
];

function compareRows(a: Row, b: Row, sortKey: SortKey, sortDir: SortDir): number {
  let cmp = 0;

  switch (sortKey) {
    case 'title':
      cmp = a.card.title.localeCompare(b.card.title);
      break;
    case 'group':
      cmp = a.group.title.localeCompare(b.group.title);
      break;
    case 'subGroup': {
      const aName = a.subGroup?.name || '';
      const bName = b.subGroup?.name || '';
      cmp = aName.localeCompare(bName);
      break;
    }
    case 'priority':
      cmp = PRIORITY_ORDER[a.card.priority] - PRIORITY_ORDER[b.card.priority];
      break;
    case 'dueDate':
      cmp = (a.card.dueDate || '').localeCompare(b.card.dueDate || '');
      break;
    case 'label':
      cmp = a.card.label.localeCompare(b.card.label);
      break;
    case 'tasks': {
      const aTotal = a.card.checklist.length;
      const bTotal = b.card.checklist.length;
      const aDone = aTotal ? a.card.checklist.filter((i) => i.done).length / aTotal : 0;
      const bDone = bTotal ? b.card.checklist.filter((i) => i.done).length / bTotal : 0;
      cmp = aDone - bDone || aTotal - bTotal;
      break;
    }
    case 'comments':
      cmp = a.card.comments.length - b.card.comments.length;
      break;
  }

  return sortDir === 'asc' ? cmp : -cmp;
}

export const TableView = memo(function TableView({ board, onCardClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const subGroupMap = new Map(board.subGroups.map((sg) => [sg.id, sg]));

  const rows: Row[] = board.groups.flatMap((group) =>
    group.cards.map((card) => ({
      card,
      group,
      subGroup: card.subGroupId ? subGroupMap.get(card.subGroupId) : undefined,
    })),
  );

  const sorted = [...rows].sort((a, b) => compareRows(a, b, sortKey, sortDir));

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="table-view">
      <table className="kb-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
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
          {sorted.map((row) => (
            <TableRow key={row.card.id} row={row} onClick={onCardClick} />
          ))}
        </tbody>
      </table>
    </div>
  );
});

const TableRow = memo(function TableRow({
  row,
  onClick,
}: {
  row: Row;
  onClick: (card: KanbanCard) => void;
}) {
  const { card, group, subGroup } = row;
  const dateInfo = formatDueDate(card.dueDate);
  const labelHex = getColorHex(card.labelColor);
  const totalTasks = card.checklist.length;
  const doneTasks = card.checklist.filter((i) => i.done).length;

  return (
    <tr onClick={() => onClick(card)}>
      <td>{card.title}</td>
      <td>{group.title}</td>
      <td>{subGroup ? subGroup.name : '-'}</td>
      <td>
        {card.priority && (
          <span className={`card-priority priority-${card.priority}`}>{card.priority}</span>
        )}
      </td>
      <td>
        {dateInfo && (
          <span className={`card-date-badge date-${dateInfo.status}`}>{dateInfo.text}</span>
        )}
      </td>
      <td>
        {card.label && (
          <span
            className="card-label-dot"
            style={labelHex ? { backgroundColor: labelHex } : undefined}
          />
        )}
        {card.label}
      </td>
      <td>{totalTasks > 0 ? `${doneTasks}/${totalTasks}` : ''}</td>
      <td>{card.comments.length > 0 ? card.comments.length : ''}</td>
    </tr>
  );
});
