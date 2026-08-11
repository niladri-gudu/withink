// Hardware-accelerated client-side image compression utility using Web Workers and Canvas fallbacks

const workerCode = `
  self.onmessage = async (e) => {
    const { id, file, maxWidth, maxHeight, quality } = e.data;
    try {
      if (typeof OffscreenCanvas === "undefined") {
        throw new Error("OffscreenCanvas is not supported in this environment");
      }

      // 1. Load image using createImageBitmap (runs off-thread)
      const bitmap = await createImageBitmap(file);

      // 2. Calculate scale factors
      let width = bitmap.width;
      let height = bitmap.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      // 3. Setup Canvas & Draw
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get 2D OffscreenContext");
      }

      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close(); // free memory

      // 4. Export as WebP
      const compressedBlob = await canvas.convertToBlob({
        type: "image/webp",
        quality: quality
      });

      self.postMessage({ id, success: true, blob: compressedBlob });
    } catch (err) {
      self.postMessage({ id, success: false, error: err.message || "Compression error" });
    }
  };
`;

let workerInstance: Worker | null = null;
const pendingPromises = new Map<
  string,
  { resolve: (blob: Blob) => void; reject: (err: Error) => void }
>();
let messageCounter = 0;

function getWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  if (!workerInstance) {
    try {
      const blob = new Blob([workerCode], { type: "application/javascript" });
      workerInstance = new Worker(URL.createObjectURL(blob));
      workerInstance.onmessage = (e) => {
        const { id, success, blob: compressedBlob, error } = e.data;
        const promise = pendingPromises.get(id);
        if (promise) {
          pendingPromises.delete(id);
          if (success && compressedBlob) {
            promise.resolve(compressedBlob);
          } else {
            promise.reject(new Error(error || "Worker compression failed"));
          }
        }
      };
    } catch (err) {
      console.warn("Failed to initialize image-compressor Web Worker:", err);
      return null;
    }
  }
  return workerInstance;
}

/**
 * Fallback compression running on the main browser thread
 */
async function compressMainThread(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get 2D context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas toBlob yielded null"));
          }
        },
        "image/webp",
        quality,
      );
    };
    img.onerror = () =>
      reject(new Error("Failed to load image on main thread"));
  });
}

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Compresses an image client-side to WebP using Web Workers & OffscreenCanvas.
 * Falls back to main thread canvas resizing if workers are not supported.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const maxWidth = options.maxWidth ?? 1600;
  const maxHeight = options.maxHeight ?? 1600;
  const quality = options.quality ?? 0.8;

  // Only compress JPEGs, PNGs, and WebPs. Don't touch animated GIFs or SVGs
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return file;
  }

  try {
    const worker = getWorker();
    let blob: Blob;

    if (worker && typeof OffscreenCanvas !== "undefined") {
      // Compress in worker thread
      messageCounter++;
      const id = `img-msg-${messageCounter}`;

      blob = await new Promise<Blob>((resolve, reject) => {
        pendingPromises.set(id, { resolve, reject });
        worker.postMessage({ id, file, maxWidth, maxHeight, quality });
      });
    } else {
      // Main thread fallback
      blob = await compressMainThread(file, maxWidth, maxHeight, quality);
    }

    // Rename file extension to .webp
    const originalName = file.name;
    const baseName =
      originalName.substring(0, originalName.lastIndexOf(".")) || originalName;
    const webpName = `${baseName}.webp`;

    return new File([blob], webpName, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.error("Image compression failed, uploading original:", err);
    return file; // Return original on any error
  }
}
