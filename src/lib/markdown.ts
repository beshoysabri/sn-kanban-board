import { v4 as uuid } from 'uuid';
import type {
  KanbanBoard, KanbanCard, StatusDef, GroupDef, BoardMeta,
  ViewMode, Priority, FieldDef, EditorState,
} from '../types/kanban';

const DEFAULT_META: BoardMeta = {
  title: '', description: '', viewMode: 'list',
  boardGroupBy: 'status', boardSubGroupBy: '',
};

const VALID_VIEWS: ViewMode[] = ['list', 'board', 'table', 'analytics'];

export function parseMarkdown(markdown: string): EditorState {
  const lines = markdown.split('\n');
  const meta: BoardMeta = { ...DEFAULT_META };
  const statuses: StatusDef[] = [];
  const groups: GroupDef[] = [];
  const subGroups: GroupDef[] = [];
  const cards: KanbanCard[] = [];
  const fields: FieldDef[] = [];
  const parsingErrors: string[] = [];

  // Detect format: new format has @status: lines, legacy has # Header lines
  const isNewFormat = lines.some(l => l.trim().toLowerCase().startsWith('@status:'));

  let currentCard: KanbanCard | null = null;
  let currentStatusId = '';
  let inComments = false;
  let inChecklist = false;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Meta lines
    if (line.startsWith('@')) {
      const metaMatch = line.match(/^@(\w+):\s*(.*)$/);
      if (!metaMatch) continue;
      const [, key, value] = metaMatch;
      switch (key.toLowerCase()) {
        case 'title': meta.title = value.trim(); break;
        case 'description': meta.description = value.trim(); break;
        case 'view': {
          const v = value.trim() as ViewMode;
          meta.viewMode = VALID_VIEWS.includes(v) ? v : 'list';
          break;
        }
        case 'groupby': meta.boardGroupBy = value.trim() || 'status'; break;
        case 'subgroupby': meta.boardSubGroupBy = value.trim(); break;
        case 'fieldlabel': {
          // Format: @fieldlabel: fieldId=Custom Name
          const eqIdx = value.indexOf('=');
          if (eqIdx > 0) {
            if (!meta.fieldLabels) meta.fieldLabels = {};
            meta.fieldLabels[value.slice(0, eqIdx).trim()] = value.slice(eqIdx + 1).trim();
          }
          break;
        }
        case 'status': {
          const text = value.trim();
          let name = text, color = '', wipLimit = 0;
          name = name.replace(/\[color:([^\]]+)\]/g, (_, c) => { color = c; return ''; });
          name = name.replace(/\[wip:(\d+)\]/g, (_, n) => { wipLimit = parseInt(n, 10); return ''; });
          statuses.push({ id: uuid(), name: name.trim(), color, wipLimit });
          break;
        }
        case 'group': {
          const text = value.trim();
          let name = text, color = '';
          name = name.replace(/\[color:([^\]]+)\]/g, (_, c) => { color = c; return ''; });
          groups.push({ id: uuid(), name: name.trim(), color });
          break;
        }
        case 'subgroup': {
          const text = value.trim();
          let name = text, color = '';
          name = name.replace(/\[color:([^\]]+)\]/g, (_, c) => { color = c; return ''; });
          subGroups.push({ id: uuid(), name: name.trim(), color });
          break;
        }
        case 'field': {
          const text = value.trim();
          let id = '', fname = '', ftype = 'text', opts: string[] | undefined;
          const idMatch = text.match(/^(\S+)/);
          if (idMatch) id = idMatch[1];
          const typeMatch = text.match(/\[type:([^\]]+)\]/);
          if (typeMatch) ftype = typeMatch[1];
          const nameMatch = text.match(/\[name:([^\]]+)\]/);
          if (nameMatch) fname = nameMatch[1];
          const optsMatch = text.match(/\[options:([^\]]+)\]/);
          if (optsMatch) opts = optsMatch[1].split(',').map(s => s.trim());
          let optColors: Record<string, string> | undefined;
          const colorsMatch = text.match(/\[colors:([^\]]+)\]/);
          if (colorsMatch) {
            optColors = {};
            colorsMatch[1].split(',').forEach(pair => {
              const [k, v] = pair.split('=');
              if (k && v) optColors![k.trim()] = v.trim();
            });
          }
          if (id) fields.push({ id, name: fname || id, type: ftype as FieldDef['type'], ...(opts ? { options: opts } : {}), ...(optColors ? { optionColors: optColors } : {}) });
          break;
        }
      }
      continue;
    }

    if (isNewFormat) {
      // New format: cards are flat (no # headers)
      if (line.startsWith('* ') && !line.startsWith('  ')) {
        currentCard = createNewCard(line.slice(2).trim());
        cards.push(currentCard);
        inComments = false;
        inChecklist = false;
      } else if (currentCard) {
        parseCardProperty(line, currentCard, statuses, groups, subGroups, fields, inComments, inChecklist, (c, ch) => { inComments = c; inChecklist = ch; });
      }
    } else {
      // Legacy format: # Header defines statuses, cards nested under headers
      if (line.startsWith('# ')) {
        const text = line.slice(2).trim();
        let name = text, color = '', wipLimit = 0;
        name = name.replace(/\[color:([^\]]+)\]/g, (_, c) => { color = c; return ''; });
        name = name.replace(/\[wip:(\d+)\]/g, (_, n) => { wipLimit = parseInt(n, 10); return ''; });
        const status: StatusDef = { id: uuid(), name: name.trim(), color, wipLimit };
        statuses.push(status);
        currentStatusId = status.id;
        currentCard = null;
        inComments = false;
        inChecklist = false;
      } else if (line.startsWith('* ')) {
        currentCard = createNewCard(line.slice(2).trim());
        currentCard.statusId = currentStatusId;
        cards.push(currentCard);
        inComments = false;
        inChecklist = false;
      } else if (currentCard) {
        parseCardProperty(line, currentCard, statuses, groups, subGroups, fields, inComments, inChecklist, (c, ch) => { inComments = c; inChecklist = ch; });
      } else {
        parsingErrors.push(line);
      }
    }
  }

  return { board: { meta, statuses, groups, subGroups, cards, fields }, parsingErrors };
}

function parseCardProperty(
  line: string, card: KanbanCard,
  statuses: StatusDef[], groups: GroupDef[], subGroups: GroupDef[], fields: FieldDef[],
  inComments: boolean, inChecklist: boolean,
  setFlags: (c: boolean, ch: boolean) => void,
) {
  const lower = line.toLowerCase().trimStart();

  if (lower.startsWith('* links: ')) return; // legacy, ignore
  if (lower.startsWith('* description: ')) {
    card.description = line.slice(line.toLowerCase().indexOf('description: ') + 13).trim();
  } else if (lower.startsWith('* label: ')) {
    card.label = line.slice(line.toLowerCase().indexOf('label: ') + 7).trim();
  } else if (lower.startsWith('* labelcolor: ')) {
    card.labelColor = line.slice(line.toLowerCase().indexOf('labelcolor: ') + 12).trim();
  } else if (lower.startsWith('* duedate: ')) {
    card.dueDate = line.slice(line.toLowerCase().indexOf('duedate: ') + 9).trim();
  } else if (lower.startsWith('* priority: ')) {
    const p = line.slice(line.toLowerCase().indexOf('priority: ') + 10).trim().toLowerCase();
    if (['low', 'medium', 'high', 'critical'].includes(p)) card.priority = p as Priority;
  } else if (lower.startsWith('* status: ')) {
    const name = line.slice(line.toLowerCase().indexOf('status: ') + 8).trim();
    const s = statuses.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (s) card.statusId = s.id;
  } else if (lower.startsWith('* group: ')) {
    const name = line.slice(line.toLowerCase().indexOf('group: ') + 7).trim();
    const g = groups.find(g => g.name.toLowerCase() === name.toLowerCase());
    if (g) card.groupId = g.id;
  } else if (lower.startsWith('* subgroup: ')) {
    const name = line.slice(line.toLowerCase().indexOf('subgroup: ') + 10).trim();
    const sg = subGroups.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (sg) card.subGroupId = sg.id;
  } else if (lower.startsWith('* comments:')) {
    setFlags(true, false);
  } else if (lower.startsWith('* checklist:')) {
    setFlags(false, true);
  } else if (inChecklist && line.trimStart().startsWith('* ')) {
    const text = line.trimStart().slice(2);
    if (text.startsWith('[x] ')) card.checklist.push({ text: text.slice(4), done: true });
    else if (text.startsWith('[ ] ')) card.checklist.push({ text: text.slice(4), done: false });
    else card.checklist.push({ text, done: false });
  } else if (inComments && line.trimStart().startsWith('* ')) {
    card.comments.push(line.trimStart().slice(2));
  } else {
    // Try custom fields
    const propMatch = line.trimStart().match(/^\* ([^:]+):\s*(.*)$/);
    if (propMatch) {
      const [, propName, propValue] = propMatch;
      const field = fields.find(f => f.name.toLowerCase() === propName.trim().toLowerCase());
      if (field) card.customFields[field.id] = propValue.trim();
    }
  }
}

export function boardToMarkdown(board: KanbanBoard): string {
  const parts: string[] = [];

  if (board.meta.title) parts.push(`@title: ${board.meta.title}`);
  if (board.meta.description) parts.push(`@description: ${board.meta.description}`);
  parts.push(`@view: ${board.meta.viewMode}`);
  if (board.meta.boardGroupBy !== 'status') parts.push(`@groupby: ${board.meta.boardGroupBy}`);
  if (board.meta.boardSubGroupBy) parts.push(`@subgroupby: ${board.meta.boardSubGroupBy}`);
  if (board.meta.fieldLabels) {
    for (const [id, label] of Object.entries(board.meta.fieldLabels)) {
      if (label) parts.push(`@fieldlabel: ${id}=${label}`);
    }
  }

  for (const s of board.statuses) {
    let tags = '';
    if (s.color) tags += ` [color:${s.color}]`;
    if (s.wipLimit > 0) tags += ` [wip:${s.wipLimit}]`;
    parts.push(`@status: ${s.name}${tags}`);
  }
  for (const g of board.groups) {
    const tag = g.color ? ` [color:${g.color}]` : '';
    parts.push(`@group: ${g.name}${tag}`);
  }
  for (const sg of board.subGroups) {
    const tag = sg.color ? ` [color:${sg.color}]` : '';
    parts.push(`@subgroup: ${sg.name}${tag}`);
  }
  for (const f of board.fields) {
    let tags = ` [type:${f.type}] [name:${f.name}]`;
    if (f.options?.length) tags += ` [options:${f.options.join(',')}]`;
    if (f.optionColors && Object.keys(f.optionColors).length > 0) {
      tags += ` [colors:${Object.entries(f.optionColors).map(([k, v]) => `${k}=${v}`).join(',')}]`;
    }
    parts.push(`@field: ${f.id}${tags}`);
  }
  parts.push('');

  for (const card of board.cards) {
    parts.push(`* ${card.title}`);
    if (card.description) parts.push(`  * Description: ${card.description}`);
    const status = board.statuses.find(s => s.id === card.statusId);
    if (status) parts.push(`  * Status: ${status.name}`);
    const group = board.groups.find(g => g.id === card.groupId);
    if (group) parts.push(`  * Group: ${group.name}`);
    const subGroup = board.subGroups.find(sg => sg.id === card.subGroupId);
    if (subGroup) parts.push(`  * SubGroup: ${subGroup.name}`);
    if (card.label) parts.push(`  * Label: ${card.label}`);
    if (card.labelColor) parts.push(`  * LabelColor: ${card.labelColor}`);
    if (card.dueDate) parts.push(`  * DueDate: ${card.dueDate}`);
    if (card.priority) parts.push(`  * Priority: ${card.priority}`);
    for (const [fieldId, value] of Object.entries(card.customFields)) {
      if (!value) continue;
      const field = board.fields.find(f => f.id === fieldId);
      if (field) parts.push(`  * ${field.name}: ${value}`);
    }
    if (card.checklist.length > 0) {
      parts.push(`  * Checklist:`);
      for (const item of card.checklist) parts.push(`    * ${item.done ? '[x]' : '[ ]'} ${item.text}`);
    }
    if (card.comments.length > 0) {
      parts.push(`  * Comments:`);
      for (const comment of card.comments) parts.push(`    * ${comment}`);
    }
  }

  return parts.join('\n').trim() + '\n';
}

export function createEmptyBoard(): KanbanBoard {
  return { meta: { ...DEFAULT_META }, statuses: [], groups: [], subGroups: [], cards: [], fields: [] };
}

export function createDefaultBoard(): KanbanBoard {
  return {
    meta: { ...DEFAULT_META },
    statuses: [
      { id: uuid(), name: 'To Do', color: '', wipLimit: 0 },
      { id: uuid(), name: 'In Progress', color: 'Ocean', wipLimit: 0 },
      { id: uuid(), name: 'Done', color: 'Sage', wipLimit: 0 },
    ],
    groups: [],
    subGroups: [],
    cards: [],
    fields: [],
  };
}

export function createNewCard(title: string = ''): KanbanCard {
  return {
    id: uuid(), title, description: '', statusId: '', groupId: '', subGroupId: '',
    priority: '', dueDate: '', label: '', labelColor: '',
    checklist: [], comments: [], customFields: {},
  };
}

export function createNewStatus(name: string = 'New Status'): StatusDef {
  return { id: uuid(), name, color: '', wipLimit: 0 };
}

export function createNewGroupDef(name: string = 'New Group'): GroupDef {
  return { id: uuid(), name, color: '' };
}
