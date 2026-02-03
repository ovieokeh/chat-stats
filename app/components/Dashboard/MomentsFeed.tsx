"use client";

import React, { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../lib/db";
import { findInterestingMoments } from "../../lib/analysis";
import { DEFAULT_CONFIG } from "../../types";
import { MomentCard } from "../UI/MomentCard";
import { FilterBar } from "../UI/FilterBar";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useText } from "../../hooks/useText";
import { cn } from "../../lib/utils";
import { Skeleton } from "../UI/Skeleton";
import { useRouter, useSearchParams } from "next/navigation";

interface MomentsFeedProps {
  importId: number;
  stickyFilter?: boolean;
  pageParamKey?: string;
}

export const MomentsFeed: React.FC<MomentsFeedProps> = ({
  importId,
  stickyFilter = false,
  pageParamKey = "momentsPage",
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsStr = searchParams.toString();
  // Query messages and sessions to compute moments on the fly
  // Optimization: In a real heavy app, we'd compute this once and store in derivedMetrics.
  // For MVP with <50k messages, this might be fast enough or we can wrap in a heavy-calculation effect.

  const data = useLiveQuery(async () => {
    if (!importId) return null;
    const [messages, sessions, importRecord] = await Promise.all([
      db.messages.where("importId").equals(importId).toArray(),
      db.sessions.where("importId").equals(importId).toArray(),
      db.imports.get(importId),
    ]);

    if (!messages || !sessions || !importRecord) return null;

    // Use config from import record or default
    const config = importRecord.configJson ? JSON.parse(importRecord.configJson) : DEFAULT_CONFIG;

    // Compute moments
    const moments = findInterestingMoments(messages, sessions, config);
    return moments;
  }, [importId]);

  const [filters, setFilters] = React.useState<Record<string, string[]>>({});
  const [page, setPage] = React.useState(() => {
    const raw = searchParams.get(pageParamKey);
    const parsed = raw ? parseInt(raw, 10) : 1;
    return Number.isFinite(parsed) && parsed > 0 ? parsed - 1 : 0;
  });
  const hasInitializedFilters = React.useRef(false);
  const ITEMS_PER_PAGE = 20;
  const { t } = useText();
  const setPageAndSync = React.useCallback(
    (nextPage: number) => {
      setPage(nextPage);
      const params = new URLSearchParams(searchParamsStr);
      params.set(pageParamKey, String(nextPage + 1));
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [pageParamKey, router, searchParamsStr],
  );

  const filteredData = useMemo(() => {
    if (!data) return [];
    let res = data;

    if (filters.type && filters.type.length > 0) {
      res = res.filter((m) => filters.type.includes(m.type));
    }

    return res;
  }, [data, filters]);

  // Handle page reset on filter change
  React.useEffect(() => {
    if (hasInitializedFilters.current) {
      setPageAndSync(0);
    } else {
      hasInitializedFilters.current = true;
    }
  }, [filters, setPageAndSync]);

  React.useEffect(() => {
    const raw = searchParams.get(pageParamKey);
    const parsed = raw ? parseInt(raw, 10) : 1;
    const nextPage = Number.isFinite(parsed) && parsed > 0 ? parsed - 1 : 0;
    setPage((current) => (current === nextPage ? current : nextPage));
  }, [pageParamKey, searchParams]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const displayMoments = useMemo(() => {
    return filteredData.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  }, [filteredData, page]);
  const maxPage = Math.max(0, totalPages - 1);

  React.useEffect(() => {
    if (page > maxPage) {
      setPageAndSync(maxPage);
    }
  }, [maxPage, page, setPageAndSync]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [page]);

  // Group by Date for Timeline
  const groupedMoments = useMemo(() => {
    const groups: Record<string, typeof displayMoments> = {};
    displayMoments.forEach((m) => {
      // Use YYYY-MM-DD for sorting keys
      const dateKey = new Date(m.ts).toISOString().split("T")[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(m);
    });
    // Sort keys descending (newest first)
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [displayMoments]);

  if (data === undefined) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* FilterBar Skeleton */}
        <div className="flex gap-2 border-b border-base-200/50 pb-4">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>

        {/* Timeline Skeleton */}
        <ul className="timeline timeline-vertical timeline-compact -ml-4 md:ml-0">
          {[1, 2, 3].map((i) => (
            <li key={i}>
              {i > 1 && <hr className="bg-base-300" />}
              <div className="timeline-start md:text-end mb-2 md:mb-0 pt-2 min-w-[80px]">
                <Skeleton className="h-3 w-12 mb-1" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="timeline-middle">
                <div className="w-5 h-5 rounded-full bg-base-300" />
              </div>
              <div className="timeline-end mb-10 w-full pl-2 md:pl-0">
                <div className="flex flex-wrap gap-3">
                  {[1, 2].map((j) => (
                    <div
                      key={j}
                      className="card bg-base-100 border border-base-300/60 rounded-2xl w-full md:w-80 h-32 p-4"
                    >
                      <div className="flex gap-3">
                        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                          <div className="pt-2 space-y-1">
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <hr className="bg-base-300" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Filter Options (moved up logically, but constant so fine anywhere as long as used correctly)
  const typeGroups = [
    {
      key: "type",
      label: t("common.type"),
      multi: true,
      options: [
        { label: t("moments.types.volume_spike"), value: "volume_spike" },
        { label: t("moments.types.marathon_session"), value: "marathon_session" },
        { label: t("moments.types.long_gap"), value: "long_gap" },
        { label: t("moments.types.sentiment_spike"), value: "sentiment_spike" },
      ],
    },
  ];

  if (data === null || data.length === 0) {
    // Empty state
    return (
      <div className="card bg-base-100 border border-base-300/60 p-8 text-center rounded-2xl">
        <div className="flex justify-center mb-3">
          <Sparkles className="w-8 h-8 text-base-content/20" />
        </div>
        <p className="text-base-content/60">{t("moments.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "w-full",
          stickyFilter && "sticky top-12 z-10 bg-base-100/95 backdrop-blur pb-2 pt-1",
        )}
      >
        <FilterBar
          groups={typeGroups}
          selected={filters}
          onChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
          className="border-b border-base-200/50"
        />
      </div>

      {filteredData.length === 0 ? (
        <div className="text-center py-10 text-base-content/50">{t("moments.emptyFilter")}</div>
      ) : (
        <>
          <ul className="timeline timeline-vertical timeline-compact -ml-4 md:ml-0">
            {groupedMoments.map(([dateKey, moments], index) => {
              const dateObj = new Date(dateKey);
              return (
                <li key={dateKey}>
                  {index > 0 && <hr className="bg-base-300" />}

                  <div className="timeline-start md:text-end mb-2 md:mb-0 pt-2 min-w-[80px]">
                    <div className="font-mono text-xs opacity-50">{dateObj.getFullYear()}</div>
                    <div className="font-bold text-sm tracking-tight">
                      {dateObj.toLocaleDateString("en-US", {
                        month: t("moments.timeline.format.month") as "short",
                        day: t("moments.timeline.format.day") as "numeric",
                      })}
                    </div>
                  </div>

                  <div className="timeline-middle">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5 text-base-content/20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>

                  <div className="timeline-end mb-10 w-full pl-2 md:pl-0">
                    <div className="flex flex-wrap gap-3">
                      {moments.map((moment, i) => (
                        <Link
                          key={moment.id || i}
                          href={`/imports/${importId}/moments/${moment.id}`}
                          className="block transition-transform hover:-translate-y-1 w-full md:w-auto md:max-w-sm"
                        >
                          <MomentCard moment={moment} className="h-full hover:border-primary/30 hover:shadow-lg" />
                        </Link>
                      ))}
                    </div>
                  </div>

                  <hr className="bg-base-300" />
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="join flex justify-center mt-12 bg-base-200/50 p-1 rounded-2xl w-fit mx-auto">
              <button
                className="join-item btn btn-sm btn-ghost"
                disabled={page === 0}
                onClick={() => setPageAndSync(Math.max(0, page - 1))}
              >
                « {t("common.pagination.prev")}
              </button>
              <button className="join-item btn btn-sm btn-active no-animation pointer-events-none">
                {t("common.pagination.status", { page: page + 1, total: totalPages })}
              </button>
              <button
                className="join-item btn btn-sm btn-ghost"
                disabled={page >= totalPages - 1}
                onClick={() => setPageAndSync(page + 1)}
              >
                {t("common.pagination.next")} »
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
