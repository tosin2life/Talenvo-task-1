import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Comment } from "@/types";
import * as commentApi from "@/api/commentApi";

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
      },
      deleteComment: async (id) => {
        const updated = await commentApi.deleteComment(id);
        set((state) => {
          if (!state.comments[id]) return state;
          return {
            comments: { ...state.comments, [id]: updated },
          };
        });
      },
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

