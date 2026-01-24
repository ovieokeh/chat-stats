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
import { format } from "date-fns";
import { Loader2, Users } from "lucide-react";
import { ExportConfig } from "../../types";
import { Navbar } from "../../components/Dashboard/Navbar";
import { AnalysisConfigModal } from "../../components/Dashboard/AnalysisConfigModal";
import { ParticipantVisibilityModal } from "../../components/Dashboard/ParticipantVisibilityModal";

import { useRouter, useSearchParams } from "next/navigation";
import { extractTopics, getTzMetadata } from "../../lib/analysis";
import { PageLayout } from "../../components/Layout/PageLayout";

const COMMON_BOTS = ["Meta AI", "WhatsApp"];

export default function ImportDashboard() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const importId = parseInt(Array.isArray(params.id) ? params.id[0] : params.id);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(false);

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
      const { recomputeImportAnalysis } = await import("../../lib/recompute");
      await recomputeImportAnalysis(importId);

      setIsConfigOpen(false);
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
    if (!importId || !importRecord) return null;

    // Parallel queries
    const [allMessages, participants, replyEdges] = await Promise.all([
      db.messages.where("importId").equals(importId).toArray(),
      db.participants.where("importId").equals(importId).toArray(),
      db.replyEdges.where("importId").equals(importId).toArray(),
    ]);

    const hiddenParticipantIds = new Set(
      participants
        .filter((p) => p.isHidden || COMMON_BOTS.some((bot) => p.displayName.toLowerCase().includes(bot.toLowerCase())))
        .map((p) => p.id),
    );

    const messages = allMessages.filter((m) => !m.senderId || !hiddenParticipantIds.has(m.senderId));
    const totalMessages = messages.length;
    const totalWords = messages.reduce((acc, m) => acc + (m.wordCount || 0), 0);

    const config = JSON.parse(importRecord.configJson) as ExportConfig;
    const timezone = config?.parsing?.timezone || "UTC";

    // Active Days
    const days = new Set(messages.map((m) => format(m.ts, "yyyy-MM-dd")));
    const activeDays = days.size;
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
    type HeatmapBucket = { count: number; replyDeltas: number[]; medianReplySeconds: number };
    const heatmaps: Record<string, HeatmapBucket[][]> = {};

    const initGrid = () =>
      Array(7)
        .fill(0)
        .map(() =>
          Array(24)
            .fill(0)
            .map(() => ({ count: 0, replyDeltas: [], medianReplySeconds: 0 })),
        );

    heatmaps["all"] = initGrid();

    // 1. Fill Message Counts
    messages.forEach((m) => {
      const { hour: h, day: d } = getTzMetadata(m.ts, timezone);
      heatmaps["all"][d][h].count++;

      if (m.senderId) {
        const key = m.senderId.toString();
        if (!heatmaps[key]) heatmaps[key] = initGrid();
        heatmaps[key][d][h].count++;
      }
      hourlyMap[h]++;
    });

    // 2. Fill Reply Deltas
    const msgMap = new Map<number, number>();
    messages.forEach((m) => msgMap.set(m.id!, m.ts));

    replyEdges.forEach((edge) => {
      const ts = msgMap.get(edge.fromMessageId);
      if (!ts) return;
      const { hour: h, day: d } = getTzMetadata(ts, timezone);

      heatmaps["all"][d][h].replyDeltas.push(edge.deltaSeconds);
      if (edge.fromSenderId) {
        const key = edge.fromSenderId.toString();
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
            bucket.medianReplySeconds = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
          }
        });
      });
    });

    const hourlyData = hourlyMap.map((count, hour) => ({ hour, count }));

    return {
      totalMessages,
      totalWords,
      activeDays,
      avgDailyMessages,
      timelineData,
      hourlyData,
      heatmaps,
      topics: [],
    };
  }, [importId, importRecord]);

  // Topics Data
  const topicsData = useLiveQuery(async () => {
    if (!importId) return undefined;
    const [allMessages, participants, stopwordsList] = await Promise.all([
      db.messages.where("importId").equals(importId).toArray(),
      db.participants.where("importId").equals(importId).toArray(),
      db.stopwords.toArray(),
    ]);

    const hiddenParticipantIds = new Set(
      participants
        .filter((p) => p.isHidden || COMMON_BOTS.some((bot) => p.displayName.toLowerCase().includes(bot.toLowerCase())))
        .map((p) => p.id),
    );

    const messages = allMessages.filter((m) => !m.senderId || !hiddenParticipantIds.has(m.senderId));
    const customStopwords = new Set(stopwordsList.map((s) => s.word));

    return await extractTopics(messages, customStopwords);
  }, [importId]);

  // Participants Data
  const participantsData = useLiveQuery(async () => {
    if (!importId || !importRecord) return [];

    const [participants, msgs, replyEdges, sessions] = await Promise.all([
      db.participants.where("importId").equals(importId).toArray(),
      db.messages.where("[importId+ts]").between([importId, Dexie.minKey], [importId, Dexie.maxKey]).toArray(),
      db.replyEdges.where("importId").equals(importId).toArray(),
      db.sessions.where("importId").equals(importId).toArray(),
    ]);

    const config = JSON.parse(importRecord.configJson) as ExportConfig;
    const timezone = config?.parsing?.timezone || "UTC";

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
      (s) => s.initiatorId && visibleParticipantIds.has(s.initiatorId),
    ).length;

    return participants
      .filter((p) => !p.isSystem && !p.isHidden)
      .map((p) => {
        const pMsgs = msgs.filter((m) => m.senderId === p.id);
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

        // Calculate total messages from visible participants for message share
        const totalVisibleMessages = msgs.filter((m) => m.senderId && visibleParticipantIds.has(m.senderId)).length;
        const messageShare = totalVisibleMessages > 0 ? (msgCount / totalVisibleMessages) * 100 : 0;

        // "Carrying the Relationship" score: weighted combo of initiation + volume
        // Higher = this person is putting in more effort
        const carryScore = initiationRate * 0.6 + messageShare * 0.4;

        // "Left on Read" count: sessions where this person did NOT send the last message
        // (meaning they left the other person hanging as the conversation died)
        const leftOnReadCount = sessions.filter((s) => {
          // Get last message in session
          const sessionMsgs = msgs.filter((m) => m.ts >= s.startTs && m.ts <= s.endTs && m.senderId);
          if (sessionMsgs.length === 0) return false;
          const lastMsg = sessionMsgs[sessionMsgs.length - 1];
          // If last message was NOT by this person, they left someone on read
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
  }, [importId, importRecord]);

  if (!importRecord || !stats) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full bg-base-100">
      <PageLayout
        maxWidth="6xl"
        preserveScroll={true}
        header={
          <Navbar
            filename={importRecord.filename}
            importedAt={importRecord.importedAt}
            onSettingsClick={() => setIsConfigOpen(true)}
          />
        }
      >
        <div className="flex flex-col gap-6 pb-20">
          <div role="tablist" className="tabs tabs-boxed bg-base-200/50 p-1 inline-block w-fit">
            {["overview", "moments", "sessions", "history"].map((t) => (
              <a
                key={t}
                role="tab"
                className={`tab ${activeTab === t ? "tab-active bg-base-100 shadow-sm" : ""}`}
                onClick={() => setActiveTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </a>
            ))}
          </div>

          <div className="flex-1 min-h-0">
            {activeTab === "overview" && (
              <section className="animate-in fade-in duration-300">
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Participants</h2>
                    <button
                      onClick={() => setIsVisibilityOpen(true)}
                      className="text-xs btn btn-ghost btn-xs gap-1 opacity-50 hover:opacity-100"
                    >
                      <Users className="w-3 h-3" /> Manage
                    </button>
                  </div>
                  <ParticipantStats participants={participantsData || []} />
                </div>

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
                    try {
                      await db.stopwords.add({ word: topic.toLowerCase() });
                    } catch (e) {}
                  }}
                />
              </section>
            )}

            {activeTab === "sessions" && <SessionsList importId={importId} />}
            {activeTab === "moments" && <MomentsFeed importId={importId} />}
            {activeTab === "history" && (
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
            )}
          </div>
        </div>
      </PageLayout>

      <AnalysisConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={importRecord?.configJson ? JSON.parse(importRecord.configJson) : null}
        onSave={handleConfigSave}
        isRecomputing={isRecomputing}
        onDeleteAllData={handleDeleteAllData}
      />

      <ParticipantVisibilityModal
        isOpen={isVisibilityOpen}
        onClose={() => setIsVisibilityOpen(false)}
        participants={allParticipants}
      />
    </div>
  );
}
