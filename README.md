# Kanban Board for Standard Notes

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Standard Notes](https://img.shields.io/badge/Standard%20Notes-Plugin-6366f1.svg)](https://standardnotes.com)

A powerful, fully-featured Kanban board editor plugin for [Standard Notes](https://standardnotes.com). Organize your notes as interactive boards with drag-and-drop cards, multiple views, custom fields, analytics, and full theme support.

### Quick Install

Paste this URL in **Standard Notes > Preferences > Advanced Settings > Install Custom Plugin**:

```
https://beshoysabri.github.io/sn-kanban-board/ext.json
```

### Highlights

- **4 Views** — Board, List, Table, Analytics
- **Custom Fields** — 9 field types: text, select, multi-select, URL, media, date, number, checkbox, long text
- **Schema Editor** — Full control over statuses, groups, sub-groups, fields, and layout
- **Analytics Dashboard** — 10 interactive panels with priority matrix, status flow, and at-risk cards
- **Search, Filter, Sort** — Real-time filtering across all views
- **Mobile Ready** — Responsive design optimized for iPhone and Android

---

## Features

### Four Interactive Views

| View | Description |
|------|-------------|
| **Board** | Classic Kanban columns with drag-and-drop cards. Supports 2D grid layout with swim lanes. |
| **List** | Grouped, collapsible card list with inline metadata (labels, priorities, due dates). |
| **Table** | Spreadsheet-style view with sortable columns, inline cell editing, and custom field columns. |
| **Analytics** | Interactive dashboard with 10 panels covering status flow, priority matrix, group performance, and more. |

### Cards

- Title, description, label with 18-color muted palette
- Priority levels: Low, Medium, High, Critical
- Due dates with smart formatting (Overdue, Today, Tomorrow, In 3d, Jun 1)
- Checklists with progress tracking
- Comments system
- Notion-style tinted cards based on label color
- URL auto-linking in descriptions and comments

### Custom Fields

Define unlimited custom fields through the Schema Editor:

| Type | Description |
|------|-------------|
| Text | Single-line text input |
| Long Text | Multi-line textarea |
| Number | Numeric input |
| Date | Date picker |
| Select | Single-value dropdown with colored options |
| Multi-Select | Checkbox list from predefined options |
| URL | Clickable link input with preview |
| Media | Multiple URLs (one per line), all clickable |
| Checkbox | Boolean yes/no toggle |

Custom fields appear in the card modal, table view (with inline editing), CSV export, and analytics.

### Statuses, Groups, and Sub-Groups

Three independent organizational dimensions:

- **Statuses** define workflow stages (To Do, In Progress, Done) with optional WIP limits
- **Groups** categorize cards by team, project, or department
- **Sub-Groups** add a secondary classification (sprint, quarter, phase)

Each dimension supports custom colors, renaming, reordering, and deletion with automatic card reassignment.

### Board Layout

Configure how cards are arranged independently per view:

- **Group By** (columns): Status or Group
- **Swim Lanes** (rows): Group, Sub-Group, or Status
- Each view (Board, List, Table) has its own independent grouping settings
- 2D grid layout when swim lanes are active

### Schema Editor

Access from the gear icon in the header. Manage:

- Statuses with colors and WIP limits
- Groups and Sub-Groups with colors
- Custom field definitions (add, rename, delete, change type)
- Per-field color palette for select options
- Built-in field label renaming (customize "Status" to "Phase", "Priority" to "Urgency", etc.)
- Per-view layout settings (group-by and swim-lane configuration)

### Analytics Dashboard

Ten interactive panels providing actionable insights:

1. **Summary Cards** — Total cards, completion rate, overdue count, tasks done, avg priority, activity
2. **Status Flow** — Stacked bar showing card distribution with WIP violation badges
3. **Group Performance** — Per-group card counts with checklist completion rates
4. **Priority x Status Matrix** — 2D grid showing card counts at each intersection
5. **Due Date Timeline** — Overdue, today, this week, this month, later, no date breakdown
6. **Sub-Group Breakdown** — Per-sub-group counts with completion tracking
7. **Checklist Insights** — Cards ready to advance, per-status completion rates
8. **Custom Field Analytics** — Distribution charts for select/multiselect fields
9. **At Risk** — Overdue and high-priority cards sorted by urgency (clickable)
10. **Labels** — Top label frequency chart

### Search, Filter, and Sort

All accessible from the header toolbar on every view:

- **Search** — Filter cards by title, description, or label
- **Filter by Status** — Show only cards in a specific status
- **Filter by Priority** — Show only cards of a specific priority level
- **Sort** — By title, priority, due date, or label with ascending/descending toggle
- Active filters are visually highlighted in the header

### Export

- **CSV** — All fields including custom fields, status, group, sub-group
- **Markdown** — Re-importable format using the board's native markdown schema
- **JSON** — Complete board structure for backup or integration

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | New card in first column |
| `L` | New status |
| `V` | Cycle through views |
| `?` | Toggle shortcuts help |
| `Esc` | Close modal |

### Standard Notes Integration

- Full theme support — automatically adapts to any SN theme (light or dark)
- Data persists as human-readable markdown inside your SN note
- Works on desktop, web, and mobile SN clients
- Offline fallback via localStorage when running standalone
- Debug panel (`Ctrl+Shift+D`) for troubleshooting SN communication

### Mobile Support

- Responsive layout for iPhone and Android
- Sidebar becomes a drawer with overlay on small screens
- Touch-friendly targets (44px minimum)
- Bottom-sheet card modal
- Horizontally scrollable board and table views

---

## Installation

### From URL (Recommended)

1. Open **Standard Notes**
2. Go to **Preferences** > **General** > **Advanced Settings** > **Install Custom Plugin**
3. Paste the following URL:
   ```
   https://beshoysabri.github.io/sn-kanban-board/ext.json
   ```
4. Click **Install**
5. Open any note, click the **Editor** selector, and choose **Kanban Board**

### From Source

1. Clone and build (see Development below)
2. Deploy the `dist/` folder to any static host
3. Update `public/ext.json` with your hosted URL
4. Install using your custom `ext.json` URL

---

## Tech Stack

| Technology | Purpose |
|---|---|
| [React](https://react.dev/) 19 | UI framework |
| [TypeScript](https://www.typescriptlang.org/) 5.9 | Type safety |
| [Vite](https://vite.dev/) 7 | Build tool and dev server |
| [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) | Drag-and-drop |
| [uuid](https://github.com/uuidjs/uuid) | ID generation |

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (22 recommended)
- npm

### Setup

```bash
git clone https://github.com/beshoysabri/sn-kanban-board.git
cd sn-kanban-board
npm install
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

### Local Development with Standard Notes

1. Run `npm run dev` (starts at `http://localhost:5173`)
2. In Standard Notes, install a custom plugin with the dev `ext.json`:
   ```
   http://localhost:5173/ext.json
   ```
3. Changes hot-reload instantly in the SN editor pane

---

## Deployment

The repo includes a GitHub Actions workflow that automatically builds and deploys to GitHub Pages on every push to `main`.

1. Go to repo **Settings** > **Pages** > set Source to **GitHub Actions**
2. Push to `main` — deploys automatically

---

## Data Format

Board data is stored as markdown inside the SN note, making it human-readable:

```
@title: My Project
@description: Sprint planning
@view: board
@status: To Do
@status: In Progress [color:Ocean]
@status: Done [color:Sage]
@group: Frontend [color:#F67B45]
@field: effort [type:select] [name:Effort] [options:XS,S,M,L,XL]

* Design homepage
  * Status: To Do
  * Group: Frontend
  * Priority: high
  * DueDate: 2026-04-20
  * Effort: L
  * Checklist:
    * [x] Wireframes
    * [ ] Mockups
```

Legacy boards (pre-2.0 format with `# Header` syntax) are automatically migrated on first load.

---

## Project Structure

```
src/
  components/
    KanbanBoard.tsx      # Main orchestrator and state management
    KanbanColumn.tsx     # Board view column with drag-and-drop
    KanbanCard.tsx       # Card display with metadata badges
    CardModal.tsx        # Full card editor modal
    BoardHeader.tsx      # Header with view toggle, filters, search
    BoardSidebar.tsx     # Sidebar with status sections
    ListView.tsx         # List view with grouped sections
    TableView.tsx        # Table view with inline editing
    AnalyticsView.tsx    # Analytics dashboard (10 panels)
    SchemaEditor.tsx     # Board settings modal
    shared/              # Reusable components (Modal, Linkify, etc.)
  lib/
    sn-api.ts            # Standard Notes postMessage API layer
    markdown.ts          # Markdown serialization/deserialization
    colors.ts            # 18-color muted palette and utilities
    fields.ts            # Built-in field label system
    grouping.ts          # Shared grouping logic
    export.ts            # CSV, Markdown, JSON export
    dates.ts             # Due date formatting
  types/
    kanban.ts            # TypeScript interfaces
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## License

MIT
