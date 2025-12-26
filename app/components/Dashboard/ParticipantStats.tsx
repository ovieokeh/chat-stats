"use client";

import React from "react";
import { MessageSquare, Clock, Zap } from "lucide-react";
import { formatDurationHuman } from "../../lib/format";
import { Skeleton } from "../UI/Skeleton";

interface ParticipantStatsProps {
  participants: {
    id: number;
    name: string;
    msgCount: number;
    wordCount: number;
    yapIndex: number; // words per message
    initiationRate: number; // percentage
    medianReplyTime: number; // seconds
    avgReplyTime: number; // seconds
    secondsKeptWaiting: number; // seconds
  }[];
}

export const ParticipantStats: React.FC<ParticipantStatsProps> = ({ participants }) => {
  if (!participants) {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {participants.map((p) => (
        <div key={p.id} className="card bg-base-100 border border-base-200 shadow-xl rounded-3xl overflow-hidden">
          <div className="card-body p-0">
            <div className="p-6 bg-base-200/30 border-b border-base-200">
              <h3 className="text-2xl font-black tracking-tight">{p.name}</h3>
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
                <div className="bg-base-200/30 p-4 rounded-2xl border border-base-200 flex flex-col items-center justify-center text-center">
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
      ))}
    </div>
  );
};
