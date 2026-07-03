export const EDITOR_CONFIG = {
  PLACEHOLDERS: [
    "How was your day? Write it down...",
    "What's on your mind right now?",
    "Capture a moment that made you smile today...",
    "Reflect on a challenge you faced and how you handled it...",
    "What are three things you're grateful for today?",
  ] as const,
  AUTOSAVE_INDICATORS: {
    SAVING: "Saving changes...",
    SAVED: "Saved to your sanctuary",
    ERROR: "Failed to save. Retrying...",
    OFFLINE: "Offline. Saving locally...",
  } as const,
  FORMATTING: {
    MAX_HEADING_LEVEL: 3,
  } as const,
};

export type EditorConfig = typeof EDITOR_CONFIG;
