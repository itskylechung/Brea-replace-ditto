import { describe, expect, it } from "vitest";
import { parseProfilePhotos } from "./api";

describe("parseProfilePhotos", () => {
  it("keeps ordered photo records with non-empty URLs and keys", () => {
    expect(parseProfilePhotos([
      { url: " https://example.com/one.jpg ", key: " user/one.jpg " },
      { url: "https://example.com/two.webp", key: "user/two.webp" },
    ])).toEqual([
      { url: "https://example.com/one.jpg", key: "user/one.jpg" },
      { url: "https://example.com/two.webp", key: "user/two.webp" },
    ]);
  });

  it.each([null, undefined, "photos", {}, 42])("returns an empty list for %p", (value) => {
    expect(parseProfilePhotos(value)).toEqual([]);
  });

  it("drops malformed entries", () => {
    expect(parseProfilePhotos([
      null,
      "photo",
      { url: "", key: "user/empty.jpg" },
      { url: "https://example.com/missing-key.jpg" },
      { url: "https://example.com/valid.png", key: "user/valid.png" },
    ])).toEqual([
      { url: "https://example.com/valid.png", key: "user/valid.png" },
    ]);
  });

  it("caps the parsed gallery at six photos", () => {
    const photos = Array.from({ length: 8 }, (_, index) => ({
      url: `https://example.com/${index}.jpg`,
      key: `user/${index}.jpg`,
    }));

    expect(parseProfilePhotos(photos)).toEqual(photos.slice(0, 6));
  });
});
