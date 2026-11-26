import { writeFileSync } from "node:fs";
import path from "node:path";
import type { Content } from "@tiptap/core";
import { beforeAll, describe, expect, it } from "vitest";

import { createEditorInstance, serializeEditor } from "./editor-core";
import { EDITOR_FIXTURES } from "./fixtures";
import committedGoldens from "./fixtures.golden.json";

interface Golden {
  html: string;
  text: string;
  json: unknown;
}

const committed = committedGoldens as Record<string, Golden>;
const UPDATE = process.env.UPDATE_FIXTURES === "1";

function serialize(content: Content) {
  const element = document.createElement("div");
  document.body.appendChild(element);
  const editor = createEditorInstance({ element, content });
  try {
    return serializeEditor(editor);
  } finally {
    editor.destroy();
    element.remove();
  }
}

const results: Record<string, Golden> = {};
const roundTrip: Record<string, string> = {};

describe("editor parity fixtures", () => {
  beforeAll(() => {
    for (const fixture of EDITOR_FIXTURES) {
      const snapshot = serialize(fixture.html);
      results[fixture.name] = {
        html: snapshot.html,
        text: snapshot.text,
        json: snapshot.json,
      };
      roundTrip[fixture.name] = serialize(snapshot.json as Content).html;
    }

    if (UPDATE) {
      writeFileSync(
        path.resolve(process.cwd(), "src/fixtures.golden.json"),
        `${JSON.stringify(results, null, 2)}\n`,
      );
      // The imported module still holds the previous file contents; use the
      // freshly computed values so an update run also verifies itself.
      Object.assign(committed, results);
    }
  });

  it("has a golden for every fixture", () => {
    expect(Object.keys(committed).sort()).toEqual(
      EDITOR_FIXTURES.map((fixture) => fixture.name).sort(),
    );
  });

  it.each(EDITOR_FIXTURES)("normalizes $name identically", ({ name }) => {
    expect(results[name]).toEqual(committed[name]);
  });

  it.each(EDITOR_FIXTURES)("round-trips $name through JSON", ({ name }) => {
    expect(roundTrip[name]).toBe(results[name]?.html);
  });

  it("stores a blank document as an empty snapshot", () => {
    const empty = serialize("<p></p>");
    expect(empty.html).toBe("");
    expect(empty.text).toBe("");
    expect(empty.wordCount).toBe(0);
    expect(serialize("").html).toBe("");
  });
});
