import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Modal } from './shared/Modal.tsx';
import type { KanbanBoard, FieldType } from '../types/kanban';

type Tab = 'statuses' | 'groups' | 'subGroups' | 'fields' | 'layout';

interface SchemaEditorProps {
  board: KanbanBoard;
  onUpdateBoard: (board: KanbanBoard) => void;
  onClose: () => void;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'statuses', label: 'Statuses' },
  { key: 'groups', label: 'Groups' },
  { key: 'subGroups', label: 'Sub-Groups' },
  { key: 'fields', label: 'Fields' },
  { key: 'layout', label: 'Layout' },
];

const FIELD_TYPES: FieldType[] = ['text', 'select', 'date', 'number'];

const DeleteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function SchemaEditor({ board, onUpdateBoard, onClose }: SchemaEditorProps) {
  const [tab, setTab] = useState<Tab>('statuses');
  const [draft, setDraft] = useState(() => structuredClone(board));

  const handleSave = () => {
    onUpdateBoard(draft);
    onClose();
  };

  /* ---- Statuses ---- */

  const updateStatus = (index: number, field: string, value: string | number) => {
    setDraft((d) => {
      const next = structuredClone(d);
      (next.statuses[index] as unknown as Record<string, unknown>)[field] = value;
      return next;
    });
  };

  const addStatus = () => {
    setDraft((d) => ({
      ...d,
      statuses: [...d.statuses, { id: uuid(), name: '', color: '#888888', wipLimit: 0 }],
    }));
  };

  const deleteStatus = (index: number) => {
    setDraft((d) => {
      const next = structuredClone(d);
      const removedId = next.statuses[index].id;
      next.statuses.splice(index, 1);
      const fallbackId = next.statuses[0]?.id ?? '';
      next.cards = next.cards.map((c) =>
        c.statusId === removedId ? { ...c, statusId: fallbackId } : c,
      );
      return next;
    });
  };

  /* ---- Groups / Sub-Groups ---- */

  const updateGroupItem = (key: 'groups' | 'subGroups', index: number, field: string, value: string) => {
    setDraft((d) => {
      const next = structuredClone(d);
      (next[key][index] as unknown as Record<string, unknown>)[field] = value;
      return next;
    });
  };

  const addGroupItem = (key: 'groups' | 'subGroups') => {
    setDraft((d) => ({
      ...d,
      [key]: [...d[key], { id: uuid(), name: '', color: '#888888' }],
    }));
  };

  const deleteGroupItem = (key: 'groups' | 'subGroups', index: number) => {
    setDraft((d) => {
      const next = structuredClone(d);
      const removedId = next[key][index].id;
      next[key].splice(index, 1);
      const fallbackId = next[key][0]?.id ?? '';
      const cardField = key === 'groups' ? 'groupId' : 'subGroupId';
      next.cards = next.cards.map((c) =>
        c[cardField] === removedId ? { ...c, [cardField]: fallbackId } : c,
      );
      return next;
    });
  };

  /* ---- Fields ---- */

  const updateField = (index: number, field: string, value: string | string[]) => {
    setDraft((d) => {
      const next = structuredClone(d);
      (next.fields[index] as unknown as Record<string, unknown>)[field] = value;
      if (field === 'type' && value !== 'select') {
        delete next.fields[index].options;
      }
      return next;
    });
  };

  const addField = () => {
    setDraft((d) => ({
      ...d,
      fields: [...d.fields, { id: uuid(), name: '', type: 'text' as FieldType }],
    }));
  };

  const deleteField = (index: number) => {
    setDraft((d) => {
      const next = structuredClone(d);
      const removedId = next.fields[index].id;
      next.fields.splice(index, 1);
      next.cards = next.cards.map((c) => {
        const cf = { ...c.customFields };
        delete cf[removedId];
        return { ...c, customFields: cf };
      });
      return next;
    });
  };

  /* ---- Layout ---- */

  const updateMeta = (field: string, value: string) => {
    setDraft((d) => ({
      ...d,
      meta: { ...d.meta, [field]: value },
    }));
  };

  /* ---- Render helpers ---- */

  const renderStatuses = () => (
    <div className="schema-items">
      {draft.statuses.map((s, i) => (
        <div className="schema-item" key={s.id}>
          <input
            className="modal-input"
            style={{ width: 140 }}
            value={s.name}
            onChange={(e) => updateStatus(i, 'name', e.target.value)}
            placeholder="Status name"
          />
          <input
            className="modal-input"
            style={{ width: 60 }}
            type="number"
            min={0}
            value={s.wipLimit}
            onChange={(e) => updateStatus(i, 'wipLimit', Number(e.target.value))}
            placeholder="WIP"
          />
          <button className="schema-delete-btn" onClick={() => deleteStatus(i)} aria-label="Delete status">
            <DeleteIcon />
          </button>
        </div>
      ))}
      <button className="btn-primary btn-sm" onClick={addStatus}>Add Status</button>
    </div>
  );

  const renderGroupList = (key: 'groups' | 'subGroups', label: string) => (
    <div className="schema-items">
      {draft[key].map((g, i) => (
        <div className="schema-item" key={g.id}>
          <input
            className="modal-input"
            style={{ width: 140 }}
            value={g.name}
            onChange={(e) => updateGroupItem(key, i, 'name', e.target.value)}
            placeholder={`${label} name`}
          />
          <button className="schema-delete-btn" onClick={() => deleteGroupItem(key, i)} aria-label={`Delete ${label.toLowerCase()}`}>
            <DeleteIcon />
          </button>
        </div>
      ))}
      <button className="btn-primary btn-sm" onClick={() => addGroupItem(key)}>Add {label}</button>
    </div>
  );

  const renderFields = () => (
    <div className="schema-items">
      {draft.fields.map((f, i) => (
        <div className="schema-item" key={f.id}>
          <input
            className="modal-input"
            style={{ width: 140 }}
            value={f.name}
            onChange={(e) => updateField(i, 'name', e.target.value)}
            placeholder="Field name"
          />
          <select
            className="modal-input form-select"
            value={f.type}
            onChange={(e) => updateField(i, 'type', e.target.value)}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {f.type === 'select' && (
            <input
              className="modal-input"
              style={{ width: 160 }}
              value={(f.options ?? []).join(', ')}
              onChange={(e) =>
                updateField(i, 'options', e.target.value.split(',').map((o) => o.trim()).filter(Boolean))
              }
              placeholder="Options (comma-separated)"
            />
          )}
          <button className="schema-delete-btn" onClick={() => deleteField(i)} aria-label="Delete field">
            <DeleteIcon />
          </button>
        </div>
      ))}
      <button className="btn-primary btn-sm" onClick={addField}>Add Field</button>
    </div>
  );

  const renderLayout = () => (
    <div className="schema-items">
      <div className="schema-item">
        <label className="modal-label">Columns (Group By)</label>
        <select
          className="modal-input form-select"
          value={draft.meta.boardGroupBy}
          onChange={(e) => updateMeta('boardGroupBy', e.target.value)}
        >
          <option value="status">Status</option>
          <option value="group">Group</option>
        </select>
      </div>
      <div className="schema-item">
        <label className="modal-label">Swim Lanes (Sub-Group By)</label>
        <select
          className="modal-input form-select"
          value={draft.meta.boardSubGroupBy}
          onChange={(e) => updateMeta('boardSubGroupBy', e.target.value)}
        >
          <option value="">None</option>
          <option value="group">Group</option>
          <option value="subGroup">Sub-Group</option>
          <option value="status">Status</option>
        </select>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (tab) {
      case 'statuses':
        return renderStatuses();
      case 'groups':
        return renderGroupList('groups', 'Group');
      case 'subGroups':
        return renderGroupList('subGroups', 'Sub-Group');
      case 'fields':
        return renderFields();
      case 'layout':
        return renderLayout();
    }
  };

  const footer = (
    <>
      <button className="btn-secondary" onClick={onClose}>Cancel</button>
      <button className="btn-primary" onClick={handleSave}>Save</button>
    </>
  );

  return (
    <Modal title="Board Settings" onClose={onClose} footer={footer}>
      <div className="schema-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`schema-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {renderTabContent()}
    </Modal>
  );
}
