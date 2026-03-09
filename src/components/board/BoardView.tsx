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

interface BoardViewProps {
  boardId: string;
}

export function BoardView({ boardId }: BoardViewProps) {
  const setActiveBoardId = useUIStore((state) => state.setActiveBoardId);
  const { board } = useBoard(boardId);

  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [columnError, setColumnError] = useState<string | null>(null);
  const createColumn = useColumnStore((state) => state.createColumn);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const cardsById = useCardStore((state) => state.cards);
  const selectedCard =
    selectedCardId != null ? (cardsById[selectedCardId] ?? null) : null;

  useEffect(() => {
    setActiveBoardId(boardId);
  }, [boardId, setActiveBoardId]);

  function handleCreateColumn(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = newColumnTitle.trim();

    if (!trimmed) {
      setColumnError("Column name is required");
      return;
    }

    createColumn(boardId, trimmed);
    setNewColumnTitle("");
    setColumnError(null);
  }

  const handleOpenCardDetail = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
    setCardModalOpen(true);
  }, []);

  const handleCloseCardModal = useCallback(() => {
    setCardModalOpen(false);
    setSelectedCardId(null);
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-white/20"
            >
              &larr; Back to boards
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">
              {board?.title ?? "Board"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {board?.description ||
                "Organise work into columns and cards on this board."}
            </p>
          </div>
        </header>

        <section
          aria-label="Board columns"
          className="min-h-[60vh] rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-start gap-4 overflow-x-auto pb-2">
            <ColumnList
              boardId={boardId}
              onOpenCardDetail={handleOpenCardDetail}
            />

            <form
              onSubmit={handleCreateColumn}
              className="flex w-72 flex-shrink-0 flex-col gap-2 rounded-lg border border-dashed border-border bg-slate-950/50 p-3"
            >
              <label
                htmlFor="new-column-title"
                className="text-xs font-medium text-muted-foreground"
              >
                Add column
              </label>
              <Input
                id="new-column-title"
                value={newColumnTitle}
                onChange={(event) => {
                  setNewColumnTitle(event.target.value);
                  if (columnError) setColumnError(null);
                }}
                placeholder="Column name"
                onBlur={() => {
                  if (!newColumnTitle.trim()) {
                    setColumnError("Column name is required");
                  }
                }}
                aria-invalid={Boolean(columnError)}
              />
              {columnError ? (
                <p className="text-xs text-red-400">{columnError}</p>
              ) : null}
              <div className="flex justify-end">
                <Button type="submit" size="sm">
                  + Add Column
                </Button>
              </div>
            </form>
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
