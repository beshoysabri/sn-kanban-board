export type ViewMode = 'list' | 'board' | 'analytics';

export type Priority = 'low' | 'medium' | 'high' | 'critical' | '';

export interface ChecklistItem {
  text: string;
  done: boolean;
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
  dueDate: string; // ISO date string e.g. "2026-03-01" or ""
  comments: string[];
  priority: Priority;
  checklist: ChecklistItem[];
}

export interface KanbanLane {
  id: string;
  title: string;
  color: string; // lane accent color name e.g. "Ocean" or hex "#32769B" or ""
  cards: KanbanCard[];
  wipLimit: number; // 0 = unlimited
}

export interface KanbanBoard {
  meta: BoardMeta;
  lanes: KanbanLane[];
}

export interface EditorState {
  board: KanbanBoard;
  parsingErrors: string[];
}
