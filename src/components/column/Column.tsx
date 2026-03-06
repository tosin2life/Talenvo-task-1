import { useState, memo } from "react";
import type { Column as ColumnType, Card as CardType } from "@/types";
import { KanbanCard } from "./KanbanCard";
import { useColumnStore } from "@/store/columnStore";
import { useCardStore } from "@/store/cardStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface ColumnProps {
  column: ColumnType;
  cards: CardType[];
  onOpenCardDetail?: (cardId: string) => void;
}

function ColumnInner({ column, cards, onOpenCardDetail }: ColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateColumn = useColumnStore((state) => state.updateColumn);
  const deleteColumn = useColumnStore((state) => state.deleteColumn);

  const createCard = useCardStore((state) => state.createCard);

  const [newCardTitle, setNewCardTitle] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);

  function handleSaveTitle() {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleDraft(column.title);
    } else if (trimmed !== column.title) {
      updateColumn(column.id, { title: trimmed });
    }
    setIsEditingTitle(false);
  }

  function handleDeleteColumn() {
    deleteColumn(column.id);
    setDeleteOpen(false);
  }

  function handleCreateCard() {
    const trimmed = newCardTitle.trim();
    if (!trimmed) {
      setCardError("Card title is required");
      return;
    }
    createCard(column.id, trimmed);
    setNewCardTitle("");
    setCardError(null);
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
        className="flex w-72 flex-shrink-0 flex-col rounded-lg border border-border bg-slate-900/60 p-3"
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
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-muted-foreground">
              {cards.length}
            </span>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Delete column"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <ul
          className="flex flex-1 flex-col gap-2 list-none p-0 m-0"
          role="list"
          aria-label={`Cards in ${column.title}`}
        >
          {cards.length === 0 ? (
            <li>
              <button
                type="button"
                className="flex h-16 w-full items-center justify-center rounded-md border border-dashed border-slate-700 text-xs text-muted-foreground hover:border-sky-500 hover:text-sky-400"
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
          ) : (
            cards.map((card) => (
              <li key={card.id} role="listitem">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onOpenCardDetail?.(card.id)}
                >
                  <KanbanCard card={card} />
                </button>
              </li>
            ))
          )}
        </ul>

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
          <Button type="button" variant="ghost" onClick={onCancel}>
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
