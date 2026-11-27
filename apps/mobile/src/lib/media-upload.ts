import {
  MEDIA_ALLOWED_TYPES,
  MEDIA_MAX_FILE_BYTES,
  UNLOCK_HEADER_NAME,
  type MediaFolder,
} from '@withink/contracts';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { createDiaryClient } from './api';
import { getSessionToken } from './auth-client';
import { getUnlockToken } from './session-state';

export { absoluteMediaUrl, isQuotaError } from './media-url';

type AllowedContentType = (typeof MEDIA_ALLOWED_TYPES)[number];

function asAllowedContentType(value: string): AllowedContentType {
  return (MEDIA_ALLOWED_TYPES as readonly string[]).includes(value)
    ? (value as AllowedContentType)
    : 'image/jpeg';
}

const MAX_DIMENSION = 1600;

export interface LocalImage {
  uri: string;
  fileName: string;
  contentType: string;
}

function inferContentType(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase();
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

/** Opens the photo library; returns null when the user cancels. */
export async function pickImageFromLibrary(): Promise<LocalImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo access is required to add an image.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    exif: false,
    quality: 1,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0]!;
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? `image-${Date.now()}.jpg`,
    contentType: asset.mimeType ?? inferContentType(asset.uri),
  };
}

/**
 * Shrinks the image to the editorial bound (1600px, 80% JPEG) the way the web
 * does before upload. GIFs pass through untouched so animation survives.
 */
export async function prepareImage(image: LocalImage): Promise<LocalImage> {
  if (image.contentType === 'image/gif') return image;
  const result = await manipulateAsync(
    image.uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: 0.8, format: SaveFormat.JPEG },
  );
  return {
    uri: result.uri,
    fileName: image.fileName.replace(/\.[^.]+$/, '') + '.jpg',
    contentType: 'image/jpeg',
  };
}

/** Headers a native image loader must send for private media. */
export function mediaRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const session = getSessionToken();
  if (session) headers.Authorization = `Bearer ${session}`;
  const unlock = getUnlockToken();
  if (unlock) headers[UNLOCK_HEADER_NAME] = unlock;
  return headers;
}

export interface UploadedMedia {
  /** Canonical, origin-relative proxy path stored in entry content. */
  url: string;
  key: string;
}

/**
 * Presign + PUT one image. The stored URL stays origin-relative for parity
 * with the web; readers resolve it through the authenticated media proxy.
 */
export async function uploadImage(
  image: LocalImage,
  folder: MediaFolder = 'journal',
): Promise<UploadedMedia> {
  const blob = await (await fetch(image.uri)).blob();
  if (blob.size > MEDIA_MAX_FILE_BYTES) {
    throw new Error('Images must be 5 MB or smaller.');
  }

  const contentType = asAllowedContentType(image.contentType);
  const api = createDiaryClient();
  const presigned = await api.createMediaUpload({
    filename: image.fileName,
    contentType,
    size: blob.size,
    folder,
  });

  const uploaded = await fetch(presigned.presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!uploaded.ok) {
    throw new Error('The image could not be uploaded. Please try again.');
  }

  const key = presigned.publicUrl.includes('/api/media/')
    ? presigned.publicUrl.split('/api/media/')[1] ?? ''
    : '';
  return { url: presigned.publicUrl, key };
}
