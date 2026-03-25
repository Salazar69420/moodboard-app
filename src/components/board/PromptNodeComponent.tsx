import { useRef, useState, useCallback, useEffect } from 'react';
import type { PromptNode } from '../../types';
import type { BoardImage } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';
import { useImageStore } from '../../stores/useImageStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useUIStore } from '../../stores/useUIStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { generatePrompt } from '../../utils/prompt-generator';
import { generateEditPrompt } from '../../utils/edit-prompt-generator';
import { buildRetryContext } from '../../utils/eval-engine';
import { generateImageWithNanoBanana2 } from '../../utils/wavespeed';
import { storeImage, storeBlob } from '../../utils/db-operations';
import { imageToBase64 } from '../../utils/ai-features';
import { EvalBadge } from './EvalBadge';
import type { GodModeNode } from '../../types';

interface Props {
    node: PromptNode;
    zoomScale?: number;
}

const DRAG_THRESHOLD = 4;
const IS_TOUCH = typeof window !== 'undefined' && navigator.maxTouchPoints > 0;
const MAX_HISTORY = 3;

const TYPE_CONFIG = {
    i2v: { label: 'I2V PROMPT', color: '#f97316', border: 'rgba(249,115,22,', glow: 'rgba(249,115,22,' },
    edit: { label: 'IMAGE PROMPT', color: '#22d3ee', border: 'rgba(34,211,238,', glow: 'rgba(34,211,238,' },
};

export function PromptNodeComponent({ node, zoomScale = 1 }: Props) {
    const updatePromptNode = useBoardStore((s) => s.updatePromptNode);
    const removePromptNode = useBoardStore((s) => s.removePromptNode);
    const regeneratePromptNode = useBoardStore((s) => s.regeneratePromptNode);
    const restorePromptVersion = useBoardStore((s) => s.restorePromptVersion);
    const updatePromptNodeEval = useBoardStore((s) => s.updatePromptNodeEval);
    const boardMode = useBoardStore((s) => s.boardMode);
    const categoryNotes = useBoardStore((s) => s.categoryNotes);
    const editNotes = useBoardStore((s) => s.editNotes);
    const godModeNodes = useBoardStore((s) => s.godModeNodes);
    const images = useImageStore((s) => s.images);
    const connections = useBoardStore((s) => s.connections);

    const apiKey = useSettingsStore((s) => s.apiKey);
    const model = useSettingsStore((s) => s.model);
    const wavespeedApiKey = useSettingsStore((s) => s.wavespeedApiKey);
    const toggleSettings = useSettingsStore((s) => s.toggleSettings);
    const showToast = useUIStore((s) => s.showToast);
    const currentProjectId = useProjectStore((s) => s.currentProjectId);
    const addImage = useImageStore((s) => s.addImage);
    const removeImageLocal = useImageStore((s) => s.removeImageLocal);

    const cfg = TYPE_CONFIG[node.promptType];

    const [isHovered, setIsHovered] = useState(false);
    const [isMinimized, setIsMinimized] = useState(node.isMinimized);
    const [animatingMinimize, setAnimatingMinimize] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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
    const handleRegenerate = useCallback(async (e: React.MouseEvent, withRetryContext = false) => {
        e.stopPropagation();
        if (!apiKey || isRegenerating) return;

        setIsRegenerating(true);

        try {
            const parentImage = images.find(img => img.id === node.imageId);
            if (!parentImage) throw new Error('Image not found');

            const connectedImageIds = connections
                .filter(c => c.fromId === node.imageId || c.toId === node.imageId)
                .map(c => c.fromId === node.imageId ? c.toId : c.fromId);
            const connectedImages = images.filter(img => connectedImageIds.includes(img.id));

            let newText: string;
            let newModel: string;
            let evalResult;

            const activeGodNodes = godModeNodes.filter((g: GodModeNode) => g.isEnabled && g.text.trim());
            const retryCtx = withRetryContext && node.evalResult
                ? buildRetryContext(node.text, node.evalResult)
                : undefined;

            if (node.promptType === 'i2v') {
                const notes = categoryNotes.filter(n => n.imageId === node.imageId);
                const result = await generatePrompt(apiKey, model, parentImage.blobId, parentImage.mimeType, notes, connectedImages, activeGodNodes, { retryContext: retryCtx });
                newText = result.prompt;
                newModel = result.model;
                evalResult = result.evalResult;
            } else {
                const notes = editNotes.filter(n => n.imageId === node.imageId);
                const result = await generateEditPrompt(apiKey, model, parentImage.blobId, parentImage.mimeType, notes, connectedImages, activeGodNodes, { retryContext: retryCtx });
                newText = result.prompt;
                newModel = result.model;
                evalResult = result.evalResult;
            }

            await regeneratePromptNode(node.id, newText, newModel);
            if (evalResult) await updatePromptNodeEval(node.id, evalResult);
        } catch (err) {
            console.error('Regeneration failed:', err);
        } finally {
            setIsRegenerating(false);
        }
    }, [apiKey, model, node, images, connections, categoryNotes, editNotes, regeneratePromptNode, updatePromptNodeEval, isRegenerating]);

    const handleRestoreVersion = useCallback(async (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        await restorePromptVersion(node.id, index);
    }, [node.id, restorePromptVersion]);

    const handleGenerateImage = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!wavespeedApiKey) {
            toggleSettings();
            return;
        }
        if (isGeneratingImage || !currentProjectId) return;

        setIsGeneratingImage(true);

        // Place a shimmer placeholder on the canvas immediately
        const { nanoid } = await import('nanoid');
        const placeholderId = nanoid();
        const placeholderImage: BoardImage = {
            id: placeholderId,
            projectId: currentProjectId,
            blobId: '',
            filename: '',
            mimeType: 'image/png',
            width: 512,
            height: 512,
            x: node.x + (node.width ?? 280) + 48,
            y: node.y,
            label: '',
            createdAt: Date.now(),
            shotOrder: Date.now(),
            isGenerating: true,
        };
        addImage(placeholderImage);

        try {
            // Build reference images array from the parent image connected to this node
            const referenceImages: string[] = [];
            const parentImage = images.find(img => img.id === node.imageId);
            if (parentImage) {
                const imgData = await imageToBase64(parentImage.blobId);
                if (imgData) {
                    referenceImages.push(`data:${imgData.mimeType};base64,${imgData.base64}`);
                }
            }

            const { imageUrl } = await generateImageWithNanoBanana2(wavespeedApiKey, node.text, referenceImages);

            // Download the generated image
            const imgRes = await fetch(imageUrl);
            if (!imgRes.ok) throw new Error('Failed to download generated image');
            const blob = await imgRes.blob();

            // Detect dimensions
            let width = 512;
            let height = 512;
            try {
                const bmp = await createImageBitmap(blob);
                width = bmp.width;
                height = bmp.height;
                bmp.close();
            } catch { /* use defaults */ }

            // Remove placeholder and store real image
            removeImageLocal(placeholderId);

            const blobId = nanoid();
            const imageId = nanoid();
            await storeBlob(blobId, blob);

            const newImage: BoardImage = {
                id: imageId,
                projectId: currentProjectId,
                blobId,
                filename: `nano-banana-2-${Date.now()}.png`,
                mimeType: blob.type || 'image/png',
                width,
                height,
                x: node.x + (node.width ?? 280) + 48,
                y: node.y,
                label: '',
                createdAt: Date.now(),
                shotOrder: Date.now(),
            };
            await storeImage(newImage);
            addImage(newImage);
            showToast('Image generated with Nano Banana 2');
        } catch (err: unknown) {
            removeImageLocal(placeholderId);
            const msg = err instanceof Error ? err.message : 'Generation failed';
            showToast(`Image generation failed: ${msg}`);
        } finally {
            setIsGeneratingImage(false);
        }
    }, [wavespeedApiKey, isGeneratingImage, currentProjectId, node, images, addImage, removeImageLocal, showToast, toggleSettings]);

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

                        {/* Eval badge */}
                        <EvalBadge evalResult={node.evalResult} />

                        {/* Generate Image — Nano Banana 2 */}
                        <button
                            onClick={handleGenerateImage}
                            disabled={isGeneratingImage}
                            title={wavespeedApiKey ? 'Generate image with Nano Banana 2 (WaveSpeed AI)' : 'Add Pi Key in Settings to generate images'}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 9px',
                                borderRadius: 6,
                                border: isGeneratingImage
                                    ? '1px solid rgba(168,85,247,0.35)'
                                    : wavespeedApiKey
                                        ? '1px solid rgba(168,85,247,0.25)'
                                        : '1px solid rgba(255,255,255,0.07)',
                                background: isGeneratingImage
                                    ? 'rgba(168,85,247,0.10)'
                                    : wavespeedApiKey
                                        ? 'rgba(168,85,247,0.07)'
                                        : 'rgba(255,255,255,0.02)',
                                color: isGeneratingImage
                                    ? '#c084fc'
                                    : wavespeedApiKey
                                        ? '#a855f7'
                                        : 'rgba(255,255,255,0.25)',
                                fontSize: 10,
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 500,
                                cursor: isGeneratingImage ? 'wait' : 'pointer',
                                transition: 'all 0.15s ease',
                                touchAction: 'manipulation',
                                opacity: !wavespeedApiKey ? 0.5 : 1,
                            }}
                            onMouseEnter={(e) => {
                                if (!isGeneratingImage && wavespeedApiKey) {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(168,85,247,0.15)';
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(168,85,247,0.4)';
                                    (e.currentTarget as HTMLElement).style.color = '#c084fc';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isGeneratingImage && wavespeedApiKey) {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(168,85,247,0.07)';
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(168,85,247,0.25)';
                                    (e.currentTarget as HTMLElement).style.color = '#a855f7';
                                }
                            }}
                        >
                            {isGeneratingImage ? (
                                <>
                                    <div style={{
                                        width: 9,
                                        height: 9,
                                        border: '1.5px solid rgba(168,85,247,0.25)',
                                        borderTopColor: '#a855f7',
                                        borderRadius: '50%',
                                        animation: 'spin 0.7s linear infinite',
                                        flexShrink: 0,
                                    }} />
                                    <span>Generating…</span>
                                </>
                            ) : (
                                <>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <polyline points="21 15 16 10 5 21" />
                                    </svg>
                                    <span>Generate Image</span>
                                </>
                            )}
                        </button>

                        <span style={{ flex: 1 }} />

                        {/* Retry with critique button */}
                        {node.evalResult?.status === 'fail' && (
                            <button
                                onClick={(e) => handleRegenerate(e, true)}
                                disabled={isRegenerating}
                                title="Retry generation using eval critique as guidance"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '3px 8px', borderRadius: 5,
                                    border: '1px solid rgba(248,113,113,0.25)',
                                    background: 'rgba(248,113,113,0.06)',
                                    color: '#f87171', fontSize: 9,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    cursor: isRegenerating ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.14)';
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.06)';
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.25)';
                                }}
                            >
                                ↺ Retry with critique
                            </button>
                        )}

                        <span style={{
                            fontSize: 9,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: 'rgba(255,255,255,0.18)',
                        }}>
                            {node.model.split('/').pop()}
                        </span>
                    </div>

                    {/* History panel */}
                    {showHistory && history.length > 0 && (
                        <div
                            data-scrollable="true"
                            onPointerDown={e => e.stopPropagation()}
                            style={{
                                borderTop: `1px solid ${cfg.border}0.10)`,
                                maxHeight: 220,
                                overflowY: 'auto',
                            }}
                        >
                            <div style={{
                                padding: '6px 10px 4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                            }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2" opacity="0.5">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                <span style={{
                                    fontSize: 9,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: 'rgba(255,255,255,0.3)',
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                }}>
                                    Previous Versions ({history.length}/{MAX_HISTORY})
                                </span>
                            </div>

                            {history.map((ver, idx) => {
                                const time = new Date(ver.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const modelShort = ver.model.split('/').pop() || ver.model;
                                const preview = ver.text.length > 80 ? ver.text.slice(0, 80) + '…' : ver.text;

                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            margin: '2px 6px',
                                            padding: '6px 8px',
                                            borderRadius: 8,
                                            border: '1px solid rgba(255,255,255,0.04)',
                                            background: 'rgba(255,255,255,0.015)',
                                            transition: 'all 0.12s ease',
                                            cursor: 'default',
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                                            (e.currentTarget as HTMLElement).style.borderColor = `${cfg.border}0.15)`;
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.015)';
                                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.04)';
                                        }}
                                    >
                                        {/* Version header */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: 4,
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 5,
                                            }}>
                                                <span style={{
                                                    fontSize: 9,
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    color: cfg.color,
                                                    opacity: 0.6,
                                                    fontWeight: 600,
                                                }}>
                                                    v{history.length - idx}
                                                </span>
                                                <span style={{
                                                    fontSize: 8,
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    color: 'rgba(255,255,255,0.2)',
                                                }}>
                                                    {time} · {modelShort}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => handleRestoreVersion(e, idx)}
                                                style={{
                                                    fontSize: 9,
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    padding: '2px 7px',
                                                    borderRadius: 4,
                                                    border: `1px solid ${cfg.border}0.2)`,
                                                    background: 'transparent',
                                                    color: cfg.color,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.12s ease',
                                                    opacity: 0.7,
                                                }}
                                                onMouseEnter={(e) => {
                                                    (e.currentTarget as HTMLElement).style.background = `${cfg.glow}0.12)`;
                                                    (e.currentTarget as HTMLElement).style.opacity = '1';
                                                }}
                                                onMouseLeave={(e) => {
                                                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                                                    (e.currentTarget as HTMLElement).style.opacity = '0.7';
                                                }}
                                            >
                                                Restore
                                            </button>
                                        </div>
                                        {/* Preview text */}
                                        <div style={{
                                            fontSize: 10,
                                            color: 'rgba(255,255,255,0.35)',
                                            lineHeight: 1.5,
                                            fontFamily: "'Inter', system-ui, sans-serif",
                                        }}>
                                            {preview}
                                        </div>
                                    </div>
                                );
                            })}

                            <div style={{ height: 4 }} />
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
