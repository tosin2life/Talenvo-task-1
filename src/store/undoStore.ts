import { create } from "zustand";
import type { Card } from "@/types";
import { useCardStore } from "./cardStore";
import { cardApi } from "@/api";

type CreateCommand = {
  type: "create";
  card: Card;
};

type DeleteCommand = {
  type: "delete";
  card: Card;
};

type MoveCommand = {
  type: "move";
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  fromIndex: number;
  toIndex: number;
};

type UndoCommand = CreateCommand | DeleteCommand | MoveCommand;

type UndoState = {
  undoStack: UndoCommand[];
  redoStack: UndoCommand[];
};

type UndoActions = {
  pushCreate: (card: Card) => void;
  pushDelete: (card: Card) => void;
  pushMove: (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
};

type UndoStore = UndoState & UndoActions;

function applyRemoveCard(cardId: string) {
  useCardStore.setState((state) => {
    const card = state.cards[cardId];
    if (!card) return state;
    const ids = state.cardIds[card.columnId] ?? [];
    return {
      cards: Object.fromEntries(
        Object.entries(state.cards).filter(([id]) => id !== cardId),
      ),
      cardIds: {
        ...state.cardIds,
        [card.columnId]: ids.filter((id) => id !== cardId),
      },
    };
  });
}

function applyAddCard(card: Card) {
  useCardStore.setState((state) => {
    const existingIds = state.cardIds[card.columnId] ?? [];
    return {
      cards: { ...state.cards, [card.id]: card },
      cardIds: {
        ...state.cardIds,
        [card.columnId]: [...existingIds, card.id],
      },
    };
  });
}

function applyMove(
  cardId: string,
  fromColumnId: string,
  toColumnId: string,
  toIndex: number,
) {
  useCardStore.setState((state) => {
    const fromIds = state.cardIds[fromColumnId] ?? [];
    if (!fromIds.includes(cardId)) return state;
    const baseFromIds = fromIds.filter((id) => id !== cardId);
    const baseToIds =
      fromColumnId === toColumnId ? baseFromIds : state.cardIds[toColumnId] ?? [];
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
    if (!existing) return { ...state, cardIds: nextCardIds };
    return {
      cards: { ...state.cards, [cardId]: { ...existing, columnId: toColumnId } },
      cardIds: nextCardIds,
    };
  });
}

export const useUndoStore = create<UndoStore>((set, get) => ({
  undoStack: [],
  redoStack: [],
  pushCreate: (card) =>
    set((state) => ({
      undoStack: [...state.undoStack, { type: "create", card }],
      redoStack: [],
    })),
  pushDelete: (card) =>
    set((state) => ({
      undoStack: [...state.undoStack, { type: "delete", card }],
      redoStack: [],
    })),
  pushMove: (cardId, fromColumnId, toColumnId, fromIndex, toIndex) =>
    set((state) => ({
      undoStack: [
        ...state.undoStack,
        { type: "move", cardId, fromColumnId, toColumnId, fromIndex, toIndex },
      ],
      redoStack: [],
    })),
  undo: async () => {
    const stack = get().undoStack;
    const cmd = stack[stack.length - 1];
    if (!cmd) return;
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, cmd],
    }));

    if (cmd.type === "create") {
      applyRemoveCard(cmd.card.id);
      try {
        await cardApi.deleteCard(cmd.card.id);
      } catch {
        console.error("Failed to persist undo create");
      }
    } else if (cmd.type === "delete") {
      try {
        await cardApi.restoreCard(cmd.card);
        applyAddCard(cmd.card);
      } catch {
        console.error("Failed to persist undo delete");
      }
    } else if (cmd.type === "move") {
      applyMove(cmd.cardId, cmd.toColumnId, cmd.fromColumnId, cmd.fromIndex);
      try {
        await cardApi.moveCard(
          cmd.cardId,
          cmd.toColumnId,
          cmd.fromColumnId,
          cmd.fromIndex,
        );
      } catch {
        console.error("Failed to persist undo move");
      }
    }
  },
  redo: async () => {
    const stack = get().redoStack;
    const cmd = stack[stack.length - 1];
    if (!cmd) return;
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, cmd],
    }));

    if (cmd.type === "create") {
      try {
        await cardApi.restoreCard(cmd.card);
        applyAddCard(cmd.card);
      } catch {
        console.error("Failed to persist redo create");
      }
    } else if (cmd.type === "delete") {
      applyRemoveCard(cmd.card.id);
      try {
        await cardApi.deleteCard(cmd.card.id);
      } catch {
        console.error("Failed to persist redo delete");
      }
    } else if (cmd.type === "move") {
      applyMove(cmd.cardId, cmd.fromColumnId, cmd.toColumnId, cmd.toIndex);
      try {
        await cardApi.moveCard(
          cmd.cardId,
          cmd.fromColumnId,
          cmd.toColumnId,
          cmd.toIndex,
        );
      } catch {
        console.error("Failed to persist redo move");
      }
    }
  },
}));
