export type ViewMode = 'list' | 'board' | 'table' | 'analytics';

export type Priority = 'low' | 'medium' | 'high' | 'critical' | '';

export type FieldType = 'text' | 'select' | 'date' | 'number';

export interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface FieldDef {
  id: string;
  name: string;
  type: FieldType;
  options?: string[];
  optionColors?: Record<string, string>; // option value → hex color
}

export interface StatusDef {
  id: string;
  name: string;
  color: string;
  wipLimit: number;
}

export interface GroupDef {
  id: string;
  name: string;
  color: string;
}

export interface BoardMeta {
  title: string;
  description: string;
  viewMode: ViewMode;
  boardGroupBy: string;
  boardSubGroupBy: string;
}

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  statusId: string;
  groupId: string;
  subGroupId: string;
  priority: Priority;
  dueDate: string;
  label: string;
  labelColor: string;
  checklist: ChecklistItem[];
  comments: string[];
  customFields: Record<string, string>;
}

export interface KanbanBoard {
  meta: BoardMeta;
  statuses: StatusDef[];
  groups: GroupDef[];
  subGroups: GroupDef[];
  cards: KanbanCard[];
  fields: FieldDef[];
}

export interface EditorState {
  board: KanbanBoard;
  parsingErrors: string[];
}
