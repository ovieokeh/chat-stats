"use client";

import React from "react";
import { KpiTile } from "../UI/KpiTile";
import { ChartCard } from "../UI/ChartCard";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid } from "recharts";
import { formatNumber } from "../../lib/format";

import { Heatmap } from "./Heatmap";

// Placeholder types for props - in real app, these would come from the page fetching data
interface OverviewProps {
  stats: {
    totalMessages: number;
    totalWords: number;
    activeDays: number;
    avgDailyMessages: number;
  };
  timelineData: Array<{ date: string; messages: number }>;
  hourlyData: Array<{ hour: number; count: number }>;
  heatmapData: number[][];
}

export const Overview: React.FC<OverviewProps> = ({ stats, timelineData, hourlyData, heatmapData }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KpiTile label="Total Messages" value={formatNumber(stats.totalMessages)} />
        <KpiTile label="Total Words" value={formatNumber(stats.totalWords)} />
        <KpiTile label="Active Days" value={stats.activeDays} />
        <KpiTile label="Msgs / Active Day" value={Math.round(stats.avgDailyMessages)} />
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 gap-4">
        <ChartCard title="Weekly Activity Heatmap" takeaway="Darker squares show your most intense chat times.">
          <Heatmap data={heatmapData} />
        </ChartCard>
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
