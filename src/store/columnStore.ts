import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Column } from "@/types";
import { columnApi } from "@/api";

type ColumnState = {
  columns: Record<string, Column>;
  columnIds: Record<string, string[]>;
};

type ColumnActions = {
  setInitialColumns: (columns: Column[]) => void;
  createColumn: (boardId: string, title: string) => Promise<Column>;
  updateColumn: (
    id: string,
    changes: Pick<Partial<Column>, "title" | "order">,
  ) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  removeColumnsByBoard: (boardId: string) => string[];
};

type ColumnStore = ColumnState & ColumnActions;

export const useColumnStore = create<ColumnStore>()(
  persist(
    (set) => ({
  columns: {},
  columnIds: {},
  setInitialColumns: (columns) =>
    set(() => {
      const byId: Record<string, Column> = {};
      const idsByBoard: Record<string, string[]> = {};

      for (const column of columns) {
        byId[column.id] = column;
        if (!idsByBoard[column.boardId]) {
          idsByBoard[column.boardId] = [];
        }
        idsByBoard[column.boardId].push(column.id);
      }

      return {
        columns: byId,
        columnIds: idsByBoard,
      };
    }),
  createColumn: async (boardId, title) => {
    const column = await columnApi.createColumn(boardId, title);

    set((state) => {
      const existingIds = state.columnIds[boardId] ?? [];
      return {
        columns: { ...state.columns, [column.id]: column },
        columnIds: { ...state.columnIds, [boardId]: [...existingIds, column.id] },
      };
    });

    return column;
  },
  updateColumn: async (id, changes) => {
    const updated = await columnApi.updateColumn(id, changes);
    set((state) => {
      if (!state.columns[id]) return state;
      return { columns: { ...state.columns, [id]: updated } };
    });
  },
  deleteColumn: async (id) => {
    await columnApi.deleteColumn(id);
    set((state) => {
      const existing = state.columns[id];
      if (!existing) return state;

      const { [id]: _removed, ...restColumns } = state.columns;
      const idsForBoard = state.columnIds[existing.boardId] ?? [];

      return {
        columns: restColumns,
        columnIds: {
          ...state.columnIds,
          [existing.boardId]: idsForBoard.filter((columnId) => columnId !== id),
        },
      };
    });
  },
  removeColumnsByBoard: (boardId) => {
    let removedIds: string[] = [];

    set((state) => {
      const idsForBoard = state.columnIds[boardId] ?? [];
      if (idsForBoard.length === 0) {
        removedIds = [];
        return state;
      }

      const nextColumns: Record<string, Column> = { ...state.columns };
      for (const id of idsForBoard) {
        delete nextColumns[id];
      }

      const nextColumnIds: Record<string, string[]> = {
        ...state.columnIds,
      };
      delete nextColumnIds[boardId];

      removedIds = idsForBoard;

      return {
        columns: nextColumns,
        columnIds: nextColumnIds,
      };
    });

    return removedIds;
  },
}),
    {
      name: "knowledge-board-columns",
      partialize: (state) => ({
        columns: state.columns,
        columnIds: state.columnIds,
      }),
      skipHydration: true,
    }
  )
);

