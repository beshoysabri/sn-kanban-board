import { v4 as uuid } from 'uuid';
import type { KanbanBoard, KanbanCard, KanbanGroup, BoardMeta, ViewMode, Priority, SubGroup, EditorState } from '../types/kanban';

const DEFAULT_META: BoardMeta = { title: '', description: '', viewMode: 'list' };
const VALID_VIEWS: ViewMode[] = ['list', 'board', 'table', 'analytics'];

export function parseMarkdown(markdown: string): EditorState {
  const groups: KanbanGroup[] = [];
  const subGroups: SubGroup[] = [];
  const parsingErrors: string[] = [];
  const lines = markdown.split('\n');
  const meta: BoardMeta = { ...DEFAULT_META };

  let currentGroup: KanbanGroup | null = null;
  let currentCard: KanbanCard | null = null;
  let inComments = false;
  let inChecklist = false;

  for (const line of lines) {
    if (!line.trim()) continue;

    if (line.startsWith('@')) {
      const metaMatch = line.match(/^@(\w+):\s*(.*)$/);
      if (metaMatch) {
        const [, key, value] = metaMatch;
        switch (key.toLowerCase()) {
          case 'title':
            meta.title = value.trim();
            break;
          case 'description':
            meta.description = value.trim();
            break;
          case 'view': {
            const v = value.trim() as ViewMode;
            meta.viewMode = VALID_VIEWS.includes(v) ? v : 'list';
            break;
          }
          case 'subgroup': {
            const sgText = value.trim();
            const colorMatch = sgText.match(/^(.*?)\s*\[color:([^\]]+)\]\s*$/);
            subGroups.push({
              id: uuid(),
              name: colorMatch ? colorMatch[1].trim() : sgText,
              color: colorMatch ? colorMatch[2] : '',
            });
            break;
          }
        }
      }
      continue;
    }

    if (line.startsWith('# ')) {
      const text = line.slice(2).trim();
      let title = text;
      let color = '';
      let wipLimit = 0;
      title = title.replace(/\[color:([^\]]+)\]/g, (_, c) => { color = c; return ''; });
      title = title.replace(/\[wip:(\d+)\]/g, (_, n) => { wipLimit = parseInt(n, 10); return ''; });
      currentGroup = { id: uuid(), title: title.trim(), color, cards: [], wipLimit };
      groups.push(currentGroup);
      currentCard = null;
      inComments = false;
      inChecklist = false;
    } else if (line.startsWith('* ')) {
      if (!currentGroup) { parsingErrors.push(`Card before group: ${line}`); continue; }
      currentCard = createNewCard(line.slice(2).trim());
      currentGroup.cards.push(currentCard);
      inComments = false;
      inChecklist = false;
    } else if (line.toLowerCase().trimStart().startsWith('* links: ')) {
      // Legacy
    } else if (line.toLowerCase().trimStart().startsWith('* description: ')) {
      if (currentCard) currentCard.description = line.slice(line.toLowerCase().indexOf('description: ') + 13).trim();
    } else if (line.toLowerCase().trimStart().startsWith('* label: ')) {
      if (currentCard) currentCard.label = line.slice(line.toLowerCase().indexOf('label: ') + 7).trim();
    } else if (line.toLowerCase().trimStart().startsWith('* labelcolor: ')) {
      if (currentCard) currentCard.labelColor = line.slice(line.toLowerCase().indexOf('labelcolor: ') + 12).trim();
    } else if (line.toLowerCase().trimStart().startsWith('* duedate: ')) {
      if (currentCard) currentCard.dueDate = line.slice(line.toLowerCase().indexOf('duedate: ') + 9).trim();
    } else if (line.toLowerCase().trimStart().startsWith('* priority: ')) {
      if (currentCard) {
        const p = line.slice(line.toLowerCase().indexOf('priority: ') + 10).trim().toLowerCase();
        if (['low', 'medium', 'high', 'critical'].includes(p)) currentCard.priority = p as Priority;
      }
    } else if (line.toLowerCase().trimStart().startsWith('* subgroup: ')) {
      if (currentCard) {
        const sgName = line.slice(line.toLowerCase().indexOf('subgroup: ') + 10).trim();
        const sg = subGroups.find(s => s.name.toLowerCase() === sgName.toLowerCase());
        if (sg) currentCard.subGroupId = sg.id;
      }
    } else if (line.toLowerCase().trimStart().startsWith('* comments:')) {
      inComments = true; inChecklist = false;
    } else if (line.toLowerCase().trimStart().startsWith('* checklist:')) {
      inChecklist = true; inComments = false;
    } else if (inChecklist && line.trimStart().startsWith('* ')) {
      if (currentCard) {
        const text = line.trimStart().slice(2);
        if (text.startsWith('[x] ')) currentCard.checklist.push({ text: text.slice(4), done: true });
        else if (text.startsWith('[ ] ')) currentCard.checklist.push({ text: text.slice(4), done: false });
        else currentCard.checklist.push({ text, done: false });
      }
    } else if (inComments && line.trimStart().startsWith('* ')) {
      if (currentCard) currentCard.comments.push(line.trimStart().slice(2));
    } else {
      parsingErrors.push(line);
    }
  }

  return { board: { meta, groups, subGroups }, parsingErrors };
}

export function boardToMarkdown(board: KanbanBoard): string {
  const parts: string[] = [];

  if (board.meta.title) parts.push(`@title: ${board.meta.title}`);
  if (board.meta.description) parts.push(`@description: ${board.meta.description}`);
  parts.push(`@view: ${board.meta.viewMode}`);

  for (const sg of board.subGroups) {
    const colorTag = sg.color ? ` [color:${sg.color}]` : '';
    parts.push(`@subgroup: ${sg.name}${colorTag}`);
  }
  parts.push('');

  for (const group of board.groups) {
    let tags = '';
    if (group.color) tags += ` [color:${group.color}]`;
    if (group.wipLimit > 0) tags += ` [wip:${group.wipLimit}]`;
    parts.push(`# ${group.title}${tags}`);
    for (const card of group.cards) {
      parts.push(`* ${card.title}`);
      if (card.description) parts.push(`  * Description: ${card.description}`);
      if (card.label) parts.push(`  * Label: ${card.label}`);
      if (card.labelColor) parts.push(`  * LabelColor: ${card.labelColor}`);
      if (card.dueDate) parts.push(`  * DueDate: ${card.dueDate}`);
      if (card.priority) parts.push(`  * Priority: ${card.priority}`);
      if (card.subGroupId) {
        const sg = board.subGroups.find(s => s.id === card.subGroupId);
        if (sg) parts.push(`  * SubGroup: ${sg.name}`);
      }
      if (card.checklist && card.checklist.length > 0) {
        parts.push(`  * Checklist:`);
        for (const item of card.checklist) parts.push(`    * ${item.done ? '[x]' : '[ ]'} ${item.text}`);
      }
      if (card.comments && card.comments.length > 0) {
        parts.push(`  * Comments:`);
        for (const comment of card.comments) parts.push(`    * ${comment}`);
      }
    }
    parts.push('');
  }

  return parts.join('\n').trim() + '\n';
}

export function createEmptyBoard(): KanbanBoard {
  return { meta: { ...DEFAULT_META }, groups: [], subGroups: [] };
}

export function createDefaultBoard(): KanbanBoard {
  return {
    meta: { ...DEFAULT_META },
    groups: [
      { id: uuid(), title: 'To Do', color: '', cards: [], wipLimit: 0 },
      { id: uuid(), title: 'In Progress', color: 'Ocean', cards: [], wipLimit: 0 },
      { id: uuid(), title: 'Done', color: 'Sage', cards: [], wipLimit: 0 },
    ],
    subGroups: [],
  };
}

export function createNewCard(title: string = ''): KanbanCard {
  return {
    id: uuid(), title, description: '', label: '', labelColor: '',
    dueDate: '', comments: [], priority: '', checklist: [], subGroupId: '',
  };
}

export function createNewGroup(title: string = 'New Group'): KanbanGroup {
  return { id: uuid(), title, color: '', cards: [], wipLimit: 0 };
}
