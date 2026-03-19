import { useRef, useEffect, useState } from "react";
import type { Card } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MarkdownRenderer } from "@/lib/markdown";
import { useCardForm } from "@/hooks/useCardForm";
import { useCardStore } from "@/store/cardStore";
import { useToastStore } from "@/store/toastStore";
import { X } from "lucide-react";
import { CommentThread } from "@/components/comments/CommentThread";

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 24;
const titleId = "card-detail-title";
const titleErrorId = "card-detail-title-error";

interface CardDetailModalProps {
  open: boolean;
  card: Card | null;
  onClose: () => void;
}

export function CardDetailModal({
  open,
  card,
  onClose,
}: CardDetailModalProps) {
  const { state, setState } = useCardForm(card);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const updateCard = useCardStore((s) => s.updateCard);
  const deleteCard = useCardStore((s) => s.deleteCard);

  useEffect(() => {
    if (open && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [open]);

  if (!card) return null;

  function addTag(tag: string) {
    const trimmed = tag.trim().slice(0, MAX_TAG_LENGTH);
    if (!trimmed) return;
    setState((prev) => {
      if (prev.tags.length >= MAX_TAGS) return prev;
      if (prev.tags.includes(trimmed)) return prev;
      return { ...prev, tags: [...prev.tags, trimmed] };
    });
    setTagInput("");
  }

  function removeTag(index: number) {
    setState((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  }

  function handleTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === ",") {
      event.preventDefault();
      addTag(tagInput);
    }
  }

  function handleTagSubmit(event: React.FormEvent) {
    event.preventDefault();
    addTag(tagInput);
  }

  function handleSave() {
    if (!card) return;
    const trimmed = state.title.trim();
    if (!trimmed) {
      setTitleError("Title is required");
      return;
    }
    setTitleError(null);
    void (async () => {
      try {
        await updateCard(card.id, {
          title: trimmed,
          description: state.description,
          tags: state.tags,
          dueDate: state.dueDate || null,
        });
        useToastStore.getState().addToast("Card updated");
        onClose();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to update card";
        useToastStore.getState().addToast(msg, "error");
      }
    })();
  }

  function handleDeleteConfirm() {
    if (!card) return;
    void (async () => {
      try {
        await deleteCard(card.id);
        useToastStore.getState().addToast("Card deleted");
        setDeleteConfirmOpen(false);
        onClose();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to delete card";
        useToastStore.getState().addToast(msg, "error");
      }
    })();
  }

  const dueDateValue =
    state.dueDate != null
      ? state.dueDate.slice(0, 10)
      : "";

  return (
    <Modal open={open} onClose={onClose} titleId={titleId}>
      <div className="space-y-4">
        <header className="space-y-1">
          <Input
            ref={titleInputRef}
            id={titleId}
            value={state.title}
            maxLength={120}
            onChange={(e) => {
              setState((prev) => ({ ...prev, title: e.target.value }));
              if (titleError) setTitleError(null);
            }}
            aria-invalid={Boolean(titleError)}
            aria-describedby={titleError ? titleErrorId : undefined}
          />
          {titleError && (
            <p id={titleErrorId} className="text-xs text-red-400" role="alert">
              {titleError}
            </p>
          )}
        </header>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <label
              className="block text-xs font-medium text-muted-foreground"
              htmlFor="card-description"
            >
              Description (markdown)
            </label>
            <textarea
              id="card-description"
              className="min-h-[140px] w-full rounded-md border border-border bg-[var(--input-bg)] p-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              value={state.description}
              onChange={(e) =>
                setState((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Preview
            </p>
            <div className="min-h-[140px] rounded-md border border-border bg-[var(--input-bg)] p-3 text-sm shadow-sm">
              <MarkdownRenderer value={state.description} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label
            className="block text-xs font-medium text-muted-foreground"
            htmlFor="card-tags"
          >
            Tags (Enter or comma to add, max {MAX_TAGS}, 24 chars each)
          </label>
          <form onSubmit={handleTagSubmit} className="flex gap-2">
            <Input
              id="card-tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              enterKeyHint="done"
              placeholder="Add tag"
              disabled={state.tags.length >= MAX_TAGS}
            />
            <Button
              type="submit"
              size="sm"
              disabled={state.tags.length >= MAX_TAGS || !tagInput.trim()}
            >
              Add
            </Button>
          </form>
          {state.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1" role="list">
              {state.tags.map((tag, i) => (
                <li key={`${tag}-${i}`} className="inline-flex items-center gap-1">
                  <Badge>{tag}</Badge>
                  <button
                    type="button"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-slate-700 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    aria-label={`Remove tag ${tag}`}
                    onClick={() => removeTag(i)}
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <label
            className="block text-xs font-medium text-muted-foreground"
            htmlFor="card-due-date"
          >
            Due date
          </label>
          <input
            id="card-due-date"
            type="date"
            className="h-10 w-full rounded-md border border-border bg-[var(--input-bg)] px-3 text-sm text-foreground shadow-sm outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            value={dueDateValue}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                dueDate: e.target.value ? e.target.value : null,
              }))
            }
          />
        </div>

        <CommentThread cardId={card.id} />

        {!deleteConfirmOpen ? (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteConfirmOpen(true)}
              aria-label="Delete card"
            >
              Delete card
            </Button>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-[var(--input-bg)] p-4 shadow-sm" role="alertdialog" aria-labelledby="delete-card-heading" aria-describedby="delete-card-desc">
            <h3 id="delete-card-heading" className="text-sm font-semibold">
              Delete this card?
            </h3>
            <p id="delete-card-desc" className="mt-1 text-xs text-muted-foreground">
              This action cannot be undone.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteConfirm}
                aria-label="Confirm delete card"
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

