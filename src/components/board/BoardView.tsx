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
import { useCardStore } from "@/store/cardStore";
import { useUndoStore } from "@/store/undoStore";

interface BoardViewProps {
  boardId: string;
}

export function BoardView({ boardId }: BoardViewProps) {
  const setActiveBoardId = useUIStore((state) => state.setActiveBoardId);
  const { board } = useBoard(boardId);

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
      setIsColumnFormOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create column";
      setColumnError(message);
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
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {board?.title ?? "Board"}
            </h1>
            <p className="text-sm text-muted-foreground">
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
            >
              Undo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void redo()}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >
              Redo
            </Button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-slate-900/60 px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

        {isColumnFormOpen ? (
          <form
            onSubmit={handleCreateColumn}
            className="ml-auto flex w-full max-w-sm flex-col gap-2 rounded-lg border border-border bg-slate-950/40 p-3"
          >
            <label
              htmlFor="new-column-title"
              className="text-xs font-medium text-muted-foreground"
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
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
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
        ) : null}

        <section
          aria-label="Board columns"
          className="min-h-[60vh] rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-start gap-4 overflow-x-auto pb-2">
            <ColumnList
              boardId={boardId}
              onOpenCardDetail={handleOpenCardDetail}
            />
          </div>
        </section>
      </div>

      <CardDetailModal
        open={cardModalOpen}
        card={selectedCard}
        onClose={handleCloseCardModal}
      />
    </main>
  );
}
