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
  const rows = [['Status', 'Group', 'Title', 'Description', 'Label', 'Priority', 'Due Date', 'Comments']];
  for (const card of board.cards) {
    const status = board.statuses.find(s => s.id === card.statusId);
    const group = board.groups.find(g => g.id === card.groupId);
    rows.push([
      status?.name || '',
      group?.name || '',
      card.title,
      card.description,
      card.label,
      card.priority,
      card.dueDate,
      String(card.comments.length),
    ]);
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
  for (const status of board.statuses) {
    const statusCards = board.cards.filter(c => c.statusId === status.id);
    lines.push(`## ${status.name} (${statusCards.length} cards)`);
    lines.push('');
    for (const card of statusCards) {
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
