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
  const tags = [...person.skills, ...person.interests].slice(0, 6);
  const isPending = connectionState.status === "pending";
  const isSubmitting = connectionState.status === "submitting";

  return (
    <article className="group flex h-full flex-col rounded-[1.7rem] border border-ink/10 bg-paper p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:border-forest/20 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          {person.avatarUrl && !avatarFailed ? (
            <img
              src={person.avatarUrl}
              alt={`${person.name}'s profile`}
              loading="lazy"
              onError={() => setAvatarFailed(true)}
              className="h-14 w-14 rounded-[1.15rem] object-cover ring-4 ring-cream"
            />
          ) : (
            <div
              aria-label={`${person.name}'s initials`}
              className="grid h-14 w-14 place-items-center rounded-[1.15rem] bg-forest text-base font-bold text-paper ring-4 ring-cream"
            >
              {initials(person.name)}
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-paper bg-[#65a271]" aria-label="Available" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="truncate text-lg font-bold tracking-[-0.025em] text-ink">{person.name}</h3>
              <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-moss">{person.headline}</p>
            </div>
            <span className="shrink-0 rounded-full bg-cream px-2.5 py-1 text-xs font-bold text-forest">
              {person.distanceKm.toFixed(1)} km
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[1.15rem] border border-forest/10 bg-[#edf1e9] p-4">
        <div className="mb-1.5 flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-forest/65">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" />
          Why they fit
        </div>
        <p className="text-sm font-semibold leading-relaxed text-ink">{person.matchReason}</p>
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Skills and interests">
          {tags.map((tag, index) => (
            <span key={`${tag}-${index}`} className="rounded-full border border-ink/10 px-2.5 py-1 text-xs font-medium text-moss">
              {tag}
            </span>
          ))}
        </div>
      )}

      {person.bio && <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-moss">{person.bio}</p>}

      <div className="mt-auto pt-5">
        {person.availability && (
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-moss">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current">
              <circle cx="10" cy="10" r="7.5" strokeWidth="1.5" />
              <path d="M10 6v4l2.7 1.6" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {person.availability}
          </p>
        )}
        <button
          type="button"
          disabled={isPending || isSubmitting}
          onClick={() => onConnect(person)}
          className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-[1rem] px-4 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${
            isPending
              ? "cursor-default bg-[#dcebdd] text-[#28603a]"
              : "border border-forest/20 bg-transparent text-forest hover:border-forest hover:bg-forest hover:text-white disabled:cursor-wait disabled:opacity-65"
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
              <span aria-hidden="true">↗</span>
            </>
          )}
        </button>
        {connectionState.status === "error" && (
          <p role="alert" className="mt-2 text-center text-xs font-medium text-[#bc492f]">
            {connectionState.message} Select Connect to retry.
          </p>
        )}
      </div>
    </article>
  );
}
