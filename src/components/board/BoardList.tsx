import { useBoardStore } from "@/store/boardStore";
import { BoardCard } from "./BoardCard";

export function BoardList() {
  const boardIds = useBoardStore((state) => state.boardIds);
  const boards = useBoardStore((state) => state.boards);

  if (boardIds.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Your boards"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {boardIds.map((id) => {
        const board = boards[id];
        if (!board) return null;

        return <BoardCard key={id} board={board} />;
      })}
    </section>
  );
}

