import type { BoardMeta } from '../types/kanban';

/** Built-in field definitions with default display names */
export const BUILTIN_FIELDS = [
  { id: 'title', defaultName: 'Title' },
  { id: 'description', defaultName: 'Description' },
  { id: 'status', defaultName: 'Status' },
  { id: 'group', defaultName: 'Group' },
  { id: 'subGroup', defaultName: 'Sub-Group' },
  { id: 'priority', defaultName: 'Priority' },
  { id: 'dueDate', defaultName: 'Due Date' },
  { id: 'label', defaultName: 'Label' },
  { id: 'labelColor', defaultName: 'Label Color' },
  { id: 'checklist', defaultName: 'Checklist' },
  { id: 'comments', defaultName: 'Comments' },
] as const;

/** Get the display name for a built-in field, respecting user overrides */
export function getFieldLabel(fieldId: string, meta: BoardMeta): string {
  const custom = meta.fieldLabels?.[fieldId];
  if (custom) return custom;
  const builtin = BUILTIN_FIELDS.find(f => f.id === fieldId);
  return builtin?.defaultName || fieldId;
}
