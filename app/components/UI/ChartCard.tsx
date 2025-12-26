import React, { ReactNode } from "react";
import { clsx } from "clsx";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  takeaway?: string;
  className?: string;
  action?: ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, children, takeaway, className, action }) => {
  return (
    <div className={clsx("card bg-base-100 border border-base-300/60 rounded-2xl shadow-sm", className)}>
      <div className="card-body p-5 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="card-title text-base md:text-lg">{title}</h3>
          {action}
        </div>
        <div className="h-48 md:h-64 w-full">{children}</div>
        {takeaway && <p className="text-sm text-base-content/70 mt-4 border-t border-base-200 pt-3">💡 {takeaway}</p>}
      </div>
    </div>
  );
};
