import * as React from "react";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement>;

export function Badge({ className, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-slate-800 px-3 py-1.5 text-xs font-medium leading-none text-slate-50${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
