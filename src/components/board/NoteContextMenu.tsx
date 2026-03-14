import { useState, useEffect, useRef, useCallback } from 'react';
import type { BoardImage, CategoryNote, EditNote } from '../../types';
import { useImageStore } from '../../stores/useImageStore';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { useBlobUrl } from '../../hooks/useBlobUrl';

interface NoteContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    noteId: string;
    noteType: 'category' | 'edit';
    noteScreenX: number;
    noteScreenY: number;
}

// Global state for note context menu
let _noteCtx: NoteContextMenuState = {
    visible: false, x: 0, y: 0, noteId: '', noteType: 'category',
    noteScreenX: 0, noteScreenY: 0,
};
let _setNoteCtx: ((s: NoteContextMenuState) => void) | null = null;

export function showNoteContextMenu(
    x: number, y: number,
    noteId: string, noteType: 'category' | 'edit',
    noteScreenX: number, noteScreenY: number,
) {
    _noteCtx = { visible: true, x, y, noteId, noteType, noteScreenX, noteScreenY };
    _setNoteCtx?.(_noteCtx);
}

// Thumbnail component using blob URL hook
function ImageThumb({ image, size = 40 }: { image: BoardImage; size?: number }) {
    const blobUrl = useBlobUrl(image.blobId);
    return blobUrl ? (
        image.mediaType === 'video' ? (
            <video
                src={blobUrl}
                muted
                style={{
                    width: size, height: size * 0.75, objectFit: 'cover',
                    borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)',
                    flexShrink: 0,
                }}
            />
        ) : (
            <img
                src={blobUrl}
                alt={image.label || ''}
                style={{
                    width: size, height: size * 0.75, objectFit: 'cover',
                    borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)',
                    flexShrink: 0,
                }}
            />
        )
    ) : (
        <div style={{
            width: size, height: size * 0.75, background: '#1a1a1a',
            borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
        }} />
    );
}

export function NoteContextMenu() {
    const [ctx, setCtx] = useState<NoteContextMenuState>(_noteCtx);
    const [mode, setMode] = useState<'menu' | 'picker' | 'confirm'>('menu');
    const [targetImage, setTargetImage] = useState<BoardImage | null>(null);
    const [travelAnim, setTravelAnim] = useState<{
        fromX: number; fromY: number; toX: number; toY: number; active: boolean;
    } | null>(null);

    _setNoteCtx = setCtx;

    const images = useImageStore((s) => s.images);
    const categoryNotes = useBoardStore((s) => s.categoryNotes);
    const editNotes = useBoardStore((s) => s.editNotes);
    const duplicateCategoryNoteToImage = useBoardStore((s) => s.duplicateCategoryNoteToImage);
    const duplicateEditNoteToImage = useBoardStore((s) => s.duplicateEditNoteToImage);
    const showToast = useUIStore((s) => s.showToast);

    const menuRef = useRef<HTMLDivElement>(null);

    const close = useCallback(() => {
        setCtx(prev => ({ ...prev, visible: false }));
        setMode('menu');
        setTargetImage(null);
    }, []);

    // Close on outside click
    useEffect(() => {
        if (!ctx.visible) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [ctx.visible, close]);

    if (!ctx.visible) return null;

    // Get source note info
    const sourceNote = ctx.noteType === 'category'
        ? categoryNotes.find(n => n.id === ctx.noteId)
        : editNotes.find(n => n.id === ctx.noteId);

    if (!sourceNote) return null;

    // Images other than the source image
    const otherImages = images.filter(img => img.id !== sourceNote.imageId);

    const x = Math.min(ctx.x, window.innerWidth - 300);
    const y = Math.min(ctx.y, window.innerHeight - 400);

    const handlePickImage = async (image: BoardImage) => {
        const DISPLAY_MAX_WIDTH = 350;
        const displayW = image.displayWidth ?? Math.min(image.width, DISPLAY_MAX_WIDTH);
        const noteCount = categoryNotes.filter(n => n.imageId === image.id).length +
            editNotes.filter(n => n.imageId === image.id).length;
        const targetX = image.x + displayW + 60;
        const targetY = image.y + noteCount * 180;

        const duplicateFn = ctx.noteType === 'category'
            ? duplicateCategoryNoteToImage
            : duplicateEditNoteToImage;

        const result = await duplicateFn(ctx.noteId, image.id, targetX, targetY);

        if (result.conflict) {
            setTargetImage(image);
            setMode('confirm');
            return;
        }

        if (result.success) {
            // Trigger travel animation
            const targetEl = document.querySelector(`[data-image-id="${image.id}"]`);
            const targetRect = targetEl?.getBoundingClientRect();
            if (targetRect) {
                setTravelAnim({
                    fromX: ctx.noteScreenX,
                    fromY: ctx.noteScreenY,
                    toX: targetRect.left + targetRect.width / 2,
                    toY: targetRect.top + targetRect.height / 2,
                    active: true,
                });
                setTimeout(() => setTravelAnim(null), 500);
            }
            showToast('Note duplicated');
            close();
        }
    };

    const handleOverwrite = async () => {
        if (!targetImage) return;
        const DISPLAY_MAX_WIDTH = 350;
        const displayW = targetImage.displayWidth ?? Math.min(targetImage.width, DISPLAY_MAX_WIDTH);
        const noteCount = categoryNotes.filter(n => n.imageId === targetImage.id).length +
            editNotes.filter(n => n.imageId === targetImage.id).length;
        const targetX = targetImage.x + displayW + 60;
        const targetY = targetImage.y + noteCount * 180;

        const duplicateFn = ctx.noteType === 'category'
            ? duplicateCategoryNoteToImage
            : duplicateEditNoteToImage;

        const result = await duplicateFn(ctx.noteId, targetImage.id, targetX, targetY, true);
        if (result.success) {
            showToast('Note overwritten');
            close();
        }
    };

    return (
        <>
            {/* Travel animation particle */}
            {travelAnim?.active && (
                <div
                    style={{
                        position: 'fixed',
                        left: travelAnim.fromX,
                        top: travelAnim.fromY,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: '#f97316',
                        boxShadow: '0 0 16px rgba(249,115,22,0.8), 0 0 32px rgba(249,115,22,0.4)',
                        zIndex: 9999,
                        pointerEvents: 'none',
                        animation: 'none',
                        transition: 'left 0.4s cubic-bezier(0.22, 1, 0.36, 1), top 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease, transform 0.4s ease',
                        ...(travelAnim.active ? {
                            left: travelAnim.toX,
                            top: travelAnim.toY,
                            opacity: 0,
                            transform: 'scale(2)',
                        } : {}),
                    }}
                />
            )}

            <div
                ref={menuRef}
                style={{
                    position: 'fixed',
                    zIndex: 210,
                    left: x,
                    top: y,
                    background: 'rgba(7, 8, 14, 0.94)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    boxShadow: '0 16px 48px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
                    minWidth: 260,
                    maxWidth: 320,
                    overflow: 'hidden',
                    fontFamily: "'Inter', system-ui, sans-serif",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '9px 13px 7px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                }}>
                    <span style={{
                        fontSize: 9, color: 'rgba(255,255,255,0.3)',
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
                    }}>
                        {mode === 'menu' ? 'Note Options' : mode === 'picker' ? 'Duplicate To…' : '⚠ Conflict'}
                    </span>
                    {mode !== 'menu' && (
                        <button
                            onClick={() => { setMode('menu'); setTargetImage(null); }}
                            style={{
                                marginLeft: 'auto', background: 'none', border: 'none',
                                color: '#666', cursor: 'pointer', fontSize: 9,
                                fontFamily: "'JetBrains Mono', monospace",
                            }}
                        >
                            ← Back
                        </button>
                    )}
                </div>

                {/* Main Menu */}
                {mode === 'menu' && (
                    <div style={{ padding: 4 }}>
                        <MenuButton
                            icon="📋"
                            label="Duplicate to…"
                            subtitle={`${otherImages.length} image${otherImages.length !== 1 ? 's' : ''} available`}
                            onClick={() => otherImages.length > 0 ? setMode('picker') : showToast('No other images')}
                            disabled={otherImages.length === 0}
                        />
                    </div>
                )}

                {/* Image Picker */}
                {mode === 'picker' && (
                    <div style={{ padding: 4, maxHeight: 280, overflowY: 'auto' }}>
                        {otherImages.length === 0 ? (
                            <div style={{ padding: 12, fontSize: 11, color: '#555', textAlign: 'center' }}>
                                No other images in project
                            </div>
                        ) : (
                            otherImages.map(img => {
                                // Check if this category already exists
                                const hasConflict = ctx.noteType === 'category'
                                    ? categoryNotes.some(n => n.imageId === img.id && n.categoryId === (sourceNote as CategoryNote).categoryId)
                                    : editNotes.some(n => n.imageId === img.id && n.categoryId === (sourceNote as EditNote).categoryId);

                                return (
                                    <button
                                        key={img.id}
                                        onClick={() => handlePickImage(img)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '6px 8px',
                                            borderRadius: 8,
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'background 0.12s ease',
                                            textAlign: 'left',
                                            marginBottom: 2,
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <ImageThumb image={img} size={44} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: 12, color: '#ddd',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {img.label || img.filename || 'Untitled'}
                                            </div>
                                            {hasConflict && (
                                                <div style={{
                                                    fontSize: 9, color: '#f59e0b',
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    marginTop: 2,
                                                }}>
                                                    ⚠ has this category — will ask to overwrite
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Overwrite Confirmation */}
                {mode === 'confirm' && targetImage && (
                    <div style={{ padding: 12 }}>
                        <div style={{
                            fontSize: 12, color: '#ccc', lineHeight: 1.5, marginBottom: 12,
                        }}>
                            <strong style={{ color: '#f59e0b' }}>
                                {targetImage.label || targetImage.filename || 'This image'}
                            </strong>{' '}
                            already has a note in this category. Overwrite its content with the duplicated note?
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button
                                onClick={() => { setMode('picker'); setTargetImage(null); }}
                                style={{
                                    flex: 1, padding: '7px 12px', borderRadius: 8,
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#aaa', fontSize: 12, cursor: 'pointer',
                                    transition: 'background 0.12s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleOverwrite}
                                style={{
                                    flex: 1, padding: '7px 12px', borderRadius: 8,
                                    background: 'rgba(249,115,22,0.15)',
                                    border: '1px solid rgba(249,115,22,0.3)',
                                    color: '#f97316', fontSize: 12, fontWeight: 600,
                                    cursor: 'pointer', transition: 'background 0.12s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(249,115,22,0.25)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(249,115,22,0.15)')}
                            >
                                Overwrite
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function MenuButton({
    icon, label, subtitle, onClick, disabled,
}: {
    icon: string; label: string; subtitle?: string; onClick: () => void; disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'transparent',
                border: 'none',
                color: disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)',
                fontSize: 13,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'background 0.12s ease, color 0.12s ease',
                textAlign: 'left',
            }}
            onMouseEnter={(e) => {
                if (!disabled) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.07)';
                    (e.currentTarget as HTMLElement).style.color = '#f97316';
                }
            }}
            onMouseLeave={(e) => {
                if (!disabled) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)';
                }
            }}
        >
            <span style={{ fontSize: 15 }}>{icon}</span>
            <div style={{ flex: 1 }}>
                <div>{label}</div>
                {subtitle && (
                    <div style={{
                        fontSize: 9, color: '#555', marginTop: 1,
                        fontFamily: "'JetBrains Mono', monospace",
                    }}>
                        {subtitle}
                    </div>
                )}
            </div>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
            </svg>
        </button>
    );
}
