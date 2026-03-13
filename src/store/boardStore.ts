import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Board } from "@/types";
import { boardApi } from "@/api";

type BoardState = {
  boards: Record<string, Board>;
  boardIds: string[];
};

type BoardActions = {
  setInitialBoards: (boards: Board[]) => void;
  createBoard: (input: { title: string; description: string }) => Promise<Board>;
  updateBoard: (
    id: string,
    changes: Pick<Partial<Board>, "title" | "description">,
  ) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
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
      createBoard: async ({ title, description }) => {
        const board = await boardApi.createBoard({ title, description });

        set((state) => ({
          boards: { ...state.boards, [board.id]: board },
          boardIds: state.boardIds.includes(board.id)
            ? state.boardIds
            : [...state.boardIds, board.id],
        }));

        return board;
      },
      updateBoard: async (id, changes) => {
        const updated = await boardApi.updateBoard(id, changes);
        set((state) => {
          if (!state.boards[id]) return state;
          return {
            boards: { ...state.boards, [id]: updated },
          };
        });
      },
      deleteBoard: async (id) => {
        await boardApi.deleteBoard(id);
        set((state) => {
          if (!state.boards[id]) return state;
          const rest = { ...state.boards };
          delete rest[id];
          return {
            boards: rest,
            boardIds: state.boardIds.filter((boardId) => boardId !== id),
          };
        });
      },
    }),
    {
      name: "knowledge-board-boards",
      partialize: (state) => ({
        boards: state.boards,
        boardIds: state.boardIds,
      }),
      skipHydration: true,
    },
  ),
);
