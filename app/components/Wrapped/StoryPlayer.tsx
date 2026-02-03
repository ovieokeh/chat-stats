"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

interface StoryPlayerProps {
  slides: React.ReactNode[];
  intervalMs?: number;
  durationsMs?: number[];
  autoplay?: boolean;
  className?: string;
}

export const StoryPlayer: React.FC<StoryPlayerProps> = ({
  slides,
  intervalMs = 6800,
  durationsMs,
  autoplay = true,
  className,
}) => {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(!autoplay);
  const [progressKey, setProgressKey] = useState(0);

  const total = slides.length;
  const currentDuration = durationsMs?.[index] ?? intervalMs;

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setProgressKey((k) => k + 1);
    });
    return () => cancelAnimationFrame(rafId);
  }, [index]);

  useEffect(() => {
    if (isPaused || total <= 1) return;
    const timer = setTimeout(() => {
      setIndex((prev) => (prev + 1 < total ? prev + 1 : 0));
    }, currentDuration);
    return () => clearTimeout(timer);
  }, [currentDuration, index, isPaused, total]);

  const goPrev = () => setIndex((prev) => (prev - 1 + total) % total);
  const goNext = () => setIndex((prev) => (prev + 1) % total);

  const bars = useMemo(() => {
    return Array.from({ length: total }, (_, i) => i);
  }, [total]);

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div className="absolute top-4 left-4 right-4 z-20 flex gap-2">
        {bars.map((i) => {
          const isActive = i === index;
          const isPast = i < index;
          return (
            <div key={i} className="flex-1 h-1 rounded-full bg-base-300/70 overflow-hidden">
              {isPast && <div className="h-full w-full bg-base-content/70" />}
              {isActive && (
                <div
                  key={`${i}-${progressKey}`}
                  className="h-full bg-base-content/90 story-progress"
                  style={{
                    animationDuration: `${currentDuration}ms`,
                    animationPlayState: isPaused ? "paused" : "running",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <button
          className="btn btn-xs btn-ghost bg-base-200/70 backdrop-blur rounded-full"
          onClick={() => setIsPaused((v) => !v)}
          aria-label={isPaused ? "Play" : "Pause"}
        >
          {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
        </button>
      </div>

      <div className="absolute inset-0 z-10">
        <div className="h-full w-full">{slides[index]}</div>
      </div>

      {total > 1 && (
        <div className="absolute inset-0 z-20 flex">
          <button
            className="flex-1 flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition"
            onClick={goPrev}
            aria-label="Previous slide"
          >
            <div className="p-2 rounded-full bg-base-200/70 backdrop-blur">
              <ChevronLeft className="w-4 h-4" />
            </div>
          </button>
          <button
            className="flex-1 flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition"
            onClick={goNext}
            aria-label="Next slide"
          >
            <div className="p-2 rounded-full bg-base-200/70 backdrop-blur">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
