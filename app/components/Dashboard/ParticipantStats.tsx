"use client";

import React from "react";
import { InsightCard } from "../UI/InsightCard";
import { MessageSquare, Clock, Zap } from "lucide-react";
import { formatDurationHuman } from "../../lib/format";

interface ParticipantStatsProps {
  participants: {
    id: number;
    name: string;
    msgCount: number;
    wordCount: number;
    avgReplyTime: number; // seconds
  }[];
}

export const ParticipantStats: React.FC<ParticipantStatsProps> = ({ participants }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {participants.map((p) => (
        <div key={p.id} className="card bg-base-100 border border-base-300/60 shadow-lg rounded-3xl overflow-hidden">
          <div className="bg-base-200/50 p-6 border-b border-base-300/30">
            <h3 className="text-xl font-bold">{p.name}</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <MessageSquare size={20} />
                </div>
                <span className="text-sm font-medium opacity-70">Messages</span>
              </div>
              <span className="text-2xl font-semibold tabular-nums">{p.msgCount.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                  <Zap size={20} />
                </div>
                <span className="text-sm font-medium opacity-70">Words</span>
              </div>
              <span className="text-2xl font-semibold tabular-nums">{p.wordCount.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg text-accent">
                  <Clock size={20} />
                </div>
                <span className="text-sm font-medium opacity-70">Avg Reply</span>
              </div>
              <span className="text-xl font-semibold tabular-nums">{formatDurationHuman(p.avgReplyTime)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
