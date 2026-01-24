"use client";

import React, { useState, useEffect } from "react";
import { db } from "../../lib/db";
import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { getAvatarColor } from "../../lib/colors";
import { Skeleton } from "../UI/Skeleton";
import { usePrivacy } from "../../context/PrivacyContext";
import { obfuscateName, obfuscateText } from "../../lib/utils";
import { useText } from "../../hooks/useText";

interface ChatViewerProps {
  importId: number;
  initialScrollToTimestamp?: number;
  timeRange?: {
    startTs: number;
    endTs: number;
  };
  initialSearchTerm?: string;
}

const PAGE_SIZE = 50;

const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) return <>{text}</>;

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-warning/40 text-base-content px-0 rounded-sm">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
};

export const ChatViewer: React.FC<ChatViewerProps> = ({
  importId,
  initialScrollToTimestamp,
  timeRange,
  initialSearchTerm,
}) => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState(initialSearchTerm || "");
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearchTerm || "");
  const [hasJumped, setHasJumped] = useState(false);
  const [primaryViewerId, setPrimaryViewerId] = useState<number | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { isPrivacyMode } = usePrivacy();
  const { t } = useText();

  // Scroll to top on page change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [page]);
  useEffect(() => {
    if (initialScrollToTimestamp && !hasJumped) {
      // Find which page this timestamp belongs to.
      // This requires a count of messages BEFORE this timestamp.
      let query = db.messages.where("[importId+ts]");

      // Adjust efficient bounds if timeRange is set
      const minKey = timeRange ? timeRange.startTs : Dexie.minKey;
      const targetTs = initialScrollToTimestamp;

      // Note: If restricted by timeRange, we calculate page relative to that range start
      query
        .between([importId, minKey], [importId, targetTs], true, true)
        .count()
        .then((count) => {
          const targetPage = Math.max(0, Math.floor((count - 1) / PAGE_SIZE));
          setPage(targetPage);
          setHasJumped(true);
        });
    }
  }, [initialScrollToTimestamp, importId, hasJumped, timeRange]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch participants and config
  const importData = useLiveQuery(async () => {
    const [participants, importRecord] = await Promise.all([
      db.participants.where("importId").equals(importId).toArray(),
      db.imports.get(importId),
    ]);
    return { participants, importRecord };
  }, [importId]);

  const participants = importData?.participants;
  const importRecord = importData?.importRecord;

  const timezone = importRecord?.configJson
    ? (JSON.parse(importRecord.configJson) as any).parsing?.timezone || "UTC"
    : "UTC";

  const participantMap = React.useMemo(() => {
    const map = new Map<number, string>();
    participants?.forEach((p) => {
      const name = isPrivacyMode ? obfuscateName(p.displayName) : p.displayName;
      map.set(p.id!, name);
    });
    return map;
  }, [participants, isPrivacyMode]);

  // auto select primary viewer
  useEffect(() => {
    if (participants?.length) {
      setPrimaryViewerId(participants[0].id!);
    }
  }, [participants]);

  // DateTime formatters
  // DateTime formatters - Memoized for performance
  const timeFormatter = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: timezone,
      });
    } catch (e) {
      return null;
    }
  }, [timezone]);

  const dateFormatter = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: timezone,
      });
    } catch (e) {
      return null;
    }
  }, [timezone]);

  const formatTime = React.useCallback(
    (ts: number) => {
      if (timeFormatter) {
        return timeFormatter.format(new Date(ts));
      }
      return format(ts, "HH:mm");
    },
    [timeFormatter],
  );

  const formatDateHeader = React.useCallback(
    (ts: number) => {
      if (dateFormatter) {
        return dateFormatter.format(new Date(ts));
      }
      return format(ts, "EEE, MMM d, yyyy");
    },
    [dateFormatter],
  );

  // ... (primary viewer logic) ...
  const messages = useLiveQuery(async () => {
    let collection = db.messages.where("[importId+ts]");

    let rangeCollection;
    if (timeRange && !showFullHistory) {
      rangeCollection = collection.between([importId, timeRange.startTs], [importId, timeRange.endTs], true, true);
    } else {
      rangeCollection = collection.between([importId, Dexie.minKey], [importId, Dexie.maxKey]);
    }

    if (debouncedSearch) {
      rangeCollection = rangeCollection.filter((m) => m.rawText.toLowerCase().includes(debouncedSearch.toLowerCase()));
    }

    const offset = page * PAGE_SIZE;
    return rangeCollection.offset(offset).limit(PAGE_SIZE).toArray();
  }, [importId, page, debouncedSearch, timeRange, showFullHistory]);

  // Count for pagination
  const totalCount = useLiveQuery(async () => {
    let rangeCollection;
    if (timeRange && !showFullHistory) {
      rangeCollection = db.messages
        .where("[importId+ts]")
        .between([importId, timeRange.startTs], [importId, timeRange.endTs], true, true);
    } else {
      rangeCollection = db.messages.where("[importId+ts]").between([importId, Dexie.minKey], [importId, Dexie.maxKey]);
    }

    if (!debouncedSearch) {
      return rangeCollection.count();
    }

    return rangeCollection.filter((m) => m.rawText.toLowerCase().includes(debouncedSearch.toLowerCase())).count();
  }, [importId, debouncedSearch, timeRange, showFullHistory]);

  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE);

  // Group messages for headers
  let lastDateHeader = "";

  return (
    <div className="card bg-base-100 border border-base-300/60 shadow-xl rounded-2xl flex flex-col h-full min-h-[500px]">
      {/* ... (Header) ... */}
      <div className="p-4 border-b border-base-300/60 flex flex-col w-full justify-between gap-4">
        <div className="flex items-center justify-between gap-4 w-full">
          <h3 className="text-lg font-semibold hidden md:block">{t("dashboard.chatViewer.title")}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-60">{t("dashboard.chatViewer.viewAs")}</span>
            <select
              className="select select-sm select-bordered w-32 max-w-xs text-xs"
              value={primaryViewerId || ""}
              onChange={(e) => setPrimaryViewerId(Number(e.target.value))}
            >
              {participants?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap w-full justify-between">
          <div className="relative grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
            <input
              type="text"
              placeholder={t("dashboard.chatViewer.searchPlaceholder")}
              className="input input-bordered input-sm pl-9 w-full rounded-full"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              aria-label={t("dashboard.chatViewer.searchAriaLabel")}
            />
          </div>

          {timeRange && (
            <div className="flex items-center gap-2 bg-base-200/50 p-1 rounded-lg border border-base-300">
              <button
                className={`btn btn-xs rounded-md ${
                  !showFullHistory ? "btn-primary shadow-sm" : "btn-ghost opacity-60"
                }`}
                onClick={() => {
                  setShowFullHistory(false);
                  setPage(0);
                  setHasJumped(false); // Reset jump trigger if needed, or maybe not.
                }}
              >
                {t("dashboard.chatViewer.timeRange.thisMoment")}
              </button>
              <button
                className={`btn btn-xs rounded-md ${
                  showFullHistory ? "btn-primary shadow-sm" : "btn-ghost opacity-60"
                }`}
                onClick={() => {
                  setShowFullHistory(true);
                  // We should probably jump to the start of the moment in full history
                  setHasJumped(false);
                }}
              >
                {t("dashboard.chatViewer.timeRange.fullHistory")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-base-200/30">
        {!messages && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`chat ${i % 2 === 0 ? "chat-start" : "chat-end"}`}>
                <div className="chat-header mb-1">
                  <Skeleton className="h-3 w-24 rounded-full" />
                </div>
                <div className="chat-bubble bg-transparent shadow-none p-0">
                  <Skeleton className="h-10 w-48 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {timeRange && messages && messages.length > 0 && page === 0 && (
          <div className="flex justify-center py-4">
            <div className="badge badge-soft badge-info gap-2 text-xs font-medium">
              {t("dashboard.chatViewer.momentStart")}
            </div>
          </div>
        )}

        {messages?.map((msg) => {
          const senderName = msg.senderId ? participantMap.get(msg.senderId) : t("common.system");
          const isPrimary = msg.senderId === primaryViewerId;
          const isSystem = msg.type === "system";

          const nameColorClass = senderName && !isSystem ? getAvatarColor(senderName) : "";
          const chatClass = isSystem ? "chat-center" : isPrimary ? "chat-end" : "chat-start";

          let bubbleClass = "chat-bubble text-sm ";
          if (isPrimary) {
            bubbleClass += "chat-bubble-success text-success-content";
          } else if (!isSystem) {
            bubbleClass += "bg-base-100 text-base-content shadow-sm";
          }

          // Date Header Logic
          const currentDateHeader = formatDateHeader(msg.ts);
          const showHeader = currentDateHeader !== lastDateHeader;
          lastDateHeader = currentDateHeader;

          return (
            <React.Fragment key={msg.id}>
              {showHeader && <div className="divider text-xs opacity-50 my-4">{currentDateHeader}</div>}

              <div className={`chat ${chatClass}`}>
                {isSystem ? (
                  <div className="text-xs text-base-content/50 bg-base-200 px-3 py-1 rounded-full text-center max-w-lg mx-auto leading-relaxed my-2">
                    <HighlightedText
                      text={isPrivacyMode ? obfuscateText(msg.rawText || "") : msg.rawText || ""}
                      highlight={debouncedSearch}
                    />
                  </div>
                ) : (
                  <>
                    <div className="chat-header text-xs opacity-50 mb-1 flex items-center gap-2">
                      {!isPrimary && (
                        <span
                          className={`font-bold ${nameColorClass.replace("bg-", "text-").replace("text-white", "")}`}
                          style={{ filter: "brightness(0.9) saturate(1.5)" }}
                        >
                          {senderName}
                        </span>
                      )}
                      <time className="text-[10px] opacity-70">{formatTime(msg.ts)}</time>
                    </div>
                    <div className={bubbleClass}>
                      <div className="whitespace-pre-wrap break-words">
                        <HighlightedText
                          text={isPrivacyMode ? obfuscateText(msg.rawText || "") : msg.rawText || ""}
                          highlight={debouncedSearch}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </React.Fragment>
          );
        })}
        {messages && messages.length === 0 && (
          <div className="text-center text-base-content/50 mt-10">{t("dashboard.chatViewer.noMessages")}</div>
        )}

        {timeRange && messages && messages.length > 0 && page === totalPages - 1 && (
          <div className="flex justify-center py-4">
            <div className="badge badge-soft badge-error gap-2 text-xs opacity-70">
              {t("dashboard.chatViewer.momentEnd")}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-base-300/60 flex items-center justify-between bg-base-100">
        <button
          className="btn btn-sm btn-ghost"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          <ChevronLeft className="w-4 h-4" /> {t("common.pagination.prev")}
        </button>
        <span className="text-xs opacity-50">
          {t("common.pagination.status", { page: page + 1, total: totalPages || 1 })}
        </span>
        <button
          className="btn btn-sm btn-ghost"
          disabled={page >= totalPages - 1}
          onClick={() => setPage((p) => p + 1)}
        >
          {t("common.pagination.next")} <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
