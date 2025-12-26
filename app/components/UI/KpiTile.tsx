import React from "react";
import { clsx } from "clsx";

interface KpiTileProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral"; // Simplified trend
  trendLabel?: string;
  className?: string;
}

export const KpiTile: React.FC<KpiTileProps> = ({ label, value, trend, trendLabel, className }) => {
  return (
    <div
      className={clsx(
        "card bg-base-100 border border-base-300/60 rounded-2xl transition-all hover:shadow-md",
        className
      )}
    >
      <div className="card-body p-4 md:p-5 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start">
          <span className="text-xs md:text-sm text-base-content/60">{label}</span>
          {trendLabel && (
            <span
              className={clsx(
                "badge badge-sm badge-outline",
                trend === "up" && "text-success border-success",
                trend === "down" && "text-error border-error"
              )}
            >
              {trendLabel}
            </span>
          )}
        </div>
        <div className="text-2xl md:text-3xl font-semibold tabular-nums mt-1">{value}</div>
      </div>
    </div>
  );
};
