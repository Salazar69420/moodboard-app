import { getBlobUrl } from './image';

export async function downloadMedia(blobId: string, filename: string): Promise<void> {
  const url = await getBlobUrl(blobId);
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
