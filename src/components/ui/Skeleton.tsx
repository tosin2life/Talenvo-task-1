import * as React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton({ className = "", ...props }, ref) {
    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading"
        className={`animate-pulse rounded-md bg-slate-700/50 ${className}`}
        {...props}
      />
    );
  },
);
