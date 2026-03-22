import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Comment } from "@/types";
import * as commentApi from "@/api/commentApi";
import { publishRealtime } from "@/realtime/realtimeClient";

type CommentState = {
  comments: Record<string, Comment>;
  rootIdsByCard: Record<string, string[]>;
  childIdsByParent: Record<string, string[]>;
};

type CommentActions = {
  setCommentsForCard: (cardId: string, comments: Comment[]) => void;
  addComment: (
    cardId: string,
    parentId: string | null,
    body: string,
  ) => Promise<Comment>;
  editComment: (id: string, body: string) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
  applyRemoteCommentCreated: (comment: Comment) => void;
  applyRemoteCommentUpdated: (comment: Comment) => void;
  applyRemoteCommentDeleted: (comment: Comment) => void;
};

type CommentStore = CommentState & CommentActions;

export const useCommentStore = create<CommentStore>()(
  persist(
    (set, get) => ({
      comments: {},
      rootIdsByCard: {},
      childIdsByParent: {},
      setCommentsForCard: (cardId, comments) =>
        set((state) => {
          const nextComments = { ...state.comments };
          const rootIds: string[] = [];
          const childIdsByParent: Record<string, string[]> = {
            ...state.childIdsByParent,
          };

          for (const c of comments) {
            nextComments[c.id] = c;
          }

          for (const c of comments) {
            if (c.parentId == null) {
              rootIds.push(c.id);
            } else {
              if (!childIdsByParent[c.parentId]) {
                childIdsByParent[c.parentId] = [];
              }
              if (!childIdsByParent[c.parentId].includes(c.id)) {
                childIdsByParent[c.parentId].push(c.id);
              }
            }
          }

          return {
            comments: nextComments,
            rootIdsByCard: {
              ...state.rootIdsByCard,
              [cardId]: rootIds,
            },
            childIdsByParent,
          };
        }),
      addComment: async (cardId, parentId, body) => {
        const comment = await commentApi.createComment({ cardId, parentId, body });
        set((state) => {
          const comments = { ...state.comments, [comment.id]: comment };
          const rootIdsByCard = { ...state.rootIdsByCard };
          const childIdsByParent = { ...state.childIdsByParent };

          if (parentId == null) {
            const existing = rootIdsByCard[cardId] ?? [];
            rootIdsByCard[cardId] = [...existing, comment.id];
          } else {
            const existing = childIdsByParent[parentId] ?? [];
            childIdsByParent[parentId] = [...existing, comment.id];
          }

          return {
            comments,
            rootIdsByCard,
            childIdsByParent,
          };
        });
        publishRealtime({ type: "comment:created", payload: { comment } });
        return comment;
      },
      editComment: async (id, body) => {
        const updated = await commentApi.updateComment(id, body);
        set((state) => {
          if (!state.comments[id]) return state;
          return {
            comments: { ...state.comments, [id]: updated },
          };
        });
        publishRealtime({ type: "comment:updated", payload: { comment: updated } });
      },
      deleteComment: async (id) => {
        const updated = await commentApi.deleteComment(id);
        set((state) => {
          if (!state.comments[id]) return state;
          return {
            comments: { ...state.comments, [id]: updated },
          };
        });
        publishRealtime({ type: "comment:deleted", payload: { comment: updated } });
      },
      applyRemoteCommentCreated: (comment) =>
        set((state) => {
          if (state.comments[comment.id]) return state;
          const comments = { ...state.comments, [comment.id]: comment };
          const rootIdsByCard = { ...state.rootIdsByCard };
          const childIdsByParent = { ...state.childIdsByParent };

          if (comment.parentId == null) {
            const existing = rootIdsByCard[comment.cardId] ?? [];
            rootIdsByCard[comment.cardId] = [...existing, comment.id];
          } else {
            const existing = childIdsByParent[comment.parentId] ?? [];
            childIdsByParent[comment.parentId] = [...existing, comment.id];
          }

          return {
            comments,
            rootIdsByCard,
            childIdsByParent,
          };
        }),
      applyRemoteCommentUpdated: (comment) =>
        set((state) => {
          if (!state.comments[comment.id]) return state;
          return {
            comments: { ...state.comments, [comment.id]: comment },
          };
        }),
      applyRemoteCommentDeleted: (comment) =>
        set((state) => {
          if (!state.comments[comment.id]) return state;
          return {
            comments: { ...state.comments, [comment.id]: comment },
          };
        }),
    }),
    {
      name: "knowledge-board-comments",
      partialize: (state) => ({
        comments: state.comments,
        rootIdsByCard: state.rootIdsByCard,
        childIdsByParent: state.childIdsByParent,
      }),
      skipHydration: true,
    },
  ),
);

