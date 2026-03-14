import { useEffect } from 'react';
import { useProjectStore } from '../../stores/useProjectStore';
import { useImageStore } from '../../stores/useImageStore';
import { useBoardStore } from '../../stores/useBoardStore';
import { useClipboardPaste } from '../../hooks/useClipboardPaste';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { BoardHeader } from './BoardHeader';
import { Canvas } from './Canvas';
import { NoteContextMenu } from './NoteContextMenu';
import { SettingsModal } from './SettingsModal';
import { CollabSessionModal } from '../collab/CollabSessionModal';
import { CollabJoinOverlay } from '../collab/CollabJoinOverlay';
import { ImageTransferToast } from '../collab/ImageTransferToast';
import { useCollabStore } from '../../stores/useCollabStore';
import { VoiceQuizModal } from './VoiceQuizModal';

export function BoardPage() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const loadImages = useImageStore((s) => s.loadImages);
  const isLoaded = useImageStore((s) => s.isLoaded);
  const loadBoard = useBoardStore((s) => s.loadBoard);

  useClipboardPaste();
  useKeyboardShortcuts();

  useEffect(() => {
    if (currentProjectId) {
      loadImages(currentProjectId);
      loadBoard(currentProjectId);
    }
  }, [currentProjectId, loadImages, loadBoard]);

  // Check ?room= param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    if (roomId && !useCollabStore.getState().isConnected) {
      useCollabStore.getState().setShowSessionModal(true);
    }
  }, []);

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#555] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <BoardHeader />
      <Canvas />
      {/* Radial context menu is now rendered inside Canvas.tsx (U9) */}
      <NoteContextMenu />
      <SettingsModal />
      <CollabSessionModal />
      <CollabJoinOverlay />
      <ImageTransferToast />
      <VoiceQuizModal />
    </div>
  );
}
