"use client";

import React, { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../lib/db";
import { findInterestingMoments } from "../../lib/analysis";
import { DEFAULT_CONFIG } from "../../types";
import { MomentCard } from "../UI/MomentCard";
import { FilterBar } from "../UI/FilterBar";
import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

interface MomentsFeedProps {
  importId: number;
}

export const MomentsFeed: React.FC<MomentsFeedProps> = ({ importId }) => {
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

  const filteredData = useMemo(() => {
    if (!data) return [];
    let res = data;

    if (filters.type && filters.type.length > 0) {
      res = res.filter((m) => filters.type.includes(m.type));
    }

    return res;
  }, [data, filters]);

  // Show top N moments
  const MAX_DISPLAY = 50;
  const displayMoments = filteredData.slice(0, MAX_DISPLAY);

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
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-base-content/30" />
      </div>
    );
  }

  // Filter Options (moved up logically, but constant so fine anywhere as long as used correctly)
  const typeGroups = [
    {
      key: "type",
      label: "Type",
      multi: true,
      options: [
        { label: "Volume Spike", value: "volume_spike" },
        { label: "Marathon Session", value: "marathon_session" },
        { label: "Revival (Gap)", value: "long_gap" },
        { label: "Sentiment", value: "sentiment_spike" },
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
        <p className="text-base-content/60">No interesting moments found yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FilterBar
        groups={typeGroups}
        selected={filters}
        onChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
        className="border-b border-base-200/50"
      />

      {filteredData.length === 0 ? (
        <div className="text-center py-10 text-base-content/50">No moments match your filters.</div>
      ) : (
        <ul className="timeline timeline-vertical timeline-compact -ml-4 md:ml-0">
          {groupedMoments.map(([dateKey, moments], index) => {
            const dateObj = new Date(dateKey);
            return (
              <li key={dateKey}>
                {index > 0 && <hr className="bg-base-300" />}

                <div className="timeline-start md:text-end mb-2 md:mb-0 pt-2 min-w-[80px]">
                  <div className="font-mono text-xs opacity-50">{dateObj.getFullYear()}</div>
                  <div className="font-bold text-sm tracking-tight">
                    {dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
      )}

      {filteredData.length > MAX_DISPLAY && (
        <div className="text-center pt-2">
          <span className="text-xs text-base-content/50">
            Showing top {MAX_DISPLAY} of {filteredData.length}
          </span>
        </div>
      )}
    </div>
  );
};
