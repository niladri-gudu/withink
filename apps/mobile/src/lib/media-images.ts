import { File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { mediaRequestHeaders } from './media-upload';
import { absoluteMediaUrl } from './media-url';

/**
 * Local previews for the editor WebView.
 *
 * Media is served by an authenticated proxy, and a WebView cannot attach the
 * bearer/unlock headers to `<img>` loads. The host downloads each referenced
 * image with those headers, shrinks it for display and hands the editor a
 * data URI. The stored document keeps the canonical URL, so snapshots stay
 * byte-identical to the web editor's.
 */

const PREVIEW_WIDTH = 1200;
const PREVIEW_QUALITY = 0.72;

const previewCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

function cacheKey(url: string): string {
  let hash = 5381;
  for (let index = 0; index < url.length; index += 1) {
    hash = ((hash << 5) + hash + url.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function extensionOf(url: string): string {
  const match = /\.(png|gif|webp|jpe?g)(?:[?#]|$)/i.exec(url);
  return (match?.[1] ?? 'jpg').toLowerCase().replace('jpeg', 'jpg');
}

function dataUriType(extension: string): string {
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

async function readDataUri(fileUri: string, type: string): Promise<string> {
  const base64 = await new File(fileUri).base64();
  return `data:${type};base64,${base64}`;
}

function safeDelete(file: File): void {
  try {
    file.delete();
  } catch {
    // Cache cleanup is best-effort.
  }
}

/**
 * Downloads a private image with the session headers and returns a display
 * data URI. Resolves to null when it cannot be loaded; the editor then keeps
 * its placeholder instead of showing a broken image.
 */
export function loadMediaPreview(url: string): Promise<string | null> {
  const cached = previewCache.get(url);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(url);
  if (pending) return pending;

  const task = (async () => {
    const extension = extensionOf(url);
    const destination = new File(
      Paths.cache,
      `withink-preview-${cacheKey(url)}.${extension}`,
    );
    try {
      // The first request to a cold route can exceed the download client's
      // timeout; one retry turns that into a brief placeholder instead of a
      // broken image.
      for (let attempt = 0; ; attempt += 1) {
        try {
          await File.downloadFileAsync(absoluteMediaUrl(url), destination, {
            headers: mediaRequestHeaders(),
            idempotent: true,
          });
          break;
        } catch (err) {
          if (attempt >= 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }

      let sourceUri = destination.uri;
      let type = dataUriType(extension);
      if (extension !== 'gif') {
        const resized = await manipulateAsync(
          sourceUri,
          [{ resize: { width: PREVIEW_WIDTH } }],
          { compress: PREVIEW_QUALITY, format: SaveFormat.JPEG },
        );
        sourceUri = resized.uri;
        type = 'image/jpeg';
      }

      const dataUri = await readDataUri(sourceUri, type);
      previewCache.set(url, dataUri);
      return dataUri;
    } catch {
      return null;
    } finally {
      inFlight.delete(url);
      if (extension !== 'gif') safeDelete(destination);
    }
  })();

  inFlight.set(url, task);
  return task;
}

/** Display data URI for an image picked on this device (no upload needed). */
export async function localImagePreview(uri: string): Promise<string | null> {
  try {
    const resized = await manipulateAsync(
      uri,
      [{ resize: { width: PREVIEW_WIDTH } }],
      { compress: PREVIEW_QUALITY, format: SaveFormat.JPEG },
    );
    return await readDataUri(resized.uri, 'image/jpeg');
  } catch {
    return null;
  }
}
