import type { Card } from "@/types";
import {
  ApiError,
  maybeThrowRandomFailure,
  mockNetworkDelay,
  readJson,
  writeJson,
  type MockApiOptions,
} from "./mockStorage";

const CARDS_KEY = "knowledge-board-cards";

type CardsPersistedShape = {
  state?: {
    cards: Record<string, Card>;
    cardIds: Record<string, string[]>;
  };
  version?: number;
};

function readCardsState(): { cards: Record<string, Card>; cardIds: Record<string, string[]> } {
  const persisted = readJson<CardsPersistedShape>(CARDS_KEY, {});
  return {
    cards: persisted.state?.cards ?? {},
    cardIds: persisted.state?.cardIds ?? {},
  };
}

function writeCardsState(next: { cards: Record<string, Card>; cardIds: Record<string, string[]> }) {
  const persisted = readJson<CardsPersistedShape>(CARDS_KEY, {});
  writeJson(CARDS_KEY, { ...persisted, state: next });
}

export async function listCards(columnId: string, options?: MockApiOptions): Promise<Card[]> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);
  const { cards, cardIds } = readCardsState();
  const ids = cardIds[columnId] ?? [];
  return ids.map((id) => cards[id]).filter(Boolean);
}

export async function createCard(
  columnId: string,
  title: string,
  options?: MockApiOptions,
): Promise<Card> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);

  const trimmed = title.trim();
  if (!trimmed) {
    throw new ApiError("Card title is required", { status: 400, code: "VALIDATION" });
  }

  const card: Card = {
    id: crypto.randomUUID(),
    columnId,
    title: trimmed.slice(0, 120),
    description: "",
    tags: [],
    dueDate: null,
    createdAt: new Date().toISOString(),
  };

  const { cards, cardIds } = readCardsState();
  const existingIds = cardIds[columnId] ?? [];

  writeCardsState({
    cards: { ...cards, [card.id]: card },
    cardIds: { ...cardIds, [columnId]: [...existingIds, card.id] },
  });

  return card;
}

export async function updateCard(
  id: string,
  changes: Pick<Partial<Card>, "title" | "description" | "tags" | "dueDate">,
  options?: MockApiOptions,
): Promise<Card> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);

  const { cards, cardIds } = readCardsState();
  const existing = cards[id];
  if (!existing) {
    throw new ApiError("Card not found", { status: 404, code: "NOT_FOUND" });
  }

  const nextTitle =
    changes.title != null ? changes.title.trim().slice(0, 120) : existing.title;
  if (!nextTitle) {
    throw new ApiError("Card title is required", { status: 400, code: "VALIDATION" });
  }

  const updated: Card = {
    ...existing,
    title: nextTitle,
    description: changes.description ?? existing.description,
    tags: changes.tags ?? existing.tags,
    dueDate: changes.dueDate ?? existing.dueDate,
  };

  writeCardsState({ cards: { ...cards, [id]: updated }, cardIds });
  return updated;
}

export async function deleteCard(id: string, options?: MockApiOptions): Promise<Card> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);

  const { cards, cardIds } = readCardsState();
  const existing = cards[id];
  if (!existing) {
    throw new ApiError("Card not found", { status: 404, code: "NOT_FOUND" });
  }

  const nextCards = { ...cards };
  delete nextCards[id];

  const idsForColumn = cardIds[existing.columnId] ?? [];
  const nextCardIds = {
    ...cardIds,
    [existing.columnId]: idsForColumn.filter((cardId) => cardId !== id),
  };

  writeCardsState({ cards: nextCards, cardIds: nextCardIds });
  return existing;
}

export async function moveCard(
  cardId: string,
  fromColumnId: string,
  toColumnId: string,
  toIndex: number,
  options?: MockApiOptions,
): Promise<Card> {
  await mockNetworkDelay(options);
  maybeThrowRandomFailure(options);

  const { cards, cardIds } = readCardsState();
  const existing = cards[cardId];
  if (!existing) {
    throw new ApiError("Card not found", { status: 404, code: "NOT_FOUND" });
  }

  const fromIds = cardIds[fromColumnId] ?? [];
  if (!fromIds.includes(cardId)) {
    throw new ApiError("Card not in expected column", {
      status: 409,
      code: "CONFLICT",
    });
  }

  const baseFromIds = fromIds.filter((id) => id !== cardId);
  const baseToIds =
    fromColumnId === toColumnId
      ? baseFromIds
      : (cardIds[toColumnId] ?? []);

  const safeIndex = Math.max(0, Math.min(toIndex, baseToIds.length));
  const nextToIds = [
    ...baseToIds.slice(0, safeIndex),
    cardId,
    ...baseToIds.slice(safeIndex),
  ];

  const updated: Card = {
    ...existing,
    columnId: toColumnId,
  };

  const nextCardIds: Record<string, string[]> = { ...cardIds };
  nextCardIds[fromColumnId] = baseFromIds;
  nextCardIds[toColumnId] = nextToIds;

  writeCardsState({
    cards: { ...cards, [cardId]: updated },
    cardIds: nextCardIds,
  });

  return updated;
}


