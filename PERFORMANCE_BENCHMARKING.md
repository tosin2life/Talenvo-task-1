# Performance Benchmarking Notes

This doc captures the planned benchmarking approach for the “Collaborative Knowledge Board” (Next.js + Zustand) focusing on the highest-impact UX paths:

- Rendering a board with many cards (DOM size + layout cost)
- Scrolling inside a column (scroll jank)
- Drag-and-drop reordering/moving cards (latency + render scope)

At the time of writing, **benchmark results are intentionally left as placeholders** until you run the measurements and fill in the numbers.

---

## What we are optimizing

1. **First usable render**
   - Keep initial UI responsive by code-splitting the board view and avoiding unnecessary renders.
2. **Column scrolling smoothness**
   - Use `VirtualCardList` when a column exceeds `VIRTUAL_THRESHOLD` (20).
3. **Drag/drop responsiveness**
   - Keep state updates minimal and localized, and avoid re-rendering unrelated columns/cards.

Key implementation references:
- Virtualization: `src/components/column/VirtualCardList.tsx`
- Drag/drop: `src/components/column/Column.tsx`
- High-level performance strategy: `ARCHITECTURE_EVOLUTION.md`

---

## Benchmark environment

Record these so results are comparable:

- Machine:
- OS:
- Browser + version:
- CPU throttling / performance mode (if used):
- Next.js build mode: `dev` or `build && start`
- Screen resolution:

---

## Test data matrix

Create (or simulate) boards with controlled sizes. For each size, measure both:

- **Virtualization OFF**: column has <= `VIRTUAL_THRESHOLD` cards
- **Virtualization ON**: column has > `VIRTUAL_THRESHOLD` cards

Recommended matrix:

- Board size:
  - 1 column, 0/10/25 cards
  - 3 columns, 10/25/40 cards each
  - 6 columns, 10/25 cards each
- Card content size (to test layout cost):
  - short title only
  - medium description (typical)

---

## Metrics

### A) Scroll smoothness

Primary:
- **Scroll jank**: number of frames over 16.7ms (60fps baseline) while scrolling

Secondary:
- Main thread time during scroll (from DevTools Performance flame charts)
- React render count while scrolling

How to measure:
- Chrome DevTools → Performance capture during a 5-10s scroll
- React DevTools Profiler during the same interaction (if available)

### B) Drag-and-drop latency

Primary:
- **Input-to-update latency**:
  - time from `dragstart` to the store update + DOM update after drop

Secondary:
- Total number of re-renders triggered by a single move
- “Drop correctness”:
  - ensure the card ends at the expected index, especially when moving across columns

How to measure:
- Chrome DevTools Performance:
  - look for the timeline of `dragstart` → `drop` handler → Zustand updates → React commits
- Optional instrumentation (recommended):
  - add temporary `performance.mark()` calls around:
    - the `moveCard(...)` invocation in `Column.tsx`
    - the store’s `moveCard` action body
    - the subsequent React commit (via `useEffect`/Profiler callback)

### C) Render scope during drag

Goal:
- Moving a card should not cause all columns to re-render.

How to measure:
- React DevTools “Highlight updates” + commit counts by component

---

## Scenarios

For each test data row, run these scenarios in order (fresh page reload between rows):

1. **Initial render**
   - Measure Time to Interactive (approx) and initial commit count.
2. **Scroll inside a populated column**
   - Scroll from top to middle and back (repeat twice).
3. **Drag within the same column**
   - Move a card from index 0 → middle
   - Move a card from middle → end
4. **Drag across columns**
   - Move a card from column A to column B:
     - to the top
     - to the middle
     - to the end
5. **Virtualization stress**
   - Repeat drag when virtualization is enabled.

Notes specific to your implementation:
- When virtualization is enabled, drop targets only exist for **rendered items** in `VirtualCardList`. This may influence how accurately “hover” maps to the final index, but `onDrop` still passes `targetIndex` based on the rendered list index.

---

## Benchmark procedure (repeatable)

1. Clear storage:
   - clear localStorage (since state is persisted via Zustand persist)
2. Open the board route fresh.
3. Warm up:
   - perform one scroll and one drag interaction and discard results (optional)
4. Run each scenario and capture:
   - 1x Chrome Performance recording per scenario
   - 1x React Profiler recording per scenario (if feasible)
5. Record the numbers in the results section below.

---

## Results (fill in)

### Scroll smoothness

| Scenario | Virtualization | Median frame time (ms) | Jank frames (count) | Notes |
|---|---:|---:|---:|---|
| 1 column, 10 cards, scroll 5s | OFF | TBD | TBD | |
| 1 column, 25 cards, scroll 5s | ON | TBD | TBD | |
| 6 columns, 25 cards each, scroll 5s | ON | TBD | TBD | |

### Drag-and-drop latency

| Scenario | Virtualization | dragstart→drop→commit (ms) | Render scope (columns/cards re-rendered) | Notes |
|---|---:|---:|---|---|
| move within column (0→mid) | OFF | TBD | TBD | |
| move within column (0→mid) | ON | TBD | TBD | |
| move across columns (A→B top) | ON | TBD | TBD | |
| move across columns (A→B end) | ON | TBD | TBD | |

---

## Interpretation (fill in once you have numbers)

After collecting the measurements, summarize:

- Which scenario shows the biggest latency/jank spikes?
- Whether virtualization reduces:
  - scroll jank
  - drag drop latency
  - the number of renders during moves
- If latency spikes correlate with:
  - state updates
  - React commits
  - layout/reflow caused by card content

---

## Quick action items (once benchmarks are measured)

If any metric is worse than expected:

- Consider tightening Zustand selectors / `useShallow` dependencies (to reduce re-render scope)
- Reduce DOM impact further (tune virtualization thresholds or card height assumptions)
- Add lightweight instrumentation around `moveCard` to confirm update cost

