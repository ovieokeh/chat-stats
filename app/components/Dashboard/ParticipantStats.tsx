"use client";

import React from "react";
import { UserPlus, EyeOff, Ghost } from "lucide-react";
import { formatDurationHuman } from "../../lib/format";
import { Skeleton } from "../UI/Skeleton";
import { usePrivacy } from "../../context/PrivacyContext";
import { obfuscateName } from "../../lib/utils";
import { Crown, FastForward, Copy, TrendingUp } from "lucide-react";
import { db } from "../../lib/db";
import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

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
  description: string;
  icon: React.ReactNode;
  color: string;
}

export const ParticipantStats: React.FC<ParticipantStatsProps> = ({ participants }) => {
  const { isPrivacyMode } = usePrivacy();

  // --- Data Preparation for Radar Chart ---
  const radarData = React.useMemo(() => {
    if (!participants || !participants.length) return [];

    // Find max values for normalization
    const maxMsg = Math.max(...participants.map((p) => p.msgCount)) || 1;
    // For speed, lower is better. We need a "slowest" baseline to invert.
    const maxMedianReply = Math.max(...participants.map((p) => p.medianReplyTime)) || 1;
    const maxYap = Math.max(...participants.map((p) => p.yapIndex)) || 1;
    const maxCarry = Math.max(...participants.map((p) => p.carryScore)) || 1;

    // We'll create a data structure where each "subject" (axis) contains value for each participant
    // However, Recharts Radar usually wants [{ subject: 'Volume', A: 100, B: 50 }, ...]

    // Let's protect against too many participants cluttering the chart.
    // Maybe take top 5 by volume? Or just show all if < 8.
    const activeParticipants = participants.slice(0, 10);

    const axes = [
      {
        key: "Volume",
        label: "Volume",
        description: "Total messages sent",
        formatter: (val: number) => `${val.toLocaleString()} msgs`,
      },
      {
        key: "Speed",
        label: "Speed",
        description: "Median reply time",
        formatter: (val: number) => formatDurationHuman(val),
      },
      {
        key: "Initiative",
        label: "Initiative",
        description: "Conversations started %",
        formatter: (val: number) => `${val.toFixed(0)}%`,
      },
      {
        key: "Verbosity",
        label: "Verbosity",
        description: "Avg words per message",
        formatter: (val: number) => `${val.toFixed(1)} words/msg`,
      },
      {
        key: "Engagement",
        label: "Engagement",
        description: "Impact score (Volume + Intiation)",
        formatter: (val: number) => val.toFixed(0),
      },
    ];

    return axes.map((axis) => {
      const point: Record<string, string | number> = {
        subject: axis.label,
        description: axis.description,
        fullMark: 100,
      };

      activeParticipants.forEach((p) => {
        let val = 0;
        let rawVal = 0;

        switch (axis.key) {
          case "Volume":
            val = (p.msgCount / maxMsg) * 100;
            rawVal = p.msgCount;
            break;
          case "Speed":
            if (p.medianReplyTime === 0 && p.msgCount > 0)
              val = 100; // Instant
            else val = Math.max(0, 100 - (p.medianReplyTime / maxMedianReply) * 100);
            rawVal = p.medianReplyTime;
            break;
          case "Initiative":
            val = p.initiationRate;
            rawVal = p.initiationRate;
            break;
          case "Verbosity":
            val = (p.yapIndex / maxYap) * 100;
            rawVal = p.yapIndex;
            break;
          case "Engagement":
            val = (p.carryScore / maxCarry) * 100;
            rawVal = p.carryScore;
            break;
        }
        point[p.id] = Math.max(10, Math.round(val)); // Normalized score 0-100
        point[`${p.id}_raw`] = axis.formatter(rawVal); // Formatted raw string
        point[`${p.id}_val`] = rawVal; // Numeric raw value for sorting if needed
      });
      return point;
    });
  }, [participants]);

  // Colors for the chart - we need consistent colors for participants
  // We can cycle through some nice tailwind-ish hex codes or CSS variables
  const CHART_COLORS = [
    "#8884d8", // primary-ish
    "#82ca9d", // success-ish
    "#ffc658", // warning-ish
    "#ff7300", // secondary
    "#d88484", // error-ish
    "#84d8ca",
    "#ca84d8",
  ];

  const CustomRadarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // payload[0].payload contains the data object for this axis (subject, description, and participant values)
      const data = payload[0].payload;

      // Sort payload by value (descending) to show top rankers first
      // We need to map the payload items back to participants to get names and raw values
      const sortedItems = [...payload].sort((a, b) => b.value - a.value);

      return (
        <div className="bg-neutral/95 backdrop-blur-md text-neutral-content rounded-xl p-4 shadow-xl border border-white/10 text-xs min-w-[200px]">
          <div className="mb-3 border-b border-white/10 pb-2">
            <p className="font-black text-sm text-white">{data.subject}</p>
            <p className="opacity-60 text-[10px] uppercase font-bold tracking-wider">{data.description}</p>
          </div>
          <div className="space-y-1.5">
            {sortedItems.map((item: any) => {
              // item.dataKey is the participant ID
              const pId = item.dataKey;
              // Find raw value from data object
              const rawValue = data[`${pId}_raw`];

              return (
                <div key={item.name} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-bold text-gray-200">{item.name}</span>
                  </div>
                  <span className="font-mono opacity-80">{rawValue}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // --- End Data Prep ---

  if (!participants || participants.length === 0) {
    return (
      <div className="flex flex-col gap-8 w-full animate-pulse">
        {/* Chart Section Skeleton */}
        <div className="w-full bg-base-100/50 border border-base-200 rounded-[2.5rem] p-6 lg:p-10 h-[450px] relative overflow-hidden flex flex-col items-center">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48 mb-8 opacity-50" />
          <div className="flex-1 w-full flex items-center justify-center">
            <Skeleton variant="circular" className="h-64 w-64 rounded-full opacity-10" />
          </div>
        </div>

        {/* League Table Skeleton */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-4">
            <Skeleton className="h-4 w-32 opacity-50" />
            <Skeleton className="h-3 w-24 opacity-30" />
          </div>

          <div className="bg-base-100/50 border border-base-200 rounded-[2rem] overflow-hidden p-6 space-y-6">
            <div className="flex justify-between border-b border-base-200/50 pb-4">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-6 w-4 opacity-30" />
                <Skeleton variant="circular" className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="w-1/3">
                  <Skeleton className="h-2 w-full rounded-full opacity-30" />
                </div>
                <div className="w-16">
                  <Skeleton className="h-6 w-full rounded-md opacity-50" />
                </div>
              </div>
            ))}
          </div>
        </div>
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
      badges.push({
        id: "volume",
        label: "Heavyweight",
        description: "Most active participant (highest message count)",
        icon: <Crown size={12} />,
        color: "bg-primary text-primary-content",
      });
    if (isTop("yapIndex"))
      badges.push({
        id: "yap",
        label: "Yap Master",
        description: "Highest average words per message",
        icon: <TrendingUp size={12} />,
        color: "bg-secondary text-secondary-content",
      });
    if (isTop("medianReplyTime", false))
      badges.push({
        id: "speed",
        label: "The Flash",
        description: "Fastest median reply time",
        icon: <FastForward size={12} />,
        color: "bg-success text-success-content",
      });
    if (isTop("initiationRate"))
      badges.push({
        id: "instigator",
        label: "Instigator",
        description: "Starts the most conversations (highest initiation rate)",
        icon: <UserPlus size={12} />,
        color: "bg-info text-info-content",
      });
    if (isTop("ghostCount"))
      badges.push({
        id: "ghost",
        label: "Ghost",
        description: "Frequently takes >12 hours to reply",
        icon: <Ghost size={12} />,
        color: "bg-slate-600 text-white",
      });
    if (isTop("doubleTextCount"))
      badges.push({
        id: "copy",
        label: "Double Texter",
        description: "Most likely to send multiple messages in a row",
        icon: <Copy size={12} />,
        color: "bg-orange-500 text-white",
      });

    return badges;
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-full overflow-hidden">
      {/* Chart Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full bg-base-100/50 border border-base-200 rounded-[2.5rem] p-6 lg:p-10 relative overflow-hidden"
      >
        {/* Background Decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {participants.length > 10 ? "Participation Landscape" : "Chat Persona"}
            </h3>
            <p className="text-sm opacity-50">
              {participants.length > 10 ? "Mapping volume vs responsiveness" : "Comparing communication styles"}
            </p>
          </div>

          <div className="w-full h-[350px] md:h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              {participants.length <= 10 ? (
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid strokeOpacity={0.2} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "currentColor", opacity: 0.6, fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />

                  {/* Render Radar for each participant */}
                  {participants.slice(0, 10).map((p, i) => (
                    <Radar
                      key={p.id}
                      name={isPrivacyMode ? obfuscateName(p.name) : p.name}
                      dataKey={p.id}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      fillOpacity={0.2} // Make them transparent so they overlay nicely
                      isAnimationActive={true}
                    />
                  ))}
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <RechartsTooltip content={<CustomRadarTooltip />} />
                </RadarChart>
              ) : (
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Reply Time"
                    tickFormatter={(val) => formatDurationHuman(val)}
                    label={{
                      value: "Avg Reply Time (s)",
                      position: "bottom",
                      offset: 0,
                      opacity: 0.5,
                      fontSize: 10,
                    }}
                    tick={{ fontSize: 10, opacity: 0.5 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Messages"
                    label={{
                      value: "Message Volume",
                      angle: -90,
                      position: "left",
                      offset: 0,
                      opacity: 0.5,
                      fontSize: 10,
                    }}
                    tick={{ fontSize: 10, opacity: 0.5 }}
                  />
                  <RechartsTooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-neutral text-neutral-content rounded-xl p-3 shadow-xl text-xs">
                            <p className="font-bold mb-1">{data.name}</p>
                            <p>Messages: {data.y}</p>
                            <p>Reply Time: {formatDurationHuman(data.x)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter
                    name="Participants"
                    data={participants.map((p, i) => ({
                      x: p.medianReplyTime,
                      y: p.msgCount,
                      z: 1,
                      name: isPrivacyMode ? obfuscateName(p.name) : p.name,
                      initial: (isPrivacyMode ? "?" : p.name.slice(0, 5)).toUpperCase(),
                      color: CHART_COLORS[i % CHART_COLORS.length],
                    }))}
                    shape={(props: {
                      cx: number;
                      cy: number;
                      payload: { color: string; name: string; initial: string };
                    }) => {
                      const { cx, cy, payload } = props;
                      return (
                        <foreignObject x={cx - 15} y={cy - 15} width={30} height={30}>
                          <div
                            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-md ring-2 ring-white dark:ring-base-100 transform hover:scale-125 transition-transform cursor-pointer"
                            style={{ backgroundColor: payload.color }}
                            title={payload.name}
                          >
                            {payload.initial}
                          </div>
                        </foreignObject>
                      );
                    }}
                  />
                </ScatterChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Unified League Table */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-lg font-bold opacity-50 uppercase tracking-wider text-xs">League Table</h3>
          <div className="text-[10px] opacity-40 uppercase font-bold tracking-wider">Ranked by Impact</div>
        </div>

        <div className="bg-base-100/50 border border-base-200 rounded-[2rem] overflow-hidden backdrop-blur-sm">
          {/* Table Header - Hidden on Mobile */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-base-200/50 text-[10px] uppercase font-bold tracking-wider opacity-50">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-4">Participant</div>
            <div className="col-span-3">Volume</div>
            <div className="col-span-2 text-center">Speed</div>
            <div className="col-span-2 text-right">Impact</div>
          </div>

          {/* Table Rows & Mobile Cards */}
          <div className="divide-y divide-base-200/50">
            {participants
              .sort((a, b) => b.carryScore - a.carryScore)
              .map((p, index) => {
                const badges = getBadges(p);
                const handleHide = async () => {
                  if (confirm(`Hide ${p.name} from analysis? You can unhide them in settings.`)) {
                    await db.participants.update(p.id, { isHidden: true });
                  }
                };

                // Max values for bars (re-calculated here or passed down? simple recalc is fine for now)
                const maxMsg = Math.max(...participants.map((px) => px.msgCount)) || 1;

                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="group relative hover:bg-base-100 transition-colors"
                  >
                    {/* --- Mobile View (Card) --- */}
                    <div className="md:hidden flex flex-col gap-3 p-4">
                      {/* Top Row: Rank, Avatar, Name, Impact */}
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div className="font-black text-lg opacity-30 w-6 text-center">{index + 1}</div>

                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-black text-white shadow-sm ring-2 ring-white dark:ring-base-100">
                            {(isPrivacyMode ? "?" : p.name.charAt(0)).toUpperCase()}
                          </div>
                          {p.ghostCount > 5 && (
                            <div
                              className="absolute -bottom-1 -right-1 bg-base-100 rounded-full p-0.5 border border-base-200"
                              title="Frequent Ghost"
                            >
                              <Ghost size={10} className="text-slate-400" />
                            </div>
                          )}
                        </div>

                        {/* Name & Hide */}
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                          <span className="font-bold truncate text-base">
                            {isPrivacyMode ? obfuscateName(p.name) : p.name}
                          </span>
                          <button
                            onClick={handleHide}
                            className="p-1.5 bg-base-200/50 rounded-full opacity-50 hover:opacity-100 transition-opacity"
                          >
                            <EyeOff size={14} />
                          </button>
                        </div>

                        {/* Impact Score */}
                        <div className="text-right shrink-0">
                          <div className="inline-flex flex-col items-end">
                            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary leading-none">
                              {p.carryScore.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Badges Row */}
                      {badges.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {badges.map((b) => {
                            // Soft badge styles for mobile
                            let softClass = "bg-base-200 text-base-content/70";
                            if (b.id === "volume") softClass = "bg-primary/10 text-primary";
                            else if (b.id === "yap") softClass = "bg-secondary/10 text-secondary";
                            else if (b.id === "speed") softClass = "bg-success/10 text-success";
                            else if (b.id === "instigator") softClass = "bg-info/10 text-info";
                            else if (b.id === "ghost") softClass = "bg-slate-500/10 text-slate-500";
                            else if (b.id === "copy") softClass = "bg-orange-500/10 text-orange-500";

                            return (
                              <div
                                key={b.id}
                                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg ${softClass} font-medium`}
                              >
                                {b.icon}
                                <span>{b.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 text-xs pl-2 bg-base-200/30 rounded-xl p-3">
                        {/* Volume */}
                        <div className="flex flex-col gap-1">
                          <span className="opacity-50 text-[10px] uppercase font-bold tracking-wider">Volume</span>
                          <div className="font-semibold">
                            {p.msgCount.toLocaleString()}{" "}
                            <span className="opacity-50 text-[10px]">({p.messageShare.toFixed(1)}%)</span>
                          </div>
                        </div>
                        {/* Speed */}
                        <div className="flex flex-col gap-1 text-center">
                          <span className="opacity-50 text-[10px] uppercase font-bold tracking-wider">Speed</span>
                          <div className="font-semibold">{formatDurationHuman(p.medianReplyTime)}</div>
                        </div>
                        {/* Yap */}
                        <div className="flex flex-col gap-1 text-right">
                          <span className="opacity-50 text-[10px] uppercase font-bold tracking-wider">Yap</span>
                          <div className="font-semibold">{p.yapIndex.toFixed(1)}</div>
                        </div>
                      </div>

                      {/* Visual Volume Bar */}
                      <div className="w-full h-1.5 bg-base-300/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-1000"
                          style={{ width: `${(p.msgCount / maxMsg) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* --- Desktop View (Table Row) --- */}
                    <div className="hidden md:grid grid-cols-12 gap-4 p-4 items-center">
                      {/* Rank */}
                      <div className="col-span-1 text-center font-black text-lg opacity-30 group-hover:opacity-100 transition-opacity">
                        {index + 1}
                      </div>

                      {/* Participant Info */}
                      <div className="col-span-4 flex gap-3 items-center">
                        <div className="relative h-fit shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-black text-white shadow-sm ring-2 ring-white dark:ring-base-100">
                            {(isPrivacyMode ? "?" : p.name.charAt(0)).toUpperCase()}
                          </div>
                          {/* Status Indicator (e.g. Ghost) */}
                          {p.ghostCount > 5 && (
                            <div
                              className="absolute -bottom-1 -right-1 bg-base-100 rounded-full p-0.5"
                              title="Frequent Ghost"
                            >
                              <Ghost size={12} className="text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold truncate text-sm">
                              {isPrivacyMode ? obfuscateName(p.name) : p.name}
                            </span>
                            {/* Primary Badge for quick visual */}
                            {badges.length > 0 && (
                              <span
                                className={`w-2 h-2 rounded-full ${badges[0].color.split(" ")[0]}`}
                                title={badges[0].label}
                              />
                            )}
                            <button
                              onClick={handleHide}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-base-200 rounded-full"
                            >
                              <EyeOff size={12} className="opacity-50" />
                            </button>
                          </div>
                          {/* Inline Badge Descriptions */}
                          {badges.length > 0 && (
                            <div className="flex flex-col gap-0.5 mt-1">
                              {badges.map((b) => (
                                <div key={b.id} className="text-[11px] opacity-70 leading-tight flex items-start gap-1">
                                  {b.icon}
                                  <span>
                                    <span className="font-semibold">{b.label}:</span>{" "}
                                    <span className="opacity-80">{b.description}</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Volume Bar */}
                      <div className="col-span-3">
                        <div className="flex justify-between text-[10px] mb-1 font-bold">
                          <span>{p.msgCount.toLocaleString()}</span>
                          <span className="opacity-40">{p.messageShare.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-base-300/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-1000"
                            style={{ width: `${(p.msgCount / maxMsg) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Speed & Stats */}
                      <div className="col-span-2 flex flex-col items-center text-xs">
                        <div className="font-bold whitespace-nowrap" title="Median Reply Time">
                          {formatDurationHuman(p.medianReplyTime)}
                        </div>
                        <div className="text-[10px] opacity-40">yp: {p.yapIndex.toFixed(1)}</div>
                      </div>

                      {/* Impact Score */}
                      <div className="col-span-2 text-right">
                        <div className="inline-flex flex-col">
                          <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                            {p.carryScore.toFixed(0)}
                          </span>
                          <span className="text-[9px] uppercase font-bold opacity-30">Impact</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
