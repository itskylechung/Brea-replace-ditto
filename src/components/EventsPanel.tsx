import { useEffect, useState } from "react";
import {
  cancelEventRsvp,
  createEvent,
  EventActionError,
  listEventAttendees,
  listEvents,
  rsvpToEvent,
} from "../lib/api";
import type { EventAttendeesResponse, EventSummary } from "../types";

function readableError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function formatStartsAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const inputClass =
  "w-full rounded-lg border border-hairline-strong bg-canvas px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function CreateEventForm({ onCreated }: { onCreated: (event: EventSummary) => void }) {
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [placeLabel, setPlaceLabel] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [tags, setTags] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    const startsAtDate = new Date(startsAt);
    if (!startsAt || Number.isNaN(startsAtDate.getTime())) {
      setError("Pick a date and time for the event.");
      return;
    }
    if (startsAtDate.getTime() <= Date.now()) {
      setError("An event must start in the future.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const created = await createEvent({
        title: title.trim(),
        startsAt: startsAtDate.toISOString(),
        placeLabel: placeLabel.trim(),
        capacity: Number(capacity),
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 10),
      });
      onCreated(created);
    } catch (submitError) {
      setError(readableError(submitError, "We could not create this event."));
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={(formEvent) => void submit(formEvent)}
      className="mt-5 grid gap-4 rounded-xl border border-beige bg-cream-light p-5 sm:grid-cols-2"
    >
      <label className="grid gap-1.5 text-sm font-medium text-ink sm:col-span-2">
        Event title
        <input
          type="text"
          required
          minLength={3}
          maxLength={120}
          value={title}
          onChange={(changeEvent) => setTitle(changeEvent.target.value)}
          placeholder="Tech singles picnic"
          className={inputClass}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Date and time
        <input
          type="datetime-local"
          required
          value={startsAt}
          onChange={(changeEvent) => setStartsAt(changeEvent.target.value)}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Place
        <input
          type="text"
          required
          minLength={2}
          maxLength={160}
          value={placeLabel}
          onChange={(changeEvent) => setPlaceLabel(changeEvent.target.value)}
          placeholder="Da'an Park, main entrance"
          className={inputClass}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Capacity
        <input
          type="number"
          required
          min={2}
          max={500}
          step={1}
          value={capacity}
          onChange={(changeEvent) => setCapacity(changeEvent.target.value)}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Tags <span className="font-normal text-steel">(comma-separated, optional)</span>
        <input
          type="text"
          value={tags}
          onChange={(changeEvent) => setTags(changeEvent.target.value)}
          placeholder="tech, founders, outdoors"
          className={inputClass}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm font-medium text-signal sm:col-span-2">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-charcoal disabled:cursor-wait disabled:opacity-60"
        >
          {isSaving ? "Publishing…" : "Publish event"}
        </button>
      </div>
    </form>
  );
}

function AttendeeList({ eventId }: { eventId: string }) {
  const [attendees, setAttendees] = useState<EventAttendeesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listEventAttendees(eventId)
      .then((response) => {
        if (!cancelled) setAttendees(response);
      })
      .catch((listError: unknown) => {
        if (!cancelled) setError(readableError(listError, "We could not load the attendee list."));
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (error) {
    return (
      <p role="alert" className="mt-3 text-sm text-signal">
        {error}
      </p>
    );
  }
  if (!attendees) return <p className="mt-3 text-sm text-steel">Loading attendees…</p>;

  return (
    <div className="mt-3 rounded-lg bg-cream-light p-4">
      {attendees.attendees.length === 0 ? (
        <p className="text-sm text-steel">No other visible attendees yet — you're early.</p>
      ) : (
        <ul className="grid gap-3">
          {attendees.attendees.map((attendee) => (
            <li key={attendee.id} className="flex items-center gap-3">
              {attendee.avatarUrl ? (
                <img
                  src={attendee.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 place-items-center rounded-full bg-cream-deeper text-sm font-semibold text-steel"
                >
                  {attendee.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div>
                <p className="text-sm font-medium text-ink">{attendee.name}</p>
                {attendee.headline && <p className="text-xs text-steel">{attendee.headline}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {attendees.hiddenCount > 0 && (
        <p className="mt-3 text-xs text-steel">
          {attendees.hiddenCount} more {attendees.hiddenCount === 1 ? "member keeps" : "members keep"}{" "}
          their profile private.
        </p>
      )}
    </div>
  );
}

function EventCard({
  event,
  onChange,
}: {
  event: EventSummary;
  onChange: (event: EventSummary) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAttendees, setShowAttendees] = useState(false);

  const isFull = !event.isAttending && event.attendeeCount >= event.capacity;

  async function toggleRsvp() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = event.isAttending
        ? await cancelEventRsvp(event.id)
        : await rsvpToEvent(event.id);
      setShowAttendees(false);
      onChange({
        ...event,
        attendeeCount: response.attendeeCount,
        isAttending: response.isAttending,
      });
    } catch (rsvpError) {
      const code = rsvpError instanceof EventActionError ? rsvpError.code : undefined;
      setError(
        code === "EVENT_FULL"
          ? "This event filled up."
          : readableError(rsvpError, "We could not update your RSVP."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="rounded-xl border border-hairline-soft bg-canvas p-6 shadow-subtle">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-editorial text-2xl font-normal text-ink">{event.title}</h3>
          <p className="mt-1 text-sm text-steel">
            {formatStartsAt(event.startsAt)} · {event.placeLabel}
          </p>
          <p className="mt-1 text-xs text-steel">
            Hosted by {event.isHost ? "you" : event.hostName} · {event.attendeeCount}/
            {event.capacity} going
          </p>
        </div>
        <div className="flex items-center gap-2">
          {event.isAttending && !event.isHost && (
            <button
              type="button"
              onClick={() => void toggleRsvp()}
              disabled={isSubmitting}
              className="rounded-lg border border-hairline-strong px-4 py-2 text-sm font-medium text-ink transition hover:border-ink disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? "Updating…" : "Cancel RSVP"}
            </button>
          )}
          {!event.isAttending && (
            <button
              type="button"
              onClick={() => void toggleRsvp()}
              disabled={isSubmitting || isFull}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-charcoal disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isFull ? "Full" : isSubmitting ? "Saving…" : "RSVP"}
            </button>
          )}
        </div>
      </div>
      {event.tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Event tags">
          {event.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-cream-light px-3 py-1 text-xs font-medium text-steel"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-signal">
          {error}
        </p>
      )}
      {event.isAttending && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAttendees((current) => !current)}
            aria-expanded={showAttendees}
            className="text-sm font-medium text-primary-deep transition hover:text-ink"
          >
            {showAttendees ? "Hide attendees" : "See who's going"}
          </button>
          {showAttendees && <AttendeeList eventId={event.id} />}
        </div>
      )}
    </article>
  );
}

export function EventsPanel() {
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listEvents()
      .then((loaded) => {
        if (!cancelled) setEvents(loaded);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(readableError(error, "We could not load events right now."));
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function replaceEvent(updated: EventSummary) {
    setEvents((current) =>
      current ? current.map((event) => (event.id === updated.id ? updated : event)) : current,
    );
  }

  return (
    <section aria-labelledby="events-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-primary-deep">
            Events
          </p>
          <h2
            id="events-title"
            className="mt-1 font-editorial text-3xl font-normal tracking-[-0.02em] text-ink sm:text-4xl"
          >
            Meet in person, in a group first
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
            Singles events and casual hangouts hosted by members. RSVP to see who else is going.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating((current) => !current)}
          aria-expanded={isCreating}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-charcoal"
        >
          {isCreating ? "Close" : "Host an event"}
        </button>
      </div>

      {isCreating && (
        <CreateEventForm
          onCreated={(created) => {
            setIsCreating(false);
            setEvents((current) =>
              [...(current ?? []), created].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
            );
          }}
        />
      )}

      <div className="mt-8">
        {loadError ? (
          <div className="rounded-xl border border-hairline-soft bg-canvas px-6 py-12 text-center shadow-subtle">
            <p role="alert" className="text-sm leading-6 text-steel">
              {loadError}
            </p>
            <button
              type="button"
              onClick={() => {
                setLoadError(null);
                setEvents(null);
                setReloadKey((key) => key + 1);
              }}
              className="mt-4 rounded-lg border border-hairline-strong px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink"
            >
              Retry
            </button>
          </div>
        ) : events === null ? (
          <div className="grid gap-5" aria-label="Loading events">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-xl border border-hairline-soft bg-canvas shadow-subtle"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-beige bg-cream-light px-6 py-12 text-center">
            <h3 className="font-editorial text-2xl font-normal text-ink">No upcoming events yet</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-steel">
              Be the first — host a casual hangout and let nearby members find it.
            </p>
          </div>
        ) : (
          <div className="grid gap-5">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onChange={replaceEvent} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
