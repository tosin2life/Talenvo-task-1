"use client";

import { useEffect, useState } from "react";
import { useBoardStore } from "@/store/boardStore";
import { useColumnStore } from "@/store/columnStore";
import { useCardStore } from "@/store/cardStore";
import { useRealtimeSubscription } from "@/realtime/realtimeClient";
import { Skeleton } from "@/components/ui/Skeleton";

interface StoreHydrationProps {
  children: React.ReactNode;
}

function HydrationSkeleton() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-28" />
        </header>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
            >
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
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
      <div aria-busy="true" aria-hidden="true">
        <HydrationSkeleton />
      </div>
    );
  }

  return <>{children}</>;
}
