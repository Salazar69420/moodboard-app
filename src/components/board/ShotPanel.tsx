import { useState, useCallback, useRef, useEffect } from 'react';
import type { BoardImage } from '../../types';
import { useBlobUrl } from '../../hooks/useBlobUrl';
import { useImageStore } from '../../stores/useImageStore';
import { useUIStore } from '../../stores/useUIStore';

interface ShotPanelProps {
    images: BoardImage[];
}

const ITEM_HEIGHT = 56;

function ShotThumb({ blobId, mediaType, label }: { blobId: string; mediaType?: string; label: string }) {
    const blobUrl = useBlobUrl(blobId);
    if (!blobUrl) return <div className="shot-thumb" style={{ background: '#1a1a1a' }} />;
    if (mediaType === 'video') return <video src={blobUrl} className="shot-thumb" muted />;
    return <img src={blobUrl} alt={label} className="shot-thumb" />;
}

export function ShotPanel({ images }: ShotPanelProps) {
    const isOpen = useUIStore((s) => s.isShotPanelOpen);
    const setOpen = useUIStore((s) => s.setShotPanelOpen);
    const reorderImages = useImageStore((s) => s.reorderImages);
    const showToast = useUIStore((s) => s.showToast);

    const [items, setItems] = useState<BoardImage[]>([]);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [overIdx, setOverIdx] = useState<number | null>(null);
    const [dragOffset, setDragOffset] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);

    // Sync items when images change
    useEffect(() => {
        setItems([...images].sort((a, b) => (a.shotOrder ?? 0) - (b.shotOrder ?? 0)));
    }, [images]);

    const getPreviewOrder = useCallback(() => {
        if (dragIdx === null || overIdx === null || dragIdx === overIdx) return items;
        const result = [...items];
        const [moved] = result.splice(dragIdx, 1);
        result.splice(overIdx, 0, moved);
        return result;
    }, [items, dragIdx, overIdx]);

    const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
        e.preventDefault();
        e.stopPropagation();

        const startY = e.clientY;
        const scrollTop = containerRef.current?.scrollTop ?? 0;
        isDraggingRef.current = false;

        setDragIdx(idx);
        setOverIdx(idx);
        setDragOffset(0);

        const handleMove = (ev: PointerEvent) => {
            const dy = ev.clientY - startY;
            const scrollDelta = (containerRef.current?.scrollTop ?? 0) - scrollTop;
            setDragOffset(dy + scrollDelta);
            isDraggingRef.current = true;

            // Compute which index the dragged item is over
            const totalDy = dy + scrollDelta;
            const indexShift = Math.round(totalDy / ITEM_HEIGHT);
            const newOver = Math.max(0, Math.min(items.length - 1, idx + indexShift));
            setOverIdx(newOver);
        };

        const handleUp = () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);

            if (isDraggingRef.current && dragIdx !== null) {
                // Apply the reorder
                const totalDy = (containerRef.current?.scrollTop ?? 0) - scrollTop;
                const indexShift = Math.round((totalDy + ((window as any).__lastDy ?? 0)) / ITEM_HEIGHT);
                const finalOver = Math.max(0, Math.min(items.length - 1, idx + indexShift));

                if (finalOver !== idx) {
                    const result = [...items];
                    const [moved] = result.splice(idx, 1);
                    result.splice(finalOver, 0, moved);
                    reorderImages(result.map(i => i.id));
                    showToast(`Shot ${idx + 1} → ${finalOver + 1}`);
                }
            }

            setDragIdx(null);
            setOverIdx(null);
            setDragOffset(0);
            isDraggingRef.current = false;
        };

        // Track the last dy for use in handleUp
        const wrappedMove = (ev: PointerEvent) => {
            (window as any).__lastDy = ev.clientY - startY;
            handleMove(ev);
        };

        window.addEventListener('pointermove', wrappedMove);
        window.addEventListener('pointerup', handleUp);
    }, [items, reorderImages, showToast]);

    if (!isOpen) return null;

    const previewOrder = getPreviewOrder();

    return (
        <div
            className="shot-panel"
            ref={containerRef}
            style={{
                // Override animation if already visible
                animation: 'panelSlideIn 0.25s ease-out',
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 6px 10px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                marginBottom: 6,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                    <span style={{
                        fontSize: 10,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: 'rgba(255,255,255,0.4)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                    }}>
                        Shot Sequence
                    </span>
                </div>
                <button
                    onClick={() => setOpen(false)}
                    title="Close panel"
                    style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: '#666',
                        cursor: 'pointer',
                        fontSize: 11,
                        padding: '3px 6px',
                        borderRadius: 5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                        (e.currentTarget as HTMLElement).style.color = '#aaa';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                        (e.currentTarget as HTMLElement).style.color = '#666';
                    }}
                >
                    ✕
                </button>
            </div>

            {/* Film strip perforations (U10) */}
            <div style={{
                position: 'absolute',
                left: 0,
                top: 44,
                bottom: 0,
                width: 6,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '8px 0',
                alignItems: 'center',
                pointerEvents: 'none',
                opacity: 0.5,
            }}>
                {Array.from({ length: Math.max(items.length * 2, 8) }).map((_, i) => (
                    <div key={i} className="film-strip-perf" />
                ))}
            </div>

            {items.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '32px 12px',
                    color: '#444',
                    fontSize: 11,
                    lineHeight: 1.6,
                }}>
                    <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.4 }}>🎬</div>
                    <div>No images yet</div>
                    <div style={{ fontSize: 9, color: '#333', marginTop: 4 }}>
                        Import images to build your shot sequence
                    </div>
                </div>
            ) : (
                <div style={{ position: 'relative' }}>
                    {previewOrder.map((img, displayIdx) => {
                        const isBeingDragged = dragIdx !== null && items[dragIdx]?.id === img.id;
                        const originalIdx = items.findIndex(i => i.id === img.id);

                        return (
                            <div
                                key={img.id}
                                onPointerDown={(e) => handlePointerDown(e, originalIdx)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '6px 6px',
                                    borderRadius: 8,
                                    cursor: isBeingDragged ? 'grabbing' : 'grab',
                                    border: '1px solid transparent',
                                    marginBottom: 2,
                                    position: 'relative',
                                    zIndex: isBeingDragged ? 100 : 1,
                                    transform: isBeingDragged ? `translateY(${dragOffset}px)` : 'translateY(0)',
                                    transition: isBeingDragged ? 'none' : 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.15s ease',
                                    background: isBeingDragged
                                        ? 'rgba(249,115,22,0.08)'
                                        : 'transparent',
                                    borderColor: isBeingDragged
                                        ? 'rgba(249,115,22,0.3)'
                                        : 'transparent',
                                    boxShadow: isBeingDragged
                                        ? '0 4px 16px rgba(0,0,0,0.4), 0 0 8px rgba(249,115,22,0.15)'
                                        : 'none',
                                    opacity: isBeingDragged ? 0.95 : 1,
                                    touchAction: 'none',
                                    userSelect: 'none',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isBeingDragged) {
                                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isBeingDragged) {
                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                        (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                                    }
                                }}
                            >
                                {/* Shot number */}
                                <span style={{
                                    fontSize: 10,
                                    fontFamily: "'DM Serif Display', serif",
                                    color: isBeingDragged ? '#f97316' : '#555',
                                    minWidth: 18,
                                    textAlign: 'center',
                                    fontWeight: isBeingDragged ? 700 : 400,
                                    transition: 'color 0.15s ease',
                                    flexShrink: 0,
                                    letterSpacing: '0.02em',
                                }}>
                                    {String(displayIdx + 1).padStart(2, '0')}
                                </span>

                                {/* Thumbnail */}
                                <ShotThumb blobId={img.blobId} mediaType={img.mediaType} label={img.label || ''} />

                                {/* Label */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{
                                        fontSize: 11,
                                        color: '#aaa',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        display: 'block',
                                    }}>
                                        {img.label || img.filename || 'Untitled'}
                                    </span>
                                </div>

                                {/* Drag handle indicator */}
                                <svg
                                    width="10" height="10" viewBox="0 0 24 24" fill="none"
                                    stroke={isBeingDragged ? '#f97316' : '#444'}
                                    strokeWidth="3"
                                    style={{ flexShrink: 0, opacity: 0.6, transition: 'stroke 0.15s ease' }}
                                >
                                    <line x1="4" y1="8" x2="20" y2="8" />
                                    <line x1="4" y1="12" x2="20" y2="12" />
                                    <line x1="4" y1="16" x2="20" y2="16" />
                                </svg>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer */}
            {items.length > 0 && (
                <div style={{
                    padding: '10px 6px 6px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    marginTop: 6,
                    fontSize: 9,
                    color: '#444',
                    fontFamily: "'JetBrains Mono', monospace",
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2">
                        <polyline points="5 9 2 12 5 15" />
                        <polyline points="9 5 12 2 15 5" />
                        <polyline points="19 9 22 12 19 15" />
                        <polyline points="9 19 12 22 15 19" />
                    </svg>
                    {items.length} shot{items.length !== 1 ? 's' : ''} · drag to reorder
                </div>
            )}
        </div>
    );
}
