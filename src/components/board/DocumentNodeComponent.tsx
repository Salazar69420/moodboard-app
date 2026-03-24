import { useRef, useState, useCallback, useEffect } from 'react';
import type { DocumentNode } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';

const DRAG_THRESHOLD = 4;
const DOC_COLOR = '#3b82f6'; // blue-500
const DOC_BG = 'rgba(7,8,14,0.92)';

interface Props {
  node: DocumentNode;
  zoomScale?: number;
}

export function DocumentNodeComponent({ node, zoomScale = 1 }: Props) {
  const updateDocumentNode = useBoardStore((s) => s.updateDocumentNode);
  const removeDocumentNode = useBoardStore((s) => s.removeDocumentNode);

  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(node.isMinimized);
  const [mounted, setMounted] = useState(false);
  const [localContent, setLocalContent] = useState(node.content);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(node.title);
  const titleRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!isEditing) setLocalContent(node.content);
  }, [node.content, isEditing]);

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
      updateDocumentNode(node.id, {
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
  }, [node.id, node.x, node.y, zoomScale, updateDocumentNode]);

  const handleToggleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isMinimized;
    setIsMinimized(newState);
    updateDocumentNode(node.id, { isMinimized: newState });
  }, [isMinimized, node.id, updateDocumentNode]);

  const handleBlurContent = useCallback(() => {
    setIsEditing(false);
    if (localContent !== node.content) {
      updateDocumentNode(node.id, { content: localContent });
    }
  }, [localContent, node.content, node.id, updateDocumentNode]);

  const handleBlurTitle = useCallback(() => {
    setIsEditingTitle(false);
    const trimmed = localTitle.trim() || 'Brief';
    setLocalTitle(trimmed);
    if (trimmed !== node.title) {
      updateDocumentNode(node.id, { title: trimmed });
    }
  }, [localTitle, node.title, node.id, updateDocumentNode]);

  const charCount = localContent.length;
  const isActive = localContent.trim().length > 0;

  return (
    <div
      className="absolute select-none"
      style={{
        left: node.x,
        top: node.y,
        width: isMinimized ? 'auto' : node.width,
        zIndex: isEditing ? 50 : isHovered ? 40 : 22,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'scale(1) translateZ(0)' : 'scale(0.88)',
        transition: 'opacity 350ms cubic-bezier(0.22,1,0.36,1), transform 400ms cubic-bezier(0.22,1,0.36,1)',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        style={{
          borderRadius: isMinimized ? 10 : 14,
          border: `1px solid ${isHovered || isEditing ? DOC_COLOR + '55' : 'rgba(255,255,255,0.08)'}`,
          background: DOC_BG,
          backdropFilter: 'blur(24px)',
          boxShadow: isHovered || isEditing
            ? `0 0 0 1px ${DOC_COLOR}22, 0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${DOC_COLOR}15`
            : '0 4px 24px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: isMinimized ? '7px 10px' : '8px 11px 7px',
            background: `${DOC_COLOR}0a`,
            borderBottom: isMinimized ? 'none' : '1px solid rgba(255,255,255,0.05)',
            cursor: 'move',
            touchAction: 'none',
          }}
          onPointerDown={handlePointerDown}
        >
          {/* Icon */}
          <span style={{ fontSize: 12, flexShrink: 0 }}>📄</span>

          {/* Title */}
          {isEditingTitle ? (
            <input
              ref={titleRef}
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleBlurTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  titleRef.current?.blur();
                }
                e.stopPropagation();
              }}
              data-no-drag
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${DOC_COLOR}66`,
                borderRadius: 5,
                padding: '1px 6px',
                fontSize: 11,
                fontWeight: 600,
                color: '#d0d8f0',
                fontFamily: "'Inter', system-ui, sans-serif",
                outline: 'none',
              }}
            />
          ) : (
            <span
              style={{
                flex: 1,
                fontSize: 11,
                fontWeight: 600,
                color: isActive ? '#d0d8f0' : '#666',
                cursor: 'pointer',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
              onDoubleClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
              title="Double-click to rename"
            >
              {localTitle}
            </span>
          )}

          {/* Active indicator dot */}
          {isActive && (
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: DOC_COLOR, flexShrink: 0,
              boxShadow: `0 0 6px ${DOC_COLOR}`,
            }} />
          )}

          {/* Minimize toggle */}
          <button
            onClick={handleToggleMinimize}
            data-no-drag
            style={{
              background: 'none', border: 'none',
              color: '#555', cursor: 'pointer',
              fontSize: 10, padding: '1px 3px',
              lineHeight: 1, flexShrink: 0,
              transition: 'color 0.15s',
            }}
            onPointerEnter={(e) => { (e.target as HTMLElement).style.color = '#aaa'; }}
            onPointerLeave={(e) => { (e.target as HTMLElement).style.color = '#555'; }}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '▸' : '▾'}
          </button>

          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); removeDocumentNode(node.id); }}
            data-no-drag
            style={{
              background: 'none', border: 'none',
              color: '#444', cursor: 'pointer',
              fontSize: 11, padding: '1px 3px',
              lineHeight: 1, flexShrink: 0,
              transition: 'color 0.15s',
            }}
            onPointerEnter={(e) => { (e.target as HTMLElement).style.color = '#f87171'; }}
            onPointerLeave={(e) => { (e.target as HTMLElement).style.color = '#444'; }}
            title="Remove document node"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            maxHeight: isMinimized ? 0 : 400,
            opacity: isMinimized ? 0 : 1,
            overflow: 'hidden',
            transition: 'max-height 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.25s ease',
          }}
        >
          <div style={{ padding: '8px 11px 10px' }}>
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              onFocus={() => setIsEditing(true)}
              onBlur={handleBlurContent}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              placeholder="Paste your brief, brand guidelines, or project context here…&#10;&#10;This text will be included as context for all AI generations in this project."
              data-no-drag
              style={{
                width: '100%',
                minHeight: 120,
                maxHeight: 280,
                resize: 'vertical',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${isEditing ? DOC_COLOR + '44' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 11,
                lineHeight: 1.6,
                color: 'rgba(226,228,240,0.85)',
                fontFamily: "'Inter', system-ui, sans-serif",
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box',
                whiteSpace: 'pre-wrap',
              }}
            />

            {/* Footer: char count + source badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 5,
              }}
            >
              <span style={{ fontSize: 9, color: '#444', fontFamily: "'Inter', system-ui, sans-serif" }}>
                {charCount > 0 ? `${charCount} chars` : ''}
              </span>
              <span style={{
                fontSize: 9,
                color: isActive ? DOC_COLOR + 'bb' : '#333',
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                {isActive ? '● Injected into AI' : 'Not active'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
