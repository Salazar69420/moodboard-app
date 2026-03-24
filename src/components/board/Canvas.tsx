import { useRef, useState, useCallback, useEffect } from 'react';
import { canvasMousePos } from '../../utils/canvasMousePos';
import { useImageStore } from '../../stores/useImageStore';
import { useUIStore } from '../../stores/useUIStore';
import { useFileDrop } from '../../hooks/useFileDrop';
import { CanvasImage } from './CanvasImage';
import { EmptyBoard } from './EmptyBoard';
import { useBoardStore } from '../../stores/useBoardStore';
import { ConnectionLayer } from './ConnectionLayer';
import { TextNodeComponent } from './TextNodeComponent';
import { CategoryNoteNode } from './CategoryNoteNode';
import { EditNoteNode } from './EditNoteNode';
import { PromptNodeComponent } from './PromptNodeComponent';
import { GodModeNodeComponent } from './GodModeNodeComponent';
import { DocumentNodeComponent } from './DocumentNodeComponent';
import { BatchProgress } from './BatchProgress';
import { useProjectStore } from '../../stores/useProjectStore';
import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../../types';
import { Minimap } from './Minimap';
import { SearchBar } from './SearchBar';
import { ShotPanel } from './ShotPanel';
import { RemoteCursors } from '../collab/RemoteCursors';
import { broadcastCursor } from '../../collab/yjsProvider';
import { useCollabStore } from '../../stores/useCollabStore';
import { RightSidebar } from './RightSidebar';
import { RadialContextMenu } from './RadialContextMenu';
import { SessionRecap } from './SessionRecap';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_SPEED = 0.001;
const PAN_THRESHOLD = 4;

// Detect touch device once at module level
const IS_TOUCH_DEVICE = typeof window !== 'undefined' && navigator.maxTouchPoints > 0;

export function Canvas() {
  const images = useImageStore((s) => s.images);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const hideContextMenu = useUIStore((s) => s.hideContextMenu);
  const { activeTool, setActiveTool } = useUIStore();
  const focusedImageId = useUIStore((s) => s.focusedImageId);
  const setFocusedImage = useUIStore((s) => s.setFocusedImage);
  const connections = useBoardStore((s) => s.connections);
  const textNodes = useBoardStore((s) => s.textNodes);
  const categoryNotes = useBoardStore((s) => s.categoryNotes);
  const editNotes = useBoardStore((s) => s.editNotes);
  const promptNodes = useBoardStore((s) => s.promptNodes);
  const godModeNodes = useBoardStore((s) => s.godModeNodes);
  const documentNodes = useBoardStore((s) => s.documentNodes);
  const connectingFromId = useBoardStore((s) => s.connectingFromId);
  const removeConnection = useBoardStore((s) => s.removeConnection);
  const updateConnectionLabel = useBoardStore((s) => s.updateConnectionLabel);
  const updateTextNode = useBoardStore((s) => s.updateTextNode);
  const removeTextNode = useBoardStore((s) => s.removeTextNode);
  const addTextNode = useBoardStore((s) => s.addTextNode);
  const cancelConnection = useBoardStore((s) => s.cancelConnection);
  const boardMode = useBoardStore((s) => s.boardMode);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const isQuietMode = useUIStore((s) => s.isQuietMode);
  const noteDisplayMode = useUIStore((s) => s.noteDisplayMode);

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [newNodeId, setNewNodeId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const spacePressed = useRef(false);
  const zoomRef = useRef(zoom);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panXRef.current = panX; }, [panX]);
  useEffect(() => { panYRef.current = panY; }, [panY]);

  // Track container size for minimap
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Pinch-to-zoom state (two-finger gesture)
  const pinchRef = useRef<{
    startDist: number;
    startZoom: number;
    cx: number;
    cy: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  useFileDrop(containerRef);

  // Space key for pan mode (desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          spacePressed.current = true;
          if (containerRef.current) containerRef.current.style.cursor = 'grab';
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressed.current = false;
        if (containerRef.current && !isPanning.current) {
          containerRef.current.style.cursor = 'default';
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Pinch-to-zoom via native touch events (prevents browser's own zoom)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getDistance = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const t1 = e.touches[0], t2 = e.touches[1];
        pinchRef.current = {
          startDist: getDistance(t1, t2),
          startZoom: zoomRef.current,
          cx: (t1.clientX + t2.clientX) / 2 - rect.left,
          cy: (t1.clientY + t2.clientY) / 2 - rect.top,
          startPanX: panXRef.current,
          startPanY: panYRef.current,
        };
        // Cancel single-finger pan if it was active
        isPanning.current = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const ps = pinchRef.current;
        const dist = getDistance(e.touches[0], e.touches[1]);
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, ps.startZoom * (dist / ps.startDist)));
        const ratio = newZoom / ps.startZoom;
        setZoom(newZoom);
        setPanX(ps.cx - ratio * (ps.cx - ps.startPanX));
        setPanY(ps.cy - ratio * (ps.cy - ps.startPanY));
      }
    };

    const onTouchEnd = () => { pinchRef.current = null; };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []); // uses refs only, stable

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = -e.deltaY * ZOOM_SPEED;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * (1 + delta)));
    const ratio = newZoom / zoom;

    setPanX((prev) => mouseX - ratio * (mouseX - prev));
    setPanY((prev) => mouseY - ratio * (mouseY - prev));
    setZoom(newZoom);
  }, [zoom]);

  // Double-click on canvas to create text node
  const lastClickTime = useRef(0);
  const lastClickTarget = useRef<EventTarget | null>(null);

  // Unified pointer handler for canvas (mouse + touch + pen)
  const handlePointerDown = useCallback(async (e: React.PointerEvent) => {
    const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';

    // Skip if pinch is active (two-finger gesture handled by touch events)
    if (pinchRef.current) return;

    // Desktop pan: middle mouse or space+left click
    if (e.button === 1 || (e.button === 0 && spacePressed.current)) {
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, panX, panY };
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing';

      const onMove = (ev: PointerEvent) => {
        if (!isPanning.current) return;
        const dx = ev.clientX - panStart.current.x;
        const dy = ev.clientY - panStart.current.y;
        setPanX(panStart.current.panX + dx);
        setPanY(panStart.current.panY + dy);
      };
      const onUp = () => {
        isPanning.current = false;
        if (containerRef.current) {
          containerRef.current.style.cursor = spacePressed.current ? 'grab' : 'default';
        }
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);

    } else if (e.button === 0) {
      const onCanvasBackground =
        e.target === e.currentTarget ||
        (e.target as HTMLElement).dataset?.canvasWrapper === 'true';

      // Double-click detection for creating text nodes
      const now = Date.now();
      if (onCanvasBackground && !isTouch && now - lastClickTime.current < 350 &&
        lastClickTarget.current === e.target && activeTool === 'select') {
        // Double-click — create text node
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect && currentProjectId) {
          const realX = (e.clientX - rect.left - panXRef.current) / zoomRef.current;
          const realY = (e.clientY - rect.top - panYRef.current) / zoomRef.current;
          const id = await addTextNode(currentProjectId, realX, realY);
          setNewNodeId(id);
        }
        lastClickTime.current = 0;
        return;
      }
      lastClickTime.current = now;
      lastClickTarget.current = e.target;

      if (isTouch && onCanvasBackground) {
        // Single-finger touch on canvas background = pan (or tap)
        let hasPanned = false;
        panStart.current = { x: e.clientX, y: e.clientY, panX, panY };

        const onMove = (ev: PointerEvent) => {
          if (ev.pointerId !== e.pointerId || pinchRef.current) return;
          const dx = ev.clientX - panStart.current.x;
          const dy = ev.clientY - panStart.current.y;
          if (Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD) {
            hasPanned = true;
            setPanX(panStart.current.panX + dx);
            setPanY(panStart.current.panY + dy);
          }
        };
        const onUp = async (ev: PointerEvent) => {
          if (ev.pointerId !== e.pointerId) return;
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);

          if (!hasPanned) {
            // Treat as tap — same logic as desktop click
            if (activeTool === 'text' && currentProjectId) {
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) {
                const realX = (e.clientX - rect.left - panXRef.current) / zoomRef.current;
                const realY = (e.clientY - rect.top - panYRef.current) / zoomRef.current;
                const id = await addTextNode(currentProjectId, realX, realY);
                setNewNodeId(id);
                setActiveTool('select');
              }
            } else if (activeTool === 'connect') {
              cancelConnection();
              setActiveTool('select');
            } else {
              // Unfocus if in focus mode
              if (focusedImageId) {
                setFocusedImage(null);
              }
              clearSelection();
              hideContextMenu();
            }
          }
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);

      } else if (!isTouch) {
        // Desktop left click
        if (activeTool === 'text' && currentProjectId) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const realX = (e.clientX - rect.left - panXRef.current) / zoomRef.current;
            const realY = (e.clientY - rect.top - panYRef.current) / zoomRef.current;
            const id = await addTextNode(currentProjectId, realX, realY);
            setNewNodeId(id);
            setActiveTool('select');
          }
        } else if (
          e.target === e.currentTarget ||
          (e.target as HTMLElement).dataset?.canvasWrapper === 'true'
        ) {
          if (activeTool === 'connect') {
            cancelConnection();
            setActiveTool('select');
          } else {
            // Unfocus if in focus mode
            if (focusedImageId) {
              setFocusedImage(null);
            }
            clearSelection();
            hideContextMenu();
          }
        }
      }
    }
  }, [panX, panY, activeTool, currentProjectId, addTextNode, setActiveTool, cancelConnection, clearSelection, hideContextMenu, focusedImageId, setFocusedImage]);

  const handleMinimapJump = useCallback((newPanX: number, newPanY: number) => {
    setPanX(newPanX);
    setPanY(newPanY);
  }, []);

  const handleSearchJump = useCallback((x: number, y: number) => {
    const cw = containerSize.w || window.innerWidth;
    const ch = containerSize.h || window.innerHeight;
    setPanX(-(x * zoom - cw / 2));
    setPanY(-(y * zoom - ch / 2));
  }, [zoom, containerSize]);

  const zoomPercent = Math.round(zoom * 100);

  // Determine which image IDs belong to the focused image (for focus mode dimming)
  const focusedNoteIds = new Set<string>();
  if (focusedImageId) {
    for (const n of categoryNotes) if (n.imageId === focusedImageId) focusedNoteIds.add(n.id);
    for (const n of editNotes) if (n.imageId === focusedImageId) focusedNoteIds.add(n.id);
    for (const n of promptNodes) if (n.imageId === focusedImageId) focusedNoteIds.add(n.id);
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 overflow-hidden canvas-bg ${isQuietMode ? 'quiet-mode' : ''}`}
      style={{ touchAction: 'none' }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
    >
      {/* Film grain noise overlay (U1) */}
      <div className="canvas-noise-overlay" />

      {/* Transform wrapper */}
      <div
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
        onMouseMove={(e) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const canvasX = (e.clientX - rect.left - panXRef.current) / zoomRef.current;
          const canvasY = (e.clientY - rect.top - panYRef.current) / zoomRef.current;
          setMousePos({ x: canvasX, y: canvasY });
          canvasMousePos.x = canvasX;
          canvasMousePos.y = canvasY;
          canvasMousePos.initialized = true;
          // Broadcast to collab peers
          broadcastCursor(canvasX, canvasY);
        }}
        data-canvas-wrapper="true"
      >
        <ConnectionLayer
          connections={connections}
          images={images}
          pendingFromId={connectingFromId}
          mousePos={mousePos}
          onDelete={removeConnection}
          onUpdateLabel={updateConnectionLabel}
          extraNodeRects={(() => {
            const m = new Map<string, { x: number; y: number; w: number; h: number }>();
            for (const g of godModeNodes) {
              m.set(g.id, { x: g.x, y: g.y, w: g.width, h: g.isMinimized ? 36 : 300 });
            }
            return m;
          })()}
        />

        {/* ── Category note tether lines ── */}
        <svg style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none', overflow: 'visible', zIndex: 4,
        }}>
          {boardMode === 'i2v' && categoryNotes.map(note => {
            const img = images.find(i => i.id === note.imageId);
            if (!img) return null;
            const cat = SHOT_CATEGORIES.find(c => c.id === note.categoryId);
            if (!cat) return null;
            const displayW = img.displayWidth ?? Math.min(img.width, 350);
            const displayH = img.displayHeight ?? (img.height > 0 ? (displayW / img.width) * img.height : displayW * 0.75);
            const fx = img.x + displayW;
            const fy = img.y + displayH / 2;
            const tx = note.x;
            const ty = note.y + 20;
            const cp = Math.max(40, Math.abs(tx - fx) * 0.4);
            // Use accent color if set
            const lineColor = img.accentColor || cat.color;
            const isFocusDimmed = focusedImageId && note.imageId !== focusedImageId;
            return (
              <path
                key={note.id}
                d={`M ${fx},${fy} C ${fx + cp},${fy} ${tx - cp},${ty} ${tx},${ty}`}
                fill="none"
                stroke={lineColor}
                strokeWidth={1.2}
                strokeOpacity={isFocusDimmed ? 0.05 : 0.4}
                strokeDasharray="5 4"
                style={{ transition: 'stroke-opacity 0.3s ease' }}
              />
            );
          })}
          {/* ── Edit note tether lines ── */}
          {boardMode === 'edit' && editNotes.map(note => {
            const img = images.find(i => i.id === note.imageId);
            if (!img) return null;
            const cat = EDIT_CATEGORIES.find(c => c.id === note.categoryId);
            if (!cat) return null;
            const displayW = img.displayWidth ?? Math.min(img.width, 350);
            const displayH = img.displayHeight ?? (img.height > 0 ? (displayW / img.width) * img.height : displayW * 0.75);
            const fx = img.x + displayW;
            const fy = img.y + displayH / 2;
            const tx = note.x;
            const ty = note.y + 20;
            const cp = Math.max(40, Math.abs(tx - fx) * 0.4);
            const lineColor = img.accentColor || cat.color;
            const isFocusDimmed = focusedImageId && note.imageId !== focusedImageId;
            return (
              <path
                key={`edit-${note.id}`}
                d={`M ${fx},${fy} C ${fx + cp},${fy} ${tx - cp},${ty} ${tx},${ty}`}
                fill="none"
                stroke={lineColor}
                strokeWidth={1.2}
                strokeOpacity={isFocusDimmed ? 0.05 : 0.35}
                strokeDasharray="3 5"
                style={{ transition: 'stroke-opacity 0.3s ease' }}
              />
            );
          })}
        </svg>

        {textNodes.map((node) => (
          <div
            key={node.id}
            className={focusedImageId ? 'focus-dimmed' : ''}
          >
            <TextNodeComponent
              node={node}
              onUpdate={updateTextNode}
              onDelete={removeTextNode}
              zoomScale={zoom}
              autoFocus={node.id === newNodeId}
              onFocused={() => setNewNodeId(null)}
            />
          </div>
        ))}
        {boardMode === 'i2v' && noteDisplayMode === 'canvas' && categoryNotes.map((note) => (
          <div
            key={note.id}
            className={
              focusedImageId
                ? (note.imageId === focusedImageId ? 'focus-active' : 'focus-dimmed')
                : ''
            }
          >
            <CategoryNoteNode
              note={note}
              zoomScale={zoom}
            />
          </div>
        ))}
        {boardMode === 'edit' && noteDisplayMode === 'canvas' && editNotes.map((note) => (
          <div
            key={note.id}
            className={
              focusedImageId
                ? (note.imageId === focusedImageId ? 'focus-active' : 'focus-dimmed')
                : ''
            }
          >
            <EditNoteNode
              note={note}
              zoomScale={zoom}
            />
          </div>
        ))}
        {promptNodes.map((node) => (
          <div
            key={node.id}
            className={
              focusedImageId
                ? (node.imageId === focusedImageId ? 'focus-active' : 'focus-dimmed')
                : ''
            }
          >
            <PromptNodeComponent
              node={node}
              zoomScale={zoom}
            />
          </div>
        ))}
        {godModeNodes.map((node) => (
          <GodModeNodeComponent
            key={node.id}
            node={node}
            zoomScale={zoom}
          />
        ))}
        {documentNodes.map((node) => (
          <DocumentNodeComponent
            key={node.id}
            node={node}
            zoomScale={zoom}
          />
        ))}
        {images.map((image) => (
          <div
            key={image.id}
            data-image-id={image.id}
            className={
              focusedImageId
                ? (image.id === focusedImageId ? 'focus-active' : 'focus-dimmed')
                : ''
            }
            style={{ position: 'contents' as any }}
          >
            <CanvasImage image={image} zoomScale={zoom} />
          </div>
        ))}
      </div>

      {images.length === 0 && <EmptyBoard />}

      {/* Right Sidebar (U2) */}
      <RightSidebar />

      {/* Shot Panel */}
      <ShotPanel images={images} />

      {/* Search Bar */}
      <SearchBar onJumpTo={handleSearchJump} />

      {/* Radial Context Menu (U9) */}
      <RadialContextMenu />

      {/* Session Recap (F5) */}
      {currentProjectId && <SessionRecap projectId={currentProjectId} />}

      {/* Batch Progress */}
      <BatchProgress />

      {/* Minimap */}
      {images.length > 0 && (
        <Minimap
          images={images}
          categoryNotes={categoryNotes}
          editNotes={editNotes}
          promptNodes={promptNodes}
          panX={panX}
          panY={panY}
          zoom={zoom}
          containerWidth={containerSize.w || window.innerWidth}
          containerHeight={containerSize.h || window.innerHeight}
          onJump={handleMinimapJump}
        />
      )}

      {/* Zoom indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: images.length > 0 ? 204 : 16,
          background: 'rgba(8,9,16,0.82)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10,
          padding: '4px 10px',
          fontSize: 11,
          color: '#484d60',
          fontFamily: "'JetBrains Mono', monospace",
          userSelect: 'none',
          backdropFilter: 'blur(16px) saturate(180%)',
          letterSpacing: '0.04em',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          transition: 'right 0.2s ease',
        }}
      >
        {zoomPercent}%
      </div>

      {/* Connecting status banner */}
      {connectingFromId && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(8,9,16,0.88)',
          border: '1px solid rgba(249,115,22,0.3)',
          borderRadius: 12,
          padding: '8px 18px',
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          color: '#f97316',
          userSelect: 'none',
          backdropFilter: 'blur(24px) saturate(180%)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(249,115,22,0.08)',
          animation: 'fadeInUp 0.2s ease-out',
        }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#f97316',
            boxShadow: '0 0 8px rgba(249,115,22,0.8)',
            animation: 'pulse 1.5s ease-in-out infinite',
            display: 'inline-block',
          }} />
          {IS_TOUCH_DEVICE ? 'Tap' : 'Hover'} a node's left handle to connect · {IS_TOUCH_DEVICE ? 'Tap here' : 'Esc'} to cancel
          <button
            onClick={() => { cancelConnection(); setActiveTool('select'); }}
            style={{
              marginLeft: 6,
              color: '#f97316',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              opacity: 0.7,
              padding: '4px',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.7'}
          >
            ✕
          </button>
        </div>
      )}

      {/* Text tool hint */}
      {activeTool === 'text' && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(8,9,16,0.88)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '8px 18px',
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          color: '#8891aa',
          userSelect: 'none',
          backdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          animation: 'fadeInUp 0.2s ease-out',
        }}>
          {IS_TOUCH_DEVICE ? 'Tap' : 'Click'} anywhere on the canvas to place a text note
        </div>
      )}

      {/* Focus Mode indicator */}
      {focusedImageId && (
        <div style={{
          position: 'absolute',
          top: 58,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(8,9,16,0.9)',
          border: '1px solid rgba(249,115,22,0.25)',
          borderRadius: 10,
          padding: '6px 16px',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          color: '#f97316',
          zIndex: 65,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'fadeInUp 0.2s ease-out',
          backdropFilter: 'blur(16px)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 8px rgba(249,115,22,0.6)' }} />
          Focus Mode — Esc to exit
        </div>
      )}

      {/* Futuristic Liquid Glass Toolbar */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(8,9,16,0.82)',
        backdropFilter: 'blur(28px) saturate(200%)',
        WebkitBackdropFilter: 'blur(28px) saturate(200%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        zIndex: 50,
        boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <ToolButton
          label="Select"
          shortcut="V"
          active={activeTool === 'select'}
          onClick={() => { setActiveTool('select'); cancelConnection(); }}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 0l16 12-7 2-4 8L4 0z" />
            </svg>
          }
        />
        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.07)', margin: '0 1px' }} />
        <ToolButton
          label="Connect"
          shortcut="C"
          active={activeTool === 'connect'}
          onClick={() => setActiveTool('connect')}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="7" cy="12" r="3" />
              <circle cx="17" cy="12" r="3" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          }
        />
        <ToolButton
          label="Text"
          shortcut="T"
          active={activeTool === 'text'}
          onClick={() => setActiveTool('text')}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h10M4 18h6" />
            </svg>
          }
        />
      </div>

      {/* Remote cursors (inside transform wrapper context) */}
      {useCollabStore.getState().isConnected && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: '0 0',
            pointerEvents: 'none',
            zIndex: 999,
          }}
        >
          <RemoteCursors />
        </div>
      )}

      {/* Drop zone overlay */}
      <DropOverlay containerRef={containerRef} />
    </div>
  );
}

function DropOverlay({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragOver(true);
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      if (e.relatedTarget && el.contains(e.relatedTarget as Node)) return;
      setIsDragOver(false);
    };
    const handleDrop = () => setIsDragOver(false);

    el.addEventListener('dragenter', handleDragEnter);
    el.addEventListener('dragleave', handleDragLeave);
    el.addEventListener('drop', handleDrop);

    return () => {
      el.removeEventListener('dragenter', handleDragEnter);
      el.removeEventListener('dragleave', handleDragLeave);
      el.removeEventListener('drop', handleDrop);
    };
  }, [containerRef]);

  if (!isDragOver) return null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(249,115,22,0.05)',
      border: '2px dashed rgba(249,115,22,0.4)',
      borderRadius: 12,
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: '#111',
        border: '1px solid rgba(249,115,22,0.25)',
        borderRadius: 12,
        padding: '16px 28px',
        textAlign: 'center',
        boxShadow: '0 0 32px rgba(249,115,22,0.1)',
      }}>
        <p style={{
          color: '#f97316',
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 500,
        }}>
          Drop images to add
        </p>
      </div>
    </div>
  );
}

interface ToolButtonProps {
  label: string;
  shortcut: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

function ToolButton({ label, shortcut, active, onClick, icon }: ToolButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={`${label} (${shortcut})`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        borderRadius: 8,
        fontSize: 12,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 500,
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        background: active
          ? 'rgba(249,115,22,0.15)'
          : hovered
            ? 'rgba(255,255,255,0.06)'
            : 'transparent',
        color: active ? '#f97316' : hovered ? '#d0d0d0' : '#666',
        boxShadow: active
          ? '0 0 14px rgba(249,115,22,0.18), inset 0 0 0 1px rgba(249,115,22,0.22)'
          : 'none',
        touchAction: 'manipulation',
      }}
    >
      <span style={{ color: active ? '#f97316' : hovered ? '#aaa' : '#666', lineHeight: 0 }}>
        {icon}
      </span>
      <span>{label}</span>
      {/* Hide keyboard shortcut hint on touch devices */}
      {!IS_TOUCH_DEVICE && (
        <kbd style={{
          fontSize: 9,
          padding: '1px 5px',
          borderRadius: 3,
          fontFamily: "'JetBrains Mono', monospace",
          border: `1px solid ${active ? 'rgba(249,115,22,0.28)' : 'rgba(255,255,255,0.07)'}`,
          background: active ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.03)',
          color: active ? '#f97316' : '#444',
        }}>
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
