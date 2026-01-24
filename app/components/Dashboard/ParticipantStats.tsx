"use client";

import React from "react";
import { MessageSquare, Zap, UserPlus, EyeOff, Ghost, Clock, HelpCircle } from "lucide-react";
import { formatDurationHuman } from "../../lib/format";
import { Skeleton } from "../UI/Skeleton";
import { usePrivacy } from "../../context/PrivacyContext";
import { obfuscateName } from "../../lib/utils";
import { Crown, FastForward, Copy, TrendingUp } from "lucide-react";
import { db } from "../../lib/db";
import { motion } from "framer-motion";

// Tooltip component for explaining metrics
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
  <div className="relative group/tooltip inline-flex items-center">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block bg-neutral text-neutral-content text-[10px] px-2 py-1.5 rounded-lg whitespace-nowrap z-20 shadow-lg max-w-[200px] text-center leading-snug">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral" />
    </div>
  </div>
);

interface Participant {
  id: number;
  name: string;
  msgCount: number;
  wordCount: number;
  yapIndex: number;
  initiationRate: number;
  medianReplyTime: number;
  avgReplyTime: number;
  secondsKeptWaiting: number;
  nightOwlCount: number;
  earlyBirdCount: number;
  ghostCount: number;
  doubleTextCount: number;
  longestReplyTime: number;
  messageShare: number;
  carryScore: number;
  leftOnReadCount: number;
}

interface ParticipantStatsProps {
  participants: Participant[];
}

interface Badge {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export const ParticipantStats: React.FC<ParticipantStatsProps> = ({ participants }) => {
  const { isPrivacyMode } = usePrivacy();

  if (!participants || participants.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-base-100 border border-base-200 rounded-[2rem] p-8 h-80">
            <Skeleton className="h-8 w-1/3 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Calculate total messages for share percentage
  const totalMessages = participants.reduce((acc, p) => acc + p.msgCount, 0);

  // Calculate Badges (who is #1 in what)
  const getBadges = (p: Participant): Badge[] => {
    const badges: Badge[] = [];

    const isTop = (metric: keyof Participant, higherIsBetter = true) => {
      const val = p[metric] as number;
      if (val === 0) return false;
      return !participants.some((other) => {
        const otherVal = other[metric] as number;
        return other.id !== p.id && (higherIsBetter ? otherVal > val : otherVal < val && otherVal !== 0);
      });
    };

    if (isTop("msgCount"))
      badges.push({
        id: "volume",
        label: "Heavyweight",
        icon: <Crown size={12} />,
        color: "bg-primary text-primary-content",
      });
    if (isTop("yapIndex"))
      badges.push({
        id: "yap",
        label: "Yap Master",
        icon: <TrendingUp size={12} />,
        color: "bg-secondary text-secondary-content",
      });
    if (isTop("medianReplyTime", false))
      badges.push({
        id: "speed",
        label: "The Flash",
        icon: <FastForward size={12} />,
        color: "bg-success text-success-content",
      });
    if (isTop("initiationRate"))
      badges.push({
        id: "instigator",
        label: "Instigator",
        icon: <UserPlus size={12} />,
        color: "bg-info text-info-content",
      });
    if (isTop("ghostCount"))
      badges.push({ id: "ghost", label: "Ghost", icon: <Ghost size={12} />, color: "bg-slate-600 text-white" });
    if (isTop("doubleTextCount"))
      badges.push({ id: "copy", label: "Double Texter", icon: <Copy size={12} />, color: "bg-orange-500 text-white" });

    return badges;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {participants.map((p, index) => {
        const badges = getBadges(p);

        const handleHide = async () => {
          if (confirm(`Hide ${p.name} from analysis? You can unhide them in settings.`)) {
            await db.participants.update(p.id, { isHidden: true });
          }
        };

        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="bg-base-100 border border-base-200 rounded-[2rem] overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300"
          >
            {/* Header with gradient accent */}
            <div className="relative p-6 pb-4">
              {/* Subtle gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 group">
                  {/* Avatar placeholder with initials */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xl font-black text-white shadow-lg">
                    {(isPrivacyMode ? "?" : p.name.charAt(0)).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black tracking-tight">
                        {isPrivacyMode ? obfuscateName(p.name) : p.name}
                      </h3>
                      <button
                        onClick={handleHide}
                        className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hide participant"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm opacity-50">{p.messageShare.toFixed(0)}% of all messages</p>
                  </div>
                </div>
              </div>

              {/* Badges row */}
              {badges.length > 0 && (
                <div className="relative flex flex-wrap gap-1.5 mt-4">
                  {badges.map((b) => (
                    <span
                      key={b.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${b.color}`}
                    >
                      {b.icon}
                      {b.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Carrying the Chat - Hero Metric */}
              <div className="relative mt-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-4 border border-primary/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase opacity-50">Carrying the Chat</span>
                  <span className="text-lg font-black text-primary">{p.carryScore.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-base-300 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(p.carryScore, 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                </div>
                <p className="text-[10px] opacity-40 mt-1">Based on who starts convos + message volume</p>
              </div>
            </div>

            {/* Stats Grid - Clean Pills */}
            <div className="p-6 pt-2 space-y-3">
              {/* Primary Stats Row */}
              <div className="flex gap-3">
                <div className="flex-1 bg-base-200/50 rounded-2xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-primary mb-1">
                    <MessageSquare size={16} />
                    <span className="text-xs font-bold uppercase opacity-60">Messages</span>
                  </div>
                  <span className="text-2xl font-black tabular-nums">{p.msgCount.toLocaleString()}</span>
                  <p className="text-[10px] opacity-40 mt-1">{p.wordCount.toLocaleString()} words</p>
                </div>
                <div className="flex-1 bg-base-200/50 rounded-2xl p-4 text-center">
                  <Tooltip text="Words per message — higher means longer messages">
                    <div className="flex items-center justify-center gap-2 text-secondary mb-1">
                      <Zap size={16} />
                      <span className="text-xs font-bold uppercase opacity-60">Words/Msg</span>
                      <HelpCircle size={10} className="opacity-40" />
                    </div>
                  </Tooltip>
                  <span className="text-2xl font-black tabular-nums">{p.yapIndex.toFixed(1)}</span>
                  <p className="text-[10px] opacity-40 mt-1">
                    {p.yapIndex > 10 ? "Long-winded" : p.yapIndex > 5 ? "Detailed" : "Brief"}
                  </p>
                </div>
              </div>

              {/* Secondary Stats Row */}
              <div className="flex gap-3">
                <div className="flex-1 bg-info/10 rounded-2xl p-4 text-center">
                  <Tooltip text="How often this person starts new conversations">
                    <span className="text-[10px] font-bold uppercase opacity-50 block mb-1 inline-flex items-center gap-1">
                      Starts Convos <HelpCircle size={8} className="opacity-40" />
                    </span>
                  </Tooltip>
                  <span className="text-xl font-black text-info">{p.initiationRate.toFixed(0)}%</span>
                </div>
                <div className="flex-1 bg-success/10 rounded-2xl p-4 text-center">
                  <Tooltip text="Typical time to respond (median)">
                    <span className="text-[10px] font-bold uppercase opacity-50 block mb-1 inline-flex items-center gap-1">
                      Reply Speed <HelpCircle size={8} className="opacity-40" />
                    </span>
                  </Tooltip>
                  <span className="text-xl font-black text-success">{formatDurationHuman(p.medianReplyTime)}</span>
                  {p.longestReplyTime > 0 && (
                    <p className="text-[10px] opacity-40 mt-1">Longest: {formatDurationHuman(p.longestReplyTime)}</p>
                  )}
                </div>
              </div>

              {/* Drama Stats Row */}
              <div className="flex gap-3">
                {/* Left on Read */}
                <Tooltip text="Times they didn't reply and the conversation died">
                  <div className="flex-1 bg-warning/10 border border-warning/10 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center text-xl">
                      👻
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase opacity-50 block">Left on Read</span>
                      <span className="text-lg font-black text-warning">{p.leftOnReadCount}x</span>
                    </div>
                  </div>
                </Tooltip>

                {/* Ghost Count */}
                <Tooltip text="Replies that took over 12 hours">
                  <div className="flex-1 bg-base-200/50 border border-base-200 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-600/20 flex items-center justify-center">
                      <Ghost size={18} className="text-slate-500" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase opacity-50 block">Ghosted (12h+)</span>
                      <span className="text-lg font-black">{p.ghostCount}x</span>
                    </div>
                  </div>
                </Tooltip>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
