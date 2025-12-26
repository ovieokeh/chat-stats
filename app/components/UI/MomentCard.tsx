"use client";

import React from "react";
import { Moment } from "../../types";
import { format } from "date-fns";
import { Activity, Clock, Zap, Heart } from "lucide-react";
import { cn } from "../../lib/utils";

interface MomentCardProps {
  moment: Moment;
  className?: string;
}

export const MomentCard: React.FC<MomentCardProps> = ({ moment, className }) => {
  const getIcon = () => {
    switch (moment.type) {
      case "volume_spike":
        return <Activity className="w-5 h-5 text-primary" />;
      case "long_gap":
        return <Clock className="w-5 h-5 text-warning" />;
      case "marathon_session":
        return <Zap className="w-5 h-5 text-secondary" />;
      case "sentiment_spike":
        return <Heart className="w-5 h-5 text-error" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getBadges = () => {
    // Future: add badges for high magnitude
    return null;
  };

  return (
    <div
      className={cn(
        "card bg-base-100 border border-base-300/60 rounded-2xl relative overflow-hidden group hover:shadow-lg transition-all",
        className
      )}
    >
      {/* Rail Accent */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          moment.type === "volume_spike"
            ? "bg-primary/60"
            : moment.type === "long_gap"
            ? "bg-warning/60"
            : moment.type === "marathon_session"
            ? "bg-secondary/60"
            : "bg-base-content/20"
        )}
      />

      <div className="card-body p-4 pl-6">
        {" "}
        {/* Reduced padding: p-5 -> p-4 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="mt-0.5 p-1.5 bg-base-200/50 rounded-full shrink-0 h-fit">{getIcon()}</div>
            <div>
              <h4 className="font-semibold text-sm leading-tight">{moment.title}</h4> {/* Base text -> sm */}
              {/* Date is redundant in timeline view, but good for context if wrapping? 
                  Actually timeline handles date. Let's hide date or keep it subtle.
                  Let's show Type instead of Date here.
               */}
              <p className="text-[10px] uppercase tracking-wider text-base-content/50 mb-1">
                {moment.type.replace("_", " ")}
              </p>
              {moment.data?.startTs && moment.data?.endTs && (
                <p className="text-[11px] text-base-content/60 font-mono mb-1">
                  {format(moment.data.startTs, "HH:mm")} - {format(moment.data.endTs, "HH:mm")}
                </p>
              )}
              <p className="text-xs text-base-content/80 leading-snug line-clamp-3">{moment.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
