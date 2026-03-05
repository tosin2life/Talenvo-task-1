import { create } from "zustand";
import type { UIState } from "@/types";

type UIActions = {
  setActiveBoardId: (boardId: string | null) => void;
  setOpenModal: (value: UIState["openModal"]) => void;
  setEditingCardId: (cardId: string | null) => void;
  setEditingColumnId: (columnId: string | null) => void;
};

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => ({
  activeBoardId: null,
  openModal: null,
  editingCardId: null,
  editingColumnId: null,
  setActiveBoardId: (boardId) => set({ activeBoardId: boardId }),
  setOpenModal: (openModal) => set({ openModal }),
  setEditingCardId: (editingCardId) => set({ editingCardId }),
  setEditingColumnId: (editingColumnId) => set({ editingColumnId }),
}));

