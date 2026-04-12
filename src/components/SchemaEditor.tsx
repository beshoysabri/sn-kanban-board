import { useState, useRef, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { Modal } from './shared/Modal.tsx';
import { LABEL_COLORS, getColorHex } from '../lib/colors.ts';
import { BUILTIN_FIELDS } from '../lib/fields.ts';

/** Local-state text input — syncs to parent only on blur to avoid re-render on every keystroke */
function LocalInput({ value, onChange, placeholder, style, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  style?: React.CSSProperties; className?: string;
}) {
  const [local, setLocal] = useState(value);
  const latestLocal = useRef(local);
  latestLocal.current = local;

  // Only sync FROM parent if value changed externally (not from our own blur)
  const lastSynced = useRef(value);
  useEffect(() => {
    if (value !== lastSynced.current) {
      setLocal(value);
      lastSynced.current = value;
    }
  }, [value]);

  return (
    <input className={className} style={style} value={local} placeholder={placeholder}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        if (latestLocal.current !== value) {
          lastSynced.current = latestLocal.current;
          onChange(latestLocal.current);
        }
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}
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

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'url', label: 'URL' },
  { value: 'media', label: 'Media (URLs)' },
  { value: 'checkbox', label: 'Checkbox' },
];

const DeleteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/** Inline color palette picker — shows a color dot that opens a swatch popover */
function PaletteColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const resolvedHex = getColorHex(value) || value || '#888888';

  return (
    <div className="schema-palette-picker" ref={ref}>
      <button type="button" className="schema-palette-dot" style={{ background: resolvedHex }}
        onClick={() => setOpen(!open)} title={value || 'Pick color'} />
      {open && (
        <div className="schema-palette-popover">
          {LABEL_COLORS.map(c => (
            <button key={c.hex} type="button"
              className={`schema-palette-swatch ${resolvedHex.toLowerCase() === c.hex.toLowerCase() ? 'selected' : ''}`}
              style={{ background: c.hex }} title={c.name}
              onClick={() => { onChange(c.hex); setOpen(false); }} />
          ))}
          <button type="button"
            className={`schema-palette-swatch no-color ${!value ? 'selected' : ''}`}
            onClick={() => { onChange(''); setOpen(false); }} title="No color" />
        </div>
      )}
    </div>
  );
}

export function SchemaEditor({ board, onUpdateBoard, onClose }: SchemaEditorProps) {
  const [tab, setTab] = useState<Tab>('statuses');
  const [draft, setDraft] = useState(() => structuredClone(board));

  const handleSave = () => {
    // Auto-name empty items before saving
    const cleaned = structuredClone(draft);
    cleaned.statuses.forEach((s, i) => { if (!s.name.trim()) s.name = `Status ${i + 1}`; });
    cleaned.groups.forEach((g, i) => { if (!g.name.trim()) g.name = `Group ${i + 1}`; });
    cleaned.subGroups.forEach((sg, i) => { if (!sg.name.trim()) sg.name = `Sub-Group ${i + 1}`; });
    cleaned.fields.forEach((f, i) => { if (!f.name.trim()) f.name = `Field ${i + 1}`; });
    onUpdateBoard(cleaned);
    onClose();
  };

  /* ---- Statuses ---- */
  const updateStatus = (index: number, field: string, value: string | number) => {
    setDraft(d => ({
      ...d,
      statuses: d.statuses.map((s, i) => i === index ? { ...s, [field]: value } : s),
    }));
  };

  const addStatus = () => {
    setDraft(d => ({ ...d, statuses: [...d.statuses, { id: uuid(), name: '', color: '', wipLimit: 0 }] }));
  };

  const deleteStatus = (index: number) => {
    setDraft(d => {
      if (d.statuses.length <= 1) return d; // Prevent deleting last status
      const next = structuredClone(d);
      const removedId = next.statuses[index].id;
      next.statuses.splice(index, 1);
      const fallbackId = next.statuses[0]?.id ?? '';
      next.cards = next.cards.map(c => c.statusId === removedId ? { ...c, statusId: fallbackId } : c);
      return next;
    });
  };

  /* ---- Groups / Sub-Groups ---- */
  const updateGroupItem = (key: 'groups' | 'subGroups', index: number, field: string, value: string) => {
    setDraft(d => ({
      ...d,
      [key]: d[key].map((g, i) => i === index ? { ...g, [field]: value } : g),
    }));
  };

  const addGroupItem = (key: 'groups' | 'subGroups') => {
    setDraft(d => ({ ...d, [key]: [...d[key], { id: uuid(), name: '', color: '' }] }));
  };

  const deleteGroupItem = (key: 'groups' | 'subGroups', index: number) => {
    setDraft(d => {
      const next = structuredClone(d);
      const removedId = next[key][index].id;
      next[key].splice(index, 1);
      const fallbackId = next[key][0]?.id ?? '';
      const cardField = key === 'groups' ? 'groupId' : 'subGroupId';
      next.cards = next.cards.map(c => c[cardField] === removedId ? { ...c, [cardField]: fallbackId } : c);
      return next;
    });
  };

  /* ---- Fields ---- */
  const updateField = (index: number, field: string, value: string | string[]) => {
    setDraft(d => {
      const fields = d.fields.map((f, i) => {
        if (i !== index) return f;
        const updated = { ...f, [field]: value };
        if (field === 'type' && value !== 'select') { delete updated.options; delete updated.optionColors; }
        return updated;
      });
      return { ...d, fields };
    });
  };

  const addField = () => {
    setDraft(d => ({ ...d, fields: [...d.fields, { id: uuid(), name: '', type: 'text' as FieldType }] }));
  };

  const deleteField = (index: number) => {
    setDraft(d => {
      const next = structuredClone(d);
      const removedId = next.fields[index].id;
      next.fields.splice(index, 1);
      next.cards = next.cards.map(c => { const cf = { ...c.customFields }; delete cf[removedId]; return { ...c, customFields: cf }; });
      return next;
    });
  };

  const updateOptionColor = (fieldIndex: number, optionValue: string, color: string) => {
    setDraft(d => {
      const next = structuredClone(d);
      if (!next.fields[fieldIndex].optionColors) next.fields[fieldIndex].optionColors = {};
      next.fields[fieldIndex].optionColors![optionValue] = color;
      return next;
    });
  };

  /* ---- Built-in field labels ---- */
  const updateFieldLabel = (fieldId: string, label: string) => {
    setDraft(d => ({
      ...d,
      meta: { ...d.meta, fieldLabels: { ...(d.meta.fieldLabels || {}), [fieldId]: label } },
    }));
  };

  /* ---- Layout ---- */
  const updateMeta = (field: string, value: string) => {
    setDraft(d => ({ ...d, meta: { ...d.meta, [field]: value } }));
  };

  /* ---- Render ---- */
  const renderStatuses = () => (
    <div className="schema-items">
      {draft.statuses.map((s, i) => (
        <div className="schema-item" key={s.id}>
          <PaletteColorPicker value={s.color} onChange={hex => updateStatus(i, 'color', hex)} />
          <LocalInput className="modal-input" style={{ flex: 1 }} value={s.name}
            onChange={v => updateStatus(i, 'name', v)} placeholder="Status name" />
          <input className="modal-input" style={{ width: 50 }} type="number" min={0}
            value={s.wipLimit} onChange={e => updateStatus(i, 'wipLimit', Number(e.target.value))} placeholder="WIP" title="WIP Limit" />
          <button className="schema-delete-btn" onClick={() => deleteStatus(i)}><DeleteIcon /></button>
        </div>
      ))}
      <button className="btn-primary btn-sm" onClick={addStatus}>Add Status</button>
    </div>
  );

  const renderGroupList = (key: 'groups' | 'subGroups', label: string) => (
    <div className="schema-items">
      {draft[key].map((g, i) => (
        <div className="schema-item" key={g.id}>
          <PaletteColorPicker value={g.color} onChange={hex => updateGroupItem(key, i, 'color', hex)} />
          <LocalInput className="modal-input" style={{ flex: 1 }} value={g.name}
            onChange={v => updateGroupItem(key, i, 'name', v)} placeholder={`${label} name`} />
          <button className="schema-delete-btn" onClick={() => deleteGroupItem(key, i)}><DeleteIcon /></button>
        </div>
      ))}
      <button className="btn-primary btn-sm" onClick={() => addGroupItem(key)}>Add {label}</button>
    </div>
  );

  const renderFields = () => (
    <div className="schema-items">
      {/* Built-in fields — renameable, not deletable */}
      <div className="schema-section-label">Built-in Fields</div>
      {BUILTIN_FIELDS.map(bf => (
        <div className="schema-item" key={bf.id}>
          <span className="schema-field-id">{bf.id}</span>
          <LocalInput className="modal-input" style={{ flex: 1 }}
            value={draft.meta.fieldLabels?.[bf.id] || bf.defaultName}
            onChange={v => updateFieldLabel(bf.id, v)}
            placeholder={bf.defaultName} />
        </div>
      ))}

      {/* Custom fields */}
      {draft.fields.length > 0 && <div className="schema-section-label" style={{ marginTop: 16 }}>Custom Fields</div>}
      {draft.fields.map((f, i) => (
        <div key={f.id} className="schema-field-block">
          <LocalInput className="modal-input" style={{ width: '100%', marginBottom: 6 }} value={f.name}
            onChange={v => updateField(i, 'name', v)} placeholder="Field name" />
          <div className="schema-item">
            <select className="modal-input form-select" style={{ flex: 1 }} value={f.type}
              onChange={e => updateField(i, 'type', e.target.value)}>
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button className="schema-delete-btn" onClick={() => deleteField(i)}><DeleteIcon /></button>
          </div>
          {(f.type === 'select' || f.type === 'multiselect') && (
            <div className="schema-select-options">
              {(f.options ?? []).map((opt, oi) => (
                <div key={oi} className="schema-option-row">
                  <PaletteColorPicker value={f.optionColors?.[opt] || ''}
                    onChange={hex => updateOptionColor(i, opt, hex)} />
                  <LocalInput className="modal-input" style={{ flex: 1 }} value={opt}
                    onChange={v => {
                      setDraft(d => {
                        const fields = d.fields.map((field, fi) => {
                          if (fi !== i) return field;
                          const newOpts = [...(field.options ?? [])];
                          const oldVal = newOpts[oi];
                          newOpts[oi] = v;
                          const newColors = field.optionColors ? { ...field.optionColors } : undefined;
                          if (newColors?.[oldVal]) {
                            newColors[v] = newColors[oldVal];
                            delete newColors[oldVal];
                          }
                          return { ...field, options: newOpts, ...(newColors ? { optionColors: newColors } : {}) };
                        });
                        return { ...d, fields };
                      });
                    }}
                    placeholder="Option value" />
                  <button className="schema-delete-btn" onClick={() => {
                    updateField(i, 'options', (f.options ?? []).filter((_, j) => j !== oi));
                  }}><DeleteIcon /></button>
                </div>
              ))}
              <button className="btn-sm btn-secondary" onClick={() => {
                updateField(i, 'options', [...(f.options ?? []), '']);
              }}>+ Option</button>
            </div>
          )}
        </div>
      ))}
      <button className="btn-primary btn-sm" onClick={addField}>Add Custom Field</button>
    </div>
  );

  const groupByOptions = (
    <>
      <option value="status">Status</option>
      <option value="group">Group</option>
    </>
  );
  const subGroupByOptions = (
    <>
      <option value="">None</option>
      <option value="group">Group</option>
      <option value="subGroup">Sub-Group</option>
      <option value="status">Status</option>
    </>
  );

  const renderLayoutSection = (label: string, groupByKey: string, subGroupByKey: string) => (
    <>
      <div className="schema-section-label">{label}</div>
      <div className="schema-item">
        <label className="modal-label" style={{ flex: 1 }}>Columns</label>
        <select className="modal-input form-select" value={(draft.meta as unknown as Record<string, string>)[groupByKey] || 'status'}
          onChange={e => updateMeta(groupByKey, e.target.value)}>
          {groupByOptions}
        </select>
      </div>
      <div className="schema-item">
        <label className="modal-label" style={{ flex: 1 }}>Swim Lanes</label>
        <select className="modal-input form-select" value={(draft.meta as unknown as Record<string, string>)[subGroupByKey] || ''}
          onChange={e => updateMeta(subGroupByKey, e.target.value)}>
          {subGroupByOptions}
        </select>
      </div>
    </>
  );

  const renderLayout = () => (
    <div className="schema-items">
      {renderLayoutSection('Board View', 'boardGroupBy', 'boardSubGroupBy')}
      {renderLayoutSection('List View', 'listGroupBy', 'listSubGroupBy')}
      {renderLayoutSection('Table View', 'tableGroupBy', 'tableSubGroupBy')}
    </div>
  );

  const renderTabContent = () => {
    switch (tab) {
      case 'statuses': return renderStatuses();
      case 'groups': return renderGroupList('groups', 'Group');
      case 'subGroups': return renderGroupList('subGroups', 'Sub-Group');
      case 'fields': return renderFields();
      case 'layout': return renderLayout();
    }
  };

  return (
    <Modal title="Board Settings" onClose={onClose} footer={
      <><button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave}>Save</button></>
    }>
      <div className="schema-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`schema-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      {renderTabContent()}
    </Modal>
  );
}
