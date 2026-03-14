import { useEffect, type RefObject } from 'react';
import { useProjectStore } from '../stores/useProjectStore';
import { importImageFiles } from '../utils/importImages';

export function useFileDrop(containerRef: RefObject<HTMLDivElement | null>) {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !currentProjectId) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer?.files;
      if (!files || !currentProjectId) return;

      const dropX = e.clientX - 100;
      const dropY = e.clientY - 100;
      await importImageFiles(files, currentProjectId, dropX, dropY);
    };

    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('drop', handleDrop);

    return () => {
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('drop', handleDrop);
    };
  }, [containerRef, currentProjectId]);
}
