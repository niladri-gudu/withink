import { describe, expect, it } from "vitest";
import { ApiError } from "@withink/api-client";

import { API_URL } from "./config";
import { absoluteMediaUrl, isQuotaError } from "./media-url";

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
