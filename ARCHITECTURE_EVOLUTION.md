## Architecture Evolution – Stage 2

This document explains how the Collaborative Knowledge Board evolved in **Stage 2**, focusing on API abstraction, drag & drop, realtime collaboration, threaded comments, undo/redo, performance work, and advanced UX. It builds on the Stage 1 architecture already described in `README.md`.

---

## 1. Baseline architecture (end of Stage 1)

At the end of Stage 1 the app was already structured as:

- **Next.js App Router** with a thin `layout.tsx`, `page.tsx` (dashboard), and `app/board/[boardId]/page.tsx` for the board.
- **Zustand stores** in `store/`:
  - `boardStore`: `boards: Record<string, Board>`, `boardIds: string[]`
  - `columnStore`: `columns: Record<string, Column>`, `columnIds: Record<boardId, string[]>`
  - `cardStore`: `cards: Record<string, Card>`, `cardIds: Record<columnId, string[]>`
  - `uiStore`: simple UI state (e.g. active board).
- **Normalized state** everywhere (no deep nesting, always `Record<id, Entity>` + ordered id arrays).
- **Persistence** via Zustand `persist` with `skipHydration: true`, and a `StoreHydration` wrapper that rehydrates stores on the client before rendering children.
- **Board view**: `BoardView` + `ColumnList` + `Column` + `KanbanCard`, with accessible keyboard support and basic performance optimizations (memoized cards/columns and narrow selectors).

Limitations at that point:

- No explicit API abstraction or persistence format beyond the persisted Zustand state.
- No realtime collaboration.
- No threaded comments.
- No undo/redo.
- No stress-test data or special performance tuning for large boards.
- Only basic UX (no toasts, loading skeletons beyond the board-level, or theme toggle).

Stage 2 evolved this baseline in several directions, described below.

---

## 2. API abstraction layer and mock persistence (Task 1)

### Goals

- Introduce an explicit **API layer** so the frontend does not depend on Zustand’s internal persistence format.
- Make it easy to swap the local mock storage for a real backend later, while keeping the rest of the app unchanged.
- Add realistic async behavior (network latency, possible failures).

### Implementation

- **`src/api/mockStorage.ts`**
  - `ApiError` with `code` (`NOT_FOUND | VALIDATION | CONFLICT | UNKNOWN`) and `status` (HTTP-like).
  - `MockApiOptions` with `minDelayMs`, `maxDelayMs`, `failureRate`.
  - `mockNetworkDelay` and `maybeThrowRandomFailure` simulate latency and (optional) transient failures.
  - `readJson` / `writeJson` wrap `localStorage` for namespaced keys.

- **Resource-specific API modules**
  - `boardApi.ts`: `listBoards`, `createBoard`, `updateBoard`, `deleteBoard`.
    - Persists boards as `{ state: { boards, boardIds }, version }` under `knowledge-board-boards`.
    - Validates titles and throws `ApiError` for invalid or missing boards.
  - `columnApi.ts`: `listColumns(boardId)`, `createColumn`, `updateColumn`, `deleteColumn`.
    - Persists `{ columns, columnIdsByBoard }` under `knowledge-board-columns`.
  - `cardApi.ts`: `listCards(columnId)`, `createCard`, `updateCard`, `deleteCard`, `moveCard`, `restoreCard`.
    - Keeps `{ cards, cardIdsByColumn }` under `knowledge-board-cards`.
    - `moveCard` updates both the `cardIds` array and the card’s `columnId`.
    - `restoreCard` re-inserts a previously deleted card (used by undo/redo).
  - `commentApi.ts`: `listCommentsForCard`, `createComment`, `updateComment`, `deleteComment`.
    - Stores all comments in a flat `comments: Record<string, Comment>` under `knowledge-board-comments`.
  - `api/index.ts` barrel to re-export domain APIs.

- **Stores updated to call APIs instead of mutating state directly:**
  - `boardStore`, `columnStore`, `cardStore`, `commentStore` all wrap their mutations around corresponding API calls.
  - The stores still own the in-memory **normalized state**, but now the backing store is the API layer, not direct `localStorage` writes from Zustand.

### Tradeoffs

- **Pros**
  - Clear boundary between UI/state and persistence.
  - Easy to replace `mockStorage` + `*Api` with real network calls later.
  - API errors bubble as `ApiError`, allowing better UX and observability.
- **Cons**
  - Every mutation is now async; components need loading/error handling.
  - Slight duplication between API layer’s persisted shape and Zustand’s in-memory shape (but the shapes are intentionally similar).

---

## 3. Drag & drop and move semantics (Task 2)

### Goals

- Enable **drag & drop** for cards between columns and within a column.
- Preserve normalized state and avoid duplication or divergent order arrays.

### Implementation

- **HTML5 DnD in `Column.tsx`**
  - Card buttons are `draggable` and use `onDragStart` to write an `application/x-knowledge-card` payload (cardId + fromColumnId) into `dataTransfer`.
  - Columns implement `onDragOver` + `onDrop` handlers both on the list and on individual items:
    - `handleCardDropOnList` drops to the end of the column.
    - `handleCardDropOnItem` drops before a specific target card index.
  - `handleAllowDrop` (`event.preventDefault()`) is attached to drop targets to allow drops.

- **Move logic in `cardStore.ts`**
  - `moveCard(cardId, fromColumnId, toColumnId, toIndex)`:
    - Calculates `fromIndex` from `cardIds[fromColumnId]`.
    - Computes a `baseFromIds` (source array without the card) and `baseToIds`:
      - If moving within the same column, reuses `baseFromIds` to avoid duplicates.
      - Otherwise uses the destination column’s existing ids.
    - Inserts `cardId` at a **safe index** (`0 ≤ index ≤ baseToIds.length`).
    - Updates `cardIds` for both columns and mutates the card’s `columnId`.
    - Calls `cardApi.moveCard` to persist, and enqueues a `MoveCommand` into `undoStore` (see below).

- **Virtualized list integration**
  - For large columns (`cards.length > VIRTUAL_THRESHOLD`), `VirtualCardList` wraps the draggable card buttons but preserves the same drag handlers.

### Tradeoffs

- **Pros**
  - Kept dependencies light: no external DnD library, pure HTML5 + React.
  - `cardStore` remains the single source of truth for order.
- **Cons / limitations**
  - HTML5 DnD can be tricky on touch devices and with complex nesting.
  - No keyboard-based reordering yet; drag is mouse-centric.
  - A more advanced DnD library could smooth over browser differences, but at the cost of additional complexity.

---

## 4. Realtime collaboration with BroadcastChannel (Task 2 – realtime)

### Goals

- Simulate **WebSocket-style realtime** syncing between tabs/windows for Stage 2, without deploying a real backend.
- Keep the rest of the app mostly unaware of the transport details.

### Implementation

- **`src/realtime/realtimeClient.ts`**
  - Defines a small event protocol:
    - `card:created` with payload `{ card }`.
    - `card:moved` with payload `{ cardId, fromColumnId, toColumnId, toIndex }`.
  - Wraps events in an `Envelope`:
    - `clientId`: random per-tab UUID (or `"server"` on SSR).
    - `eventId`, `timestamp`.
  - Uses `BroadcastChannel` named `"knowledge-board-realtime"`:
    - `publishRealtime(event)` posts a message with envelope.
    - `useRealtimeSubscription()` subscribes to the channel and:
      - Drops events from the same `clientId`.
      - For `card:created`, calls `useCardStore.getState().applyRemoteCardCreated(card)`.
      - For `card:moved`, calls `applyRemoteCardMoved(...)`.

- **Card store integration**
  - After `createCard` and `moveCard` succeed locally, they call `publishRealtime` so other tabs receive the change.
  - `applyRemoteCardCreated` and `applyRemoteCardMoved` are **drift-tolerant**:
    - They reinsert or move cards based on the current `cardIds` state, not assuming perfect alignment with the sender.

### What would change with a real WebSocket server

- A real backend would:
  - Authenticate users and manage board/room membership.
  - Store canonical board/column/card/comment data in a database.
  - Broadcast updates to all connected clients for a given board.
- The **client-side event-handling pattern** (normalized `cardStore`, `publishRealtime`, and `applyRemote*` handlers) is reusable; only the transport (BroadcastChannel → WebSocket) and source of truth would change.

---

## 5. Threaded comments (Task 3)

### Goals

- Add **threaded comments** to cards:
  - Top-level comments per card.
  - Replies to comments (arbitrary nesting).
- Maintain efficient lookups and avoid recursively nested objects in state.

### Implementation

- **Data model in `types` and `commentApi.ts`**
  - `Comment` has `id`, `cardId`, `parentId`, `author`, `body`, `createdAt`, `updatedAt`.
  - Storage is flat in the API: `comments: Record<string, Comment>`; queries filter by `cardId`.

- **Normalized store in `commentStore.ts`**
  - State:
    - `comments: Record<string, Comment>`
    - `rootIdsByCard: Record<cardId, string[]>`
    - `childIdsByParent: Record<parentId, string[]>`
  - `setCommentsForCard(cardId, comments)`:
    - Ingests a list from the API and builds/upgrades the `rootIdsByCard` and `childIdsByParent` indexes.
  - `addComment(cardId, parentId, body)`:
    - Calls `commentApi.createComment`.
    - Updates `comments`, and pushes the new id either into `rootIdsByCard[cardId]` or `childIdsByParent[parentId]`.
  - `editComment` and `deleteComment` call into the API and update local state.

- **UI in `CommentThread.tsx`**
  - On mount:
    - Calls `commentApi.listCommentsForCard(cardId)` and uses `setCommentsForCard` to seed the store.
  - Renders:
    - A root textarea + “Comment” button.
    - Root comments from `rootIdsByCard[cardId]`.
    - Nested replies by recursively traversing `childIdsByParent`.
  - Handles:
    - Loading state (`Loading comments…`).
    - Error state for failed loads or failed comment creation.

### Tradeoffs

- **Pros**
  - Flat storage with explicit indexes scales better than deep nested objects for reads and writes.
  - Rendering uses `id` arrays only, so ordering is under our control.
- **Cons**
  - No pagination; all comments for a card are loaded at once.
  - Replies are unbounded in depth (UI handles it, but no special UX for very deep threads).

---

## 6. Undo / redo with Command pattern (Task 4)

### Goals

- Provide **undo/redo** for:
  - Card creation.
  - Card deletion.
  - Card movement (within or across columns).
- Avoid cloning entire store state for each step.
- Keep the API layer as the persistence source of truth.

### Implementation

- Documented in detail in `UNDO_APPROACH.md`.

- **Command types in `undoStore.ts`**
  - `CreateCommand`: `{ type: "create"; card }`
  - `DeleteCommand`: `{ type: "delete"; card }`
  - `MoveCommand`: `{ type: "move"; cardId, fromColumnId, toColumnId, fromIndex, toIndex }`
  - `undoStack` and `redoStack` arrays store a history of these commands.

- **Helpers to mutate the card store**
  - `applyRemoveCard(cardId)`:
    - Removes card from `cards` and from `cardIds[columnId]`.
  - `applyAddCard(card)`:
    - Adds card to `cards` and appends its id to `cardIds[card.columnId]`.
  - `applyMove(cardId, fromColumnId, toColumnId, toIndex)`:
    - Performs the same move logic used by `cardStore.moveCard`, but purely on local state.

- **Undo**
  - Pops the last command from `undoStack`, pushes it onto `redoStack`, and:
    - For `create`: removes the card locally and calls `cardApi.deleteCard`.
    - For `delete`: calls `cardApi.restoreCard(card)` and then `applyAddCard`.
    - For `move`: calls `applyMove` with reversed direction, then `cardApi.moveCard` with (to → from).

- **Redo**
  - Pops from `redoStack`, pushes back to `undoStack`, and re-applies:
    - For `create`: calls `cardApi.restoreCard` and `applyAddCard`.
    - For `delete`: `applyRemoveCard` and `cardApi.deleteCard`.
    - For `move`: `applyMove` forward and then `cardApi.moveCard` forward.

- **Store integration**
  - `cardStore.createCard`, `deleteCard`, and `moveCard` call the respective `pushCreate`, `pushDelete`, and `pushMove` helpers on `useUndoStore`.
  - `BoardView` exposes undo/redo in the UI:
    - Buttons in the header and keyboard shortcuts:
      - `Ctrl+Z` / `Cmd+Z` → undo.
      - `Ctrl+Y` / `Cmd+Y` → redo.

### Tradeoffs

- **Pros**
  - Minimal state stored per step; no full snapshots.
  - Works even with the mock API as a backing store; persists the undo/redo effect.
- **Cons / limitations**
  - Only cards are undoable (board/column changes are not yet captured).
  - No cross-tab undo; history is per-tab in memory.
  - No grouping/batching of commands (e.g. multi-card operations).

---

## 7. Performance and stress testing (Task 5)

### Goals

- Confirm the board UI remains responsive under **high load** (20+ columns and 200+ cards).
- Minimize unnecessary re-renders as the board scales.
- Avoid unbounded DOM growth in large columns.

### Implementation

- **Stress seeding**
  - `src/lib/stressSeed.ts` seeds a board with:
    - ~22 columns and ~220 cards distributed across them.
  - A “Seed stress data” entry point (not shown here) allows quickly creating this scenario for manual and profiling tests.

- **`useBoard` hook refactor**
  - Instead of returning `columnsWithCards`, it returns `columnsWithCardIds`:
    - Each entry is `{ column, cardIds }`.
  - This allows **each `Column`** to subscribe only to the cards it owns, using a narrow Zustand selector with `useShallow`.

- **`Column` optimizations**
  - Uses `useCardStore` with `useShallow`:
    - Maps `cardIds` to `cards` but only re-renders when that column’s card slice changes.
  - Renders cards via:
    - Inline list when `cards.length ≤ VIRTUAL_THRESHOLD`.
    - `VirtualCardList` for larger columns (`> VIRTUAL_THRESHOLD`).

- **`VirtualCardList`**
  - Implements a simple virtualization strategy:
    - Fixed item height (`ITEM_HEIGHT`).
    - Computes visible range based on `scrollTop` and `containerHeight`.
    - Renders only the visible window + overscan.
    - Uses `requestAnimationFrame` throttling in the scroll handler to avoid high-frequency updates.

- **Memoization**
  - `ColumnList`, `Column`, `KanbanCard`, `BoardCard` are wrapped in `React.memo` where appropriate to limit re-renders to prop changes.

### Scaling to 10k cards and beyond

- The current design can handle mid-sized boards on the client, but at **very large scale** it would need:
  - Pagination or infinite scrolling for cards.
  - Server-side filtering/search (e.g. by tag or due date).
  - Possibly server-side rendering of initial slices and more aggressive virtualization or windowing at the board level.

---

## 8. Advanced UX (Task 6)

### Goals

- Improve perceived performance, resilience, and polish:
  - Clear loading states.
  - Friendly error handling and feedback.
  - Better empty states and guidance.
  - Theme toggle and visual consistency.

### Implementation

- **Loading skeletons**
  - `Skeleton` component: a generic `div` with pulse animation and rounded corners.
  - `BoardViewSkeleton`: skeleton header + columns while the board chunk loads.
  - `BoardListSkeleton`: skeleton cards for the dashboard list.
  - `StoreHydration`: shows a hydration skeleton (header + board cards) while Zustand stores are being rehydrated, instead of a blank screen.

- **Error boundaries**
  - `ErrorBoundary` component wraps the app in `layout.tsx`.
    - Catches render errors and shows a friendly “Something went wrong” message with a “Try again” button.
  - This prevents a single bug in a feature component from taking down the entire app shell.

- **Toasts (notifications)**
  - `toastStore` (`useToastStore`) manages a small array of transient notifications (`Toast[]`), with `addToast` and `removeToast`.
  - `ToastContainer`:
    - Fixed in the top-right, stacked vertically.
    - Uses success and error variants with icons.
    - Auto-dismisses after a few seconds; can be manually dismissed.
    - Slides in from the right (`toast-slide-in` animation in `globals.css`).
  - Wired into key flows:
    - Board creation success/error (`CreateBoardModal`).
    - Column creation success/error (`BoardView`).
    - Card creation success/error (`Column`).
    - Card update/delete success/error (`CardDetailModal`).
    - Column deletion success/error (`Column`).

- **Empty states**
  - Dashboard:
    - When no boards exist, shows a friendly “Create your first board” section with explanation and a CTA.
  - Board columns:
    - When a board has no columns, `BoardView` shows an empty-state message with a button to add the first column.
  - Column cards:
    - When a column has no cards, `Column` shows “No cards yet” and a prominent “+ Add a card” call-to-action within the column.

- **Dark / light theme toggle**
  - `globals.css` defines CSS variables for both dark and light themes:
    - `--background`, `--foreground`, `--border`, `--card`, `--muted-foreground`, etc.
    - Applied via `:root` / `[data-theme="dark"]` and `[data-theme="light"]`.
  - A small inline script in `layout.tsx` reads `localStorage["knowledge-board-theme"]` and sets `data-theme` on `document.documentElement` before hydration to avoid flashes.
  - `ThemeToggle` in the top nav:
    - Toggles between “dark” and “light”, persists the choice in `localStorage`, and updates `data-theme`.

### UX impact

- Users always see a **clear state**:
  - Skeletons instead of janky content flashes.
  - Helpful error messages instead of silent failures.
  - Toasters confirming important actions.
  - Empty states that explain what to do next.
  - High-contrast themes and a choice of dark/light.

---

## 9. Current technical debt and limitations

- **Local-only persistence**:
  - All data lives in `localStorage` via the mock API; there is no multi-user backend or true server-side source of truth.
- **Realtime scope**:
  - Realtime only works between tabs/windows of the same browser profile via `BroadcastChannel`.
  - There is no auth, presence, or server conflict resolution.
- **Undo/redo coverage**:
  - Only card operations are undoable; board and column operations are not part of the command stack yet.
  - History is kept in memory per tab; a refresh clears it.
- **Performance at extreme scale**:
  - Virtualization and narrow selectors handle hundreds of cards well, but thousands of cards per board would still require backend pagination and stronger indexing.
- **Testing**:
  - Automated tests (unit/integration) have not been added yet (Task 7 was intentionally skipped).

---

## 10. Evolution plan toward 10k users and production

If this project were to evolve into a production SaaS at scale, the architecture could move in these directions:

- **Backend and persistence**
  - Replace `mockStorage` with a real API (REST or tRPC).
  - Move `Board`, `Column`, `Card`, `Comment` entities into a database.
  - Keep the current API surface (`boardApi`, `columnApi`, `cardApi`, `commentApi`) as the **client contract**, implemented by HTTP instead of `localStorage`.

- **Realtime**
  - Introduce a WebSocket server or a managed realtime service.
  - Use rooms per board, authenticate clients, and broadcast events.
  - Reuse the existing event types (`card:created`, `card:moved`, and future ones) on top of the new transport.

- **State management and data fetching**
  - Continue to use Zustand for local domain state that benefits from client mutations and undo/redo.
  - Optionally introduce React Query (or similar) for server-sourced lists, caching, and background refetching.
  - Split concerns so that:
    - Server data (e.g. board list, large comment threads) is cached and refreshed via a data fetching library.
    - Local, interaction-heavy slices (drag/drop, undo/redo) remain in Zustand.

- **Performance and UX**
  - Paginate cards and comments at the API level.
  - Add filters (by tag, due date, assignee) and server-side search.
  - Enhance virtualization to support very large boards (thousands of cards) with minimal DOM.

- **Testing and reliability**
  - Add:
    - Unit tests for stores (`undoStore`, `cardStore`, `commentStore`).
    - Integration tests for board workflows (create column, create/move card, undo/redo).
    - End-to-end tests for core UI flows.
  - Introduce logging and error tracking (e.g. Sentry) to capture production issues.

- **Security and multi-tenancy**
  - Add authentication and per-user or per-team workspaces.
  - Ensure all API calls are scoped by tenant and permissions.

---

## 11. Key tradeoffs and decisions

- **Zustand vs Redux/RTK**
  - Chosen for its minimal API, direct `useStore` selectors, and ease of persistence.
  - Redux/RTK could provide more structure and tooling but at the cost of boilerplate that wasn’t necessary for Stage 2.

- **HTML5 DnD vs DnD libraries**
  - HTML5 DnD keeps dependencies small and is sufficient for a column-based kanban.
  - A library like React DnD or dnd-kit would improve touch support and offer more features but add complexity.

- **BroadcastChannel vs real WebSocket**
  - BroadcastChannel is ideal for **local** realtime development and demo scenarios, with near-zero backend overhead.
  - A real WebSocket layer is required for true multi-user collaboration across devices; the current design keeps that path open by isolating event handling.

- **Command pattern for undo vs full snapshots**
  - Commands use minimal state and work well with the current card-centric scope of undo/redo.
  - Full snapshots would simplify some logic but consume more memory and complicate merging with server state.

Overall, Stage 2 preserved the **normalized, store-centric** architecture from Stage 1, layered in a mock API, realtime syncing, threaded comments, undo/redo, performance optimizations, and richer UX—all in ways that keep a clear path toward a real backend and multi-user production deployment.

