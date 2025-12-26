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
        <h3 className="text-lg font-semibold">Message History</h3>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map((msg) => {
          const senderName = msg.senderId ? participantMap.get(msg.senderId) : "System";
          const colorClass = senderName && senderName !== "System" ? getAvatarColor(senderName) : "bg-base-300";

          return (
            <div key={msg.id} className={`chat ${msg.senderId ? "chat-start" : "chat-center"}`}>
              {msg.type === "system" ? (
                <div className="text-xs text-base-content/50 bg-base-200 px-3 py-1 rounded-full">{msg.rawText}</div>
              ) : (
                <>
                  <div className="chat-header text-xs opacity-50 mb-1 flex items-center gap-2">
                    <span className="font-semibold">{senderName}</span>
                    <time>{format(msg.ts, "dd/MM/yy HH:mm")}</time>
                  </div>
                  <div
                    className={`chat-bubble text-sm ${msg.senderId ? "chat-bubble-primary" : "chat-bubble-secondary"}`}
                    style={msg.senderId ? { backgroundColor: "oklch(var(--p))", color: "oklch(var(--pc))" } : {}}
                  >
                    {/* We can use colorClass for avatar if we had one, or border? For now using primary bubble but maybe colorizing bubble by user is requested */}
                    {/* User requested "different colors (for names) per message". */}
                    {/* Let's render the name outside with custom color from helper? */}
                    {/* Or just bubble color? chat-bubble component color is restricted to utility classes usually. */}
                    {/* Let's try coloring the name in header. */}
                    {msg.rawText}
                  </div>
                  <div className="chat-footer opacity-50 text-xs flex gap-1 mt-1">{/* Status checks etc */}</div>
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

      <div className="p-3 border-t border-base-300/60 flex items-center justify-between">
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
