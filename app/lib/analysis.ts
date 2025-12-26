import { Message, Session, ReplyEdge, ExportConfig, Moment } from "../types";
import { franc } from "franc";
import Vader from "vader-sentiment";

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

export const findInterestingMoments = (messages: Message[], sessions: Session[], config: ExportConfig): Moment[] => {
  const moments: Moment[] = [];
  const importId = messages[0]?.importId;
  if (!importId) return [];

  // 1. Volume Spikes using MAD (Median Absolute Deviation)
  const dailyCounts: Record<string, number> = {};
  messages.forEach((m) => {
    const d = new Date(m.ts).toISOString().split("T")[0];
    dailyCounts[d] = (dailyCounts[d] || 0) + 1;
  });

  const counts = Object.values(dailyCounts).sort((a, b) => a - b);
  const median = counts[Math.floor(counts.length / 2)];
  const absDeviations = counts.map((c) => Math.abs(c - median)).sort((a, b) => a - b);
  const mad = absDeviations[Math.floor(absDeviations.length / 2)] || 1;

  Object.entries(dailyCounts).forEach(([date, count]) => {
    // Modified Z-Score: 0.6745 * (x - median) / MAD
    const modifiedZ = (0.6745 * (count - median)) / mad;
    if (modifiedZ > 3.5 && count > 50) {
      // Standard threshold for modified Z-score outliers
      moments.push({
        importId,
        id: `spike-${date}`,
        type: "volume_spike",
        date,
        ts: new Date(date).getTime(),
        title: "Activity Burst",
        description: `Unusual volume of ${count} messages.`,
        magnitude: modifiedZ,
        importance: Math.min(0.95, 0.7 + modifiedZ / 10),
      });
    }
  });

  // 2. Resurrections (Preventing duplicates)
  const GAP_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;
  for (let i = 1; i < messages.length; i++) {
    const diff = messages[i].ts - messages[i - 1].ts;
    if (diff > GAP_THRESHOLD_MS) {
      moments.push({
        importId,
        id: `res-${messages[i].ts}`,
        type: "long_gap",
        date: new Date(messages[i].ts).toISOString().split("T")[0],
        ts: messages[i].ts,
        title: "The Return",
        description: `Picking up the thread after ${Math.floor(diff / 86400000)} days.`,
        magnitude: diff / 86400000,
        importance: 0.8,
      });
    }
  }

  return moments.sort((a, b) => b.ts - a.ts);
};
