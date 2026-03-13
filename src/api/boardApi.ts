import type { Board } from "@/types";
import {
  ApiError,
  maybeThrowRandomFailure,
  mockNetworkDelay,
  readJson,
  writeJson,
  type MockApiOptions,
} from "./mockStorage";

const BOARDS_KEY = "knowledge-board-boards";

type BoardsPersistedShape = {
  state?: {
    boards: Record<string, Board>;
    boardIds: string[];
  };
  version?: number;
};

function readBoardsState(): { boards: Record<string, Board>; boardIds: string[] } {
  const persisted = readJson<BoardsPersistedShape>(BOARDS_KEY, {});
  return {
    boards: persisted.state?.boards ?? {},
    boardIds: persisted.state?.boardIds ?? [],
  };
}

function writeBoardsState(next: { boards: Record<string, Board>; boardIds: string[] }) {
  const persisted = readJson<BoardsPersistedShape>(BOARDS_KEY, {});
  writeJson(BOARDS_KEY, {
    ...persisted,
    state: next,
  });
}

export async function listBoards(options?: MockApiOptions): Promise<Board[]> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);
  const { boards, boardIds } = readBoardsState();
  return boardIds.map((id) => boards[id]).filter(Boolean);
}

export async function createBoard(
  input: { title: string; description: string },
  options?: MockApiOptions,
): Promise<Board> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);

  const title = input.title.trim();
  if (!title) {
    throw new ApiError("Board title is required", { status: 400, code: "VALIDATION" });
  }

  const board: Board = {
    id: crypto.randomUUID(),
    title: title.slice(0, 80),
    description: (input.description ?? "").slice(0, 300),
    createdAt: new Date().toISOString(),
  };

  const { boards, boardIds } = readBoardsState();
  const next = {
    boards: { ...boards, [board.id]: board },
    boardIds: boardIds.includes(board.id) ? boardIds : [...boardIds, board.id],
  };

  writeBoardsState(next);
  return board;
}

export async function updateBoard(
  id: string,
  changes: Pick<Partial<Board>, "title" | "description">,
  options?: MockApiOptions,
): Promise<Board> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);

  const { boards, boardIds } = readBoardsState();
  const existing = boards[id];
  if (!existing) {
    throw new ApiError("Board not found", { status: 404, code: "NOT_FOUND" });
  }

  const nextTitle =
    changes.title != null ? changes.title.trim().slice(0, 80) : existing.title;
  if (!nextTitle) {
    throw new ApiError("Board title is required", { status: 400, code: "VALIDATION" });
  }

  const updated: Board = {
    ...existing,
    title: nextTitle,
    description:
      changes.description != null ? changes.description.slice(0, 300) : existing.description,
  };

  writeBoardsState({
    boards: { ...boards, [id]: updated },
    boardIds,
  });

  return updated;
}

export async function deleteBoard(id: string, options?: MockApiOptions): Promise<void> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);

  const { boards, boardIds } = readBoardsState();
  if (!boards[id]) {
    throw new ApiError("Board not found", { status: 404, code: "NOT_FOUND" });
  }

  const nextBoards = { ...boards };
  delete nextBoards[id];

  writeBoardsState({
    boards: nextBoards,
    boardIds: boardIds.filter((boardId) => boardId !== id),
  });
}

