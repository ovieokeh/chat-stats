import { Message, Session, ReplyEdge, ExportConfig, Moment } from "../types";
import { franc } from "franc";
import Vader from "vader-sentiment";

export const computeMessageFeatures = (msg: Partial<Message>, config: ExportConfig) => {
  // 1. Emoji count
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  const emojis = msg.rawText?.match(emojiRegex) || [];
  msg.emojiCount = emojis.length;

  // 2. Language Detection (if text is long enough)
  if (msg.wordCount && msg.wordCount > 5) {
    const code = franc(msg.rawText || "");
    if (code !== "und") {
      msg.language = code;
    }
  }

  // 3. Sentiment (if enabled? - just do it, lightweight enough)
  if (msg.rawText) {
    const intensity = Vader.SentimentIntensityAnalyzer.polarity_scores(msg.rawText);
    msg.sentiment = intensity.compound; // -1.0 to 1.0
  }

  // 4. Questions / URLs
  msg.hasQuestion = msg.rawText?.includes("?") ?? false;
  msg.hasUrl = (msg.rawText?.includes("http://") || msg.rawText?.includes("https://")) ?? false;
};

export const sessionize = (messages: Message[], config: ExportConfig): Session[] => {
  const sessions: Session[] = [];
  if (messages.length === 0) return sessions;

  const sorted = [...messages].sort((a, b) => a.ts - b.ts);

  let currentSessionMsgs: Message[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const diffMin = (curr.ts - prev.ts) / 1000 / 60;

    if (diffMin > config.session.gapThresholdMinutes) {
      // Close session
      sessions.push(createSessionObj(currentSessionMsgs));
      currentSessionMsgs = [curr];
    } else {
      currentSessionMsgs.push(curr);
    }
  }

  // Push last
  if (currentSessionMsgs.length > 0) {
    sessions.push(createSessionObj(currentSessionMsgs));
  }

  return sessions;
};

const createSessionObj = (msgs: Message[]): Session => {
  const start = msgs[0].ts;
  const end = msgs[msgs.length - 1].ts;
  const participants = new Set(msgs.map((m) => m.senderId).filter(Boolean));

  return {
    importId: msgs[0].importId,
    startTs: start,
    endTs: end,
    gapThresholdMinutes: 0, // to be filled from config context if needed, or ignored
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
  if (messages.length === 0) return moments;

  // Helper: Sort messages
  const sortedMsgs = [...messages].sort((a, b) => a.ts - b.ts);
  const importId = messages[0].importId;

  // 1. Volume Spikes (Daily)
  const msgsByDay = new Map<string, number>();
  sortedMsgs.forEach((m) => {
    // defined in local timezone usually, but here using simplified date string for grouping
    // Use configured locale or fallback to 'en-CA' (YYYY-MM-DD)
    const locale = config.parsing.locale || "en-CA";
    const dateStr = new Date(m.ts).toLocaleDateString(locale);
    msgsByDay.set(dateStr, (msgsByDay.get(dateStr) || 0) + 1);
  });

  const counts = Array.from(msgsByDay.values());
  if (counts.length > 5) {
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);

    msgsByDay.forEach((count, date) => {
      const zScore = stdDev > 0 ? (count - mean) / stdDev : 0;
      if (zScore > 2.0 && count > 20) {
        // Threshold: >2 sigma AND meaningful absolute volume
        moments.push({
          importId,
          type: "volume_spike",
          date,
          ts: new Date(date).getTime(),
          title: "High Activity",
          description: `${count} messages sent on this day (${zScore.toFixed(1)}x normal volume).`,
          magnitude: zScore,
          importance: 0.8 + zScore * 0.05, // higher z-score = higher importance
        });
      }
    });
  }

  // 2. Marathon Sessions
  sessions.forEach((s) => {
    const durationMin = (s.endTs - s.startTs) / 1000 / 60;
    // Threshold: e.g., > 4 hours (240 mins)
    if (durationMin > 240) {
      moments.push({
        importId,
        type: "marathon_session",
        date: new Date(s.startTs).toISOString().split("T")[0],
        ts: s.startTs,
        title: "Marathon Session",
        description: `Conversation lasted for ${Math.round(durationMin / 60)} hours with ${s.messageCount} messages.`,
        magnitude: durationMin,
        importance: 0.9,
        data: {
          startTs: s.startTs,
          endTs: s.endTs,
          messageCount: s.messageCount,
        },
      });
    }
  });

  // 3. Long Gaps (Resurrections)
  // Look for gaps > e.g. 14 days
  const GAP_THRESHOLD_DAYS = 14;
  for (let i = 1; i < sortedMsgs.length; i++) {
    const prev = sortedMsgs[i - 1];
    const curr = sortedMsgs[i];
    const diffDays = (curr.ts - prev.ts) / (1000 * 60 * 60 * 24);

    if (diffDays > GAP_THRESHOLD_DAYS) {
      moments.push({
        importId,
        type: "long_gap",
        date: new Date(curr.ts).toISOString().split("T")[0],
        ts: curr.ts,
        title: "Conversation Revived",
        description: `Chat resumed after a ${Math.round(diffDays)}-day silence.`,
        magnitude: diffDays,
        importance: 0.7 + Math.min(diffDays / 100, 0.3),
      });
    }
  }

  // Generate stable IDs
  return moments
    .map((m) => ({
      ...m,
      id: `${m.type}-${m.ts}-${m.importId}`,
    }))
    .sort((a, b) => b.ts - a.ts); // Newest first
};
