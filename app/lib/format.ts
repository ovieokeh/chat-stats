import { format, differenceInSeconds, intervalToDuration, formatDuration } from "date-fns";

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(num);
};

export const formatDurationSimple = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
};

export const formatDurationHuman = (seconds: number): string => {
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  // Simplified format: "3m 12s" or "1h 20m"
  if (duration.hours && duration.hours > 0) {
    return `${duration.hours}h ${duration.minutes}m`;
  }
  if (duration.minutes && duration.minutes > 0) {
    return `${duration.minutes}m ${duration.seconds}s`;
  }
  return `${duration.seconds || 0}s`;
};

export const formatDateRange = (startTs: number, endTs: number): string => {
  return `${format(startTs, "MMM yyyy")} – ${format(endTs, "MMM yyyy")}`;
};
