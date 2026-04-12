import { useState, useRef, useEffect } from 'react';
import { formatDueDate } from '../lib/dates';
import { LABEL_COLORS, getColorHex } from '../lib/colors';
import { Linkify } from './shared/Linkify';
import type { KanbanCard, KanbanBoard, Priority, ChecklistItem } from '../types/kanban';

interface Props {
  card: KanbanCard;
  board: KanbanBoard;
  onSave: (card: KanbanCard) => void;
  onDelete: (cardId: string) => void;
  onClose: () => void;
}

export function CardModal({ card, board, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [label, setLabel] = useState(card.label);
  const [labelColor, setLabelColor] = useState(card.labelColor);
  const [dueDate, setDueDate] = useState(card.dueDate);
  const [comments, setComments] = useState<string[]>([...card.comments]);
  const [priority, setPriority] = useState<Priority>(card.priority || '');
  const [statusId, setStatusId] = useState(card.statusId || '');
  const [groupId, setGroupId] = useState(card.groupId || '');
  const [subGroupId, setSubGroupId] = useState(card.subGroupId || '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([...(card.checklist || [])]);
  const [customFields, setCustomFields] = useState<Record<string, string>>({ ...card.customFields });
  const [newCheckItem, setNewCheckItem] = useState('');
  const [newComment, setNewComment] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const handleSaveRef = useRef<() => void>(() => {});

  const handleSave = () => {
    onSave({
      ...card,
      title: title.trim() || 'Untitled',
      description,
      label,
      labelColor,
      dueDate,
      comments,
      priority,
      statusId,
      groupId,
      subGroupId,
      checklist,
      customFields,
    });
    onClose();
  };

  handleSaveRef.current = handleSave;

  useEffect(() => {
    titleRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSaveRef.current();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const addComment = () => {
    const trimmed = newComment.trim();
    if (trimmed) {
      setComments([...comments, trimmed]);
      setNewComment('');
    }
  };

  const deleteComment = (index: number) => {
    setComments(comments.filter((_, i) => i !== index));
  };

  const dateInfo = formatDueDate(dueDate);

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) handleSave();
      }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <input
            ref={titleRef}
            className="modal-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Card title..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
          />
          <button className="modal-close-btn" onClick={handleSave} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <label className="modal-label">Description</label>
            <textarea
              className="modal-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
            />
          </div>

          <div className="modal-section">
            <label className="modal-label">Label</label>
            <input
              className="modal-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Priority, Bug, Feature..."
            />
          </div>

          <div className="modal-section">
            <label className="modal-label">Color</label>
            <div className="color-picker">
              <div className="color-preview" style={{ background: getColorHex(labelColor) || '#888' }} title={labelColor || 'No color'} />
              <button
                className={`color-swatch no-color ${!labelColor ? 'selected' : ''}`}
                onClick={() => setLabelColor('')}
                title="No color"
              />
              {LABEL_COLORS.map((c) => (
                <button
                  key={c.name}
                  className={`color-swatch ${labelColor.toLowerCase() === c.name.toLowerCase() ? 'selected' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => setLabelColor(c.name)}
                  title={c.name}
                />
              ))}
              <label
                className={`color-swatch custom-color ${labelColor.startsWith('#') ? 'selected' : ''}`}
                style={{ backgroundColor: labelColor.startsWith('#') ? labelColor : undefined }}
                title="Custom color"
              >
                <input
                  type="color"
                  className="hidden-color-input"
                  value={getColorHex(labelColor) || '#6366f1'}
                  onChange={(e) => setLabelColor(e.target.value)}
                />
                {!labelColor.startsWith('#') && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
              </label>
            </div>
          </div>

          {board.statuses.length > 0 && (
            <div className="modal-section">
              <label className="modal-label">Status</label>
              <select className="modal-input form-select" value={statusId} onChange={e => setStatusId(e.target.value)}>
                <option value="">None</option>
                {board.statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {board.groups.length > 0 && (
            <div className="modal-section">
              <label className="modal-label">Group</label>
              <select className="modal-input form-select" value={groupId} onChange={e => setGroupId(e.target.value)}>
                <option value="">None</option>
                {board.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}

          {board.subGroups.length > 0 && (
            <div className="modal-section">
              <label className="modal-label">Sub-Group</label>
              <select className="modal-input form-select" value={subGroupId} onChange={e => setSubGroupId(e.target.value)}>
                <option value="">None</option>
                {board.subGroups.map(sg => <option key={sg.id} value={sg.id}>{sg.name}</option>)}
              </select>
            </div>
          )}

          <div className="modal-section">
            <label className="modal-label">Priority</label>
            <div className="priority-picker">
              {(['', 'low', 'medium', 'high', 'critical'] as Priority[]).map(p => (
                <button
                  key={p || 'none'}
                  className={`priority-badge priority-${p || 'none'} ${priority === p ? 'selected' : ''}`}
                  onClick={() => setPriority(p)}
                >
                  {p ? p.charAt(0).toUpperCase() + p.slice(1) : 'None'}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-section">
            <label className="modal-label">
              Checklist
              {checklist.length > 0 && (
                <span className="comment-badge">
                  {checklist.filter(i => i.done).length}/{checklist.length}
                </span>
              )}
            </label>
            {checklist.length > 0 && (
              <div className="checklist-progress-bar">
                <div
                  className="checklist-progress-fill"
                  style={{ width: `${checklist.length > 0 ? (checklist.filter(i => i.done).length / checklist.length) * 100 : 0}%` }}
                />
              </div>
            )}
            <div className="checklist-items">
              {checklist.map((item, i) => (
                <div key={i} className="checklist-item">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => {
                      const updated = [...checklist];
                      updated[i] = { ...updated[i], done: !updated[i].done };
                      setChecklist(updated);
                    }}
                    className="checklist-checkbox"
                  />
                  <span className={`checklist-text ${item.done ? 'done' : ''}`}>{item.text}</span>
                  <button
                    className="comment-delete-btn"
                    onClick={() => setChecklist(checklist.filter((_, j) => j !== i))}
                    aria-label="Remove item"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="add-comment-row">
              <input
                className="modal-input comment-input"
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                placeholder="Add a task..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = newCheckItem.trim();
                    if (trimmed) {
                      setChecklist([...checklist, { text: trimmed, done: false }]);
                      setNewCheckItem('');
                    }
                  }
                }}
              />
              <button
                className="add-comment-btn"
                onClick={() => {
                  const trimmed = newCheckItem.trim();
                  if (trimmed) {
                    setChecklist([...checklist, { text: trimmed, done: false }]);
                    setNewCheckItem('');
                  }
                }}
                disabled={!newCheckItem.trim()}
              >
                Add
              </button>
            </div>
          </div>

          <div className="modal-section">
            <label className="modal-label">
              Due Date
              {dateInfo && (
                <span className={`date-badge-inline date-${dateInfo.status}`}>
                  {dateInfo.text}
                </span>
              )}
            </label>
            <div className="due-date-row">
              <input
                type="date"
                className="modal-input date-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              {dueDate && (
                <button
                  className="clear-date-btn"
                  onClick={() => setDueDate('')}
                  title="Clear date"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {board.fields.length > 0 && board.fields.map(field => (
            <div key={field.id} className="modal-section">
              <label className="modal-label">{field.name}</label>
              {field.type === 'select' ? (
                <select className="modal-input form-select" value={customFields[field.id] || ''}
                  onChange={e => setCustomFields({ ...customFields, [field.id]: e.target.value })}>
                  <option value="">None</option>
                  {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className="modal-input" type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  value={customFields[field.id] || ''}
                  onChange={e => setCustomFields({ ...customFields, [field.id]: e.target.value })}
                  placeholder={`Enter ${field.name.toLowerCase()}...`} />
              )}
            </div>
          ))}

          <div className="modal-section">
            <label className="modal-label">
              Comments
              {comments.length > 0 && (
                <span className="comment-badge">{comments.length}</span>
              )}
            </label>
            <div className="comments-list">
              {comments.length === 0 && (
                <p className="no-comments">No comments yet</p>
              )}
              {comments.map((comment, i) => (
                <div key={i} className="comment-item">
                  <span className="comment-text"><Linkify>{comment}</Linkify></span>
                  <button
                    className="comment-delete-btn"
                    onClick={() => deleteComment(i)}
                    aria-label="Delete comment"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="add-comment-row">
              <input
                className="modal-input comment-input"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addComment();
                  }
                }}
              />
              <button
                className="add-comment-btn"
                onClick={addComment}
                disabled={!newComment.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {!confirmDelete ? (
            <button
              className="delete-card-btn"
              onClick={() => setConfirmDelete(true)}
            >
              Delete Card
            </button>
          ) : (
            <div className="confirm-delete">
              <span>Are you sure?</span>
              <button
                className="confirm-yes"
                onClick={() => {
                  onDelete(card.id);
                  onClose();
                }}
              >
                Yes, Delete
              </button>
              <button
                className="confirm-no"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          )}
          <button className="save-btn" onClick={handleSave}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
