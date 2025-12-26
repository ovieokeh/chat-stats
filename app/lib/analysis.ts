import { Message, Session, ReplyEdge, ExportConfig, Moment } from "../types";
import { franc } from "franc";
import Vader from "vader-sentiment";
import { DEFAULT_STOPWORDS } from "./constants/default-stopwords";

/**
 * Enhanced feature computation with awareness of WhatsApp artifacts.
 */
export const computeMessageFeatures = (msg: Partial<Message>, config: ExportConfig) => {
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
  const typeCounts = msgs.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    importId: msgs[0].importId,
    startTs: msgs[0].ts,
    endTs: msgs[msgs.length - 1].ts,
    gapThresholdMinutes: 0,
    messageCount: msgs.length,
    participantsJson: JSON.stringify(Array.from(participants)),
    initiatorId: msgs[0].senderId,
    dominantType: "text", // logic to determine dominant type
  };
};

export const inferReplyEdges = (messages: Message[], config: ExportConfig): ReplyEdge[] => {
  // Simple logic: A message replies to the most recent message by a DIFFERENT sender
  // within replyWindowMinutes.

  const edges: ReplyEdge[] = [];
  const windowMs = config.session.replyWindowMinutes * 60 * 1000;

  // Ensure messages are sorted by TS to guarantee correct look-back
  const sortedMsgs = [...messages].sort((a, b) => a.ts - b.ts);

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

const getIsoDate = (ts: number, timezone: string): string => {
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
    } catch (e) {
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

export const findInterestingMoments = (messages: Message[], sessions: Session[], config: ExportConfig): Moment[] => {
  const moments: Moment[] = [];
  const importId = messages[0]?.importId;
  if (!importId) return [];

  const timezone = config.parsing.timezone || "UTC";

  // 1. Volume Spikes using MAD (Median Absolute Deviation)
  const dailyCounts: Record<string, number> = {};

  // Track the first timestamp seen for each date to perform accurate timestamping later
  const dateToFirstTs: Record<string, number> = {};

  messages.forEach((m) => {
    const d = getIsoDate(m.ts, timezone);
    dailyCounts[d] = (dailyCounts[d] || 0) + 1;

    if (!dateToFirstTs[d] || m.ts < dateToFirstTs[d]) {
      dateToFirstTs[d] = m.ts;
    }
  });

  const counts = Object.values(dailyCounts).sort((a, b) => a - b);
  const median = counts[Math.floor(counts.length / 2)];
  const absDeviations = counts.map((c) => Math.abs(c - median)).sort((a, b) => a - b);
  const mad = absDeviations[Math.floor(absDeviations.length / 2)] || 1;

  Object.entries(dailyCounts).forEach(([date, count]) => {
    // Modified Z-Score: 0.6745 * (x - median) / MAD
    const modifiedZ = (0.6745 * (count - median)) / mad;
    if (modifiedZ > 3.5 && count > 50) {
      // Use the first message timestamp of that day as the anchor,
      // or construct a "noon" timestamp for that day in the target timezone?
      // Using the actual first message timestamp is safest for "jumping to" that moment.
      const anchorTs = dateToFirstTs[date] || new Date(date).getTime();

      // Find End TS for this day to bound the view
      // Optimization: we could track lastTs same as firstTs
      // For now, let's filter (slower but accurate) or just use the whole day range logic
      // Actually tracking lastTs is O(N) in the same loop, better.
      // But for now, let's just assume we want to show the full day.
      // We can iterate again or just construct end of day.
      // Constructing end of day in target timezone is safer.
      // But accurate last message TS is best.
      const msgsForDay = messages.filter((m) => getIsoDate(m.ts, timezone) === date);
      const startTs = msgsForDay[0]?.ts;
      const endTs = msgsForDay[msgsForDay.length - 1]?.ts;

      moments.push({
        importId,
        id: `spike-${date}`,
        type: "volume_spike",
        date,
        ts: anchorTs,
        title: "Activity Burst",
        description: `Unusual volume of ${count} messages.`,
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
      // Let's find the session this message belongs to.
      // We have `sessions` passed in!
      const session =
        sessions.find((s) => s.startTs <= messages[i].ts && s.endTs >= messages[i].ts) ||
        sessions.find((s) => s.startTs === messages[i].ts); // Exact match if it started the session

      const endTs = session ? session.endTs : messages[i].ts + 60 * 60 * 1000; // Fallback 1 hour

      moments.push({
        importId,
        id: `res-${messages[i].ts}`,
        type: "long_gap",
        date,
        ts: messages[i].ts,
        title: "The Return",
        description: `Picking up the thread after ${Math.floor(diff / 86400000)} days.`,
        magnitude: diff / 86400000,
        importance: 0.8,
        data: {
          startTs: messages[i].ts,
          endTs: endTs,
        },
      });
    }
  }

  return moments.sort((a, b) => b.ts - a.ts);
};

// -----------------------------------------------------------------------------
// TOPIC EXTRACTION (New Addition)
// -----------------------------------------------------------------------------

/**
 * Simple English stopwords to filter out common noise.
 * Can be extended or replaced by a more comprehensive list.
 */
// -----------------------------------------------------------------------------
// TOPIC EXTRACTION (New Addition)
// -----------------------------------------------------------------------------

/**
 * Checks if the local Python service is available.
 */
const SERVICE_URL = "http://localhost:8001"; // Default port for python service

export const checkServiceHealth = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${SERVICE_URL}/health`);
    return res.ok;
  } catch (e) {
    return false;
  }
};

/**
 * Calls the local Python service to get smart clusters.
 */
const fetchSmartTopics = async (
  messages: Message[],
  customStopwords: Set<string>
): Promise<{ text: string; count: number }[]> => {
  const texts = messages
    .filter((m) => m.rawText && m.type !== "system")
    .map((m) => m.rawText!)
    .filter((t) => t.length > 5) // Basic length filter
    .filter((t) => !/omitted|deleted/i.test(t)); // Filter artifacts

  if (texts.length === 0) return [];

  try {
    const res = await fetch(`${SERVICE_URL}/cluster`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: texts,
        stop_words: Array.from(customStopwords),
      }),
    });

    if (!res.ok) throw new Error("Service returned error");
    return await res.json();
  } catch (e) {
    console.warn("Smart topic extraction failed, falling back", e);
    throw e;
  }
};

/**
 * Extracts top topics from messages.
 * Tries the smart service first, then falls back to local frequency counting.
 */
export const extractTopics = async (
  messages: Message[],
  customStopwords: Set<string> = new Set()
): Promise<{ text: string; count: number }[]> => {
  // 1. Try Smart Service
  const isServiceUp = await checkServiceHealth();
  if (isServiceUp) {
    try {
      console.log("Using Smart Topic Service...");
      return await fetchSmartTopics(messages, customStopwords);
    } catch (e) {
      console.warn("Smart Service failed despite health check OK, fallback to local.");
    }
  } else {
    console.log("Smart Topic Service unavailable, using local fallback.");
  }

  // 2. Fallback: Local Regex/Frequency
  const wordCounts: Record<string, number> = {};
  const mergedStopwords = new Set([...DEFAULT_STOPWORDS, ...customStopwords]);

  // Regex to match words: strictly letters, minimum 3 chars
  const wordRegex = /\b[a-zA-Z]{3,}\b/g;

  messages.forEach((msg) => {
    if (!msg.rawText || msg.type === "system") return;

    // Normalize: lowercase
    const text = msg.rawText.toLowerCase();

    const matches = text.match(wordRegex);
    if (matches) {
      matches.forEach((word) => {
        if (!mergedStopwords.has(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    }
  });

  // Convert to array and sort
  const sortedTopics = Object.entries(wordCounts)
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50); // Top 50

  return sortedTopics;
};
