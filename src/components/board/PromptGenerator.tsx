import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { BoardImage, CategoryNote } from '../../types';
import { SHOT_CATEGORIES } from '../../types';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { generatePrompt, type PromptResult } from '../../utils/prompt-generator';
import { useBoardStore } from '../../stores/useBoardStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useImageStore } from '../../stores/useImageStore';
import { useBlobUrl } from '../../hooks/useBlobUrl';

interface Props {
    image: BoardImage;
    notes: CategoryNote[];
    connectedImages?: BoardImage[];
}

// Small thumbnail component using useBlobUrl hook
function FrameThumb({ blobId, alt }: { blobId: string; alt: string }) {
    const url = useBlobUrl(blobId);
    if (!url) return <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }} />;
    return (
        <img
            src={url}
            alt={alt}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
    );
}

// Image picker overlay using useBlobUrl per item
function ImagePickerItem({ img, onSelect }: { img: BoardImage; onSelect: (img: BoardImage) => void }) {
    const url = useBlobUrl(img.blobId);
    return (
        <button
            onClick={() => onSelect(img)}
            onMouseDown={e => e.stopPropagation()}
            title={img.label || 'Untitled'}
            style={{
                width: 64,
                height: 64,
                borderRadius: 6,
                border: '1px solid #2a2a2a',
                background: '#111',
                overflow: 'hidden',
                cursor: 'pointer',
                padding: 0,
                position: 'relative',
                flexShrink: 0,
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#f97316';
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a';
            }}
        >
            {url ? (
                <img src={url} alt={img.label || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
                <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }} />
            )}
            {img.label && (
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.7)',
                    fontSize: 8,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: '#aaa',
                    padding: '2px 3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {img.label}
                </div>
            )}
        </button>
    );
}

const SLOT_CONFIG = {
    previousScene: { label: 'Prev Scene', icon: '◀', color: '#a78bfa', desc: 'Visual context from the previous clip' },
    firstFrame:    { label: '1st Frame',  icon: '▷', color: '#4ade80', desc: 'Exact starting state for the animation' },
    lastFrame:     { label: 'Last Frame', icon: '▶', color: '#f97316', desc: 'Target end state for the animation' },
} as const;

type SlotKey = keyof typeof SLOT_CONFIG;

export function PromptGenerator({ image, notes, connectedImages = [] }: Props) {
    const apiKey = useSettingsStore((s) => s.apiKey);
    const model = useSettingsStore((s) => s.model);
    const toggleSettings = useSettingsStore((s) => s.toggleSettings);
    const addPromptNode = useBoardStore((s) => s.addPromptNode);
    const updatePromptNode = useBoardStore((s) => s.updatePromptNode);
    const godModeNodes = useBoardStore((s) => s.godModeNodes);
    const currentProjectId = useProjectStore((s) => s.currentProjectId);
    const allImages = useImageStore((s) => s.images);

    const [showConfirm, setShowConfirm] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<PromptResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Scene context frame links
    const [showSceneContext, setShowSceneContext] = useState(false);
    const [firstFrameId, setFirstFrameId] = useState<string | null>(null);
    const [lastFrameId, setLastFrameId] = useState<string | null>(null);
    const [prevSceneId, setPrevSceneId] = useState<string | null>(null);
    const [pickerSlot, setPickerSlot] = useState<SlotKey | null>(null);

    const filledCats = new Set(notes.map(n => n.categoryId));
    const missingCount = SHOT_CATEGORIES.length - filledCats.size;
    const hasAnyNotes = notes.length > 0 && notes.some(n => n.text.trim() || n.checkedPrompts.length > 0);

    const hasAnyFrames = !!(firstFrameId || lastFrameId || prevSceneId);

    const getSlotId = (slot: SlotKey) => {
        if (slot === 'firstFrame') return firstFrameId;
        if (slot === 'lastFrame') return lastFrameId;
        return prevSceneId;
    };

    const setSlotId = (slot: SlotKey, id: string | null) => {
        if (slot === 'firstFrame') setFirstFrameId(id);
        else if (slot === 'lastFrame') setLastFrameId(id);
        else setPrevSceneId(id);
    };

    const handleClick = useCallback(() => {
        if (!apiKey) {
            toggleSettings();
            return;
        }
        if (missingCount > 0) {
            setShowConfirm(true);
        } else {
            doGenerate();
        }
    }, [apiKey, missingCount]);

    const doGenerate = useCallback(async () => {
        setShowConfirm(false);
        setIsGenerating(true);
        setError(null);
        setResult(null);

        try {
            // Build sceneContext from selected IDs
            const firstFrameImg = firstFrameId ? allImages.find(i => i.id === firstFrameId) : undefined;
            const lastFrameImg = lastFrameId ? allImages.find(i => i.id === lastFrameId) : undefined;
            const prevSceneImg = prevSceneId ? allImages.find(i => i.id === prevSceneId) : undefined;

            const sceneContext = {
                firstFrame: firstFrameImg ? { blobId: firstFrameImg.blobId, mimeType: firstFrameImg.mimeType } : undefined,
                lastFrame: lastFrameImg ? { blobId: lastFrameImg.blobId, mimeType: lastFrameImg.mimeType } : undefined,
                previousScene: prevSceneImg ? { blobId: prevSceneImg.blobId, mimeType: prevSceneImg.mimeType } : undefined,
            };

            const res = await generatePrompt(apiKey, model, image.blobId, image.mimeType, notes, connectedImages, godModeNodes, sceneContext);
            setResult(res);

            // Persist as a canvas node
            if (currentProjectId) {
                const displayW = image.displayWidth ?? Math.min(image.width, 350);
                const nodeId = await addPromptNode(
                    currentProjectId,
                    image.id,
                    res.prompt,
                    res.model,
                    'i2v',
                    image.x + displayW + 24,
                    image.y + 200,
                );
                // Store frame links on the node
                if (firstFrameId || lastFrameId || prevSceneId) {
                    await updatePromptNode(nodeId, {
                        firstFrameImageId: firstFrameId || undefined,
                        lastFrameImageId: lastFrameId || undefined,
                        previousSceneImageId: prevSceneId || undefined,
                    });
                }
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    }, [apiKey, model, image, notes, connectedImages, godModeNodes, addPromptNode, updatePromptNode, currentProjectId, firstFrameId, lastFrameId, prevSceneId, allImages]);

    const handleCopy = useCallback(async () => {
        if (!result) return;
        try {
            await navigator.clipboard.writeText(result.prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* ignore */ }
    }, [result]);

    if (!hasAnyNotes) return null;

    // Images available for picker (exclude the current image)
    const pickableImages = allImages.filter(i => i.id !== image.id);

    return (
        <>
            {/* Scene Context Slots */}
            <div style={{ marginTop: 6 }}>
                {/* Toggle header */}
                <button
                    onClick={e => { e.stopPropagation(); setShowSceneContext(v => !v); }}
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 6px',
                        background: 'transparent',
                        border: showSceneContext ? '1px solid #2a2a2a' : '1px solid #1a1a1a',
                        borderBottom: showSceneContext ? 'none' : undefined,
                        borderRadius: showSceneContext ? '6px 6px 0 0' : 6,
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#333'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = showSceneContext ? '#2a2a2a' : '#1a1a1a'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                            <rect x="2" y="2" width="8" height="8" rx="1" />
                            <rect x="14" y="2" width="8" height="8" rx="1" />
                            <rect x="2" y="14" width="8" height="8" rx="1" />
                            <rect x="14" y="14" width="8" height="8" rx="1" />
                        </svg>
                        <span style={{
                            fontSize: 9,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: '#555',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                        }}>
                            Scene Context
                        </span>
                        {hasAnyFrames && (
                            <span style={{
                                fontSize: 8,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: '#f97316',
                                background: 'rgba(249,115,22,0.1)',
                                border: '1px solid rgba(249,115,22,0.2)',
                                borderRadius: 3,
                                padding: '0px 4px',
                            }}>
                                {[firstFrameId, lastFrameId, prevSceneId].filter(Boolean).length} set
                            </span>
                        )}
                    </div>
                    <svg
                        width="8" height="8"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#444"
                        strokeWidth="2"
                        style={{ transform: showSceneContext ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>

                {/* Expanded slots */}
                {showSceneContext && (
                    <div style={{
                        border: '1px solid #2a2a2a',
                        borderTop: 'none',
                        borderRadius: '0 0 6px 6px',
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        background: '#0d0d0d',
                    }}>
                        {(Object.keys(SLOT_CONFIG) as SlotKey[]).map(slot => {
                            const cfg = SLOT_CONFIG[slot];
                            const selectedId = getSlotId(slot);
                            const selectedImg = selectedId ? allImages.find(i => i.id === selectedId) : null;
                            return (
                                <div
                                    key={slot}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    {/* Label */}
                                    <div style={{
                                        width: 62,
                                        flexShrink: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                    }}>
                                        <span style={{
                                            fontSize: 8,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            color: cfg.color,
                                            letterSpacing: '0.04em',
                                            textTransform: 'uppercase',
                                        }}>
                                            {cfg.icon} {cfg.label}
                                        </span>
                                    </div>

                                    {/* Thumbnail / Placeholder */}
                                    <button
                                        onClick={e => { e.stopPropagation(); setPickerSlot(slot); }}
                                        onMouseDown={e => e.stopPropagation()}
                                        title={selectedImg ? `${cfg.label}: ${selectedImg.label || 'Image'}` : `Click to set ${cfg.label}`}
                                        style={{
                                            width: 40,
                                            height: 28,
                                            borderRadius: 4,
                                            border: selectedImg
                                                ? `1px solid ${cfg.color}55`
                                                : '1px dashed #2a2a2a',
                                            background: '#111',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            padding: 0,
                                            flexShrink: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {selectedImg ? (
                                            <FrameThumb blobId={selectedImg.blobId} alt={cfg.label} />
                                        ) : (
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
                                                <line x1="12" y1="5" x2="12" y2="19" />
                                                <line x1="5" y1="12" x2="19" y2="12" />
                                            </svg>
                                        )}
                                    </button>

                                    {/* Selected label or hint */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <span style={{
                                            fontSize: 9,
                                            fontFamily: "'Inter', system-ui, sans-serif",
                                            color: selectedImg ? '#888' : '#333',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: 'block',
                                        }}>
                                            {selectedImg ? (selectedImg.label || 'Image') : 'Not set'}
                                        </span>
                                    </div>

                                    {/* Clear button */}
                                    {selectedImg && (
                                        <button
                                            onClick={e => { e.stopPropagation(); setSlotId(slot, null); }}
                                            onMouseDown={e => e.stopPropagation()}
                                            title="Clear"
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#444',
                                                cursor: 'pointer',
                                                padding: 2,
                                                display: 'flex',
                                                flexShrink: 0,
                                            }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#888'}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#444'}
                                        >
                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Process Prompt Button */}
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                    onClick={(e) => { e.stopPropagation(); handleClick(); }}
                    onMouseDown={e => e.stopPropagation()}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    disabled={isGenerating}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: isGenerating
                            ? '1px solid rgba(249,115,22,0.3)'
                            : isHovered
                                ? '1px solid rgba(249,115,22,0.5)'
                                : '1px solid #222',
                        background: isGenerating
                            ? 'rgba(249,115,22,0.06)'
                            : isHovered
                                ? 'rgba(249,115,22,0.08)'
                                : '#111',
                        cursor: isGenerating ? 'wait' : 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isHovered && !isGenerating
                            ? '0 0 16px rgba(249,115,22,0.12)'
                            : 'none',
                    }}
                >
                    {isGenerating ? (
                        <>
                            <div style={{
                                width: 14,
                                height: 14,
                                border: '2px solid rgba(249,115,22,0.2)',
                                borderTopColor: '#f97316',
                                borderRadius: '50%',
                                animation: 'spin 0.7s linear infinite',
                            }} />
                            <span style={{
                                fontSize: 11,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: '#f97316',
                                letterSpacing: '0.04em',
                            }}>
                                Generating...
                            </span>
                        </>
                    ) : (
                        <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isHovered ? '#f97316' : '#888'} strokeWidth="2" style={{ transition: 'stroke 0.12s ease' }}>
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span style={{
                                fontSize: 11,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: isHovered ? '#f97316' : '#aaa',
                                fontWeight: 500,
                                letterSpacing: '0.03em',
                                transition: 'color 0.12s ease',
                            }}>
                                Process Prompt
                            </span>
                            {missingCount > 0 && (
                                <span style={{
                                    fontSize: 9,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: '#666',
                                    background: '#1a1a1a',
                                    border: '1px solid #2a2a2a',
                                    borderRadius: 4,
                                    padding: '1px 5px',
                                }}>
                                    {filledCats.size}/{SHOT_CATEGORIES.length}
                                </span>
                            )}
                            {hasAnyFrames && (
                                <span style={{
                                    fontSize: 9,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: '#f97316',
                                    background: 'rgba(249,115,22,0.08)',
                                    border: '1px solid rgba(249,115,22,0.2)',
                                    borderRadius: 4,
                                    padding: '1px 5px',
                                }}>
                                    +ctx
                                </span>
                            )}
                        </>
                    )}
                </button>
            </div>

            {/* Image Picker Overlay */}
            {pickerSlot !== null && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(4px)',
                    }}
                    onClick={() => setPickerSlot(null)}
                >
                    <div
                        style={{
                            width: 420,
                            maxHeight: 480,
                            background: '#111',
                            border: '1px solid #222',
                            borderRadius: 12,
                            boxShadow: '0 16px 60px rgba(0,0,0,0.9)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '12px 14px 10px',
                            borderBottom: '1px solid #1e1e1e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{
                                    fontSize: 10,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: SLOT_CONFIG[pickerSlot].color,
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                }}>
                                    {SLOT_CONFIG[pickerSlot].icon} Set {SLOT_CONFIG[pickerSlot].label}
                                </span>
                                <span style={{
                                    fontSize: 9,
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    color: '#555',
                                }}>
                                    — {SLOT_CONFIG[pickerSlot].desc}
                                </span>
                            </div>
                            <button
                                onClick={() => setPickerSlot(null)}
                                style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: 2, display: 'flex' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#aaa'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#555'}
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Image grid */}
                        <div style={{
                            padding: 12,
                            overflowY: 'auto',
                            flex: 1,
                        }}>
                            {pickableImages.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '32px 0',
                                    color: '#444',
                                    fontSize: 12,
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                }}>
                                    No other images on the board
                                </div>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                }}>
                                    {pickableImages.map(img => (
                                        <ImagePickerItem
                                            key={img.id}
                                            img={img}
                                            onSelect={(selected) => {
                                                setSlotId(pickerSlot, selected.id);
                                                setPickerSlot(null);
                                                setShowSceneContext(true);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Confirmation Modal */}
            {showConfirm && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        animation: 'fadeInOverlay 0.2s ease-out forwards',
                    }}
                    onClick={() => setShowConfirm(false)}
                >
                    <style>{`
                        @keyframes fadeInOverlay {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes modalScaleFade {
                            from { opacity: 0; transform: scale(0.95); }
                            to { opacity: 1; transform: scale(1); }
                        }
                    `}</style>
                    <div
                        style={{
                            width: 380,
                            background: '#111',
                            border: '1px solid #222',
                            borderRadius: 14,
                            boxShadow: '0 16px 60px rgba(0,0,0,0.9)',
                            overflow: 'hidden',
                            animation: 'modalScaleFade 200ms ease-out forwards',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ padding: '20px 20px 16px' }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: 'rgba(249,115,22,0.1)',
                                border: '1px solid rgba(249,115,22,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 14,
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                            </div>

                            <h3 style={{
                                fontSize: 15,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                fontWeight: 600,
                                color: '#e5e5e5',
                                marginBottom: 8,
                            }}>
                                Incomplete Shot Notes
                            </h3>

                            <p style={{
                                fontSize: 13,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                color: '#888',
                                lineHeight: 1.5,
                                marginBottom: 16,
                            }}>
                                You have <span style={{ color: '#f97316', fontWeight: 600 }}>{missingCount}</span> of{' '}
                                {SHOT_CATEGORIES.length} categories missing. The generated prompt will only include the notes you've written.
                            </p>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                                {SHOT_CATEGORIES.filter(c => !filledCats.has(c.id)).map(cat => (
                                    <span
                                        key={cat.id}
                                        style={{
                                            fontSize: 10,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            background: `${cat.color}12`,
                                            border: `1px solid ${cat.border}`,
                                            color: cat.color,
                                            opacity: 0.6,
                                        }}
                                    >
                                        {cat.icon} {cat.label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div style={{
                            padding: '12px 20px 16px',
                            borderTop: '1px solid #1e1e1e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 8,
                        }}>
                            <button
                                onClick={() => setShowConfirm(false)}
                                style={{
                                    padding: '7px 16px',
                                    borderRadius: 8,
                                    border: '1px solid #2a2a2a',
                                    background: 'transparent',
                                    color: '#aaa',
                                    fontSize: 13,
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    cursor: 'pointer',
                                    transition: 'all 0.12s ease',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.background = '#1a1a1a';
                                    (e.currentTarget as HTMLElement).style.color = '#ddd';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                                    (e.currentTarget as HTMLElement).style.color = '#aaa';
                                }}
                            >
                                Go Back
                            </button>
                            <button
                                onClick={doGenerate}
                                style={{
                                    padding: '7px 18px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(249,115,22,0.4)',
                                    background: 'rgba(249,115,22,0.12)',
                                    color: '#f97316',
                                    fontSize: 13,
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.12s ease',
                                    boxShadow: '0 0 12px rgba(249,115,22,0.1)',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.2)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(249,115,22,0.2)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.12)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(249,115,22,0.1)';
                                }}
                            >
                                Generate Anyway
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Result Card Modal */}
            {(result || error) && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        animation: 'fadeInOverlay 0.2s ease-out forwards',
                    }}
                    onClick={() => { setResult(null); setError(null); }}
                >
                    <style>{`
                        @keyframes fadeInOverlay {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes modalScaleFade {
                            from { opacity: 0; transform: scale(0.95); }
                            to { opacity: 1; transform: scale(1); }
                        }
                    `}</style>
                    <div
                        style={{
                            width: 420,
                            borderRadius: 10,
                            border: `1px solid ${error ? '#3b1515' : '#1e3a2a'}`,
                            background: error ? '#120808' : '#0a1511',
                            boxShadow: error
                                ? '0 16px 60px rgba(239,68,68,0.2)'
                                : '0 16px 60px rgba(74,222,128,0.15)',
                            overflow: 'hidden',
                            animation: 'modalScaleFade 200ms ease-out forwards',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            padding: '8px 12px 6px',
                            borderBottom: `1px solid ${error ? '#2a1010' : '#143d24'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {error ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                                    </svg>
                                ) : (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                )}
                                <span style={{
                                    fontSize: 10,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: error ? '#ef4444' : '#4ade80',
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                }}>
                                    {error ? 'Error' : 'Generated Prompt'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {result && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                                        onMouseDown={e => e.stopPropagation()}
                                        style={{
                                            background: copied ? 'rgba(74,222,128,0.15)' : 'transparent',
                                            border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : '#2a2a2a'}`,
                                            borderRadius: 5,
                                            color: copied ? '#4ade80' : '#888',
                                            fontSize: 10,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            padding: '2px 8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.12s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                        }}
                                        onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLElement).style.color = '#e5e5e5'; }}
                                        onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLElement).style.color = '#888'; }}
                                    >
                                        {copied ? '✓ Copied' : 'Copy'}
                                    </button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setResult(null); setError(null); }}
                                    onMouseDown={e => e.stopPropagation()}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#555',
                                        cursor: 'pointer',
                                        padding: 2,
                                        display: 'flex',
                                        transition: 'color 0.12s ease',
                                    }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#aaa'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#555'}
                                >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div
                            style={{
                                padding: '10px 12px 12px',
                                fontSize: 12,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                lineHeight: 1.6,
                                color: error ? '#ef4444' : '#ccc',
                                maxHeight: 200,
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                userSelect: 'text',
                                cursor: 'text',
                            }}
                            onMouseDown={e => e.stopPropagation()}
                        >
                            {error || result?.prompt}
                        </div>

                        {result && (
                            <div style={{
                                padding: '4px 12px 8px',
                                borderTop: '1px solid #143d24',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#3a6a3a' }}>
                                    {result.model.split('/').pop()}
                                </span>
                                <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#3a6a3a' }}>
                                    {new Date(result.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
