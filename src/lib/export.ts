import type { KanbanBoard } from '../types/kanban.ts';

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
  const rows = [['Group', 'Title', 'Description', 'Label', 'Due Date', 'Comments']];
  for (const group of board.groups) {
    for (const card of group.cards) {
      rows.push([
        group.title,
        card.title,
        card.description,
        card.label,
        card.dueDate,
        String(card.comments.length),
      ]);
    }
  }
  const csv = rows.map(row =>
    row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const title = board.meta.title || 'kanban-board';
  downloadFile(csv, `${title.replace(/\s+/g, '-').toLowerCase()}.csv`, 'text/csv');
}

export function exportMarkdown(board: KanbanBoard) {
  const lines: string[] = [];
  lines.push(`# ${board.meta.title || 'Kanban Board'}`);
  if (board.meta.description) {
    lines.push('', board.meta.description);
  }
  lines.push('');
  for (const group of board.groups) {
    lines.push(`## ${group.title} (${group.cards.length} cards)`);
    lines.push('');
    for (const card of group.cards) {
      lines.push(`- **${card.title}**`);
      if (card.description) lines.push(`  ${card.description}`);
      if (card.label) lines.push(`  Label: ${card.label}`);
      if (card.dueDate) lines.push(`  Due: ${card.dueDate}`);
      if (card.comments.length > 0) {
        lines.push(`  Comments: ${card.comments.length}`);
      }
    }
    lines.push('');
  }
  const title = board.meta.title || 'kanban-board';
  downloadFile(lines.join('\n'), `${title.replace(/\s+/g, '-').toLowerCase()}.md`, 'text/markdown');
}

export function exportJSON(board: KanbanBoard) {
  const json = JSON.stringify(board, null, 2);
  const title = board.meta.title || 'kanban-board';
  downloadFile(json, `${title.replace(/\s+/g, '-').toLowerCase()}.json`, 'application/json');
}
