"use client";

import { useEffect, useState } from "react";
import type { Comment } from "@/types";
import { useCommentStore } from "@/store/commentStore";
import * as commentApi from "@/api/commentApi";
import { Button } from "@/components/ui/Button";

interface CommentThreadProps {
  cardId: string;
}

const EMPTY_ROOT_IDS: string[] = [];

export function CommentThread({ cardId }: CommentThreadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const rootIds = useCommentStore(
    (s) => s.rootIdsByCard[cardId] ?? EMPTY_ROOT_IDS,
  );
  const commentsById = useCommentStore((s) => s.comments);
  const childIdsByParent = useCommentStore((s) => s.childIdsByParent);
  const setCommentsForCard = useCommentStore((s) => s.setCommentsForCard);
  const addComment = useCommentStore((s) => s.addComment);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    commentApi
      .listCommentsForCard(cardId)
      .then((comments) => {
        if (cancelled) return;
        setCommentsForCard(cardId, comments);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load comments");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cardId, setCommentsForCard]);

  async function handleAddRootComment() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    try {
      setError(null);
      await addComment(cardId, null, trimmed);
      setDraft("");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to add comment";
      setError(message);
    }
  }

  function renderChildren(parentId: string, level: number) {
    const ids = childIdsByParent[parentId] ?? [];
    if (ids.length === 0) return null;
    // Allow at least 2 levels; beyond that we still render but keep simple.
    return (
      <ul className="mt-2 space-y-2 border-l border-border pl-3" role="list">
        {ids.map((id) => (
          <li key={id}>
            <CommentItem
              comment={commentsById[id]}
              cardId={cardId}
              level={level + 1}
            />
            {renderChildren(id, level + 1)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section aria-label="Comments" className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight">Comments</h2>

      <div className="space-y-2">
        <textarea
          rows={2}
          placeholder="Add a comment..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full min-h-[64px] rounded-md border border-border bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground shadow-[0_1px_3px_0_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08)] outline-none placeholder:text-muted-foreground focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleAddRootComment}
            disabled={loading}
          >
            Comment
          </Button>
        </div>
      </div>

      {loading && rootIds.length === 0 ? (
        <p className="text-xs text-muted-foreground">Loading comments…</p>
      ) : null}

      {rootIds.length > 0 ? (
        <ul className="space-y-3" role="list">
          {rootIds.map((id) => (
            <li key={id}>
              <CommentItem comment={commentsById[id]} cardId={cardId} level={0} />
              {renderChildren(id, 0)}
            </li>
          ))}
        </ul>
      ) : !loading ? (
        <p className="text-xs text-muted-foreground">
          No comments yet. Be the first to comment.
        </p>
      ) : null}
    </section>
  );
}

interface CommentItemProps {
  comment: Comment | undefined;
  cardId: string;
  level: number;
}

function CommentItem({ comment, cardId, level }: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [editDraft, setEditDraft] = useState(comment?.body ?? "");
  const [error, setError] = useState<string | null>(null);

  const addComment = useCommentStore((s) => s.addComment);
  const editComment = useCommentStore((s) => s.editComment);
  const deleteComment = useCommentStore((s) => s.deleteComment);

  if (!comment) return null;

  const disabled = comment.isDeleted;

  async function handleReply() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!comment) return;
    try {
      setError(null);
      await addComment(cardId, comment.id, trimmed);
      setDraft("");
      setIsReplying(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to reply";
      setError(message);
    }
  }

  async function handleSaveEdit() {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    if (!comment) return;
    try {
      setError(null);
      await editComment(comment.id, trimmed);
      setIsEditing(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update comment";
      setError(message);
    }
  }

  async function handleDelete() {
    if (!comment) return;
    try {
      setError(null);
      await deleteComment(comment.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete comment";
      setError(message);
    }
  }

  const maxIndent = Math.min(level, 3);

  return (
    <article
      className="space-y-1 rounded-md border border-border bg-[var(--input-bg)] p-2 text-xs shadow-sm"
      style={{ marginLeft: maxIndent > 0 ? maxIndent * 4 : 0 }}
    >
      <header className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{comment.author}</span>
        {comment.updatedAt ? (
          <span className="text-[10px] text-muted-foreground">
            edited
          </span>
        ) : null}
      </header>
      <div className="text-xs text-foreground">
        {comment.isDeleted ? (
          <span className="italic text-muted-foreground">
            Comment deleted
          </span>
        ) : isEditing ? (
          <textarea
            className="mt-1 w-full rounded-md border border-border bg-[var(--input-bg)] p-1 text-xs shadow-[0_1px_3px_0_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08)] outline-none placeholder:text-muted-foreground focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
            placeholder="Edit your comment"
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
          />
        ) : (
          comment.body
        )}
      </div>
      {error ? <p className="text-[10px] text-red-400">{error}</p> : null}
      {!comment.isDeleted && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {!isEditing && (
            <button
              type="button"
              className="text-[10px] text-sky-400 hover:underline"
              onClick={() => {
                setIsReplying((open) => !open);
                setError(null);
              }}
            >
              Reply
            </button>
          )}
          {!isEditing && (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:underline"
              onClick={() => {
                setIsEditing(true);
                setEditDraft(comment.body);
                setError(null);
              }}
            >
              Edit
            </button>
          )}
          {!isEditing && (
            <button
              type="button"
              className="text-[10px] text-red-400 hover:underline"
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
          {isEditing && (
            <>
              <button
                type="button"
                className="text-[10px] text-sky-400 hover:underline"
                onClick={handleSaveEdit}
              >
                Save
              </button>
              <button
                type="button"
                className="text-[10px] text-muted-foreground hover:underline"
                onClick={() => {
                  setIsEditing(false);
                  setEditDraft(comment.body);
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}
      {isReplying && !disabled && (
        <div className="mt-2 space-y-1">
          <textarea
            className="w-full rounded-md border border-border bg-[var(--input-bg)] p-1 text-xs shadow-[0_1px_3px_0_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08)] outline-none placeholder:text-muted-foreground focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
            placeholder="Write a reply..."
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex justify-end gap-1">
            <Button type="button" size="sm" onClick={handleReply}>
              Reply
            </Button>
            <Button
              type="button"
              size="sm"
              variant="cancel"
              onClick={() => {
                setIsReplying(false);
                setDraft("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

