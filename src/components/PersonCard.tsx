import { useState } from "react";
import type { ConnectionUiState, PersonMatch, ReportReason } from "../types";

interface PersonCardProps {
  person: PersonMatch;
  connectionState: ConnectionUiState;
  onConnect: (person: PersonMatch) => void;
  onHide: (person: PersonMatch) => Promise<void>;
  onReport: (person: PersonMatch, reason: ReportReason, details: string) => Promise<void>;
  onViewRequests: () => void;
}

const REPORT_REASONS: ReadonlyArray<{ value: ReportReason; label: string }> = [
  { value: "spam", label: "Spam or fake profile" },
  { value: "harassment", label: "Harassment" },
  { value: "misleading", label: "Misleading information" },
  { value: "unsafe", label: "Unsafe behaviour" },
  { value: "other", label: "Something else" },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function PersonCard({
  person,
  connectionState,
  onConnect,
  onHide,
  onReport,
  onViewRequests,
}: PersonCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [failedPhotoUrls, setFailedPhotoUrls] = useState<Set<string>>(() => new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [safetyBusy, setSafetyBusy] = useState<"hide" | "report" | null>(null);
  const [safetyError, setSafetyError] = useState<string | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const tags = Array.from(new Set([...person.skills, ...person.interests])).slice(0, 6);
  const isPending = connectionState.status === "pending";
  const isSubmitting = connectionState.status === "submitting";
  const isIncoming = connectionState.status === "incoming";
  const isAccepted = connectionState.status === "accepted";
  const isUnavailable = connectionState.status === "unavailable";
  const activePhotoIndex = person.photoUrls.length > 0 ? photoIndex % person.photoUrls.length : 0;
  const galleryPhotoUrl = person.photoUrls[activePhotoIndex] ?? null;
  const activePhotoUrl = galleryPhotoUrl && !failedPhotoUrls.has(galleryPhotoUrl)
    ? galleryPhotoUrl
    : person.avatarUrl && !failedPhotoUrls.has(person.avatarUrl)
      ? person.avatarUrl
      : null;

  function markPhotoFailed(url: string) {
    setFailedPhotoUrls((current) => new Set(current).add(url));
  }

  async function hide() {
    setMenuOpen(false);
    setSafetyError(null);
    setSafetyBusy("hide");
    try {
      await onHide(person);
    } catch (error) {
      setSafetyError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "We could not hide this profile.",
      );
    } finally {
      setSafetyBusy(null);
    }
  }

  async function submitReport() {
    setSafetyError(null);
    setSafetyBusy("report");
    try {
      await onReport(person, reportReason, reportDetails.trim());
      setReportOpen(false);
      setReportSubmitted(true);
      setReportDetails("");
    } catch (error) {
      setSafetyError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "We could not submit your report.",
      );
    } finally {
      setSafetyBusy(null);
    }
  }

  return (
    <article className="flex h-full flex-col rounded-xl border border-hairline-soft bg-canvas p-5 shadow-subtle transition hover:shadow-card sm:p-6">
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <div className="relative">
            {person.photoUrls.length > 1 ? (
              <button
                type="button"
                onClick={() => setPhotoIndex((current) => (current + 1) % person.photoUrls.length)}
                aria-label={`Show next photo of ${person.name}`}
                className="block rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {activePhotoUrl ? (
                  <img
                    src={activePhotoUrl}
                    alt={`${person.name}'s profile, photo ${activePhotoIndex + 1} of ${person.photoUrls.length}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => markPhotoFailed(activePhotoUrl)}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-label={`${person.name}'s initials`}
                    className="grid h-16 w-16 place-items-center rounded-full bg-cream-deeper text-lg font-semibold text-primary-deep"
                  >
                    {initials(person.name)}
                  </span>
                )}
              </button>
            ) : activePhotoUrl ? (
              <img
                src={activePhotoUrl}
                alt={`${person.name}'s profile`}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => markPhotoFailed(activePhotoUrl)}
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
          {person.photoUrls.length > 1 && (
            <div className="mt-1.5 flex justify-center gap-1" aria-label={`Photo ${activePhotoIndex + 1} of ${person.photoUrls.length}`}>
              {person.photoUrls.map((url, index) => (
                <span
                  key={`${url}-${index}`}
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${index === activePhotoIndex ? "bg-primary" : "bg-beige"}`}
                />
              ))}
            </div>
          )}
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

        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={`More options for ${person.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            disabled={safetyBusy !== null}
            onClick={() => {
              setMenuOpen((open) => !open);
              setReportOpen(false);
            }}
            className="grid h-8 w-8 place-items-center rounded-lg text-steel transition hover:bg-cream-light hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait"
          >
            <span aria-hidden="true" className="text-lg leading-none">⋯</span>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-9 z-10 w-48 rounded-lg border border-hairline-soft bg-canvas p-1 shadow-card"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => void hide()}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink transition hover:bg-cream-light"
              >
                Hide this profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setReportOpen(true);
                }}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink transition hover:bg-cream-light"
              >
                Report this profile
              </button>
            </div>
          )}
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

      {reportOpen && (
        <form
          className="mt-4 rounded-lg border border-hairline-soft bg-cream-light p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitReport();
          }}
        >
          <label htmlFor={`report-reason-${person.id}`} className="block text-xs font-semibold text-ink">
            Why are you reporting {person.name}?
          </label>
          <select
            id={`report-reason-${person.id}`}
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value as ReportReason)}
            className="mt-2 w-full rounded-lg border border-hairline-strong bg-canvas px-3 py-2 text-sm text-ink"
          >
            {REPORT_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
          <textarea
            value={reportDetails}
            onChange={(event) => setReportDetails(event.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Add detail that helps us review this (optional)"
            className="mt-2 w-full resize-none rounded-lg border border-hairline-strong bg-canvas px-3 py-2 text-sm text-ink placeholder:text-stone"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-steel transition hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={safetyBusy === "report"}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-charcoal disabled:cursor-wait disabled:opacity-60"
            >
              {safetyBusy === "report" ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </form>
      )}

      {reportSubmitted && (
        <p className="mt-4 rounded-lg bg-[#edf7f1] px-3 py-2 text-xs font-medium text-success">
          Report submitted. Thank you for helping keep Brea safe.
        </p>
      )}

      <div className="mt-auto pt-5">
        {isIncoming ? (
          <button
            type="button"
            onClick={onViewRequests}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-cream-light px-5 text-sm font-medium text-primary-deep transition hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            They sent you a request · Review it
            <span aria-hidden="true">→</span>
          </button>
        ) : isAccepted ? (
          <div className="inline-flex min-h-10 w-full cursor-default items-center justify-center gap-2 rounded-lg border border-success/30 bg-[#edf7f1] px-5 text-sm font-medium text-success">
            <span aria-hidden="true">✓</span>
            Connected
          </div>
        ) : isUnavailable ? (
          <div className="inline-flex min-h-10 w-full cursor-default items-center justify-center gap-2 rounded-lg border border-hairline-strong bg-surface px-5 text-sm font-medium text-steel">
            Not accepting requests right now
          </div>
        ) : (
          <button
            type="button"
            disabled={isPending || isSubmitting || safetyBusy === "hide"}
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
            ) : safetyBusy === "hide" ? (
              "Hiding…"
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
        )}

        {connectionState.status === "error" && (
          <p role="alert" className="mt-3 text-xs font-medium text-signal">
            {connectionState.message} Select Connect to retry.
          </p>
        )}
        {safetyError && (
          <p role="alert" className="mt-3 text-xs font-medium text-signal">
            {safetyError}
          </p>
        )}
      </div>
    </article>
  );
}
