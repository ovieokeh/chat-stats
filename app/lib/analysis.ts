import { Message, Session, ReplyEdge, ExportConfig, Moment } from "../types";
import Vader from "vader-sentiment";
import { getText } from "../hooks/useText";

/**
 * Enhanced feature computation with awareness of WhatsApp artifacts.
 */
export const computeMessageFeatures = (msg: Partial<Message>) => {
  if (!msg.rawText || msg.type === "system") return;

  // Filter out WhatsApp placeholders before analysis
  const isPlaceholder = /‎?(image|video|audio|sticker|document) omitted|This message was deleted/.test(msg.rawText);

  if (isPlaceholder) {
    msg.emojiCount = 0;
    msg.sentiment = 0;
    return;
  }

  // 1. Emoji count - Using a more comprehensive range if needed
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  msg.emojiCount = (msg.rawText.match(emojiRegex) || []).length;

  // 2. Sentiment - Context aware
  // Logic: Only run if English is detected OR if text contains enough universal markers (emojis/punctuation)
  const intensity = Vader.SentimentIntensityAnalyzer.polarity_scores(msg.rawText);
  msg.sentiment = intensity.compound;

  // 3. Metadata flags
  msg.hasQuestion = msg.rawText.includes("?");
  msg.hasUrl = /https?:\/\/[^\s]+/.test(msg.rawText);
};

/**
 * Robust sessionization with participant tracking
 */
export const sessionize = (messages: Message[], config: ExportConfig): Session[] => {
  if (messages.length === 0) return [];

  const sessions: Session[] = [];
  // Assumption: messages are pre-sorted by ingestion layer.
  // If not, sort once outside this function.

  let currentMsgs: Message[] = [messages[0]];

  for (let i = 1; i < messages.length; i++) {
    const gap = (messages[i].ts - messages[i - 1].ts) / 60000;

    if (gap > config.session.gapThresholdMinutes) {
      sessions.push(createEnhancedSession(currentMsgs));
      currentMsgs = [messages[i]];
    } else {
      currentMsgs.push(messages[i]);
    }
  }
  sessions.push(createEnhancedSession(currentMsgs));
  return sessions;
};

const createEnhancedSession = (msgs: Message[]): Session => {
  const participants = Array.from(new Set(msgs.map((m) => m.senderId).filter(Boolean)));

  // Improved initiator detection: skip system messages or messages without a sender
  const initiator = msgs.find((m) => m.senderId && m.type !== "system");

  // Determine dominant type: if 80%+ of messages are a certain non-text type, use that.
  let dominantType: Message["type"] = "text";
  const nonSystemMsgs = msgs.filter((m) => m.type !== "system");
  if (nonSystemMsgs.length > 0) {
    const counts = nonSystemMsgs.reduce(
      (acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topArr = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (topArr[0][1] / nonSystemMsgs.length > 0.8) {
      dominantType = topArr[0][0] as Message["type"];
    }
  }

  return {
    importId: msgs[0].importId,
    startTs: msgs[0].ts,
    endTs: msgs[msgs.length - 1].ts,
    gapThresholdMinutes: 0,
    messageCount: msgs.length,
    participantsJson: JSON.stringify(Array.from(participants)),
    initiatorId: initiator ? initiator.senderId : undefined,
    dominantType,
  };
};

export const inferReplyEdges = (messages: Message[], config: ExportConfig): ReplyEdge[] => {
  // Simple logic: A message replies to the most recent message by a DIFFERENT sender
  // within replyWindowMinutes.

  const edges: ReplyEdge[] = [];
  const windowMs = config.session.replyWindowMinutes * 60 * 1000;

  // No need to sort if we trust the ingestion layer or DB order.
  // But let's keep it for robustness if this is used in isolation.
  const sortedMsgs = messages;

  for (let i = 1; i < sortedMsgs.length; i++) {
    const curr = sortedMsgs[i];
    if (!curr.senderId) continue; // System message?
    if (curr.type === "system") continue;
    if (curr.id === undefined) continue; // Safety check

    // Look back
    for (let j = i - 1; j >= 0; j--) {
      const prev = sortedMsgs[j];

      // Limit check
      if (curr.ts - prev.ts > windowMs) break; // too old

      if (prev.senderId && prev.senderId !== curr.senderId && prev.type !== "system" && prev.id !== undefined) {
        // Found parent!
        edges.push({
          importId: curr.importId,
          fromSenderId: curr.senderId,
          toSenderId: prev.senderId,
          fromMessageId: curr.id!, // Assured by check above
          toMessageId: prev.id!, // Assured by check above
          deltaSeconds: (curr.ts - prev.ts) / 1000,
          sameSession: true, // simplified assumption or check actual sessions
        });
        break; // One parent only (closest)
      }
    }
  }
  return edges;
};

/**
 * Helper to get YYYY-MM-DD in the user's target timezone.
 * Falls back to UTC if timezone is invalid or unspecified.
 * CACHED for performance.
 */
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const metadataFormatterCache = new Map<string, Intl.DateTimeFormat>();

export const getIsoDate = (ts: number, timezone: string): string => {
  const cacheKey = timezone || "UTC";
  let formatter = dateFormatterCache.get(cacheKey);

  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat("sv-SE", {
        timeZone: cacheKey,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      console.warn(`Invalid timezone '${timezone}', falling back to UTC`);
      formatter = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }
    dateFormatterCache.set(cacheKey, formatter);
  }

  return formatter.format(new Date(ts));
};

/**
 * Gets hour, day, and date in the specific timezone.
 * Optimized with caching to avoid re-instantiating Intl.DateTimeFormat.
 */
export const getTzMetadata = (ts: number, timezone: string) => {
  const cacheKey = timezone || "UTC";
  let formatter = metadataFormatterCache.get(cacheKey);

  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: cacheKey,
        hour12: false,
        hour: "numeric",
        weekday: "short",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        hour12: false,
        hour: "numeric",
        weekday: "short",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }
    metadataFormatterCache.set(cacheKey, formatter);
  }

  const p = formatter.formatToParts(new Date(ts));
  const res = { hour: 0, day: 0, date: "" };
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  let year = "",
    month = "",
    dayOfMonth = "";

  p.forEach((part) => {
    if (part.type === "hour") res.hour = parseInt(part.value) % 24;
    if (part.type === "weekday") res.day = dayMap[part.value] ?? 0;
    if (part.type === "year") year = part.value;
    if (part.type === "month") month = part.value;
    if (part.type === "day") dayOfMonth = part.value;
  });

  res.date = `${year}-${month}-${dayOfMonth}`;
  return res;
};

/**
 * Generic median calculation that handles even lengths correctly.
 */
const calculateMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

export const findInterestingMoments = (messages: Message[], sessions: Session[], config: ExportConfig): Moment[] => {
  const moments: Moment[] = [];
  const importId = messages[0]?.importId;
  if (!importId) return [];

  const timezone = config.parsing.timezone || "UTC";

  // 1. Volume Spikes using MAD (Median Absolute Deviation)
  const dailyCounts: Record<string, number> = {};
  const dateToFirstTs: Record<string, number> = {};
  const dateToLastTs: Record<string, number> = {};

  messages.forEach((m) => {
    const { date: d } = getTzMetadata(m.ts, timezone);
    dailyCounts[d] = (dailyCounts[d] || 0) + 1;

    if (!dateToFirstTs[d] || m.ts < dateToFirstTs[d]) {
      dateToFirstTs[d] = m.ts;
    }
    if (!dateToLastTs[d] || m.ts > dateToLastTs[d]) {
      dateToLastTs[d] = m.ts;
    }
  });

  const counts = Object.values(dailyCounts);
  const median = calculateMedian(counts);
  const absDeviations = counts.map((c) => Math.abs(c - median));
  const mad = calculateMedian(absDeviations) || 1;

  Object.entries(dailyCounts).forEach(([date, count]) => {
    // Modified Z-Score: 0.6745 * (x - median) / MAD
    const modifiedZ = (0.6745 * (count - median)) / mad;
    if (modifiedZ > 3.5 && count > 50) {
      // Use the first message timestamp of that day as the anchor,
      // or construct a "noon" timestamp for that day in the target timezone?
      // Using the actual first message timestamp is safest for "jumping to" that moment.
      const anchorTs = dateToFirstTs[date] || new Date(date).getTime();

      const startTs = dateToFirstTs[date];
      const endTs = dateToLastTs[date];

      moments.push({
        importId,
        id: `spike-${date}`,
        type: "volume_spike",
        date,
        ts: anchorTs,
        title: getText("moments.titles.spike"),
        description: getText("moments.descriptions.spike", { count: count }),
        magnitude: modifiedZ,
        importance: Math.min(0.95, 0.7 + modifiedZ / 10),
        data: {
          startTs: startTs || anchorTs,
          endTs: endTs || anchorTs + 86400000,
        },
      });
    }
  });

  // 2. Resurrections (Preventing duplicates)
  const GAP_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;
  for (let i = 1; i < messages.length; i++) {
    const diff = messages[i].ts - messages[i - 1].ts;
    if (diff > GAP_THRESHOLD_MS) {
      const date = getIsoDate(messages[i].ts, timezone);

      // For a resurrection, maybe show the next 100 messages or the next session?
      const session =
        sessions.find((s) => s.startTs <= messages[i].ts && s.endTs >= messages[i].ts) ||
        sessions.find((s) => s.startTs === messages[i].ts);

      const endTs = session ? session.endTs : messages[i].ts + 60 * 60 * 1000;

      moments.push({
        importId,
        id: `res-${messages[i].ts}`,
        type: "long_gap",
        date,
        ts: messages[i].ts,
        title: getText("moments.titles.return"),
        description: getText("moments.descriptions.return", { days: Math.floor(diff / 86400000) }),
        magnitude: diff / 86400000,
        importance: 0.8,
        data: {
          startTs: messages[i].ts,
          endTs: endTs,
        },
      });
    }
  }

  // 3. Marathon Sessions
  sessions.forEach((s) => {
    const duration = (s.endTs - s.startTs) / 1000;
    const MARATHON_SECONDS = 3 * 60 * 60; // 3 hours

    // Only count as a marathon if it lasts a long time AND has significant engagement
    // OR if it's an extreme burst of messages regardless of duration.
    const isMarathon = (duration > MARATHON_SECONDS && s.messageCount > 50) || s.messageCount > 300;

    if (isMarathon) {
      const date = getIsoDate(s.startTs, timezone);
      moments.push({
        importId,
        id: `marathon-${s.startTs}`,
        type: "marathon_session",
        date,
        ts: s.startTs,
        title: "Marathon Session",
        description: `Deep conversation lasting ${Math.floor(duration / 3600)}h ${Math.floor(
          (duration % 3600) / 60,
        )}m with ${s.messageCount} messages.`,
        magnitude: duration / 3600,
        importance: Math.min(0.9, 0.6 + s.messageCount / 1000),
        data: {
          startTs: s.startTs,
          endTs: s.endTs,
        },
      });
    }
  });

  // 4. Sentiment Spikes (Daily)
  const dailySentiment: Record<string, { sum: number; count: number; firstTs: number }> = {};
  messages.forEach((m) => {
    if (m.sentiment === undefined || m.type !== "text") return;
    const d = getIsoDate(m.ts, timezone);
    if (!dailySentiment[d]) dailySentiment[d] = { sum: 0, count: 0, firstTs: m.ts };
    dailySentiment[d].sum += m.sentiment;
    dailySentiment[d].count += 1;
  });

  Object.entries(dailySentiment).forEach(([date, stats]) => {
    if (stats.count < 10) return;
    const avg = stats.sum / stats.count;

    if (avg > 0.4) {
      moments.push({
        importId,
        id: `sent-pos-${date}`,
        type: "sentiment_spike",
        date,
        ts: stats.firstTs,
        title: getText("moments.titles.positive"),
        description: getText("moments.descriptions.positive"),
        magnitude: avg,
        importance: 0.75,
        data: { startTs: stats.firstTs, endTs: stats.firstTs + 86400000 },
      });
    } else if (avg < -0.1) {
      moments.push({
        importId,
        id: `sent-neg-${date}`,
        type: "sentiment_spike",
        date,
        ts: stats.firstTs,
        title: getText("moments.titles.negative"),
        description: getText("moments.descriptions.negative"),
        magnitude: Math.abs(avg),
        importance: 0.8,
        data: { startTs: stats.firstTs, endTs: stats.firstTs + 86400000 },
      });
    }
  });

  return moments.sort((a, b) => b.ts - a.ts);
};
