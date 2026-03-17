import { useRef, useState, useCallback, useEffect } from 'react';
import type { EditNote } from '../../types';
import { EDIT_CATEGORIES, EDIT_DIRECTOR_GUIDES } from '../../types';
import { DirectorGuidePanel } from './DirectorGuidePanel';
import { useBoardStore } from '../../stores/useBoardStore';
import { useImageStore } from '../../stores/useImageStore';
import { useMention } from '../../hooks/useMention';
import { showNoteContextMenu } from './NoteContextMenu';

interface Props {
    note: EditNote;
    zoomScale?: number;
    autoFocus?: boolean;
}

const DRAG_THRESHOLD = 4;
const IS_TOUCH = typeof window !== 'undefined' && navigator.maxTouchPoints > 0;

export function EditNoteNode({ note, zoomScale = 1, autoFocus }: Props) {
    const updateEditNote = useBoardStore((s) => s.updateEditNote);
    const removeEditNote = useBoardStore((s) => s.removeEditNote);
    const connections = useBoardStore((s) => s.connections);
    const boardMode = useBoardStore((s) => s.boardMode);
    const images = useImageStore((s) => s.images);

    const connectedImages = images.filter(img =>
        connections.some(c =>
            (c.fromId === note.imageId && c.toId === img.id) ||
            (c.toId === note.imageId && c.fromId === img.id)
        )
    );
    const mention = useMention(connectedImages);

    // Fallback to first category if stored ID no longer exists (schema migration)
    const category = EDIT_CATEGORIES.find(c => c.id === note.categoryId) ?? EDIT_CATEGORIES[0];
    const [isEditing, setIsEditing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isMinimized, setIsMinimized] = useState(note.isMinimized ?? false);
    const [animatingMinimize, setAnimatingMinimize] = useState(false);
    const [localText, setLocalText] = useState(note.text);
    const [activeGuide, setActiveGuide] = useState<{ prompt: string; x: number; y: number } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!isEditing) setLocalText(note.text);
    }, [note.text, isEditing]);

    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [autoFocus]);

    const dragRef = useRef<{
        startX: number;
        startY: number;
        startNodeX: number;
        startNodeY: number;
        hasMoved: boolean;
        pointerId: number;
    } | null>(null);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startNodeX: note.x,
            startNodeY: note.y,
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
            updateEditNote(note.id, {
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
    }, [note.id, note.x, note.y, zoomScale, updateEditNote]);

    const handleGuideInsert = useCallback((text: string) => {
        const current = localText.trim();
        const newText = current ? `${current}, ${text}` : text;
        setLocalText(newText);
        updateEditNote(note.id, { text: newText });
    }, [localText, note.id, updateEditNote]);

    const togglePrompt = useCallback((prompt: string) => {
        const checked = note.checkedPrompts.includes(prompt)
            ? note.checkedPrompts.filter(p => p !== prompt)
            : [...note.checkedPrompts, prompt];
        updateEditNote(note.id, { checkedPrompts: checked });
    }, [note.id, note.checkedPrompts, updateEditNote]);

    const handleToggleMinimize = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setAnimatingMinimize(true);
        const newState = !isMinimized;
        setIsMinimized(newState);
        updateEditNote(note.id, { isMinimized: newState });
        setTimeout(() => setAnimatingMinimize(false), 400);
    }, [isMinimized, note.id, updateEditNote]);

    const completedCount = category.prompts.filter(p => note.checkedPrompts.includes(p)).length;
    const totalPrompts = category.prompts.length;
    const completionPct = Math.round((completedCount / totalPrompts) * 100);

    const isVisible = boardMode === 'edit';
    const showControls = IS_TOUCH || isHovered || isMinimized;

    return (
        <div
            className="absolute select-none"
            style={{
                left: note.x,
                top: note.y,
                width: isMinimized ? 'auto' : note.width,
                zIndex: isEditing ? 50 : isHovered ? 40 : isMinimized ? 10 : 22,
                opacity: mounted && isVisible ? 1 : 0,
                pointerEvents: isVisible ? 'auto' : 'none',
                transform: mounted && isVisible ? 'scale(1) translateZ(0)' : 'scale(0.88) translateZ(0)',
                transition: 'opacity 350ms cubic-bezier(0.22, 1, 0.36, 1), transform 400ms cubic-bezier(0.22, 1, 0.36, 1), width 350ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            onPointerDown={handlePointerDown}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            onWheel={(e) => e.stopPropagation()}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                showNoteContextMenu(
                    e.clientX, e.clientY,
                    note.id, 'edit',
                    rect.left + rect.width / 2, rect.top + rect.height / 2
                );
            }}
        >
            <div
                style={{
                    borderRadius: isMinimized ? 10 : 14,
                    border: `1px solid ${isEditing
                        ? `${category.color}50`
                        : isHovered
                            ? `${category.color}35`
                            : `${category.color}18`}`,
                    background: 'rgba(7, 8, 14, 0.88)',
                    backdropFilter: 'blur(20px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                    boxShadow: isEditing
                        ? `0 0 0 1px ${category.color}20, 0 0 32px ${category.color}15, 0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)`
                        : isHovered
                            ? `0 0 0 1px ${category.color}12, 0 0 20px ${category.color}10, 0 8px 32px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05)`
                            : `0 4px 24px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset`,
                    overflow: 'hidden',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, border-radius 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
            >
                {/* ── Header ── */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMinimized ? '7px 11px' : '8px 11px 7px',
                        background: isEditing
                            ? `linear-gradient(135deg, ${category.color}14 0%, ${category.color}08 100%)`
                            : `${category.color}0d`,
                        borderBottom: isMinimized ? 'none' : `1px solid ${category.color}14`,
                        cursor: 'move',
                        gap: 6,
                        transition: 'padding 0.35s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s ease',
                        touchAction: 'none',
                    }}
                    onPointerDown={handlePointerDown}
                >
                    {/* Icon + label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                        <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{category.icon}</span>
                        <span style={{
                            fontSize: 10,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 700,
                            color: category.color,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            {category.label}
                        </span>
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {/* Completion badge */}
                        <div style={{
                            fontSize: 8,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: completionPct === 100 ? '#4ade80' : completionPct > 0 ? category.color : 'rgba(255,255,255,0.2)',
                            background: completionPct === 100
                                ? 'rgba(74,222,128,0.1)'
                                : completionPct > 0
                                    ? `${category.color}10`
                                    : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${completionPct === 100 ? 'rgba(74,222,128,0.2)' : completionPct > 0 ? `${category.color}20` : 'rgba(255,255,255,0.07)'}`,
                            borderRadius: 4,
                            padding: '1px 5px',
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                            letterSpacing: '0.02em',
                        }}>
                            {completionPct === 100 ? '✓ done' : `${completedCount}/${totalPrompts}`}
                        </div>

                        {/* Minimize toggle */}
                        <button
                            style={{
                                opacity: showControls ? 1 : 0,
                                background: 'transparent',
                                border: 'none',
                                color: category.color,
                                cursor: 'pointer',
                                padding: IS_TOUCH ? '6px' : '3px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'opacity 0.15s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                                transform: isMinimized ? 'rotate(180deg)' : 'rotate(0deg)',
                                touchAction: 'manipulation',
                            }}
                            onClick={handleToggleMinimize}
                            title={isMinimized ? 'Expand' : 'Minimize'}
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {/* Delete */}
                        <button
                            style={{
                                opacity: showControls ? 1 : 0,
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
                            onClick={(e) => { e.stopPropagation(); removeEditNote(note.id); }}
                            title="Remove note"
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── Collapsible Body ── */}
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
                    {/* ── Progress bar (top) ── */}
                    <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${completionPct}%`,
                            background: completionPct === 100
                                ? 'linear-gradient(to right, #4ade80, #22c55e)'
                                : `linear-gradient(to right, ${category.color}70, ${category.color})`,
                            transition: 'width 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                            boxShadow: completionPct > 0 ? `0 0 6px ${category.color}50` : 'none',
                        }} />
                    </div>

                    {/* ── Prompt checklist (2-column grid) ── */}
                    <div style={{
                        padding: '8px 10px 4px',
                        display: 'grid',
                        gridTemplateColumns: category.prompts.length > 4 ? '1fr 1fr' : '1fr',
                        gap: '2px 6px',
                    }}>
                        {category.prompts.map(prompt => {
                            const checked = note.checkedPrompts.includes(prompt);
                            const guide = EDIT_DIRECTOR_GUIDES[prompt];
                            return (
                                <div
                                    key={prompt}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        cursor: 'pointer',
                                        padding: IS_TOUCH ? '5px 4px' : '3px 4px',
                                        borderRadius: 5,
                                        background: checked ? `${category.color}0a` : 'transparent',
                                        border: `1px solid ${checked ? `${category.color}20` : 'transparent'}`,
                                        transition: 'background 0.15s ease, border-color 0.15s ease',
                                    }}
                                    onPointerDown={e => e.stopPropagation()}
                                    onMouseDown={e => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); togglePrompt(prompt); }}
                                >
                                    <div style={{
                                        width: IS_TOUCH ? 16 : 12,
                                        height: IS_TOUCH ? 16 : 12,
                                        borderRadius: 3,
                                        border: `1.5px solid ${checked ? category.color : 'rgba(255,255,255,0.15)'}`,
                                        background: checked ? `${category.color}30` : 'rgba(255,255,255,0.03)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        transition: 'all 0.15s cubic-bezier(0.22, 1, 0.36, 1)',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation',
                                    }}>
                                        {checked && (
                                            <svg width="7" height="7" viewBox="0 0 12 12" fill="none">
                                                <polyline points="2,6 5,9 10,3" stroke={category.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>
                                    <span style={{
                                        flex: 1,
                                        fontSize: IS_TOUCH ? 10.5 : 9.5,
                                        fontFamily: "'Inter', system-ui, sans-serif",
                                        color: checked ? category.color : 'rgba(255,255,255,0.42)',
                                        textDecoration: checked ? 'none' : 'none',
                                        fontWeight: checked ? 500 : 400,
                                        transition: 'color 0.15s ease, font-weight 0.15s ease',
                                        userSelect: 'none',
                                        letterSpacing: '0.01em',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {prompt}
                                    </span>
                                    {/* Director's Guide ⓘ button */}
                                    {guide && (
                                        <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (activeGuide?.prompt === prompt) {
                                                        setActiveGuide(null);
                                                    } else {
                                                        const r = e.currentTarget.getBoundingClientRect();
                                                        setActiveGuide({ prompt, x: r.right, y: r.top + r.height / 2 });
                                                    }
                                                }}
                                                onPointerDown={(e) => e.stopPropagation()}
                                                title="Director's Guide"
                                                style={{
                                                    width: 14, height: 14,
                                                    borderRadius: '50%',
                                                    background: activeGuide?.prompt === prompt ? `${category.color}25` : 'rgba(255,255,255,0.05)',
                                                    border: `1px solid ${activeGuide?.prompt === prompt ? `${category.color}50` : 'rgba(255,255,255,0.08)'}`,
                                                    color: activeGuide?.prompt === prompt ? category.color : 'rgba(255,255,255,0.25)',
                                                    fontSize: 8,
                                                    fontFamily: "'Inter', system-ui, sans-serif",
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.15s ease',
                                                    lineHeight: 1,
                                                    padding: 0,
                                                    boxShadow: activeGuide?.prompt === prompt ? `0 0 8px ${category.color}40` : 'none',
                                                }}
                                                onMouseEnter={e => {
                                                    (e.currentTarget as HTMLElement).style.color = category.color;
                                                    (e.currentTarget as HTMLElement).style.borderColor = `${category.color}40`;
                                                }}
                                                onMouseLeave={e => {
                                                    if (activeGuide?.prompt !== prompt) {
                                                        (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)';
                                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                                                    }
                                                }}
                                            >
                                                i
                                            </button>
                                            {activeGuide?.prompt === prompt && (
                                                <DirectorGuidePanel
                                                    guide={guide}
                                                    categoryColor={category.color}
                                                    promptLabel={prompt}
                                                    onInsert={handleGuideInsert}
                                                    onClose={() => setActiveGuide(null)}
                                                    anchorX={activeGuide.x}
                                                    anchorY={activeGuide.y}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Textarea ── */}
                    <div style={{ position: 'relative' }}>
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
                                color: 'rgba(255,255,255,0.72)',
                                padding: '9px 11px 11px',
                                lineHeight: '1.6',
                                caretColor: category.color,
                                height: Math.max(64, note.height - 108),
                                minHeight: 64,
                                cursor: isEditing ? 'text' : 'inherit',
                                overflowY: 'auto',
                                letterSpacing: '0.01em',
                            }}
                            placeholder={category.placeholder}
                            value={localText}
                            onFocus={() => setIsEditing(true)}
                            onBlur={() => {
                                setTimeout(() => {
                                    setIsEditing(false);
                                    updateEditNote(note.id, { text: localText });
                                }, 150);
                            }}
                            onChange={(e) => {
                                setLocalText(e.target.value);
                                updateEditNote(note.id, { text: e.target.value });
                                mention.handleChange(e.target.value, e.target.selectionStart);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                                if (mention.handleKeyDown(e as any, localText, textareaRef.current?.selectionStart || 0, (newVal, pos) => {
                                    setLocalText(newVal);
                                    updateEditNote(note.id, { text: newVal });
                                    setTimeout(() => {
                                        if (textareaRef.current) {
                                            textareaRef.current.selectionStart = pos;
                                            textareaRef.current.selectionEnd = pos;
                                        }
                                    }, 0);
                                })) {
                                    return;
                                }
                                if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur();
                            }}
                        />
                        {mention.isOpen && (
                            <div style={{
                                position: 'absolute', bottom: '100%', left: 11,
                                background: 'rgba(14,14,22,0.95)',
                                backdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 8, padding: 4, zIndex: 100,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                                maxHeight: 150, overflowY: 'auto',
                                minWidth: 150,
                            }}>
                                {mention.filteredItems.map((item, idx) => (
                                    <div
                                        key={item.id}
                                        style={{
                                            padding: IS_TOUCH ? '8px 8px' : '4px 8px',
                                            cursor: 'pointer',
                                            borderRadius: 5, fontSize: 11,
                                            fontFamily: "'Inter', system-ui, sans-serif",
                                            background: idx === mention.selectedIndex ? 'rgba(255,255,255,0.08)' : 'transparent',
                                            color: idx === mention.selectedIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                                            transition: 'background 0.1s ease',
                                        }}
                                        onPointerDown={(e) => {
                                            e.preventDefault();
                                            mention.selectItem(item, localText, textareaRef.current?.selectionStart || 0, (newVal, pos) => {
                                                setLocalText(newVal);
                                                updateEditNote(note.id, { text: newVal });
                                                setTimeout(() => {
                                                    if (textareaRef.current) {
                                                        textareaRef.current.focus();
                                                        textareaRef.current.selectionStart = pos;
                                                        textareaRef.current.selectionEnd = pos;
                                                    }
                                                }, 0);
                                            });
                                        }}
                                    >
                                        <span style={{ color: category.color, marginRight: 4 }}>@</span>
                                        {item.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Connected refs bar ── */}
                {connectedImages.length > 0 && !isMinimized && (
                    <div
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                            padding: '5px 10px 7px',
                            borderTop: `1px solid rgba(255,255,255,0.05)`,
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        <span style={{
                            fontSize: 8,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: 'rgba(255,255,255,0.18)',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            flexShrink: 0,
                        }}>
                            refs
                        </span>
                        {connectedImages.map(img => {
                            const name = img.label || img.filename.replace(/\.[^.]+$/, '');
                            const slug = name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
                            const hasLabel = !!img.label;
                            return (
                                <button
                                    key={img.id}
                                    title={hasLabel ? `Click to insert @${slug}` : 'Add a label to this image to use it as @reference'}
                                    style={{
                                        fontSize: 9,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        color: hasLabel ? category.color : 'rgba(255,255,255,0.2)',
                                        background: hasLabel ? `${category.color}10` : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${hasLabel ? `${category.color}22` : 'rgba(255,255,255,0.06)'}`,
                                        borderRadius: 4,
                                        padding: '2px 6px',
                                        cursor: hasLabel ? 'pointer' : 'default',
                                        transition: 'background 0.12s ease, border-color 0.12s ease',
                                        touchAction: 'manipulation',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 3,
                                    }}
                                    onMouseEnter={e => {
                                        if (hasLabel) {
                                            (e.currentTarget as HTMLElement).style.background = `${category.color}1e`;
                                            (e.currentTarget as HTMLElement).style.borderColor = `${category.color}40`;
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (hasLabel) {
                                            (e.currentTarget as HTMLElement).style.background = `${category.color}10`;
                                            (e.currentTarget as HTMLElement).style.borderColor = `${category.color}22`;
                                        }
                                    }}
                                    onPointerDown={e => e.preventDefault()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!hasLabel || !textareaRef.current) return;
                                        const pos = textareaRef.current.selectionStart ?? localText.length;
                                        const insertion = `@${slug} `;
                                        const newVal = localText.slice(0, pos) + insertion + localText.slice(pos);
                                        setLocalText(newVal);
                                        updateEditNote(note.id, { text: newVal });
                                        setTimeout(() => {
                                            textareaRef.current?.focus();
                                            const newPos = pos + insertion.length;
                                            textareaRef.current!.selectionStart = newPos;
                                            textareaRef.current!.selectionEnd = newPos;
                                        }, 0);
                                    }}
                                >
                                    {hasLabel ? (
                                        <><span style={{ opacity: 0.6 }}>@</span>{slug}</>
                                    ) : (
                                        <><span style={{ opacity: 0.4 }}>@?</span> {slug}</>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ── Resize handle ── */}
                {!isMinimized && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
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
                            const startY = e.clientY;
                            const startW = note.width;
                            const startH = note.height;
                            const pointerId = e.pointerId;
                            const onMove = (mv: PointerEvent) => {
                                if (mv.pointerId !== pointerId) return;
                                const dx = mv.clientX - startX;
                                const dy = mv.clientY - startY;
                                updateEditNote(note.id, {
                                    width: Math.max(180, startW + dx),
                                    height: Math.max(160, startH + dy),
                                });
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
                            <path d="M2 8 L8 2M5 8 L8 5M8 8 L8 8" stroke={category.color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
}
