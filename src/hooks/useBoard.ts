import { useMemo } from "react";
import { useBoardStore } from "@/store/boardStore";
import { useColumnStore } from "@/store/columnStore";
import { useCardStore } from "@/store/cardStore";
import { useUIStore } from "@/store/uiStore";

const EMPTY_COLUMN_IDS: string[] = [];

/**
 * Step 2: Optimize re-renders
 * Returns columnsWithCardIds (cardIds per column) so each Column
 * can subscribe narrowly to only its cards via useShallow.
 */
export function useBoard(boardId: string | null) {
  const activeBoardId = useUIStore((state) => state.activeBoardId);
  const resolvedBoardId = boardId ?? activeBoardId;

  const board = useBoardStore(
    (state) =>
      (resolvedBoardId ? state.boards[resolvedBoardId] : undefined) ?? null,
  );

  const columnIds = useColumnStore(
    (state) =>
      (resolvedBoardId ? state.columnIds[resolvedBoardId] : undefined) ??
      EMPTY_COLUMN_IDS,
  );

  const columns = useColumnStore((state) => state.columns);
  const cardIds = useCardStore((state) => state.cardIds);

  const columnsWithCardIds = useMemo(() => {
    if (!resolvedBoardId) return [];
    return columnIds.map((columnId) => {
      const column = columns[columnId];
      const idsForColumn = cardIds[columnId] ?? [];
      return { column, cardIds: idsForColumn };
    });
  }, [resolvedBoardId, columnIds, columns, cardIds]);

  return {
    board,
    columnsWithCardIds,
  };
}
