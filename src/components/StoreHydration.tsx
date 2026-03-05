"use client";

import { useEffect, useState } from "react";
import { useBoardStore } from "@/store/boardStore";
import { useColumnStore } from "@/store/columnStore";
import { useCardStore } from "@/store/cardStore";

interface StoreHydrationProps {
  children: React.ReactNode;
}

export function StoreHydration({ children }: StoreHydrationProps) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useBoardStore.persist.rehydrate();
    useColumnStore.persist.rehydrate();
    useCardStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div
        className="min-h-screen bg-background"
        aria-hidden="true"
        aria-busy="true"
      />
    );
  }

  return <>{children}</>;
}
