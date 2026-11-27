import { describe, expect, it } from "vitest";
import { ApiError } from "@withink/api-client";

import { API_URL } from "./config";
import {
  absoluteMediaUrl,
  collectMediaSources,
  isQuotaError,
} from "./media-url";

describe("media URLs", () => {
  it("resolves an origin-relative proxy path against the API origin", () => {
    expect(absoluteMediaUrl("/api/media/dev-journal/u/1.webp")).toBe(
      `${API_URL}/api/media/dev-journal/u/1.webp`,
    );
  });

  it("leaves absolute URLs untouched", () => {
    expect(absoluteMediaUrl("https://assets.withink.me/a.webp")).toBe(
      "https://assets.withink.me/a.webp",
    );
  });
});

describe("collectMediaSources", () => {
  const one = "/api/media/dev-journal/u/one.jpg";
  const two = "/api/media/dev-journal/u/two.webp";

  it("finds private images in HTML and document JSON without duplicates", () => {
    const html = `<p>x</p><img src="${one}" alt="one"><img src="https://cdn.example.com/a.jpg">`;
    const json = {
      type: "doc",
      content: [
        { type: "image", attrs: { src: one } },
        { type: "image", attrs: { src: two } },
      ],
    };
    expect(collectMediaSources(html, json).sort()).toEqual([one, two].sort());
  });

  it("accepts absolute URLs that still point at the media proxy", () => {
    expect(
      collectMediaSources(
        `<img src="${API_URL}${two}">`,
        null,
      ),
    ).toEqual([`${API_URL}${two}`]);
  });

  it("ignores entries without private media", () => {
    expect(collectMediaSources("<p>No images</p>", { type: "doc" })).toEqual(
      [],
    );
    expect(collectMediaSources("", null)).toEqual([]);
  });
});

describe("isQuotaError", () => {
  it("recognises the 507 upload failure", () => {
    expect(isQuotaError(new ApiError(507, "Storage quota exceeded"))).toBe(
      true,
    );
  });

  it("recognises the shared code on other statuses", () => {
    expect(
      isQuotaError(
        new ApiError(422, "Storage quota exceeded", "storage_quota_exceeded"),
      ),
    ).toBe(true);
  });

  it("ignores unrelated failures", () => {
    expect(isQuotaError(new ApiError(500, "Boom"))).toBe(false);
    expect(isQuotaError(new Error("network"))).toBe(false);
  });
});
