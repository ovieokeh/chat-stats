"use client";

import React from "react";
import { KpiTile } from "../UI/KpiTile";
import { ChartCard } from "../UI/ChartCard";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid } from "recharts";
import { formatNumber } from "../../lib/format";

import { Heatmap } from "./Heatmap";
import { TopicCloud } from "./TopicCloud";
import { ShareModal } from "./ShareModal";
import { Share2 } from "lucide-react";

// Redefine locally or import shared type if possible.
// For now, inline matches the structure returned by page.tsx
interface HeatmapBucket {
  count: number;
  replyDeltas: number[];
  medianReplySeconds: number;
}

interface OverviewProps {
  stats: {
    totalMessages: number;
    totalWords: number;
    activeDays: number;
    avgDailyMessages: number;
  };
  timelineData: Array<{ date: string; messages: number }>;
  hourlyData: Array<{ hour: number; count: number }>;
  heatmapData: Record<string, HeatmapBucket[][]>; // Changed from number[][]
  participants?: Array<{ id: number; name: string }>; // Needed for dropdown
  topics: { text: string; count: number }[];
  topicsLoading?: boolean;
  onTopicClick: (topic: string) => void;
  onBlockTopic: (topic: string) => void;
}

import { formatDurationHuman } from "../../lib/format";
import { User, Clock, MessageSquare } from "lucide-react";
import { useState, useMemo } from "react";

export const Overview: React.FC<OverviewProps> = ({
  stats,
  timelineData,
  hourlyData,
  heatmapData,
  participants = [],
  topics = [],
  topicsLoading,
  onTopicClick,
  onBlockTopic,
}) => {
  const [metric, setMetric] = useState<"volume" | "speed">("volume");
  const [participantId, setParticipantId] = useState<string>("all");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const transformedData = useMemo(() => {
    const grid = heatmapData[participantId] || heatmapData["all"];
    if (!grid) return [];

    return grid.map((row) =>
      row.map((cell) => {
        if (metric === "volume") {
          return {
            value: cell.count,
            tooltip: `${cell.count} messages`,
          };
        } else {
          // Speed
          // Value: medianReplySeconds.
          // If 0 (no replies), we might want to represent it as "No Data" or worst case?
          // For heatmap coloring, 0 usually means "empty".
          // But here 0 seconds is "Instant".
          // If count is 0, then median is 0 but it means undefined.
          // Let's rely on cell.replyDeltas.length to decide if there is data.
          const hasData = cell.replyDeltas.length > 0;
          return {
            value: hasData ? cell.medianReplySeconds : 0, // 0 if no data, logic in heatmap handles 0 as bg-base-200
            tooltip: hasData ? `Median Reply: ${formatDurationHuman(cell.medianReplySeconds)}` : "No replies",
          };
        }
      })
    );
  }, [heatmapData, metric, participantId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Overview</h2>
          <p className="text-sm opacity-50">Insights at a glance</p>
        </div>
        <button className="btn btn-primary btn-sm rounded-xl gap-2" onClick={() => setIsShareModalOpen(true)}>
          <Share2 className="w-4 h-4" />
          Share Summary
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KpiTile label="Total Messages" value={formatNumber(stats.totalMessages)} />
        <KpiTile label="Total Words" value={formatNumber(stats.totalWords)} />
        <KpiTile label="Active Days" value={stats.activeDays} />
        <KpiTile label="Msgs / Active Day" value={Math.round(stats.avgDailyMessages)} />
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        type="overview"
        data={{
          stats,
          topics: topics.slice(0, 10),
          chatName: "Chat Overview",
        }}
      />

      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ChartCard
              title={metric === "volume" ? "Weekly Activity Heatmap" : "Responsiveness Heatmap"}
              takeaway={
                metric === "volume"
                  ? "Brighter squares show your most intense chat times."
                  : "Darker squares show faster reply times."
              }
              action={
                <div className="flex items-center gap-2">
                  {/* Metric Toggle */}
                  <div className="join">
                    <button
                      className={`btn btn-xs join-item ${metric === "volume" ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setMetric("volume")}
                      title="Message Volume"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </button>
                    <button
                      className={`btn btn-xs join-item ${metric === "speed" ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setMetric("speed")}
                      title="Responsiveness"
                    >
                      <Clock className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Participant Filter */}
                  <select
                    className="select select-bordered select-xs max-w-[120px]"
                    value={participantId}
                    onChange={(e) => setParticipantId(e.target.value)}
                  >
                    <option value="all">Everyone</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id.toString()}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              }
            >
              <Heatmap data={transformedData} metricType={metric} />
            </ChartCard>
          </div>
          <div className="lg:col-span-1">
            <ChartCard title="Topic Cloud" takeaway="What you talk about most. Click to filter history.">
              <div className="h-[300px] -m-2">
                <TopicCloud
                  topics={topics}
                  onTopicClick={onTopicClick}
                  onBlockTopic={onBlockTopic}
                  isLoading={topicsLoading}
                />
              </div>
            </ChartCard>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Message Volume" takeaway="Visualize the ebb and flow of conversation over time.">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="colorMsgs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, opacity: 0.5 }}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <Area
                type="monotone"
                dataKey="messages"
                stroke="currentColor"
                strokeWidth={2}
                className="text-primary"
                fill="url(#colorMsgs)"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Activity by Hour" takeaway="Peak activity times usually indicate free time overlap.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 12, opacity: 0.5 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}:00`}
              />
              <Tooltip
                cursor={{ fill: "var(--base-200)", opacity: 0.3 }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Bar dataKey="count" fill="currentColor" className="text-secondary" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};
