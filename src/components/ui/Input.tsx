import * as React from "react";
import { clsx } from "clsx";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, type = "text", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={clsx(
          "h-10 w-full rounded-md border border-border bg-slate-900/60 px-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);
