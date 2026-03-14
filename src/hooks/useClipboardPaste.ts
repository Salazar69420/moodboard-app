import { useEffect } from 'react';
import { nanoid } from 'nanoid';
import type { BoardImage } from '../types';
import { getImageDimensions } from '../utils/image';
import { storeImage, storeBlob } from '../utils/db-operations';
import { useImageStore } from '../stores/useImageStore';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';
import { canvasMousePos } from '../utils/canvasMousePos';

export function useClipboardPaste() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  useEffect(() => {
    if (!currentProjectId) return;

    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          event.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const { width, height } = await getImageDimensions(file);
          const imageId = nanoid();
          const blobId = nanoid();

          // Place at cursor position on canvas, centered on the image
          const displayW = Math.min(width, 400);
          const displayH = (displayW / width) * height;

          let x: number;
          let y: number;
          if (canvasMousePos.initialized) {
            // Center the image on the cursor
            x = canvasMousePos.x - displayW / 2;
            y = canvasMousePos.y - displayH / 2;
          } else {
            // Fallback: center of viewport with random offset
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;
            x = (viewportW / 2 - displayW / 2) + (Math.random() - 0.5) * 100;
            y = (viewportH / 2 - displayH / 2) + (Math.random() - 0.5) * 100;
          }

          const boardImage: BoardImage = {
            id: imageId,
            projectId: currentProjectId,
            blobId,
            filename: file.name || `pasted-${Date.now()}.png`,
            mimeType: file.type,
            width,
            height,
            x,
            y,
            label: '',
            createdAt: Date.now(),
          };

          await storeBlob(blobId, file);
          await storeImage(boardImage);

          useImageStore.getState().addImage(boardImage);
          useProjectStore.getState().incrementImageCount(currentProjectId);

          // Set as thumbnail if first image
          const project = useProjectStore.getState().projects.find(
            (p) => p.id === currentProjectId
          );
          if (project && !project.thumbnailBlobId) {
            useProjectStore.getState().updateThumbnail(currentProjectId, blobId);
          }

          useUIStore.getState().showToast('Image added');
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [currentProjectId]);
}
