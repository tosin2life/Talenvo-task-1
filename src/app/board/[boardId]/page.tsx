import type { Metadata } from "next";
import { BoardView } from "@/components/board/BoardView";

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Board | Collaborative Knowledge Board",
  };
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params;
  return <BoardView boardId={boardId} />;
}
