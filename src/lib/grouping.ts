import type { KanbanBoard, KanbanCard } from '../types/kanban';

export type ColumnDef = { id: string; name: string; color: string; wipLimit?: number };

/** Get the column definitions for a given groupBy setting */
export function getColumnDefs(board: KanbanBoard, groupBy: string): ColumnDef[] {
  if (groupBy === 'group') return board.groups.map(g => ({ ...g, wipLimit: 0 }));
  // Default: status
  return board.statuses.map(s => ({ id: s.id, name: s.name, color: s.color, wipLimit: s.wipLimit }));
}

/** Get the card field accessor for a given groupBy setting */
export function getCardColumnField(groupBy: string): keyof KanbanCard {
  return groupBy === 'group' ? 'groupId' : 'statusId';
}

/** Get the sub-group definitions for a given subGroupBy setting */
export function getSubGroupDefs(board: KanbanBoard, subGroupBy: string): { id: string; name: string; color: string }[] {
  if (subGroupBy === 'group') return board.groups;
  if (subGroupBy === 'subGroup') return board.subGroups;
  if (subGroupBy === 'status') return board.statuses.map(s => ({ id: s.id, name: s.name, color: s.color }));
  return [];
}

/** Get the card field accessor for a given subGroupBy setting */
export function getCardSubGroupField(subGroupBy: string): ((c: KanbanCard) => string) {
  if (subGroupBy === 'group') return c => c.groupId;
  if (subGroupBy === 'subGroup') return c => c.subGroupId;
  if (subGroupBy === 'status') return c => c.statusId;
  return () => '';
}

/** Filter cards for a specific column */
export function getCardsForColumn(cards: KanbanCard[], columnId: string, groupBy: string): KanbanCard[] {
  const field = getCardColumnField(groupBy);
  return cards.filter(c => c[field] === columnId);
}
