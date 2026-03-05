import * as React from "react";
import { clsx } from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-sky-500 text-white hover:bg-sky-400 focus-visible:ring-sky-500 disabled:bg-sky-500/40",
  secondary:
    "bg-slate-800 text-slate-50 hover:bg-slate-700 focus-visible:ring-slate-500 disabled:bg-slate-800/40",
  ghost:
    "bg-transparent text-slate-200 hover:bg-slate-800/60 focus-visible:ring-slate-500 disabled:text-slate-500",
  destructive:
    "bg-red-500 text-white hover:bg-red-400 focus-visible:ring-red-500 disabled:bg-red-500/40",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

