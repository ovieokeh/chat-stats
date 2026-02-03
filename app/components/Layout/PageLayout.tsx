"use client";

import React, { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { useScrollRestoration } from "../../hooks/useScrollRestoration";

interface PageLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  className?: string;
  maxWidth?: "full" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
  preserveScroll?: boolean;
  disableScroll?: boolean;
}

export function PageLayout({
  children,
  header,
  className,
  maxWidth = "7xl",
  preserveScroll = true,
  disableScroll = false,
}: PageLayoutProps) {
  const shouldPreserveScroll = preserveScroll && !disableScroll;
  const scrollRef = useScrollRestoration<HTMLDivElement>(shouldPreserveScroll ? "page_scroll_" : "no_scroll_");

  const maxWidthClass = {
    full: "max-w-full",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
  }[maxWidth];

  return (
    <div className="flex flex-col h-full w-full bg-base-100">
      {header && <div className="flex-none z-10">{header}</div>}
      <div
        ref={shouldPreserveScroll ? scrollRef : undefined}
        className={cn(
          "flex-1 overflow-x-hidden w-full",
          disableScroll ? "overflow-hidden" : "overflow-y-auto",
          !shouldPreserveScroll && !disableScroll && "overflow-y-auto", // Fallback if ref not used
        )}
      >
        <div
          className={cn(
            "mx-auto w-full p-4 md:p-6",
            maxWidthClass,
            className,
            disableScroll && "h-full min-h-0 flex flex-col",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
