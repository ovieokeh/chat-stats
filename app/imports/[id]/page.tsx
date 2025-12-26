"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "../../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Overview } from "../../components/Dashboard/Overview";
import { ParticipantStats } from "../../components/Dashboard/ParticipantStats";
import { ChatViewer } from "../../components/Dashboard/ChatViewer";
import { format } from "date-fns";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatDurationSimple } from "../../lib/format";

export default function ImportDashboard() {
  const params = useParams();
  const importId = parseInt(Array.isArray(params.id) ? params.id[0] : params.id);

  // Fetch data
  const importRecord = useLiveQuery(() => db.imports.get(importId), [importId]);

  // Aggregated Stats
  const stats = useLiveQuery(async () => {
    if (!importId) return null;

    // Parallel queries
    const totalMessages = await db.messages.where("importId").equals(importId).count();
    const messages = await db.messages.where("importId").equals(importId).toArray(); // needed for word count sum
    // Note: huge array in memory. Optimize with dedicated aggregate table in real app.
    // For 40k msgs, ~10MB JSON. Chrome can handle it.

    const totalWords = messages.reduce((acc, m) => acc + (m.wordCount || 0), 0);

    // Active Days
    const days = new Set(messages.map((m) => format(m.ts, "yyyy-MM-dd")));
    const activeDays = days.size;

    // Avg daily
    const durationMs = messages[messages.length - 1]?.ts - messages[0]?.ts;
    const durationDays = durationMs / (1000 * 60 * 60 * 24) || 1;
    const avgDailyMessages = totalMessages / durationDays;

    // Timeline Data (by month)
    const timelineMap = new Map<string, number>();
    messages.forEach((m) => {
      const k = format(m.ts, "MMM yyyy");
      timelineMap.set(k, (timelineMap.get(k) || 0) + 1);
    });
    const timelineData = Array.from(timelineMap.entries()).map(([date, messages]) => ({ date, messages }));

    // Hourly Data
    const hourlyMap = new Array(24).fill(0);
    messages.forEach((m) => {
      const h = new Date(m.ts).getHours();
      hourlyMap[h]++;
    });
    const hourlyData = hourlyMap.map((count, hour) => ({ hour, count }));

    return {
      totalMessages,
      totalWords,
      activeDays,
      avgDailyMessages,
      timelineData,
      hourlyData,
    };
  }, [importId]);

  // Participants Data
  const participantsData = useLiveQuery(async () => {
    if (!importId) return [];
    const participants = await db.participants.where("importId").equals(importId).toArray();
    const msgs = await db.messages.where("importId").equals(importId).toArray();
    const replyEdges = await db.replyEdges.where("importId").equals(importId).toArray();

    return participants
      .filter((p) => !p.isSystem)
      .map((p) => {
        const pMsgs = msgs.filter((m) => m.senderId === p.id);
        const pEdges = replyEdges.filter((e) => e.fromSenderId === p.id);

        const msgCount = pMsgs.length;
        const wordCount = pMsgs.reduce((acc, m) => acc + (m.wordCount || 0), 0);

        // Avg reply time
        const totalReplyTime = pEdges.reduce((acc, e) => acc + e.deltaSeconds, 0);
        const avgReplyTime = pEdges.length ? totalReplyTime / pEdges.length : 0;

        return {
          id: p.id!,
          name: p.displayName,
          msgCount,
          wordCount,
          avgReplyTime,
        };
      });
  }, [importId]);

  if (!importRecord || !stats) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8 pb-32 overflow-y-scroll">
      <div className="flex items-center gap-4">
        <Link href="/" className="btn btn-circle btn-ghost">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{importRecord.filename}</h1>
          <p className="text-base-content/60 text-sm">
            Imported {format(importRecord.importedAt, "MMM d, yyyy HH:mm")}
          </p>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <Overview stats={stats} timelineData={stats.timelineData} hourlyData={stats.hourlyData} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Participants</h2>
        <ParticipantStats participants={participantsData || []} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Explorer</h2>
        <ChatViewer importId={importId} />
      </section>
    </main>
  );
}
