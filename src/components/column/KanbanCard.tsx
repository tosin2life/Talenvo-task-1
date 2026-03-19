import { memo } from "react";
import type { Card } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { getDueStatus, formatDisplayDate } from "@/lib/date";

interface KanbanCardProps {
  card: Card;
}

function KanbanCardInner({ card }: KanbanCardProps) {
  const visibleTags = card.tags.slice(0, 3);
  const remaining = Math.max(0, card.tags.length - visibleTags.length);

  const dueStatus = getDueStatus(card.dueDate);

  const dueClassName =
    dueStatus === "overdue"
      ? "text-red-400"
      : dueStatus === "due-soon"
        ? "text-amber-300"
        : "text-muted-foreground";

  return (
    <article className="space-y-2 rounded-md border border-border bg-[var(--kanban-card-bg)] p-3 text-sm text-foreground shadow-md">
      <h3 className="line-clamp-2 font-medium">{card.title}</h3>

      {card.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {visibleTags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
          {remaining > 0 ? (
            <Badge className="bg-slate-800/80">+{remaining}</Badge>
          ) : null}
        </div>
      ) : null}

      {card.dueDate ? (
        <p className={`text-xs ${dueClassName}`}>
          Due {formatDisplayDate(card.dueDate)}
        </p>
      ) : null}
    </article>
  );
}

export const KanbanCard = memo(KanbanCardInner);
