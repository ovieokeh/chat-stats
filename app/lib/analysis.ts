import { Message, Session, ReplyEdge, ExportConfig, Participant } from "../types";
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

  // Assume messages sorted by TS
  // To optimized: for each message, look back.

  for (let i = 1; i < messages.length; i++) {
    const curr = messages[i];
    if (!curr.senderId) continue; // System message?
    if (curr.type === "system") continue;

    // Look back
    for (let j = i - 1; j >= 0; j--) {
      const prev = messages[j];

      // Limit check
      if (curr.ts - prev.ts > windowMs) break; // too old

      if (prev.senderId && prev.senderId !== curr.senderId && prev.type !== "system") {
        // Found parent!
        edges.push({
          importId: curr.importId,
          fromSenderId: curr.senderId,
          toSenderId: prev.senderId,
          fromMessageId: curr.id!,
          toMessageId: prev.id!,
          deltaSeconds: (curr.ts - prev.ts) / 1000,
          sameSession: true, // simplified assumption or check actual sessions
        });
        break; // One parent only (closest)
      }
    }
  }
  return edges;
};
