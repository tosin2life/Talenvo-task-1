export interface Board {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  order: number;
}

export interface Card {
  id: string;
  columnId: string;
  title: string;
  description: string;
  tags: string[];
  dueDate: string | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  cardId: string;
  parentId: string | null;
  author: string;
  body: string;
  createdAt: string;
  updatedAt: string | null;
  isDeleted?: boolean;
}

export interface UIState {
  activeBoardId: string | null;
  openModal: "createBoard" | "editBoard" | "cardDetail" | null;
  editingCardId: string | null;
  editingColumnId: string | null;
}

