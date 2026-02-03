"use client";

import React from "react";
import { Moon, Zap, MessageSquare, Sparkles, Flame, CalendarDays } from "lucide-react";
import { EnrichedParticipant, Moment } from "../../types";
import { formatNumber, formatDurationHuman, formatDurationSimple, formatDateRange } from "../../lib/format";
import { Heatmap } from "../Dashboard/Heatmap";
import { cn } from "../../lib/utils";
import { format } from "date-fns";

export interface HeatmapBucket {
  count: number;
  replyDeltas: number[];
  medianReplySeconds: number;
}

export interface WrappedYearData {
  year: number;
  chatName: string;
  dateRange: { start: number; end: number };
  stats: {
    totalMessages: number;
    totalWords: number;
    activeDays: number;
    avgDailyMessages: number;
  };
  participants: EnrichedParticipant[];
  heatmap: HeatmapBucket[][];
  moments: Moment[];
}

const slideShell =
  "relative h-full w-full overflow-hidden rounded-[32px] border border-base-200 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.55)]";

const SlideFrame: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div className={cn(slideShell, "bg-base-100 text-base-content", className)}>
      <div className="absolute inset-0">
        <div className="absolute -top-28 -right-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-64 w-64 rounded-full bg-secondary/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.03),_transparent_55%)]" />
      </div>
      <div className={cn("relative z-10 flex h-full flex-col p-6", className)}>{children}</div>
    </div>
  );
};

const StatPill: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl border border-base-200 bg-base-200/60 px-4 py-3">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-full bg-base-100 shadow-sm">{icon}</div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-60">{label}</div>
        <div className="text-xl font-black tracking-tight" data-tabular="true">
          {value}
        </div>
      </div>
    </div>
  </div>
);

const PersonaCard: React.FC<{
  title: string;
  name?: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}> = ({ title, name, value, subtitle, icon }) => (
  <div className="rounded-3xl border border-base-200 bg-base-200/60 p-4">
    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] opacity-50">
      <span className="p-2 rounded-full bg-base-100">{icon}</span>
      {title}
    </div>
    <div className="mt-3 text-xl font-black tracking-tight leading-tight">{name || "No Data"}</div>
    <div className="mt-1.5 text-sm font-semibold opacity-70">{value}</div>
    <div className="mt-3 text-xs uppercase tracking-[0.25em] opacity-50">{subtitle}</div>
  </div>
);

const getTopParticipant = (
  participants: EnrichedParticipant[],
  selector: (p: EnrichedParticipant) => number,
  higherIsBetter = true,
  minValue = 0,
) => {
  if (!participants.length) return null;
  const sorted = [...participants].sort((a, b) => {
    const av = selector(a);
    const bv = selector(b);
    if (!higherIsBetter) return av === 0 ? 1 : bv === 0 ? -1 : av - bv;
    return bv - av;
  });
  const top = sorted[0];
  return selector(top) > minValue ? top : top;
};

const getPeakHour = (heatmap: HeatmapBucket[][]) => {
  let best = { day: 0, hour: 0, count: 0 };
  heatmap.forEach((row, day) => {
    row.forEach((bucket, hour) => {
      if (bucket.count > best.count) best = { day, hour, count: bucket.count };
    });
  });
  return best;
};

const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const buildWrappedSlides = (data: WrappedYearData): React.ReactNode[] => {
  const topSpeaker = getTopParticipant(data.participants, (p) => p.msgCount);
  const topTalker = getTopParticipant(data.participants, (p) => p.yapIndex);
  const topSpeed = getTopParticipant(data.participants, (p) => p.medianReplyTime, false);
  const topCarry = getTopParticipant(data.participants, (p) => p.carryScore);
  const topNight = getTopParticipant(data.participants, (p) => p.nightOwlCount);
  const topEarly = getTopParticipant(data.participants, (p) => p.earlyBirdCount);

  const peak = getPeakHour(data.heatmap);

  const heatmapData = data.heatmap.map((row) =>
    row.map((cell) => ({
      value: cell.count,
      tooltip: `${cell.count} messages`,
    })),
  );

  const getMomentPrimary = (moment: Moment) => {
    const desc = moment.description || "";
    const msgMatch = desc.match(/(\\d+[\\d,]*)\\s+messages?/i);
    if (msgMatch) return `${msgMatch[1]} messages`;
    return null;
  };

  const slides: React.ReactNode[] = [
    <SlideFrame key="cover" className="justify-between">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.4em] opacity-50">ChatWrapped</div>
          <div className="text-4xl font-black tracking-tight mt-2">{data.chatName}</div>
        </div>
        <div className="rounded-full border border-base-200 px-4 py-2 text-xs uppercase tracking-[0.3em] opacity-60">
          {data.year}
        </div>
      </div>
      <div className="mt-8">
        <div className="text-6xl font-black tracking-tight leading-none">The Year in Messages</div>
        <div className="mt-3 text-base opacity-70">{formatDateRange(data.dateRange.start, data.dateRange.end)}</div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-8">
        <StatPill
          label="Messages"
          value={formatNumber(data.stats.totalMessages)}
          icon={<MessageSquare className="w-4 h-4" />}
        />
        <StatPill label="Words" value={formatNumber(data.stats.totalWords)} icon={<Sparkles className="w-4 h-4" />} />
        <StatPill
          label="Active Days"
          value={formatNumber(data.stats.activeDays)}
          icon={<CalendarDays className="w-4 h-4" />}
        />
        <StatPill
          label="Avg / Day"
          value={formatNumber(data.stats.avgDailyMessages)}
          icon={<Flame className="w-4 h-4" />}
        />
      </div>
    </SlideFrame>,
    <SlideFrame key="protagonist" className="justify-between">
      <div>
        <div className="text-xs uppercase tracking-[0.35em] opacity-50">The Protagonist</div>
        <div className="mt-5 text-4xl font-black tracking-tight">{topSpeaker?.name || "No Data"}</div>
        <div className="mt-2 text-xl font-semibold opacity-70">
          {topSpeaker ? `${formatNumber(topSpeaker.msgCount)} messages sent` : ""}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <StatPill
          label="Yap Index"
          value={topSpeaker ? topSpeaker.yapIndex.toFixed(1) : "0"}
          icon={<MessageSquare className="w-4 h-4" />}
        />
        <StatPill
          label="Median Reply"
          value={topSpeaker ? formatDurationHuman(topSpeaker.medianReplyTime) : "0s"}
          icon={<Zap className="w-4 h-4" />}
        />
        <StatPill
          label="Night Owl"
          value={topSpeaker ? formatNumber(topSpeaker.nightOwlCount) : "0"}
          icon={<Moon className="w-4 h-4" />}
        />
        <StatPill
          label="Carry Score"
          value={topSpeaker ? topSpeaker.carryScore.toFixed(0) : "0"}
          icon={<Sparkles className="w-4 h-4" />}
        />
      </div>
    </SlideFrame>,
    <SlideFrame key="rhythm" className="justify-between">
      <div>
        <div className="text-xs uppercase tracking-[0.35em] opacity-50">Conversation Rhythm</div>
      <div className="mt-5 text-3xl font-black tracking-tight">
        {dayLabels[peak.day]} @ {peak.hour}:00
      </div>
      <div className="mt-2 text-base opacity-60">Peak hour with {peak.count} messages</div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <PersonaCard
          title="Night Owl"
          name={topNight?.name}
          value={topNight ? `${formatNumber(topNight.nightOwlCount)} late-night texts` : ""}
          subtitle="After midnight"
          icon={<Moon className="w-4 h-4" />}
        />
        <PersonaCard
          title="Fastest Reply"
          name={topSpeed?.name}
          value={topSpeed ? formatDurationSimple(topSpeed.medianReplyTime) : ""}
          subtitle="Median reply time"
          icon={<Zap className="w-4 h-4" />}
        />
      </div>
      <div className="rounded-3xl border border-base-200 bg-base-200/60 p-5">
        <Heatmap data={heatmapData} metricType="volume" />
      </div>
    </SlideFrame>,
    <SlideFrame key="moments" className="justify-between">
      <div>
        <div className="text-xs uppercase tracking-[0.35em] opacity-50">Moments That Hit</div>
        <div className="mt-5 text-3xl font-black tracking-tight">Top Conversation Peaks</div>
      </div>
      <div className="rounded-3xl border border-base-200 bg-base-200/60 p-4">
        {data.moments.length > 0 ? (
          <div className="space-y-4">
            {data.moments.slice(0, 4).map((moment) => {
              const ts = moment.ts ?? new Date(moment.date).getTime();
              const primary = getMomentPrimary(moment);
              return (
                <div key={moment.id} className="grid grid-cols-[48px_18px_1fr] gap-3 items-start relative">
                  <div className="text-right text-[11px] uppercase tracking-[0.2em] opacity-50 pt-1">
                    {format(new Date(ts), "MMM d")}
                  </div>
                  <div className="relative flex justify-center">
                    <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-base-300" />
                    <div className="relative z-10 h-3 w-3 rounded-full bg-primary shadow-[0_0_14px_rgba(0,0,0,0.15)] mt-1" />
                  </div>
                  <div className="rounded-2xl border border-base-200 bg-base-100/60 p-4">
                    <div className="text-xs uppercase tracking-[0.3em] opacity-50">
                      {moment.type.replace(/_/g, " ")}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] opacity-50">
                      {format(new Date(ts), "MMM d, yyyy")}
                    </div>
                    {primary && <div className="mt-2 text-lg font-bold">{primary}</div>}
                    {!primary && <div className="mt-2 text-sm opacity-70">{moment.description}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-base-200 bg-base-100/60 p-5">
            <div className="text-xs uppercase tracking-[0.3em] opacity-50">No peaks detected</div>
            <div className="mt-2 text-xl font-bold">A steady year</div>
            <div className="mt-1 text-sm opacity-70">No big spikes or gaps stood out this year.</div>
          </div>
        )}
      </div>
    </SlideFrame>,
    <SlideFrame key="finale" className="justify-center">
      <div className="text-center">
        <div className="text-xs uppercase tracking-[0.4em] opacity-50">That’s the wrap</div>
        <div className="mt-5 text-4xl font-black tracking-tight">Thanks for the memories</div>
        <div className="mt-2 text-base opacity-60">Replay or pick another year to keep going.</div>
      </div>
    </SlideFrame>,
  ];

  return slides;
};
