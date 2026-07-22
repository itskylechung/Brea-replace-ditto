import { useState, type JSX } from "react";
import type { BreaProfile } from "../types";

// Duplicated locally from PersonCard.tsx; consolidating the shared helper is out of scope.
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const rowClass = "grid grid-cols-[8rem_1fr] gap-3 py-3";
const termClass = "text-xs font-semibold uppercase tracking-[0.1em] text-steel";
const detailChipClass = "rounded-full bg-cream-deeper px-2.5 py-1 text-xs font-medium text-slate";

export function ProfileView({ profile, onEdit }: { profile: BreaProfile; onEdit: () => void }): JSX.Element {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);

  const tags = Array.from(new Set([...profile.skills, ...profile.interests])).slice(0, 6);
  const mainPhotoUrl = profile.photos[0]?.url ?? profile.avatarUrl;
  const hasCoords = profile.latitude !== null && profile.longitude !== null;
  const notAdded = <span className="text-muted">Not added</span>;

  return (
    <section aria-labelledby="profile-heading">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-primary-deep">Your profile</p>
      <h2
        id="profile-heading"
        className="mt-2 font-editorial text-3xl font-normal tracking-[-0.02em] text-ink sm:text-4xl"
      >
        How people find you
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
        This is the card nearby members see when you appear in their search results. Exact location and
        email are never shown.
      </p>

      <div className="mt-8 max-w-xl rounded-xl border border-hairline-soft bg-canvas p-5 shadow-subtle sm:p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            {mainPhotoUrl && failedPhotoUrl !== mainPhotoUrl ? (
              <img
                src={mainPhotoUrl}
                alt={`${profile.name}'s profile`}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setFailedPhotoUrl(mainPhotoUrl)}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div
                aria-label={`${profile.name}'s initials`}
                className="grid h-16 w-16 place-items-center rounded-full bg-cream-deeper text-lg font-semibold text-primary-deep"
              >
                {initials(profile.name)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-medium text-ink">{profile.name}</h3>
            {profile.headline && <p className="mt-0.5 text-sm leading-5 text-slate">{profile.headline}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-steel">
              {profile.locationLabel && (
                <span className="inline-flex items-center gap-1.5">
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-primary">
                    <path d="M16 8.2c0 4-6 8.8-6 8.8S4 12.2 4 8.2a6 6 0 1 1 12 0Z" strokeWidth="1.4" />
                    <circle cx="10" cy="8" r="1.8" strokeWidth="1.4" />
                  </svg>
                  {profile.locationLabel}
                </span>
              )}
              {profile.availability && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {profile.availability}
                </span>
              )}
            </div>
          </div>
        </div>

        {profile.photos.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Additional profile photos">
            {profile.photos.slice(1).map((photo, index) => (
              <img
                key={photo.key}
                src={photo.url}
                alt={`Profile photo ${index + 2}`}
                loading="lazy"
                className="h-12 w-12 rounded-lg object-cover"
              />
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Skills and interests">
            {tags.map((tag) => (
              <span key={tag} className={detailChipClass}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {profile.bio && <p className="mt-4 line-clamp-2 text-sm leading-5 text-steel">{profile.bio}</p>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={
            profile.isDiscoverable
              ? "rounded-full bg-[#edf7f1] px-2.5 py-1 text-xs font-medium text-success"
              : "rounded-full bg-cream-light px-2.5 py-1 text-xs font-medium text-steel"
          }
        >
          {profile.isDiscoverable ? "Shown in discovery" : "Hidden from discovery"}
        </span>
        <span
          className={
            profile.isAvailable
              ? "rounded-full bg-[#edf7f1] px-2.5 py-1 text-xs font-medium text-success"
              : "rounded-full bg-cream-light px-2.5 py-1 text-xs font-medium text-steel"
          }
        >
          {profile.isAvailable ? "Open to requests" : "Not accepting requests"}
        </span>
      </div>

      <dl className="mt-8 max-w-xl divide-y divide-hairline-soft">
        <div className={rowClass}>
          <dt className={termClass}>Headline</dt>
          <dd className="text-sm text-ink">{profile.headline ? profile.headline : notAdded}</dd>
        </div>
        <div className={rowClass}>
          <dt className={termClass}>Bio</dt>
          <dd className="text-sm text-ink">{profile.bio ? profile.bio : notAdded}</dd>
        </div>
        <div className={rowClass}>
          <dt className={termClass}>Skills</dt>
          <dd className="text-sm text-ink">
            {profile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <span key={skill} className={detailChipClass}>
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              notAdded
            )}
          </dd>
        </div>
        <div className={rowClass}>
          <dt className={termClass}>Interests</dt>
          <dd className="text-sm text-ink">
            {profile.interests.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map((interest) => (
                  <span key={interest} className={detailChipClass}>
                    {interest}
                  </span>
                ))}
              </div>
            ) : (
              notAdded
            )}
          </dd>
        </div>
        <div className={rowClass}>
          <dt className={termClass}>Availability</dt>
          <dd className="text-sm text-ink">{profile.availability ? profile.availability : notAdded}</dd>
        </div>
        <div className={rowClass}>
          <dt className={termClass}>Location</dt>
          <dd className="text-sm text-ink">{profile.locationLabel ? profile.locationLabel : notAdded}</dd>
        </div>
        <div className={rowClass}>
          <dt className={termClass}>LinkedIn</dt>
          <dd className="text-sm text-ink">
            {profile.linkedinProfileUrl ? (
              <a
                href={profile.linkedinProfileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary-deep underline-offset-2 hover:underline"
              >
                Open profile <span aria-hidden="true">↗</span>
              </a>
            ) : (
              notAdded
            )}
          </dd>
        </div>
        <div className={rowClass}>
          <dt className={termClass}>Private location</dt>
          <dd className="text-sm text-ink">
            {hasCoords ? <span className="text-success">Added ✓</span> : notAdded}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onEdit}
        className="mt-8 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Edit profile
      </button>
    </section>
  );
}
