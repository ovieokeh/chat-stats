"use client";

import React from "react";

interface HeatmapProps {
  data: { value: number; tooltip: string }[][]; // 7x24 grid
  metricType?: "volume" | "speed"; // volume: high=good/dark, speed: low=good/dark (fast reply)
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const Heatmap: React.FC<HeatmapProps> = ({ data, metricType = "volume" }) => {
  // Find max (and min for speed) for scaling
  let max = 0;
  let min = Infinity;

  data.forEach((row) =>
    row.forEach((cell) => {
      max = Math.max(max, cell.value);
      if (cell.value > 0) min = Math.min(min, cell.value);
    })
  );

  if (min === Infinity) min = 0;

  const getColor = (val: number) => {
    if (val === 0) return "bg-base-200";

    let intensity = 0;

    if (metricType === "volume") {
      intensity = max > 0 ? val / max : 0;
    } else {
      // Speed: Lower is better (more intense color).
      // If val is close to min, intensity should be closer to 1.
      // If val is close to max, intensity should be closer to 0.
      // But we generally want to highlight "Fast" replies.
      // Wait, heatmaps usually show "Heat" = High Value.
      // If we want to show "Best times to reply", maybe we highlight FAST replies?
      // Or do we highlight LOW reply times?
      // Let's stick to standard heatmap logic: High Value = High Intensity.
      // So if we map "Fast" to "High Intensity", we need to invert.

      // Let's try: Intensity = 1 - (val - min) / (max - min)
      // If val = min (fastest), intensity = 1.
      // If val = max (slowest), intensity = 0.
      if (max === min) intensity = 1;
      else intensity = 1 - (val - min) / (max - min);

      // Enhance contrast for speed
      intensity = Math.pow(intensity, 2);
    }

    // Map intensity to classes
    if (intensity < 0.2) return "bg-primary/10";
    if (intensity < 0.4) return "bg-primary/30";
    if (intensity < 0.6) return "bg-primary/50";
    if (intensity < 0.8) return "bg-primary/70";
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
              const cell = data[dIndex][h];
              return (
                <div
                  key={h}
                  className={`flex-1 h-full mx-[1px] rounded-sm transition-all hover:ring-2 hover:ring-base-content/20 relative group ${getColor(
                    cell.value
                  )}`}
                >
                  {/* Tooltip */}
                  {cell.value > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-neutral text-neutral-content text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none shadow-lg">
                      <div className="font-bold mb-0.5">
                        {day} @ {h}:00
                      </div>
                      <div>{cell.tooltip}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <div className="flex justify-end gap-2 items-center text-[10px] opacity-50 mt-2">
          <span>{metricType === "volume" ? "Less" : "Slow"}</span>
          <div className="flex gap-0.5">
            <div className="w-2 h-2 rounded-sm bg-base-200"></div>
            <div className="w-2 h-2 rounded-sm bg-primary/20"></div>
            <div className="w-2 h-2 rounded-sm bg-primary/60"></div>
            <div className="w-2 h-2 rounded-sm bg-primary"></div>
          </div>
          <span>{metricType === "volume" ? "More" : "Fast"}</span>
        </div>
      </div>
    </div>
  );
};
