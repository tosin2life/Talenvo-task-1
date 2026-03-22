# Collaborative Knowledge Board

A production-grade SaaS-style workspace for managing ideas, documentation, and execution. Built with **Next.js 14+ (App Router)**, **TypeScript**, and **Tailwind CSS**. Stage 1 deliverable: core board system with normalized state, accessible UI, and no UI/drag-and-drop libraries.

---

## 1. Folder structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout, fonts, StoreHydration wrapper
│   ├── page.tsx            # Workspace dashboard (board list)
│   ├── board/[boardId]/
│   │   └── page.tsx        # Board view route — lazy-loaded via dynamic()
│   └── globals.css         # Tailwind base and theme variables
├── components/
│   ├── ui/                 # Presentational atoms (no feature logic)
│   │   ├── Button.tsx
│   │   ├── Modal.tsx       # Accessible modal: focus trap, Esc, scroll lock
│   │   ├── Badge.tsx
│   │   └── Input.tsx
│   ├── board/              # Board feature
│   │   ├── BoardCard.tsx
│   │   ├── BoardList.tsx
│   │   ├── BoardView.tsx
│   │   ├── BoardViewSkeleton.tsx  # Shown while board chunk loads
│   │   └── CreateBoardModal.tsx
│   ├── column/             # Column + card feature
│   │   ├── Column.tsx
│   │   ├── ColumnList.tsx
│   │   ├── VirtualCardList.tsx  # Virtualized list for columns with 20+ cards
│   │   ├── KanbanCard.tsx
│   │   └── CardDetailModal.tsx
│   └── StoreHydration.tsx  # Rehydrates persisted stores before rendering
├── store/                  # Zustand (domain + UI state)
│   ├── boardStore.ts
│   ├── columnStore.ts
│   ├── cardStore.ts
│   └── uiStore.ts
├── types/
│   └── index.ts            # Board, Column, Card, UIState
├── lib/
│   ├── date.ts             # formatDisplayDate, getDueStatus
│   └── markdown.tsx        # MarkdownRenderer (react-markdown + remark-gfm)
└── hooks/
    ├── useBoard.ts         # Resolves board + columnsWithCards for a boardId
    └── useCardForm.ts      # Card form state, resets when card id changes
```

- **app**: Routes and layout only; page components stay thin and delegate to feature components.
- **components/ui**: Reusable primitives; no direct store imports.
- **components/board** and **components/column**: Feature-scoped; may use stores and hooks.
- **store**: Single source of truth; normalized entities + ordered id arrays.
- **lib**: Pure helpers (dates, markdown config).
- **hooks**: Encapsulate store selection and form state.

---

## 2. State architecture diagram

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                     COMPONENTS                          │
                    └─────────────────────────────────────────────────────────┘
                      │                │                │                │
                      ▼                ▼                ▼                ▼
              ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
              │ Dashboard │    │ BoardView │    │ ColumnList│    │ CardDetail│
              │  (page)   │    │           │    │  Column   │    │  Modal   │
              └─────┬─────┘    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
                    │                │                │                │
    ┌───────────────┼────────────────┼────────────────┼────────────────┼───────────────┐
    │               │                │                │                │               │
    ▼               ▼                ▼                ▼                ▼               ▼
┌────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────┐
│boardStore│   │columnStore │   │ cardStore  │   │ columnStore│   │ cardStore  │   │uiStore │
│         │   │            │   │            │   │            │   │            │   │        │
│boards   │   │columns     │   │cards       │   │columnIds   │   │cards       │   │active  │
│boardIds │   │columnIds   │   │cardIds     │   │[boardId]   │   │cardIds     │   │BoardId │
└────────┘   └────────────┘   └────────────┘   └────────────┘   └────────────┘   └────────┘
     │               │                │
     │               │                │
     └───────────────┴────────────────┴──────► Normalized: Record<id, Entity> + id[] arrays
                                               Cascade: deleteBoard → removeColumnsByBoard
                                                        → removeCardsByColumns
```

**Data flow (subscriptions):**

- **Dashboard**: `useBoardStore(state => state.boardIds.length)`, `boardIds`, `boards` → BoardList, BoardCard.
- **BoardView**: `useBoard(boardId)` → `useBoardStore`, `useColumnStore`, `useCardStore` (via hook); `useUIStore(activeBoardId)`.
- **Column**: `column` + `cards` from parent; `useColumnStore` / `useCardStore` for mutations.
- **CardDetailModal**: `useCardForm(card)` (local form); `useCardStore(updateCard, deleteCard)` on Save/Delete.

Stores are **persisted** (Zustand `persist` with `skipHydration: true`) and rehydrated in `StoreHydration` before rendering to avoid hydration mismatch.

---

## 3. State management decision

**Why Zustand**

- **Minimal API**: No providers; components subscribe with `useStore(selector)`. Selectors keep re-renders scoped to the slice that changed.
- **Normalized shape**: Entities live as `Record<id, Entity>` with separate ordered id arrays (`boardIds`, `columnIds[boardId]`, `cardIds[columnId]`). No deep nesting; O(1) lookups and straightforward updates.
- **Stage 2 real-time ready**: A WebSocket can apply delta patches by id (e.g. `set(state => ({ boards: { ...state.boards, [id]: updated } }))` or append to `cardIds[columnId]` and set `cards[newId]`). No need to replace entire trees.
- **Persistence**: `persist` middleware with `partialize` and `skipHydration: true` gives optional localStorage without blocking first paint; hydration runs in a client-only wrapper.

**Alternatives considered**

- **Context + useReducer**: Would require a single large reducer or multiple contexts; either deep prop drilling or many providers. Harder to subscribe to narrow slices and avoid unnecessary re-renders.
- **Redux**: Heavier; normalized state is similar but boilerplate and devtools are more than needed for this scope.

---

## 4. Performance strategy

- **Code splitting**: The board view is lazy-loaded via `next/dynamic` in `app/board/[boardId]/page.tsx`. `BoardView` and its subtree load in a separate chunk; a `BoardViewSkeleton` is shown until ready.
- **Memoization**: List items with stable props use `React.memo`: `BoardCard`, `KanbanCard`, `Column`, `ColumnList`. Updates to one item do not re-render siblings.
- **Stable callbacks**: `handleOpenCardDetail` and `handleCloseCardModal` use `useCallback` so memoized children avoid extra re-renders.
- **Selectors**: Components use granular Zustand selectors (e.g. `state.boardIds.length`, `state.boards[id]`). `Column` uses `useShallow` to select only its cards; re-renders only when that column’s cards change.
- **List virtualization**: `VirtualCardList` renders only visible cards when a column exceeds 20 items. Scroll handling uses `requestAnimationFrame` to avoid excessive re-renders during scroll.

---

## 4a. Performance notes

**Implemented optimizations**

| Optimization | Where |
|--------------|-------|
| Narrow selectors + `useShallow` | `useBoard`, `Column` – select only the slice that changed |
| List virtualization | `VirtualCardList` – visible items only when column has >20 cards |
| Memoization | `ColumnList`, `Column`, `KanbanCard`, `BoardCard` wrapped in `memo` |
| Scroll throttling | `VirtualCardList` uses `requestAnimationFrame` for scroll updates |

**Profiling**

- Use React DevTools Profiler to record interactions (scroll, drag, open card).
- Enable "Highlight updates when components render" to spot unnecessary re-renders.
- Ensure Profiler captures realistic usage; granular selectors and memo boundaries keep render scope small.

**Scaling**

- Virtualization activates when a column has more than 20 cards. Lower `VIRTUAL_THRESHOLD` in `VirtualCardList.tsx` if columns grow larger.

---

## 5. Accessibility implementation

- **Semantic HTML**: `<main>`, `<header>`, `<section>`, `<article>`, `<ul>`/`<li>` for lists; interactive controls use `<button>` or `<a>` (no `<div onClick>`). Form fields use `<label>` and `htmlFor`.
- **Modals**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to the modal title. Focus moves to the first focusable element on open and is restored on close. Tab/Shift+Tab are trapped inside the dialog. Escape closes. Body scroll is locked while open.
- **Keyboard**: Column title inline edit (Enter/Space to activate, Enter to save, Esc to cancel). Card/column creation: Enter to submit, Esc to cancel. Confirmation dialogs: Enter to confirm, Esc to cancel.
- **ARIA**: Icon-only buttons have `aria-label` (e.g. "Delete board", "Remove tag"). Invalid fields use `aria-invalid` and `aria-describedby` pointing to the error message. Delete confirmation uses `role="alertdialog"` with `aria-labelledby` and `aria-describedby`.
- **Focus**: Visible focus rings (Tailwind `focus-visible:ring-*`); no `outline: none` without a replacement.

---

## 6. Key engineering decisions

- **Board route code-split**: The board page is the heaviest route (columns, cards, modals, markdown). Lazy-loading it keeps the dashboard bundle smaller and satisfies the PRD requirement that the board view be code-split with a loading state.
- **Persist with skipHydration**: Persistence is done with Zustand `persist` and `skipHydration: true`. State is rehydrated in `StoreHydration` after mount so the first client render matches server output (no state on server), then persisted state is applied. This avoids hydration mismatches while still giving optional localStorage.
- **Card modal instead of route**: Opening a card opens a modal rather than navigating to `/board/[boardId]/card/[cardId]`. This preserves column context and scroll position and avoids a full navigation for a quick edit. (Query param `?card=id` for shareability was left for a later iteration.)
- **Cascade delete in UI**: When deleting a board, the client calls `removeColumnsByBoard(boardId)`, then `removeCardsByColumns(columnIds)`, then `deleteBoard(id)`. All three stores stay in sync; the same pattern is used for column delete (remove cards for that column, then delete column).

---

## 7. Getting started

**Install and run**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You’ll see the workspace dashboard; create a board, open it, add columns and cards, and open a card to edit (markdown, tags, due date).

**Build**

```bash
npm run build
npm run start
```

---

## 8. Testing

Unit and integration tests verify drag-and-drop logic, undo/redo, comment system, and board interactions.

**Run all tests**
```bash
npm run test
```

**Run tests in watch mode (re-run on file changes)**
```bash
npm run test:watch
```

**Test coverage**
- `src/__tests__/dragUndoLogic.unit.test.ts` – card move, undo/redo, remote sync tolerance
- `src/__tests__/commentLogic.unit.test.ts` – comment add/edit/delete, threading
- `src/__tests__/boardInteraction.integration.test.ts` – full flow: create board/column/cards, move card, undo/redo, comments persist with card

---

## 9. Deploy on Vercel

1. Push the project to **GitHub** (or GitLab/Bitbucket).
2. Go to [vercel.com](https://vercel.com) and sign in with the same Git provider.
3. Click **Add New… → Project** and import the repository.
4. Leave **Framework Preset** as **Next.js**; **Root Directory** as `.` (or the repo root).
5. Click **Deploy**. Vercel will run `npm run build` and deploy. No extra env vars are required for the current app.
6. After deploy, use the generated URL (e.g. `https://your-project.vercel.app`). Optionally add a custom domain under **Settings → Domains**.

**CLI (optional)**

```bash
npm i -g vercel
vercel
```

Follow the prompts (link to existing project or create new). Use `vercel --prod` to deploy to the production URL.

---

**Stack:** Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS · Zustand · react-markdown + remark-gfm · date-fns · nanoid · lucide-react
