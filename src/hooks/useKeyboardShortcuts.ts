import { useEffect } from 'react';
import { useImageStore } from '../stores/useImageStore';
import { useUIStore } from '../stores/useUIStore';
import { useProjectStore } from '../stores/useProjectStore';
import { useBoardStore } from '../stores/useBoardStore';

export function useKeyboardShortcuts() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  useEffect(() => {
    if (!currentProjectId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const { selectedImageIds, clearSelection, hideContextMenu, activeTool, setActiveTool,
        focusedImageId, setFocusedImage, isSearchOpen, setSearchOpen, isShotPanelOpen, setShotPanelOpen,
        popUndo, popRedo, showToast, noteDisplayMode, setNoteDisplayMode,
        isQuietMode, toggleQuietMode } = useUIStore.getState();
      const { removeImage, duplicateImage, images } = useImageStore.getState();
      const { decrementImageCount } = useProjectStore.getState();
      const { cancelConnection, setBoardMode, removeCategoryNotesForImage, removeEditNotesForImage } = useBoardStore.getState();

      // Cmd+Z / Ctrl+Z — Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const entry = popUndo();
        if (entry) {
          entry.undo();
          showToast(`Undone: ${entry.description}`);
        }
        return;
      }

      // Cmd+Shift+Z / Ctrl+Shift+Z or Ctrl+Y — Redo (F7)
      if (((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) ||
          ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
        e.preventDefault();
        const entry = popRedo();
        if (entry) {
          entry.undo();
          showToast(`Redone: ${entry.description}`);
        }
        return;
      }

      // Cmd+F / Ctrl+F — Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(!isSearchOpen);
        return;
      }

      // Cmd+D / Ctrl+D — Duplicate selected image + notes
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedImageIds.size === 1) {
          const imageId = Array.from(selectedImageIds)[0];
          duplicateImage(imageId).then((newId) => {
            if (newId) {
              // Also duplicate category notes and edit notes
              const board = useBoardStore.getState();
              const catNotes = board.categoryNotes.filter(n => n.imageId === imageId);
              const edNotes = board.editNotes.filter(n => n.imageId === imageId);
              for (const note of catNotes) {
                board.addCategoryNote(currentProjectId, newId, note.categoryId, note.x + 40, note.y + 40);
              }
              for (const note of edNotes) {
                board.addEditNote(currentProjectId, newId, note.categoryId, note.x + 40, note.y + 40);
              }
              showToast('Image + notes duplicated');
            }
          });
        }
        return;
      }

      // Cmd+1 — Switch to I2V mode
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        setBoardMode('i2v');
        showToast('Switched to I2V mode');
        return;
      }

      // Cmd+2 — Switch to Edit mode
      if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        setBoardMode('edit');
        showToast('Switched to Edit mode');
        return;
      }

      // Tool shortcuts (no modifiers)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'v' || e.key === 'V') {
          setActiveTool('select');
          cancelConnection();
          return;
        }
        if (e.key === 'c' || e.key === 'C') {
          setActiveTool('connect');
          return;
        }
        if (e.key === 't' || e.key === 'T') {
          setActiveTool('text');
          return;
        }

        // N — Toggle note display mode (U2)
        if (e.key === 'n' || e.key === 'N') {
          setNoteDisplayMode(noteDisplayMode === 'canvas' ? 'sidebar' : 'canvas');
          showToast(noteDisplayMode === 'canvas' ? 'Notes → Sidebar' : 'Notes → Canvas');
          return;
        }

        // Q — Toggle quiet mode (U12)
        if (e.key === 'q' || e.key === 'Q') {
          toggleQuietMode();
          showToast(isQuietMode ? 'Quiet mode off' : 'Quiet mode on');
          return;
        }

        // [ / ] — Navigate between images (F7)
        if (e.key === '[' || e.key === ']') {
          if (images.length === 0) return;
          const sorted = [...images].sort((a, b) => (a.shotOrder ?? 0) - (b.shotOrder ?? 0));
          let currentIdx = -1;
          if (selectedImageIds.size === 1) {
            const selId = Array.from(selectedImageIds)[0];
            currentIdx = sorted.findIndex(i => i.id === selId);
          }
          let nextIdx: number;
          if (e.key === ']') {
            nextIdx = currentIdx < sorted.length - 1 ? currentIdx + 1 : 0;
          } else {
            nextIdx = currentIdx > 0 ? currentIdx - 1 : sorted.length - 1;
          }
          const nextImage = sorted[nextIdx];
          if (nextImage) {
            useUIStore.getState().selectImage(nextImage.id);
            if (focusedImageId) {
              setFocusedImage(nextImage.id);
            }
            showToast(`Shot ${nextIdx + 1}/${sorted.length}`);
          }
          return;
        }
      }

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedImageIds.size > 0) {
          e.preventDefault();
          selectedImageIds.forEach(async (id) => {
            await removeCategoryNotesForImage(id);
            await removeEditNotesForImage(id);
            await removeImage(id);
            decrementImageCount(currentProjectId);
          });
          clearSelection();
          useUIStore.getState().showToast(
            selectedImageIds.size === 1 ? 'Image deleted' : `${selectedImageIds.size} images deleted`
          );
        }
      }

      // Ctrl+A / Cmd+A — Select all
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const allIds = images.map((i) => i.id);
        useUIStore.getState().selectAllImages(allIds);
      }

      // Escape
      if (e.key === 'Escape') {
        // Close search first
        if (isSearchOpen) {
          setSearchOpen(false);
          return;
        }
        // Unfocus
        if (focusedImageId) {
          setFocusedImage(null);
          return;
        }
        // Close shot panel
        if (isShotPanelOpen) {
          setShotPanelOpen(false);
          return;
        }

        clearSelection();
        hideContextMenu();
        if (activeTool === 'connect') {
          cancelConnection();
          setActiveTool('select');
        } else if (activeTool === 'text') {
          setActiveTool('select');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentProjectId]);
}
