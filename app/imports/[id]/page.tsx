"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "../../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Overview } from "../../components/Dashboard/Overview";
import { ParticipantStats } from "../../components/Dashboard/ParticipantStats";
import { ChatViewer } from "../../components/Dashboard/ChatViewer";
import { SessionsList } from "../../components/Dashboard/SessionsList";
import { MomentsFeed } from "../../components/Dashboard/MomentsFeed";
import { format } from "date-fns";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatDurationSimple } from "../../lib/format";
import { ConfigPanel } from "../../components/ConfigPanel";
import { ExportConfig } from "../../types";
import { Settings } from "lucide-react";

import { useRouter, useSearchParams } from "next/navigation";
import { extractTopics } from "../../lib/analysis";

export default function ImportDashboard() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const importId = parseInt(Array.isArray(params.id) ? params.id[0] : params.id);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Tab state synced with URL
  const tabParam = searchParams.get("tab");
  const activeTab = tabParam === "moments" || tabParam === "history" || tabParam === "sessions" ? tabParam : "overview";

  const setActiveTab = (tab: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", tab);
    router.replace(`?${newParams.toString()}`, { scroll: false });
  };

  const [isRecomputing, setIsRecomputing] = useState(false);

  const handleConfigSave = async (newConfig: ExportConfig) => {
    if (!importId) return;

    try {
      setIsRecomputing(true);
      // Update DB
      await db.imports.update(importId, {
        configJson: JSON.stringify(newConfig),
      });

      // Trigger re-computation
      // Dynamically import the heavy function only when needed (optional, but good practice if it was huge)
      // For now, direct usage is fine as verified in plan.
      const { recomputeImportAnalysis } = await import("../../lib/recompute");
      await recomputeImportAnalysis(importId);

      // alert("Settings saved and analysis re-computed.");
      setIsSettingsOpen(false);
    } catch (e) {
      console.error("Failed to recompute", e);
      alert("Error saving settings");
    } finally {
      setIsRecomputing(false);
    }
  };

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

    // Avg daily (Active Days)
    const avgDailyMessages = activeDays > 0 ? totalMessages / activeDays : 0;

    // Timeline Data (by month)
    const timelineMap = new Map<string, number>();
    messages.forEach((m) => {
      const k = format(m.ts, "MMM yyyy");
      timelineMap.set(k, (timelineMap.get(k) || 0) + 1);
    });
    const timelineData = Array.from(timelineMap.entries()).map(([date, messages]) => ({ date, messages }));

    // Hourly Data
    const hourlyMap = new Array(24).fill(0);

    // Heatmap Data Structure
    // [participantId | 'all'] -> [Day 0-6][Hour 0-23] -> { count: number, replyDeltas: number[], medianReplySeconds: number }
    type HeatmapBucket = { count: number; replyDeltas: number[]; medianReplySeconds: number };
    const heatmaps: Record<string, HeatmapBucket[][]> = {};

    const initGrid = () =>
      Array(7)
        .fill(0)
        .map(() =>
          Array(24)
            .fill(0)
            .map(() => ({ count: 0, replyDeltas: [], medianReplySeconds: 0 }))
        );

    heatmaps["all"] = initGrid();

    // Fetch reply edges to populate responsiveness
    const replyEdges = await db.replyEdges.where("importId").equals(importId).toArray();
    // Create a map of messageId -> replyEdge for O(1) lookup to find if a message is a reply
    // Actually, we need to attribute the reply time to the REPLIER's timestamp (Time of the reply message)
    // The edge struct: { fromMessageId, deltaSeconds, fromSenderId, ... }
    // We can iterate edges directly to populate 'replyDeltas'.

    // 1. Fill Message Counts
    messages.forEach((m) => {
      const date = new Date(m.ts);
      const h = date.getHours();
      const d = date.getDay();

      // Global
      heatmaps["all"][d][h].count++;

      // Per Participant
      if (m.senderId) {
        const key = m.senderId.toString();
        if (!heatmaps[key]) heatmaps[key] = initGrid();
        heatmaps[key][d][h].count++;
      }

      hourlyMap[h]++;
    });

    // 2. Fill Reply Deltas
    replyEdges.forEach((edge) => {
      // Find the timestamp of the REPLY message (fromMessage)
      // We don't have it directly in edge, but we can look it up.
      // Optimization: We already have 'messages' loaded.
      // But looking up in array is O(N).
      // Let's create a map of msgId -> ts first? Or just iterate messages again?
      // Better: In step 1, we iterated ALL messages.
      // Actually, we can just use a Map<id, msg> or Map<id, ts>.
    });

    // Optimization: Build a Message Map?
    const msgMap = new Map<number, number>(); // id -> ts
    messages.forEach((m) => msgMap.set(m.id!, m.ts));

    replyEdges.forEach((edge) => {
      const ts = msgMap.get(edge.fromMessageId);
      if (!ts) return;

      const date = new Date(ts);
      const h = date.getHours();
      const d = date.getDay();
      const senderId = edge.fromSenderId;

      // Global
      heatmaps["all"][d][h].replyDeltas.push(edge.deltaSeconds);

      // Per Participant
      if (senderId) {
        const key = senderId.toString();
        if (!heatmaps[key]) heatmaps[key] = initGrid();
        heatmaps[key][d][h].replyDeltas.push(edge.deltaSeconds);
      }
    });

    // 3. Compute Medians
    Object.keys(heatmaps).forEach((key) => {
      heatmaps[key].forEach((row) => {
        row.forEach((bucket) => {
          if (bucket.replyDeltas.length > 0) {
            const sorted = [...bucket.replyDeltas].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            bucket.medianReplySeconds = sorted[mid];
          }
        });
      });
    });

    const hourlyData = hourlyMap.map((count, hour) => ({ hour, count }));

    // 4. Topic Extraction (Local-first) - DECOUPLED
    // Return placeholder
    const topics: { text: string; count: number }[] = [];

    return {
      totalMessages,
      totalWords,
      activeDays,
      avgDailyMessages,
      timelineData,
      hourlyData,
      heatmaps,
      topics,
    };
  }, [importId]);

  // Topics Data (Decoupled for better UX)
  const topicsData = useLiveQuery(async () => {
    if (!importId) return undefined;

    // Fetch messages again (optimize later if needed, but dexie is fast)
    // We only need rawText actually, but getting full objects is simpler for now
    const messages = await db.messages.where("importId").equals(importId).toArray();

    // Fetch global stopwords
    const stopwordsList = await db.stopwords.toArray();
    const customStopwords = new Set(stopwordsList.map((s) => s.word));

    return await extractTopics(messages, customStopwords);
  }, [importId]);

  // Participants Data
  const participantsData = useLiveQuery(async () => {
    if (!importId) return [];
    const participants = await db.participants.where("importId").equals(importId).toArray();
    const msgs = await db.messages.where("importId").equals(importId).toArray();
    const replyEdges = await db.replyEdges.where("importId").equals(importId).toArray();
    const sessions = await db.sessions.where("importId").equals(importId).toArray(); // Needed for initiation

    return participants
      .filter((p) => !p.isSystem)
      .map((p) => {
        const pMsgs = msgs.filter((m) => m.senderId === p.id);
        const pEdges = replyEdges.filter((e) => e.fromSenderId === p.id);
        const pSessions = sessions.filter((s) => s.initiatorId === p.id);

        const msgCount = pMsgs.length;
        const wordCount = pMsgs.reduce((acc, m) => acc + (m.wordCount || 0), 0);
        const yapIndex = msgCount > 0 ? wordCount / msgCount : 0;

        // Initiation Rate
        const initiationRate = sessions.length > 0 ? (pSessions.length / sessions.length) * 100 : 0;

        // Reply Stats
        const deltas = pEdges.map((e) => e.deltaSeconds).sort((a, b) => a - b);
        const avgReplyTime = pEdges.length ? deltas.reduce((a, b) => a + b, 0) / pEdges.length : 0;

        // Median Reply
        const mid = Math.floor(deltas.length / 2);
        const medianReplyTime = deltas.length > 0 ? deltas[mid] : 0;

        // Time Waiting (How long THIS person made OTHERS wait -> Sum of their reply deltas)
        const secondsKeptWaiting = pEdges.reduce((acc, e) => acc + e.deltaSeconds, 0);

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
    <main className="max-w-6xl w-full mx-auto px-4 md:px-6 py-8 space-y-8 pb-32 overflow-y-scroll">
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

      <div className="absolute top-8 right-4 md:right-8">
        <button className="btn btn-ghost btn-circle" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="w-5 h-5 text-base-content/70" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div role="tablist" className="tabs tabs-boxed bg-base-200/50 p-1 mb-6 inline-block">
        <a
          role="tab"
          className={`tab ${activeTab === "overview" ? "tab-active bg-base-100 shadow-sm" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </a>
        <a
          role="tab"
          className={`tab ${activeTab === "sessions" ? "tab-active bg-base-100 shadow-sm" : ""}`}
          onClick={() => setActiveTab("sessions")}
        >
          Sessions
        </a>
        <a
          role="tab"
          className={`tab ${activeTab === "moments" ? "tab-active bg-base-100 shadow-sm" : ""}`}
          onClick={() => setActiveTab("moments")}
        >
          Moments
          <span className="ml-2 badge badge-xs badge-primary">Beta</span>
        </a>
        <a
          role="tab"
          className={`tab ${activeTab === "history" ? "tab-active bg-base-100 shadow-sm" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          History
        </a>
      </div>

      {activeTab === "overview" && (
        <section className="animate-in fade-in duration-300">
          <h2 className="text-xl font-semibold mb-4">Participants</h2>
          <ParticipantStats participants={participantsData || []} />

          <div className="mt-8">
            <h2 className="sr-only">Overview</h2>
            <Overview
              stats={stats}
              timelineData={stats.timelineData}
              hourlyData={stats.hourlyData}
              heatmapData={stats.heatmaps}
              participants={participantsData}
              topics={topicsData || []}
              topicsLoading={topicsData === undefined}
              onTopicClick={(topic) => {
                const newParams = new URLSearchParams(searchParams.toString());
                newParams.set("tab", "history");
                newParams.set("q", topic);
                router.replace(`?${newParams.toString()}`);
              }}
              onBlockTopic={async (topic) => {
                // Add to global stopwords
                try {
                  await db.stopwords.add({ word: topic.toLowerCase() });
                } catch (e) {
                  /* ignore duplicate */
                }
              }}
            />
          </div>
        </section>
      )}

      {activeTab === "sessions" && (
        <section className="animate-in fade-in duration-300">
          <SessionsList importId={importId} />
        </section>
      )}

      {activeTab === "moments" && (
        <section className="animate-in fade-in duration-300">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Interesting Moments</h2>
            <p className="text-base-content/60">Key events and anomalies detected in your conversation.</p>
          </div>
          {/* Grid is handled inside MomentsFeed now to include filters. */}
          <MomentsFeed importId={importId} />
        </section>
      )}

      {activeTab === "history" && (
        <section className="animate-in fade-in duration-300 h-[calc(100vh-180px)] min-h-[500px] flex flex-col">
          {searchParams.get("start") && (
            <div className="mb-2 flex items-center gap-2">
              <div className="badge badge-lg badge-primary gap-2 p-3">
                Session View
                <button
                  className="btn btn-circle btn-xs btn-ghost text-white"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams.toString());
                    newParams.delete("start");
                    newParams.delete("end");
                    router.replace(`?${newParams.toString()}`);
                  }}
                >
                  ✕
                </button>
              </div>
              <span className="text-xs opacity-60">Showing specific time range</span>
            </div>
          )}
          <ChatViewer
            importId={importId}
            timeRange={
              searchParams.get("start") && searchParams.get("end")
                ? {
                    startTs: parseInt(searchParams.get("start")!),
                    endTs: parseInt(searchParams.get("end")!),
                  }
                : undefined
            }
            initialSearchTerm={searchParams.get("q") || ""}
          />
        </section>
      )}

      {/* Settings Modal */}
      <dialog id="settings_modal" className="modal modal-bottom sm:modal-middle" open={isSettingsOpen}>
        <div className="modal-box p-0 w-11/12 max-w-2xl bg-base-100">
          <form method="dialog">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setIsSettingsOpen(false)}
            >
              ✕
            </button>
          </form>

          <div className="p-6">
            <h3 className="font-bold text-lg mb-4">Dashboard Settings</h3>
            {importRecord?.configJson && (
              <ConfigPanel
                config={JSON.parse(importRecord.configJson)}
                onSave={handleConfigSave}
                onReset={() => console.log("Reset in modal not fully implied, uses default")}
              />
            )}
            {isRecomputing && (
              <div className="absolute inset-0 bg-base-100/80 flex items-center justify-center z-10 rounded-xl">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="font-medium animate-pulse">Re-analyzing conversation...</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setIsSettingsOpen(false)}>close</button>
        </form>
      </dialog>
    </main>
  );
}
