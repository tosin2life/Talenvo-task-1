import * as React from "react";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {}

export function Badge({ className, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-100${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

