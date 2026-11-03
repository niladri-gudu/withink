/**
 * Privacy guard for error reports. Withink is a private diary — monitoring
 * products must never receive journal content, credentials, or keys.
 *
 * Deliberately dependency-free so the same module runs in the browser, Node,
 * and the edge runtime.
 */

const REDACTED = "[REDACTED]";

/** Key fragments that never belong in an error report. */
const SENSITIVE_KEY =
  /(passcode|password|secret|token|authorization|cookie|content|title|body|payload|master.?key|derived.?key|private.?key|unlock.?proof|verification.?ciphertext|salt|email|username|display.?name)/i;

/** Whole-object keys with diary entities — never serialize those. */
const SENSITIVE_EXACT = new Set(["entry", "entries", "letter", "letters"]);

/** Breadcrumb categories dropped entirely: they capture typed/pasted text. */
const DROPPED_BREADCRUMB_CATEGORIES = new Set([
  "console",
  "ui.click",
  "ui.input",
  "ui.render",
]);

const MAX_TEXT_LENGTH = 2_000;
const MAX_DEPTH = 8;
const MAX_ARRAY_ITEMS = 50;

interface SentryEventLike {
  message?: string;
  request?: { url?: string; method?: string; [key: string]: unknown };
  user?: Record<string, unknown>;
  exception?: {
    values?: Array<{ value?: string; [key: string]: unknown }>;
  };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
}

interface BreadcrumbLike {
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function scrubText(text: string): string {
  return text
    .replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      "[REDACTED_EMAIL]",
    )
    .replace(
      /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
      "[REDACTED_UUID]",
    )
    .replace(/\b[0-9a-fA-F]{64}\b/g, "[REDACTED_HEX_64]")
    .replace(/\b[0-9a-fA-F]{32}\b/g, "[REDACTED_HEX_32]")
    .slice(0, MAX_TEXT_LENGTH);
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[REDACTED_DEPTH]";
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => scrubValue(item, depth + 1));
  }
  if (isPlainObject(value)) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      sanitized[key] =
        SENSITIVE_EXACT.has(key.toLowerCase()) || SENSITIVE_KEY.test(key)
          ? REDACTED
          : scrubValue(item, depth + 1);
    }
    return sanitized;
  }
  return value;
}

/**
 * Scrubs a Sentry event (or transaction) before it leaves the process.
 * Request payloads are deleted outright rather than inspected: server actions
 * can carry journal content, and a name-based allowlist is safer than a filter.
 */
export function scrubSentryEvent<T>(event: T): T {
  if (!event || typeof event !== "object") return event;
  const safe = event as unknown as SentryEventLike;

  if (safe.request) {
    const { url, method } = safe.request;
    safe.request = {};
    if (typeof url === "string") safe.request.url = url.split("?")[0];
    if (typeof method === "string") safe.request.method = method;
  }

  if (safe.user) {
    safe.user = typeof safe.user.id === "string" ? { id: safe.user.id } : {};
  }

  if (typeof safe.message === "string") {
    safe.message = scrubText(safe.message);
  }

  if (safe.exception?.values) {
    safe.exception.values = safe.exception.values.map((value) => ({
      ...value,
      value:
        typeof value.value === "string" ? scrubText(value.value) : value.value,
    }));
  }

  if (safe.extra) safe.extra = scrubValue(safe.extra) as Record<string, unknown>;
  if (safe.contexts) {
    safe.contexts = scrubValue(safe.contexts) as Record<string, unknown>;
  }
  if (safe.tags) safe.tags = scrubValue(safe.tags) as Record<string, unknown>;

  return event;
}

/** Scrubs a breadcrumb, or drops it when it could contain user input. */
export function scrubSentryBreadcrumb<T>(breadcrumb: T): T | null {
  if (!breadcrumb || typeof breadcrumb !== "object") return breadcrumb;
  const safe = breadcrumb as unknown as BreadcrumbLike;

  if (
    typeof safe.category === "string" &&
    DROPPED_BREADCRUMB_CATEGORIES.has(safe.category)
  ) {
    return null;
  }

  if (typeof safe.message === "string") {
    safe.message = scrubText(safe.message);
  }
  if (safe.data) safe.data = scrubValue(safe.data) as Record<string, unknown>;

  return breadcrumb;
}
