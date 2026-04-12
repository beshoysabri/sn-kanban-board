# Reference Files — Kanban Board Revamp

Source patterns from the Goal Tracker and Habit Tracker to adapt for the Kanban Board.

---

## Files to COPY VERBATIM (with prefix adaptation)

### 1. Linkify Component
**Source:** `sn-goal-tracker/src/components/shared/Linkify.tsx`
**Target:** `sn-kanban-board/src/components/shared/Linkify.tsx`
**Adapt:** Change CSS class `gt-link` → `kb-link`

### 2. Keyboard Shortcuts Help
**Source:** `sn-goal-tracker/src/components/shared/ShortcutsHelp.tsx`
**Target:** `sn-kanban-board/src/components/shared/ShortcutsHelp.tsx`
**Adapt:** Update shortcut list to kanban-specific shortcuts (N=new card, L=new lane, V=toggle view, etc.), change CSS prefix `gt-` → `kb-`

### 3. Color Palette
**Source:** `sn-goal-tracker/src/lib/colors.ts`
**Target:** `sn-kanban-board/src/lib/colors.ts`
**Adapt:** Rename exports: `GOAL_COLORS` → `LABEL_COLORS`, `DEFAULT_GOAL_COLOR` → `DEFAULT_LABEL_COLOR`

---

## Files to USE AS REFERENCE (adapt patterns, don't copy)

### 1. Header with SVG Icons & Editable Title
**Reference:** `sn-goal-tracker/src/components/Header.tsx`
**Pattern:** SVG view icons with labels, double-click title editing, search, responsive layout
**Adapt for:** `sn-kanban-board/src/components/BoardHeader.tsx` — Board/List view toggle with SVG icons, editable board title, `?` shortcuts button, export button

### 2. ColorPicker with Preview Square
**Reference:** `sn-goal-tracker/src/components/shared/ColorPicker.tsx`
**Pattern:** Color preview square (24px), 18 swatches (24px, 5px gap), case-insensitive matching, `+` custom button (no emoji), hidden native `<input type="color">`
**Adapt for:** Lane color picker and card label color picker

### 3. Sidebar Footer Buttons
**Reference:** `sn-habit-tracker/src/components/HabitSidebar.tsx`
**Pattern:** Footer section with `+ Add Item` / `+ Category` dashed-border buttons (14px font)
**Adapt for:** Board could use a sidebar or inline lane/card add buttons with same styling pattern

### 4. ExportMenu with SVG Icons
**Reference:** `sn-habit-tracker/src/components/shared/ExportMenu.tsx`
**Pattern:** Dropdown with SVG icons per format (CSV, Markdown, Excel, PDF), SVG download button trigger, click-outside dismiss
**Adapt for:** Kanban export (CSV, Markdown, JSON)

### 5. Toast Notification System
**Reference:** `sn-habit-tracker/src/components/HabitTracker.tsx`
**Pattern:** `const [toast, setToast] = useState<string | null>(null)` with `showToast()` callback, auto-dismiss 2000ms, CSS pill at bottom center
**Adapt for:** `KanbanBoard.tsx` — toast on card/lane CRUD operations

### 6. Modal Component
**Reference:** `sn-habit-tracker/src/components/shared/Modal.tsx`
**Pattern:** Overlay + content with header/body/footer slots, close button (SVG X), Escape key handler, click-outside dismiss, slideUp animation
**Adapt for:** Card detail modal — ensure it matches standardized modal styling

### 7. Focus Visible + Mobile Touch Targets
**Reference:** `sn-habit-tracker/src/styles.css`
**Pattern:** `:focus-visible` rules after reset, mobile `@media (max-width: 768px)` with 44px minimums for all interactive elements
**Adapt for:** All kanban interactive elements

### 8. Stats/Metric Cards
**Reference:** `sn-habit-tracker/src/components/shared/StatsCard.tsx`
**Pattern:** Small card with label (10px uppercase), value (22px bold), optional sub text (11px muted)
**Adapt for:** Board stats display (total cards, overdue cards, etc.)

---

## CSS Classes Pattern (`--kb-*` / `.kb-*` prefix)

All new CSS classes should use the `kb-` prefix:

```css
/* Focus visible */
:focus-visible { outline: 2px solid var(--kb-accent); outline-offset: 2px; }

/* Toast notification */
.kb-toast { position: fixed; bottom: 40px; left: 50%; ... }

/* Clickable links */
.kb-link { color: var(--kb-accent); text-decoration: none; word-break: break-all; }
.kb-link:hover { color: var(--kb-fg); text-decoration: underline; }

/* Drag handle */
.kb-drag-handle { cursor: grab; color: var(--kb-border); font-size: 14px; opacity: 0; }
.parent:hover .kb-drag-handle { opacity: 0.6; }

/* Color preview */
.color-preview { width: 24px; height: 24px; border-radius: 4px; border: 2px solid var(--kb-border); }
```

---

## Architecture Notes

### DO NOT MODIFY
- `sn-api.ts` — Standard Notes iframe bridge (identical pattern across all plugins)

### Data Flow
```
App.tsx → KanbanBoard.tsx → BoardHeader, Lanes, Cards, Modals
```

### Build & Deploy
- Vite with `base: './'`
- GitHub Actions: push to main/master → build → deploy to gh-pages via peaceiris/actions-gh-pages@v4
- `ext.json` manifest with versioned URL

### Key Constraints
- **No CSS variables inside SVG** — they don't resolve in SN iframe context. Hardcode hex values.
- **Listeners at module load** — SN API registers message listeners in constructor, not in useEffect, to catch early `component-registered` message.
- **300ms debounced saves** — batch changes before sending to SN.
- **Markdown serialization** — board data stored as human-readable markdown in SN note.

---

## New Dependencies

None required beyond existing. The kanban board doesn't need recharts since it doesn't have time-series data. The existing `@hello-pangea/dnd` handles drag-and-drop.

---

## Current State Summary (what exists now)

| Feature | Status | Action |
|---------|--------|--------|
| Board + List views | Done | Keep, polish styling |
| Drag-and-drop | Done | Keep (uses @hello-pangea/dnd) |
| Card modal (title, desc, label, color, due date, comments) | Done | Restyle to match design system |
| Lane context menu | Done | Replace emoji with SVG |
| Notion-style card tinting | Done | Keep, update to use new palette |
| Due date badges | Done | Keep |
| SN theme integration | Done | Verify fallback values match |
| Color palette | 8 Tailwind colors | Upgrade to 18 muted |
| Focus visible | Missing | Add |
| Touch targets | Partial (32-34px) | Upgrade to 44px |
| Toast notifications | Missing | Add |
| Linkify | Missing | Add |
| Shortcuts help | Missing | Add |
| Export | Missing | Add (CSV, Markdown, JSON) |
| Editable board title | Partial (inline) | Add double-click pattern |
| SVG icons | Partial (some emoji) | Replace all emoji |
