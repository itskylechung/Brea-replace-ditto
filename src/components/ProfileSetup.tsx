import { useState } from "react";
import type { BreaProfile, ProfileUpdateInput } from "../types";
import { BreaMark } from "./BreaMark";
import { TagInput } from "./TagInput";
import { INTEREST_SUGGESTIONS, SKILL_SUGGESTIONS } from "../lib/tagSuggestions";

// Duplicated locally from PersonCard.tsx; consolidating the shared helper is out of scope.
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileSetup({
  profile,
  email,
  onSave,
  onSignOut,
  mode = "onboarding",
  onCancel,
}: {
  profile: BreaProfile;
  email: string;
  onSave: (input: ProfileUpdateInput) => Promise<void>;
  onSignOut: () => Promise<void>;
  mode?: "onboarding" | "editing";
  onCancel?: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [skills, setSkills] = useState<string[]>(profile.skills);
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [availability, setAvailability] = useState(profile.availability ?? "");
  const [locationLabel, setLocationLabel] = useState(profile.locationLabel ?? "");
  const [linkedinProfileUrl, setLinkedinProfileUrl] = useState(profile.linkedinProfileUrl ?? "");
  const [latitude, setLatitude] = useState<number | null>(profile.latitude);
  const [longitude, setLongitude] = useState<number | null>(profile.longitude);
  const [isDiscoverable, setIsDiscoverable] = useState(
    mode === "onboarding" ? true : profile.isDiscoverable,
  );
  const [isAvailable, setIsAvailable] = useState(
    mode === "onboarding" ? true : profile.isAvailable,
  );
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  // A profile can only be discoverable once it has coordinates (enforced by the
  // profiles_discoverable_is_complete DB check). Gate the toggle on this so the
  // saved value can never violate that constraint.
  const hasCoords = latitude !== null && longitude !== null;

  function useCurrentLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError("This browser cannot provide a location.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);
        setIsLocating(false);
      },
      () => {
        setError("We could not read your location. Check your browser permission and try again.");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!name.trim() || !headline.trim() || !locationLabel.trim()) {
      setError("Name, headline, and general location are required.");
      return;
    }
    const linkedInUrl = linkedinProfileUrl.trim();
    if (linkedInUrl && !/^https:\/\/(?:[a-z]{2}\.)?linkedin\.com\/in\/[A-Za-z0-9%_-]+\/?(?:\?.*)?$/.test(linkedInUrl)) {
      setError("Enter a valid LinkedIn profile URL, such as https://www.linkedin.com/in/your-name.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        headline: headline.trim(),
        bio: bio.trim() || null,
        skills: skills.slice(0, 20),
        interests: interests.slice(0, 20),
        availability: availability.trim() || null,
        locationLabel: locationLabel.trim(),
        latitude,
        longitude,
        linkedinProfileUrl: linkedInUrl || null,
        onboardingCompleted: true,
        isDiscoverable: isDiscoverable && hasCoords,
        isAvailable,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Your profile could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  const fieldClass = "mt-2 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-moss/55 focus:border-forest/45 focus:ring-2 focus:ring-forest/10";
  const matchingChipClass = "ml-2 rounded-full bg-forest/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-forest align-middle";

  return (
    <div className="min-h-screen bg-cream px-5 py-7 text-ink sm:px-8">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <BreaMark />
        <div className="flex items-center gap-4">
          {mode === "editing" && onCancel && (
            <button type="button" onClick={onCancel} className="text-sm font-bold text-moss hover:text-ink">Back to discovery</button>
          )}
          <button type="button" onClick={() => void onSignOut()} className="text-sm font-bold text-moss hover:text-ink">Sign out</button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl py-12">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-coral">{mode === "onboarding" ? "One-minute setup" : "Profile and privacy"}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">{mode === "onboarding" ? "Review what people will see." : "Keep your discovery profile current."}</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-moss">{mode === "onboarding" ? "LinkedIn gave us the basics. Add the context that makes a nearby introduction useful." : "Update what other members can discover, refresh your private location, or pause your visibility."} Exact coordinates are never shown to other members.</p>

        <form onSubmit={(event) => void submit(event)} className="mt-9 grid gap-6 rounded-[2rem] border border-paper/80 bg-paper/65 p-6 shadow-card sm:grid-cols-2 sm:p-9">
          <div className="grid gap-3 rounded-2xl border border-forest/10 bg-forest/[0.04] p-4 sm:col-span-2">
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                {profile.avatarUrl && !avatarFailed ? (
                  <img
                    src={profile.avatarUrl}
                    alt={`${profile.name}'s profile`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarFailed(true)}
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
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-bold">{profile.name}</p>
                  <span className="rounded-full bg-white/70 border border-forest/15 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-forest">From LinkedIn</span>
                </div>
                <p className="text-sm text-moss">{email}</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-moss">These came with your sign-in. Your name is editable below; your photo stays synced with LinkedIn.</p>
          </div>
          <label className="text-sm font-bold">Name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required className={fieldClass} />
          </label>
          <label className="text-sm font-bold">Headline
            <span className={matchingChipClass}>Improves matching</span>
            <input value={headline} onChange={(event) => setHeadline(event.target.value)} maxLength={180} required placeholder="Product designer building climate tools" className={fieldClass} />
          </label>
          <label className="text-sm font-bold sm:col-span-2">Short bio
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={1000} rows={3} className={fieldClass} />
          </label>
          <TagInput
            id="skills"
            label="Skills"
            hint="(comma or Enter to add)"
            value={skills}
            onChange={setSkills}
            suggestions={SKILL_SUGGESTIONS}
            placeholder="TypeScript, product strategy"
            labelChip={<span className={matchingChipClass}>Improves matching</span>}
          />
          <TagInput
            id="interests"
            label="Interests"
            hint="(comma or Enter to add)"
            value={interests}
            onChange={setInterests}
            suggestions={INTEREST_SUGGESTIONS}
            placeholder="Climate tech, cycling"
            labelChip={<span className={matchingChipClass}>Improves matching</span>}
          />
          <label className="text-sm font-bold">Availability
            <span className={matchingChipClass}>Improves matching</span>
            <input value={availability} onChange={(event) => setAvailability(event.target.value)} maxLength={180} placeholder="Coffee on weekday afternoons" className={fieldClass} />
          </label>
          <label className="text-sm font-bold">General location
            <input value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} maxLength={120} required placeholder="Da'an District, Taipei" className={fieldClass} />
          </label>
          <label className="text-sm font-bold sm:col-span-2">LinkedIn profile URL <span className="font-normal text-moss">(optional)</span>
            <input type="url" value={linkedinProfileUrl} onChange={(event) => setLinkedinProfileUrl(event.target.value)} placeholder="https://www.linkedin.com/in/your-name" className={fieldClass} />
          </label>

          <div className="rounded-2xl border border-forest/10 bg-forest/[0.04] p-4 sm:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold">Private distance origin</p>
                <p className="mt-1 text-xs leading-relaxed text-moss">
                  {latitude === null
                    ? "Optional for now — without it you won't appear in discovery and can't search nearby. We'll ask again when you first search."
                    : "Stored securely and used only to calculate approximate distance."}
                </p>
              </div>
              <button type="button" onClick={useCurrentLocation} disabled={isLocating} className="rounded-full border border-forest/20 bg-white px-4 py-2 text-sm font-bold text-forest disabled:opacity-50">
                {isLocating ? "Locating…" : latitude === null ? "Use current location" : "Location added ✓"}
              </button>
            </div>
          </div>

          <fieldset className="grid gap-3 rounded-2xl border border-forest/10 bg-white/65 p-4 sm:col-span-2 sm:grid-cols-2">
            <legend className="px-1 text-sm font-bold">Discovery controls</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-cream/70">
              <input
                type="checkbox"
                checked={isDiscoverable && hasCoords}
                disabled={!hasCoords}
                onChange={(event) => setIsDiscoverable(event.target.checked)}
                className="mt-1 h-4 w-4 accent-forest"
              />
              <span>
                <span className="block text-sm font-bold">Show me in discovery</span>
                <span className="mt-1 block text-xs leading-relaxed text-moss">Turn this off to stop appearing in other members' search results.{!hasCoords && " Requires your location."}</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-cream/70">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(event) => setIsAvailable(event.target.checked)}
                className="mt-1 h-4 w-4 accent-forest"
              />
              <span>
                <span className="block text-sm font-bold">Open to new connections</span>
                <span className="mt-1 block text-xs leading-relaxed text-moss">Pause new requests without deleting your profile.</span>
              </span>
            </label>
          </fieldset>

          {error && <p role="alert" className="text-sm text-[#a44734] sm:col-span-2">{error}</p>}
          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-lg text-xs leading-relaxed text-moss">{isDiscoverable && hasCoords ? "Your chosen profile details can appear to signed-in Brea members." : "Your profile will stay hidden from discovery."} You can change this any time.</p>
            <button type="submit" disabled={isSaving} className="rounded-full bg-forest px-6 py-3 text-sm font-bold text-white transition hover:bg-ink disabled:opacity-50">
              {isSaving ? "Saving…" : mode === "onboarding" ? "Save and start exploring" : "Save profile changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
