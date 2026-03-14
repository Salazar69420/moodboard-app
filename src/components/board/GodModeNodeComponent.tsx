import { useRef, useState, useCallback, useEffect } from 'react';
import type { GodModeNode } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';
import { useImageStore } from '../../stores/useImageStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useUIStore } from '../../stores/useUIStore';

const DRAG_THRESHOLD = 4;
const IS_TOUCH = typeof window !== 'undefined' && navigator.maxTouchPoints > 0;

const GOD_COLOR = '#fbbf24'; // amber-400
const GOD_GLOW = 'rgba(251,191,36,';

interface Props {
    node: GodModeNode;
    zoomScale?: number;
}

export function GodModeNodeComponent({ node, zoomScale = 1 }: Props) {
    const updateGodModeNode = useBoardStore((s) => s.updateGodModeNode);
    const removeGodModeNode = useBoardStore((s) => s.removeGodModeNode);
    const connectingFromId = useBoardStore((s) => s.connectingFromId);
    const finishConnection = useBoardStore((s) => s.finishConnection);
    const images = useImageStore((s) => s.images);
    const currentProjectId = useProjectStore((s) => s.currentProjectId);
    const activeTool = useUIStore((s) => s.activeTool);

    // Connected images
    const connectedImages = images.filter(img => node.connectedImageIds.includes(img.id));

    const [isHovered, setIsHovered] = useState(false);
    const [hoverHandle, setHoverHandle] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isMinimized, setIsMinimized] = useState(node.isMinimized);
    const [animatingMinimize, setAnimatingMinimize] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [localText, setLocalText] = useState(node.text);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [localTitle, setLocalTitle] = useState(node.title);
    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionIdx, setMentionIdx] = useState(0);
    const [mentionStart, setMentionStart] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        if (!isEditing) setLocalText(node.text);
    }, [node.text, isEditing]);

    useEffect(() => {
        if (!isEditingTitle) setLocalTitle(node.title);
    }, [node.title, isEditingTitle]);

    useEffect(() => {
        if (isEditingTitle && titleRef.current) {
            titleRef.current.focus();
            titleRef.current.select();
        }
    }, [isEditingTitle]);

    const dragRef = useRef<{
        startX: number; startY: number;
        startNodeX: number; startNodeY: number;
        hasMoved: boolean; pointerId: number;
    } | null>(null);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        dragRef.current = {
            startX: e.clientX, startY: e.clientY,
            startNodeX: node.x, startNodeY: node.y,
            hasMoved: false, pointerId: e.pointerId,
        };

        const handlePointerMove = (mv: PointerEvent) => {
            const drag = dragRef.current;
            if (!drag || mv.pointerId !== drag.pointerId) return;
            const dx = mv.clientX - drag.startX;
            const dy = mv.clientY - drag.startY;
            if (!drag.hasMoved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
            drag.hasMoved = true;
            updateGodModeNode(node.id, {
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
    }, [node.id, node.x, node.y, zoomScale, updateGodModeNode]);

    const handleToggleMinimize = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setAnimatingMinimize(true);
        const newState = !isMinimized;
        setIsMinimized(newState);
        updateGodModeNode(node.id, { isMinimized: newState });
        setTimeout(() => setAnimatingMinimize(false), 400);
    }, [isMinimized, node.id, updateGodModeNode]);

    const handleToggleEnabled = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        updateGodModeNode(node.id, { isEnabled: !node.isEnabled });
    }, [node.id, node.isEnabled, updateGodModeNode]);

    // @mention helpers
    const filteredMentions = connectedImages.filter(img => {
        const label = img.label || img.filename.replace(/\.[^.]+$/, '');
        const slug = label.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        return slug.toLowerCase().includes(mentionQuery);
    });

    const insertMention = useCallback((img: { label?: string; filename: string; id: string }) => {
        if (!textareaRef.current) return;
        const label = img.label || img.filename.replace(/\.[^.]+$/, '');
        const slug = label.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const before = localText.substring(0, mentionStart);
        const after = localText.substring(textareaRef.current.selectionStart);
        const newVal = `${before}@${slug} ${after}`;
        setLocalText(newVal);
        updateGodModeNode(node.id, { text: newVal });
        setMentionOpen(false);
        textareaRef.current.focus();
        const cursorPos = mentionStart + slug.length + 2; // @slug + space
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.selectionStart = cursorPos;
                textareaRef.current.selectionEnd = cursorPos;
            }
        }, 0);
    }, [localText, mentionStart, node.id, updateGodModeNode]);

    const activeColor = node.isEnabled ? GOD_COLOR : '#666';
    const activeGlow = node.isEnabled ? GOD_GLOW : 'rgba(100,100,100,';

    return (
        <div
            className="absolute select-none"
            style={{
                left: node.x,
                top: node.y,
                width: isMinimized ? 'auto' : node.width,
                zIndex: isEditing ? 60 : isHovered ? 50 : isMinimized ? 10 : 30,
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'scale(1) translateZ(0)' : 'scale(0.88) translateZ(0)',
                transition: 'opacity 350ms cubic-bezier(0.22, 1, 0.36, 1), transform 400ms cubic-bezier(0.22, 1, 0.36, 1)',
                touchAction: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => { setIsHovered(false); setHoverHandle(false); }}
            onWheel={(e) => e.stopPropagation()}
        >
            {/* Left connection handle */}
            {(activeTool === 'connect' || connectingFromId) && (
                <div
                    style={{
                        position: 'absolute',
                        left: -8, top: '50%',
                        transform: 'translateY(-50%)',
                        width: 16, height: 16,
                        borderRadius: '50%',
                        background: hoverHandle ? GOD_COLOR : `${GOD_GLOW}0.3)`,
                        border: `2px solid ${hoverHandle ? GOD_COLOR : `${GOD_GLOW}0.6)`}`,
                        cursor: 'pointer',
                        zIndex: 70,
                        boxShadow: hoverHandle ? `0 0 12px ${GOD_COLOR}` : `0 0 6px ${GOD_GLOW}0.4)`,
                        transition: 'all 0.15s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onPointerEnter={() => setHoverHandle(true)}
                    onPointerLeave={() => setHoverHandle(false)}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (connectingFromId && currentProjectId) {
                            finishConnection(currentProjectId, node.id);
                        }
                    }}
                >
                    <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: hoverHandle ? '#fff' : GOD_COLOR,
                        transition: 'all 0.15s ease',
                    }} />
                </div>
            )}
            {/* Ambient glow behind card */}
            {node.isEnabled && (
                <div style={{
                    position: 'absolute',
                    inset: -8,
                    borderRadius: 22,
                    background: `radial-gradient(ellipse at 50% 0%, ${GOD_GLOW}0.12) 0%, transparent 70%)`,
                    pointerEvents: 'none',
                    transition: 'opacity 0.3s ease',
                    opacity: isHovered ? 1 : 0.6,
                }} />
            )}

            <div
                style={{
                    position: 'relative',
                    borderRadius: isMinimized ? 10 : 16,
                    border: `1px solid ${node.isEnabled
                        ? isHovered ? `${activeGlow}0.5)` : `${activeGlow}0.28)`
                        : 'rgba(255,255,255,0.1)'}`,
                    background: 'rgba(7, 8, 14, 0.93)',
                    backdropFilter: 'blur(28px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(200%)',
                    boxShadow: node.isEnabled
                        ? isHovered
                            ? `0 0 0 1px ${activeGlow}0.2), 0 0 40px ${activeGlow}0.18), 0 12px 50px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.09)`
                            : `0 0 0 1px ${activeGlow}0.12), 0 0 24px ${activeGlow}0.12), 0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)`
                        : `0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)`,
                    overflow: 'hidden',
                    transition: 'border-color 0.25s ease, box-shadow 0.25s ease, border-radius 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
            >
                {/* Top accent line */}
                {node.isEnabled && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0,
                        height: 1,
                        background: `linear-gradient(90deg, transparent 0%, ${activeColor} 50%, transparent 100%)`,
                        opacity: 0.6,
                        transition: 'opacity 0.3s ease',
                        pointerEvents: 'none',
                    }} />
                )}

                {/* ── Header ── */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMinimized ? '7px 11px' : '9px 11px 8px',
                        background: node.isEnabled
                            ? `linear-gradient(135deg, ${activeGlow}0.12) 0%, ${activeGlow}0.05) 100%)`
                            : 'rgba(255,255,255,0.02)',
                        borderBottom: isMinimized ? 'none' : `1px solid ${node.isEnabled ? `${activeGlow}0.15)` : 'rgba(255,255,255,0.05)'}`,
                        cursor: 'move',
                        gap: 7,
                        transition: 'background 0.25s ease, padding 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                        touchAction: 'none',
                    }}
                    onPointerDown={handlePointerDown}
                >
                    {/* Crown icon + title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
                        {/* God Mode icon */}
                        <div style={{
                            width: 18, height: 18, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M2 17 L5 9 L9 13 L12 6 L15 13 L19 9 L22 17 Z"
                                    fill={node.isEnabled ? activeColor : '#444'}
                                    opacity={node.isEnabled ? 1 : 0.5}
                                    style={{ filter: node.isEnabled ? `drop-shadow(0 0 4px ${activeColor}80)` : 'none', transition: 'all 0.25s ease' }}
                                />
                                <rect x="2" y="18" width="20" height="2" rx="1" fill={node.isEnabled ? activeColor : '#444'} opacity={node.isEnabled ? 0.8 : 0.4} />
                            </svg>
                        </div>

                        {/* Editable title */}
                        {isEditingTitle ? (
                            <input
                                ref={titleRef}
                                value={localTitle}
                                onChange={e => setLocalTitle(e.target.value)}
                                onBlur={() => {
                                    setIsEditingTitle(false);
                                    const t = localTitle.trim() || 'God Mode';
                                    setLocalTitle(t);
                                    updateGodModeNode(node.id, { title: t });
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === 'Escape') {
                                        e.preventDefault();
                                        (e.target as HTMLInputElement).blur();
                                    }
                                }}
                                onPointerDown={e => e.stopPropagation()}
                                onClick={e => e.stopPropagation()}
                                style={{
                                    flex: 1, minWidth: 0,
                                    background: 'rgba(255,255,255,0.06)',
                                    border: `1px solid ${activeColor}50`,
                                    borderRadius: 5,
                                    padding: '1px 6px',
                                    fontSize: 10,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 700,
                                    color: activeColor,
                                    outline: 'none',
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                }}
                            />
                        ) : (
                            <span
                                onDoubleClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                                style={{
                                    fontSize: 10,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 700,
                                    color: node.isEnabled ? activeColor : '#555',
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    cursor: 'move',
                                    transition: 'color 0.25s ease',
                                    minWidth: 0,
                                    flex: 1,
                                    textShadow: node.isEnabled ? `0 0 12px ${activeColor}60` : 'none',
                                }}
                                title="Double-click to rename"
                            >
                                {node.title}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        {/* Enable/Disable toggle */}
                        <button
                            data-no-drag="true"
                            onClick={handleToggleEnabled}
                            title={node.isEnabled ? 'Disable God Mode' : 'Enable God Mode'}
                            style={{
                                position: 'relative',
                                width: 30, height: 16,
                                borderRadius: 8,
                                background: node.isEnabled ? `${activeGlow}0.3)` : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${node.isEnabled ? `${activeGlow}0.5)` : 'rgba(255,255,255,0.1)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
                                flexShrink: 0,
                                touchAction: 'manipulation',
                                boxShadow: node.isEnabled ? `0 0 8px ${activeGlow}0.4)` : 'none',
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: 2,
                                left: node.isEnabled ? 15 : 2,
                                width: 10, height: 10,
                                borderRadius: '50%',
                                background: node.isEnabled ? activeColor : '#555',
                                transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
                                boxShadow: node.isEnabled ? `0 0 6px ${activeColor}` : 'none',
                            }} />
                        </button>

                        {/* Minimize toggle */}
                        <button
                            style={{
                                opacity: IS_TOUCH || isHovered || isMinimized ? 1 : 0,
                                background: 'transparent', border: 'none',
                                color: node.isEnabled ? activeColor : '#555',
                                cursor: 'pointer',
                                padding: IS_TOUCH ? '6px' : '3px',
                                display: 'flex', alignItems: 'center',
                                transition: 'opacity 0.15s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                                transform: isMinimized ? 'rotate(180deg)' : 'rotate(0deg)',
                                touchAction: 'manipulation',
                            }}
                            onClick={handleToggleMinimize}
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {/* Delete */}
                        <button
                            style={{
                                opacity: IS_TOUCH || isHovered ? 1 : 0,
                                background: 'transparent', border: 'none',
                                color: '#555', cursor: 'pointer',
                                padding: IS_TOUCH ? '6px' : '3px',
                                display: 'flex', alignItems: 'center',
                                transition: 'opacity 0.15s ease, color 0.15s ease',
                                touchAction: 'manipulation',
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#555'}
                            onClick={(e) => { e.stopPropagation(); removeGodModeNode(node.id); }}
                            title="Remove god mode node"
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── Collapsible body ── */}
                <div
                    style={{
                        maxHeight: isMinimized ? 0 : 500,
                        opacity: isMinimized ? 0 : 1,
                        overflow: 'hidden',
                        transition: animatingMinimize
                            ? 'max-height 400ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease'
                            : 'none',
                    }}
                >
                    {/* Status bar */}
                    <div style={{
                        padding: '6px 12px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}>
                        <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: node.isEnabled ? activeColor : '#444',
                            boxShadow: node.isEnabled ? `0 0 8px ${activeColor}` : 'none',
                            transition: 'all 0.25s ease',
                            flexShrink: 0,
                        }} />
                        <span style={{
                            fontSize: 9,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: node.isEnabled ? `${activeGlow}0.6)` : 'rgba(255,255,255,0.2)',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            transition: 'color 0.25s ease',
                        }}>
                            {node.isEnabled ? 'Active — injected into all prompts' : 'Disabled — not affecting prompts'}
                        </span>
                    </div>

                    <textarea
                        ref={textareaRef}
                        style={{
                            width: '100%',
                            background: 'transparent',
                            resize: 'none',
                            outline: 'none',
                            border: 'none',
                            fontFamily: "'Inter', system-ui, sans-serif",
                            fontSize: 12,
                            color: node.isEnabled ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.35)',
                            padding: '6px 12px 12px',
                            lineHeight: '1.6',
                            caretColor: activeColor,
                            minHeight: 80,
                            height: 120,
                            cursor: isEditing ? 'text' : 'inherit',
                            overflowY: 'auto',
                            letterSpacing: '0.01em',
                            transition: 'color 0.25s ease',
                        }}
                        placeholder={node.isEnabled
                            ? "Instructions always applied to every prompt…\n\nUse @nodename to reference connected images, e.g.:\n\"Match the grading from @colorsheet\""
                            : "God Mode disabled — enable to inject into prompts…"
                        }
                        value={localText}
                        onFocus={() => setIsEditing(true)}
                        onBlur={() => {
                            setTimeout(() => {
                                setIsEditing(false);
                                setMentionOpen(false);
                                updateGodModeNode(node.id, { text: localText });
                            }, 150);
                        }}
                        onChange={(e) => {
                            const val = e.target.value;
                            setLocalText(val);
                            updateGodModeNode(node.id, { text: val });

                            // @mention detection
                            const pos = e.target.selectionStart;
                            const textBefore = val.substring(0, pos);
                            const atIdx = textBefore.lastIndexOf('@');
                            if (atIdx >= 0 && (atIdx === 0 || /\s/.test(textBefore[atIdx - 1]))) {
                                const query = textBefore.substring(atIdx + 1);
                                if (!query.includes(' ')) {
                                    setMentionOpen(true);
                                    setMentionQuery(query.toLowerCase());
                                    setMentionStart(atIdx);
                                    setMentionIdx(0);
                                    return;
                                }
                            }
                            setMentionOpen(false);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (mentionOpen && filteredMentions.length > 0) {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setMentionIdx(i => Math.min(i + 1, filteredMentions.length - 1));
                                    return;
                                }
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setMentionIdx(i => Math.max(i - 1, 0));
                                    return;
                                }
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                    e.preventDefault();
                                    insertMention(filteredMentions[mentionIdx]);
                                    return;
                                }
                                if (e.key === 'Escape') {
                                    setMentionOpen(false);
                                    return;
                                }
                            }
                            if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur();
                        }}
                    />

                    {/* @mention dropdown */}
                    {mentionOpen && filteredMentions.length > 0 && (
                        <div style={{
                            position: 'absolute', bottom: '100%', left: 11,
                            background: 'rgba(10,11,20,0.97)',
                            backdropFilter: 'blur(20px) saturate(180%)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 10, padding: 4, zIndex: 100,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                            maxHeight: 150, overflowY: 'auto', minWidth: 150,
                        }}>
                            {filteredMentions.map((img, idx) => {
                                const slug = (img.label || img.filename.replace(/\.[^.]+$/, '')).replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
                                return (
                                    <div
                                        key={img.id}
                                        style={{
                                            padding: '5px 8px', cursor: 'pointer', borderRadius: 7, fontSize: 11,
                                            fontFamily: "'Inter', system-ui, sans-serif",
                                            background: idx === mentionIdx ? 'rgba(255,255,255,0.08)' : 'transparent',
                                            color: idx === mentionIdx ? '#fff' : 'rgba(255,255,255,0.5)',
                                            transition: 'background 0.1s ease',
                                        }}
                                        onPointerDown={(e) => {
                                            e.preventDefault();
                                            insertMention(img);
                                        }}
                                    >
                                        <span style={{ color: GOD_COLOR, marginRight: 4 }}>@</span>
                                        {slug}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Connected refs bar */}
                    {connectedImages.length > 0 && !isMinimized && (
                        <div
                            onPointerDown={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                            style={{
                                padding: '4px 12px 6px',
                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4,
                            }}
                        >
                            <span style={{
                                fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                                color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em', flexShrink: 0,
                            }}>refs:</span>
                            {connectedImages.map(img => {
                                const name = img.label || img.filename.replace(/\.[^.]+$/, '');
                                const slug = name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
                                const hasLabel = !!img.label;
                                return (
                                    <button
                                        key={img.id}
                                        title={hasLabel ? `Insert @${slug}` : 'Label this image to reference'}
                                        style={{
                                            fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                                            color: hasLabel ? GOD_COLOR : 'rgba(255,255,255,0.25)',
                                            background: hasLabel ? `${GOD_GLOW}0.08)` : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${hasLabel ? `${GOD_GLOW}0.25)` : 'rgba(255,255,255,0.07)'}`,
                                            borderRadius: 4, padding: '1px 6px',
                                            cursor: hasLabel ? 'pointer' : 'default',
                                            transition: 'all 0.15s ease',
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!hasLabel || !textareaRef.current) return;
                                            const pos = textareaRef.current.selectionStart ?? localText.length;
                                            const insertion = `@${slug} `;
                                            const newVal = localText.slice(0, pos) + insertion + localText.slice(pos);
                                            setLocalText(newVal);
                                            updateGodModeNode(node.id, { text: newVal });
                                            textareaRef.current.focus();
                                            setTimeout(() => {
                                                if (textareaRef.current) {
                                                    textareaRef.current.selectionStart = pos + insertion.length;
                                                    textareaRef.current.selectionEnd = pos + insertion.length;
                                                }
                                            }, 0);
                                        }}
                                    >
                                        @{slug}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Footer hint */}
                    <div style={{
                        padding: '4px 12px 8px',
                        borderTop: `1px solid rgba(255,255,255,0.04)`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                    }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={node.isEnabled ? activeColor : '#444'} strokeWidth="2" opacity="0.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span style={{
                            fontSize: 9,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            color: 'rgba(255,255,255,0.18)',
                            letterSpacing: '0.01em',
                        }}>
                            {connectedImages.length > 0
                                ? `Use @name to reference ${connectedImages.length} connected image${connectedImages.length > 1 ? 's' : ''}`
                                : 'God Mode context is sent to every prompt generation'
                            }
                        </span>
                    </div>
                </div>

                {/* Resize handle */}
                {!isMinimized && (
                    <div
                        style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: IS_TOUCH ? 24 : 18, height: IS_TOUCH ? 24 : 18,
                            cursor: 'se-resize',
                            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
                            padding: '4px',
                            opacity: IS_TOUCH ? 0.4 : (isHovered ? 0.7 : 0),
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
                                updateGodModeNode(node.id, { width: Math.max(220, startW + dx / zoomScale) });
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
                            <path d="M2 8 L8 2M5 8 L8 5M8 8 L8 8" stroke={activeColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
}
