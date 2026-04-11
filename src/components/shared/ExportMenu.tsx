import { useState, useEffect, useRef } from 'react';
import type { KanbanBoard } from '../../types/kanban.ts';
import { exportCSV, exportMarkdown, exportJSON } from '../../lib/export.ts';

interface ExportMenuProps {
  board: KanbanBoard;
  onExport?: () => void;
}

const CsvIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="2" y="1" width="12" height="14" rx="2"/><line x1="5" y1="5" x2="11" y2="5"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="5" y1="11" x2="9" y2="11"/>
  </svg>
);
const MdIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="1" y="3" width="14" height="10" rx="2"/><polyline points="4,9 6,7 8,9"/><line x1="10" y1="7" x2="10" y2="9"/><line x1="12" y1="7" x2="12" y2="9"/>
  </svg>
);
const JsonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M4 2C3 2 2 3 2 4v2c0 1-1 2-1 2s1 1 1 2v2c0 1 1 2 2 2"/><path d="M12 2c1 0 2 1 2 2v2c0 1 1 2 1 2s-1 1-1 2v2c0 1-1 2-2 2"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="8" y1="2" x2="8" y2="10"/><polyline points="4,7 8,11 12,7"/><line x1="2" y1="14" x2="14" y2="14"/>
  </svg>
);

export function ExportMenu({ board, onExport }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleExport = (fn: (board: KanbanBoard) => void) => {
    fn(board);
    setOpen(false);
    onExport?.();
  };

  return (
    <div className="export-menu" ref={ref}>
      <button
        className="kb-icon-btn"
        onClick={() => setOpen(!open)}
        title="Export"
      >
        <DownloadIcon />
      </button>
      {open && (
        <div className="export-dropdown">
          <button onClick={() => handleExport(exportCSV)}>
            <CsvIcon /> CSV
          </button>
          <button onClick={() => handleExport(exportMarkdown)}>
            <MdIcon /> Markdown
          </button>
          <button onClick={() => handleExport(exportJSON)}>
            <JsonIcon /> JSON
          </button>
        </div>
      )}
    </div>
  );
}
