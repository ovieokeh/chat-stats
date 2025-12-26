"use client";

import React from "react";

interface HeatmapProps {
  data: number[][]; // 7x24 grid, [Day][Hour]
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const Heatmap: React.FC<HeatmapProps> = ({ data }) => {
  // Find max for scaling
  let max = 1;
  data.forEach((row) => row.forEach((val) => (max = Math.max(max, val))));

  const getColor = (val: number) => {
    if (val === 0) return "bg-base-200";
    const intensity = val / max;
    if (intensity < 0.2) return "bg-primary/20";
    if (intensity < 0.4) return "bg-primary/40";
    if (intensity < 0.6) return "bg-primary/60";
    if (intensity < 0.8) return "bg-primary/80";
    return "bg-primary";
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px] text-xs">
        {/* Header (Hours) */}
        <div className="flex mb-1">
          <div className="w-8 shrink-0"></div>
          {HOURS.map((h) => (
            <div key={h} className="flex-1 text-center opacity-50 text-[10px]">
              {h}
            </div>
          ))}
        </div>

        {/* Rows (Days) */}
        {DAYS.map((day, dIndex) => (
          <div key={day} className="flex items-center mb-1 h-6">
            <div className="w-8 shrink-0 text-[10px] font-bold opacity-60 text-right pr-2">{day}</div>
            {HOURS.map((h) => {
              const count = data[dIndex][h];
              return (
                <div
                  key={h}
                  className={`flex-1 h-full mx-[1px] rounded-sm transition-all hover:ring-2 hover:ring-base-content/20 relative group ${getColor(
                    count
                  )}`}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-neutral text-neutral-content text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                    {day} @ {h}:00 • {count} msgs
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div className="flex justify-end gap-2 items-center text-[10px] opacity-50 mt-2">
          <span>Less</span>
          <div className="flex gap-0.5">
            <div className="w-2 h-2 rounded-sm bg-base-200"></div>
            <div className="w-2 h-2 rounded-sm bg-primary/20"></div>
            <div className="w-2 h-2 rounded-sm bg-primary/60"></div>
            <div className="w-2 h-2 rounded-sm bg-primary"></div>
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
