import { useState, memo } from "react";
import Link from "next/link";
import type { Board } from "@/types";
import { formatDisplayDate } from "@/lib/date";
import { useBoardStore } from "@/store/boardStore";
import { useColumnStore } from "@/store/columnStore";
import { useCardStore } from "@/store/cardStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";

interface BoardCardProps {
  board: Board;
}

function BoardCardInner({ board }: BoardCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deleteBoard = useBoardStore((state) => state.deleteBoard);

  function handleConfirmDelete() {
    const removedColumnIds = useColumnStore
      .getState()
      .removeColumnsByBoard(board.id);
    useCardStore.getState().removeCardsByColumns(removedColumnIds);
    deleteBoard(board.id);
    setConfirmOpen(false);
  }

  return (
    <>
      <article className="group flex flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/board/${board.id}`}
            className="min-w-0 flex-1 space-y-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <h2 className="line-clamp-2 text-base font-semibold tracking-tight">
              {board.title}
            </h2>
            {board.description ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {board.description}
              </p>
            ) : null}
          </Link>
          <button
            type="button"
            className="ml-2 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 opacity-0 transition hover:bg-slate-800 hover:text-slate-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background group-hover:opacity-100"
            aria-label="Delete board"
            onClick={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Created {formatDisplayDate(board.createdAt)}
        </p>
      </article>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        titleId="delete-board-title"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <h2
              id="delete-board-title"
              className="text-lg font-semibold tracking-tight"
            >
              Delete this board?
            </h2>
            <p className="text-sm text-muted-foreground">
              All columns and cards on{" "}
              <span className="font-medium">{board.title}</span> will be
              removed. This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              aria-label="Confirm delete board"
            >
              Delete board
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export const BoardCard = memo(BoardCardInner);
