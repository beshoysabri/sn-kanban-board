export type ViewMode = 'list' | 'board' | 'table' | 'analytics';

export type Priority = 'low' | 'medium' | 'high' | 'critical' | '';

export interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface SubGroup {
  id: string;
  name: string;
  color: string;
}

export interface BoardMeta {
  title: string;
  description: string;
  viewMode: ViewMode;
}

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  label: string;
  labelColor: string;
  dueDate: string;
  comments: string[];
  priority: Priority;
  checklist: ChecklistItem[];
  subGroupId: string;
}

export interface KanbanGroup {
  id: string;
  title: string;
  color: string;
  cards: KanbanCard[];
  wipLimit: number;
}

export interface KanbanBoard {
  meta: BoardMeta;
  groups: KanbanGroup[];
  subGroups: SubGroup[];
}

export interface EditorState {
  board: KanbanBoard;
  parsingErrors: string[];
}
