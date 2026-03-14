import { getBlob } from './db-operations';

const urlCache = new Map<string, string>();

// Version counter per blobId — incremented when blob data changes
const blobVersions = new Map<string, number>();
// Listeners that get called when a blob is invalidated
const invalidationListeners = new Set<(blobId: string) => void>();

export function getVideoDimensions(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth || 640,
        height: video.videoHeight || 360,
        duration: video.duration || 0,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      resolve({ width: 640, height: 360, duration: 0 });
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}

export function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 400, height: 300 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export async function getBlobUrl(blobId: string): Promise<string | null> {
  const cached = urlCache.get(blobId);
  if (cached) return cached;

  const blob = await getBlob(blobId);
  if (!blob) return null;

  const url = URL.createObjectURL(blob);
  urlCache.set(blobId, url);
  return url;
}

export function revokeBlobUrl(blobId: string) {
  const url = urlCache.get(blobId);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(blobId);
  }
  // Bump version and notify listeners so useBlobUrl re-fetches
  blobVersions.set(blobId, (blobVersions.get(blobId) ?? 0) + 1);
  invalidationListeners.forEach(fn => fn(blobId));
}

export function getCachedBlobUrl(blobId: string): string | null {
  return urlCache.get(blobId) ?? null;
}

export function getBlobVersion(blobId: string): number {
  return blobVersions.get(blobId) ?? 0;
}

export function onBlobInvalidated(fn: (blobId: string) => void): () => void {
  invalidationListeners.add(fn);
  return () => invalidationListeners.delete(fn);
}
