import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { BoardViewSkeleton } from "@/components/board/BoardViewSkeleton";

const BoardView = dynamic(
  () =>
    import("@/components/board/BoardView").then((mod) => ({
      default: mod.BoardView,
    })),
  {
    loading: () => <BoardViewSkeleton />,
    ssr: false,
  },
);

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export async function generateMetadata({
  params,
}: BoardPageProps): Promise<Metadata> {
  const { boardId } = await params;
  return {
    title: `Board | Collaborative Knowledge Board`,
  };
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params;
  return <BoardView boardId={boardId} />;
}
