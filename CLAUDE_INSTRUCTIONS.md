# SN Kanban Editor — Revamp Instructions

This document describes ALL changes needed to bring the Kanban Editor in line with the standardized SN plugin design system used by the Goal Tracker and Habit Tracker. Follow each section precisely.

---

## 1. RENAME: "Super Kanban Editor" → "Kanban Board"

**Files to update:**
- `package.json`: name `sn-super-kanban-editor` → `sn-kanban-board`, homepage URL, repository URL
- `public/ext.json`: identifier → `com.beshoysabri.sn-kanban-board`, name → `Kanban Board`, all URLs from `sn-super-kanban-editor` → `sn-kanban-board`
- `public/ext.dev.json`: identifier → `com.beshoysabri.sn-kanban-board.dev`, name → `Kanban Board (Dev)`
- `README.md`: All references to "Super Kanban Editor" → "Kanban Board", all URLs
- `index.html`: `<title>` → `Kanban Board - Standard Notes`
- `BoardHeader.tsx`: Any display of "Super Kanban" → "Kanban Board"

**User action required:** Rename GitHub repo from `sn-super-kanban-editor` to `sn-kanban-board` in GitHub Settings. Update git remote: `git remote set-url origin https://github.com/beshoysabri/sn-kanban-board.git`

---

## 2. COLOR PALETTE UPGRADE (8 → 18 muted colors)

Replace the current 8-color Tailwind-style palette with the standardized 18-color muted palette.

**File: `src/lib/colors.ts`**

Replace the existing color array with:
```typescript
export const LABEL_COLORS = [
  // Yellows
  { name: 'Lemon', hex: '#FFF689' },
  { name: 'Mustard', hex: '#F4D35E' },
  // Oranges
  { name: 'Peach', hex: '#FFB88A' },
  { name: 'Tangerine', hex: '#FF9C5B' },
  { name: 'Flame', hex: '#F67B45' },
  // Pinks/Reds
  { name: 'Blush', hex: '#FBC2C2' },
  { name: 'Rose', hex: '#E39B99' },
  { name: 'Berry', hex: '#CB7876' },
  // Greens
  { name: 'Sage', hex: '#B4CFA4' },
  { name: 'Fern', hex: '#8BA47C' },
  { name: 'Forest', hex: '#62866C' },
  // Blues
  { name: 'Sky', hex: '#A0C5E3' },
  { name: 'Steel', hex: '#81B2D9' },
  { name: 'Ocean', hex: '#32769B' },
  // Purples
  { name: 'Lavender', hex: '#BBA6DD' },
  { name: 'Mauve', hex: '#8C7DA8' },
  { name: 'Plum', hex: '#64557B' },
  // Dark
  { name: 'Midnight', hex: '#1E2136' },
] as const;

export const DEFAULT_LABEL_COLOR = '#32769B';
```

- Update all imports that reference the old color names/array
- Update ColorPicker component to match: 24px swatches, 5px gap, color preview square, `+` custom color button (no emoji)
- Case-insensitive hex matching: `.toLowerCase()` comparisons

---

## 3. CSS VARIABLE PREFIX: `--kb-*`

Keep the `--kb-*` prefix but ensure fallback values match the design system:

```css
--kb-bg: var(--sn-stylekit-background-color, #1a1a1f);
--kb-fg: var(--sn-stylekit-foreground-color, #e4e4e7);
--kb-lane-bg: var(--sn-stylekit-contrast-background-color, #1a1a1f);
--kb-card-bg: var(--sn-stylekit-background-color, #1a1a1f);
--kb-card-hover: var(--sn-stylekit-secondary-background-color, #27272a);
--kb-border: var(--sn-stylekit-border-color, #27272a);
--kb-accent: var(--sn-stylekit-info-color, #6366f1);
--kb-danger: var(--sn-stylekit-danger-color, #ef4444);
--kb-success: var(--sn-stylekit-success-color, #22c55e);
--kb-warning: var(--sn-stylekit-warning-color, #eab308);
--kb-muted: var(--sn-stylekit-secondary-foreground-color, #a1a1aa);
```

**Design tokens to standardize:**
```css
--kb-radius: 10px;
--kb-radius-sm: 8px;
--kb-radius-xs: 6px;
--kb-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
--kb-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
--kb-shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.2);
--kb-transition: 150ms ease;
```

---

## 4. HEADER — Standardized Layout

**File: `src/components/BoardHeader.tsx`**

The header must match the standardized layout used across all SN plugins.

**Structure:**
```
.kb-header
  ├─ .kb-header-left
  │   ├─ .kb-title-display (double-click to edit) OR .kb-title-edit (editing mode)
  │   │   ├─ .kb-title-text (16px, 700 weight — shows board title)
  │   │   └─ .kb-subtitle-text (12px, muted — shows description)
  │   └─ Board stats (inline, small text)
  ├─ .kb-view-toggle (SVG icons + text labels for Board/List)
  └─ .kb-header-right
      ├─ + Add Card button
      ├─ ExportMenu (SVG download icon)
      └─ ? Shortcuts button
```

**Title editing:** Double-click triggers edit mode with two inline inputs (title + subtitle). Enter saves, Escape cancels. On mobile (≤768px), the edit form drops down as a full-width panel below the header.

**CSS values (must match exactly):**
- `.kb-title-text`: font-size 16px, font-weight 700 (mobile: 14px)
- `.kb-subtitle-text`: font-size 12px, color var(--kb-muted)
- `.kb-title-input`: font-size 15px, font-weight 700, width 140px
- `.kb-subtitle-input`: font-size 12px, width 160px
- Header left gap: 8px
- View toggle: SVG icons with text labels, hide labels on mobile (≤768px)

**View toggle buttons:** Use SVG icons (14px) with text labels. Active state: accent bg, white text. Inactive: muted, hover to fg+card-hover bg.

**Header CSS (must match exactly):**
```css
.kb-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--kb-border);
}
/* Mobile (≤768px): */
.kb-header {
  padding: 8px 12px;
  gap: 6px;
  flex-wrap: wrap;
  position: relative; /* for mobile title edit dropdown */
}
.kb-header-left { display: flex; align-items: center; gap: 8px; }
```

---

## 4b. SIDEBAR — Standardized Layout (NEW)

The kanban board currently has NO sidebar. Add one matching the Goal Tracker / Habit Tracker pattern exactly, showing lanes as sections (like life areas).

**File: New `src/components/BoardSidebar.tsx`**

**Structure:**
```
.kb-sidebar (width 260px, border-right, background var(--kb-lane-bg), flex column)
  ├─ .kb-sidebar-header (padding 14px 16px 10px)
  │   ├─ .kb-sidebar-title ("MY BOARDS", 13px, 700, uppercase, 0.6px letter-spacing, var(--kb-muted))
  │   └─ .kb-sidebar-count ("X cards", 11px, 600, pill bg var(--kb-card-hover), padding 2px 8px, border-radius 10px)
  ├─ .kb-sidebar-list (flex 1, overflow-y auto, padding 0 8px 8px)
  │   ├─ .kb-sidebar-item "All Cards" (selected state, icon: inbox 14px)
  │   └─ Per-lane sections:
  │       ├─ .kb-sidebar-section-header (lane header — see section 10 for exact structure)
  │       └─ Card items under each lane (optional — or just lane-level navigation)
  └─ .kb-sidebar-footer (padding 8px 12px, border-top, flex-shrink 0)
      ├─ .kb-footer-btn "+ Add Card"
      └─ .kb-footer-btn "+ Add Lane"
```

**Sidebar item CSS (must match exactly):**
```css
.kb-sidebar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--kb-radius-xs);
  cursor: pointer;
  transition: background var(--kb-transition);
  user-select: none;
}
.kb-sidebar-item:hover { background: var(--kb-card-hover); }
.kb-sidebar-item.selected { background: color-mix(in srgb, var(--kb-accent) 12%, transparent); }
.kb-sidebar-name { flex: 1; font-size: 13px; font-weight: 500; color: var(--kb-fg); }
.kb-sidebar-pct { font-size: 11px; font-weight: 600; color: var(--kb-muted); }
```

**Mobile (≤768px):** Sidebar becomes a fixed drawer (position fixed, top/left/bottom 0, width 280px, translateX(-100%), transition 0.25s ease). Open via hamburger button in header. Overlay behind at rgba(0,0,0,0.4).

**Footer buttons CSS:**
```css
.kb-sidebar-footer {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid var(--kb-border);
  flex-shrink: 0;
}
.kb-footer-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: 1px dashed var(--kb-border);
  background: transparent;
  color: var(--kb-muted);
  border-radius: var(--kb-radius-xs);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--kb-transition);
}
.kb-footer-btn:hover {
  color: var(--kb-accent);
  border-color: var(--kb-accent);
  background: color-mix(in srgb, var(--kb-accent) 6%, transparent);
}
/* Mobile */
.kb-footer-btn { min-height: 48px; font-size: 14px; }
```

**Hamburger menu button (mobile only, hidden on desktop):**
```tsx
<button className="kb-menu-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="2" y1="4" x2="16" y2="4"/>
    <line x1="2" y1="9" x2="16" y2="9"/>
    <line x1="2" y1="14" x2="16" y2="14"/>
  </svg>
</button>
```

---

## 5. ADD URL LINKIFICATION

**New file: `src/components/shared/Linkify.tsx`**

```typescript
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

interface LinkifyProps {
  children: string;
}

export function Linkify({ children }: LinkifyProps) {
  if (!children) return null;
  const parts = children.split(URL_REGEX);
  if (parts.length === 1) return <>{children}</>;
  return (
    <>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a key={i} href={part} className="kb-link" target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}>{part}</a>
        ) : (<span key={i}>{part}</span>)
      )}
    </>
  );
}
```

**CSS class `.kb-link`:**
```css
.kb-link { color: var(--kb-accent); text-decoration: none; word-break: break-all; }
.kb-link:hover { color: var(--kb-fg); text-decoration: underline; }
```

Apply to: card descriptions, card comments, lane titles where URLs might appear.

---

## 6. ACCESSIBILITY — FOCUS VISIBLE

**File: `src/styles.css`**

Add after reset section:
```css
:focus-visible {
  outline: 2px solid var(--kb-accent);
  outline-offset: 2px;
}
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--kb-accent);
  outline-offset: 1px;
}
```

---

## 7. MOBILE TOUCH TARGETS (WCAG 2.5.8)

**File: `src/styles.css`** — `@media (max-width: 768px)` section

All interactive elements must meet 44px minimum:
- Icon buttons: 44x44px
- Modal close button: 44x44px
- Card action buttons: 44x44px
- Lane menu button: 44x44px
- Color swatches: min 34x34px (already close, verify)
- Form inputs: 16px font-size (iOS zoom fix)

---

## 8. TOAST NOTIFICATIONS

**File: Main board component (KanbanBoard.tsx)**

Add toast state and auto-dismiss:
```typescript
const [toast, setToast] = useState<string | null>(null);
const showToast = useCallback((message: string) => {
  setToast(message);
  setTimeout(() => setToast(null), 2000);
}, []);
```

Wire to actions: card created/deleted/moved, lane created/deleted, board exported.

**CSS:**
```css
.kb-toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--kb-fg);
  color: var(--kb-bg);
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  z-index: 3000;
  pointer-events: none;
  box-shadow: var(--kb-shadow-lg);
  animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes toastIn {
  0% { transform: translateX(-50%) translateY(20px); opacity: 0; }
  100% { transform: translateX(-50%); opacity: 1; }
}
```

---

## 9. KEYBOARD SHORTCUTS

**New file: `src/components/shared/ShortcutsHelp.tsx`**

Create a modal showing keyboard shortcuts. Toggle with `?` key.

Suggested shortcuts:
- `N` — New card in first lane
- `L` — New lane
- `V` — Toggle board/list view
- `Arrow keys` — Navigate cards
- `Enter` — Open card detail
- `Escape` — Close modal/detail
- `?` — Toggle shortcuts help

Add `?` button in header.

---

## 10. LANE HEADER STANDARDIZATION

Lane headers must match the life area / section header pattern used in the Goal Tracker and Habit Tracker sidebars.

**Current kanban lane header:** `lane-title` (h3) + `lane-count` badge + `lane-menu-btn` (three-dot)
**Target structure (flat, no nesting):**

```
.kb-lane-header (flex, align-items center, gap 6px, cursor pointer, border-radius radius-xs, hover bg, transition, padding 8px 10px 6px)
  ├─ .kb-drag-handle (&#x2807;, 14px, var(--kb-border) color, opacity 0 → 0.6 on hover)
  ├─ .kb-lane-dot (6x6px circle, lane color)
  ├─ .kb-lane-name (10px, 700 weight, uppercase, 0.5px letter-spacing, var(--kb-muted))
  ├─ .kb-lane-count (9px, 600 weight, 1px 6px padding, 8px border-radius, bg hexToRgba(color, 0.15), text color = lane color)
  ├─ .kb-lane-edit (&#x22EF; three-dot, 14px, 700 weight, 1px letter-spacing, opacity 0 → 1 on hover)
  └─ .kb-lane-arrow (SVG chevron 12x12, transform rotate(-90deg) when collapsed, transition 150ms)
```

**Tinted background:** Each lane header gets `background: hexToRgba(lane.color, 0.08)` inline style.

**CSS values (must match exactly):**
```css
.kb-lane-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  margin-top: 6px;
  cursor: pointer;
  user-select: none;
  border-radius: var(--kb-radius-xs);
  transition: background var(--kb-transition);
}
.kb-lane-header:hover { background: var(--kb-card-hover); }
.kb-lane-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.kb-lane-count { font-size: 9px; font-weight: 600; padding: 1px 6px; border-radius: 8px; }
.kb-drag-handle { font-size: 14px; color: var(--kb-border); opacity: 0; cursor: grab; transition: opacity var(--kb-transition); }
.kb-lane-header:hover .kb-drag-handle { opacity: 0.6; }
.kb-lane-edit { font-size: 14px; font-weight: 700; letter-spacing: 1px; opacity: 0; }
.kb-lane-header:hover .kb-lane-edit { opacity: 1; }
.kb-lane-arrow { display: flex; width: 12px; flex-shrink: 0; margin-left: auto; transition: transform var(--kb-transition); }
.kb-lane-arrow.collapsed { transform: rotate(-90deg); }
```

**SVG arrow (replace text characters):**
```tsx
<span className={`kb-lane-arrow ${isCollapsed ? 'collapsed' : ''}`}>
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
</span>
```

**List View group headers:** In `ListView.tsx`, use the exact same header pattern for grouped sections (lane name as group header).

**Board View lane headers:** In `KanbanLane.tsx`, use this same pattern for the lane title area at the top of each column.

**Add Card / Add Lane buttons:** Place at the bottom as footer buttons matching the sidebar footer pattern:
```css
.kb-footer-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: 1px dashed var(--kb-border);
  background: transparent;
  color: var(--kb-muted);
  border-radius: var(--kb-radius-xs);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--kb-transition);
}
.kb-footer-btn:hover {
  color: var(--kb-accent);
  border-color: var(--kb-accent);
  background: color-mix(in srgb, var(--kb-accent) 6%, transparent);
}
```

---

## 11. EXPORT FUNCTIONALITY

Add export options matching the other plugins:
- **Export as CSV** — cards with columns: Lane, Title, Description, Label, Due Date, Comments count
- **Export as Markdown** — formatted markdown with lanes as headers, cards as list items
- **Export as JSON** — raw board data

Create an ExportMenu dropdown with SVG icons (no emoji):
```tsx
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="8" y1="2" x2="8" y2="10"/><polyline points="4,7 8,11 12,7"/><line x1="2" y1="14" x2="14" y2="14"/>
  </svg>
);
```

---

## 12. FORM SELECT CUSTOM ARROW

All `<select>` elements should use a custom SVG dropdown arrow:
```css
.form-select {
  appearance: none;
  padding-right: 28px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round'%3E%3Cpolyline points='2,4 6,8 10,4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
```

---

## 13. MODAL STYLING STANDARDIZATION

Ensure modals match:
- Max-width: 520px
- Overlay: `rgba(0, 0, 0, 0.55)` + `backdrop-filter: blur(6px)`
- Animation: `slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)`
- Close button: SVG X icon (no emoji)
- Mobile: bottom-sheet style (align-items: flex-end, border-radius: 14px 14px 0 0, max-height: 92vh)

---

## 14. BUTTON STYLE STANDARDIZATION

Ensure these button classes exist and match:
- `.btn-primary`: accent bg, white text, 6px 14px padding, radius-sm
- `.btn-secondary`: bordered, muted text, hover accent
- `.btn-danger`: bordered red, hover fills red
- `.btn-success`: bordered green, hover fills green

---

## 15. EMPTY DATE HANDLING

In `src/lib/dates.ts`: add guards against empty/invalid date strings. Return `'-'` for invalid dates.

---

## 16. DESIGN PRINCIPLES (Must Follow)

1. **Dark-first** — all CSS var fallbacks are dark palette values
2. **No emoji icons** — use inline SVG exclusively (stroke-based, strokeWidth=2, strokeLinecap=round)
3. **No CSS variables in SVG** — hardcode hex colors if needed (SN iframe limitation)
4. **Single CSS file** — all styles in `src/styles.css`
5. **No external UI framework** — custom CSS with CSS variables
6. **300ms debounced saves** — batch state updates to SN
7. **localStorage fallback** — for standalone use outside SN
8. **44px minimum touch targets** on mobile
9. **Font**: `var(--sn-stylekit-font-family, 'DM Sans', -apple-system, ...)`
10. **Base font size**: `var(--sn-stylekit-font-size-base, 14px)`

---

## 17. TESTING CHECKLIST

After all changes, verify:
- [ ] Standalone mode + SN iframe both work
- [ ] 18-color picker with preview square
- [ ] SVG icons everywhere (no emoji)
- [ ] URL linkification in card descriptions/comments
- [ ] iPhone 16 responsive (393x852)
- [ ] 44px touch targets on mobile
- [ ] Keyboard shortcuts `?` modal
- [ ] Export menu visible with SVG icons
- [ ] Focus-visible rings on Tab
- [ ] Toast notifications on CRUD actions
- [ ] Double-click editable board title
- [ ] Clean build (`npm run build` zero errors)
- [ ] GitHub Actions deploy succeeds
- [ ] Board/List view toggle works
- [ ] Drag-and-drop works in both views
