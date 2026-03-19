import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useBoardStore } from "@/store/boardStore";
import { useToastStore } from "@/store/toastStore";

interface CreateBoardModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateBoardModal({ open, onClose }: CreateBoardModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBoard = useBoardStore((state) => state.createBoard);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (isSubmitting) return;

    const trimmed = title.trim();
    if (!trimmed) {
      setError("Board title is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await createBoard({
        title: trimmed.slice(0, 80),
        description: description.slice(0, 300),
      });

      setTitle("");
      setDescription("");
      setError(null);
      useToastStore.getState().addToast("Board created");
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create board";
      setError(message);
      useToastStore.getState().addToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const titleId = "create-board-title";
  const descriptionId = "create-board-description";
  const errorId = "create-board-error";

  return (
    <Modal open={open} onClose={onClose} titleId={titleId}>
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-1">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            Create board
          </h2>
          <p
            id={descriptionId}
            className="text-xs text-muted-foreground"
          >
            Give your board a clear, descriptive title so your team knows what
            belongs here.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="board-title">
            Title
          </label>
          <Input
            id="board-title"
            value={title}
            maxLength={80}
            onChange={(event) => {
              setTitle(event.target.value);
              if (error) setError(null);
            }}
            onBlur={() => {
              if (!title.trim()) {
                setError("Board title is required");
              }
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            autoFocus
          />
          {error ? (
            <p
              id={errorId}
              className="text-xs text-red-400"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            className="block text-sm font-medium"
            htmlFor="board-description"
          >
            Description
          </label>
          <textarea
            id="board-description"
            className="min-h-[80px] w-full rounded-md border border-border bg-[var(--input-bg)] p-3 text-sm text-foreground shadow-[0_1px_3px_0_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08)] outline-none placeholder:text-muted-foreground focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            value={description}
            maxLength={300}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="cancel"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Create board
          </Button>
        </div>
      </form>
    </Modal>
  );
}

