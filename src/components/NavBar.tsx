"use client";

import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CreateBoardModal } from "@/components/board/CreateBoardModal";
import { useUIStore } from "@/store/uiStore";

export function NavBar() {
  const openModal = useUIStore((state) => state.openModal);
  const setOpenModal = useUIStore((state) => state.setOpenModal);
  const isCreateOpen = openModal === "createBoard";

  return (
    <>
      <nav className="flex items-center justify-between gap-3 border-b border-white/10 bg-indigo-700 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-bold tracking-tight text-white hover:text-blue-200 transition-colors"
        >
          <Lightbulb className="h-5 w-5" aria-hidden />
          Idea Hub
        </Link>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="bg-white/20 text-white hover:bg-white/30 hover:text-white border-0"
            onClick={() => setOpenModal("createBoard")}
            aria-haspopup="dialog"
          >
            + New Board
          </Button>
          <ThemeToggle />
        </div>
      </nav>
      <CreateBoardModal
        open={isCreateOpen}
        onClose={() => setOpenModal(null)}
      />
    </>
  );
}
