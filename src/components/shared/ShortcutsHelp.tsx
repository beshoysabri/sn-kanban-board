import { Modal } from './Modal.tsx';

interface ShortcutsHelpProps {
  onClose: () => void;
}

const SHORTCUTS: { key: string; desc: string }[] = [
  { key: 'N', desc: 'New card in first lane' },
  { key: 'L', desc: 'New lane' },
  { key: 'V', desc: 'Toggle board / list view' },
  { key: '\u2191 / \u2193', desc: 'Navigate cards' },
  { key: 'Enter', desc: 'Open card detail' },
  { key: 'Esc', desc: 'Close modal / panel' },
  { key: '?', desc: 'Show this help' },
];

export function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
  return (
    <Modal title="Keyboard Shortcuts" onClose={onClose}>
      <div className="shortcuts-list">
        {SHORTCUTS.map(s => (
          <div key={s.key} className="shortcuts-row">
            <kbd className="shortcuts-key">{s.key}</kbd>
            <span className="shortcuts-desc">{s.desc}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
