import "server-only";

/**
 * Bounded request-body readers for App Router handlers.
 *
 * Next.js caps Server Action bodies (1 MB by default) but places no limit on
 * route handlers, and `request.text()` / `request.json()` buffer the entire
 * body before any check can run. These helpers reject on the declared
 * Content-Length and again while streaming, so an oversized body is never
 * fully materialised in memory.
 */

export class BodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the allowed size.");
    this.name = "BodyTooLargeError";
  }
}

/** Reads the body as UTF-8 text, aborting once `maxBytes` is exceeded. */
export async function readTextBody(
  request: Request,
  maxBytes: number,
): Promise<string> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new BodyTooLargeError();
  }

  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new BodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Already released/cancelled.
    }
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** Reads and parses a JSON body within the same byte budget. */
export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  const text = await readTextBody(request, maxBytes);
  if (!text) return null;
  return JSON.parse(text);
}
