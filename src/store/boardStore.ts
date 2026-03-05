import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Board } from "@/types";

type BoardState = {
  boards: Record<string, Board>;
  boardIds: string[];
};

type BoardActions = {
  setInitialBoards: (boards: Board[]) => void;
  createBoard: (input: { title: string; description: string }) => Board;
  updateBoard: (
    id: string,
    changes: Pick<Partial<Board>, "title" | "description">,
  ) => void;
  deleteBoard: (id: string) => void;
};

type BoardStore = BoardState & BoardActions;

export const useBoardStore = create<BoardStore>()(
  persist(
    (set) => ({
  boards: {},
  boardIds: [],
  setInitialBoards: (boards) =>
    set(() => {
      const byId: Record<string, Board> = {};
      const ids: string[] = [];

      for (const board of boards) {
        byId[board.id] = board;
        ids.push(board.id);
      }

      return {
        boards: byId,
        boardIds: ids,
      };
    }),
  createBoard: ({ title, description }) => {
    const board: Board = {
      id: nanoid(),
      title,
      description,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      boards: {
        ...state.boards,
        [board.id]: board,
      },
      boardIds: [...state.boardIds, board.id],
    }));

    return board;
  },
  updateBoard: (id, changes) =>
    set((state) => {
      const existing = state.boards[id];
      if (!existing) return state;

      const updated: Board = {
        ...existing,
        ...changes,
      };

      return {
        boards: {
          ...state.boards,
          [id]: updated,
        },
      };
    }),
  deleteBoard: (id) =>
    set((state) => {
      if (!state.boards[id]) return state;

      const { [id]: _removed, ...rest } = state.boards;

      return {
        boards: rest,
        boardIds: state.boardIds.filter((boardId) => boardId !== id),
      };
    }),
  }),
  {
    name: "knowledge-board-boards",
    partialize: (state) => ({ boards: state.boards, boardIds: state.boardIds }),
    skipHydration: true,
  }
));

