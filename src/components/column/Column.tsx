import { useState, memo, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Column as ColumnType } from "@/types";
import { KanbanCard } from "./KanbanCard";
import { VirtualCardList, VIRTUAL_THRESHOLD } from "./VirtualCardList";
import { useColumnStore } from "@/store/columnStore";
import { useCardStore } from "@/store/cardStore";
import { useToastStore } from "@/store/toastStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface ColumnProps {
  column: ColumnType;
  cardIds: string[];
  onOpenCardDetail?: (cardId: string) => void;
}

function ColumnInner({ column, cardIds, onOpenCardDetail }: ColumnProps) {
  const cards = useCardStore(
    useShallow((s) => cardIds.map((id) => s.cards[id]).filter(Boolean)),
  );
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateColumn = useColumnStore((state) => state.updateColumn);
  const deleteColumn = useColumnStore((state) => state.deleteColumn);

  const createCard = useCardStore((state) => state.createCard);

  const [newCardTitle, setNewCardTitle] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);

  const moveCard = useCardStore((state) => state.moveCard);

  const handleCardDragStart = useCallback(
    (event: React.DragEvent<HTMLButtonElement>, cardId: string) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(
        "application/x-knowledge-card",
        JSON.stringify({
          cardId,
          fromColumnId: column.id,
        }),
      );
    },
    [column.id],
  );

  const handleCardDropOnList = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/x-knowledge-card");
      if (!raw) return;
      let parsed: { cardId: string; fromColumnId: string } | null = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }
      if (!parsed) return;

      const { cardId, fromColumnId } = parsed;
      void moveCard(cardId, fromColumnId, column.id, cardIds.length);
    },
    [cardIds.length, column.id, moveCard],
  );

  const handleCardDropOnItem = useCallback(
    (
      event: React.DragEvent<HTMLButtonElement>,
      targetCardId: string,
      targetIndex: number,
    ) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/x-knowledge-card");
      if (!raw) return;
      let parsed: { cardId: string; fromColumnId: string } | null = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }
      if (!parsed) return;

      const { cardId, fromColumnId } = parsed;
      if (cardId === targetCardId && fromColumnId === column.id) return;

      void moveCard(cardId, fromColumnId, column.id, targetIndex);
    },
    [column.id, moveCard],
  );

  const handleAllowDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  function handleSaveTitle() {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleDraft(column.title);
    } else if (trimmed !== column.title) {
      void updateColumn(column.id, { title: trimmed });
    }
    setIsEditingTitle(false);
  }

  function handleDeleteColumn() {
    void (async () => {
      try {
        await deleteColumn(column.id);
        useToastStore.getState().addToast("Column deleted");
        setDeleteOpen(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to delete column";
        useToastStore.getState().addToast(msg, "error");
      }
    })();
  }

  function handleCreateCard() {
    const trimmed = newCardTitle.trim();
    if (!trimmed) {
      setCardError("Card title is required");
      return;
    }
    void (async () => {
      try {
        const newCard = await createCard(column.id, trimmed);
        setNewCardTitle("");
        setCardError(null);
        useToastStore.getState().addToast("Card created");
        onOpenCardDetail?.(newCard.id);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to create card";
        setCardError(message);
        useToastStore.getState().addToast(message, "error");
      }
    })();
  }

  function handleKeyDownTitle(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSaveTitle();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setTitleDraft(column.title);
      setIsEditingTitle(false);
    }
  }

  return (
    <>
      <section
        aria-label={column.title}
        className="flex w-72 flex-shrink-0 flex-col rounded-lg border border-border bg-[var(--column-bg)] p-3 text-foreground"
      >
        <header className="mb-2 flex items-center justify-between gap-2">
          {isEditingTitle ? (
            <Input
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleKeyDownTitle}
              className="h-8 flex-1 text-xs"
              aria-label="Column title"
              placeholder="Column title"
            />
          ) : (
            <button
              type="button"
              className="flex-1 truncate text-left text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() => setIsEditingTitle(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setIsEditingTitle(true);
                }
              }}
              aria-label={`Edit column title, current: ${column.title}`}
            >
              {column.title}
            </button>
          )}
          <div className="flex items-center gap-1">
            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-50">
              {cards.length}
            </span>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--column-delete-icon)] hover:bg-[var(--column-delete-hover-bg)] hover:text-[var(--column-delete-hover-icon)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Delete column"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {cards.length === 0 ? (
          <ul
            className="flex flex-1 flex-col gap-2 list-none p-0 m-0"
            role="list"
            aria-label={`Cards in ${column.title}`}
            onDragOver={handleAllowDrop}
            onDrop={handleCardDropOnList}
          >
            <li className="flex flex-1 flex-col items-center justify-center gap-2 py-6">
              <p className="text-xs text-foreground/70">No cards yet</p>
              <button
                type="button"
                  className="flex h-12 min-w-[140px] items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-card/30 text-xs text-foreground/70 hover:border-sky-500 hover:text-sky-400"
                onClick={() => {
                  const input = document.getElementById(
                    `new-card-title-${column.id}`,
                  ) as HTMLInputElement | null;
                  input?.focus();
                }}
                aria-label="Add a card to this column"
              >
                + Add a card
              </button>
            </li>
          </ul>
        ) : cards.length > VIRTUAL_THRESHOLD ? (
          <div
            className="flex flex-1 flex-col min-h-0"
            onDragOver={handleAllowDrop}
            onDrop={handleCardDropOnList}
          >
            <VirtualCardList
              items={cards}
              getKey={(c) => c.id}
              renderItem={(card, index) => (
                <button
                  type="button"
                  className="w-full text-left cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => handleCardDragStart(e, card.id)}
                  onDragOver={handleAllowDrop}
                  onDrop={(e) => handleCardDropOnItem(e, card.id, index)}
                  onClick={() => onOpenCardDetail?.(card.id)}
                >
                  <KanbanCard card={card} />
                </button>
              )}
            />
          </div>
        ) : (
          <ul
            className="flex flex-1 flex-col gap-2 list-none p-0 m-0"
            role="list"
            aria-label={`Cards in ${column.title}`}
            onDragOver={handleAllowDrop}
            onDrop={handleCardDropOnList}
          >
            {cards.map((card, index) => (
              <li key={card.id} role="listitem">
                <button
                  type="button"
                  className="w-full text-left cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(event) => handleCardDragStart(event, card.id)}
                  onDragOver={handleAllowDrop}
                  onDrop={(event) =>
                    handleCardDropOnItem(event, card.id, index)
                  }
                  onClick={() => onOpenCardDetail?.(card.id)}
                >
                  <KanbanCard card={card} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 space-y-2">
          <Input
            id={`new-card-title-${column.id}`}
            value={newCardTitle}
            onChange={(event) => {
              setNewCardTitle(event.target.value);
              if (cardError) setCardError(null);
            }}
            placeholder="+ Add a card"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleCreateCard();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setNewCardTitle("");
                setCardError(null);
              }
            }}
          />
          {cardError ? (
            <p className="text-xs text-red-400">{cardError}</p>
          ) : null}
        </div>
      </section>

      <DeleteColumnModal
        open={deleteOpen}
        columnTitle={column.title}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDeleteColumn}
      />
    </>
  );
}

interface DeleteColumnModalProps {
  open: boolean;
  columnTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteColumnModal({
  open,
  columnTitle,
  onCancel,
  onConfirm,
}: DeleteColumnModalProps) {
  return (
    <Modal open={open} onClose={onCancel} titleId="delete-column-title">
      <div className="space-y-4">
        <div className="space-y-1">
          <h2
            id="delete-column-title"
            className="text-lg font-semibold tracking-tight"
          >
            Delete this column?
          </h2>
          <p className="text-sm text-muted-foreground">
            All cards in <span className="font-medium">{columnTitle}</span> will
            be deleted. This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="cancel" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            aria-label="Confirm delete column"
          >
            Delete column
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export const Column = memo(ColumnInner);
