import { useState, useEffect } from 'react';
import { getBlobUrl, getCachedBlobUrl, getBlobVersion, onBlobInvalidated } from '../utils/image';

export function useBlobUrl(blobId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(
    blobId ? getCachedBlobUrl(blobId) : null
  );
  const [version, setVersion] = useState(() => blobId ? getBlobVersion(blobId) : 0);

  // Listen for blob invalidations (e.g. after crop replaces blob data)
  useEffect(() => {
    if (!blobId) return;
    const unsub = onBlobInvalidated((invalidatedId) => {
      if (invalidatedId === blobId) {
        setVersion(getBlobVersion(blobId));
      }
    });
    return unsub;
  }, [blobId]);

  // Fetch blob URL when blobId or version changes
  useEffect(() => {
    if (!blobId) {
      setUrl(null);
      return;
    }

    const cached = getCachedBlobUrl(blobId);
    if (cached) {
      setUrl(cached);
      return;
    }

    let cancelled = false;
    getBlobUrl(blobId).then((result) => {
      if (!cancelled) setUrl(result);
    });

    return () => {
      cancelled = true;
    };
  }, [blobId, version]);

  return url;
}
