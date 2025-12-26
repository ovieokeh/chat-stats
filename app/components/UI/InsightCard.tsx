import React from "react";
import { clsx } from "clsx";
import { LucideIcon } from "lucide-react";

interface InsightCardProps {
  title: string;
  value: string | number;
  delta?: string;
  explanation?: string;
  icon?: LucideIcon;
  variant?: "default" | "glow" | "danger" | "success";
  className?: string;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  title,
  value,
  delta,
  explanation,
  icon: Icon,
  variant = "default",
  className,
}) => {
  const variantClasses = {
    default: "",
    glow: "ring-1 ring-primary/20 shadow-[0_0_50px_-25px] shadow-primary/50",
    danger: "text-error ring-error/20",
    success: "text-success ring-success/20",
  };

  return (
    <div
      className={clsx(
        "card bg-base-100 border border-base-300/60 rounded-3xl shadow-xl transition-all duration-200 hover:shadow-2xl hover:-translate-y-0.5",
        variantClasses[variant],
        className
      )}
    >
      <div className="card-body p-6 gap-4">
        <div className="flex items-center justify-between">
          <span className="text-base md:text-lg font-semibold flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-base-content/60" />}
            {title}
          </span>
        </div>

        <div className="text-4xl md:text-5xl font-semibold tabular-nums leading-none">{value}</div>

        {(delta || explanation) && (
          <div className="flex flex-col gap-1 mt-auto">
            {delta && <span className="text-sm font-medium">{delta}</span>}
            {explanation && <span className="text-sm text-base-content/70">{explanation}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
