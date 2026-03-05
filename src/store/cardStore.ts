import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Card } from "@/types";

type CardState = {
  cards: Record<string, Card>;
  cardIds: Record<string, string[]>;
};

type CardActions = {
  setInitialCards: (cards: Card[]) => void;
  createCard: (columnId: string, title: string) => Card;
  updateCard: (
    id: string,
    changes: Pick<Partial<Card>, "title" | "description" | "tags" | "dueDate">,
  ) => void;
  deleteCard: (id: string) => void;
  removeCardsByColumns: (columnIds: string[]) => void;
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
  createCard: (columnId, title) => {
    const card: Card = {
      id: nanoid(),
      columnId,
      title,
      description: "",
      tags: [],
      dueDate: null,
      createdAt: new Date().toISOString(),
    };

    set((state) => {
      const existingIds = state.cardIds[columnId] ?? [];
      return {
        cards: {
          ...state.cards,
          [card.id]: card,
        },
        cardIds: {
          ...state.cardIds,
          [columnId]: [...existingIds, card.id],
        },
      };
    });

    return card;
  },
  updateCard: (id, changes) =>
    set((state) => {
      const existing = state.cards[id];
      if (!existing) return state;

      const updated: Card = {
        ...existing,
        ...changes,
      };

      return {
        cards: {
          ...state.cards,
          [id]: updated,
        },
      };
    }),
  deleteCard: (id) =>
    set((state) => {
      const existing = state.cards[id];
      if (!existing) return state;

      const { [id]: _removed, ...restCards } = state.cards;
      const idsForColumn = state.cardIds[existing.columnId] ?? [];

      return {
        cards: restCards,
        cardIds: {
          ...state.cardIds,
          [existing.columnId]: idsForColumn.filter((cardId) => cardId !== id),
        },
      };
    }),
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
}),
    {
      name: "knowledge-board-cards",
      partialize: (state) => ({ cards: state.cards, cardIds: state.cardIds }),
      skipHydration: true,
    }
  )
);

