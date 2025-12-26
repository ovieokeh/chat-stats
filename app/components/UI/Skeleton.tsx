import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: "rectangular" | "circular" | "text";
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = "rectangular", ...props }) => {
  return (
    <div
      className={twMerge(
        clsx("skeleton bg-base-300 animate-pulse", className, {
          "rounded-full": variant === "circular",
          "rounded-md": variant === "rectangular",
          "h-4 w-full rounded": variant === "text",
        })
      )}
      {...props}
    />
  );
};
