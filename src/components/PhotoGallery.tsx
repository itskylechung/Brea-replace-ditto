import { useState } from "react";
import {
  removeProfilePhotoObject,
  updateProfilePhotos,
  uploadProfilePhoto,
} from "../lib/api";
import type { BreaProfile, ProfilePhoto } from "../types";

const MAX_PHOTOS = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type BusyAction = "upload" | `move-${number}` | `delete-${number}`;

export function PhotoGallery({
  profile,
  onProfileChange,
}: {
  profile: BreaProfile;
  onProfileChange: (profile: BreaProfile) => void;
}) {
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isBusy = busyAction !== null;

  async function addPhoto(file: File) {
    setError(null);
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Choose an image smaller than 5 MB.");
      return;
    }
    if (profile.photos.length >= MAX_PHOTOS) return;

    setBusyAction("upload");
    let uploadedPhoto: ProfilePhoto | null = null;
    try {
      uploadedPhoto = await uploadProfilePhoto(file);
      const nextProfile = await updateProfilePhotos(profile.userId, [
        ...profile.photos,
        uploadedPhoto,
      ]);
      onProfileChange(nextProfile);
    } catch (nextError) {
      if (uploadedPhoto) {
        await removeProfilePhotoObject(uploadedPhoto.key).catch(() => undefined);
      }
      setError(nextError instanceof Error ? nextError.message : "We could not add that photo.");
    } finally {
      setBusyAction(null);
    }
  }

  async function movePhoto(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= profile.photos.length) return;

    setError(null);
    setBusyAction(`move-${index}`);
    const reordered = [...profile.photos];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    try {
      onProfileChange(await updateProfilePhotos(profile.userId, reordered));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "We could not reorder your photos.");
    } finally {
      setBusyAction(null);
    }
  }

  async function deletePhoto(index: number) {
    const photo = profile.photos[index];
    if (!photo) return;

    setError(null);
    setBusyAction(`delete-${index}`);
    try {
      const nextPhotos = profile.photos.filter((_, photoIndex) => photoIndex !== index);
      onProfileChange(await updateProfilePhotos(profile.userId, nextPhotos));
      void removeProfilePhotoObject(photo.key).catch(() => undefined);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "We could not remove that photo.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-4">
        {profile.photos.map((photo, index) => (
          <div key={photo.key} className="w-16">
            <img
              src={photo.url}
              alt={`Profile photo ${index + 1}`}
              className="h-16 w-16 rounded-lg object-cover"
            />
            <p className="mt-1.5 h-4 text-center text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-primary-deep">
              {index === 0 ? "Primary" : `Photo ${index + 1}`}
            </p>
            <div className="mt-1 flex items-center justify-center gap-0.5">
              <button
                type="button"
                onClick={() => void movePhoto(index, -1)}
                disabled={isBusy || index === 0}
                aria-label={`Move photo ${index + 1} left`}
                className="grid h-7 w-5 place-items-center rounded text-sm text-steel transition hover:bg-canvas hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-25"
              >
                <span aria-hidden="true">←</span>
              </button>
              <button
                type="button"
                onClick={() => void movePhoto(index, 1)}
                disabled={isBusy || index === profile.photos.length - 1}
                aria-label={`Move photo ${index + 1} right`}
                className="grid h-7 w-5 place-items-center rounded text-sm text-steel transition hover:bg-canvas hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-25"
              >
                <span aria-hidden="true">→</span>
              </button>
              <button
                type="button"
                onClick={() => void deletePhoto(index)}
                disabled={isBusy}
                aria-label={`Delete photo ${index + 1}`}
                className="grid h-7 w-5 place-items-center rounded text-sm text-steel transition hover:bg-canvas hover:text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal disabled:opacity-25"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </div>
        ))}

        {profile.photos.length < MAX_PHOTOS && (
          <label
            className={`grid h-16 w-16 place-items-center rounded-lg border border-dashed border-hairline-strong bg-canvas text-center text-xs font-medium text-steel transition hover:border-ink hover:text-ink focus-within:outline focus-within:outline-2 focus-within:outline-primary ${
              isBusy ? "cursor-wait opacity-50" : "cursor-pointer"
            }`}
          >
            <span>
              <span aria-hidden="true" className="block text-xl font-light leading-none">+</span>
              <span className="mt-1 block">{busyAction === "upload" ? "Adding…" : "Add"}</span>
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={isBusy}
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void addPhoto(file);
              }}
            />
          </label>
        )}
      </div>

      <p className="mt-3 text-xs leading-5 text-slate">
        JPEG, PNG, or WebP up to 5 MB · {profile.photos.length} of {MAX_PHOTOS}
      </p>
      {error && <p role="alert" className="mt-2 text-xs leading-5 text-signal">{error}</p>}
    </div>
  );
}
