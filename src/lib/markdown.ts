import { v4 as uuid } from 'uuid';
import type { KanbanBoard, KanbanCard, KanbanLane, BoardMeta, ViewMode, Priority, EditorState } from '../types/kanban';

const DEFAULT_META: BoardMeta = { title: '', description: '', viewMode: 'list' };

const VALID_VIEWS: ViewMode[] = ['list', 'board', 'analytics'];

/**
 * Parse markdown into a kanban board state.
 */
export function parseMarkdown(markdown: string): EditorState {
  const lanes: KanbanLane[] = [];
  const parsingErrors: string[] = [];
  const lines = markdown.split('\n');
  const meta: BoardMeta = { ...DEFAULT_META };

  let currentLane: KanbanLane | null = null;
  let currentCard: KanbanCard | null = null;
  let inComments = false;
  let inChecklist = false;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Parse @key: value metadata lines
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
        }
      }
      continue;
    }

    if (line.startsWith('# ')) {
      const laneText = line.slice(2).trim();
      // Parse [color:xxx] and [wip:N] tags
      let title = laneText;
      let color = '';
      let wipLimit = 0;
      title = title.replace(/\[color:([^\]]+)\]/g, (_, c) => { color = c; return ''; });
      title = title.replace(/\[wip:(\d+)\]/g, (_, n) => { wipLimit = parseInt(n, 10); return ''; });
      currentLane = {
        id: uuid(),
        title: title.trim(),
        color,
        cards: [],
        wipLimit,
      };
      lanes.push(currentLane);
      currentCard = null;
      inComments = false;
      inChecklist = false;
    } else if (line.startsWith('* ')) {
      if (!currentLane) {
        parsingErrors.push(`Card before lane: ${line}`);
        continue;
      }
      currentCard = createNewCard(line.slice(2).trim());
      currentLane.cards.push(currentCard);
      inComments = false;
      inChecklist = false;
    } else if (line.toLowerCase().trimStart().startsWith('* links: ')) {
      // Legacy: silently ignore linked notes lines
    } else if (line.toLowerCase().trimStart().startsWith('* description: ')) {
      if (currentCard) {
        currentCard.description = line.slice(line.toLowerCase().indexOf('description: ') + 13).trim();
      }
    } else if (line.toLowerCase().trimStart().startsWith('* label: ')) {
      if (currentCard) {
        currentCard.label = line.slice(line.toLowerCase().indexOf('label: ') + 7).trim();
      }
    } else if (line.toLowerCase().trimStart().startsWith('* labelcolor: ')) {
      if (currentCard) {
        currentCard.labelColor = line.slice(line.toLowerCase().indexOf('labelcolor: ') + 12).trim();
      }
    } else if (line.toLowerCase().trimStart().startsWith('* duedate: ')) {
      if (currentCard) {
        currentCard.dueDate = line.slice(line.toLowerCase().indexOf('duedate: ') + 9).trim();
      }
    } else if (line.toLowerCase().trimStart().startsWith('* priority: ')) {
      if (currentCard) {
        const p = line.slice(line.toLowerCase().indexOf('priority: ') + 10).trim().toLowerCase();
        if (['low', 'medium', 'high', 'critical'].includes(p)) {
          currentCard.priority = p as Priority;
        }
      }
    } else if (line.toLowerCase().trimStart().startsWith('* comments:')) {
      inComments = true;
      inChecklist = false;
    } else if (line.toLowerCase().trimStart().startsWith('* checklist:')) {
      inChecklist = true;
      inComments = false;
    } else if (inChecklist && line.trimStart().startsWith('* ')) {
      if (currentCard) {
        const text = line.trimStart().slice(2);
        if (text.startsWith('[x] ')) {
          currentCard.checklist.push({ text: text.slice(4), done: true });
        } else if (text.startsWith('[ ] ')) {
          currentCard.checklist.push({ text: text.slice(4), done: false });
        } else {
          currentCard.checklist.push({ text, done: false });
        }
      }
    } else if (inComments && line.trimStart().startsWith('* ')) {
      if (currentCard) {
        currentCard.comments.push(line.trimStart().slice(2));
      }
    } else {
      parsingErrors.push(line);
    }
  }

  return { board: { meta, lanes }, parsingErrors };
}

/**
 * Convert kanban board state back to markdown
 */
export function boardToMarkdown(board: KanbanBoard): string {
  const parts: string[] = [];

  if (board.meta.title) {
    parts.push(`@title: ${board.meta.title}`);
  }
  if (board.meta.description) {
    parts.push(`@description: ${board.meta.description}`);
  }
  parts.push(`@view: ${board.meta.viewMode}`);
  parts.push('');

  for (const lane of board.lanes) {
    let tags = '';
    if (lane.color) tags += ` [color:${lane.color}]`;
    if (lane.wipLimit > 0) tags += ` [wip:${lane.wipLimit}]`;
    parts.push(`# ${lane.title}${tags}`);
    for (const card of lane.cards) {
      parts.push(`* ${card.title}`);
      if (card.description) {
        parts.push(`  * Description: ${card.description}`);
      }
      if (card.label) {
        parts.push(`  * Label: ${card.label}`);
      }
      if (card.labelColor) {
        parts.push(`  * LabelColor: ${card.labelColor}`);
      }
      if (card.dueDate) {
        parts.push(`  * DueDate: ${card.dueDate}`);
      }
      if (card.priority) {
        parts.push(`  * Priority: ${card.priority}`);
      }
      if (card.checklist && card.checklist.length > 0) {
        parts.push(`  * Checklist:`);
        for (const item of card.checklist) {
          parts.push(`    * ${item.done ? '[x]' : '[ ]'} ${item.text}`);
        }
      }
      if (card.comments && card.comments.length > 0) {
        parts.push(`  * Comments:`);
        for (const comment of card.comments) {
          parts.push(`    * ${comment}`);
        }
      }
    }
    parts.push('');
  }

  return parts.join('\n').trim() + '\n';
}

export function createEmptyBoard(): KanbanBoard {
  return { meta: { ...DEFAULT_META }, lanes: [] };
}

export function createDefaultBoard(): KanbanBoard {
  return {
    meta: { ...DEFAULT_META },
    lanes: [
      { id: uuid(), title: 'To Do', color: '', cards: [], wipLimit: 0 },
      { id: uuid(), title: 'In Progress', color: 'Ocean', cards: [], wipLimit: 0 },
      { id: uuid(), title: 'Done', color: 'Sage', cards: [], wipLimit: 0 },
    ],
  };
}

export function createNewCard(title: string = ''): KanbanCard {
  return {
    id: uuid(),
    title,
    description: '',
    label: '',
    labelColor: '',
    dueDate: '',
    comments: [],
    priority: '',
    checklist: [],
  };
}

export function createNewLane(title: string = 'New Lane'): KanbanLane {
  return {
    id: uuid(),
    title,
    color: '',
    cards: [],
    wipLimit: 0,
  };
}
