import type { Metadata } from "next";
import { BoardView } from "@/components/board/BoardView";

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export async function generateMetadata({
  params,
}: BoardPageProps): Promise<Metadata> {
  const { boardId } = await params;
  return {
    title: `Board ${boardId} | Collaborative Knowledge Board`,
  };
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params;
  return <BoardView boardId={boardId} />;
}
