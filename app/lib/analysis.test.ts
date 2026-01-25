import { describe, it, expect } from "vitest";
import { inferReplyEdges, findInterestingMoments } from "./analysis";
import { Message, ExportConfig } from "../types";

const mockConfig: ExportConfig = {
  parsing: {
    dateFormat: "DD/MM/YYYY",
    timezone: "UTC",
    locale: "en-US",
    strictMode: false,
  },
  session: {
    gapThresholdMinutes: 90,
    replyWindowMinutes: 60,
  },
  textProcessing: {
    minMessageLength: 3,
    stopwords: [],
  },
  privacy: {
    redactionMode: false,
    hashNames: false,
  },
};

describe("inferReplyEdges", () => {
  it("should infer a reply edge when within window", () => {
    const messages: Message[] = [
      { id: 1, ts: 1000, senderId: 1, type: "text", importId: 1 } as Message,
      { id: 2, ts: 2000, senderId: 2, type: "text", importId: 1 } as Message, // Reply to 1
    ];
    const edges = inferReplyEdges(messages, mockConfig);
    expect(edges).toHaveLength(1);
    expect(edges[0].fromMessageId).toBe(2);
    expect(edges[0].toMessageId).toBe(1);
  });

  it("should NOT infer reply if same sender", () => {
    const messages: Message[] = [
      { id: 1, ts: 1000, senderId: 1, type: "text", importId: 1 } as Message,
      { id: 2, ts: 2000, senderId: 1, type: "text", importId: 1 } as Message,
    ];
    const edges = inferReplyEdges(messages, mockConfig);
    expect(edges).toHaveLength(0);
  });

  it("should NOT infer reply if outside window", () => {
    const messages: Message[] = [
      { id: 1, ts: 1000, senderId: 1, type: "text", importId: 1 } as Message,
      // Window is 60 mins = 3600000ms. Gap here is 4000000ms.
      { id: 2, ts: 4001000, senderId: 2, type: "text", importId: 1 } as Message,
    ];
    const edges = inferReplyEdges(messages, mockConfig);
    expect(edges).toHaveLength(0);
  });

  it("should handle unsorted input correctly", () => {
    const messages: Message[] = [
      { id: 2, ts: 2000, senderId: 2, type: "text", importId: 1 } as Message,
      { id: 1, ts: 1000, senderId: 1, type: "text", importId: 1 } as Message,
    ];
    const edges = inferReplyEdges(messages, mockConfig);
    expect(edges).toHaveLength(1);
    expect(edges[0].fromMessageId).toBe(2);
    expect(edges[0].toMessageId).toBe(1);
  });
});

describe("findInterestingMoments", () => {
  it("should use correct locale day binning", () => {
    // We need at least >5 data points (days) for the stats logic to run
    const messages: Message[] = [];

    // Day 1: 5 msgs
    for (let i = 0; i < 5; i++)
      messages.push({
        id: i,
        ts: new Date("2023-01-01T12:00:00").getTime(),
        senderId: 1,
        type: "text",
        importId: 1,
      } as Message);
    // Day 2: 5 msgs
    for (let i = 10; i < 15; i++)
      messages.push({
        id: i,
        ts: new Date("2023-01-02T12:00:00").getTime(),
        senderId: 1,
        type: "text",
        importId: 1,
      } as Message);
    // Day 3: 5 msgs
    for (let i = 20; i < 25; i++)
      messages.push({
        id: i,
        ts: new Date("2023-01-03T12:00:00").getTime(),
        senderId: 1,
        type: "text",
        importId: 1,
      } as Message);
    // Day 4: 5 msgs
    for (let i = 30; i < 35; i++)
      messages.push({
        id: i,
        ts: new Date("2023-01-04T12:00:00").getTime(),
        senderId: 1,
        type: "text",
        importId: 1,
      } as Message);
    // Day 5: 5 msgs
    for (let i = 40; i < 45; i++)
      messages.push({
        id: i,
        ts: new Date("2023-01-05T12:00:00").getTime(),
        senderId: 1,
        type: "text",
        importId: 1,
      } as Message);
    // Day 6: 5 msgs
    for (let i = 50; i < 55; i++)
      messages.push({
        id: i,
        ts: new Date("2023-01-06T12:00:00").getTime(),
        senderId: 1,
        type: "text",
        importId: 1,
      } as Message);

    // Day 7: SPIKE! 100 msgs
    for (let i = 100; i < 200; i++)
      messages.push({
        id: i,
        ts: new Date("2023-01-07T12:00:00").getTime(),
        senderId: 1,
        type: "text",
        importId: 1,
      } as Message);

    const moments = findInterestingMoments(messages, [], mockConfig);
    // Should detect a high activity day.
    expect(moments.length).toBeGreaterThan(0);
    expect(moments[0].type).toBe("volume_spike");
  });
});
