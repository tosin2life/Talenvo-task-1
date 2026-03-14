import { Skeleton } from "@/components/ui/Skeleton";

export function BoardListSkeleton() {
  return (
    <section
      aria-label="Loading boards"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
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
  );
}
