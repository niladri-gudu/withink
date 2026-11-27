import { describe, expect, it } from "vitest";

import {
  mediaUrlVariants,
  scrubDocumentJson,
  scrubHtmlImages,
} from "./media-scrub";

const RELATIVE = "/api/media/dev-journal/u/one.jpg";
const ABSOLUTE = "http://localhost:3000/api/media/dev-journal/u/one.jpg";

function doc(src: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Keep this." }],
      },
      { type: "image", attrs: { src, alt: "one.jpg" } },
    ],
  };
}

describe("scrubHtmlImages", () => {
  it("removes the whole image tag instead of leaving a broken node", () => {
    const html =
      '<p>Keep this.</p><p><img src="/api/media/dev-journal/u/one.jpg" alt="one.jpg"></p>';
    expect(scrubHtmlImages(html, [RELATIVE])).toBe(
      "<p>Keep this.</p><p></p>",
    );
  });

  it("matches the absolute spelling too", () => {
    const html = `<p><img src="${ABSOLUTE}" alt="one.jpg"></p>`;
    expect(scrubHtmlImages(html, mediaUrlVariants(RELATIVE, ABSOLUTE))).toBe(
      "<p></p>",
    );
  });

  it("leaves unrelated images and text untouched", () => {
    const html =
      '<p>Keep</p><img src="/api/media/dev-journal/u/two.jpg" alt="two">';
    expect(scrubHtmlImages(html, [RELATIVE])).toBe(html);
  });
});

describe("scrubDocumentJson", () => {
  it("drops matching image nodes and keeps surrounding content", () => {
    const scrubbed = scrubDocumentJson(doc(RELATIVE), [RELATIVE]) as {
      content: { type: string }[];
    };
    expect(scrubbed.content.map((node) => node.type)).toEqual(["paragraph"]);
  });

  it("matches the absolute spelling", () => {
    const scrubbed = scrubDocumentJson(doc(ABSOLUTE), [
      RELATIVE,
      ABSOLUTE,
    ]) as { content: { type: string }[] };
    expect(scrubbed.content.map((node) => node.type)).toEqual(["paragraph"]);
  });

  it("keeps images that are not part of this deletion", () => {
    const original = doc("/api/media/dev-journal/u/two.jpg");
    expect(scrubDocumentJson(original, [RELATIVE])).toEqual(original);
  });
});
