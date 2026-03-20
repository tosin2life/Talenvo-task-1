"use client";

import { Button } from "@/components/ui/Button";
import { BoardList } from "@/components/board/BoardList";
import { useBoardStore } from "@/store/boardStore";
import { useUIStore } from "@/store/uiStore";

export default function WorkspaceDashboardPage() {
  const boardCount = useBoardStore((state) => state.boardIds.length);
  const hasBoards = boardCount > 0;
  const setOpenModal = useUIStore((state) => state.setOpenModal);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Collaborative Knowledge Board
              {boardCount > 0 ? ` (${boardCount})` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">
              Create and manage collaborative knowledge boards.
            </p>
          </div>
        </header>

        {hasBoards ? (
          <BoardList />
        ) : (
          <section
            aria-labelledby="boards-empty-title"
            className="boards-empty-section flex-1 rounded-lg p-8"
          >
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <h2
                id="boards-empty-title"
                className="text-lg font-semibold tracking-tight"
              >
                Create your first board
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Boards help your team bring ideas, documentation, and execution
                into one shared workspace. Start by creating a board for a
                project, team, or topic.
              </p>
              <Button
                type="button"
                onClick={() => setOpenModal("createBoard")}
                aria-haspopup="dialog"
              >
                + New Board
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
