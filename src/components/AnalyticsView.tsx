import { memo } from 'react';
import type { KanbanBoard } from '../types/kanban';
import { getColorHex } from '../lib/colors';
import { formatDueDate } from '../lib/dates';

interface Props {
  board: KanbanBoard;
}

export const AnalyticsView = memo(function AnalyticsView({ board }: Props) {
  const allCards = board.groups.flatMap(g => g.cards);
  const totalCards = allCards.length;

  // Due date stats
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(today.getTime() + 7 * 86400000);

  let overdue = 0;
  let dueToday = 0;
  let dueThisWeek = 0;
  let upcoming = 0;
  let noDate = 0;

  for (const card of allCards) {
    if (!card.dueDate) { noDate++; continue; }
    const d = new Date(card.dueDate + 'T00:00:00');
    if (isNaN(d.getTime())) { noDate++; continue; }
    const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (dDay < today) overdue++;
    else if (dDay.getTime() === today.getTime()) dueToday++;
    else if (dDay < weekEnd) dueThisWeek++;
    else upcoming++;
  }

  // Priority stats
  const priorityCounts = { critical: 0, high: 0, medium: 0, low: 0, none: 0 };
  for (const card of allCards) {
    if (card.priority && card.priority in priorityCounts) {
      priorityCounts[card.priority as keyof typeof priorityCounts]++;
    } else {
      priorityCounts.none++;
    }
  }

  // Label stats
  const labelMap = new Map<string, number>();
  for (const card of allCards) {
    if (card.label) {
      labelMap.set(card.label, (labelMap.get(card.label) || 0) + 1);
    }
  }
  const labelEntries = [...labelMap.entries()].sort((a, b) => b[1] - a[1]);

  // Checklist stats
  let totalChecklistItems = 0;
  let completedChecklistItems = 0;
  for (const card of allCards) {
    if (card.checklist) {
      totalChecklistItems += card.checklist.length;
      completedChecklistItems += card.checklist.filter(i => i.done).length;
    }
  }

  // Max for lane bar chart
  const maxGroupCards = Math.max(...board.groups.map(g => g.cards.length), 1);

  const priorityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6',
    none: '#a1a1aa',
  };

  return (
    <div className="analytics-view">
      <div className="analytics-grid">
        {/* Summary Cards */}
        <div className="analytics-row">
          <div className="stats-card">
            <span className="stats-card-label">Total Cards</span>
            <span className="stats-card-value">{totalCards}</span>
          </div>
          <div className="stats-card">
            <span className="stats-card-label">Groups</span>
            <span className="stats-card-value">{board.groups.length}</span>
          </div>
          <div className="stats-card">
            <span className="stats-card-label">Overdue</span>
            <span className="stats-card-value" style={overdue > 0 ? { color: '#ef4444' } : undefined}>{overdue}</span>
          </div>
          <div className="stats-card">
            <span className="stats-card-label">Tasks Done</span>
            <span className="stats-card-value">
              {totalChecklistItems > 0 ? `${completedChecklistItems}/${totalChecklistItems}` : '-'}
            </span>
            {totalChecklistItems > 0 && (
              <span className="stats-card-sub">
                {Math.round((completedChecklistItems / totalChecklistItems) * 100)}%
              </span>
            )}
          </div>
        </div>

        {/* Lane Distribution */}
        <div className="analytics-section">
          <h3 className="analytics-section-title">Group Distribution</h3>
          <div className="analytics-bars">
            {board.groups.map(group => {
              const color = getColorHex(group.color) || '#a1a1aa';
              const pct = totalCards > 0 ? (group.cards.length / maxGroupCards) * 100 : 0;
              return (
                <div key={group.id} className="analytics-bar-row">
                  <span className="analytics-bar-label">{group.title}</span>
                  <div className="analytics-bar-track">
                    <div
                      className="analytics-bar-fill"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <span className="analytics-bar-value">{group.cards.length}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Due Date Overview */}
        <div className="analytics-section">
          <h3 className="analytics-section-title">Due Date Overview</h3>
          <div className="analytics-bars">
            {[
              { label: 'Overdue', count: overdue, color: '#ef4444' },
              { label: 'Today', count: dueToday, color: '#eab308' },
              { label: 'This Week', count: dueThisWeek, color: '#f97316' },
              { label: 'Upcoming', count: upcoming, color: '#3b82f6' },
              { label: 'No Date', count: noDate, color: '#a1a1aa' },
            ].map(item => {
              const pct = totalCards > 0 ? (item.count / totalCards) * 100 : 0;
              return (
                <div key={item.label} className="analytics-bar-row">
                  <span className="analytics-bar-label">{item.label}</span>
                  <div className="analytics-bar-track">
                    <div className="analytics-bar-fill" style={{ width: `${pct}%`, background: item.color }} />
                  </div>
                  <span className="analytics-bar-value">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="analytics-section">
          <h3 className="analytics-section-title">Priority Breakdown</h3>
          <div className="analytics-bars">
            {(['critical', 'high', 'medium', 'low', 'none'] as const).map(p => {
              const count = priorityCounts[p];
              const pct = totalCards > 0 ? (count / totalCards) * 100 : 0;
              return (
                <div key={p} className="analytics-bar-row">
                  <span className="analytics-bar-label">{p === 'none' ? 'No Priority' : p.charAt(0).toUpperCase() + p.slice(1)}</span>
                  <div className="analytics-bar-track">
                    <div className="analytics-bar-fill" style={{ width: `${pct}%`, background: priorityColors[p] }} />
                  </div>
                  <span className="analytics-bar-value">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Label Distribution */}
        {labelEntries.length > 0 && (
          <div className="analytics-section">
            <h3 className="analytics-section-title">Label Distribution</h3>
            <div className="analytics-bars">
              {labelEntries.slice(0, 10).map(([label, count]) => {
                const pct = totalCards > 0 ? (count / totalCards) * 100 : 0;
                return (
                  <div key={label} className="analytics-bar-row">
                    <span className="analytics-bar-label">{label}</span>
                    <div className="analytics-bar-track">
                      <div className="analytics-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="analytics-bar-value">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Cards */}
        <div className="analytics-section">
          <h3 className="analytics-section-title">Cards with Due Dates</h3>
          <div className="analytics-list">
            {allCards
              .filter(c => c.dueDate)
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .slice(0, 8)
              .map(card => {
                const dateInfo = formatDueDate(card.dueDate);
                const lane = board.groups.find(g => g.cards.some(c => c.id === card.id));
                return (
                  <div key={card.id} className="analytics-list-item">
                    <span className="analytics-list-title">{card.title}</span>
                    <span className="analytics-list-lane">{lane?.title}</span>
                    {dateInfo && (
                      <span className={`card-date-badge date-${dateInfo.status}`}>{dateInfo.text}</span>
                    )}
                  </div>
                );
              })}
            {allCards.filter(c => c.dueDate).length === 0 && (
              <div className="analytics-empty">No cards with due dates</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
