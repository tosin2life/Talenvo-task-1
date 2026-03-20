"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ColumnList } from "@/components/column/ColumnList";
import { useUIStore } from "@/store/uiStore";
import { useBoard } from "@/hooks/useBoard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useColumnStore } from "@/store/columnStore";
import { CardDetailModal } from "@/components/column/CardDetailModal";
import { Modal } from "@/components/ui/Modal";
import { useCardStore } from "@/store/cardStore";
import { useUndoStore } from "@/store/undoStore";
import { useToastStore } from "@/store/toastStore";
import { RotateCcw, RotateCw } from "lucide-react";

interface BoardViewProps {
  boardId: string;
}

export function BoardView({ boardId }: BoardViewProps) {
  const setActiveBoardId = useUIStore((state) => state.setActiveBoardId);
  const { board, columnsWithCardIds } = useBoard(boardId);

  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [columnError, setColumnError] = useState<string | null>(null);
  const [isColumnFormOpen, setIsColumnFormOpen] = useState(false);
  const createColumn = useColumnStore((state) => state.createColumn);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const cardsById = useCardStore((state) => state.cards);
  const selectedCard =
    selectedCardId != null ? (cardsById[selectedCardId] ?? null) : null;

  useEffect(() => {
    setActiveBoardId(boardId);
  }, [boardId, setActiveBoardId]);

  useEffect(() => {
    if (board?.title) {
      document.title = `Knowledge Board | ${board.title}`;
    }

    return () => {
      document.title = "Collaborative Knowledge Board";
    };
  }, [board?.title]);

  async function handleCreateColumn(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = newColumnTitle.trim();

    if (!trimmed) {
      setColumnError("Column name is required");
      return;
    }

    try {
      await createColumn(boardId, trimmed);
      setNewColumnTitle("");
      setColumnError(null);
      useToastStore.getState().addToast("Column created");
      setIsColumnFormOpen(false);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to create column";
      setColumnError(message);
      useToastStore.getState().addToast(message, "error");
    }
  }

  const handleOpenCardDetail = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
    setCardModalOpen(true);
  }, []);

  const handleCloseCardModal = useCallback(() => {
    setCardModalOpen(false);
    setSelectedCardId(null);
  }, []);

  const undo = useUndoStore((s) => s.undo);
  const redo = useUndoStore((s) => s.redo);
  const canUndo = useUndoStore((s) => s.undoStack.length > 0);
  const canRedo = useUndoStore((s) => s.redoStack.length > 0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        void undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        void redo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {board?.title ?? "Board"}
            </h1>
            <p className="text-sm text-muted-foreground break-words max-w-[820px]">
              {board?.description ||
                "Organise work into columns and cards on this board."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void undo()}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo (Ctrl+Z)"
              className="px-2"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Undo</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void redo()}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              aria-label="Redo (Ctrl+Y)"
              className="px-2"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Redo</span>
            </Button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-500 px-3 text-xs font-medium text-white transition-colors hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:bg-sky-500/40 h-9"
            >
              Back to boards
            </Link>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setIsColumnFormOpen((open) => !open);
                setColumnError(null);
              }}
            >
              + Add column
            </Button>
          </div>
        </header>

        <section
          aria-label="Board columns"
          className="min-h-[60vh] rounded-lg border border-border bg-card p-4"
        >
          {columnsWithCardIds.length === 0 ? (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center"
              aria-labelledby="empty-columns-title"
            >
              <h2
                id="empty-columns-title"
                className="text-lg font-semibold tracking-tight"
              >
                Add your first column
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Columns organise your cards into groups. Create a column to
                start adding cards to this board.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setIsColumnFormOpen(true);
                  setColumnError(null);
                }}
              >
                + Add column
              </Button>
            </div>
          ) : (
            <div className="flex items-start gap-4 overflow-x-auto pb-2">
              <ColumnList
                boardId={boardId}
                onOpenCardDetail={handleOpenCardDetail}
              />
            </div>
          )}
        </section>
      </div>

      <Modal
        open={isColumnFormOpen}
        onClose={() => {
          setIsColumnFormOpen(false);
          setNewColumnTitle("");
          setColumnError(null);
        }}
        titleId="add-column-title"
      >
        <form
          onSubmit={handleCreateColumn}
          className="flex flex-col gap-4"
        >
          <h2 id="add-column-title" className="text-lg font-semibold tracking-tight">
            Add column
          </h2>
          <div className="space-y-2">
            <label
              htmlFor="new-column-title"
              className="block text-sm font-medium text-foreground"
            >
              Column name
            </label>
            <Input
              id="new-column-title"
              value={newColumnTitle}
              onChange={(event) => {
                setNewColumnTitle(event.target.value);
                if (columnError) setColumnError(null);
              }}
              placeholder="Enter column name"
              aria-invalid={Boolean(columnError)}
            />
            {columnError ? (
              <p className="text-xs text-red-400">{columnError}</p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="cancel"
              size="sm"
              onClick={() => {
                setIsColumnFormOpen(false);
                setNewColumnTitle("");
                setColumnError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Create column
            </Button>
          </div>
        </form>
      </Modal>

      <CardDetailModal
        open={cardModalOpen}
        card={selectedCard}
        onClose={handleCloseCardModal}
      />
    </main>
  );
}
