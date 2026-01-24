"use client";

import React from "react";
import { motion } from "framer-motion";
import { MessageSquare, Zap, TrendingUp } from "lucide-react";
import { formatNumber } from "../../lib/format";

interface OverviewHeroProps {
  stats: {
    totalMessages: number;
    activeDays: number;
    avgDailyMessages: number;
  };
}

export const OverviewHero: React.FC<OverviewHeroProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {/* Hero Card - Total Messages */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/80 to-primary text-primary-content p-8 flex flex-col justify-between h-48 md:h-52 shadow-xl shadow-primary/20"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 opacity-80 mb-2">
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Total Vibe Check</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black tracking-tight">{formatNumber(stats.totalMessages)}</h2>
        </div>

        <div className="relative z-10">
          <p className="opacity-70 font-medium">Messages exchanged in history</p>
        </div>

        {/* Decorative Circles */}
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-black/5 rounded-full blur-2xl" />
      </motion.div>

      {/* Daily Average */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-base-100 rounded-[2.5rem] border border-base-200 p-8 flex flex-col justify-between h-48 md:h-52 shadow-sm relative overflow-hidden group hover:border-secondary/20 transition-colors"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-base-content/50 mb-2">
            <Zap className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Daily Vibe</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black tracking-tight">{Math.round(stats.avgDailyMessages)}</h2>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <p className="opacity-50 font-medium">Average messages per day</p>
          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary group-hover:rotate-12 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
