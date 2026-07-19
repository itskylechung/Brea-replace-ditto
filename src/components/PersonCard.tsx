import { useState } from "react";
import type { ConnectionUiState, PersonMatch } from "../types";

interface PersonCardProps {
  person: PersonMatch;
  connectionState: ConnectionUiState;
  onConnect: (person: PersonMatch) => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function PersonCard({ person, connectionState, onConnect }: PersonCardProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const tags = Array.from(new Set([...person.skills, ...person.interests])).slice(0, 6);
  const isPending = connectionState.status === "pending";
  const isSubmitting = connectionState.status === "submitting";

  return (
    <article className="flex h-full flex-col rounded-xl border border-hairline-soft bg-canvas p-5 shadow-subtle transition hover:shadow-card sm:p-6">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          {person.avatarUrl && !avatarFailed ? (
            <img
              src={person.avatarUrl}
              alt={`${person.name}'s profile`}
              loading="lazy"
              onError={() => setAvatarFailed(true)}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div
              aria-label={`${person.name}'s initials`}
              className="grid h-16 w-16 place-items-center rounded-full bg-cream-deeper text-lg font-semibold text-primary-deep"
            >
              {initials(person.name)}
            </div>
          )}
          <span
            className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-[3px] border-canvas bg-success"
            aria-label="Available"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-medium text-ink">{person.name}</h3>
          <p className="mt-0.5 text-sm leading-5 text-slate">{person.headline}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-steel">
            <span className="inline-flex items-center gap-1.5">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-primary">
                <path d="M16 8.2c0 4-6 8.8-6 8.8S4 12.2 4 8.2a6 6 0 1 1 12 0Z" strokeWidth="1.4" />
                <circle cx="10" cy="8" r="1.8" strokeWidth="1.4" />
              </svg>
              {person.distanceKm.toFixed(1)} km away
            </span>
            {person.availability && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {person.availability}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-beige bg-cream-light p-4">
        <p className="text-xs font-semibold text-primary-deep">Why this person fits</p>
        <p className="mt-1 text-sm leading-5 text-ink">{person.matchReason}</p>
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Skills and interests">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-cream-deeper px-2.5 py-1 text-xs font-medium text-slate">
              {tag}
            </span>
          ))}
        </div>
      )}

      {person.bio && <p className="mt-4 line-clamp-2 text-sm leading-5 text-steel">{person.bio}</p>}

      <div className="mt-auto pt-5">
        <button
          type="button"
          disabled={isPending || isSubmitting}
          onClick={() => onConnect(person)}
          className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            isPending
              ? "cursor-default border border-success/30 bg-[#edf7f1] text-success"
              : "border border-hairline-strong bg-canvas text-ink hover:border-ink hover:bg-surface disabled:cursor-wait disabled:text-muted"
          }`}
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
              Sending…
            </>
          ) : isPending ? (
            <>
              <span aria-hidden="true">✓</span>
              Request sent
            </>
          ) : (
            <>
              Connect
              <span aria-hidden="true">→</span>
            </>
          )}
        </button>

        {connectionState.status === "error" && (
          <p role="alert" className="mt-3 text-xs font-medium text-signal">
            {connectionState.message} Select Connect to retry.
          </p>
        )}
      </div>
    </article>
  );
}
