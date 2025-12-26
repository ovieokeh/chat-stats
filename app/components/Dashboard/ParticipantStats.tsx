"use client";

import React from "react";
import { MessageSquare, Clock, Zap } from "lucide-react";
import { formatDurationHuman } from "../../lib/format";
import { Skeleton } from "../UI/Skeleton";
import { usePrivacy } from "../../context/PrivacyContext";
import { obfuscateName } from "../../lib/utils";
import { Crown, Moon, Sun, FastForward, UserPlus, Ghost, Copy, TrendingUp, EyeOff } from "lucide-react";
import { db } from "../../lib/db";

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
          <div
            key={i}
            className="card bg-base-100 border border-base-300/60 shadow-lg rounded-3xl overflow-hidden h-96"
          >
            <div className="bg-base-200/50 p-6 border-b border-base-300/30">
              <Skeleton className="h-8 w-1/3" />
            </div>
            <div className="p-6 space-y-6">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div key={j} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

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
      badges.push({ id: "volume", label: "Heavyweight", icon: <Crown size={12} />, color: "badge-primary" });
    if (isTop("yapIndex"))
      badges.push({ id: "yap", label: "Yap Master", icon: <TrendingUp size={12} />, color: "badge-secondary" });
    if (isTop("medianReplyTime", false))
      badges.push({ id: "speed", label: "The Flash", icon: <FastForward size={12} />, color: "badge-success" });
    if (isTop("initiationRate"))
      badges.push({ id: "instigator", label: "The Instigator", icon: <UserPlus size={12} />, color: "badge-info" });
    if (isTop("nightOwlCount"))
      badges.push({ id: "owl", label: "Night Owl", icon: <Moon size={12} />, color: "badge-accent" });
    if (isTop("earlyBirdCount"))
      badges.push({ id: "bird", label: "Early Bird", icon: <Sun size={12} />, color: "badge-warning" });
    if (isTop("ghostCount"))
      badges.push({
        id: "ghost",
        label: "The Ghost",
        icon: <Ghost size={12} color="white" />,
        color: "bg-slate-500 text-white",
      });
    if (isTop("doubleTextCount"))
      badges.push({
        id: "copy",
        label: "Double Texter",
        icon: <Copy size={12} color="white" />,
        color: "bg-orange-500 text-white",
      });

    return badges;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {participants.map((p) => {
        const badges = getBadges(p);

        const handleHide = async () => {
          if (confirm(`Hide ${p.name} from analysis? you can unhide them in dashboard settings.`)) {
            await db.participants.update(p.id, { isHidden: true });
          }
        };

        return (
          <div
            key={p.id}
            className="card bg-base-100 border border-base-200 shadow-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300"
          >
            <div className="card-body p-0">
              <div className="p-6 bg-base-200/30 border-b border-base-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 group/name">
                  <h3 className="text-2xl font-black tracking-tight">
                    {isPrivacyMode ? obfuscateName(p.name) : p.name}
                  </h3>
                  <button
                    onClick={handleHide}
                    className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover/name:opacity-100 transition-opacity"
                    title="Hide participant"
                  >
                    <EyeOff className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {badges.map((b) => (
                    <div key={b.id} className={`badge badge-sm gap-1 border-none shadow-sm ${b.color} font-bold py-3`}>
                      {b.icon}
                      <span className="text-[9px] uppercase tracking-tighter">{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6">
                <div className="stats stats-vertical sm:stats-horizontal w-full bg-base-200/50 rounded-2xl overflow-hidden border border-base-200 mb-6">
                  <div className="stat">
                    <div className="stat-figure text-primary">
                      <MessageSquare size={24} />
                    </div>
                    <div className="stat-title text-[10px] uppercase font-bold opacity-60">Messages</div>
                    <div className="stat-value text-2xl tabular-nums">{p.msgCount.toLocaleString()}</div>
                  </div>

                  <div className="stat">
                    <div className="stat-figure text-secondary">
                      <Zap size={24} />
                    </div>
                    <div className="stat-title text-[10px] uppercase font-bold opacity-60">Yap Index</div>
                    <div className="stat-value text-2xl tabular-nums">{p.yapIndex.toFixed(1)}</div>
                    <div className="stat-desc opacity-50">Words / msg</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="bg-base-200/30 p-4 rounded-2xl border border-base-200 flex flex-col items-center justify-center text-center tooltip tooltip-bottom"
                    data-tip="Percentage of sessions started by this person (after a 90+ min gap)"
                  >
                    <span className="text-[10px] uppercase font-black opacity-40 mb-1">Initiation Rate</span>
                    <span className="text-xl font-bold text-info">{p.initiationRate.toFixed(1)}%</span>
                  </div>
                  <div className="bg-base-200/30 p-4 rounded-2xl border border-base-200 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-black opacity-40 mb-1">Median Reply</span>
                    <span className="text-xl font-bold text-accent">{formatDurationHuman(p.medianReplyTime)}</span>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-error/5 rounded-2xl border border-error/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-error opacity-60" />
                    <span className="text-xs font-bold opacity-60 uppercase tracking-wider">Total Time Waiting</span>
                  </div>
                  <span className="text-lg font-bold text-error tabular-nums">
                    {formatDurationHuman(p.secondsKeptWaiting)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
