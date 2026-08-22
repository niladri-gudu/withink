// Deterministic content generator for seed entries. Each entry is composed of a
// title, several long paragraphs (plain text + HTML), a Tiptap JSON doc, a word
// count, and a mood, varied by index so 120 entries look realistic.

const THEMES = [
  "Rain and the long walk home",
  "A quiet morning with tea",
  "The art of slowing down",
  "Notes from a busy Tuesday",
  "Golden hour in the park",
  "Letters from an old box",
  "Learning to keep ordinary days",
  "The train, the platform, the crowd",
  "A chapter before bed",
  "Small acts of connection",
  "Cooking, finally, for myself",
  "The garden after the storm",
];

const OPENERS = [
  "This morning started with rain tapping the window. I made tea and sat with the kettle's hum before checking anything else. It felt good to let the day arrive instead of chasing it.",
  "I woke before the alarm and stayed in bed watching the light change through the curtains. There is a version of the day that belongs only to early risers, and today I had it to myself.",
  "Today was one of those days that does not announce itself. It simply arrived, ordinary and unhurried, and I decided to meet it at its own pace instead of forcing a shape on it.",
];

const MIDDLES = [
  "I took the long way home through the park. The light was doing that soft gold thing it only does in late afternoon. I noticed three new benches, a heron, and that my shoulders had been tensed all day without me knowing.",
  "Work was a blur of calls and small fires. I wrote down the one thing that mattered at the end, which turned out to be a note to myself about slowing down. Tomorrow I am going to leave the office at six and mean it.",
  "A friend called today just to say they were thinking of me. We laughed about something small and it carried me through the afternoon. I am learning that connection is a practice, not a given.",
  "I finally cleared the old box of letters from under the desk. Reading them felt like visiting a younger version of myself. I kept two and recycled the rest. Letting go can be its own kind of writing.",
  "The train was late and I stood on the platform watching strangers. Everyone seemed to be carrying a story they were not telling. I wondered what mine looked like from the outside, and decided I liked the mystery of it.",
  "I spent the afternoon in the kitchen with the radio on. Chopping vegetables, waiting for water to boil, forgetting half the ingredients and improvising the rest. The meal was imperfect and that was the best part.",
];

const CLOSERS = [
  "There is a particular silence after dinner when the house settles. I lit a candle, opened my notebook, and let the day spill out. Writing it down always makes the noise quieter.",
  "I read a chapter before bed and underlined a sentence about memory. It said we keep what we attend to. I want to attend to the ordinary things more — the coffee, the walk, the good text from a friend.",
  "Tomorrow I will try to remember that most days do not need to be spectacular. They only need to be lived, and noticed, and written down before they slip away. That feels like enough.",
  "I am trying to be gentler with myself about the unfinished things. Some pages close, some stay open for years, and both are okay. Tonight I am grateful for the ones that felt finished.",
];

const MOODS = [1, 2, 3, 4, 5, 4, 3, 2, 4, 5, 3, 4, 2, 4, 5, 3, 1, 4, 3, 5];

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeEntry(index, dateStr) {
  const theme = THEMES[index % THEMES.length];
  const opener = OPENERS[index % OPENERS.length];
  const mid1 = MIDDLES[index % MIDDLES.length];
  const mid2 = MIDDLES[(index + 3) % MIDDLES.length];
  const closer = CLOSERS[index % CLOSERS.length];

  const title = `${theme} — ${dateStr}`;

  // ~6 paragraphs of plain text.
  const paragraphs = [opener, mid1, mid2, mid1, opener, closer];
  const contentText = paragraphs.join("\n\n");

  const htmlParagraphs = [
    opener,
    mid1,
    `It is strange how <strong>${mid2.split(" ").slice(0, 8).join(" ")}</strong> can settle the whole afternoon.`,
    mid2,
    opener,
    closer,
  ];
  const contentHtml = htmlParagraphs
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("\n");

  const contentJson = JSON.stringify({
    type: "doc",
    content: paragraphs.map((p) => ({
      type: "paragraph",
      content: [{ type: "text", text: p }],
    })),
  });

  return {
    title,
    contentText,
    contentHtml,
    contentJson,
    wordCount: wordCount(contentText),
    mood: MOODS[index % MOODS.length],
  };
}

module.exports = { makeEntry };