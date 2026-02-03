"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import Dexie from "dexie";
import { ArrowLeft } from "lucide-react";
import { db } from "../../../lib/db";
import { ExportConfig, EnrichedParticipant, Moment, Message, Session, ReplyEdge, Participant } from "../../../types";
import { DEFAULT_CONFIG } from "../../../types";
import { getTzMetadata, findInterestingMoments } from "../../../lib/analysis";
import { StoryPlayer } from "../../../components/Wrapped/StoryPlayer";
import { buildWrappedSlides, HeatmapBucket, WrappedYearData } from "../../../components/Wrapped/WrappedSlides";
import { formatDateRange } from "../../../lib/format";
import Link from "next/link";
import { cn } from "../../../lib/utils";
import { Skeleton } from "../../../components/UI/Skeleton";

const COMMON_BOTS = ["Meta AI", "WhatsApp"];

const buildHeatmap = (messages: Message[], replyEdges: ReplyEdge[], timezone: string) => {
  const initGrid = () =>
    Array(7)
      .fill(0)
      .map(() =>
        Array(24)
          .fill(0)
          .map(() => ({ count: 0, replyDeltas: [], medianReplySeconds: 0 }) as HeatmapBucket),
      );

  const grid = initGrid();
  const msgMap = new Map<number, number>();
  messages.forEach((m) => {
    if (m.id) msgMap.set(m.id, m.ts);
    const { hour, day } = getTzMetadata(m.ts, timezone);
    grid[day][hour].count += 1;
  });

  replyEdges.forEach((edge) => {
    const ts = msgMap.get(edge.fromMessageId);
    if (!ts) return;
    const { hour, day } = getTzMetadata(ts, timezone);
    grid[day][hour].replyDeltas.push(edge.deltaSeconds);
  });

  grid.forEach((row) => {
    row.forEach((bucket) => {
      if (bucket.replyDeltas.length > 0) {
        const sorted = [...bucket.replyDeltas].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        bucket.medianReplySeconds = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      }
    });
  });

  return grid;
};

const buildParticipants = (
  participants: { id?: number; displayName: string; isHidden?: boolean; isSystem: boolean }[],
  messages: Message[],
  replyEdges: ReplyEdge[],
  sessions: Session[],
  timezone: string,
): EnrichedParticipant[] => {
  const doubleTextCounts: Record<number, number> = {};
  let lastSenderId: number | null = null;

  messages.forEach((m) => {
    if (m.senderId === lastSenderId && m.senderId !== null) {
      doubleTextCounts[m.senderId] = (doubleTextCounts[m.senderId] || 0) + 1;
    }
    lastSenderId = m.senderId;
  });

  const visibleParticipantIds = new Set(participants.filter((p) => !p.isHidden && !p.isSystem).map((p) => p.id));
  const totalVisibleInitiations = sessions.filter(
    (s) => s.initiatorId && visibleParticipantIds.has(s.initiatorId),
  ).length;
  const totalVisibleMessages = messages.filter((m) => m.senderId && visibleParticipantIds.has(m.senderId)).length;

  return participants
    .filter((p) => !p.isSystem && !p.isHidden)
    .map((p) => {
      const pMsgs = messages.filter((m) => m.senderId === p.id);
      const pEdges = replyEdges.filter((e) => e.fromSenderId === p.id);
      const pSessions = sessions.filter((s) => s.initiatorId === p.id);

      const msgCount = pMsgs.length;
      const wordCount = pMsgs.reduce((acc, m) => acc + (m.wordCount || 0), 0);
      const yapIndex = msgCount > 0 ? wordCount / msgCount : 0;
      const initiationRate = totalVisibleInitiations > 0 ? (pSessions.length / totalVisibleInitiations) * 100 : 0;

      const deltas = pEdges.map((e) => e.deltaSeconds).sort((a, b) => a - b);
      const avgReplyTime = pEdges.length ? deltas.reduce((a, b) => a + b, 0) / pEdges.length : 0;
      const mid = Math.floor(deltas.length / 2);
      const medianReplyTime =
        deltas.length === 0 ? 0 : deltas.length % 2 === 0 ? (deltas[mid - 1] + deltas[mid]) / 2 : deltas[mid];

      const longestReplyTime = deltas.length > 0 ? deltas[deltas.length - 1] : 0;

      const secondsKeptWaiting = pEdges.reduce((acc, e) => acc + e.deltaSeconds, 0);
      const nightOwlCount = pMsgs.filter((m) => getTzMetadata(m.ts, timezone).hour < 5).length;
      const earlyBirdCount = pMsgs.filter((m) => {
        const h = getTzMetadata(m.ts, timezone).hour;
        return h >= 5 && h < 9;
      }).length;
      const ghostCount = pEdges.filter((e) => e.deltaSeconds > 12 * 3600).length;
      const doubleTextCount = doubleTextCounts[p.id!] || 0;

      const messageShare = totalVisibleMessages > 0 ? (msgCount / totalVisibleMessages) * 100 : 0;
      const carryScore = initiationRate * 0.6 + messageShare * 0.4;

      const leftOnReadCount = sessions.filter((s) => {
        const sessionMsgs = messages.filter((m) => m.ts >= s.startTs && m.ts <= s.endTs && m.senderId);
        if (sessionMsgs.length === 0) return false;
        const lastMsg = sessionMsgs[sessionMsgs.length - 1];
        return lastMsg.senderId !== p.id && lastMsg.senderId !== undefined;
      }).length;

      return {
        id: p.id!,
        name: p.displayName,
        msgCount,
        wordCount,
        yapIndex,
        initiationRate,
        avgReplyTime,
        medianReplyTime,
        secondsKeptWaiting,
        nightOwlCount,
        earlyBirdCount,
        ghostCount,
        doubleTextCount,
        longestReplyTime,
        messageShare,
        carryScore,
        leftOnReadCount,
      };
    });
};

const buildYearData = (
  year: number,
  chatName: string,
  allMessages: Message[],
  participants: Participant[],
  sessions: Session[],
  replyEdges: ReplyEdge[],
  config: ExportConfig,
): WrappedYearData | null => {
  const timezone = config?.parsing?.timezone || "UTC";
  const yearMessages = allMessages.filter((m) => getTzMetadata(m.ts, timezone).date.slice(0, 4) === String(year));
  if (yearMessages.length === 0) return null;

  const ids = new Set(yearMessages.map((m) => m.id));
  const yearEdges = replyEdges.filter((e) => ids.has(e.fromMessageId));

  const sortedMessages = [...yearMessages].sort((a, b) => a.ts - b.ts);
  const minTs = sortedMessages[0].ts;
  const maxTs = sortedMessages[sortedMessages.length - 1].ts;
  const yearSessions = sessions.filter((s) => s.endTs >= minTs && s.startTs <= maxTs);

  const totalMessages = yearMessages.length;
  const totalWords = yearMessages.reduce((acc, m) => acc + (m.wordCount || 0), 0);
  const activeDays = new Set(yearMessages.map((m) => getTzMetadata(m.ts, timezone).date)).size;
  const avgDailyMessages = activeDays > 0 ? totalMessages / activeDays : 0;

  const participantsData = buildParticipants(participants, yearMessages, yearEdges, yearSessions, timezone);
  const heatmap = buildHeatmap(yearMessages, yearEdges, timezone);

  const moments = findInterestingMoments(yearMessages, yearSessions, config) as Moment[];
  const sortedMoments = [...moments].sort((a, b) => b.importance - a.importance);

  return {
    year,
    chatName,
    dateRange: { start: minTs, end: maxTs },
    stats: {
      totalMessages,
      totalWords,
      activeDays,
      avgDailyMessages,
    },
    participants: participantsData,
    heatmap,
    moments: sortedMoments,
  };
};

const WrappedSkeleton = () => (
  <div className="min-h-screen bg-base-100 text-base-content">
    <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="h-8 w-8" />
        <div>
          <Skeleton className="h-3 w-24 rounded-full mb-2" />
          <Skeleton className="h-6 w-44 rounded-full" />
          <Skeleton className="h-3 w-28 rounded-full mt-2" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </div>

    <div className="max-w-5xl mx-auto px-4 pb-10 flex justify-center">
      <div className="w-full max-h-[85vh] h-[85vh] flex items-center justify-center">
        <div className="aspect-[9/16] h-full max-w-[calc(85vh*9/16)] w-full">
          <div className="relative h-full w-full overflow-hidden rounded-[32px] border border-base-200 bg-base-200/40">
            <div className="absolute inset-0">
              <div className="absolute -top-28 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute bottom-0 -left-20 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
            </div>
            <div className="absolute top-4 left-4 right-4 flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-1 flex-1 rounded-full" />
              ))}
            </div>
            <div className="relative z-10 h-full w-full p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-10 w-4/5 rounded-2xl mt-6" />
                <Skeleton className="h-4 w-1/2 rounded-full mt-3" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function WrappedYearPage() {
  const params = useParams();
  const importId = parseInt(Array.isArray(params.id) ? params.id[0] : params.id);

  const data = useLiveQuery(async () => {
    if (!importId) return null;
    const [importRecord, participants, messages, sessions, replyEdges] = await Promise.all([
      db.imports.get(importId),
      db.participants.where("importId").equals(importId).toArray(),
      db.messages.where("[importId+ts]").between([importId, Dexie.minKey], [importId, Dexie.maxKey]).toArray(),
      db.sessions.where("importId").equals(importId).toArray(),
      db.replyEdges.where("importId").equals(importId).toArray(),
    ]);

    if (!importRecord) return null;

    const config = importRecord.configJson ? (JSON.parse(importRecord.configJson) as ExportConfig) : DEFAULT_CONFIG;
    const timezone = config?.parsing?.timezone || "UTC";

    const hiddenParticipantIds = new Set(
      participants
        .filter((p) => p.isHidden || COMMON_BOTS.some((bot) => p.displayName.toLowerCase().includes(bot.toLowerCase())))
        .map((p) => p.id),
    );

    const visibleMessages = messages.filter((m) => !m.senderId || !hiddenParticipantIds.has(m.senderId));
    const visibleParticipants = participants.filter((p) => !hiddenParticipantIds.has(p.id));
    const visibleSessions = sessions.filter((s) => !s.initiatorId || !hiddenParticipantIds.has(s.initiatorId));
    const visibleEdges = replyEdges.filter(
      (e) => !hiddenParticipantIds.has(e.fromSenderId) && !hiddenParticipantIds.has(e.toSenderId),
    );

    const years = Array.from(
      new Set(visibleMessages.map((m) => parseInt(getTzMetadata(m.ts, timezone).date.slice(0, 4), 10))),
    )
      .filter(Boolean)
      .sort((a, b) => a - b);

    const perYear = years
      .map((year) =>
        buildYearData(
          year,
          importRecord.filename,
          visibleMessages,
          visibleParticipants,
          visibleSessions,
          visibleEdges,
          config,
        ),
      )
      .filter(Boolean) as WrappedYearData[];

    return {
      years,
      perYear,
      debug: {
        totalMessages: messages.length,
        visibleMessages: visibleMessages.length,
        totalParticipants: participants.length,
        visibleParticipants: visibleParticipants.length,
        totalSessions: sessions.length,
        totalEdges: replyEdges.length,
        visibleEdges: visibleEdges.length,
        timezone,
      },
    };
  }, [importId]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [replayCount, setReplayCount] = useState(0);

  const activeYearData = useMemo(() => {
    if (!data || data.perYear.length === 0) return null;
    const year = selectedYear ?? data.perYear[data.perYear.length - 1].year;
    return data.perYear.find((y) => y.year === year) || data.perYear[data.perYear.length - 1];
  }, [data, selectedYear]);

  if (!data) {
    return <WrappedSkeleton />;
  }

  if (data.perYear.length === 0 || !activeYearData) {
    return (
      <div className="min-h-screen bg-base-100 text-base-content">
        <div className="max-w-3xl mx-auto px-4 py-20">
          <div className="rounded-3xl border border-base-200 bg-base-200/60 p-10 text-center">
            <div className="text-xs uppercase tracking-[0.4em] opacity-50">ChatWrapped</div>
            <div className="mt-4 text-3xl font-black tracking-tight">No messages to wrap</div>
            <div className="mt-2 text-sm opacity-60">
              This import has no visible messages after filters. Try unhiding participants or check another import.
            </div>
            {data.debug && (
              <div className="mt-6 text-left text-xs font-mono bg-base-100/70 border border-base-200 rounded-2xl p-4 space-y-1">
                <div>totalMessages: {data.debug.totalMessages}</div>
                <div>visibleMessages: {data.debug.visibleMessages}</div>
                <div>totalParticipants: {data.debug.totalParticipants}</div>
                <div>visibleParticipants: {data.debug.visibleParticipants}</div>
                <div>totalSessions: {data.debug.totalSessions}</div>
                <div>totalEdges: {data.debug.totalEdges}</div>
                <div>visibleEdges: {data.debug.visibleEdges}</div>
                <div>timezone: {data.debug.timezone}</div>
                <div>yearsDetected: {data.years.join(", ") || "none"}</div>
              </div>
            )}
            <div className="mt-6">
              <Link href={`/imports/${importId}`} className="btn btn-primary rounded-full">
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const slides = buildWrappedSlides(activeYearData);
  const slideDurations = [4000, 8000, 8000, 8000, 4000];
  const storyKey = `${activeYearData.year}-${replayCount}`;

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/imports/${importId}`} className="btn btn-ghost btn-circle btn-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="text-xs uppercase tracking-[0.35em] opacity-50">ChatWrapped</div>
            <div className="text-lg font-black">{activeYearData.chatName}</div>
            <div className="text-xs opacity-60">
              {formatDateRange(activeYearData.dateRange.start, activeYearData.dateRange.end)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            className={cn("select select-bordered select-sm rounded-full")}
            value={activeYearData.year}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          >
            {data.years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm rounded-full" onClick={() => setReplayCount((count) => count + 1)}>
            Replay
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-10 flex justify-center">
        <div className="w-full max-h-[85vh] h-[85vh] flex items-center justify-center">
          <div className="aspect-[9/16] h-full max-w-[calc(85vh*9/16)] w-full">
            <StoryPlayer key={storyKey} slides={slides} durationsMs={slideDurations} />
          </div>
        </div>
      </div>
    </div>
  );
}
