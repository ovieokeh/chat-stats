"use client";

import React, { useState, useEffect } from "react";
import { db } from "../../lib/db";
import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { getAvatarColor } from "../../lib/colors";

interface ChatViewerProps {
  importId: number;
  initialScrollToTimestamp?: number;
  timeRange?: {
    startTs: number;
    endTs: number;
  };
}

const PAGE_SIZE = 50;

export const ChatViewer: React.FC<ChatViewerProps> = ({ importId, initialScrollToTimestamp, timeRange }) => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hasJumped, setHasJumped] = useState(false);
  const [primaryViewerId, setPrimaryViewerId] = useState<number | null>(null);

  // Jump to timestamp logic
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

  // Fetch participants for name resolution
  const participants = useLiveQuery(() => db.participants.where("importId").equals(importId).toArray(), [importId]);
  const participantMap = React.useMemo(() => {
    const map = new Map<number, string>();
    participants?.forEach((p) => map.set(p.id!, p.displayName));
    return map;
  }, [participants]);

  // Auto-select primary viewer (simple heuristic: first non-system user or user with most messages if we had that info handy)
  // For now, just pick the first one if not set.
  useEffect(() => {
    if (participants && participants.length > 0 && primaryViewerId === null) {
      const candidate = participants.find((p) => !p.isSystem); // Try to find a real person
      if (candidate) {
        setPrimaryViewerId(candidate.id!);
      } else {
        setPrimaryViewerId(participants[0].id!);
      }
    }
  }, [participants, primaryViewerId]);

  const messages = useLiveQuery(async () => {
    let collection = db.messages.where("importId").equals(importId);

    // Apply Time Range Restriction FIRST if present (optimization)
    // Actually we need to use the compound index [importId+ts] for range efficiently
    let rangeCollection;
    if (timeRange) {
      rangeCollection = db.messages
        .where("[importId+ts]")
        .between([importId, timeRange.startTs], [importId, timeRange.endTs], true, true);
    } else {
      rangeCollection = db.messages.where("[importId+ts]").between([importId, Dexie.minKey], [importId, Dexie.maxKey]);
    }

    if (debouncedSearch) {
      // Filter is applied in memory after range fetch or using filter() on collection
      // Dexie filter() is client side scan if not indexed.
      // We'll perform filter on the range collection.
      rangeCollection = rangeCollection.filter((m) => m.rawText.toLowerCase().includes(debouncedSearch.toLowerCase()));
    }

    const offset = page * PAGE_SIZE;

    // Use rangeCollection to fetch
    return rangeCollection.offset(offset).limit(PAGE_SIZE).toArray();
  }, [importId, page, debouncedSearch, timeRange]);

  // Count for pagination
  // Count for pagination
  const totalCount = useLiveQuery(async () => {
    let rangeCollection;
    if (timeRange) {
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
  }, [importId, debouncedSearch, timeRange]);

  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE);

  return (
    <div className="card bg-base-100 border border-base-300/60 shadow-xl rounded-2xl flex flex-col h-full min-h-[500px]">
      <div className="p-4 border-b border-base-300/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold hidden md:block">Message History</h3>

          {/* Primary Viewer Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-60">View as:</span>
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

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
          <input
            type="text"
            placeholder="Search messages..."
            className="input input-bordered input-sm pl-9 w-full rounded-full"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0); // reset to first page
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-200/30">
        {messages?.map((msg) => {
          const senderName = msg.senderId ? participantMap.get(msg.senderId) : "System";
          const isPrimary = msg.senderId === primaryViewerId;
          const isSystem = msg.type === "system";

          // Color for name (only for others)
          const nameColorClass = senderName && !isSystem ? getAvatarColor(senderName) : "";

          // Chat alignment
          const chatClass = isSystem ? "chat-center" : isPrimary ? "chat-end" : "chat-start";

          // Bubble styling
          // Primary: Greenish (success/primary), Others: White/Base-100
          // System: Gray
          let bubbleClass = "chat-bubble text-sm ";
          let bubbleStyle = {};

          if (isPrimary) {
            bubbleClass += "chat-bubble-success text-success-content"; // WhatsApp green-ish style usually
          } else if (!isSystem) {
            bubbleClass += "bg-base-100 text-base-content shadow-sm"; // White/Light gray for others
          }

          return (
            <div key={msg.id} className={`chat ${chatClass}`}>
              {isSystem ? (
                <div className="text-xs text-base-content/50 bg-base-200 px-3 py-1 rounded-full text-center max-w-lg mx-auto leading-relaxed my-2">
                  {msg.rawText}
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
                    <time className="text-[10px] opacity-70">{format(msg.ts, "HH:mm")}</time>
                  </div>
                  <div className={bubbleClass} style={bubbleStyle}>
                    <div className="whitespace-pre-wrap break-words">{msg.rawText}</div>
                  </div>
                  {/* <div className="chat-footer opacity-50 text-xs flex gap-1 mt-1"></div> */}
                </>
              )}
            </div>
          );
        })}
        {!messages?.length && <div className="text-center text-base-content/50 mt-10">No messages found.</div>}

        {timeRange && messages && messages.length > 0 && page === totalPages - 1 && (
          <div className="flex justify-center py-4">
            <div className="badge badge-ghost gap-2 text-xs opacity-70">End of session view</div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-base-300/60 flex items-center justify-between bg-base-100">
        <button
          className="btn btn-sm btn-ghost"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <span className="text-xs opacity-50">
          Page {page + 1} of {totalPages || 1}
        </span>
        <button
          className="btn btn-sm btn-ghost"
          disabled={page >= totalPages - 1}
          onClick={() => setPage((p) => p + 1)}
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
