import { nanoid } from 'nanoid';
import type { BoardImage } from '../types';
import { getImageDimensions, getVideoDimensions } from './image';
import { storeImage, storeBlob } from './db-operations';
import { useImageStore } from '../stores/useImageStore';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';

export async function importImageFiles(
  files: FileList | File[],
  projectId: string,
  startX = 200,
  startY = 200,
) {
  const arr = Array.from(files).filter(
    f => f.type.startsWith('image/') || f.type.startsWith('video/')
  );
  if (arr.length === 0) return 0;

  let imageCount = 0;
  let videoCount = 0;
  let offsetIndex = 0;

  for (const file of arr) {
    const isVideo = file.type.startsWith('video/');
    const imageId = nanoid();
    const blobId = nanoid();
    const x = startX + offsetIndex * 30;
    const y = startY + offsetIndex * 30;
    offsetIndex++;

    let width: number, height: number, duration: number | undefined;
    if (isVideo) {
      const dims = await getVideoDimensions(file);
      width = dims.width;
      height = dims.height;
      duration = dims.duration;
      videoCount++;
    } else {
      const dims = await getImageDimensions(file);
      width = dims.width;
      height = dims.height;
      imageCount++;
    }

    const boardImage: BoardImage = {
      id: imageId,
      projectId,
      blobId,
      filename: file.name || `${isVideo ? 'video' : 'image'}-${Date.now()}`,
      mimeType: file.type,
      width,
      height,
      x,
      y,
      label: '',
      createdAt: Date.now(),
      mediaType: isVideo ? 'video' : 'image',
      ...(duration !== undefined ? { duration } : {}),
    };

    await storeBlob(blobId, file);
    await storeImage(boardImage);
    useImageStore.getState().addImage(boardImage);
    useProjectStore.getState().incrementImageCount(projectId);

    // Only use image blobs as project thumbnail (not video)
    if (!isVideo) {
      const project = useProjectStore.getState().projects.find(p => p.id === projectId);
      if (project && !project.thumbnailBlobId) {
        useProjectStore.getState().updateThumbnail(projectId, blobId);
      }
    }
  }

  if (offsetIndex > 0) {
    const parts: string[] = [];
    if (imageCount > 0) parts.push(imageCount === 1 ? '1 image' : `${imageCount} images`);
    if (videoCount > 0) parts.push(videoCount === 1 ? '1 video' : `${videoCount} videos`);
    useUIStore.getState().showToast(parts.join(' & ') + ' added');
  }
  return offsetIndex;
}
