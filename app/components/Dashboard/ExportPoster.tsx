"use client";

import React from "react";
import { MessageSquare, Award, Clock, Hash, Moon, Zap, Ghost, Divide, Share2, Sun } from "lucide-react";
import { formatNumber } from "../../lib/format";

export type ExportPlatform = "stories" | "feed";
// We now export based on "Persona" logic rather than just generic types
export type ExportType = "persona" | "leaderboard" | "overview";

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
  insightId?: string; // used to select specific persona if type is 'persona'
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

  // Theme Colors (using CSS variables would be ideal, but for image export we need explicit flavors often)
  // We'll simulate the "Neo-Editorial" look with high contrast and bold colors.

  const personaConfigs: Record<
    string,
    {
      roleTitle: string;
      heroTitle: string;
      tagline: string;
      icon: React.ReactNode;
      getVal: (p: Participant) => string;
      getDetail: (p: Participant, total?: number) => string;
      sort: (a: Participant, b: Participant) => number;
      bgClass: string;
      accentClass: string;
    }
  > = {
    volume: {
      roleTitle: "THE PROTAGONIST",
      heroTitle: "MAIN\nCHARACTER\nENERGY",
      tagline: "The group chat doesn't exist without you.",
      icon: <Award className="w-full h-full" />,
      getVal: (p) => formatNumber(p.msgCount),
      getDetail: (p) => `msgs sent`,
      sort: (a, b) => b.msgCount - a.msgCount,
      bgClass: "bg-primary text-primary-content",
      accentClass: "bg-white/20",
    },
    yap: {
      roleTitle: "THE YAPPER",
      heroTitle: "CERTIFIED\nYAPAHOLIC",
      tagline: "Why say it in 5 words when 50 will do?",
      icon: <Share2 className="w-full h-full" />,
      getVal: (p) => p.yapIndex.toFixed(1),
      getDetail: (p) => `words / msg`,
      sort: (a, b) => b.yapIndex - a.yapIndex,
      bgClass: "bg-secondary text-secondary-content",
      accentClass: "bg-white/20",
    },
    speed: {
      roleTitle: "THE SPEEDSTER",
      heroTitle: "CHRONICALLY\nONLINE",
      tagline: "Do you even handle lock your phone?",
      icon: <Zap className="w-full h-full" />,
      getVal: (p) => {
        const s = p.medianReplyTime;
        if (s < 60) return `${Math.round(s)}s`;
        if (s < 3600) return `${Math.floor(s / 60)}m`;
        return `${(s / 3600).toFixed(1)}h`;
      },
      getDetail: (p) => `reply time`,
      sort: (a, b) => {
        if (a.medianReplyTime === 0) return 1;
        if (b.medianReplyTime === 0) return -1;
        return a.medianReplyTime - b.medianReplyTime;
      },
      bgClass: "bg-accent text-accent-content",
      accentClass: "bg-white/20",
    },
    night: {
      roleTitle: "THE VAMPIRE",
      heroTitle: "MIDNIGHT\nMENACE",
      tagline: "Sleep is for the weak.",
      icon: <Moon className="w-full h-full" />,
      getVal: (p) => formatNumber(p.nightOwlCount),
      getDetail: (p) => `msgs after 12AM`,
      sort: (a, b) => b.nightOwlCount - a.nightOwlCount,
      bgClass: "bg-neutral text-neutral-content",
      accentClass: "bg-white/10",
    },
    ghost: {
      roleTitle: "THE GHOST",
      heroTitle: "LEFT ON\nREAD",
      tagline: "See you in 3-5 business days.",
      icon: <Ghost className="w-full h-full" />,
      getVal: (p) => `${p.ghostCount}`,
      getDetail: (p) => `times ghosted`,
      sort: (a, b) => b.ghostCount - a.ghostCount,
      bgClass: "bg-base-300 text-base-content",
      accentClass: "bg-black/10",
    },
    double: {
      roleTitle: "THE DOUBLE TEXTER",
      heroTitle: "PLEASE\nRESPOND",
      tagline: "Talking to themselves (again).",
      icon: <MessageSquare className="w-full h-full" />,
      getVal: (p) => formatNumber(p.doubleTextCount),
      getDetail: (p) => `double texts`,
      sort: (a, b) => b.doubleTextCount - a.doubleTextCount,
      bgClass: "bg-info text-info-content",
      accentClass: "bg-white/20",
    },
  };

  const config = personaConfigs[insightId] || personaConfigs.volume;

  // Find the 'winner' for this specific trait
  const participants = data.participants || [];
  // Sort by the config specific sort
  const sorted = [...participants].sort(config.sort);

  // If the top person has 0 for this metric (e.g. 0 night messages), fallback to just volume leader
  // to avoid showing "No Data" or a blank card, but ideally we show "No Data" if literally no one qualifies?
  // Actually, user said "Live preview always says no data available". This implies logic is too strict.
  // Let's debug by ensuring we default to *someone* even if the value is 0, or check if data.participants is actually populated.

  let winner = sorted[0];

  // Fallback: If no winner (empty array), or winner has 0 value for key metrics where 0 is invalid (like speed=0 means no data?),
  // we might want to just show the person with most messages as a fallback or handle it gracefully.
  // For now, let's just ensure we don't bail out aggressively.

  if (!winner && participants.length > 0) {
    winner = participants[0];
  }

  if (!winner && type === "persona") {
    // If we truly have no participants, show a placeholder but make it look like the card
    return (
      <div
        id="export-poster"
        className={`flex flex-col font-sans relative overflow-hidden bg-neutral text-neutral-content items-center justify-center`}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
        }}
      >
        <p className="text-4xl font-bold opacity-50">Add participants to generate personas</p>
      </div>
    );
  }

  return (
    <div
      id="export-poster"
      className={`flex flex-col font-sans relative overflow-hidden ${type === "persona" ? config.bgClass : "bg-neutral text-neutral-content"}`}
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
      }}
    >
      {/* Texture / Noise Overlay (Optional Simulation) */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {type === "persona" && winner && (
        <div className={`flex-1 flex flex-col ${isStories ? "p-12 md:p-16" : "p-8 md:p-12"} relative z-10`}>
          {/* Top Bar */}
          <div className={`flex justify-between items-center ${isStories ? "mb-12" : "mb-6"}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${config.accentClass} backdrop-blur-sm`}>
                <div className="w-8 h-8 opacity-90">{config.icon}</div>
              </div>
              <span className="font-bold tracking-widest uppercase opacity-70 text-lg">
                {data.chatName || "Chat Analysis"}
              </span>
            </div>
            <div className="font-mono opacity-50 text-xl tracking-tighter">2025</div>
          </div>

          {/* Role Header */}
          <div className={isStories ? "mb-8" : "mb-4"}>
            <div
              className={`inline-block px-6 py-2 rounded-full border-2 border-current font-black tracking-widest uppercase text-xl mb-6 opacity-80 backdrop-blur-md`}
            >
              {config.roleTitle}
            </div>
          </div>

          {/* Main Content: The Winner */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Massive Hero Title */}
            <h1
              className={`${isStories ? "text-[140px]" : "text-[80px]"} leading-[0.85] font-black tracking-tighter ${isStories ? "mb-12" : "mb-6"} uppercase mix-blend-overlay opacity-90`}
            >
              {config.heroTitle}
            </h1>

            {/* The Person */}
            <div className={`flex items-end gap-8 ${isStories ? "mb-16" : "mb-8"}`}>
              <div
                className={`${isStories ? "w-48 h-48 text-[100px]" : "w-32 h-32 text-[60px]"} rounded-full bg-current flex items-center justify-center font-black overflow-hidden relative shadow-2xl`}
              >
                <span className={`${config.bgClass} absolute inset-1 rounded-full flex items-center justify-center`}>
                  {winner.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 pb-4">
                <p className={`${isStories ? "text-6xl" : "text-4xl"} font-black tracking-tight leading-none mb-2`}>
                  {winner.name}
                </p>
                <p className={`${isStories ? "text-3xl" : "text-xl"} font-medium opacity-80 italic`}>
                  {config.tagline}
                </p>
              </div>
            </div>

            {/* The Stats */}
            <div
              className={`${isStories ? "p-12 rounded-[3rem]" : "p-8 rounded-[2rem]"} ${config.accentClass} backdrop-blur-md border border-white/10`}
            >
              <div className="flex items-baseline gap-4 mb-2">
                <span className={`${isStories ? "text-9xl" : "text-7xl"} font-black tracking-tighter tabular-nums`}>
                  {config.getVal(winner)}
                </span>
                <span
                  className={`${isStories ? "text-3xl" : "text-2xl"} font-bold uppercase tracking-wider opacity-60`}
                >
                  {config.getDetail(winner)}
                </span>
              </div>
              <div className="h-4 w-full bg-black/10 rounded-full overflow-hidden">
                <div className="h-full bg-current w-full box-border border-4 border-transparent opacity-50"></div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`${isStories ? "mt-12" : "mt-6"} flex justify-between items-end opacity-60`}>
            <div className="text-lg font-bold tracking-wide">CHAT ANALYZER</div>
            <div className="text-sm font-mono">GENERATED LOCALLY</div>
          </div>
        </div>
      )}

      {/* Fallback for Leaderboard/Overview (Simplified for now to match style) */}
      {type !== "persona" && (
        <div className="flex-1 flex items-center justify-center p-16">
          <div className="text-center">
            <h1 className="text-8xl font-black tracking-tighter mb-8">
              {type === "leaderboard" ? "THE\nRANKINGS" : "CHAT\nWRAPPED"}
            </h1>
            <p className="text-2xl opacity-60 max-w-2xl mx-auto">
              Select a specific persona to generate a character card.
            </p>
          </div>
        </div>
      )}
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
