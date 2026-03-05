import { useMemo } from "react";
import { useBoardStore } from "@/store/boardStore";
import { useColumnStore } from "@/store/columnStore";
import { useCardStore } from "@/store/cardStore";
import { useUIStore } from "@/store/uiStore";

const EMPTY_COLUMN_IDS: string[] = [];

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
  const cards = useCardStore((state) => state.cards);
  const cardIds = useCardStore((state) => state.cardIds);

  const columnsWithCards = useMemo(() => {
    if (!resolvedBoardId) return [];

    return columnIds.map((columnId) => {
      const column = columns[columnId];
      const idsForColumn = cardIds[columnId] ?? [];
      const columnCards = idsForColumn.map((id) => cards[id]).filter(Boolean);

      return {
        column,
        cards: columnCards,
      };
    });
  }, [resolvedBoardId, columnIds, columns, cards, cardIds]);

  return {
    board,
    columnsWithCards,
  };
}
