# Tradeoffs: Custom HTML5 DnD vs DnD Libraries

This doc explains the reasoning behind using a custom drag-and-drop approach (native HTML5 DnD) and compares it to popular DnD libraries, focusing on the specific constraints of this project:

- No UI drag-and-drop libraries were used for the Stage 1 deliverable
- Columns can be virtualized when they exceed a card-count threshold
- The app uses normalized Zustand state and needs “move” operations to update ordering correctly

---

## Current implementation (what we shipped)

Drag/drop lives primarily in `src/components/column/Column.tsx`:

- Cards are `button` elements with `draggable`
- `onDragStart` stores a payload in `event.dataTransfer` using a custom MIME type:
  - `application/x-knowledge-card`
  - payload includes `{ cardId, fromColumnId }`
- Drop is handled in two ways:
  - Drop on the column list container: inserts at the end (`targetIndex = cardIds.length`)
  - Drop on a specific card item: inserts at the item’s index (`targetIndex = index`)
- Move action:
  - calls `moveCard(cardId, fromColumnId, column.id, targetIndex)`

Virtualization integration:
- When a column has more than `VIRTUAL_THRESHOLD` (20) cards, `VirtualCardList` renders only visible items.
- Drop targets therefore only exist for the rendered subset at the moment of dropping.

Implementation references:
- `src/components/column/Column.tsx`
- `src/components/column/VirtualCardList.tsx`

---

## Custom HTML5 DnD: benefits

1. **No extra dependencies / minimal bundle impact**
   - Stage 1 avoided adding an external DnD library.
2. **Lower implementation surface area**
   - Native events are straightforward:
     - `onDragStart`, `onDragOver`, `onDrop`, `dataTransfer`
3. **Works well enough for desktop pointer UX**
   - With mouse/trackpad on modern browsers, the interaction is functional.
4. **State model stays consistent**
   - Because we move via `moveCard(...)` and ordering arrays, the DnD layer can stay “thin”.

---

## Custom HTML5 DnD: drawbacks / risks

1. **Limited input modalities**
   - HTML5 DnD is weak or inconsistent for touch devices.
   - Keyboard-based reordering is not supported by the browser’s drag system in a way that’s accessible by default.
2. **Precise ordering is harder**
   - Hover-based fine-grained reordering depends on browser behavior and event timing.
   - Our approach relies on “drop onto a rendered target” to determine `targetIndex`.
3. **Virtualization complicates drop targeting**
   - With `VirtualCardList`, only visible cards exist as drop targets.
   - Dropping into a non-rendered region can only resolve to the index of the nearest rendered target.
4. **Cross-browser inconsistencies**
   - Native drag/drop has browser-specific quirks (drag ghost image, drop event firing rules, dataTransfer limitations).
5. **Debugging is harder once complexity grows**
   - As soon as you add features like multi-column sorting, dragging over empty spaces, or drag previews, HTML5 DnD becomes increasingly brittle.

---

## Common library options (and tradeoffs)

### 1) `dnd-kit` (recommended next-step for pointer + keyboard)

Why it’s attractive:
- Pointer sensors provide more consistent touch + mouse handling than native HTML5 DnD.
- It’s generally better for composing custom behaviors (sorting, nested draggables, collisions).
- Keyboard interaction can be implemented more deliberately (still requires work, but you aren’t fighting browser drag behavior).

Tradeoffs:
- More concepts:
  - sensors, collision detection, sorting strategies
- Requires careful integration with virtualization (`VirtualCardList`-like approaches).
- Additional bundle/runtime cost vs native events.

### 2) `@hello-pangea/dnd` or `react-beautiful-dnd` (sorting ergonomics)

Why it’s attractive:
- Strong “Kanban-style” sorting ergonomics for reorder within lists.
- Lots of community examples.

Tradeoffs:
- Some solutions rely on DOM measurements and can be harder to align with virtualization.
- Often more constrained than `dnd-kit` for advanced UX customization.
- Depending on the library status/version, long-term maintenance and React compatibility may be a concern.

### 3) `react-dnd` (low-level drag/drop primitives)

Why it’s attractive:
- Primitive-based and flexible.
- Can be shaped to fit a normalized store architecture.

Tradeoffs:
- You implement more yourself:
  - ordering logic, collision/hover logic, drop index calculation
- Accessibility and keyboard support still require deliberate implementation.

---

## Decision criteria (what we should optimize for)

For this app, the “best” DnD layer is the one that:

- Keeps drag/drop latency low while moving cards across columns
- Minimizes React re-renders during drag/drop
- Integrates cleanly with virtualization
- Supports accessibility and multiple input types in a future iteration

Given the Stage 1 constraints:
- Native HTML5 DnD was the fastest route to a functional, dependency-free MVP.

Given the observed risks:
- Touch + keyboard + virtualization precision are the areas where libraries like `dnd-kit` typically improve outcomes.

---

## Summary: what we chose and what we’d do next

We used custom HTML5 DnD because it satisfies the Stage 1 constraint (“no UI/drag-and-drop libraries”) and keeps the DnD layer relatively thin by delegating ordering changes to `moveCard(...)` and the normalized Zustand model.

If we were to extend the product beyond MVP quality, the most valuable upgrade would be:

- Replace native HTML5 DnD with a modern library (likely `dnd-kit`)
- Revisit virtualization/drop-target strategy so the drop index resolution is accurate across the entire scrollable list
- Add a keyboard-accessible reordering path

---

## Benchmarks to validate the upgrade (tie-in to PERFORMANCE_BENCHMARKING.md)

If/when you switch DnD layers, validate:

- Drag latency (dragstart→drop→commit)
- Render scope during a move
- Scroll jank in virtualized columns
- Correctness of ordering in:
  - within-column moves
  - cross-column moves
  - virtualization ON state

