/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import JSZip from "jszip";
import { ExportService } from "./export-service";
import { JournalService } from "@/features/journal/services/journal-service";
import { r2 } from "@/lib/r2";

// R2_PUBLIC_URL is mocked to "http://localhost:3000/r2" in vitest.setup.ts
const PUBLIC_BASE = "http://localhost:3000/r2";
const INTERNAL_IMAGE_KEY = "dev-journal/user-1/photo.jpg";
const IMAGE_BYTES = new Uint8Array([1, 2, 3, 4]);

vi.mock("@/lib/r2", () => ({
  r2: { send: vi.fn() },
}));

vi.mock("@/features/journal/services/journal-service", () => ({
  JournalService: {
    getAllEntriesForExport: vi.fn(),
  },
}));

function makeEntry(overrides: Partial<any> = {}): any {
  return {
    id: "id",
    userId: "user-1",
    date: "2024-03-15",
    title: "Spring Day",
    contentText: "It was warm.",
    contentHtml: "<p>It was warm.</p>",
    contentJson: { type: "doc", content: [] },
    wordCount: 3,
    mood: 4,
    createdAt: new Date("2024-03-15T10:00:00Z"),
    updatedAt: new Date("2024-03-15T10:00:00Z"),
    ...overrides,
  };
}

describe("ExportService.generateExportZip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (r2.send as any).mockResolvedValue({
      Body: { transformToByteArray: async () => IMAGE_BYTES },
    });
  });

  it("builds a full backup with metadata, txt, html, and images", async () => {
    const entryWithImage = makeEntry({
      contentHtml: `<p>Look</p><img src="${PUBLIC_BASE}/${INTERNAL_IMAGE_KEY}" />`,
      contentJson: {
        type: "doc",
        content: [{ type: "image", attrs: { src: `${PUBLIC_BASE}/${INTERNAL_IMAGE_KEY}` } }],
      },
    });
    const entryNoTitle = makeEntry({
      date: "2023-12-25",
      title: "",
      contentText: "Quiet.",
      contentHtml: "<p>Quiet.</p>",
      contentJson: { type: "doc", content: [] },
      mood: null,
    });

    (JournalService.getAllEntriesForExport as any).mockResolvedValue([
      entryWithImage,
      entryNoTitle,
    ]);

    const bytes = await ExportService.generateExportZip("user-1");
    const zip = await JSZip.loadAsync(bytes);

    // README present
    expect(zip.file("README.txt")).not.toBeNull();

    // Metadata is clean (no encrypted / rendered fields)
    const metaRaw = await zip.file("metadata.json")!.async("string");
    const meta = JSON.parse(metaRaw);
    expect(meta).toHaveLength(2);
    expect(meta[0]).toMatchObject({ date: "2024-03-15", title: "Spring Day", mood: 4, wordCount: 3 });
    expect(meta[0]).not.toHaveProperty("contentHtml");
    expect(meta[0]).not.toHaveProperty("contentText");

    // Plain text + HTML, organized by year/month
    const txt = await zip.file("entries/2024/March/2024-03-15.txt")!.async("string");
    expect(txt).toContain("TITLE: Spring Day");
    expect(txt).toContain("It was warm.");

    const html = await zip.file("entries/2024/March/2024-03-15.html")!.async("string");
    expect(html).toContain("Spring Day");

    // Empty title falls back to "Untitled"
    const txt2 = await zip.file("entries/2023/December/2023-12-25.txt")!.async("string");
    expect(txt2).toContain("TITLE: Untitled");

    // Image saved once, fetched from R2 by derived key
    const img = zip.file("images/photo.jpg");
    expect(img).not.toBeNull();
    expect(r2.send).toHaveBeenCalledTimes(1);
    expect((r2.send as any).mock.calls[0][0].input.Key).toBe(INTERNAL_IMAGE_KEY);
  });

  it("ignores images that are not hosted on our own bucket", async () => {
    (JournalService.getAllEntriesForExport as any).mockResolvedValue([
      makeEntry({
        contentHtml: `<img src="https://evil.example.com/steal.png" />`,
        contentJson: { type: "doc", content: [] },
      }),
    ]);

    const bytes = await ExportService.generateExportZip("user-1");
    const zip = await JSZip.loadAsync(bytes);

    // No external fetch, no image files written
    expect(r2.send).not.toHaveBeenCalled();
    const imageFiles = Object.keys(zip.files).filter(
      (name) => name.startsWith("images/") && !zip.files[name]!.dir,
    );
    expect(imageFiles).toHaveLength(0);
  });

  it("dedupes an image referenced by multiple entries", async () => {
    const src = `${PUBLIC_BASE}/${INTERNAL_IMAGE_KEY}`;
    (JournalService.getAllEntriesForExport as any).mockResolvedValue([
      makeEntry({ date: "2024-03-15", contentHtml: `<img src="${src}" />`, contentJson: {} }),
      makeEntry({ date: "2024-03-16", contentHtml: `<img src="${src}" />`, contentJson: {} }),
    ]);

    const bytes = await ExportService.generateExportZip("user-1");
    await JSZip.loadAsync(bytes);

    expect(r2.send).toHaveBeenCalledTimes(1);
  });

  it("produces a valid archive for an empty journal", async () => {
    (JournalService.getAllEntriesForExport as any).mockResolvedValue([]);

    const bytes = await ExportService.generateExportZip("user-1");
    const zip = await JSZip.loadAsync(bytes);

    expect(zip.file("README.txt")).not.toBeNull();
    const meta = JSON.parse(await zip.file("metadata.json")!.async("string"));
    expect(meta).toEqual([]);
    expect(r2.send).not.toHaveBeenCalled();
  });

  it("still completes the export when an image cannot be fetched", async () => {
    (r2.send as any).mockRejectedValue(new Error("R2 unavailable"));
    (JournalService.getAllEntriesForExport as any).mockResolvedValue([
      makeEntry({
        contentHtml: `<img src="${PUBLIC_BASE}/${INTERNAL_IMAGE_KEY}" />`,
        contentJson: {},
      }),
    ]);

    const bytes = await ExportService.generateExportZip("user-1");
    const zip = await JSZip.loadAsync(bytes);

    // Text still written; missing image simply omitted
    expect(zip.file("entries/2024/March/2024-03-15.txt")).not.toBeNull();
    expect(zip.file("images/photo.jpg")).toBeNull();
  });
});
