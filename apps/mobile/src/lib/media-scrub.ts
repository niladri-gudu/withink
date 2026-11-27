const IMAGE_TAG_PATTERN = /<img\b[^>]*>/gi;

function matchesAny(value: unknown, urls: readonly string[]): boolean {
  if (typeof value !== "string") return false;
  return urls.some((url) => url.length > 0 && value.includes(url));
}

/**
 * Removes image elements whose source points at one of the given URLs.
 * URL-only replacement leaves a broken image node behind, so the whole tag is
 * dropped instead.
 */
export function scrubHtmlImages(
  html: string,
  urls: readonly string[],
): string {
  if (!html || urls.length === 0) return html;
  return html.replace(IMAGE_TAG_PATTERN, (tag) =>
    matchesAny(tag, urls) ? "" : tag,
  );
}

/** TipTap document JSON with the matching image nodes removed. */
export function scrubDocumentJson(
  value: unknown,
  urls: readonly string[],
): unknown {
  if (urls.length === 0) return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => scrubDocumentJson(item, urls))
      .filter(
        (item) =>
          !(
            item &&
            typeof item === "object" &&
            (item as { type?: unknown }).type === "image" &&
            matchesAny(
              (item as { attrs?: { src?: unknown } }).attrs?.src,
              urls,
            )
          ),
      );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        scrubDocumentJson(item, urls),
      ]),
    );
  }
  return value;
}

/** Both spellings of a stored media URL that entry content may contain. */
export function mediaUrlVariants(
  url: string,
  absoluteUrl: string,
): string[] {
  return Array.from(new Set([url, absoluteUrl].filter(Boolean)));
}
