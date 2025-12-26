"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Download,
  Smartphone,
  Layout,
  Share2,
  Loader2,
  CheckCircle2,
  MessageSquare,
  Clock,
  Ghost,
  Copy,
  Zap,
  Sun,
  Moon,
} from "lucide-react";
import { toPng } from "html-to-image";
import { ExportPoster, ExportPlatform, ExportType } from "./ExportPoster";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ExportType;
  data: any; // Using any for now to simplify, will be same as ExportPoster data
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, type, data }) => {
  const [platform, setPlatform] = useState<ExportPlatform>("stories");
  const [insightId, setInsightId] = useState<string>("volume");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const insights = [
    { id: "volume", label: "Volume", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "yap", label: "Yap", icon: <Share2 className="w-4 h-4" /> },
    { id: "speed", label: "Speed", icon: <Clock className="w-4 h-4" /> },
    { id: "night", label: "Owls", icon: <Moon className="w-4 h-4" /> },
    { id: "early", label: "Birds", icon: <Sun className="w-4 h-4" /> },
    { id: "ghost", label: "Ghosts", icon: <Ghost className="w-4 h-4" /> },
    { id: "double", label: "Double", icon: <Copy className="w-4 h-4" /> },
  ];

  const handleDownload = async () => {
    const node = document.getElementById("export-poster");
    if (!node) return;

    setIsGenerating(true);
    try {
      // Small delay to ensure everything is rendered
      await new Promise((r) => setTimeout(r, 500));

      const dataUrl = await toPng(node, {
        cacheBust: true,
        width: 1080,
        height: platform === "stories" ? 1920 : 1080,
      });

      const link = document.createElement("a");
      link.download = `chat-analyzer-${type}-${insightId}-${platform}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      setIsDone(true);
      setTimeout(() => {
        setIsDone(false);
        setIsGenerating(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to generate image", err);
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-base-300/80 backdrop-blur-xl transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl bg-base-100 border border-base-200 shadow-2xl rounded-[3rem] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
        {/* Left: Preview Area */}
        <div className="md:w-1/2 bg-base-200/50 p-6 flex flex-col items-center justify-center relative min-h-[500px] overflow-hidden">
          <div className="text-xs font-bold opacity-30 uppercase tracking-[0.2em] mb-4">Live Preview</div>

          <div className="relative shadow-2xl scale-[0.3] md:scale-[0.22] lg:scale-[0.26] origin-center">
            {/* The actual poster that will be captured */}
            <div id="export-poster-container" className="rounded-[40px] overflow-hidden">
              <ExportPoster type={type} platform={platform} insightId={insightId} data={data} />
            </div>
          </div>

          <p className="text-[10px] opacity-40 absolute bottom-6 text-center px-12">
            Captured at 1080px resolution for maximum clarity
          </p>
        </div>

        {/* Right: Controls */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <button onClick={onClose} className="absolute top-8 right-8 btn btn-ghost btn-circle btn-sm">
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-black tracking-tight mb-2">Export Insights</h2>
              <p className="opacity-50 text-sm">Fine-tune your stats for the perfect share.</p>
            </div>

            {/* Insight Selector - Only for Leaderboard */}
            {type === "leaderboard" && (
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider opacity-60">Insight Category</label>
                <div className="flex flex-wrap gap-2">
                  {insights.map((ins) => (
                    <button
                      key={ins.id}
                      onClick={() => setInsightId(ins.id)}
                      className={`btn btn-sm rounded-xl gap-2 ${
                        insightId === ins.id ? "btn-primary" : "btn-ghost bg-base-200/50"
                      }`}
                    >
                      {ins.icon}
                      {ins.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider opacity-60">Layout Format</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPlatform("stories")}
                  className={`btn h-auto py-6 flex flex-col gap-3 rounded-3xl border-2 ${
                    platform === "stories" ? "btn-primary border-primary" : "btn-ghost border-base-200"
                  }`}
                >
                  <Smartphone className="w-6 h-6" />
                  <div className="text-center">
                    <div className="font-bold text-sm">9:16 Story</div>
                    <div className="text-[10px] opacity-60">Instagram, TikTok</div>
                  </div>
                </button>
                <button
                  onClick={() => setPlatform("feed")}
                  className={`btn h-auto py-6 flex flex-col gap-3 rounded-3xl border-2 ${
                    platform === "feed" ? "btn-primary border-primary" : "btn-ghost border-base-200"
                  }`}
                >
                  <Layout className="w-6 h-6" />
                  <div className="text-center">
                    <div className="font-bold text-sm">1:1 Square</div>
                    <div className="text-[10px] opacity-60">Feed, X, Threads</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleDownload}
                disabled={isGenerating || isDone}
                className={`btn btn-primary btn-lg w-full rounded-2xl gap-3 shadow-lg shadow-primary/20 transition-all ${
                  isDone ? "btn-success" : ""
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Poster...
                  </>
                ) : isDone ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Downloaded!
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download PNG
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
