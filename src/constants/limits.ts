export const LIMITS = {
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 72, // Bcrypt limit safety
  },
  MEDIA: {
    MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB limit
    MAX_STORAGE_PER_USER_BYTES: 50 * 1024 * 1024, // 50MB storage limit
    ALLOWED_MIME_TYPES: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ] as const,
  },
  JOURNAL: {
    MAX_TITLE_LENGTH: 100,
    AUTOSAVE_DELAY_MS: 1500,
    // Allowed days in the past a user can create/backdate an entry
    BACKDATE_GRACE_PERIOD_DAYS: 3,
  },
  FEEDBACK: {
    SUBJECT_MIN_LENGTH: 3,
    SUBJECT_MAX_LENGTH: 120,
    MESSAGE_MIN_LENGTH: 10,
    MESSAGE_MAX_LENGTH: 4000,
    // A generous window that still stops abusive flooding.
    RATE_LIMIT_MAX: 5,
    RATE_LIMIT_WINDOW_SECONDS: 60 * 60, // 1 hour
  },
} as const;

export type Limits = typeof LIMITS;
