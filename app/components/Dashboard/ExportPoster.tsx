"use client";

import React from "react";
import { MessageSquare, Award, Clock, Hash, Hash as TopicIcon } from "lucide-react";
import { formatNumber } from "../../lib/format";

export type ExportPlatform = "stories" | "feed";
export type ExportType = "leaderboard" | "overview";

export interface Participant {
  id: number;
  name: string;
  msgCount: number;
  wordCount: number;
  yapIndex: number;
  initiationRate: number;
  medianReplyTime: number;
  nightOwlCount: number;
  earlyBirdCount: number;
  ghostCount: number;
  doubleTextCount: number;
}

interface ExportPosterProps {
  type: ExportType;
  platform: ExportPlatform;
  insightId?: string;
  data: {
    participants?: Participant[];
    stats?: {
      totalMessages: number;
      totalWords: number;
      activeDays: number;
      avgDailyMessages: number;
    };
    topics?: { text: string; count: number }[];
    chatName?: string;
  };
}

export const ExportPoster: React.FC<ExportPosterProps> = ({ type, platform, insightId = "volume", data }) => {
  const isStories = platform === "stories";

  // Base dimensions based on platform
  const dimensions = isStories ? { width: 1080, height: 1920 } : { width: 1080, height: 1080 };

  const bgGradient = "bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900";

  // Insight configurations
  const insightConfigs: Record<
    string,
    {
      title: string;
      subtitle: string;
      metricLabel: string;
      getVal: (p: Participant) => number | string;
      sort: (a: Participant, b: Participant) => number;
    }
  > = {
    volume: {
      title: "CHAT\nROYALE",
      subtitle: "WHO YAPS THE MOST?",
      metricLabel: "Messages",
      getVal: (p) => p.msgCount.toLocaleString(),
      sort: (a, b) => b.msgCount - a.msgCount,
    },
    yap: {
      title: "THE YAP\nKINGS",
      subtitle: "WORDS PER MESSAGE",
      metricLabel: "Yap Index",
      getVal: (p) => p.yapIndex.toFixed(1),
      sort: (a, b) => b.yapIndex - a.yapIndex,
    },
    speed: {
      title: "INSTANT\nREPLIES",
      subtitle: "FASTEST RESPONDERS",
      metricLabel: "Median Reply",
      getVal: (p) => {
        const s = p.medianReplyTime;
        if (s === 0) return "No Data";
        if (s < 60) return `${Math.round(s)}s`;
        if (s < 3600) return `${Math.floor(s / 60)}m`;
        return `${(s / 3600).toFixed(1)}h`;
      },
      sort: (a, b) => {
        if (a.medianReplyTime === 0) return 1;
        if (b.medianReplyTime === 0) return -1;
        return a.medianReplyTime - b.medianReplyTime;
      },
    },
    night: {
      title: "NIGHT\nOWLS",
      subtitle: "12AM - 5AM ACTIVITY",
      metricLabel: "Night Msgs",
      getVal: (p) => p.nightOwlCount.toLocaleString(),
      sort: (a, b) => b.nightOwlCount - a.nightOwlCount,
    },
    early: {
      title: "EARLY\nBIRDS",
      subtitle: "5AM - 9AM ACTIVITY",
      metricLabel: "Early Msgs",
      getVal: (p) => p.earlyBirdCount.toLocaleString(),
      sort: (a, b) => b.earlyBirdCount - a.earlyBirdCount,
    },
    ghost: {
      title: "THE\nGHOSTS",
      subtitle: "LONGEST REPLY GAPS",
      metricLabel: "Ghosting",
      getVal: (p) => `${p.ghostCount} times`,
      sort: (a, b) => b.ghostCount - a.ghostCount,
    },
    double: {
      title: "DOUBLE\nTEXTERS",
      subtitle: "TALKING TO THEMSELVES",
      metricLabel: "Double Texts",
      getVal: (p) => p.doubleTextCount.toLocaleString(),
      sort: (a, b) => b.doubleTextCount - a.doubleTextCount,
    },
  };

  const config = insightConfigs[insightId] || insightConfigs.volume;
  const displayTitle = type === "overview" ? "CHAT\nWRAPPED" : config.title;

  return (
    <div
      id="export-poster"
      className={`${bgGradient} text-white flex flex-col font-sans p-16 relative overflow-hidden`}
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
      }}
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-5%] left-[-10%] w-[50%] h-[30%] bg-pink-500/20 rounded-full blur-[100px]" />

      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-7xl font-black tracking-tighter mb-2 italic leading-tight whitespace-pre-line">
            {displayTitle}
          </h1>
          <p className="text-2xl font-bold opacity-60 uppercase tracking-[0.3em]">
            {type === "leaderboard" ? config.subtitle : data.chatName || "Analysis 2025"}
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 shadow-2xl">
          <MessageSquare className="w-12 h-12" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center gap-10">
        {type === "leaderboard" && data.participants && (
          <div className="space-y-6">
            {data.participants
              .sort(config.sort)
              .slice(0, 5)
              .map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-6 p-8 rounded-[3rem] border transition-all ${
                    i === 0
                      ? "bg-white text-indigo-900 border-white shadow-[0_20px_60px_rgba(255,255,255,0.25)] scale-105"
                      : "bg-white/5 border-white/10 backdrop-blur-md"
                  }`}
                >
                  <div
                    className={`text-3xl font-black w-20 h-20 rounded-full flex items-center justify-center ${
                      i === 0 ? "bg-indigo-900 text-white" : "bg-white/10"
                    }`}
                  >
                    #{i + 1}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-4xl font-black truncate max-w-[450px] ${
                        i === 0 ? "text-indigo-900" : "text-white"
                      }`}
                    >
                      {p.name}
                    </p>
                    <p className={`text-xl font-bold opacity-60 uppercase tracking-wider mt-1`}>
                      {config.metricLabel}: {config.getVal(p)}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-6">
                    <div className="flex flex-col items-end">
                      <p className={`text-xs font-black opacity-30 uppercase ${i === 0 ? "text-indigo-900/40" : ""}`}>
                        Initiations
                      </p>
                      <p className={`text-xl font-bold ${i === 0 ? "text-indigo-900" : ""}`}>
                        {Math.round(p.initiationRate)}%
                      </p>
                    </div>
                    {i === 0 && <Award className="w-12 h-12 text-indigo-900" />}
                  </div>
                </div>
              ))}
          </div>
        )}

        {type === "overview" && data.stats && (
          <div className="grid grid-cols-2 gap-8">
            <StatCard
              label="Total Vibes"
              value={formatNumber(data.stats.totalMessages)}
              icon={<MessageSquare className="w-8 h-8" />}
              subLabel="Messages Sent"
            />
            <StatCard
              label="Deep Thoughts"
              value={formatNumber(data.stats.totalWords)}
              icon={<Hash className="w-8 h-8" />}
              subLabel="Total Words"
            />
            <StatCard
              label="Days Alive"
              value={data.stats.activeDays.toString()}
              icon={<Clock className="w-8 h-8" />}
              subLabel="Active Chat Days"
            />
            <StatCard
              label="Yap Power"
              value={Math.round(data.stats.avgDailyMessages).toString()}
              icon={<Award className="w-8 h-8" />}
              subLabel="Msgs / Active Day"
            />

            {data.topics && data.topics.length > 0 && (
              <div className="col-span-2 mt-8 bg-white/5 border border-white/10 p-10 rounded-[50px] backdrop-blur-md">
                <div className="flex items-center gap-4 mb-8">
                  <TopicIcon className="w-8 h-8 text-pink-400" />
                  <h3 className="text-3xl font-black tracking-tight uppercase">Top Topics</h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  {data.topics.slice(0, 8).map((t, i) => (
                    <span
                      key={i}
                      className="bg-white/10 px-6 py-3 rounded-2xl text-xl font-bold border border-white/10"
                    >
                      #{t.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 flex justify-between items-end border-t border-white/10 pt-10">
        <div>
          <p className="text-xl font-medium opacity-40">Chat Analyzer 2025</p>
          <p className="text-sm font-bold opacity-30 mt-1 uppercase tracking-widest">Local-First Analysis</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400">
            {isStories ? "STORY RECAP" : "FEED RECAP"}
          </p>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode; subLabel: string }> = ({
  label,
  value,
  icon,
  subLabel,
}) => (
  <div className="bg-white/5 border border-white/10 p-10 rounded-[50px] backdrop-blur-md">
    <div className="p-4 bg-white/10 w-fit rounded-2xl mb-6">{icon}</div>
    <p className="text-xl font-bold opacity-30 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-6xl font-black mb-2 tracking-tighter">{value}</p>
    <p className="text-xl font-bold opacity-60 uppercase tracking-wider">{subLabel}</p>
  </div>
);
