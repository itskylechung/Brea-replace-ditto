import { useEffect, useRef, useState } from "react";
import { listChatMessages, sendChatMessage } from "../lib/api";
import { mergeChatMessages } from "../lib/chatMessages";
import type { ChatMessage, ConnectionItem } from "../types";

// ponytail: 5s polling instead of real-time infra — swap for a push channel
// after OPS-02 lands a production backend.
const POLL_INTERVAL_MS = 5_000;
const MAX_MESSAGE_LENGTH = 2000;

function messageTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
}

export function ChatPanel({ item }: { item: ConnectionItem }) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages?.at(-1)?.id;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const next = await listChatMessages(item.id);
        if (cancelled) return;
        setMessages((current) => mergeChatMessages(current, next));
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        // Keep already-loaded messages visible; only surface the error when
        // the first load fails and there is nothing to show.
        setMessages((current) => {
          if (current === null) {
            setLoadError(
              error instanceof Error && error.message.trim()
                ? error.message
                : "We could not load this conversation.",
            );
          }
          return current;
        });
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [item.id]);

  useEffect(() => {
    if (!lastMessageId) return;
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [lastMessageId]);

  async function send() {
    const body = draft.trim();
    if (!body || isSending) return;
    setIsSending(true);
    setSendError(null);
    try {
      const sent = await sendChatMessage({ connectionId: item.id, body });
      setMessages((current) => mergeChatMessages(current, [sent]));
      setDraft("");
    } catch (error) {
      setSendError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Your message could not be sent.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-hairline-soft bg-cream-light p-4">
      <div
        className="max-h-80 overflow-y-auto"
        role="log"
        aria-label={`Conversation with ${item.person.name}`}
      >
        {messages === null && !loadError && (
          <p className="py-6 text-center text-sm text-steel">Loading conversation…</p>
        )}
        {loadError && (
          <p role="alert" className="py-6 text-center text-sm text-signal">
            {loadError}
          </p>
        )}
        {messages !== null && messages.length === 0 && (
          <p className="py-6 text-center text-sm text-steel">
            You’re connected — say hello to {item.person.name}.
          </p>
        )}
        {messages !== null && messages.length > 0 && (
          <ul className="grid gap-2">
            {messages.map((message) => {
              const isOwn = message.senderId !== item.person.id;
              return (
                <li key={message.id} className={isOwn ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2 text-sm leading-5 ${
                      isOwn ? "bg-ink text-white" : "bg-canvas text-ink shadow-subtle"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <p className={`mt-1 text-[0.65rem] ${isOwn ? "text-white/60" : "text-steel"}`}>
                      {messageTime(message.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter"
              && !event.shiftKey
              && !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              void send();
            }
          }}
          rows={2}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={`Message ${item.person.name}…`}
          aria-label={`Message ${item.person.name}`}
          className="min-h-[2.75rem] flex-1 resize-none rounded-lg border border-hairline-strong bg-canvas px-3 py-2 text-sm text-ink placeholder:text-steel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        />
        <button
          type="submit"
          disabled={isSending || draft.trim().length === 0}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-white transition hover:bg-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending ? "Sending…" : "Send"}
        </button>
      </form>
      {sendError && (
        <p role="alert" className="mt-2 text-xs font-medium text-signal">
          {sendError}
        </p>
      )}
    </div>
  );
}
