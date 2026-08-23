import "server-only";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    [key: string]: unknown;
  };
}

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "key",
  "authorization",
  "cookie",
  "encryption",
  "content",
  "body",
  // PII and lock secrets that were previously slipping through context
  // objects (lock-service logs, auth flows).
  "email",
  "mail",
  "passcode",
  "pin",
  "proof",
];

/**
 * Strips sensitive keys recursively from metadata before logging.
 */
function sanitizeMetadata(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeMetadata);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEYS.some((sensitive) =>
      key.toLowerCase().includes(sensitive),
    );

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitizeMetadata(value);
    }
  }

  return sanitized;
}

function writeLog(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
  err?: Error,
) {
  const payload: LogPayload = {
    message,
    level,
    timestamp: new Date().toISOString(),
  };

  if (meta) {
    payload.context = sanitizeMetadata(meta) as Record<string, unknown>;
  }

  if (err) {
    payload.error = {
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    };
  }

  if (process.env.NODE_ENV === "production") {
    // Structured JSON logging in production
    console.log(JSON.stringify(payload));
  } else {
    // Beautiful colored logs in development
    const colorMap: Record<LogLevel, string> = {
      debug: "\x1b[36m", // Cyan
      info: "\x1b[32m", // Green
      warn: "\x1b[33m", // Yellow
      error: "\x1b[31m", // Red
    };
    const reset = "\x1b[0m";
    const color = colorMap[level] || reset;

    console.log(
      `[${payload.timestamp}] ${color}${level.toUpperCase()}${reset}: ${message}`,
    );
    if (payload.context && Object.keys(payload.context).length > 0) {
      console.dir(payload.context, { depth: null });
    }
    if (err) {
      console.error(err);
    }
  }
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    writeLog("debug", message, meta);
  },
  info(message: string, meta?: Record<string, unknown>) {
    writeLog("info", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>, err?: Error) {
    writeLog("warn", message, meta, err);
  },
  error(message: string, err?: Error, meta?: Record<string, unknown>) {
    writeLog("error", message, meta, err);
  },
};
