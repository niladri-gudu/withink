import { describe, expect, it } from "vitest";

import {
  indexArchiveEntries,
  isArchiveCiphertext,
  parseArchiveEntryText,
  parseArchiveMetadata,
} from "./archive";

describe("indexArchiveEntries", () => {
  it("groups html and txt by date and ignores foreign paths", () => {
    const entries = indexArchiveEntries([
      "README.txt",
      "entries/2026/November/2026-11-01.html",
      "entries/2026/November/2026-11-01.txt",
      "entries/2025/December/2025-12-31.txt",
    ]);

    expect(entries).toEqual([
      { date: "2025-12-31", txtPath: "entries/2025/December/2025-12-31.txt" },
      {
        date: "2026-11-01",
        htmlPath: "entries/2026/November/2026-11-01.html",
        txtPath: "entries/2026/November/2026-11-01.txt",
      },
    ]);
  });
});

describe("parseArchiveMetadata", () => {
  it("reads the array form", () => {
    const meta = parseArchiveMetadata(
      JSON.stringify([
        { date: "2026-11-01", title: "First", mood: 4 },
        { title: "No date" },
      ]),
    );
    expect(meta).toEqual({
      "2026-11-01": { date: "2026-11-01", title: "First", mood: 4 },
    });
  });

  it("reads the date-keyed object form", () => {
    expect(
      parseArchiveMetadata(
        JSON.stringify({ "2026-11-01": { title: "First", wordCount: 3 } }),
      ),
    ).toEqual({ "2026-11-01": { title: "First", wordCount: 3 } });
  });

  it("returns an empty map for malformed JSON", () => {
    expect(parseArchiveMetadata("{not json")).toEqual({});
  });
});

describe("parseArchiveEntryText", () => {
  it("strips the TITLE header and blank line", () => {
    expect(
      parseArchiveEntryText("TITLE: Morning pages\n\nToday I wrote.\n"),
    ).toEqual({ headerTitle: "Morning pages", text: "Today I wrote.\n" });
  });

  it("keeps body-only files intact", () => {
    expect(parseArchiveEntryText("Just the body.")).toEqual({
      headerTitle: "",
      text: "Just the body.",
    });
  });
});

describe("isArchiveCiphertext", () => {
  it("flags ciphertext fields and passes plain text", () => {
    const cipher = `${"a".repeat(24)}:${"b".repeat(32)}`;
    expect(
      isArchiveCiphertext({ title: cipher, text: "", html: "" }),
    ).toBe(true);
    expect(
      isArchiveCiphertext({ title: "Morning", text: "Body", html: "<p>Body</p>" }),
    ).toBe(false);
  });
});
