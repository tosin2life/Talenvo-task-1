import type { Column } from "@/types";
import {
  ApiError,
  maybeThrowRandomFailure,
  mockNetworkDelay,
  readJson,
  writeJson,
  type MockApiOptions,
} from "./mockStorage";

const COLUMNS_KEY = "knowledge-board-columns";

type ColumnsPersistedShape = {
  state?: {
    columns: Record<string, Column>;
    columnIds: Record<string, string[]>;
  };
  version?: number;
};

function readColumnsState(): { columns: Record<string, Column>; columnIds: Record<string, string[]> } {
  const persisted = readJson<ColumnsPersistedShape>(COLUMNS_KEY, {});
  return {
    columns: persisted.state?.columns ?? {},
    columnIds: persisted.state?.columnIds ?? {},
  };
}

function writeColumnsState(next: {
  columns: Record<string, Column>;
  columnIds: Record<string, string[]>;
}) {
  const persisted = readJson<ColumnsPersistedShape>(COLUMNS_KEY, {});
  writeJson(COLUMNS_KEY, { ...persisted, state: next });
}

export async function listColumns(boardId: string, options?: MockApiOptions): Promise<Column[]> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);
  const { columns, columnIds } = readColumnsState();
  const ids = columnIds[boardId] ?? [];
  return ids.map((id) => columns[id]).filter(Boolean);
}

export async function createColumn(
  boardId: string,
  title: string,
  options?: MockApiOptions,
): Promise<Column> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);

  const trimmed = title.trim();
  if (!trimmed) {
    throw new ApiError("Column title is required", { status: 400, code: "VALIDATION" });
  }

  const column: Column = {
    id: crypto.randomUUID(),
    boardId,
    title: trimmed.slice(0, 80),
    order: Date.now(),
  };

  const { columns, columnIds } = readColumnsState();
  const existingIds = columnIds[boardId] ?? [];

  writeColumnsState({
    columns: { ...columns, [column.id]: column },
    columnIds: { ...columnIds, [boardId]: [...existingIds, column.id] },
  });

  return column;
}

export async function updateColumn(
  id: string,
  changes: Pick<Partial<Column>, "title" | "order">,
  options?: MockApiOptions,
): Promise<Column> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);

  const { columns, columnIds } = readColumnsState();
  const existing = columns[id];
  if (!existing) {
    throw new ApiError("Column not found", { status: 404, code: "NOT_FOUND" });
  }

  const nextTitle =
    changes.title != null ? changes.title.trim().slice(0, 80) : existing.title;
  if (!nextTitle) {
    throw new ApiError("Column title is required", { status: 400, code: "VALIDATION" });
  }

  const updated: Column = {
    ...existing,
    title: nextTitle,
    order: changes.order ?? existing.order,
  };

  writeColumnsState({ columns: { ...columns, [id]: updated }, columnIds });
  return updated;
}

export async function deleteColumn(id: string, options?: MockApiOptions): Promise<Column> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);

  const { columns, columnIds } = readColumnsState();
  const existing = columns[id];
  if (!existing) {
    throw new ApiError("Column not found", { status: 404, code: "NOT_FOUND" });
  }

  const nextColumns = { ...columns };
  delete nextColumns[id];

  const idsForBoard = columnIds[existing.boardId] ?? [];
  const nextColumnIds = {
    ...columnIds,
    [existing.boardId]: idsForBoard.filter((columnId) => columnId !== id),
  };

  writeColumnsState({ columns: nextColumns, columnIds: nextColumnIds });
  return existing;
}

export async function listAllColumns(options?: MockApiOptions): Promise<Column[]> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);
  const { columns } = readColumnsState();
  return Object.values(columns);
}


