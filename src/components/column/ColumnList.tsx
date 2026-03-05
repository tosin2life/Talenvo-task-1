import { useBoard } from "@/hooks/useBoard";
import { Column } from "./Column";

interface ColumnListProps {
  boardId: string | null;
  onOpenCardDetail?: (cardId: string) => void;
}

export function ColumnList({ boardId, onOpenCardDetail }: ColumnListProps) {
  const { columnsWithCards } = useBoard(boardId);

  if (columnsWithCards.length === 0) {
    return null;
  }

  return (
    <>
      {columnsWithCards.map(({ column, cards }) => {
        if (!column) return null;
        return (
          <Column
            key={column.id}
            column={column}
            cards={cards}
            onOpenCardDetail={onOpenCardDetail}
          />
        );
      })}
    </>
  );
}

