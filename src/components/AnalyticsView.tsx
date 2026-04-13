import { memo } from 'react';
import type { KanbanBoard, KanbanCard } from '../types/kanban';
import { getColorHex, hexToRgba } from '../lib/colors';
import { formatDueDate } from '../lib/dates';

interface Props {
  board: KanbanBoard;
  onCardClick?: (card: KanbanCard) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6', '': '#a1a1aa',
};
const PRIORITY_WEIGHT: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, '': 0 };
const PRIORITY_LABELS: Record<string, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', '': 'None' };

export const AnalyticsView = memo(function AnalyticsView({ board, onCardClick }: Props) {
  const cards = board.cards;
  const total = cards.length;
  if (total === 0) {
    return (
      <div className="analytics-view">
        <div className="analytics-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <p>Add some cards to see analytics</p>
        </div>
      </div>
    );
  }

  // --- Computations ---
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(today.getTime() + 7 * 86400000);
  const monthEnd = new Date(today.getTime() + 30 * 86400000);

  // Status counts
  const statusCounts = board.statuses.map(s => {
    const count = cards.filter(c => c.statusId === s.id).length;
    const color = getColorHex(s.color) || '#a1a1aa';
    return { ...s, count, hex: color };
  });
  const lastStatus = board.statuses[board.statuses.length - 1];
  const completedCount = lastStatus ? cards.filter(c => c.statusId === lastStatus.id).length : 0;
  const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  // Due dates
  let overdueCount = 0, dueTodayCount = 0, dueWeekCount = 0, dueMonthCount = 0, dueLaterCount = 0, noDateCount = 0;
  const overdueCards: KanbanCard[] = [];
  for (const card of cards) {
    if (!card.dueDate) { noDateCount++; continue; }
    const d = new Date(card.dueDate + 'T00:00:00');
    if (isNaN(d.getTime())) { noDateCount++; continue; }
    const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (dDay < today) { overdueCount++; overdueCards.push(card); }
    else if (dDay.getTime() === today.getTime()) dueTodayCount++;
    else if (dDay < weekEnd) dueWeekCount++;
    else if (dDay < monthEnd) dueMonthCount++;
    else dueLaterCount++;
  }

  // Checklists
  let checkDone = 0, checkTotal = 0;
  for (const c of cards) { checkTotal += c.checklist.length; checkDone += c.checklist.filter(i => i.done).length; }
  const checkPct = checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0;

  // Priority
  const priCounts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, '': 0 };
  let priSum = 0;
  for (const c of cards) { priCounts[c.priority || '']++; priSum += PRIORITY_WEIGHT[c.priority || '']; }
  const avgPri = total > 0 ? (priSum / total).toFixed(1) : '0';

  // Comments
  const totalComments = cards.reduce((s, c) => s + c.comments.length, 0);

  // Labels
  const labelMap = new Map<string, number>();
  for (const c of cards) { if (c.label) labelMap.set(c.label, (labelMap.get(c.label) || 0) + 1); }
  const labelEntries = [...labelMap.entries()].sort((a, b) => b[1] - a[1]);

  // Group performance
  const groupStats = board.groups.map(g => {
    const gc = cards.filter(c => c.groupId === g.id);
    let gCheckDone = 0, gCheckTotal = 0;
    for (const c of gc) { gCheckTotal += c.checklist.length; gCheckDone += c.checklist.filter(i => i.done).length; }
    return { ...g, count: gc.length, checkPct: gCheckTotal > 0 ? Math.round((gCheckDone / gCheckTotal) * 100) : -1, hex: getColorHex(g.color) || '#a1a1aa' };
  });
  const ungroupedCount = cards.filter(c => !c.groupId).length;

  // Sub-group breakdown
  const subGroupStats = board.subGroups.map(sg => {
    const sgc = cards.filter(c => c.subGroupId === sg.id);
    const done = lastStatus ? sgc.filter(c => c.statusId === lastStatus.id).length : 0;
    return { ...sg, count: sgc.length, doneCount: done, hex: getColorHex(sg.color) || '#a1a1aa' };
  });

  // Priority × Status matrix
  const priorities = ['critical', 'high', 'medium', 'low', ''] as const;
  const matrix = priorities.map(p => ({
    priority: p,
    cells: board.statuses.map(s => ({
      statusId: s.id,
      count: cards.filter(c => (c.priority || '') === p && c.statusId === s.id).length,
    })),
  }));
  const maxMatrixCell = Math.max(...matrix.flatMap(r => r.cells.map(c => c.count)), 1);

  // At-risk cards
  const atRisk = cards.filter(c => {
    const isOverdue = overdueCards.includes(c);
    const isHighPri = c.priority === 'critical' || c.priority === 'high';
    const isDone = lastStatus && c.statusId === lastStatus.id;
    return !isDone && (isOverdue || isHighPri);
  }).sort((a, b) => {
    const aOverdue = overdueCards.includes(a) ? 1 : 0;
    const bOverdue = overdueCards.includes(b) ? 1 : 0;
    if (aOverdue !== bOverdue) return bOverdue - aOverdue;
    return (PRIORITY_WEIGHT[b.priority || ''] || 0) - (PRIORITY_WEIGHT[a.priority || ''] || 0);
  });

  // Checklist insights
  const readyToMove = cards.filter(c => {
    if (c.checklist.length === 0) return false;
    const allDone = c.checklist.every(i => i.done);
    return allDone && (!lastStatus || c.statusId !== lastStatus.id);
  });

  // Custom field analytics
  const selectFields = board.fields.filter(f => f.type === 'select' || f.type === 'multiselect');

  // --- Render ---
  return (
    <div className="analytics-view">
      <div className="analytics-dashboard">

        {/* Row 1: Summary Cards */}
        <div className="analytics-summary-row">
          <div className="stats-card">
            <span className="stats-card-label">Total Cards</span>
            <span className="stats-card-value">{total}</span>
            <div className="mini-status-bar">
              {statusCounts.map(s => (
                <div key={s.id} className="mini-status-segment" title={`${s.name}: ${s.count}`}
                  style={{ flex: s.count || 0.1, background: s.hex }} />
              ))}
            </div>
          </div>
          <div className="stats-card">
            <span className="stats-card-label">Completion</span>
            <span className="stats-card-value" style={{ color: 'var(--kb-accent)' }}>{completionRate}%</span>
            <span className="stats-card-sub">{completedCount} of {total} cards</span>
          </div>
          <div className="stats-card">
            <span className="stats-card-label">Overdue</span>
            <span className="stats-card-value" style={overdueCount > 0 ? { color: '#ef4444' } : undefined}>{overdueCount}</span>
            {overdueCount > 0 && <span className="stats-card-sub" style={{ color: '#ef4444' }}>{Math.round((overdueCount / total) * 100)}% of cards</span>}
          </div>
          <div className="stats-card">
            <span className="stats-card-label">Tasks Done</span>
            <span className="stats-card-value">{checkTotal > 0 ? `${checkPct}%` : '-'}</span>
            {checkTotal > 0 && (
              <div className="mini-progress"><div className="mini-progress-fill" style={{ width: `${checkPct}%` }} /></div>
            )}
          </div>
          <div className="stats-card">
            <span className="stats-card-label">Avg Priority</span>
            <span className="stats-card-value">{avgPri}</span>
            <span className="stats-card-sub">{parseFloat(avgPri) >= 3 ? 'High urgency' : parseFloat(avgPri) >= 2 ? 'Moderate' : 'Low urgency'}</span>
          </div>
          <div className="stats-card">
            <span className="stats-card-label">Activity</span>
            <span className="stats-card-value">{totalComments}</span>
            <span className="stats-card-sub">comments</span>
          </div>
        </div>

        {/* Row 2: Status Flow */}
        <div className="analytics-panel analytics-full">
          <h3 className="analytics-panel-title">Status Flow</h3>
          <div className="status-flow-bar">
            {statusCounts.map(s => (
              <div key={s.id} className="status-flow-segment" title={`${s.name}: ${s.count} (${total > 0 ? Math.round((s.count / total) * 100) : 0}%)`}
                style={{ flex: Math.max(s.count, 0.3), background: s.hex }}>
                {s.count > 0 && <span className="status-flow-label">{s.name} {s.count}</span>}
                {s.wipLimit > 0 && s.count > s.wipLimit && <span className="status-flow-wip">WIP!</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Group Performance + Priority Matrix */}
        {board.groups.length > 0 && (
          <div className="analytics-panel">
            <h3 className="analytics-panel-title">Group Performance</h3>
            <div className="analytics-bars">
              {groupStats.map(g => (
                <div key={g.id} className="analytics-bar-row">
                  <span className="analytics-bar-label">
                    <span className="analytics-dot" style={{ background: g.hex }} />{g.name}
                  </span>
                  <div className="analytics-bar-track">
                    <div className="analytics-bar-fill" style={{ width: `${total > 0 ? (g.count / total) * 100 : 0}%`, background: g.hex }} />
                  </div>
                  <span className="analytics-bar-value">{g.count}{g.checkPct >= 0 ? ` · ${g.checkPct}%` : ''}</span>
                </div>
              ))}
              {ungroupedCount > 0 && (
                <div className="analytics-bar-row">
                  <span className="analytics-bar-label" style={{ opacity: 0.5 }}>Ungrouped</span>
                  <div className="analytics-bar-track">
                    <div className="analytics-bar-fill" style={{ width: `${(ungroupedCount / total) * 100}%` }} />
                  </div>
                  <span className="analytics-bar-value">{ungroupedCount}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="analytics-panel">
          <h3 className="analytics-panel-title">Priority × Status</h3>
          <div className="priority-matrix">
            <div className="priority-matrix-header">
              <div className="priority-matrix-corner" />
              {board.statuses.map(s => <div key={s.id} className="priority-matrix-col-label">{s.name}</div>)}
            </div>
            {matrix.map(row => (
              <div key={row.priority} className="priority-matrix-row">
                <div className="priority-matrix-row-label" style={{ color: PRIORITY_COLORS[row.priority] }}>
                  {PRIORITY_LABELS[row.priority]}
                </div>
                {row.cells.map(cell => (
                  <div key={cell.statusId} className="priority-matrix-cell"
                    style={{ background: cell.count > 0 ? hexToRgba(PRIORITY_COLORS[row.priority], 0.1 + (cell.count / maxMatrixCell) * 0.4) : undefined }}>
                    {cell.count > 0 ? cell.count : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Row 4: Due Dates + Sub-Groups */}
        <div className="analytics-panel">
          <h3 className="analytics-panel-title">Due Date Timeline</h3>
          <div className="analytics-bars">
            {[
              { label: 'Overdue', count: overdueCount, color: '#ef4444' },
              { label: 'Today', count: dueTodayCount, color: '#eab308' },
              { label: 'This Week', count: dueWeekCount, color: '#f97316' },
              { label: 'This Month', count: dueMonthCount, color: '#3b82f6' },
              { label: 'Later', count: dueLaterCount, color: '#60a5fa' },
              { label: 'No Date', count: noDateCount, color: '#a1a1aa' },
            ].map(item => (
              <div key={item.label} className="analytics-bar-row">
                <span className="analytics-bar-label">{item.label}</span>
                <div className="analytics-bar-track">
                  <div className="analytics-bar-fill" style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%`, background: item.color }} />
                </div>
                <span className="analytics-bar-value">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {board.subGroups.length > 0 && (
          <div className="analytics-panel">
            <h3 className="analytics-panel-title">Sub-Group Breakdown</h3>
            <div className="analytics-bars">
              {subGroupStats.map(sg => (
                <div key={sg.id} className="analytics-bar-row">
                  <span className="analytics-bar-label">
                    <span className="analytics-dot" style={{ background: sg.hex }} />{sg.name}
                  </span>
                  <div className="analytics-bar-track">
                    <div className="analytics-bar-fill" style={{ width: `${total > 0 ? (sg.count / total) * 100 : 0}%`, background: sg.hex }} />
                  </div>
                  <span className="analytics-bar-value">{sg.count} · {sg.doneCount} done</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row 5: Checklist Insights + Custom Fields */}
        <div className="analytics-panel">
          <h3 className="analytics-panel-title">Checklist Insights</h3>
          {readyToMove.length > 0 && (
            <div className="analytics-insight-block">
              <span className="analytics-insight-label" style={{ color: 'var(--kb-success)' }}>Ready to advance</span>
              {readyToMove.slice(0, 5).map(c => {
                const s = board.statuses.find(st => st.id === c.statusId);
                return (
                  <div key={c.id} className="analytics-list-item" onClick={() => onCardClick?.(c)} style={{ cursor: onCardClick ? 'pointer' : undefined }}>
                    <span className="analytics-list-title">{c.title}</span>
                    <span className="analytics-list-lane">{s?.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--kb-success)' }}>✓ {c.checklist.length}/{c.checklist.length}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="analytics-bars" style={{ marginTop: readyToMove.length > 0 ? 12 : 0 }}>
            <span className="analytics-insight-label">Completion by Status</span>
            {board.statuses.map(s => {
              const sc = cards.filter(c => c.statusId === s.id);
              let sDone = 0, sTotal = 0;
              for (const c of sc) { sTotal += c.checklist.length; sDone += c.checklist.filter(i => i.done).length; }
              const pct = sTotal > 0 ? Math.round((sDone / sTotal) * 100) : -1;
              const color = getColorHex(s.color) || '#a1a1aa';
              return pct >= 0 ? (
                <div key={s.id} className="analytics-bar-row">
                  <span className="analytics-bar-label">{s.name}</span>
                  <div className="analytics-bar-track">
                    <div className="analytics-bar-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="analytics-bar-value">{pct}%</span>
                </div>
              ) : null;
            })}
          </div>
        </div>

        {selectFields.length > 0 && (
          <div className="analytics-panel">
            <h3 className="analytics-panel-title">Custom Field Analytics</h3>
            {selectFields.map(field => {
              const dist = new Map<string, number>();
              for (const c of cards) {
                const val = c.customFields[field.id];
                if (val) {
                  if (field.type === 'multiselect') {
                    val.split(',').forEach(v => dist.set(v.trim(), (dist.get(v.trim()) || 0) + 1));
                  } else {
                    dist.set(val, (dist.get(val) || 0) + 1);
                  }
                }
              }
              const entries = [...dist.entries()].sort((a, b) => b[1] - a[1]);
              if (entries.length === 0) return null;
              return (
                <div key={field.id} style={{ marginBottom: 16 }}>
                  <span className="analytics-insight-label">{field.name}</span>
                  <div className="analytics-bars">
                    {entries.map(([val, count]) => {
                      const optColor = field.optionColors?.[val];
                      return (
                        <div key={val} className="analytics-bar-row">
                          <span className="analytics-bar-label">
                            {optColor && <span className="analytics-dot" style={{ background: optColor }} />}
                            {val}
                          </span>
                          <div className="analytics-bar-track">
                            <div className="analytics-bar-fill" style={{ width: `${(count / total) * 100}%`, background: optColor || undefined }} />
                          </div>
                          <span className="analytics-bar-value">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Row 6: At Risk + Labels */}
        {atRisk.length > 0 && (
          <div className="analytics-panel analytics-full analytics-danger">
            <h3 className="analytics-panel-title">At Risk ({atRisk.length})</h3>
            <div className="analytics-list">
              {atRisk.slice(0, 8).map(card => {
                const dateInfo = card.dueDate ? formatDueDate(card.dueDate) : null;
                const status = board.statuses.find(s => s.id === card.statusId);
                return (
                  <div key={card.id} className="analytics-list-item at-risk-card"
                    onClick={() => onCardClick?.(card)} style={{ cursor: onCardClick ? 'pointer' : undefined }}>
                    <span className="analytics-list-title">{card.title}</span>
                    {status && <span className="analytics-list-lane">{status.name}</span>}
                    {card.priority && <span className={`card-priority priority-${card.priority}`}>{card.priority}</span>}
                    {dateInfo && <span className={`card-date-badge date-${dateInfo.status}`}>{dateInfo.text}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {labelEntries.length > 0 && (
          <div className="analytics-panel analytics-full">
            <h3 className="analytics-panel-title">Labels</h3>
            <div className="analytics-bars">
              {labelEntries.slice(0, 10).map(([label, count]) => (
                <div key={label} className="analytics-bar-row">
                  <span className="analytics-bar-label">{label}</span>
                  <div className="analytics-bar-track">
                    <div className="analytics-bar-fill" style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                  <span className="analytics-bar-value">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
