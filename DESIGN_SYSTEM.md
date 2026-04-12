# SN Plugin Design System — Kanban Board Edition

Standardized design tokens shared across all SN plugins (Goal Tracker, Habit Tracker, Kanban Board).

---

## Color Palette (18 muted colors)

| Category | Name | Hex |
|----------|------|-----|
| Yellow | Lemon | `#FFF689` |
| Yellow | Mustard | `#F4D35E` |
| Orange | Peach | `#FFB88A` |
| Orange | Tangerine | `#FF9C5B` |
| Orange | Flame | `#F67B45` |
| Pink/Red | Blush | `#FBC2C2` |
| Pink/Red | Rose | `#E39B99` |
| Pink/Red | Berry | `#CB7876` |
| Green | Sage | `#B4CFA4` |
| Green | Fern | `#8BA47C` |
| Green | Forest | `#62866C` |
| Blue | Sky | `#A0C5E3` |
| Blue | Steel | `#81B2D9` |
| Blue | Ocean | `#32769B` |
| Purple | Lavender | `#BBA6DD` |
| Purple | Mauve | `#8C7DA8` |
| Purple | Plum | `#64557B` |
| Dark | Midnight | `#1E2136` |

**Default color:** Ocean `#32769B`

---

## CSS Variables (Dark-first, SN theme-aware)

Use `--kb-*` prefix for kanban-specific tokens. Always provide dark fallback values — SN injects `--sn-stylekit-*` which takes precedence when present.

```css
/* Core colors */
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

/* Design tokens */
--kb-radius: 10px;
--kb-radius-sm: 8px;
--kb-radius-xs: 6px;
--kb-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
--kb-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
--kb-shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.2);
--kb-transition: 150ms ease;
```

---

## Typography

| Element | Size | Weight | Extras |
|---------|------|--------|--------|
| Font family | `var(--sn-stylekit-font-family, 'DM Sans', -apple-system, ...)` | — | — |
| Base size | `var(--sn-stylekit-font-size-base, 14px)` | 400 | — |
| Section headers | 10-12px | 700 | uppercase, 0.3-0.5px letter-spacing |
| Body text | 12-13px | 500 | — |
| Large values/titles | 16-22px | 700 | — |
| Board title | 18px | 600 | — |
| Lane title | 13px | 600 | uppercase, 0.5px letter-spacing |
| Card title | 14px | 500 | — |
| Card description | 12px | 400 | clamp to 2 lines |
| Card label | 10px | 700 | uppercase |
| Modal title | 16px | 700 | — |
| Modal labels | 11px | 700 | uppercase |
| Status bar | 11px | 500 | — |
| Sidebar footer buttons | 14px | 600 | — |
| Stats card value | 22px | 700 | — |
| Stats card label | 10px | 700 | uppercase |

---

## Spacing

| Context | Value |
|---------|-------|
| Section padding | 16-24px |
| Card padding | 10-14px |
| Gaps (tight) | 4-8px |
| Gaps (normal) | 10-16px |
| Gaps (sections) | 20-24px |
| Border radius (cards/lanes) | 10px |
| Border radius (buttons) | 8px |
| Border radius (inputs/small) | 6px |
| Sidebar width | 260px |
| Modal max-width | 520px |

---

## Interactive States

```css
/* Hover */
background: var(--kb-card-hover);

/* Selected/Active */
background: color-mix(in srgb, var(--kb-accent) 12%, transparent);

/* Focus visible */
outline: 2px solid var(--kb-accent);
outline-offset: 2px;

/* Danger hover */
color: var(--kb-danger);
background: color-mix(in srgb, var(--kb-danger) 10%, transparent);
```

---

## Touch Targets (Mobile ≤768px)

| Element | Minimum Size |
|---------|-------------|
| All buttons | 44x44px |
| List rows | 48px min-height |
| Icon buttons | 44x44px |
| Modal close | 44x44px |
| Form inputs | 16px font-size (iOS zoom fix) |

---

## Icons

- **Inline SVG only** — never emoji, never Unicode characters, never icon fonts
- Stroke-based: `strokeWidth={2}`, `strokeLinecap="round"`, `strokeLinejoin="round"`
- Colors via `currentColor` or explicit hex (NOT CSS vars inside SVG — they break in SN iframe)
- Sizes: 12px tiny, 14px small, 16px default, 18px header, 28-32px hero

---

## Buttons

```css
/* Primary */
.btn-primary {
  padding: 6px 14px; border: none;
  background: var(--kb-accent); color: #fff;
  border-radius: var(--kb-radius-sm);
  font-size: 13px; font-weight: 500;
}

/* Secondary */
.btn-secondary {
  padding: 6px 14px; border: 1px solid var(--kb-border);
  background: transparent; color: var(--kb-muted);
  border-radius: var(--kb-radius-sm);
}
.btn-secondary:hover { border-color: var(--kb-accent); color: var(--kb-accent); }

/* Danger */
.btn-danger {
  padding: 6px 14px; border: 1px solid var(--kb-danger);
  background: transparent; color: var(--kb-danger);
}
.btn-danger:hover { background: var(--kb-danger); color: #fff; }

/* Success */
.btn-success {
  padding: 6px 14px; border: 1px solid var(--kb-success);
  background: transparent; color: var(--kb-success);
}
.btn-success:hover { background: var(--kb-success); color: #fff; }
```

---

## Animations

```css
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp {
  from { transform: translateY(20px) scale(0.98); opacity: 0 }
  to { transform: translateY(0) scale(1); opacity: 1 }
}
@keyframes toastIn {
  0% { transform: translateX(-50%) translateY(20px); opacity: 0 }
  100% { transform: translateX(-50%); opacity: 1 }
}
```

---

## Responsive Breakpoints

| Breakpoint | Target |
|------------|--------|
| Default | Desktop |
| `@media (max-width: 768px)` | Tablet — mobile drawer, icon-only buttons |
| `@media (max-width: 480px)` | Phone — single column, compact stats |

---

## Scrollbar

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--kb-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--kb-muted); }
```

---

## Modal

```css
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: fadeIn 0.15s ease;
}
.modal-content {
  background: var(--kb-lane-bg);
  border: 1px solid var(--kb-border);
  border-radius: 14px;
  box-shadow: var(--kb-shadow-lg);
  width: 100%; max-width: 520px; max-height: 85vh;
  animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
/* Mobile */
@media (max-width: 768px) {
  .modal-overlay { padding: 8px; align-items: flex-end; }
  .modal-content { max-width: 100%; max-height: 92vh; border-radius: 14px 14px 0 0; }
}
```
