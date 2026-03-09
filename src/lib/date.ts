const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDisplayDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return dateFormatter.format(date);
}

export type DueStatus = "overdue" | "due-soon" | "normal";

const MS_IN_48_HOURS = 48 * 60 * 60 * 1000;

export function getDueStatus(isoDate: string | null): DueStatus {
  if (!isoDate) {
    return "normal";
  }

  const now = Date.now();
  const due = new Date(isoDate).getTime();

  if (Number.isNaN(due)) {
    return "normal";
  }

  if (due < now) {
    return "overdue";
  }

  if (due <= now + MS_IN_48_HOURS) {
    return "due-soon";
  }

  return "normal";
}
