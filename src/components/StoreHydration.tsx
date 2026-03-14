"use client";

import { useEffect, useState } from "react";
import { useBoardStore } from "@/store/boardStore";
import { useColumnStore } from "@/store/columnStore";
import { useCardStore } from "@/store/cardStore";
import { useRealtimeSubscription } from "@/realtime/realtimeClient";

interface StoreHydrationProps {
  children: React.ReactNode;
}

export function StoreHydration({ children }: StoreHydrationProps) {
  const [hydrated, setHydrated] = useState(false);
  useRealtimeSubscription();

  useEffect(() => {
    useBoardStore.persist.rehydrate();
    useColumnStore.persist.rehydrate();
    useCardStore.persist.rehydrate();
    const timeoutId = window.setTimeout(() => {
      setHydrated(true);
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
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
