import { useRef, useCallback, memo, useState, useEffect } from 'react';
import type { BoardImage } from '../../types';
import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../../types';
import { useBlobUrl } from '../../hooks/useBlobUrl';
import { useImageStore } from '../../stores/useImageStore';
import { useUIStore } from '../../stores/useUIStore';
import { useBoardStore } from '../../stores/useBoardStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { ResizeHandle } from './ResizeHandle';
import { PromptGenerator } from './PromptGenerator';
import { EditPromptGenerator } from './EditPromptGenerator';
import { FloatingToolbar } from './FloatingToolbar';
import { InlineCropOverlay } from './CropModal';

interface CanvasImageProps {
  image: BoardImage;
  zoomScale: number;
}

const DISPLAY_MAX_WIDTH = 350;
const DRAG_THRESHOLD = 5;
const LONG_PRESS_MS = 600;

// Detect touch device once
const IS_TOUCH = typeof window !== 'undefined' && navigator.maxTouchPoints > 0;

// Accent color palette for note theming
const ACCENT_COLORS = [
  '#f97316', '#60a5fa', '#4ade80', '#c084fc', '#fb923c',
  '#22d3ee', '#f472b6', '#facc15', '#a78bfa', '#2dd4bf',
];

export const CanvasImage = memo(function CanvasImage({ image, zoomScale }: CanvasImageProps) {
  const blobUrl = useBlobUrl(image.blobId);
  const selectedImageIds = useUIStore((s) => s.selectedImageIds);
  const activeTool = useUIStore((s) => s.activeTool);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  // focusedImageId and setFocusedImage accessed via getState() in handlers
  const isSelected = selectedImageIds.has(image.id);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const connectingFromId = useBoardStore((s) => s.connectingFromId);
  const boardMode = useBoardStore((s) => s.boardMode);
  const croppingImageId = useUIStore((s) => s.croppingImageId);
  const isCropping = croppingImageId === image.id;
  const isConnectingFrom = connectingFromId === image.id;
  const updateAccentColor = useImageStore((s) => s.updateAccentColor);

  const connections = useBoardStore((s) => s.connections);
  const allImages = useImageStore((s) => s.images);
  const connectedImages = allImages.filter(img =>
    connections.some(c =>
      (c.fromId === image.id && c.toId === img.id) ||
      (c.toId === image.id && c.fromId === img.id)
    )
  );
  // Category note completeness
  const categoryNotes = useBoardStore((s) => s.categoryNotes);
  const editNotes = useBoardStore((s) => s.editNotes);
  const promptNodes = useBoardStore((s) => s.promptNodes);
  const imageNotes = categoryNotes.filter(n => n.imageId === image.id);
  const imageEditNotes = editNotes.filter(n => n.imageId === image.id);
  const filledCats = new Set(imageNotes.map(n => n.categoryId));
  const filledEditCats = new Set(imageEditNotes.map(n => n.categoryId));
  const totalFilled = filledCats.size;
  const totalEditFilled = filledEditCats.size;
  const totalCategories = SHOT_CATEGORIES.length;
  const totalEditCategories = EDIT_CATEGORIES.length;

  // Detect if notes have changed since last prompt generation
  const i2vPrompts = promptNodes.filter(p => p.imageId === image.id && p.promptType === 'i2v');
  const editPrompts = promptNodes.filter(p => p.imageId === image.id && p.promptType === 'edit');
  const hasI2vNotesUpdated = totalFilled > 0 && i2vPrompts.length > 0 && imageNotes.some(n => n.text.length > 0);
  const hasEditNotesUpdated = totalEditFilled > 0 && editPrompts.length > 0 && imageEditNotes.some(n => n.text.length > 0);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [showCopyFlash, setShowCopyFlash] = useState(false);

  // Re-trigger scan animation when image dimensions change (e.g. after crop)
  const prevDimsRef = useRef({ w: image.width, h: image.height });
  useEffect(() => {
    if (prevDimsRef.current.w !== image.width || prevDimsRef.current.h !== image.height) {
      prevDimsRef.current = { w: image.width, h: image.height };
      setImgLoaded(false);
      setScanDone(false);
    }
  }, [image.width, image.height]);
  const [showCopiedLabel, setShowCopiedLabel] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverHandle, setHoverHandle] = useState<'input' | 'output' | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hoveredDot, setHoveredDot] = useState<string | null>(null);
  const [showUpdateTooltip, setShowUpdateTooltip] = useState<'i2v' | 'edit' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = image.mediaType === 'video';

  useEffect(() => {
    if (blobUrl && !imgLoaded) {
      const t = setTimeout(() => setScanDone(true), 680);
      return () => clearTimeout(t);
    }
  }, [blobUrl]);

  // Desktop: auto-play video on hover, pause+reset on leave
  useEffect(() => {
    if (!isVideo || IS_TOUCH || !videoRef.current) return;
    if (isHovered) {
      videoRef.current.play().catch(() => { });
      setIsVideoPlaying(true);
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsVideoPlaying(false);
    }
  }, [isHovered, isVideo]);

  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    startImgX: number;
    startImgY: number;
    hasMoved: boolean;
    pointerId: number;
  } | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // Disable dragging while in crop mode
    if (isCropping) return;
    e.stopPropagation();

    if (activeTool === 'connect') {
      const boardState = useBoardStore.getState();
      if (!boardState.connectingFromId) {
        boardState.startConnection(image.id);
      } else if (boardState.connectingFromId !== image.id) {
        boardState.finishConnection(currentProjectId!, image.id);
        setActiveTool('select');
      }
      return;
    }

    // Long-press → context menu (touch only)
    if (e.pointerType === 'touch') {
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        // Cancel drag if it hasn't moved significantly
        if (dragRef.current && !dragRef.current.hasMoved) {
          dragRef.current = null;
          window.removeEventListener('pointermove', handlePointerMoveRef.current!);
          window.removeEventListener('pointerup', handlePointerUpRef.current!);
        }
        useUIStore.getState().showContextMenu(e.clientX, e.clientY, image.id);
      }, LONG_PRESS_MS);
    }

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startImgX: image.x,
      startImgY: image.y,
      hasMoved: false,
      pointerId: e.pointerId,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || moveEvent.pointerId !== drag.pointerId) return;

      const dx = moveEvent.clientX - drag.startX;
      const dy = moveEvent.clientY - drag.startY;

      if (!drag.hasMoved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
        return;
      }
      drag.hasMoved = true;
      cancelLongPress(); // Cancel long press once drag starts

      const newX = drag.startImgX + dx / zoomScale;
      const newY = drag.startImgY + dy / zoomScale;
      useImageStore.getState().updatePosition(image.id, newX, newY);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || upEvent.pointerId !== drag.pointerId) return;
      cancelLongPress();
      if (drag.hasMoved) {
        useImageStore.getState().persistPosition(image.id);
      } else {
        // Click without drag - handle focus mode
        const uiState = useUIStore.getState();
        if (uiState.focusedImageId === image.id) {
          // Already focused — toggle selection
          uiState.selectImage(image.id, upEvent.ctrlKey || upEvent.metaKey);
        } else if (uiState.focusedImageId) {
          // Different image focused — switch focus
          uiState.setFocusedImage(image.id);
          uiState.selectImage(image.id, false);
        } else {
          uiState.selectImage(image.id, upEvent.ctrlKey || upEvent.metaKey);
        }
      }
      dragRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    // Store refs so long-press handler can cancel them
    handlePointerMoveRef.current = handlePointerMove;
    handlePointerUpRef.current = handlePointerUp;

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [image.id, image.x, image.y, zoomScale, activeTool, currentProjectId, setActiveTool, isCropping]);

  // Refs to allow long-press to cancel drag listeners
  const handlePointerMoveRef = useRef<((e: PointerEvent) => void) | null>(null);
  const handlePointerUpRef = useRef<((e: PointerEvent) => void) | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    useUIStore.getState().showContextMenu(e.clientX, e.clientY, image.id);
  }, [image.id]);

  // Focus mode: double-click to focus
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const uiState = useUIStore.getState();
    if (uiState.focusedImageId === image.id) {
      uiState.setFocusedImage(null);
    } else {
      uiState.setFocusedImage(image.id);
    }
  }, [image.id]);

  // Calculate display dimensions
  const displayW = image.displayWidth || Math.min(image.width, DISPLAY_MAX_WIDTH);
  const displayH = image.displayHeight || (image.height > 0 ? (displayW / image.width) * image.height : displayW * 0.75);

  const handleResizeStart = useCallback((e: React.PointerEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startW = displayW;
    const startH = displayH;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      const newW = Math.max(80, corner.includes('e') ? startW + dx / zoomScale : startW - dx / zoomScale);
      const newH = Math.max(60, corner.includes('s') ? startH + dy / zoomScale : startH - dy / zoomScale);
      useImageStore.getState().updateSize(image.id, newW, newH);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [displayW, displayH, zoomScale, image.id]);

  // Handle drag from OUTPUT handle (right side) to start a connection
  const handleOutputHandlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const boardState = useBoardStore.getState();
    boardState.startConnection(image.id);
    setActiveTool('connect');
  }, [image.id, setActiveTool]);

  // Drop onto INPUT handle (left side) to finish connection
  const handleInputHandlePointerUp = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    const boardState = useBoardStore.getState();
    if (boardState.connectingFromId && boardState.connectingFromId !== image.id) {
      boardState.finishConnection(currentProjectId!, image.id);
      setActiveTool('select');
    }
  }, [image.id, currentProjectId, setActiveTool]);

  const isConnectMode = activeTool === 'connect';
  const isPendingTarget = isConnectMode && connectingFromId && connectingFromId !== image.id;

  // Handles visible when: hovered OR in connect mode (or always on touch when selected)
  const showHandles = isHovered || isConnectMode || (IS_TOUCH && isSelected);

  // Accent border color
  const accentColor = image.accentColor || '#f97316';

  if (!blobUrl) {
    return (
      <div
        className="absolute rounded-lg overflow-hidden border border-[#2a2a2a]"
        style={{
          left: image.x,
          top: image.y,
          width: displayW,
          height: displayH,
          background: '#111',
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)',
        }} />
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '40%',
          top: '-40%',
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.06) 50%, transparent)',
          animation: 'scanSweep 1.2s ease-in-out infinite',
        }} />
      </div>
    );
  }

  return (
    <div
      className={`absolute group select-none`}
      style={{
        left: image.x,
        top: image.y,
        width: displayW,
        cursor: isCropping ? 'default' : (activeTool === 'connect' ? 'crosshair' : 'grab'),
        transition: 'box-shadow 0.15s ease',
        zIndex: isCropping ? 50 : (isSelected ? 15 : 10),
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => { setIsHovered(false); cancelLongPress(); setShowColorPicker(false); }}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      {/* Film perforations — selected state (U4) */}
      {isSelected && (
        <>
          <div className="film-perforations left">
            {Array.from({ length: Math.max(3, Math.round(displayH / 40)) }).map((_, i) => (
              <div key={`l${i}`} className="film-perf-hole" style={{ background: `${accentColor}40` }} />
            ))}
          </div>
          <div className="film-perforations right">
            {Array.from({ length: Math.max(3, Math.round(displayH / 40)) }).map((_, i) => (
              <div key={`r${i}`} className="film-perf-hole" style={{ background: `${accentColor}40` }} />
            ))}
          </div>
        </>
      )}

      {/* Clapperboard shot number (U4) */}
      {image.shotOrder != null && image.shotOrder > 0 && (
        <div style={{
          position: 'absolute',
          top: -22,
          left: 0,
          fontSize: 10,
          fontFamily: "'DM Serif Display', serif",
          color: `${accentColor}90`,
          letterSpacing: '0.04em',
          pointerEvents: 'none',
          userSelect: 'none',
          textShadow: `0 0 8px ${accentColor}30`,
        }}>
          #{String(image.shotOrder).padStart(2, '0')}
        </div>
      )}

      {/* Main image card */}
      <div
        style={{
          position: 'relative',
          borderRadius: 8,
          overflow: 'hidden',
          border: isSelected
            ? `1.5px solid ${accentColor}`
            : isHovered
              ? '1px solid #444'
              : '1px solid #2a2a2a',
          boxShadow: isSelected
            ? `0 0 18px ${accentColor}59, 0 4px 20px rgba(0,0,0,0.4)`
            : isHovered
              ? `0 0 12px ${accentColor}30, 0 4px 16px rgba(0,0,0,0.3)`
              : '0 4px 12px rgba(0,0,0,0.35)',
          transition: 'border 0.15s ease, box-shadow 0.15s ease',
          ...(showCopyFlash ? { animation: 'copyFlash 0.4s ease-out' } : {}),
        }}
        className={isPendingTarget ? 'ring-2 ring-[#f97316]/60' : ''}
      >
        {/* Scan-line overlay (while loading) */}
        {!scanDone && (
          <>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: '#0f0f0f',
              zIndex: 2,
            }} />
            <div
              className="image-loading-scan"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '35%',
                top: '-35%',
                background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.07) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.07) 55%, transparent)',
                zIndex: 3,
              }}
            />
          </>
        )}

        {/* The actual media (image or video) */}
        {isVideo ? (
          <video
            ref={videoRef}
            src={blobUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-auto block"
            draggable={false}
            onLoadedMetadata={() => setImgLoaded(true)}
            style={{
              opacity: scanDone ? 1 : 0,
              transform: scanDone ? 'scale(1)' : 'scale(0.92)',
              transition: scanDone
                ? 'opacity 0.3s ease-out, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
                : 'none',
            }}
          />
        ) : (
          <img
            src={blobUrl}
            alt={image.label || image.filename}
            className="w-full h-auto block"
            draggable={false}
            onLoad={() => setImgLoaded(true)}
            style={{
              opacity: scanDone ? 1 : 0,
              transform: scanDone ? 'scale(1)' : 'scale(0.92)',
              transition: scanDone
                ? 'opacity 0.3s ease-out, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
                : 'none',
            }}
          />
        )}

        {/* Hover/touch overlay */}
        {!isConnectMode && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: isHovered ? 'rgba(0,0,0,0.18)' : 'transparent',
              transition: 'background 0.15s ease',
            }}
          >
            {/* Copy button — images only */}
            {!isVideo && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const { copyImageToClipboard } = await import('../../utils/clipboard');
                  const success = await copyImageToClipboard(image.blobId);
                  if (success) {
                    setShowCopyFlash(true);
                    setShowCopiedLabel(true);
                    setTimeout(() => setShowCopyFlash(false), 450);
                    setTimeout(() => setShowCopiedLabel(false), 1100);
                  }
                  useUIStore.getState().showToast(success ? 'Copied to clipboard' : 'Failed to copy');
                }}
                onPointerDown={e => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  opacity: IS_TOUCH ? 1 : (isHovered ? 1 : 0),
                  background: 'rgba(0,0,0,0.7)',
                  border: '1px solid #3a3a3a',
                  color: '#e5e5e5',
                  borderRadius: 6,
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: IS_TOUCH ? 'none' : 'opacity 0.15s ease, background 0.15s ease',
                  backdropFilter: 'blur(4px)',
                  touchAction: 'manipulation',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.9)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.7)'; }}
                title="Copy to clipboard"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>
            )}

            {/* Color picker button */}
            {isHovered && !IS_TOUCH && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
                onPointerDown={e => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: isVideo ? 8 : 36,
                  opacity: isHovered ? 1 : 0,
                  background: 'rgba(0,0,0,0.7)',
                  border: '1px solid #3a3a3a',
                  borderRadius: 6,
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s ease',
                  backdropFilter: 'blur(4px)',
                }}
                title="Set accent color"
              >
                <div style={{
                  width: 13,
                  height: 13,
                  borderRadius: '50%',
                  background: image.accentColor || '#f97316',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                }} />
              </button>
            )}

            {/* Color picker dropdown */}
            {showColorPicker && (
              <div
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 36,
                  right: isVideo ? 8 : 36,
                  background: 'rgba(8,9,16,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: 6,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 4,
                  width: 110,
                  zIndex: 100,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                }}
              >
                {ACCENT_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => { updateAccentColor(image.id, color); setShowColorPicker(false); }}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: color,
                      border: color === (image.accentColor || '#f97316') ? '2px solid white' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'transform 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                ))}
              </div>
            )}

            {/* Video badge (desktop) — subtle indicator */}
            {isVideo && !IS_TOUCH && (
              <div style={{
                position: 'absolute',
                top: 8,
                left: 8,
                background: 'rgba(0,0,0,0.65)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 4,
                padding: '2px 7px',
                fontSize: 9,
                fontFamily: "'JetBrains Mono', monospace",
                color: '#888',
                letterSpacing: '0.06em',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                VIDEO
              </div>
            )}

            {/* Video play/pause button (touch) */}
            {isVideo && IS_TOUCH && (
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (!videoRef.current) return;
                  if (videoRef.current.paused) {
                    videoRef.current.play().catch(() => { });
                    setIsVideoPlaying(true);
                  } else {
                    videoRef.current.pause();
                    setIsVideoPlaying(false);
                  }
                }}
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  background: 'rgba(0,0,0,0.7)',
                  border: '1px solid #3a3a3a',
                  color: '#e5e5e5',
                  borderRadius: 6,
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                  touchAction: 'manipulation',
                }}
                title={isVideoPlaying ? 'Pause' : 'Play'}
              >
                {isVideoPlaying ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>
            )}
          </div>
        )}

        {/* Connect mode overlay */}
        {isConnectMode && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isConnectingFrom && (
              <div style={{
                background: 'rgba(249,115,22,0.85)',
                color: 'white',
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 99,
                pointerEvents: 'none',
              }}>
                Connecting…
              </div>
            )}
            {isPendingTarget && (
              <div style={{
                opacity: isHovered ? 1 : 0,
                background: 'rgba(249,115,22,0.8)',
                color: 'white',
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 99,
                pointerEvents: 'none',
                transition: 'opacity 0.15s ease',
              }}>
                Connect here
              </div>
            )}
          </div>
        )}

        {/* Image label — cinematic typography (U7) */}
        {(image.label || isHovered) && !isConnectMode && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.88), transparent)',
            padding: '16px 8px 6px',
            display: 'flex',
          }}>
            <input
              value={image.label || ''}
              placeholder="Add label (@name)..."
              onChange={(e) => useImageStore.getState().updateLabel(image.id, e.target.value)}
              onPointerDown={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === 'Escape' || e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e5e5e5',
                fontSize: image.label ? 13 : 11,
                fontFamily: image.label ? "'DM Serif Display', serif" : "'JetBrains Mono', monospace",
                width: '100%',
                outline: 'none',
                textOverflow: 'ellipsis',
                letterSpacing: image.label ? '0.02em' : '0',
              }}
            />
          </div>
        )}
      </div>

      {/* Inline crop overlay — outside card to avoid overflow:hidden clipping */}
      {isCropping && (
        <InlineCropOverlay
          image={image}
          displayW={displayW}
          displayH={displayH}
          zoomScale={zoomScale}
        />
      )}

      {/* ── Completeness Indicator ── */}
      {(totalFilled > 0 || totalEditFilled > 0 || isHovered) && (
        <div
          style={{
            position: 'absolute',
            top: -26,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            pointerEvents: 'auto',
            zIndex: 20,
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          {/* I2V dots — always shown when notes exist */}
          {totalFilled > 0 && SHOT_CATEGORIES.map(cat => {
            const filled = filledCats.has(cat.id);
            const dotColor = image.accentColor || cat.color;
            const isDotHovered = hoveredDot === `i2v-${cat.id}`;
            return (
              <div
                key={`i2v-${cat.id}`}
                onPointerEnter={() => setHoveredDot(`i2v-${cat.id}`)}
                onPointerLeave={() => setHoveredDot(null)}
                style={{
                  position: 'relative',
                  width: filled ? (isDotHovered ? 10 : 8) : (isDotHovered ? 8 : 6),
                  height: filled ? (isDotHovered ? 10 : 8) : (isDotHovered ? 8 : 6),
                  borderRadius: '50%',
                  background: filled ? dotColor : (isDotHovered ? `${dotColor}40` : 'transparent'),
                  border: `1.5px solid ${filled ? dotColor : (isDotHovered ? `${dotColor}80` : '#333')}`,
                  boxShadow: filled ? `0 0 5px ${dotColor}80` : (isDotHovered ? `0 0 4px ${dotColor}40` : 'none'),
                  transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
                title={`${cat.icon} ${cat.label}: ${filled ? 'noted' : 'missing'}`}
              />
            );
          })}
          {totalFilled > 0 && (
            <div style={{
              marginLeft: 2,
              fontSize: 9,
              fontFamily: "'JetBrains Mono', monospace",
              color: totalFilled === totalCategories ? '#4ade80' : '#666',
              letterSpacing: '0.04em',
              transition: 'color 0.2s ease',
            }}>
              {totalFilled}/{totalCategories}
            </div>
          )}

          {/* I2V Exclamation mark — notes updated since last prompt */}
          {hasI2vNotesUpdated && (
            <div
              style={{ position: 'relative', cursor: 'pointer' }}
              onPointerEnter={() => setShowUpdateTooltip('i2v')}
              onPointerLeave={() => setShowUpdateTooltip(null)}
              onClick={() => setShowUpdateTooltip(showUpdateTooltip === 'i2v' ? null : 'i2v')}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                background: 'linear-gradient(135deg, #f97316, #fb923c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: '#fff',
                boxShadow: '0 0 8px rgba(249,115,22,0.6)',
                animation: 'pulse 2s ease-in-out infinite',
                transition: 'transform 0.15s ease',
                transform: showUpdateTooltip === 'i2v' ? 'scale(1.15)' : 'scale(1)',
              }}>
                !
              </div>
              {showUpdateTooltip === 'i2v' && (
                <div style={{
                  position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
                  background: 'rgba(10,11,20,0.97)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(249,115,22,0.3)', borderRadius: 10,
                  padding: '8px 12px', fontSize: 10,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  color: 'rgba(255,255,255,0.8)', minWidth: 200, maxWidth: 260,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                  zIndex: 100,
                  animation: 'tooltipFadeIn 0.15s ease forwards',
                }}>
                  <div style={{ fontWeight: 700, color: '#f97316', marginBottom: 5, fontSize: 10, letterSpacing: '0.03em' }}>
                    🎬 I2V Notes Updated
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
                    {imageNotes.map(n => {
                      const cat = SHOT_CATEGORIES.find(c => c.id === n.categoryId);
                      if (!cat) return null;
                      const preview = n.text.trim().substring(0, 40);
                      return (
                        <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 11 }}>{cat.icon}</span>
                          <span style={{ color: cat.color, fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
                            {cat.label}:
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {preview || '(empty)'}{preview.length >= 40 ? '…' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(249,115,22,0.7)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 4 }}>
                    {i2vPrompts.length} prompt{i2vPrompts.length !== 1 ? 's' : ''} generated — click ⚡ to regenerate
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Separator between I2V and Edit indicators */}
          {totalFilled > 0 && totalEditFilled > 0 && (
            <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.1)', margin: '0 1px' }} />
          )}

          {/* Edit mode indicator — always shown when edit notes exist */}
          {totalEditFilled > 0 && (
            <div style={{
              fontSize: 8,
              fontFamily: "'JetBrains Mono', monospace",
              color: '#22d3ee',
              background: 'rgba(34,211,238,0.1)',
              border: '1px solid rgba(34,211,238,0.2)',
              borderRadius: 3,
              padding: '0px 4px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}>
              ✏️{totalEditFilled}/{totalEditCategories}
            </div>
          )}

          {/* Edit Exclamation mark — notes updated since last prompt */}
          {hasEditNotesUpdated && (
            <div
              style={{ position: 'relative', cursor: 'pointer' }}
              onPointerEnter={() => setShowUpdateTooltip('edit')}
              onPointerLeave={() => setShowUpdateTooltip(null)}
              onClick={() => setShowUpdateTooltip(showUpdateTooltip === 'edit' ? null : 'edit')}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: '#fff',
                boxShadow: '0 0 8px rgba(34,211,238,0.6)',
                animation: 'pulse 2s ease-in-out infinite',
                transition: 'transform 0.15s ease',
                transform: showUpdateTooltip === 'edit' ? 'scale(1.15)' : 'scale(1)',
              }}>
                !
              </div>
              {showUpdateTooltip === 'edit' && (
                <div style={{
                  position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
                  background: 'rgba(10,11,20,0.97)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(34,211,238,0.3)', borderRadius: 10,
                  padding: '8px 12px', fontSize: 10,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  color: 'rgba(255,255,255,0.8)', minWidth: 200, maxWidth: 260,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                  zIndex: 100,
                  animation: 'tooltipFadeIn 0.15s ease forwards',
                }}>
                  <div style={{ fontWeight: 700, color: '#22d3ee', marginBottom: 5, fontSize: 10, letterSpacing: '0.03em' }}>
                    ✏️ Edit Notes Updated
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
                    {imageEditNotes.map(n => {
                      const cat = EDIT_CATEGORIES.find(c => c.id === n.categoryId);
                      if (!cat) return null;
                      const preview = n.text.trim().substring(0, 40);
                      return (
                        <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 11 }}>{cat.icon}</span>
                          <span style={{ color: cat.color, fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
                            {cat.label}:
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {preview || '(empty)'}{preview.length >= 40 ? '…' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(34,211,238,0.7)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 4 }}>
                    {editPrompts.length} prompt{editPrompts.length !== 1 ? 's' : ''} generated — click ⚡ to regenerate
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* "Copied!" floating label */}
      {showCopiedLabel && (
        <div className="copied-label">copied</div>
      )}

      {/* ============ ANCHOR HANDLES ============ */}

      {/* INPUT handle — LEFT center edge */}
      {showHandles && (
        <div
          onPointerUp={handleInputHandlePointerUp}
          onPointerEnter={() => setHoverHandle('input')}
          onPointerLeave={() => setHoverHandle(null)}
          style={{
            position: 'absolute',
            top: '50%',
            left: IS_TOUCH ? -10 : -6,
            transform: 'translateY(-50%)',
            width: IS_TOUCH ? 20 : 12,
            height: IS_TOUCH ? 20 : 12,
            borderRadius: '50%',
            background: hoverHandle === 'input' || isPendingTarget ? accentColor : '#444',
            border: `2px solid ${hoverHandle === 'input' || isPendingTarget ? accentColor : '#666'}`,
            boxShadow: hoverHandle === 'input' || isPendingTarget
              ? `0 0 12px ${accentColor}b3`
              : '0 0 4px rgba(0,0,0,0.5)',
            cursor: 'crosshair',
            zIndex: 20,
            transition: 'background 0.12s ease, box-shadow 0.12s ease',
            touchAction: 'none',
          }}
        />
      )}

      {/* OUTPUT handle — RIGHT center edge */}
      {showHandles && (
        <div
          onPointerDown={handleOutputHandlePointerDown}
          onPointerEnter={() => setHoverHandle('output')}
          onPointerLeave={() => setHoverHandle(null)}
          style={{
            position: 'absolute',
            top: '50%',
            right: IS_TOUCH ? -10 : -6,
            transform: 'translateY(-50%)',
            width: IS_TOUCH ? 20 : 12,
            height: IS_TOUCH ? 20 : 12,
            borderRadius: '50%',
            background: hoverHandle === 'output' || isConnectingFrom ? accentColor : '#444',
            border: `2px solid ${hoverHandle === 'output' || isConnectingFrom ? accentColor : '#666'}`,
            boxShadow: hoverHandle === 'output' || isConnectingFrom
              ? `0 0 12px ${accentColor}b3`
              : '0 0 4px rgba(0,0,0,0.5)',
            cursor: 'crosshair',
            zIndex: 20,
            transition: 'background 0.12s ease, box-shadow 0.12s ease',
            touchAction: 'none',
          }}
        />
      )}

      {/* "+" add node button — bottom-right corner (hide on touch to avoid clutter) */}
      {isHovered && !isConnectMode && !IS_TOUCH && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleOutputHandlePointerDown(e as unknown as React.PointerEvent);
          }}
          style={{
            position: 'absolute',
            bottom: -10,
            right: -10,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#1a1a1a',
            border: '1.5px solid #3a3a3a',
            color: '#aaa',
            fontSize: 14,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 25,
            boxShadow: '0 0 8px rgba(0,0,0,0.6)',
            lineHeight: 1,
            transition: 'background 0.12s ease, border-color 0.12s ease, color 0.12s ease',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = '#2a2a2a';
            el.style.borderColor = accentColor;
            el.style.color = accentColor;
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = '#1a1a1a';
            el.style.borderColor = '#3a3a3a';
            el.style.color = '#aaa';
          }}
          title="Start connection"
        >
          +
        </button>
      )}

      {/* Resize handles */}
      {isSelected && !isConnectMode && (
        <>
          <ResizeHandle corner="nw" onResizeStart={handleResizeStart} />
          <ResizeHandle corner="ne" onResizeStart={handleResizeStart} />
          <ResizeHandle corner="sw" onResizeStart={handleResizeStart} />
          <ResizeHandle corner="se" onResizeStart={handleResizeStart} />
        </>
      )}

      {/* Floating Toolbar — shown when selected */}
      {isSelected && !isConnectMode && !IS_TOUCH && (
        <FloatingToolbar image={image} displayW={displayW} displayH={displayH} />
      )}

      {/* Process Prompt button — below image (I2V) */}
      {imageNotes.length > 0 && !isConnectMode && boardMode === 'i2v' && (
        <PromptGenerator image={image} notes={imageNotes} connectedImages={[]} />
      )}

      {/* Process Edit Prompt button */}
      {imageEditNotes.length > 0 && !isConnectMode && boardMode === 'edit' && (
        <EditPromptGenerator image={image} notes={imageEditNotes} connectedImages={connectedImages} />
      )}
    </div>
  );
});
