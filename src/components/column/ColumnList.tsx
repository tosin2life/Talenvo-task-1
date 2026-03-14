import { memo } from "react";
import { useBoard } from "@/hooks/useBoard";
import { Column } from "./Column";

interface ColumnListProps {
  boardId: string | null;
  onOpenCardDetail?: (cardId: string) => void;
}

function ColumnListInner({ boardId, onOpenCardDetail }: ColumnListProps) {
  const { columnsWithCardIds } = useBoard(boardId);

  if (columnsWithCardIds.length === 0) {
    return null;
  }

  return (
    <>
      {columnsWithCardIds.map(({ column, cardIds }) => {
        if (!column) return null;
        return (
          <Column
            key={column.id}
            column={column}
            cardIds={cardIds}
            onOpenCardDetail={onOpenCardDetail}
          />
        );
      })}
    </>
  );
}

export const ColumnList = memo(ColumnListInner);
