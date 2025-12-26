"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Dexie from "dexie";
import { db } from "../../lib/db";
import { format } from "date-fns";
import { formatDurationSimple } from "../../lib/format";
import { ArrowRight, Clock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAvatarColor } from "../../lib/colors";
import { Skeleton } from "../UI/Skeleton";

interface SessionsListProps {
  importId: number;
}

const ITEMS_per_PAGE = 20;

export const SessionsList: React.FC<SessionsListProps> = ({ importId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(0);

  // Fetch participants for name resolution
  const participants = useLiveQuery(() => db.participants.where("importId").equals(importId).toArray(), [importId]);

  const participantMap = React.useMemo(() => {
    const map = new Map<number, string>();
    participants?.forEach((p) => map.set(p.id!, p.displayName));
    return map;
  }, [participants]);

  // Fetch sessions - sorted by startTs descending
  const sessions = useLiveQuery(async () => {
    // Dexie: sort by [importId+startTs] for efficiency via compound index
    // reverse() for newest first
    const coll = db.sessions
      .where("[importId+startTs]")
      .between([importId, Dexie.minKey], [importId, Dexie.maxKey])
      .reverse();

    const count = await coll.count();
    const headers = await coll
      .offset(page * ITEMS_per_PAGE)
      .limit(ITEMS_per_PAGE)
      .toArray();

    return { count, headers };
  }, [importId, page]);

  const goToSession = (startTs: number, endTs: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "history");
    params.set("start", startTs.toString());
    params.set("end", endTs.toString());
    router.push(`?${params.toString()}`);
  };

  const totalPages = sessions ? Math.ceil(sessions.count / ITEMS_per_PAGE) : 0;

  if (!sessions) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Sessions Explorer
          <span className="badge badge-neutral text-xs">{sessions.count} total</span>
        </h3>
      </div>

      <div className="grid gap-3">
        {sessions.headers.map((session) => {
          const startTime = format(session.startTs, "MMM d, yyyy • h:mm a");
          const duration = formatDurationSimple((session.endTs - session.startTs) / 1000);
          const initiatorName = session.initiatorId ? participantMap.get(session.initiatorId) : "Unknown";
          const colorClass = initiatorName ? getAvatarColor(initiatorName) : "bg-base-300";

          return (
            <div
              key={session.id}
              className="card bg-base-100 shadow-sm border border-base-200 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group focus-within:ring-2 focus-within:ring-primary"
            >
              <button
                className="card-body p-4 flex flex-row items-center justify-between gap-4 text-left w-full"
                onClick={() => goToSession(session.startTs, session.endTs)}
                aria-label={`View session starting ${startTime}`}
              >
                {/* Left: Initiator & Time */}
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${colorClass}`}
                    aria-hidden="true"
                  >
                    {initiatorName?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm truncate">
                      Started by <span className="text-primary">{initiatorName}</span>
                    </h4>
                    <p className="text-xs text-base-content/60">{startTime}</p>
                  </div>
                </div>

                {/* Middle: Stats */}
                <div className="flex items-center gap-6 hidden sm:flex shrink-0">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-mono font-bold opacity-80">{duration}</span>
                    <span className="text-[10px] uppercase opacity-50">Duration</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-mono font-bold opacity-80">{session.messageCount}</span>
                    <span className="text-[10px] uppercase opacity-50">Msgs</span>
                  </div>
                </div>

                {/* Right: Action */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="btn btn-sm btn-ghost btn-circle">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="join flex justify-center mt-8">
          <button className="join-item btn btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            «
          </button>
          <button className="join-item btn btn-sm">Page {page + 1}</button>
          <button
            className="join-item btn btn-sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            »
          </button>
        </div>
      )}
    </div>
  );
};
