import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../types";
import { mergeChatMessages } from "./chatMessages";

function message(id: string, createdAt: string): ChatMessage {
  return { id, senderId: "sender", body: id, createdAt };
}

describe("mergeChatMessages", () => {
  it("does not let a stale poll remove a newer visible message", () => {
    const first = message("first", "2026-07-21T10:00:00.000Z");
    const sent = message("sent", "2026-07-21T10:01:00.000Z");
    const current = [first, sent];

    expect(mergeChatMessages(current, [first])).toBe(current);
  });

  it("adds unseen messages once and keeps chronological order", () => {
    const first = message("first", "2026-07-21T10:00:00.000Z");
    const second = message("second", "2026-07-21T10:01:00.000Z");
    const third = message("third", "2026-07-21T10:02:00.000Z");

    expect(mergeChatMessages([second], [first, second, third])).toEqual([
      first,
      second,
      third,
    ]);
  });
});
