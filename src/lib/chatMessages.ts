import type { ChatMessage } from "../types";

export function mergeChatMessages(
  current: ChatMessage[] | null,
  incoming: ChatMessage[],
): ChatMessage[] {
  if (current === null || current.length === 0) return incoming;

  const knownIds = new Set(current.map((message) => message.id));
  const merged = [...current];

  for (const message of incoming) {
    if (knownIds.has(message.id)) continue;
    knownIds.add(message.id);
    merged.push(message);
  }

  if (merged.length === current.length) return current;

  return merged.sort((left, right) => {
    const chronological = left.createdAt.localeCompare(right.createdAt);
    return chronological || left.id.localeCompare(right.id);
  });
}
