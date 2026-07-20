import { useEffect, useState } from "react";
import { listConnectionInbox, respondToConnection } from "../lib/api";
import type { ConnectionInboxResponse, ConnectionItem } from "../types";

type InboxState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; inbox: ConnectionInboxResponse };

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function requestDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function StatusChip({ status }: { status: ConnectionItem["status"] }) {
  if (status === "pending") {
    return (
      <span className="rounded-full bg-cream-deeper px-2.5 py-1 text-xs font-medium text-slate">
        Waiting for a reply
      </span>
    );
  }
  if (status === "accepted") {
    return (
      <span className="rounded-full bg-[#edf7f1] px-2.5 py-1 text-xs font-medium text-success">
        Connected
      </span>
    );
  }
  return (
    <span className="rounded-full bg-cream-light px-2.5 py-1 text-xs font-medium text-steel">
      Declined
    </span>
  );
}

function RequestRow({
  item,
  isResponding,
  respondError,
  onRespond,
}: {
  item: ConnectionItem;
  isResponding: boolean;
  respondError: string | null;
  onRespond: (item: ConnectionItem, action: "accept" | "decline") => void;
}) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const { person } = item;
  const showDecisionButtons = item.direction === "incoming" && item.status === "pending";

  return (
    <li className="rounded-xl border border-hairline-soft bg-canvas p-5 shadow-subtle">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {person.avatarUrl && !avatarFailed ? (
          <img
            src={person.avatarUrl}
            alt={`${person.name}'s profile`}
            loading="lazy"
            onError={() => setAvatarFailed(true)}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            aria-label={`${person.name}'s initials`}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cream-deeper text-base font-semibold text-primary-deep"
          >
            {initials(person.name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-base font-medium text-ink">{person.name}</h3>
            <StatusChip status={item.status} />
          </div>
          {person.headline && <p className="mt-0.5 text-sm leading-5 text-slate">{person.headline}</p>}
          <p className="mt-2 text-xs leading-5 text-steel">
            {item.direction === "incoming" ? "Found you via" : "You searched"} “{item.sourceQuery}”
            {requestDate(item.createdAt) && <> · {requestDate(item.createdAt)}</>}
            {person.locationLabel && <> · {person.locationLabel}</>}
          </p>
          {item.status === "accepted" && person.linkedinProfileUrl && (
            <a
              href={person.linkedinProfileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-deep underline-offset-2 hover:underline"
            >
              Open LinkedIn profile
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>

        {showDecisionButtons && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={isResponding}
              onClick={() => onRespond(item, "accept")}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-white transition hover:bg-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:opacity-60"
            >
              {isResponding ? "Saving…" : "Accept"}
            </button>
            <button
              type="button"
              disabled={isResponding}
              onClick={() => onRespond(item, "decline")}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-hairline-strong bg-canvas px-4 text-sm font-medium text-ink transition hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
            >
              Decline
            </button>
          </div>
        )}
      </div>
      {respondError && (
        <p role="alert" className="mt-3 text-xs font-medium text-signal">
          {respondError}
        </p>
      )}
    </li>
  );
}

function RequestGroup({
  title,
  emptyCopy,
  items,
  respondingId,
  respondErrors,
  onRespond,
}: {
  title: string;
  emptyCopy: string;
  items: ConnectionItem[];
  respondingId: string | null;
  respondErrors: Record<string, string>;
  onRespond: (item: ConnectionItem, action: "accept" | "decline") => void;
}) {
  return (
    <section aria-label={title}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-primary-deep">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-hairline bg-cream-light px-5 py-6 text-sm text-steel">
          {emptyCopy}
        </p>
      ) : (
        <ul className="mt-3 grid gap-4">
          {items.map((item) => (
            <RequestRow
              key={item.id}
              item={item}
              isResponding={respondingId === item.id}
              respondError={respondErrors[item.id] ?? null}
              onRespond={onRespond}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function ConnectionRequests() {
  const [state, setState] = useState<InboxState>({ status: "loading" });
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondErrors, setRespondErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void listConnectionInbox()
      .then((inbox) => {
        if (!cancelled) setState({ status: "ready", inbox });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error && error.message.trim()
                ? error.message
                : "We could not load your requests.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function respond(item: ConnectionItem, action: "accept" | "decline") {
    setRespondingId(item.id);
    setRespondErrors((current) => ({ ...current, [item.id]: "" }));
    try {
      const decision = await respondToConnection({ connectionId: item.id, action });
      setState((current) => {
        if (current.status !== "ready") return current;
        const applyDecision = (candidate: ConnectionItem): ConnectionItem =>
          candidate.id === decision.id
            ? { ...candidate, status: decision.status, respondedAt: decision.respondedAt }
            : candidate;
        return {
          status: "ready",
          inbox: {
            incoming: current.inbox.incoming.map(applyDecision),
            outgoing: current.inbox.outgoing.map(applyDecision),
          },
        };
      });
    } catch (error) {
      setRespondErrors((current) => ({
        ...current,
        [item.id]:
          error instanceof Error && error.message.trim()
            ? error.message
            : "We could not update this request.",
      }));
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <section aria-labelledby="requests-title">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-primary-deep">
        Connection requests
      </p>
      <h2 id="requests-title" className="mt-2 font-editorial text-3xl font-normal tracking-[-0.02em] text-ink sm:text-4xl">
        Your requests
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
        Accept a request to share your LinkedIn profiles with each other. Declining is silent—the
        sender is not notified.
      </p>

      {state.status === "loading" && (
        <div className="mt-8 grid gap-4" aria-label="Loading your requests">
          {[1, 2].map((item) => (
            <div key={item} className="animate-pulse rounded-xl border border-hairline-soft bg-canvas p-5 shadow-subtle">
              <div className="flex gap-4">
                <div className="h-12 w-12 shrink-0 rounded-full bg-cream-deeper" />
                <div className="flex-1">
                  <div className="h-4 w-40 rounded bg-hairline" />
                  <div className="mt-3 h-3 w-2/3 rounded bg-hairline-soft" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {state.status === "error" && (
        <div className="mt-8 rounded-xl border border-hairline-soft bg-canvas px-6 py-10 text-center shadow-subtle">
          <p role="alert" className="text-sm leading-6 text-signal">
            {state.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg border border-hairline-strong bg-canvas px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink"
          >
            Retry
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <div className="mt-8 grid gap-10">
          <RequestGroup
            title="Incoming"
            emptyCopy="No one has sent you a request yet. Staying discoverable helps people find you."
            items={state.inbox.incoming}
            respondingId={respondingId}
            respondErrors={respondErrors}
            onRespond={(item, action) => void respond(item, action)}
          />
          <RequestGroup
            title="Sent"
            emptyCopy="You have not sent any requests. Search nearby to find your people."
            items={state.inbox.outgoing}
            respondingId={respondingId}
            respondErrors={respondErrors}
            onRespond={(item, action) => void respond(item, action)}
          />
        </div>
      )}
    </section>
  );
}
