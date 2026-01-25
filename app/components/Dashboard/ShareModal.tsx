"use client";

import React, { useState } from "react";
import {
  X,
  Download,
  Smartphone,
  Layout,
  Share2,
  Loader2,
  CheckCircle2,
  MessageSquare,
  Ghost,
  Zap,
  Moon,
  Award,
  Users,
} from "lucide-react";
import { toPng } from "html-to-image";
import { ExportPoster, ExportPlatform, ExportType } from "./ExportPoster";
import { useText } from "../../hooks/useText";
import { EnrichedParticipant } from "../../types";

interface ShareData {
  stats: {
    totalMessages: number;
    totalWords: number;
    activeDays: number;
    avgDailyMessages: number;
  };
  topics: { text: string; count: number }[];
  participants: EnrichedParticipant[];
  chatName: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ExportType; // This might come in as 'overview' initially, but we'll default to 'persona' for the modal
  data: ShareData;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, data }) => {
  const { t } = useText();
  const [platform, setPlatform] = useState<ExportPlatform>("stories");
  const [activeTab, setActiveTab] = useState<"persona" | "summary">("persona");
  const [insightId, setInsightId] = useState<string>("volume");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const personas = [
    {
      id: "volume",
      label: t("dashboard.participantStats.badges.volume.label"),
      icon: <Award className="w-4 h-4" />,
      description: t("dashboard.participantStats.badges.volume.description"),
    },
    {
      id: "yap",
      label: t("dashboard.participantStats.badges.yap.label"),
      icon: <Share2 className="w-4 h-4" />,
      description: t("dashboard.participantStats.badges.yap.description"),
    },
    {
      id: "speed",
      label: t("dashboard.participantStats.badges.speed.label"),
      icon: <Zap className="w-4 h-4" />,
      description: t("dashboard.participantStats.badges.speed.description"),
    },
    {
      id: "night",
      label: t("dashboard.participantStats.badges.nightOwl.label"),
      icon: <Moon className="w-4 h-4" />,
      description: t("dashboard.participantStats.badges.nightOwl.description"),
    },
    {
      id: "ghost",
      label: t("dashboard.participantStats.badges.ghost.label"),
      icon: <Ghost className="w-4 h-4" />,
      description: t("dashboard.participantStats.badges.ghost.description"),
    },
    {
      id: "double",
      label: t("dashboard.participantStats.badges.doubleText.label"),
      icon: <MessageSquare className="w-4 h-4" />,
      description: t("dashboard.participantStats.badges.doubleText.description"),
    },
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
        pixelRatio: 2, // Better quality
      });

      const link = document.createElement("a");
      link.download = `chat-card-${insightId}-${platform}-${Date.now()}.png`;
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
    <dialog id="share_modal" className="modal modal-bottom sm:modal-middle" open={isOpen}>
      <div className="modal-box p-0 max-w-6xl bg-base-100 flex flex-col md:flex-row h-[100dvh] sm:h-[85vh] max-h-none sm:max-h-[90vh] overflow-hidden border-none sm:border sm:border-base-200/50 rounded-none sm:rounded-[3rem]">
        {/* Close Button - Universal */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-8 sm:right-8 btn btn-ghost btn-circle btn-sm z-30 bg-base-100/50 backdrop-blur-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Preview Area */}
        <div className="h-[40vh] md:h-full md:w-7/12 bg-base-200/50 flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0">
          <div className="text-[10px] sm:text-xs font-black opacity-30 uppercase tracking-[0.2em] mb-4 absolute top-6">
            {t("dashboard.shareModal.preview.label")}
          </div>

          <div
            className="transition-all duration-500 origin-center scale-[0.18] sm:scale-[0.25] lg:scale-[0.35] hover:scale-[0.2] sm:hover:scale-[0.28] lg:hover:scale-[0.38] cursor-zoom-in"
            style={{ filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.15))" }}
          >
            {/* The actual poster that will be captured */}
            <div id="export-poster-container" className="rounded-[60px] overflow-hidden">
              <ExportPoster
                type={activeTab === "summary" ? "leaderboard" : "persona"}
                platform={platform}
                insightId={insightId}
                data={data}
              />
            </div>
          </div>

          <p className="text-[10px] opacity-40 absolute bottom-4 sm:bottom-6 text-center px-8 w-full">
            {t("dashboard.shareModal.preview.disclaimer", {
              resolution: platform === "stories" ? "1080x1920" : "1080x1080",
            })}
          </p>
        </div>

        {/* Right: Controls */}
        <div className="flex-1 p-6 sm:p-10 flex flex-col relative bg-base-100 overflow-hidden">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tighter mb-1">{t("dashboard.shareModal.title")}</h2>
            <p className="opacity-50 text-xs sm:text-sm font-medium">{t("dashboard.shareModal.subtitle")}</p>
          </div>

          {/* Type Toggle */}
          <div className="flex p-1 bg-base-200/50 rounded-2xl mb-6 border border-base-200/50">
            <button
              className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm font-black rounded-xl transition-all ${
                activeTab === "persona"
                  ? "bg-base-100 shadow-sm text-base-content border border-base-200/50"
                  : "text-base-content/40 hover:text-base-content hover:bg-base-200/50"
              }`}
              onClick={() => setActiveTab("persona")}
            >
              {t("dashboard.shareModal.tabs.personas")}
            </button>
            <button
              className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm font-black rounded-xl transition-all ${
                activeTab === "summary"
                  ? "bg-base-100 shadow-sm text-base-content border border-base-200/50"
                  : "text-base-content/40 hover:text-base-content hover:bg-base-200/50"
              }`}
              onClick={() => setActiveTab("summary")}
            >
              {t("dashboard.shareModal.tabs.summary")}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-8 custom-scrollbar">
            {activeTab === "persona" && (
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  {t("dashboard.shareModal.selection")}
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {personas.map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => setInsightId(persona.id)}
                      className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-300 ${
                        insightId === persona.id
                          ? "border-primary bg-primary/5 shadow-[0_0_20px_-5px_rgba(var(--color-primary),0.2)]"
                          : "border-base-200 hover:border-base-300 bg-base-50/50"
                      }`}
                    >
                      <div
                        className={`p-3 rounded-xl transition-all duration-300 ${insightId === persona.id ? "bg-primary text-primary-content shadow-lg scale-110" : "bg-base-200 group-hover:bg-base-300"}`}
                      >
                        {persona.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm tracking-tight">{persona.label}</div>
                        <div className="text-[11px] opacity-50 leading-tight mt-0.5">{persona.description}</div>
                      </div>
                      {insightId === persona.id && (
                        <div className="text-primary animate-in zoom-in-50 duration-300">
                          <CheckCircle2 className="w-5 h-5 fill-current" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "summary" && (
              <div className="text-center py-12 px-6 opacity-60 bg-base-200/30 rounded-[2rem] border-2 border-dashed border-base-300/50">
                <div className="w-12 h-12 mx-auto mb-4 opacity-20 flex items-center justify-center">
                  <Users className="w-full h-full" />
                </div>
                <p className="font-black tracking-tight mb-1">{t("dashboard.shareModal.summaryView.title")}</p>
                <p className="text-xs max-w-[200px] mx-auto leading-relaxed">
                  {t("dashboard.shareModal.summaryView.description")}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                {t("dashboard.shareModal.format.label")}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPlatform("stories")}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 group ${
                    platform === "stories"
                      ? "border-primary bg-primary/5 shadow-inner"
                      : "border-base-200 hover:border-base-300 bg-base-50/50"
                  }`}
                >
                  <Smartphone
                    className={`w-5 h-5 transition-transform group-active:scale-90 ${platform === "stories" ? "text-primary scale-110" : "opacity-40"}`}
                  />
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider ${platform === "stories" ? "text-primary" : "opacity-40"}`}
                  >
                    {t("dashboard.shareModal.format.story")}
                  </span>
                </button>
                <button
                  onClick={() => setPlatform("feed")}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 group ${
                    platform === "feed"
                      ? "border-primary bg-primary/5 shadow-inner"
                      : "border-base-200 hover:border-base-300 bg-base-50/50"
                  }`}
                >
                  <Layout
                    className={`w-5 h-5 transition-transform group-active:scale-90 ${platform === "feed" ? "text-primary scale-110" : "opacity-40"}`}
                  />
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider ${platform === "feed" ? "text-primary" : "opacity-40"}`}
                  >
                    {t("dashboard.shareModal.format.square")}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 pb-8 sm:pb-0 mt-auto border-t border-base-200/50 bg-base-100 px-6 -mx-6 sticky bottom-0 z-20">
            <button
              onClick={handleDownload}
              disabled={isGenerating || isDone}
              className={`btn btn-primary btn-lg w-full rounded-[1.25rem] gap-3 shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 h-16 ${
                isDone ? "btn-success" : ""
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-bold">{t("dashboard.shareModal.actions.generating")}</span>
                </>
              ) : isDone ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold">{t("dashboard.shareModal.actions.saved")}</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span className="font-bold text-lg">{t("dashboard.shareModal.actions.download")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop bg-base-300/60 backdrop-blur-sm" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
};
