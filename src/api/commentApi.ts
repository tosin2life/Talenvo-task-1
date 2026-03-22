import type { Comment } from "@/types";
import {
  ApiError,
  maybeThrowRandomFailure,
  mockNetworkDelay,
  readJson,
  writeJson,
  type MockApiOptions,
} from "./mockStorage";

const COMMENTS_KEY = "knowledge-board-api-comments";

type CommentsPersistedShape = {
  state?: {
    comments: Record<string, Comment>;
  };
  version?: number;
};

function readCommentsState(): { comments: Record<string, Comment> } {
  const persisted = readJson<CommentsPersistedShape>(COMMENTS_KEY, {});
  return {
    comments: persisted.state?.comments ?? {},
  };
}

function writeCommentsState(next: { comments: Record<string, Comment> }) {
  const persisted = readJson<CommentsPersistedShape>(COMMENTS_KEY, {});
  writeJson(COMMENTS_KEY, { ...persisted, state: next });
}

export async function listCommentsForCard(
  cardId: string,
  options?: MockApiOptions,
): Promise<Comment[]> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);
  const { comments } = readCommentsState();
  return Object.values(comments)
    .filter((c) => c.cardId === cardId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createComment(
  input: { cardId: string; parentId: string | null; body: string; author?: string },
  options?: MockApiOptions,
): Promise<Comment> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);

  const trimmed = input.body.trim();
  if (!trimmed) {
    throw new ApiError("Comment body is required", {
      status: 400,
      code: "VALIDATION",
    });
  }

  const now = new Date().toISOString();
  const comment: Comment = {
    id: crypto.randomUUID(),
    cardId: input.cardId,
    parentId: input.parentId,
    author: input.author?.trim() || "Guest",
    body: trimmed,
    createdAt: now,
    updatedAt: null,
  };

  const { comments } = readCommentsState();
  writeCommentsState({
    comments: { ...comments, [comment.id]: comment },
  });

  return comment;
}

export async function updateComment(
  id: string,
  body: string,
  options?: MockApiOptions,
): Promise<Comment> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);

  const { comments } = readCommentsState();
  const existing = comments[id];
  if (!existing) {
    throw new ApiError("Comment not found", { status: 404, code: "NOT_FOUND" });
  }

  const trimmed = body.trim();
  if (!trimmed) {
    throw new ApiError("Comment body is required", {
      status: 400,
      code: "VALIDATION",
    });
  }

  const updated: Comment = {
    ...existing,
    body: trimmed,
    updatedAt: new Date().toISOString(),
  };

  writeCommentsState({
    comments: { ...comments, [id]: updated },
  });

  return updated;
}

export async function deleteComment(
  id: string,
  options?: MockApiOptions,
): Promise<Comment> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);

  const { comments } = readCommentsState();
  const existing = comments[id];
  if (!existing) {
    throw new ApiError("Comment not found", { status: 404, code: "NOT_FOUND" });
  }

  const updated: Comment = {
    ...existing,
    isDeleted: true,
    body: "",
    updatedAt: new Date().toISOString(),
  };

  writeCommentsState({
    comments: { ...comments, [id]: updated },
  });

  return updated;
}

