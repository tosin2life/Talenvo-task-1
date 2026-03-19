### What broke when adding real-time?

**Conceptually “broke”, not just bugs:**

- **Assumptions about single-writer state:**  
  Before realtime, the app assumed one tab/user was the only writer. When `BroadcastChannel` was added, state could change “from the side” via `applyRemoteCardCreated` and `applyRemoteCardMoved`. This forces you to think in terms of **eventual consistency** instead of “my last local action is always the truth”.

- **Move logic assumptions:**  
  The original move logic assumed the sender and receiver had the same card order. With realtime, that isn’t guaranteed:
  - Another tab might have moved cards in between.
  - Local reordering plus remote events can arrive in different sequences.  
    This is why `applyRemoteCardMoved` had to be written in a **drift-tolerant** way (recompute target lists from current state rather than trusting indexes from the event).

- **“Local-only” flows became invalid:**  
  `cardStore` could no longer think “only my own actions change me”. Realtime forced:
  - New entry points into the store that bypass UI (remote handlers).
  - The need to protect against missing cards or columns when a remote event arrives late.

Functionally, nothing catastrophically broke, but the mental model shifted from “single local state machine” to “state changing from multiple writers over time,” and that required more defensive, idempotent update logic.

---

### What changed in your state structure?

Two important shifts:

1. **Board shape refined to support performance and realtime:**
   - Kept normalized entities (`boards`, `columns`, `cards`) as maps by id.
   - Strengthened the separation between:
     - **Entity maps:** `cards: Record<id, Card>`
     - **Ordering maps:** `cardIds: Record<columnId, string[]>`, `columnIds: Record<boardId, string[]>`.
   - `useBoard` now returns **`columnsWithCardIds`** (column + list of card ids) instead of embedding cards directly. This:
     - Let each `Column` subscribe only to its own cards.
     - Made remote operations easier (you can insert/move card ids without reconstructing whole column trees).

2. **New normalized structures for features:**
   - **Comments:** `comments` + `rootIdsByCard` + `childIdsByParent` instead of nested comment trees.
   - **Undo:** separate `undoStack` / `redoStack` of commands, not full state snapshots.
   - **Realtime:** no new store, but `cardStore` gained “remote apply” methods that operate purely on the normalized shape.

So the structure did not radically change, but it **hardened** around “maps + id arrays,” and new features (undo, comments, realtime) were expressed as thin layers on top of that pattern.

---

### What technical debt exists?

**Key debts:**

- **Local-only persistence and mock API:**
  - All data lives in `localStorage` behind a mock API.
  - No real backend, database, or auth.
  - Shapes are ready for a backend, but there is no migration path implemented yet (versioning, data migration, etc.).

- **Realtime scope and robustness:**
  - Realtime is limited to `BroadcastChannel` across tabs on the same device.
  - No concept of users, sessions, or permissions.
  - No conflict resolution beyond “last event wins” in the card store.
  - No retries, backoff, or offline-aware behavior for a real network environment.

- **Undo/redo coverage and durability:**
  - Only card create/delete/move are undoable.
  - Undo/redo history lives in memory; a refresh erases history.
  - No batching (e.g. “move many cards then undo as one step”).

- **Testing gap:**
  - No automated tests (unit, integration, or E2E).
  - Complex areas—move logic, undo/redo, comments normalization, realtime—are only protected by manual testing.

- **Drag and drop ergonomics:**
  - HTML5 DnD only; no explicit support for touch or keyboard reordering.
  - DnD behavior is “good enough” but not as polished or accessible as a production-ready kanban.

- **Scaling UX missing pieces:**
  - No server-side pagination or filtering for boards, cards, or comments.
  - No global search or advanced filtering (by tags, due dates, etc.).
  - Comments load all at once per card.

---

### What would you refactor with 3 more weeks?

With three more weeks, I would **not** add lots of new features; I’d harden what exists and open the path to a real production architecture:

1. **Introduce a real API boundary and testable services:**
   - Extract the logic inside `boardApi`, `cardApi`, `columnApi`, `commentApi` into small “service” modules with clear interfaces.
   - Wrap them with an HTTP-style abstraction (even if still local) so switching to a real backend is mostly configuration.
   - Add unit tests to those services and to the key store operations (`moveCard`, undo/redo, comment normalization).

2. **Formalize realtime and event handling:**
   - Create a central “event bus” abstraction instead of calling `BroadcastChannel` directly from `realtimeClient` and the card store.
   - Describe events (card created/moved, column created, comment added) in one place and have both local and future WebSocket implementations behind a common interface.
   - Make `applyRemote*` handlers more defensive and idempotent (e.g. silently ignore events referencing missing entities, or log them).

3. **Expand and generalize undo/redo:**
   - Extend the command pattern to support:
     - Column create/delete.
     - Maybe board-level actions that are safe to undo.
   - Allow logical grouping of commands into “transactions” (e.g. drag multiple moves as one undo).
   - Add tests around undo/redo to prove that sequences of actions remain consistent.

4. **Testing and E2E flows:**
   - Add Vitest or Jest + Testing Library for stores and critical components.
   - Add at least one Playwright or Cypress test that:
     - Creates a board and column, creates and moves a card, uses undo/redo, and verifies UI.
   - This reduces the risk that refactors break core flows.

5. **Improve DnD and accessibility:**
   - Wrap HTML5 DnD with a small utility or consider a DnD library that:
     - Handles touch devices.
     - Offers better keyboard support and focus management.
   - Keep the existing normalized data and store logic, only swapping the interaction layer.

---

### How would this scale to 10,000 users?

Assume “10,000 users” means many teams and boards, with potentially large numbers of cards and comments. Scaling has two dimensions: **architecture** and **experience**.

**Architecture changes:**

- **Backend and database:**
  - Move persistence out of the browser:
    - Replace `mockStorage` with a real service (REST, GraphQL, or tRPC).
    - Store `Board`, `Column`, `Card`, and `Comment` in a database (e.g. Postgres).
  - Keep the current API interfaces as the client contract; only change implementation.

- **Realtime infrastruture:**
  - Add a WebSocket server or managed realtime service.
  - Use per-board “rooms” so only users on the same board receive events.
  - Reuse current event types (card created/moved, comments, etc.) across clients, with:
    - Authentication.
    - Authorization (only collaborators on a board receive and can send events).

- **Data shaping and querying at scale:**
  - Introduce pagination and server-side filtering:
    - Boards list by user/team.
    - Cards by board/column with limit/offset or cursor.
    - Comments by card with pages or “load more”.
  - Add indexing and search (e.g. text search on card titles/descriptions, tags, due dates).

- **State management strategy:**
  - Keep Zustand for local, interactive slices (drag, undo, modal state).
  - Add a data-fetching layer (React Query or similar) for server state:
    - Cached queries for boards, columns, cards, comments.
    - Background refetch on focus or on certain events.
  - Use events to invalidate or update query caches in realtime.

**Experience and reliability changes:**

- **Performance at scale:**
  - Use virtualization not just at the column level but for entire board layouts if needed.
  - Avoid loading entire boards with thousands of cards in one go; use per-column pagination or “load more” patterns.

- **Resilience and observability:**
  - Add:
    - Logging and metrics for slow queries and high error rates.
    - Error tracking (like Sentry) to capture client and server errors.
  - Implement retries, exponential backoff, and offline fallbacks on the client where appropriate.

- **Multi-tenant safety:**
  - Introduce proper authentication and authorization:
    - Every request is scoped by user/team.
    - Boards and cards are only accessible to authorized users.
  - Centralize security and permission checks on the backend.

In short: the current Stage 2 architecture already has **the right shape** for scaling—normalized state, a clear API layer, and event-based updates. To reach 10,000 users, you’d primarily:

- Move persistence and realtime into a robust backend.
- Layer proper data fetching, pagination, and search on top.
- Harden critical flows with tests and observability.
