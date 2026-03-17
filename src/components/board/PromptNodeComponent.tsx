import { useRef, useState, useCallback, useEffect } from 'react';
import type { PromptNode } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';
import { useImageStore } from '../../stores/useImageStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { generatePrompt } from '../../utils/prompt-generator';
import { generateEditPrompt } from '../../utils/edit-prompt-generator';
import type { GodModeNode } from '../../types';
import { useBlobUrl } from '../../hooks/useBlobUrl';

// Small thumbnail for scene context strip
function NodeFrameThumb({ blobId, label, color }: { blobId: string; label: string; color: string }) {
    const url = useBlobUrl(blobId);
    return (
        <div title={label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${color}33`,
            borderRadius: 5,
            padding: '2px 5px 2px 2px',
            flexShrink: 0,
        }}>
            <div style={{ width: 24, height: 18, borderRadius: 3, overflow: 'hidden', background: '#111', flexShrink: 0 }}>
                {url && <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <span style={{
                fontSize: 8,
                fontFamily: "'JetBrains Mono', monospace",
                color,
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
            }}>
                {label}
            </span>
        </div>
    );
}

interface Props {
    node: PromptNode;
    zoomScale?: number;
}

const DRAG_THRESHOLD = 4;
const IS_TOUCH = typeof window !== 'undefined' && navigator.maxTouchPoints > 0;

const TYPE_CONFIG = {
    i2v: { label: 'I2V PROMPT', color: '#f97316', border: 'rgba(249,115,22,', glow: 'rgba(249,115,22,' },
    edit: { label: 'IMAGE PROMPT', color: '#22d3ee', border: 'rgba(34,211,238,', glow: 'rgba(34,211,238,' },
};

export function PromptNodeComponent({ node, zoomScale = 1 }: Props) {
    const updatePromptNode = useBoardStore((s) => s.updatePromptNode);
    const removePromptNode = useBoardStore((s) => s.removePromptNode);
    const regeneratePromptNode = useBoardStore((s) => s.regeneratePromptNode);
    const restorePromptVersion = useBoardStore((s) => s.restorePromptVersion);
    const boardMode = useBoardStore((s) => s.boardMode);
    const categoryNotes = useBoardStore((s) => s.categoryNotes);
    const editNotes = useBoardStore((s) => s.editNotes);
    const godModeNodes = useBoardStore((s) => s.godModeNodes);
    const images = useImageStore((s) => s.images);
    const connections = useBoardStore((s) => s.connections);

    const apiKey = useSettingsStore((s) => s.apiKey);
    const model = useSettingsStore((s) => s.model);

    const cfg = TYPE_CONFIG[node.promptType];

    const [isHovered, setIsHovered] = useState(false);
    const [isMinimized, setIsMinimized] = useState(node.isMinimized);
    const [animatingMinimize, setAnimatingMinimize] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copiedHistoryIdx, setCopiedHistoryIdx] = useState<number | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);

    // Only show i2v prompts in i2v mode, edit prompts in edit mode
    const isVisible = node.promptType === boardMode;

    // F2: Outdated prompt detection
    // Simple check: if any note for the parent image was updated after the prompt was created
    const isOutdated = (() => {
      const imageNotes = node.promptType === 'i2v'
        ? categoryNotes.filter(n => n.imageId === node.imageId)
        : editNotes.filter(n => n.imageId === node.imageId);
      // A prompt is "outdated" if notes exist and any note has content
      // but the prompt was generated before any note was last modified
      // Since we don't track note update timestamps, we use a heuristic:
      // compare current note text concatenation vs what it was at generation time
      const currentNotesHash = imageNotes.map(n => n.text || '').sort().join('|');
      const generatedNotesHash = (node as any)._notesHash;
      if (!generatedNotesHash) return false; // first generation, not outdated
      return currentNotesHash !== generatedNotesHash;
    })();

    const history = node.history || [];

    const dragRef = useRef<{
        startX: number; startY: number;
        startNodeX: number; startNodeY: number;
        hasMoved: boolean;
        pointerId: number;
    } | null>(null);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        if ((e.target as HTMLElement).closest('[data-scrollable]')) return;
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        dragRef.current = {
            startX: e.clientX, startY: e.clientY,
            startNodeX: node.x, startNodeY: node.y,
            hasMoved: false,
            pointerId: e.pointerId,
        };

        const handlePointerMove = (mv: PointerEvent) => {
            const drag = dragRef.current;
            if (!drag || mv.pointerId !== drag.pointerId) return;
            const dx = mv.clientX - drag.startX;
            const dy = mv.clientY - drag.startY;
            if (!drag.hasMoved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
            drag.hasMoved = true;
            updatePromptNode(node.id, {
                x: drag.startNodeX + dx / zoomScale,
                y: drag.startNodeY + dy / zoomScale,
            });
        };

        const handlePointerUp = (up: PointerEvent) => {
            if (!dragRef.current || up.pointerId !== dragRef.current.pointerId) return;
            dragRef.current = null;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    }, [node.id, node.x, node.y, zoomScale, updatePromptNode]);

    const handleToggleMinimize = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setAnimatingMinimize(true);
        const newState = !isMinimized;
        setIsMinimized(newState);
        updatePromptNode(node.id, { isMinimized: newState });
        setTimeout(() => setAnimatingMinimize(false), 400);
    }, [isMinimized, node.id, updatePromptNode]);

    const handleCopy = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(node.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* ignore */ }
    }, [node.text]);

    // ─── Regeneration ─────────────────────────────────────────────────
    const handleRegenerate = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!apiKey || isRegenerating) return;

        setIsRegenerating(true);

        try {
            // Find the parent image
            const parentImage = images.find(img => img.id === node.imageId);
            if (!parentImage) throw new Error('Image not found');

            // Find connected images
            const connectedImageIds = connections
                .filter(c => c.fromId === node.imageId || c.toId === node.imageId)
                .map(c => c.fromId === node.imageId ? c.toId : c.fromId);
            const connectedImages = images.filter(img => connectedImageIds.includes(img.id));

            let newText: string;
            let newModel: string;

            const activeGodNodes = godModeNodes.filter((g: GodModeNode) => g.isEnabled && g.text.trim());
            if (node.promptType === 'i2v') {
                const notes = categoryNotes.filter(n => n.imageId === node.imageId);
                // Rebuild scene context from stored IDs
                const sceneContext: import('../../utils/prompt-generator').SceneContextImages = {};
                if (node.firstFrameImageId) {
                    const img = images.find(i => i.id === node.firstFrameImageId);
                    if (img) sceneContext.firstFrame = { blobId: img.blobId, mimeType: img.mimeType };
                }
                if (node.lastFrameImageId) {
                    const img = images.find(i => i.id === node.lastFrameImageId);
                    if (img) sceneContext.lastFrame = { blobId: img.blobId, mimeType: img.mimeType };
                }
                if (node.previousSceneImageId) {
                    const img = images.find(i => i.id === node.previousSceneImageId);
                    if (img) sceneContext.previousScene = { blobId: img.blobId, mimeType: img.mimeType };
                }
                const result = await generatePrompt(apiKey, model, parentImage.blobId, parentImage.mimeType, notes, connectedImages, activeGodNodes, sceneContext);
                newText = result.prompt;
                newModel = result.model;
            } else {
                const notes = editNotes.filter(n => n.imageId === node.imageId);
                const result = await generateEditPrompt(apiKey, model, parentImage.blobId, parentImage.mimeType, notes, connectedImages, activeGodNodes);
                newText = result.prompt;
                newModel = result.model;
            }

            await regeneratePromptNode(node.id, newText, newModel);
        } catch (err) {
            console.error('Regeneration failed:', err);
        } finally {
            setIsRegenerating(false);
        }
    }, [apiKey, model, node, images, connections, categoryNotes, editNotes, regeneratePromptNode, isRegenerating]);

    const handleRestoreVersion = useCallback(async (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        await restorePromptVersion(node.id, index);
    }, [node.id, restorePromptVersion]);

    const handleCopyHistoryEntry = useCallback(async (e: React.MouseEvent, text: string, index: number) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            setCopiedHistoryIdx(index);
            setTimeout(() => setCopiedHistoryIdx(null), 1500);
        } catch { /* ignore */ }
    }, []);

    const handleDeleteHistoryEntry = useCallback(async (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        const newHistory = (node.history || []).filter((_, i) => i !== index);
        await updatePromptNode(node.id, { history: newHistory });
    }, [node.id, node.history, updatePromptNode]);

    const createdTime = new Date(node.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div
            className="absolute select-none"
            style={{
                left: node.x,
                top: node.y,
                width: isMinimized ? 'auto' : node.width,
                zIndex: isHovered ? 40 : isMinimized ? 10 : 22,
                opacity: mounted && isVisible ? 1 : 0,
                pointerEvents: isVisible ? 'auto' : 'none',
                transform: mounted && isVisible ? 'scale(1) translateZ(0)' : 'scale(0.88) translateZ(0)',
                transition: 'opacity 350ms cubic-bezier(0.22, 1, 0.36, 1), transform 400ms cubic-bezier(0.22, 1, 0.36, 1)',
                touchAction: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            onWheel={(e) => e.stopPropagation()}
        >
            <div
                className={isOutdated ? 'prompt-outdated' : ''}
                style={{
                    borderRadius: isMinimized ? 10 : 14,
                    border: `1px solid ${isHovered
                        ? `${cfg.border}0.35)`
                        : isOutdated
                          ? 'rgba(248,113,113,0.3)'
                          : `${cfg.border}0.18)`}`,
                    background: 'rgba(7, 8, 14, 0.92)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    boxShadow: isHovered
                        ? `0 0 0 1px ${cfg.glow}0.12), 0 0 28px ${cfg.glow}0.12), 0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)`
                        : `0 4px 24px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.04)`,
                    overflow: 'hidden',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, border-radius 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMinimized ? '7px 11px' : '8px 11px 7px',
                        background: isHovered
                            ? `linear-gradient(135deg, ${cfg.glow}0.12) 0%, ${cfg.glow}0.06) 100%)`
                            : `${cfg.glow}0.07)`,
                        borderBottom: isMinimized ? 'none' : `1px solid ${cfg.border}0.14)`,
                        cursor: 'move',
                        gap: 6,
                        transition: 'padding 0.35s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s ease',
                        touchAction: 'none',
                    }}
                    onPointerDown={handlePointerDown}
                >
                    {/* Icon + label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.5">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span style={{
                            fontSize: 10,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 700,
                            color: cfg.color,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                        }}>
                            {cfg.label}
                        </span>
                        {isMinimized && (
                            <span style={{
                                fontSize: 9,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: 'rgba(255,255,255,0.25)',
                                whiteSpace: 'nowrap',
                            }}>
                                {createdTime}
                            </span>
                        )}
                        {/* History indicator badge */}
                        {history.length > 0 && (
                            <span style={{
                                fontSize: 8,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: cfg.color,
                                background: `${cfg.glow}0.15)`,
                                border: `1px solid ${cfg.border}0.25)`,
                                borderRadius: 4,
                                padding: '0 4px',
                                lineHeight: '16px',
                                whiteSpace: 'nowrap',
                            }}>
                                v{history.length + 1}
                            </span>
                        )}
                        {/* Outdated indicator (F2) */}
                        {isOutdated && (
                          <span style={{
                            fontSize: 8,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: '#f87171',
                            background: 'rgba(248,113,113,0.12)',
                            border: '1px solid rgba(248,113,113,0.25)',
                            borderRadius: 4,
                            padding: '0 4px',
                            lineHeight: '16px',
                            whiteSpace: 'nowrap',
                            animation: 'pulse 2s ease-in-out infinite',
                          }}>
                            outdated
                          </span>
                        )}
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {/* Copy button */}
                        <button
                            onClick={handleCopy}
                            style={{
                                opacity: IS_TOUCH || isHovered || isMinimized ? 1 : 0,
                                background: copied ? `${cfg.glow}0.12)` : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${copied ? `${cfg.glow}0.3)` : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: 5,
                                color: copied ? cfg.color : 'rgba(255,255,255,0.45)',
                                fontSize: 9,
                                fontFamily: "'JetBrains Mono', monospace",
                                padding: '2px 6px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap',
                                backdropFilter: 'blur(8px)',
                                touchAction: 'manipulation',
                            }}
                        >
                            {copied ? '✓ copied' : 'copy'}
                        </button>

                        {/* Minimize toggle */}
                        <button
                            onClick={handleToggleMinimize}
                            title={isMinimized ? 'Expand' : 'Minimize'}
                            style={{
                                opacity: IS_TOUCH || isHovered || isMinimized ? 1 : 0,
                                background: 'transparent',
                                border: 'none',
                                color: cfg.color,
                                cursor: 'pointer',
                                padding: IS_TOUCH ? '6px' : '3px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'opacity 0.15s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                                transform: isMinimized ? 'rotate(180deg)' : 'rotate(0deg)',
                                touchAction: 'manipulation',
                            }}
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {/* Delete */}
                        <button
                            onClick={(e) => { e.stopPropagation(); removePromptNode(node.id); }}
                            title="Remove prompt node"
                            style={{
                                opacity: IS_TOUCH || isHovered ? 1 : 0,
                                background: 'transparent',
                                border: 'none',
                                color: '#555',
                                cursor: 'pointer',
                                padding: IS_TOUCH ? '6px' : '3px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'opacity 0.15s ease, color 0.15s ease',
                                touchAction: 'manipulation',
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#555'}
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Collapsible body */}
                <div
                    style={{
                        maxHeight: isMinimized ? 0 : 600,
                        opacity: isMinimized ? 0 : 1,
                        overflow: 'hidden',
                        transition: animatingMinimize
                            ? 'max-height 400ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease'
                            : 'none',
                    }}
                >
                    {/* Prompt text */}
                    <div
                        data-scrollable="true"
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                            padding: '11px 13px',
                            fontSize: 11.5,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            color: 'rgba(255,255,255,0.78)',
                            lineHeight: 1.65,
                            maxHeight: 280,
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            userSelect: 'text',
                            cursor: 'text',
                            letterSpacing: '0.01em',
                        }}
                    >
                        {node.text}
                    </div>

                    {/* Scene Context strip (i2v only) */}
                    {node.promptType === 'i2v' && (node.firstFrameImageId || node.lastFrameImageId || node.previousSceneImageId) && (() => {
                        const firstImg = node.firstFrameImageId ? images.find(i => i.id === node.firstFrameImageId) : null;
                        const lastImg = node.lastFrameImageId ? images.find(i => i.id === node.lastFrameImageId) : null;
                        const prevImg = node.previousSceneImageId ? images.find(i => i.id === node.previousSceneImageId) : null;
                        return (
                            <div style={{
                                padding: '5px 10px',
                                borderTop: `1px solid ${cfg.border}0.10)`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                flexWrap: 'wrap',
                            }}>
                                <span style={{
                                    fontSize: 8,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: '#444',
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase',
                                    flexShrink: 0,
                                }}>
                                    ctx
                                </span>
                                {prevImg && <NodeFrameThumb blobId={prevImg.blobId} label="◀ Prev" color="#a78bfa" />}
                                {firstImg && <NodeFrameThumb blobId={firstImg.blobId} label="▷ 1st" color="#4ade80" />}
                                {lastImg && <NodeFrameThumb blobId={lastImg.blobId} label="▶ Last" color="#f97316" />}
                            </div>
                        );
                    })()}

                    {/* Action bar: Regenerate + History */}
                    <div style={{
                        padding: '6px 10px',
                        borderTop: `1px solid ${cfg.border}0.10)`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}>
                        {/* Regenerate button */}
                        <button
                            onClick={handleRegenerate}
                            disabled={isRegenerating || !apiKey}
                            title={!apiKey ? 'Set API key in settings first' : 'Regenerate with current notes'}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '4px 10px',
                                borderRadius: 6,
                                border: `1px solid ${cfg.border}${isRegenerating ? '0.3)' : '0.15)'}`,
                                background: isRegenerating ? `${cfg.glow}0.08)` : 'rgba(255,255,255,0.03)',
                                color: isRegenerating ? cfg.color : 'rgba(255,255,255,0.5)',
                                fontSize: 10,
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 500,
                                cursor: isRegenerating || !apiKey ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease',
                                touchAction: 'manipulation',
                                opacity: !apiKey ? 0.4 : 1,
                            }}
                            onMouseEnter={(e) => {
                                if (!isRegenerating && apiKey) {
                                    (e.currentTarget as HTMLElement).style.background = `${cfg.glow}0.12)`;
                                    (e.currentTarget as HTMLElement).style.color = cfg.color;
                                    (e.currentTarget as HTMLElement).style.borderColor = `${cfg.border}0.3)`;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isRegenerating && apiKey) {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                                    (e.currentTarget as HTMLElement).style.borderColor = `${cfg.border}0.15)`;
                                }
                            }}
                        >
                            {isRegenerating ? (
                                <>
                                    <div style={{
                                        width: 10,
                                        height: 10,
                                        border: `1.5px solid ${cfg.border}0.25)`,
                                        borderTopColor: cfg.color,
                                        borderRadius: '50%',
                                        animation: 'spin 0.7s linear infinite',
                                    }} />
                                    <span>Regenerating…</span>
                                </>
                            ) : (
                                <>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="23 4 23 10 17 10" />
                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                    </svg>
                                    <span>Regenerate</span>
                                </>
                            )}
                        </button>

                        {/* History toggle */}
                        {history.length > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowHistory(!showHistory); }}
                                title={`${history.length} previous version${history.length !== 1 ? 's' : ''}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    border: `1px solid ${showHistory ? `${cfg.border}0.3)` : 'rgba(255,255,255,0.06)'}`,
                                    background: showHistory ? `${cfg.glow}0.08)` : 'transparent',
                                    color: showHistory ? cfg.color : 'rgba(255,255,255,0.35)',
                                    fontSize: 10,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    touchAction: 'manipulation',
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.color = cfg.color;
                                    (e.currentTarget as HTMLElement).style.borderColor = `${cfg.border}0.25)`;
                                }}
                                onMouseLeave={(e) => {
                                    if (!showHistory) {
                                        (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)';
                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                                    }
                                }}
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                <span>{history.length}</span>
                            </button>
                        )}

                        <span style={{ flex: 1 }} />

                        <span style={{
                            fontSize: 9,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: 'rgba(255,255,255,0.18)',
                        }}>
                            {node.model.split('/').pop()}
                        </span>
                    </div>

                    {/* Prompt History panel */}
                    {showHistory && history.length > 0 && (
                        <div
                            data-scrollable="true"
                            onPointerDown={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                            style={{
                                borderTop: `1px solid ${cfg.border}0.10)`,
                                maxHeight: 340,
                                overflowY: 'auto',
                            }}
                        >
                            {/* Panel header */}
                            <div style={{
                                padding: '7px 10px 5px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: `1px solid ${cfg.border}0.08)`,
                                background: `${cfg.glow}0.04)`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2" opacity="0.6">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    <span style={{
                                        fontSize: 9,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        color: cfg.color,
                                        letterSpacing: '0.06em',
                                        textTransform: 'uppercase',
                                        fontWeight: 700,
                                    }}>
                                        Prompt History
                                    </span>
                                </div>
                                <span style={{
                                    fontSize: 8,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: 'rgba(255,255,255,0.2)',
                                }}>
                                    {history.length} saved
                                </span>
                            </div>

                            <div style={{ padding: '4px 6px 6px' }}>
                            {history.map((ver, idx) => {
                                const date = new Date(ver.createdAt);
                                const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const modelShort = ver.model.split('/').pop() || ver.model;
                                const isCopied = copiedHistoryIdx === idx;

                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            margin: '3px 0',
                                            borderRadius: 9,
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            background: 'rgba(255,255,255,0.015)',
                                            overflow: 'hidden',
                                            transition: 'border-color 0.12s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.borderColor = `${cfg.border}0.18)`;
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)';
                                        }}
                                    >
                                        {/* Entry header */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '5px 8px',
                                            background: `${cfg.glow}0.03)`,
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <span style={{
                                                    fontSize: 8,
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    color: cfg.color,
                                                    opacity: 0.7,
                                                    fontWeight: 700,
                                                }}>
                                                    #{history.length - idx}
                                                </span>
                                                <span style={{
                                                    fontSize: 8,
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    color: 'rgba(255,255,255,0.22)',
                                                }}>
                                                    {dateStr} {timeStr}
                                                </span>
                                                <span style={{
                                                    fontSize: 7,
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    color: 'rgba(255,255,255,0.15)',
                                                    background: 'rgba(255,255,255,0.04)',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    borderRadius: 3,
                                                    padding: '0px 4px',
                                                    maxWidth: 80,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {modelShort}
                                                </span>
                                            </div>
                                            {/* Action buttons */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                <button
                                                    onClick={(e) => handleCopyHistoryEntry(e, ver.text, idx)}
                                                    title="Copy this version"
                                                    style={{
                                                        fontSize: 8,
                                                        fontFamily: "'JetBrains Mono', monospace",
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        border: `1px solid ${isCopied ? `${cfg.border}0.3)` : 'rgba(255,255,255,0.07)'}`,
                                                        background: isCopied ? `${cfg.glow}0.10)` : 'transparent',
                                                        color: isCopied ? cfg.color : 'rgba(255,255,255,0.35)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.12s ease',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isCopied) {
                                                            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
                                                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isCopied) {
                                                            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)';
                                                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                                                        }
                                                    }}
                                                >
                                                    {isCopied ? '✓' : 'copy'}
                                                </button>
                                                <button
                                                    onClick={(e) => handleRestoreVersion(e, idx)}
                                                    title="Restore this version as current"
                                                    style={{
                                                        fontSize: 8,
                                                        fontFamily: "'JetBrains Mono', monospace",
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        border: `1px solid ${cfg.border}0.2)`,
                                                        background: 'transparent',
                                                        color: cfg.color,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.12s ease',
                                                        opacity: 0.75,
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        (e.currentTarget as HTMLElement).style.background = `${cfg.glow}0.12)`;
                                                        (e.currentTarget as HTMLElement).style.opacity = '1';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                                        (e.currentTarget as HTMLElement).style.opacity = '0.75';
                                                    }}
                                                >
                                                    restore
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteHistoryEntry(e, idx)}
                                                    title="Delete this entry"
                                                    style={{
                                                        fontSize: 8,
                                                        padding: '2px 5px',
                                                        borderRadius: 4,
                                                        border: '1px solid rgba(239,68,68,0.12)',
                                                        background: 'transparent',
                                                        color: 'rgba(239,68,68,0.4)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.12s ease',
                                                        fontFamily: "'JetBrains Mono', monospace",
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        (e.currentTarget as HTMLElement).style.color = '#ef4444';
                                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.35)';
                                                        (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        (e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.4)';
                                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.12)';
                                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                        {/* Preview text */}
                                        <div style={{
                                            padding: '6px 8px 7px',
                                            fontSize: 10,
                                            color: 'rgba(255,255,255,0.38)',
                                            lineHeight: 1.5,
                                            fontFamily: "'Inter', system-ui, sans-serif",
                                            userSelect: 'text',
                                            cursor: 'text',
                                        }}>
                                            {ver.text.length > 120 ? ver.text.slice(0, 120) + '…' : ver.text}
                                        </div>
                                    </div>
                                );
                            })}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{
                        padding: '5px 13px 9px',
                        borderTop: `1px solid ${cfg.border}0.12)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <span style={{
                            fontSize: 9,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: 'rgba(255,255,255,0.2)',
                        }}>
                            {node.model.split('/').pop()}
                        </span>
                        <span style={{
                            fontSize: 9,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: 'rgba(255,255,255,0.2)',
                        }}>
                            {createdTime}
                        </span>
                    </div>
                </div>

                {/* Resize handle */}
                {!isMinimized && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0, right: 0,
                            width: IS_TOUCH ? 24 : 18,
                            height: IS_TOUCH ? 24 : 18,
                            cursor: 'se-resize',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'flex-end',
                            padding: '4px',
                            opacity: IS_TOUCH ? 0.4 : (isHovered ? 0.6 : 0),
                            transition: 'opacity 0.2s ease',
                            touchAction: 'none',
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const startX = e.clientX;
                            const startW = node.width;
                            const pointerId = e.pointerId;
                            const onMove = (mv: PointerEvent) => {
                                if (mv.pointerId !== pointerId) return;
                                const dx = mv.clientX - startX;
                                updatePromptNode(node.id, { width: Math.max(180, startW + dx / zoomScale) });
                            };
                            const onUp = (up: PointerEvent) => {
                                if (up.pointerId !== pointerId) return;
                                window.removeEventListener('pointermove', onMove);
                                window.removeEventListener('pointerup', onUp);
                            };
                            window.addEventListener('pointermove', onMove);
                            window.addEventListener('pointerup', onUp);
                        }}
                    >
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                            <path d="M2 8 L8 2M5 8 L8 5M8 8 L8 8" stroke={cfg.color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
}
