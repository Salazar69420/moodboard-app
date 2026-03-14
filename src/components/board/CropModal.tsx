import { useRef, useState, useCallback, useEffect } from 'react';
import type { BoardImage } from '../../types';
import { getBlob } from '../../utils/db-operations';
import { useImageStore } from '../../stores/useImageStore';
import { useUIStore } from '../../stores/useUIStore';

interface InlineCropOverlayProps {
    image: BoardImage;
    displayW: number;
    displayH: number;
    zoomScale: number;
}

type HandleId = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br';

interface CropRect {
    x: number; // fraction 0..1
    y: number;
    w: number;
    h: number;
}

const HANDLE_SIZE = 10;

// Pre-built aspect ratio presets
const ASPECT_PRESETS: { label: string; ratio: number | null }[] = [
    { label: 'Free', ratio: null },
    { label: '16:9', ratio: 16 / 9 },
    { label: '9:16', ratio: 9 / 16 },
    { label: '4:3', ratio: 4 / 3 },
    { label: '3:4', ratio: 3 / 4 },
    { label: '1:1', ratio: 1 },
    { label: '21:9', ratio: 21 / 9 },
    { label: '4:5', ratio: 4 / 5 },
];

export function InlineCropOverlay({ image, displayW, displayH, zoomScale }: InlineCropOverlayProps) {
    const updateImageBlob = useImageStore((s) => s.updateImageBlob);
    const showToast = useUIStore((s) => s.showToast);
    const setCroppingImage = useUIStore((s) => s.setCroppingImage);

    // Crop rect in fractional coords (0..1)
    const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 1, h: 1 });
    const [hasMoved, setHasMoved] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedRatio, setSelectedRatio] = useState<number | null>(null); // null = free
    const [isApplying, setIsApplying] = useState(false);

    const dragging = useRef<{
        handle: HandleId | 'move';
        startX: number;
        startY: number;
        startCrop: CropRect;
    } | null>(null);

    const invZoom = 1 / zoomScale;

    const dxToFrac = useCallback((dx: number) => (dx * invZoom) / displayW, [invZoom, displayW]);
    const dyToFrac = useCallback((dy: number) => (dy * invZoom) / displayH, [invZoom, displayH]);

    // Clamp crop to valid range
    const clampCrop = useCallback((c: CropRect): CropRect => {
        const MIN = 16 / Math.max(image.width, image.height);
        let { x, y, w, h } = c;
        w = Math.max(MIN, Math.min(w, 1));
        h = Math.max(MIN, Math.min(h, 1));
        x = Math.max(0, Math.min(x, 1 - w));
        y = Math.max(0, Math.min(y, 1 - h));
        return { x, y, w, h };
    }, [image.width, image.height]);

    // Apply an aspect ratio to the current crop
    const applyAspectRatio = useCallback((ratio: number | null) => {
        setSelectedRatio(ratio);
        if (ratio === null) return;

        // The ratio is in display-space (width:height), but our crop fractions
        // are relative to the image's full pixel dimensions.
        // targetRatio = (crop.w * imgW) / (crop.h * imgH)
        // So crop.w / crop.h = ratio * (imgH / imgW)
        const imgAspect = image.width / image.height;
        const fracRatio = ratio / imgAspect; // crop.w / crop.h in frac space

        setCrop(prev => {
            let { x, y, w, h } = prev;
            const cx = x + w / 2;
            const cy = y + h / 2;

            // Try to keep the same center, adjust w/h
            if (fracRatio > 1) {
                // wider than tall in frac space
                w = Math.min(1, h * fracRatio);
                h = w / fracRatio;
            } else {
                h = Math.min(1, w / fracRatio);
                w = h * fracRatio;
            }

            // Re-center
            x = cx - w / 2;
            y = cy - h / 2;

            return clampCrop({ x, y, w, h });
        });
        setHasMoved(true);
    }, [image.width, image.height, clampCrop]);

    // Pointer handlers
    const handlePointerDown = useCallback((handle: HandleId | 'move', e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragging.current = {
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startCrop: { ...crop },
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [crop]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragging.current) return;
        e.stopPropagation();
        const { handle, startX, startY, startCrop } = dragging.current;
        const rawDx = e.clientX - startX;
        const rawDy = e.clientY - startY;
        const dfx = dxToFrac(rawDx);
        const dfy = dyToFrac(rawDy);

        if (Math.abs(rawDx) > 2 || Math.abs(rawDy) > 2) setHasMoved(true);

        let newCrop: CropRect;

        if (handle === 'move') {
            newCrop = clampCrop({
                x: startCrop.x + dfx,
                y: startCrop.y + dfy,
                w: startCrop.w,
                h: startCrop.h,
            });
        } else {
            let left = startCrop.x;
            let top = startCrop.y;
            let right = startCrop.x + startCrop.w;
            let bottom = startCrop.y + startCrop.h;

            if (handle.includes('l')) left = startCrop.x + dfx;
            if (handle.includes('r')) right = startCrop.x + startCrop.w + dfx;
            if (handle.includes('t')) top = startCrop.y + dfy;
            if (handle.includes('b')) bottom = startCrop.y + startCrop.h + dfy;
            if (handle === 'ml') left = startCrop.x + dfx;
            if (handle === 'mr') right = startCrop.x + startCrop.w + dfx;
            if (handle === 'tc') top = startCrop.y + dfy;
            if (handle === 'bc') bottom = startCrop.y + startCrop.h + dfy;

            let w = right - left;
            let h = bottom - top;

            // Enforce aspect ratio
            if (selectedRatio !== null) {
                const imgAspect = image.width / image.height;
                const fracRatio = selectedRatio / imgAspect;
                if (Math.abs(rawDx) > Math.abs(rawDy)) {
                    h = w / fracRatio;
                } else {
                    w = h * fracRatio;
                }
                if (handle.includes('l')) left = right - w;
                if (handle.includes('t')) top = bottom - h;
            }

            newCrop = clampCrop({ x: left, y: top, w, h });
        }

        setCrop(newCrop);
    }, [dxToFrac, dyToFrac, clampCrop, selectedRatio, image.width, image.height]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        dragging.current = null;
    }, []);

    // Apply crop
    const applyCrop = useCallback(async () => {
        setIsApplying(true);
        try {
            const blob = await getBlob(image.blobId);
            if (!blob) throw new Error('Blob not found');

            const bitmap = await createImageBitmap(blob);
            const cx = Math.round(crop.x * image.width);
            const cy = Math.round(crop.y * image.height);
            const cw = Math.max(1, Math.round(crop.w * image.width));
            const ch = Math.max(1, Math.round(crop.h * image.height));
            const canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(bitmap, cx, cy, cw, ch, 0, 0, cw, ch);
            bitmap.close();

            const newBlob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Crop export failed'));
                }, 'image/png');
            });

            await updateImageBlob(image.id, newBlob, cw, ch);
            showToast('Image cropped');
            setCroppingImage(null);
        } catch (err) {
            console.error('Crop failed:', err);
            showToast('Crop failed');
            setIsApplying(false);
        }
    }, [crop, image, updateImageBlob, showToast, setCroppingImage]);

    // Cancel
    const handleCancel = useCallback(() => {
        setCroppingImage(null);
    }, [setCroppingImage]);

    // Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                if (showConfirm) setShowConfirm(false);
                else handleCancel();
            }
        };
        window.addEventListener('keydown', handler, true);
        return () => window.removeEventListener('keydown', handler, true);
    }, [handleCancel, showConfirm]);

    // Screen-space crop rectangle
    const cropLeft = crop.x * displayW;
    const cropTop = crop.y * displayH;
    const cropW = crop.w * displayW;
    const cropH = crop.h * displayH;

    // Pixel dimensions
    const pixW = Math.round(crop.w * image.width);
    const pixH = Math.round(crop.h * image.height);

    // Handle positions
    const handles: { id: HandleId; cx: number; cy: number; cursor: string }[] = [
        { id: 'tl', cx: cropLeft, cy: cropTop, cursor: 'nwse-resize' },
        { id: 'tc', cx: cropLeft + cropW / 2, cy: cropTop, cursor: 'ns-resize' },
        { id: 'tr', cx: cropLeft + cropW, cy: cropTop, cursor: 'nesw-resize' },
        { id: 'ml', cx: cropLeft, cy: cropTop + cropH / 2, cursor: 'ew-resize' },
        { id: 'mr', cx: cropLeft + cropW, cy: cropTop + cropH / 2, cursor: 'ew-resize' },
        { id: 'bl', cx: cropLeft, cy: cropTop + cropH, cursor: 'nesw-resize' },
        { id: 'bc', cx: cropLeft + cropW / 2, cy: cropTop + cropH, cursor: 'ns-resize' },
        { id: 'br', cx: cropLeft + cropW, cy: cropTop + cropH, cursor: 'nwse-resize' },
    ];

    // Applying overlay — shows while processing
    if (isApplying) {
        return (
            <>
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    zIndex: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                        animation: 'fadeIn 0.2s ease-out',
                    }}>
                        <div style={{
                            width: 28,
                            height: 28,
                            border: '2.5px solid rgba(249,115,22,0.2)',
                            borderTopColor: '#f97316',
                            borderRadius: '50%',
                            animation: 'spin 0.7s linear infinite',
                        }} />
                        <span style={{
                            fontSize: 11,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: 'rgba(249,115,22,0.8)',
                            letterSpacing: '0.05em',
                        }}>
                            Cropping…
                        </span>
                    </div>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </>
        );
    }

    return (
        <>
            {/* Dark overlay regions (outside the crop box) */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30, borderRadius: 8, overflow: 'hidden' }}>
                {/* Top */}
                <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: cropTop, background: 'rgba(0,0,0,0.6)' }} />
                {/* Bottom */}
                <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: displayH - cropTop - cropH, background: 'rgba(0,0,0,0.6)' }} />
                {/* Left */}
                <div style={{ position: 'absolute', left: 0, top: cropTop, width: cropLeft, height: cropH, background: 'rgba(0,0,0,0.6)' }} />
                {/* Right */}
                <div style={{ position: 'absolute', right: 0, top: cropTop, width: displayW - cropLeft - cropW, height: cropH, background: 'rgba(0,0,0,0.6)' }} />
            </div>

            {/* Crop box border + move area */}
            <div
                style={{
                    position: 'absolute',
                    left: cropLeft,
                    top: cropTop,
                    width: cropW,
                    height: cropH,
                    border: '1.5px solid rgba(249,115,22,0.85)',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.4), 0 0 12px rgba(249,115,22,0.15)',
                    cursor: 'move',
                    zIndex: 31,
                }}
                onPointerDown={(e) => handlePointerDown('move', e)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {/* Rule of thirds */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.15)' }} />
                </div>
            </div>

            {/* Resize handles */}
            {handles.map((h) => (
                <div
                    key={h.id}
                    style={{
                        position: 'absolute',
                        left: h.cx - HANDLE_SIZE / 2,
                        top: h.cy - HANDLE_SIZE / 2,
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        background: 'rgba(249,115,22,0.9)',
                        border: '1.5px solid rgba(255,255,255,0.7)',
                        borderRadius: 2,
                        cursor: h.cursor,
                        boxShadow: '0 0 6px rgba(249,115,22,0.5)',
                        zIndex: 32,
                    }}
                    onPointerDown={(e) => handlePointerDown(h.id, e)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                />
            ))}

            {/* ── Floating crop toolbar below the image ── */}
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: -56,
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 6px',
                    background: 'rgba(8,9,16,0.95)',
                    backdropFilter: 'blur(24px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(200%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
                    zIndex: 35,
                    whiteSpace: 'nowrap',
                    animation: 'fadeIn 0.15s ease-out',
                }}
                onPointerDown={(e) => e.stopPropagation()}
            >
                {/* Dimension badge */}
                <span style={{
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: 'rgba(255,255,255,0.4)',
                    letterSpacing: '0.03em',
                    padding: '0 4px',
                }}>
                    {pixW}×{pixH}
                </span>

                <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />

                {/* Aspect ratio presets */}
                {ASPECT_PRESETS.map(p => {
                    const isActive = p.ratio === selectedRatio;
                    return (
                        <button
                            key={p.label}
                            onClick={() => applyAspectRatio(p.ratio)}
                            style={{
                                padding: '3px 6px',
                                borderRadius: 5,
                                border: `1px solid ${isActive ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.06)'}`,
                                background: isActive ? 'rgba(249,115,22,0.15)' : 'transparent',
                                color: isActive ? '#f97316' : 'rgba(255,255,255,0.35)',
                                fontSize: 9,
                                fontWeight: 600,
                                fontFamily: "'JetBrains Mono', monospace",
                                cursor: 'pointer',
                                transition: 'all 0.12s ease',
                                lineHeight: 1,
                            }}
                            onMouseEnter={e => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
                                }
                            }}
                        >
                            {p.label}
                        </button>
                    );
                })}

                <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />

                {/* Cancel */}
                <button
                    onClick={handleCancel}
                    style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', monospace",
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                        e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                    }}
                >
                    ✕
                </button>

                {/* Crop apply */}
                <button
                    onClick={() => {
                        if (hasMoved) setShowConfirm(true);
                        else handleCancel();
                    }}
                    disabled={!hasMoved}
                    style={{
                        padding: '4px 12px',
                        borderRadius: 6,
                        border: '1px solid rgba(249,115,22,0.4)',
                        background: hasMoved ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.03)',
                        color: hasMoved ? '#f97316' : 'rgba(255,255,255,0.25)',
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        cursor: hasMoved ? 'pointer' : 'not-allowed',
                        transition: 'all 0.12s ease',
                        boxShadow: hasMoved ? '0 0 8px rgba(249,115,22,0.1)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                    }}
                    onMouseEnter={e => {
                        if (hasMoved) {
                            e.currentTarget.style.background = 'rgba(249,115,22,0.25)';
                            e.currentTarget.style.boxShadow = '0 0 14px rgba(249,115,22,0.2)';
                        }
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = hasMoved ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.boxShadow = hasMoved ? '0 0 8px rgba(249,115,22,0.1)' : 'none';
                    }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Crop
                </button>
            </div>

            {/* Confirmation dialog overlay */}
            {showConfirm && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 40,
                        background: 'rgba(0,0,0,0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8,
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <div
                        style={{
                            background: 'rgba(10,11,18,0.96)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 12,
                            padding: '18px 22px',
                            maxWidth: 250,
                            boxShadow: '0 16px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
                            animation: 'fadeIn 0.15s ease-out',
                        }}
                    >
                        <div style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#fff',
                            marginBottom: 6,
                        }}>
                            Apply crop?
                        </div>
                        <div style={{
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.4)',
                            lineHeight: 1.5,
                            marginBottom: 16,
                        }}>
                            This will permanently trim the image.
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                                onClick={() => setShowConfirm(false)}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: 6,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'transparent',
                                    color: 'rgba(255,255,255,0.5)',
                                    fontSize: 11,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    cursor: 'pointer',
                                    transition: 'all 0.12s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                            >
                                No
                            </button>
                            <button
                                onClick={applyCrop}
                                style={{
                                    padding: '5px 14px',
                                    borderRadius: 6,
                                    border: '1px solid rgba(249,115,22,0.4)',
                                    background: 'rgba(249,115,22,0.15)',
                                    color: '#f97316',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    cursor: 'pointer',
                                    transition: 'all 0.12s ease',
                                    boxShadow: '0 0 10px rgba(249,115,22,0.12)',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(249,115,22,0.25)';
                                    e.currentTarget.style.boxShadow = '0 0 16px rgba(249,115,22,0.25)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(249,115,22,0.15)';
                                    e.currentTarget.style.boxShadow = '0 0 10px rgba(249,115,22,0.12)';
                                }}
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
