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

  // Group sessions by day
  const groupedSessions = React.useMemo(() => {
    if (!sessions?.headers) return [];

    const groups: { date: string; sessions: any[] }[] = [];
    sessions.headers.forEach((header) => {
      const dateStr = format(header.startTs, "yyyy-MM-dd");
      let group = groups.find((g) => g.date === dateStr);
      if (!group) {
        group = { date: dateStr, sessions: [] };
        groups.push(group);
      }
      group.sessions.push(header);
    });
    return groups;
  }, [sessions?.headers]);

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
        <div className="grid gap-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Sessions Explorer
          <span className="badge badge-sm badge-neutral text-[10px] font-mono opacity-70 uppercase tracking-widest">
            {sessions.count} total
          </span>
        </h3>
      </div>

      <div className="space-y-8">
        {groupedSessions.map((group) => (
          <div key={group.date} className="relative">
            <div className="sticky top-0 z-10 bg-base-100/80 backdrop-blur-md py-2 mb-3 border-b border-base-200">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-base-content/40">
                {format(new Date(group.date), "EEEE, MMMM d, yyyy")}
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {group.sessions.map((session) => {
                const startTime = format(session.startTs, "h:mm a");
                const duration = formatDurationSimple((session.endTs - session.startTs) / 1000);
                const initiatorName = session.initiatorId ? participantMap.get(session.initiatorId) : "Unknown";
                const colorClass = initiatorName ? getAvatarColor(initiatorName) : "bg-base-300";

                return (
                  <div
                    key={session.id}
                    className="group flex items-center gap-4 p-2 pl-3 bg-base-100 border border-base-200 hover:border-primary/40 hover:bg-base-200/50 transition-all cursor-pointer rounded-xl"
                    onClick={() => goToSession(session.startTs, session.endTs)}
                  >
                    {/* Compact Initiator */}
                    <div className="flex items-center gap-3 w-40 shrink-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shadow-sm ${colorClass}`}
                      >
                        {initiatorName?.substring(0, 1).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-xs truncate leading-tight">{initiatorName}</p>
                        <p className="text-[10px] opacity-40 font-mono leading-tight">{startTime}</p>
                      </div>
                    </div>

                    {/* Stats Horizontal */}
                    <div className="flex-1 flex items-center gap-6 justify-end mr-4">
                      <div className="text-right">
                        <p className="text-[9px] opacity-30 uppercase font-black tracking-tighter mb-0.5">Duration</p>
                        <p className="text-xs font-mono font-bold leading-none">{duration}</p>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="text-[9px] opacity-30 uppercase font-black tracking-tighter mb-0.5">Msgs</p>
                        <p className="text-xs font-mono font-bold leading-none">{session.messageCount}</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <ArrowRight className="w-3.5 h-3.5 text-primary" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="join flex justify-center mt-12 bg-base-200/50 p-1 rounded-2xl w-fit mx-auto">
          <button
            className="join-item btn btn-sm btn-ghost"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            « Prev
          </button>
          <button className="join-item btn btn-sm btn-active no-animation pointer-events-none">
            Page {page + 1} of {totalPages}
          </button>
          <button
            className="join-item btn btn-sm btn-ghost"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next »
          </button>
        </div>
      )}
    </div>
  );
};
