import * as React from "react";
import { clsx } from "clsx";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {}

export function Badge({ className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-100",
        className,
      )}
      {...props}
    />
  );
}

