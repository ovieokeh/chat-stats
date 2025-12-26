"use client";

import React from "react";
import { SlidersHorizontal, ChevronDown, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  multi?: boolean;
}

interface FilterBarProps {
  groups: FilterGroup[];
  selected: Record<string, string[]>;
  onChange: (key: string, values: string[]) => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({ groups, selected, onChange, className }) => {
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto pb-2 min-h-[3rem] scrollbar-hide", className)}>
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-base-200 text-base-content/60 shrink-0">
        <SlidersHorizontal className="w-4 h-4" />
      </div>

      {groups.map((group) => {
        const groupSelected = selected[group.key] || [];
        const isActive = groupSelected.length > 0;

        return (
          <div key={group.key} className="dropdown">
            <div
              tabIndex={0}
              role="button"
              className={cn(
                "btn btn-sm m-1 rounded-full border-base-300 font-normal normal-case",
                isActive ? "btn-neutral text-neutral-content" : "btn-ghost bg-base-100"
              )}
            >
              {group.label}
              {isActive && <span className="badge badge-sm badge-ghost ml-1">{groupSelected.length}</span>}
              <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow-xl bg-base-100 rounded-box w-52 border border-base-200"
            >
              <li className="menu-title px-3 py-2 text-xs uppercase tracking-wider opacity-50">{group.label}</li>
              {group.options.map((opt) => {
                const isSelected = groupSelected.includes(opt.value);
                return (
                  <li key={opt.value}>
                    <a
                      className={cn("flex justify-between", isSelected && "active")}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        const newValues = group.multi
                          ? isSelected
                            ? groupSelected.filter((v) => v !== opt.value)
                            : [...groupSelected, opt.value]
                          : isSelected
                          ? []
                          : [opt.value];
                        onChange(group.key, newValues);
                      }}
                    >
                      {opt.label}
                      {isSelected && <Check className="w-3 h-3" />}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
};
