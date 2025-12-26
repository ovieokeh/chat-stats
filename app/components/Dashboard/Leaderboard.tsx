"use client";

import React from "react";
import {
  MessageSquare,
  Zap,
  FastForward,
  UserPlus,
  Moon,
  Sun,
  Ghost,
  Copy,
  TrendingUp,
  BookOpen,
  Share2,
} from "lucide-react";
import { formatDurationHuman } from "../../lib/format";
import { usePrivacy } from "../../context/PrivacyContext";
import { obfuscateName } from "../../lib/utils";
import { ShareModal } from "./ShareModal";
import { useState } from "react";

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

interface LeaderboardProps {
  participants: Participant[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ participants }) => {
  const { isPrivacyMode } = usePrivacy();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const categories = [
    {
      title: "Total Volume",
      description: "Most messages sent",
      icon: <MessageSquare className="w-5 h-5 text-primary" />,
      getValue: (p: Participant) => p.msgCount,
      format: (val: number) => val.toLocaleString(),
      metric: "msgs",
      sort: (a: Participant, b: Participant) => b.msgCount - a.msgCount,
    },
    {
      title: "Word Smith",
      description: "Highest total word count",
      icon: <BookOpen className="w-5 h-5 text-secondary" />,
      getValue: (p: Participant) => p.wordCount,
      format: (val: number) => val.toLocaleString(),
      metric: "words",
      sort: (a: Participant, b: Participant) => b.wordCount - a.wordCount,
    },
    {
      title: "The Yap King/Queen",
      description: "Words per message",
      icon: <TrendingUp className="w-5 h-5 text-accent" />,
      getValue: (p: Participant) => p.yapIndex,
      format: (val: number) => val.toFixed(1),
      metric: "yap",
      sort: (a: Participant, b: Participant) => b.yapIndex - a.yapIndex,
    },
    {
      title: "The Flash",
      description: "Fastest median reply",
      icon: <FastForward className="w-5 h-5 text-success" />,
      getValue: (p: Participant) => p.medianReplyTime,
      format: (val: number) => formatDurationHuman(val),
      metric: "time",
      sort: (a: Participant, b: Participant) => {
        // Only include those who have replies
        if (a.medianReplyTime === 0) return 1;
        if (b.medianReplyTime === 0) return -1;
        return a.medianReplyTime - b.medianReplyTime;
      },
    },
    {
      title: "The Instigator",
      description: "Highest initiation rate",
      icon: <UserPlus className="w-5 h-5 text-info" />,
      getValue: (p: Participant) => p.initiationRate,
      format: (val: number) => `${val.toFixed(1)}%`,
      metric: "rate",
      sort: (a: Participant, b: Participant) => b.initiationRate - a.initiationRate,
    },
    {
      title: "The Night Owl",
      description: "Most messages (12AM - 5AM)",
      icon: <Moon className="w-5 h-5 text-indigo-400" />,
      getValue: (p: Participant) => p.nightOwlCount,
      format: (val: number) => val.toLocaleString(),
      metric: "msgs",
      sort: (a: Participant, b: Participant) => b.nightOwlCount - a.nightOwlCount,
    },
    {
      title: "The Early Bird",
      description: "Most messages (5AM - 9AM)",
      icon: <Sun className="w-5 h-5 text-yellow-500" />,
      getValue: (p: Participant) => p.earlyBirdCount,
      format: (val: number) => val.toLocaleString(),
      metric: "msgs",
      sort: (a: Participant, b: Participant) => b.earlyBirdCount - a.earlyBirdCount,
    },
    {
      title: "The Ghost",
      description: "Most 12h+ reply gaps",
      icon: <Ghost className="w-5 h-5 text-base-content/40" />,
      getValue: (p: Participant) => p.ghostCount,
      format: (val: number) => val.toLocaleString(),
      metric: "times",
      sort: (a: Participant, b: Participant) => b.ghostCount - a.ghostCount,
    },
    {
      title: "The Double-Texter",
      description: "Most consecutive messages",
      icon: <Copy className="w-5 h-5 text-orange-400" />,
      getValue: (p: Participant) => p.doubleTextCount,
      format: (val: number) => val.toLocaleString(),
      metric: "times",
      sort: (a: Participant, b: Participant) => b.doubleTextCount - a.doubleTextCount,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Leaderboards</h2>
          <p className="text-sm opacity-50">Who's winning the chat?</p>
        </div>
        <button
          className="btn btn-primary btn-sm rounded-xl gap-2"
          onClick={() => setIsShareModalOpen(true)}
          disabled={participants.length === 0}
        >
          <Share2 className="w-4 h-4" />
          Share Stats
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {categories.map((cat, i) => {
          // ... rest of categories mapping ...
          const sorted = [...participants].sort(cat.sort);
          const top3 = sorted.slice(0, 3);

          return (
            <div
              key={i}
              className="card bg-base-100 border border-base-200 shadow-lg p-6 rounded-3xl hover:shadow-xl transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-base-200 rounded-xl">{cat.icon}</div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">{cat.title}</h3>
                  <p className="text-[10px] opacity-50 uppercase font-bold tracking-wider">{cat.description}</p>
                </div>
              </div>

              <div className="space-y-3">
                {top3.map((p, idx) => {
                  const val = cat.getValue(p);
                  const isZero = val === 0;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-2xl ${
                        idx === 0 ? "bg-primary/5 border border-primary/10" : "bg-base-200/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black
                          ${
                            idx === 0
                              ? "bg-yellow-400 text-yellow-900 ring-2 ring-yellow-400/20"
                              : idx === 1
                              ? "bg-slate-300 text-slate-700"
                              : "bg-amber-600/20 text-amber-800"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <span
                          className={`text-xs font-semibold truncate max-w-[100px] ${idx === 0 ? "text-primary" : ""}`}
                        >
                          {isPrivacyMode ? obfuscateName(p.name) : p.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black tabular-nums">{isZero ? "—" : cat.format(val)}</span>
                        <span className="text-[9px] opacity-40 ml-1 font-bold uppercase">{cat.metric}</span>
                      </div>
                    </div>
                  );
                })}

                {participants.length === 0 && (
                  <div className="text-center py-4 opacity-30 text-xs italic">No data available</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        type="leaderboard"
        data={{
          participants: participants.sort((a, b) => b.msgCount - a.msgCount),
          chatName: "Chat Analysis", // Could be passed from parent
        }}
      />
    </div>
  );
};
