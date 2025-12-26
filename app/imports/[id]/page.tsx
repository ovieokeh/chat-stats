"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { db, clearDatabase } from "../../lib/db";
import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { Overview } from "../../components/Dashboard/Overview";
import { ParticipantStats } from "../../components/Dashboard/ParticipantStats";
import { ChatViewer } from "../../components/Dashboard/ChatViewer";
import { SessionsList } from "../../components/Dashboard/SessionsList";
import { MomentsFeed } from "../../components/Dashboard/MomentsFeed";
import { Leaderboard } from "../../components/Dashboard/Leaderboard";
import { format } from "date-fns";
import { Loader2, X, Eye, EyeOff, Users } from "lucide-react";
import { ConfigPanel } from "../../components/ConfigPanel";
import { ExportConfig } from "../../types";
import { Navbar } from "../../components/Dashboard/Navbar";

import { useRouter, useSearchParams } from "next/navigation";
import { extractTopics } from "../../lib/analysis";
import { Participant } from "../../types";

const COMMON_BOTS = ["Meta AI", "WhatsApp"];

export default function ImportDashboard() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const importId = parseInt(Array.isArray(params.id) ? params.id[0] : params.id);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Tab state synced with URL
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === "moments" || tabParam === "history" || tabParam === "sessions" || tabParam === "leaderboard"
      ? tabParam
      : "overview";

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

  const handleDeleteAllData = async () => {
    if (confirm("Are you sure you want to permanently delete ALL imported data? This cannot be undone.")) {
      try {
        await clearDatabase();
        router.push("/");
      } catch (e) {
        console.error("Failed to delete data", e);
        alert("Error deleting data");
      }
    }
  };

  // Fetch data
  const importRecord = useLiveQuery(() => db.imports.get(importId), [importId]);
  const allParticipants = useLiveQuery(() => db.participants.where("importId").equals(importId).toArray(), [importId]);

  // Aggregated Stats
  const stats = useLiveQuery(async () => {
    if (!importId) return null;

    // Parallel queries
    const allMessages = await db.messages.where("importId").equals(importId).toArray();
    const participants = await db.participants.where("importId").equals(importId).toArray();

    const hiddenParticipantIds = new Set(
      participants
        .filter((p) => p.isHidden || COMMON_BOTS.some((bot) => p.displayName.toLowerCase().includes(bot.toLowerCase())))
        .map((p) => p.id)
    );

    const messages = allMessages.filter((m) => !m.senderId || !hiddenParticipantIds.has(m.senderId));
    const totalMessages = messages.length;

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
            if (sorted.length % 2 === 0) {
              bucket.medianReplySeconds = (sorted[mid - 1] + sorted[mid]) / 2;
            } else {
              bucket.medianReplySeconds = sorted[mid];
            }
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
    const allMessages = await db.messages.where("importId").equals(importId).toArray();
    const participants = await db.participants.where("importId").equals(importId).toArray();

    const hiddenParticipantIds = new Set(
      participants
        .filter((p) => p.isHidden || COMMON_BOTS.some((bot) => p.displayName.toLowerCase().includes(bot.toLowerCase())))
        .map((p) => p.id)
    );

    const messages = allMessages.filter((m) => !m.senderId || !hiddenParticipantIds.has(m.senderId));

    // Fetch global stopwords
    const stopwordsList = await db.stopwords.toArray();
    const customStopwords = new Set(stopwordsList.map((s) => s.word));

    return await extractTopics(messages, customStopwords);
  }, [importId]);

  // Participants Data
  const participantsData = useLiveQuery(async () => {
    if (!importId) return [];

    const [participants, msgs, replyEdges, sessions] = await Promise.all([
      db.participants.where("importId").equals(importId).toArray(),
      db.messages.where("[importId+ts]").between([importId, Dexie.minKey], [importId, Dexie.maxKey]).toArray(),
      db.replyEdges.where("importId").equals(importId).toArray(),
      db.sessions.where("importId").equals(importId).toArray(),
    ]);

    // Pre-calculate double text counts by sender
    const doubleTextCounts: Record<number, number> = {};
    let lastSenderId: number | null = null;
    msgs.forEach((m) => {
      if (m.senderId === lastSenderId && m.senderId !== null) {
        doubleTextCounts[m.senderId] = (doubleTextCounts[m.senderId] || 0) + 1;
      }
      lastSenderId = m.senderId;
    });

    const visibleParticipantIds = new Set(participants.filter((p) => !p.isHidden && !p.isSystem).map((p) => p.id));
    const totalVisibleInitiations = sessions.filter(
      (s) => s.initiatorId && visibleParticipantIds.has(s.initiatorId)
    ).length;

    return participants
      .filter((p) => {
        if (p.isSystem) return false;

        // Auto-hide bots if not already marked
        const isBot = COMMON_BOTS.some((bot) => p.displayName.toLowerCase().includes(bot.toLowerCase()));
        if (isBot && p.isHidden === undefined) {
          // We can't easily side-effect the DB update inside useLiveQuery efficiently without causing loops
          // but we can just filter it out here for now.
          return false;
        }

        return !p.isHidden;
      })
      .map((p) => {
        const pMsgs = msgs.filter((m) => m.senderId === p.id);
        const pEdges = replyEdges.filter((e) => e.fromSenderId === p.id);
        const pSessions = sessions.filter((s) => s.initiatorId === p.id);

        const msgCount = pMsgs.length;
        const wordCount = pMsgs.reduce((acc, m) => acc + (m.wordCount || 0), 0);
        const yapIndex = msgCount > 0 ? wordCount / msgCount : 0;

        // Initiation Rate (Relative to visible set)
        const initiationRate = totalVisibleInitiations > 0 ? (pSessions.length / totalVisibleInitiations) * 100 : 0;

        // Reply Stats
        const deltas = pEdges.map((e) => e.deltaSeconds).sort((a, b) => a - b);
        const avgReplyTime = pEdges.length ? deltas.reduce((a, b) => a + b, 0) / pEdges.length : 0;

        // Median Reply
        const mid = Math.floor(deltas.length / 2);
        const medianReplyTime =
          deltas.length === 0 ? 0 : deltas.length % 2 === 0 ? (deltas[mid - 1] + deltas[mid]) / 2 : deltas[mid];

        // Time Waiting
        const secondsKeptWaiting = pEdges.reduce((acc, e) => acc + e.deltaSeconds, 0);

        // Night Owl (00:00 - 05:00)
        const nightOwlCount = pMsgs.filter((m) => {
          const h = new Date(m.ts).getHours();
          return h >= 0 && h < 5;
        }).length;

        // Early Bird (05:00 - 09:00)
        const earlyBirdCount = pMsgs.filter((m) => {
          const h = new Date(m.ts).getHours();
          return h >= 5 && h < 9;
        }).length;

        // Ghost Count (replies > 12h)
        const ghostCount = pEdges.filter((e) => e.deltaSeconds > 12 * 3600).length;

        // Double Text
        const doubleTextCount = doubleTextCounts[p.id!] || 0;

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
    <div className="flex flex-col h-screen overflow-hidden bg-base-100">
      <Navbar
        filename={importRecord.filename}
        importedAt={importRecord.importedAt}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 overflow-y-auto w-full max-w-6xl mx-auto px-4 md:px-6 py-6 pb-20">
        <div className="flex flex-col gap-6">
          {/* Tab Navigation */}
          <div role="tablist" className="tabs tabs-boxed bg-base-200/50 p-1 inline-block w-fit">
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
              className={`tab ${activeTab === "leaderboard" ? "tab-active bg-base-100 shadow-sm" : ""}`}
              onClick={() => setActiveTab("leaderboard")}
            >
              Leaderboard
            </a>
            <a
              role="tab"
              className={`tab ${activeTab === "history" ? "tab-active bg-base-100 shadow-sm" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              History
            </a>
          </div>

          <div className="flex-1 min-h-0">
            {activeTab === "overview" && (
              <section className="animate-in fade-in duration-300">
                <div className="">
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

                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Participants</h2>
                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="text-xs btn btn-ghost btn-xs gap-1 opacity-50 hover:opacity-100"
                    >
                      <Users className="w-3 h-3" /> Manage
                    </button>
                  </div>
                  <ParticipantStats participants={participantsData || []} />
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

            {activeTab === "leaderboard" && (
              <section className="animate-in fade-in duration-300">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">The Leaderboard</h2>
                  <p className="text-base-content/60">Rankings across various metrics and behavioral patterns.</p>
                </div>
                <Leaderboard participants={participantsData || []} />
              </section>
            )}

            {activeTab === "history" && (
              <section className="animate-in fade-in duration-300 h-full flex flex-col">
                {searchParams.get("start") && (
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="badge badge-lg badge-primary gap-2 p-3 font-semibold shadow-sm">
                        Session View
                        <button
                          className="hover:scale-110 transition-transform"
                          onClick={() => {
                            const newParams = new URLSearchParams(searchParams.toString());
                            newParams.delete("start");
                            newParams.delete("end");
                            router.replace(`?${newParams.toString()}`);
                          }}
                          title="Exit session view"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-xs opacity-60 hidden sm:inline">Showing specific time range</span>
                    </div>
                  </div>
                )}
                <div className="flex-1 min-h-0">
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
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

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

            <div className="divider my-6">Danger Zone</div>
            <div className="bg-error/10 border border-error/20 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-error">Destroy All Data</h4>
                <p className="text-sm opacity-70">
                  Permanently delete all imported chats and analysis from this device.
                </p>
              </div>
              <button className="btn btn-error btn-outline btn-sm" onClick={handleDeleteAllData}>
                Delete Everything
              </button>
            </div>

            <div className="divider my-6">Participant Visibility</div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {allParticipants
                ?.filter((p) => !p.isSystem)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${p.isHidden ? "bg-base-content/20" : "bg-success"}`} />
                      <span className={`text-sm font-semibold ${p.isHidden ? "opacity-40" : ""}`}>{p.displayName}</span>
                    </div>
                    <button
                      className={`btn btn-xs btn-ghost gap-2 ${p.isHidden ? "text-primary" : "opacity-40"}`}
                      onClick={async () => {
                        await db.participants.update(p.id!, { isHidden: !p.isHidden });
                      }}
                    >
                      {p.isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {p.isHidden ? "Show" : "Hide"}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setIsSettingsOpen(false)}>close</button>
        </form>
      </dialog>
    </div>
  );
}
