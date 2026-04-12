import type { KanbanBoard } from '../types/kanban.ts';
import { boardToMarkdown } from './markdown.ts';

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCSV(board: KanbanBoard) {
  const customFieldNames = board.fields.map(f => f.name);
  const rows = [['Status', 'Group', 'Sub-Group', 'Title', 'Description', 'Label', 'Priority', 'Due Date', 'Checklist', 'Comments', ...customFieldNames]];
  for (const card of board.cards) {
    const status = board.statuses.find(s => s.id === card.statusId);
    const group = board.groups.find(g => g.id === card.groupId);
    const subGroup = board.subGroups.find(sg => sg.id === card.subGroupId);
    const checkDone = card.checklist.filter(i => i.done).length;
    const checkTotal = card.checklist.length;
    const customValues = board.fields.map(f => card.customFields[f.id] || '');
    rows.push([
      status?.name || '',
      group?.name || '',
      subGroup?.name || '',
      card.title,
      card.description,
      card.label,
      card.priority,
      card.dueDate,
      checkTotal > 0 ? `${checkDone}/${checkTotal}` : '',
      String(card.comments.length),
      ...customValues,
    ]);
  }
  const csv = rows.map(row =>
    row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const title = board.meta.title || 'kanban-board';
  downloadFile(csv, `${title.replace(/\s+/g, '-').toLowerCase()}.csv`, 'text/csv');
}

export function exportMarkdown(board: KanbanBoard) {
  const md = boardToMarkdown(board);
  const title = board.meta.title || 'kanban-board';
  downloadFile(md, `${title.replace(/\s+/g, '-').toLowerCase()}.md`, 'text/markdown');
}

export function exportJSON(board: KanbanBoard) {
  const json = JSON.stringify(board, null, 2);
  const title = board.meta.title || 'kanban-board';
  downloadFile(json, `${title.replace(/\s+/g, '-').toLowerCase()}.json`, 'application/json');
}
