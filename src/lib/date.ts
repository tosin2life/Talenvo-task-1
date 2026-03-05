import { format, isBefore, isWithinInterval, addHours } from "date-fns";

export function formatDisplayDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return format(date, "MMM d, yyyy");
}

export type DueStatus = "overdue" | "due-soon" | "normal";

export function getDueStatus(isoDate: string | null): DueStatus {
  if (!isoDate) {
    return "normal";
  }

  const now = new Date();
  const due = new Date(isoDate);

  if (Number.isNaN(due.getTime())) {
    return "normal";
  }

  if (isBefore(due, now)) {
    return "overdue";
  }

  const in48Hours = addHours(now, 48);

  if (isWithinInterval(due, { start: now, end: in48Hours })) {
    return "due-soon";
  }

  return "normal";
}

