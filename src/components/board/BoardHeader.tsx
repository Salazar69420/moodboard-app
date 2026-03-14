import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../../stores/useProjectStore';
import { useImageStore } from '../../stores/useImageStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { TypeBadge } from '../shared/TypeBadge';
import { importImageFiles } from '../../utils/importImages';
import { CollabBar } from '../collab/CollabBar';
import { computeAutoLayout } from '../../utils/auto-layout';
import { generateImageName } from '../../utils/ai-features';
import { ImportNotesModal } from './ImportNotesModal';

const IS_TOUCH = typeof window !== 'undefined' && navigator.maxTouchPoints > 0;

function ImageCount({ fallbackCount }: { fallbackCount: number }) {
  const loadedImages = useImageStore((s) => s.images);
  const isLoaded = useImageStore((s) => s.isLoaded);
  const count = isLoaded ? loadedImages.length : fallbackCount;
  return (
    <span className="text-[10px] text-[#555] ml-auto">
      {count} {count === 1 ? 'image' : 'images'}
    </span>
  );
}

export function BoardHeader() {
  const projects = useProjectStore((s) => s.projects);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const clearImages = useImageStore((s) => s.clear);
  const images = useImageStore((s) => s.images);
  const toggleSettings = useSettingsStore((s) => s.toggleSettings);
  const hasApiKey = useSettingsStore((s) => !!s.apiKey);
  const autoArrangeNotes = useBoardStore((s) => s.autoArrangeNotes);
  const categoryNotes = useBoardStore((s) => s.categoryNotes);
  const editNotes = useBoardStore((s) => s.editNotes);
  const promptNodes = useBoardStore((s) => s.promptNodes);
  const addGodModeNode = useBoardStore((s) => s.addGodModeNode);
  const godModeNodes = useBoardStore((s) => s.godModeNodes);
  const boardMode = useBoardStore((s) => s.boardMode);
  const setBoardMode = useBoardStore((s) => s.setBoardMode);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const isSearchOpen = useUIStore((s) => s.isSearchOpen);
  const isShotPanelOpen = useUIStore((s) => s.isShotPanelOpen);
  const setShotPanelOpen = useUIStore((s) => s.setShotPanelOpen);
  const showToast = useUIStore((s) => s.showToast);
  const noteDisplayMode = useUIStore((s) => s.noteDisplayMode);
  const setNoteDisplayMode = useUIStore((s) => s.setNoteDisplayMode);
  const isQuietMode = useUIStore((s) => s.isQuietMode);
  const toggleQuietMode = useUIStore((s) => s.toggleQuietMode);

  const project = projects.find((p) => p.id === currentProjectId);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isArranging, setIsArranging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Double-tap detection for touch rename
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!project) return null;

  const handleBack = () => {
    clearImages();
    setCurrentProject(null);
  };

  const startEditing = () => {
    setEditName(project.name);
    setIsEditing(true);
  };

  const commitEdit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== project.name) {
      renameProject(project.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleTitleTap = () => {
    if (!IS_TOUCH) return;
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      // Double-tap
      startEditing();
    }
    lastTapRef.current = now;
  };

  const hasNotes = categoryNotes.length > 0 || editNotes.length > 0;
  const hasActiveGodNode = godModeNodes.some(g => g.isEnabled);

  const handleAddGodNode = async () => {
    if (!currentProjectId) return;
    // Place in a sensible default spot on canvas
    await addGodModeNode(currentProjectId, 120, 120);
  };

  const handleAutoArrange = async () => {
    if (!hasNotes || isArranging) return;
    setIsArranging(true);
    await autoArrangeNotes(images);
    setTimeout(() => setIsArranging(false), 600);
  };

  // Auto Layout (F3)
  const [isAutoLayouting, setIsAutoLayouting] = useState(false);
  const handleAutoLayout = () => {
    if (images.length === 0 || isAutoLayouting) return;
    setIsAutoLayouting(true);
    const result = computeAutoLayout(images, categoryNotes, editNotes, promptNodes, boardMode);
    // Apply positions
    for (const pos of result.images) {
      useImageStore.getState().updatePosition(pos.id, pos.x, pos.y);
      useImageStore.getState().persistPosition(pos.id);
    }
    for (const pos of result.categoryNotes) {
      useBoardStore.getState().updateCategoryNote(pos.id, { x: pos.x, y: pos.y });
    }
    for (const pos of result.editNotes) {
      useBoardStore.getState().updateEditNote(pos.id, { x: pos.x, y: pos.y });
    }
    for (const pos of result.promptNodes) {
      useBoardStore.getState().updatePromptNode(pos.id, { x: pos.x, y: pos.y });
    }
    showToast('Auto layout applied');
    setTimeout(() => setIsAutoLayouting(false), 600);
  };

  // Auto Name All (F6)
  const [isNamingAll, setIsNamingAll] = useState(false);
  const [showImportNotes, setShowImportNotes] = useState(false);
  const handleAutoNameAll = async () => {
    const unnamed = images.filter(i => !i.label || i.label.trim() === '');
    if (unnamed.length === 0) { showToast('All images already named'); return; }
    const { apiKey, model: settingsModel } = useSettingsStore.getState();
    if (!apiKey) { showToast('Set your API key in Settings'); return; }
    setIsNamingAll(true);
    let named = 0;
    for (const img of unnamed) {
      try {
        const model = settingsModel || 'anthropic/claude-opus-4-6';
        const name = await generateImageName(apiKey, model, img.blobId, img.mimeType);
        useImageStore.getState().updateLabel(img.id, name);
        named++;
        showToast(`Named ${named}/${unnamed.length}...`);
      } catch {
        // Continue with next image
      }
    }
    showToast(`${named} images named`);
    setIsNamingAll(false);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && currentProjectId) {
      await importImageFiles(files, currentProjectId, 200, 200);
    }
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const handleCopyAllPrompts = () => {
    if (promptNodes.length === 0) {
      showToast('No generated prompts to copy');
      return;
    }
    // Sort by shot order of parent images
    const sorted = [...promptNodes].sort((a, b) => {
      const imgA = images.find(i => i.id === a.imageId);
      const imgB = images.find(i => i.id === b.imageId);
      return (imgA?.shotOrder ?? 0) - (imgB?.shotOrder ?? 0);
    });

    const text = sorted.map((p, i) => `${i + 1}. ${p.text}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      showToast(`${sorted.length} prompt(s) copied`);
    }).catch(() => {
      showToast('Failed to copy');
    });
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 shrink-0 z-10"
      style={{
        background: 'rgba(8,8,12,0.88)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.055)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <button
        onClick={handleBack}
        className="transition-colors"
        style={{
          color: '#666',
          padding: IS_TOUCH ? '8px' : '5px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          touchAction: 'manipulation',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
          (e.currentTarget as HTMLElement).style.color = '#e5e5e5';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
          (e.currentTarget as HTMLElement).style.color = '#666';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      {isEditing ? (
        <input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(249,115,22,0.4)',
            borderRadius: '8px',
            padding: '3px 8px',
            fontSize: '13px',
            color: '#e5e5e5',
            outline: 'none',
            backdropFilter: 'blur(8px)',
          }}
        />
      ) : (
        <h2
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#d0d0d0',
            cursor: 'pointer',
            transition: 'color 0.15s ease',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
          onDoubleClick={startEditing}
          onClick={handleTitleTap}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#d0d0d0'}
          title={IS_TOUCH ? 'Double-tap to rename' : 'Double-click to rename'}
        >
          {project.name}
        </h2>
      )}

      <TypeBadge type={project.type} size="xs" />

      <ImageCount fallbackCount={project.imageCount} />

      {/* Upload images button */}
      <>
        <input
          ref={fileInputRef}
          id="board-image-upload"
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />
        <label
          htmlFor="board-image-upload"
          title="Import images"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: IS_TOUCH ? '8px' : '5px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: '#666',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            touchAction: 'manipulation',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.08)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(249,115,22,0.2)';
            (e.currentTarget as HTMLElement).style.color = '#f97316';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
            (e.currentTarget as HTMLElement).style.color = '#666';
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </label>
      </>

      {/* Auto-arrange button */}
      {hasNotes && (
        <HeaderButton
          onClick={handleAutoArrange}
          disabled={isArranging}
          title="Minimize & arrange all notes next to their images"
          icon={
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ animation: isArranging ? 'spin 0.8s linear infinite' : 'none' }}
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          }
          label={isArranging ? 'Arranging…' : 'Arrange'}
          active={isArranging}
        />
      )}

      {/* Shot Panel toggle */}
      <HeaderButton
        onClick={() => setShotPanelOpen(!isShotPanelOpen)}
        title="Shot sequence panel"
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        }
        label="Shots"
        active={isShotPanelOpen}
      />

      {/* Search button */}
      <HeaderButton
        onClick={() => setSearchOpen(!isSearchOpen)}
        title="Search (Cmd+F)"
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        }
        label="Search"
        active={isSearchOpen}
      />

      {/* Copy all prompts */}
      {promptNodes.length > 0 && (
        <HeaderButton
          onClick={handleCopyAllPrompts}
          title="Copy all generated prompts as numbered list"
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          }
          label="Copy Prompts"
          active={false}
        />
      )}

      {/* Auto Layout (F3) */}
      {images.length > 1 && (
        <HeaderButton
          onClick={handleAutoLayout}
          disabled={isAutoLayouting}
          title="Auto-arrange images and notes in a grid layout"
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ animation: isAutoLayouting ? 'spin 0.8s linear infinite' : 'none' }}>
              <rect x="3" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
          }
          label="Layout"
          active={isAutoLayouting}
        />
      )}

      {/* Note Display Mode Toggle (U2) */}
      <HeaderButton
        onClick={() => setNoteDisplayMode(noteDisplayMode === 'canvas' ? 'sidebar' : 'canvas')}
        title={`Switch notes to ${noteDisplayMode === 'canvas' ? 'sidebar' : 'canvas'} (N)`}
        icon={
          noteDisplayMode === 'sidebar' ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          )
        }
        label={noteDisplayMode === 'sidebar' ? 'Sidebar' : 'Canvas'}
        active={noteDisplayMode === 'sidebar'}
      />

      {/* Quiet Mode Toggle (U12) */}
      <HeaderButton
        onClick={() => { toggleQuietMode(); showToast(isQuietMode ? 'Quiet mode off' : 'Quiet mode on'); }}
        title={`${isQuietMode ? 'Exit' : 'Enter'} quiet mode — hide all notes (Q)`}
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            {isQuietMode && <line x1="1" y1="1" x2="23" y2="23" />}
            <circle cx="12" cy="12" r="3" />
          </svg>
        }
        label={isQuietMode ? 'Show' : 'Quiet'}
        active={isQuietMode}
      />

      {/* Auto Name All (F6) */}
      {images.length > 0 && (
        <HeaderButton
          onClick={handleAutoNameAll}
          disabled={isNamingAll}
          title="AI-name all unnamed images"
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ animation: isNamingAll ? 'spin 0.8s linear infinite' : 'none' }}>
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          }
          label={isNamingAll ? 'Naming…' : 'Name All'}
          active={isNamingAll}
        />
      )}

      {/* Import Notes button */}
      <HeaderButton
        onClick={() => setShowImportNotes(true)}
        title="Import individual note categories from another project"
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        }
        label="Import"
        active={false}
      />

      {/* God Mode button */}
      <button
        onClick={handleAddGodNode}
        title="Add God Mode node — injects rules into every prompt"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: IS_TOUCH ? '8px 10px' : '4px 10px',
          borderRadius: '8px',
          fontSize: '11px',
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 500,
          background: hasActiveGodNode ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${hasActiveGodNode ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.08)'}`,
          color: hasActiveGodNode ? '#fbbf24' : '#888',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          backdropFilter: 'blur(8px)',
          touchAction: 'manipulation',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.12)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251,191,36,0.35)';
          (e.currentTarget as HTMLElement).style.color = '#fbbf24';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = hasActiveGodNode ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)';
          (e.currentTarget as HTMLElement).style.borderColor = hasActiveGodNode ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.08)';
          (e.currentTarget as HTMLElement).style.color = hasActiveGodNode ? '#fbbf24' : '#888';
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 16L3 5l5.5 5L12 2l3.5 8L21 5l-2 11H5zm0 2h14v2H5v-2z"/>
        </svg>
        <span>God Mode</span>
      </button>

      {/* Mode Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '2px',
        gap: '2px',
        backdropFilter: 'blur(8px)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => setBoardMode('i2v')}
          style={{
            padding: IS_TOUCH ? '6px 12px' : '4px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: boardMode === 'i2v' ? 'rgba(249,115,22,0.15)' : 'transparent',
            color: boardMode === 'i2v' ? '#f97316' : '#666',
            border: 'none',
            touchAction: 'manipulation',
          }}
        >
          I2V
        </button>
        <button
          onClick={() => setBoardMode('edit')}
          style={{
            padding: IS_TOUCH ? '6px 12px' : '4px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: boardMode === 'edit' ? 'rgba(34,211,238,0.15)' : 'transparent',
            color: boardMode === 'edit' ? '#22d3ee' : '#666',
            border: 'none',
            touchAction: 'manipulation',
          }}
        >
          Edit
        </button>
      </div>

      {/* Collab */}
      <CollabBar />

      {/* Settings gear */}
      <button
        onClick={toggleSettings}
        title="Settings"
        style={{
          position: 'relative',
          padding: IS_TOUCH ? '8px' : '5px',
          borderRadius: '10px',
          background: hasApiKey ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${hasApiKey ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.07)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.12)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(249,115,22,0.3)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = hasApiKey ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.04)';
          (e.currentTarget as HTMLElement).style.borderColor = hasApiKey ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.07)';
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={hasApiKey ? '#f97316' : '#666'}
          strokeWidth="2"
          style={{ transition: 'stroke 0.15s ease' }}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        {hasApiKey && (
          <div style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#4ade80',
            boxShadow: '0 0 6px rgba(74,222,128,0.7)',
          }} />
        )}
      </button>

      {/* Import Notes Modal */}
      {showImportNotes && <ImportNotesModal onClose={() => setShowImportNotes(false)} />}
    </div>
  );
}

// Reusable header button component
function HeaderButton({
  onClick,
  title,
  icon,
  label,
  active,
  disabled,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: IS_TOUCH ? '8px 10px' : '4px 10px',
        borderRadius: '8px',
        fontSize: '11px',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 500,
        background: active ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.08)'}`,
        color: active ? '#f97316' : '#888',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        backdropFilter: 'blur(8px)',
        touchAction: 'manipulation',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (!disabled) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.1)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(249,115,22,0.3)';
          (e.currentTarget as HTMLElement).style.color = '#f97316';
        }
      }}
      onMouseLeave={e => {
        if (!disabled) {
          (e.currentTarget as HTMLElement).style.background = active ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)';
          (e.currentTarget as HTMLElement).style.borderColor = active ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.08)';
          (e.currentTarget as HTMLElement).style.color = active ? '#f97316' : '#888';
        }
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
