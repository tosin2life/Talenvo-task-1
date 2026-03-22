import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Card } from "@/types";
import { cardApi } from "@/api";
import { publishRealtime } from "@/realtime/realtimeClient";
import { useUndoStore } from "./undoStore";

type CardState = {
  cards: Record<string, Card>;
  cardIds: Record<string, string[]>;
};

type CardActions = {
  setInitialCards: (cards: Card[]) => void;
  createCard: (columnId: string, title: string) => Promise<Card>;
  updateCard: (
    id: string,
    changes: Pick<Partial<Card>, "title" | "description" | "tags" | "dueDate">,
  ) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  moveCard: (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    toIndex: number,
  ) => Promise<void>;
  removeCardsByColumns: (columnIds: string[]) => void;
  applyRemoteCardCreated: (card: Card) => void;
  applyRemoteCardMoved: (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    toIndex: number,
  ) => void;
  applyRemoteCardUpdated: (card: Card) => void;
  applyRemoteCardDeleted: (cardId: string) => void;
};

type CardStore = CardState & CardActions;

export const useCardStore = create<CardStore>()(
  persist(
    (set) => ({
  cards: {},
  cardIds: {},
  setInitialCards: (cards) =>
    set(() => {
      const byId: Record<string, Card> = {};
      const idsByColumn: Record<string, string[]> = {};

      for (const card of cards) {
        byId[card.id] = card;
        if (!idsByColumn[card.columnId]) {
          idsByColumn[card.columnId] = [];
        }
        idsByColumn[card.columnId].push(card.id);
      }

      return {
        cards: byId,
        cardIds: idsByColumn,
      };
    }),
  createCard: async (columnId, title) => {
    const card = await cardApi.createCard(columnId, title);

    set((state) => {
      const existingIds = state.cardIds[columnId] ?? [];
      return {
        cards: { ...state.cards, [card.id]: card },
        cardIds: { ...state.cardIds, [columnId]: [...existingIds, card.id] },
      };
    });

    publishRealtime({
      type: "card:created",
      payload: { card },
    });

    useUndoStore.getState().pushCreate(card);
    return card;
  },
  updateCard: async (id, changes) => {
    const updated = await cardApi.updateCard(id, changes);
    set((state) => {
      if (!state.cards[id]) return state;
      return { cards: { ...state.cards, [id]: updated } };
    });
    publishRealtime({ type: "card:updated", payload: { card: updated } });
  },
  deleteCard: async (id) => {
    const existing = useCardStore.getState().cards[id];
    if (!existing) return;
    await cardApi.deleteCard(id);
    set((state) => {
      const card = state.cards[id];
      if (!card) return state;
      const { [id]: _removed, ...restCards } = state.cards;
      const idsForColumn = state.cardIds[card.columnId] ?? [];
      return {
        cards: restCards,
        cardIds: {
          ...state.cardIds,
          [card.columnId]: idsForColumn.filter((cardId) => cardId !== id),
        },
      };
    });
    publishRealtime({ type: "card:deleted", payload: { cardId: id } });
    useUndoStore.getState().pushDelete(existing);
  },
  moveCard: async (cardId, fromColumnId, toColumnId, toIndex) => {
    const fromIndex = (useCardStore.getState().cardIds[fromColumnId] ?? []).indexOf(cardId);

    set((state) => {
      const fromIds = state.cardIds[fromColumnId] ?? [];
      if (!fromIds.includes(cardId)) {
        return state;
      }

      const baseFromIds = fromIds.filter((id) => id !== cardId);
      const baseToIds =
        fromColumnId === toColumnId
          ? baseFromIds
          : state.cardIds[toColumnId] ?? [];

      const safeIndex = Math.max(0, Math.min(toIndex, baseToIds.length));
      const nextToIds = [
        ...baseToIds.slice(0, safeIndex),
        cardId,
        ...baseToIds.slice(safeIndex),
      ];

      const nextCardIds = { ...state.cardIds };
      nextCardIds[fromColumnId] = baseFromIds;
      nextCardIds[toColumnId] = nextToIds;

      const existing = state.cards[cardId];
      if (!existing) {
        return { ...state, cardIds: nextCardIds };
      }

      const updated: Card = { ...existing, columnId: toColumnId };

      return {
        cards: { ...state.cards, [cardId]: updated },
        cardIds: nextCardIds,
      };
    });

    publishRealtime({
      type: "card:moved",
      payload: { cardId, fromColumnId, toColumnId, toIndex },
    });

    if (fromIndex >= 0) {
      useUndoStore.getState().pushMove(
        cardId,
        fromColumnId,
        toColumnId,
        fromIndex,
        toIndex,
      );
    }

    try {
      await cardApi.moveCard(cardId, fromColumnId, toColumnId, toIndex);
    } catch (error) {
      console.error("Failed to persist card move", error);
      // In a later task, we can add a toast + revert strategy.
    }
  },
  removeCardsByColumns: (columnIds) =>
    set((state) => {
      if (columnIds.length === 0) return state;

      const nextCards: Record<string, Card> = { ...state.cards };
      const nextCardIds: Record<string, string[]> = { ...state.cardIds };

      for (const columnId of columnIds) {
        const idsForColumn = nextCardIds[columnId] ?? [];
        for (const cardId of idsForColumn) {
          delete nextCards[cardId];
        }
        delete nextCardIds[columnId];
      }

      return {
        cards: nextCards,
        cardIds: nextCardIds,
      };
    }),
  applyRemoteCardCreated: (card) =>
    set((state) => {
      if (state.cards[card.id]) return state;
      const existingIds = state.cardIds[card.columnId] ?? [];
      return {
        cards: { ...state.cards, [card.id]: card },
        cardIds: {
          ...state.cardIds,
          [card.columnId]: [...existingIds, card.id],
        },
      };
    }),
  applyRemoteCardMoved: (cardId, fromColumnId, toColumnId, toIndex) =>
    set((state) => {
      // Try to find the card in the expected fromColumnId; if not found,
      // fall back to the card's current column to be more tolerant of drift.
      let actualFromColumnId = fromColumnId;
      let fromIds = state.cardIds[fromColumnId] ?? [];

      if (!fromIds.includes(cardId)) {
        const currentColumnId = state.cards[cardId]?.columnId;
        if (currentColumnId) {
          const currentIds = state.cardIds[currentColumnId] ?? [];
          if (currentIds.includes(cardId)) {
            actualFromColumnId = currentColumnId;
            fromIds = currentIds;
          } else {
            return state;
          }
        } else {
          return state;
        }
      }

      const baseFromIds = fromIds.filter((id) => id !== cardId);
      const baseToIds =
        actualFromColumnId === toColumnId
          ? baseFromIds
          : state.cardIds[toColumnId] ?? [];

      const safeIndex = Math.max(0, Math.min(toIndex, baseToIds.length));
      const nextToIds = [
        ...baseToIds.slice(0, safeIndex),
        cardId,
        ...baseToIds.slice(safeIndex),
      ];

      const nextCardIds = { ...state.cardIds };
      nextCardIds[actualFromColumnId] = baseFromIds;
      nextCardIds[toColumnId] = nextToIds;

      const existing = state.cards[cardId];
      if (!existing) {
        return { ...state, cardIds: nextCardIds };
      }

      const updated: Card = { ...existing, columnId: toColumnId };

      return {
        cards: { ...state.cards, [cardId]: updated },
        cardIds: nextCardIds,
      };
    }),
  applyRemoteCardUpdated: (card) =>
    set((state) => {
      if (!state.cards[card.id]) return state;
      return { cards: { ...state.cards, [card.id]: card } };
    }),
  applyRemoteCardDeleted: (cardId) =>
    set((state) => {
      const card = state.cards[cardId];
      if (!card) return state;
      const { [cardId]: _removed, ...restCards } = state.cards;
      const idsForColumn = state.cardIds[card.columnId] ?? [];
      return {
        cards: restCards,
        cardIds: {
          ...state.cardIds,
          [card.columnId]: idsForColumn.filter((id) => id !== cardId),
        },
      };
    }),
}),
    {
      name: "knowledge-board-cards",
      partialize: (state) => ({ cards: state.cards, cardIds: state.cardIds }),
      skipHydration: true,
    }
  )
);

