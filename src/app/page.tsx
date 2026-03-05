"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BoardList } from "@/components/board/BoardList";
import { CreateBoardModal } from "@/components/board/CreateBoardModal";
import { useBoardStore } from "@/store/boardStore";

export default function WorkspaceDashboardPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const boardCount = useBoardStore((state) => state.boardIds.length);
  const hasBoards = boardCount > 0;

  function openCreate() {
    setCreateOpen(true);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your Boards{boardCount > 0 ? ` (${boardCount})` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">
              Create and manage collaborative knowledge boards.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={openCreate} aria-haspopup="dialog">
              + New Board
            </Button>
          </div>
        </header>

        {hasBoards ? (
          <BoardList />
        ) : (
          <section
            aria-labelledby="boards-empty-title"
            className="flex-1 rounded-lg border border-dashed border-border bg-slate-950/60 p-8"
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
              <Button type="button" onClick={openCreate}>
                + New Board
              </Button>
            </div>
          </section>
        )}

        <CreateBoardModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
        />
      </div>
    </main>
  );
}
