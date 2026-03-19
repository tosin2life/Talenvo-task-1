import { Skeleton } from "@/components/ui/Skeleton";

export function BoardViewSkeleton() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8">
        <header className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </header>
        <section className="min-h-[60vh] rounded-lg border border-border bg-card p-4">
          <div className="flex gap-4 overflow-x-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex w-72 flex-shrink-0 flex-col gap-3 rounded-lg border border-border bg-[var(--column-bg)] p-3"
              >
                <Skeleton className="h-4 w-32" />
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
