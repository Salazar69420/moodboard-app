import { useEffect, useState } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useImageStore } from '../../stores/useImageStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useBoardStore } from '../../stores/useBoardStore';
import { copyImageToClipboard } from '../../utils/clipboard';
import { downloadMedia } from '../../utils/download';
import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../../types';
import type { ShotCategoryId, EditCategoryId } from '../../types';

export function ImageContextMenu() {
  const contextMenu = useUIStore((s) => s.contextMenu);
  const hideContextMenu = useUIStore((s) => s.hideContextMenu);
  const showToast = useUIStore((s) => s.showToast);
  const setCroppingImage = useUIStore((s) => s.setCroppingImage);
  const images = useImageStore((s) => s.images);
  const removeImage = useImageStore((s) => s.removeImage);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const decrementImageCount = useProjectStore((s) => s.decrementImageCount);
  const addCategoryNote = useBoardStore((s) => s.addCategoryNote);
  const addEditNote = useBoardStore((s) => s.addEditNote);
  const categoryNotes = useBoardStore((s) => s.categoryNotes);
  const editNotes = useBoardStore((s) => s.editNotes);
  const removeCategoryNotesForImage = useBoardStore((s) => s.removeCategoryNotesForImage);
  const removeEditNotesForImage = useBoardStore((s) => s.removeEditNotesForImage);
  const moveNotesToProject = useBoardStore((s) => s.moveNotesToProject);
  const moveImageToProject = useImageStore((s) => s.moveImageToProject);
  const projects = useProjectStore((s) => s.projects);
  const incrementImageCount = useProjectStore((s) => s.incrementImageCount);
  const createProject = useProjectStore((s) => s.createProject);

  const [showNoteSubmenu, setShowNoteSubmenu] = useState(false);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [activeSection, setActiveSection] = useState<'i2v' | 'edit'>('i2v');

  useEffect(() => {
    if (!contextMenu.visible) {
      setShowNoteSubmenu(false);
      setShowMoveSubmenu(false);

      setNewProjectName('');
      setActiveSection('i2v');
      return;
    }
    const handleClick = () => hideContextMenu();
    const handleCtx = () => hideContextMenu();
    window.addEventListener('click', handleClick);
    window.addEventListener('contextmenu', handleCtx);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('contextmenu', handleCtx);
    };
  }, [contextMenu.visible, hideContextMenu]);

  if (!contextMenu.visible || !contextMenu.targetImageId) return null;

  const image = images.find((i) => i.id === contextMenu.targetImageId);
  if (!image) return null;

  // Which categories already have notes for this image?
  const existingI2vCats = new Set<ShotCategoryId>(
    categoryNotes.filter(n => n.imageId === image.id).map(n => n.categoryId)
  );
  const existingEditCats = new Set<EditCategoryId>(
    editNotes.filter(n => n.imageId === image.id).map(n => n.categoryId)
  );

  const handleCopy = async () => {
    const success = await copyImageToClipboard(image.blobId);
    showToast(success ? 'Copied to clipboard' : 'Failed to copy');
    hideContextMenu();
  };

  const handleDownload = async () => {
    await downloadMedia(image.blobId, image.filename);
    showToast('Download started');
    hideContextMenu();
  };

  const handleDelete = async () => {
    await removeCategoryNotesForImage(image.id);
    await removeEditNotesForImage(image.id);
    await removeImage(image.id);
    if (currentProjectId) decrementImageCount(currentProjectId);
    showToast('Shot deleted');
    hideContextMenu();
  };

  const handleCrop = () => {
    setCroppingImage(image.id);
    hideContextMenu();
  };

  const handleAddI2vNote = async (categoryId: ShotCategoryId) => {
    if (!currentProjectId) return;
    const displayW = image.displayWidth ?? Math.min(image.width, 350);
    const imageNotes = categoryNotes.filter(n => n.imageId === image.id);
    const allEditNotes = editNotes.filter(n => n.imageId === image.id);
    const offsetY = (imageNotes.length + allEditNotes.length) * 180;

    await addCategoryNote(
      currentProjectId,
      image.id,
      categoryId,
      image.x + displayW + 60,
      image.y + offsetY,
    );

    showToast(`${SHOT_CATEGORIES.find(c => c.id === categoryId)?.label} note added`);
    hideContextMenu();
  };

  const handleAddEditNote = async (categoryId: EditCategoryId) => {
    if (!currentProjectId) return;
    const displayW = image.displayWidth ?? Math.min(image.width, 350);
    const imageNotes = categoryNotes.filter(n => n.imageId === image.id);
    const allEditNotes = editNotes.filter(n => n.imageId === image.id);
    const offsetY = (imageNotes.length + allEditNotes.length) * 180;

    await addEditNote(
      currentProjectId,
      image.id,
      categoryId,
      image.x + displayW + 60,
      image.y + offsetY,
    );

    showToast(`${EDIT_CATEGORIES.find(c => c.id === categoryId)?.label} note added`);
    hideContextMenu();
  };

  const x = Math.min(contextMenu.x, window.innerWidth - 320);
  const y = Math.min(contextMenu.y, window.innerHeight - 500);

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 200,
        left: x,
        top: y,
        background: 'rgba(7, 8, 14, 0.92)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        boxShadow: '0 16px 48px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
        minWidth: 280,
        maxWidth: 340,
        overflow: 'visible',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Header label ── */}
      <div style={{
        padding: '9px 13px 7px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
          Shot Options
        </span>
      </div>

      {/* ── Add Note → submenu trigger ── */}
      <div style={{ padding: '4px' }}>
        <button
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 10px',
            borderRadius: 8,
            background: showNoteSubmenu ? 'rgba(249,115,22,0.08)' : 'transparent',
            border: 'none',
            color: showNoteSubmenu ? '#f97316' : 'rgba(255,255,255,0.75)',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'background 0.15s ease, color 0.15s ease',
            textAlign: 'left',
            gap: 8,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.07)';
            (e.currentTarget as HTMLElement).style.color = '#f97316';
            setShowNoteSubmenu(true);
          }}
          onMouseLeave={e => {
            if (!showNoteSubmenu) {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)';
            }
          }}
          onClick={() => setShowNoteSubmenu(!showNoteSubmenu)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>📎</span>
            <span>Add Shot Note</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              fontSize: 9,
              fontFamily: "'JetBrains Mono', monospace",
              color: 'rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 4,
              padding: '1px 5px',
              fontWeight: 600,
            }}>
              {existingI2vCats.size + existingEditCats.size}/{SHOT_CATEGORIES.length + EDIT_CATEGORIES.length}
            </span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: showNoteSubmenu ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>

        {/* ── Section Tabs & Category Grid ── */}
        {showNoteSubmenu && (
          <div style={{
            margin: '4px 0',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {/* Tab bar */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveSection('i2v'); }}
                style={{
                  flex: 1,
                  padding: '7px 6px',
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: activeSection === 'i2v' ? 'rgba(249,115,22,0.1)' : 'transparent',
                  color: activeSection === 'i2v' ? '#f97316' : 'rgba(255,255,255,0.3)',
                  borderBottom: activeSection === 'i2v' ? '2px solid #f97316' : '2px solid transparent',
                }}
              >
                🎬 I2V
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveSection('edit'); }}
                style={{
                  flex: 1,
                  padding: '7px 6px',
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: activeSection === 'edit' ? 'rgba(34,211,238,0.1)' : 'transparent',
                  color: activeSection === 'edit' ? '#22d3ee' : 'rgba(255,255,255,0.3)',
                  borderBottom: activeSection === 'edit' ? '2px solid #22d3ee' : '2px solid transparent',
                }}
              >
                🎨 Image Prompt
              </button>
            </div>

            {/* I2V Section */}
            {activeSection === 'i2v' && (
              <div style={{
                padding: '6px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 4,
                maxHeight: 280,
                overflowY: 'auto',
              }}>
                {SHOT_CATEGORIES.map(cat => {
                  const hasNote = existingI2vCats.has(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={(e) => { e.stopPropagation(); handleAddI2vNote(cat.id); }}
                      disabled={hasNote}
                      title={hasNote ? `${cat.label} note already added` : `Add ${cat.label} note`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 9px',
                        borderRadius: 8,
                        border: `1px solid ${hasNote ? 'rgba(255,255,255,0.05)' : `${cat.color}25`}`,
                        background: hasNote ? 'rgba(255,255,255,0.02)' : `${cat.color}0a`,
                        cursor: hasNote ? 'not-allowed' : 'pointer',
                        opacity: hasNote ? 0.4 : 1,
                        transition: 'all 0.15s ease',
                        position: 'relative',
                      }}
                      onMouseEnter={e => {
                        if (!hasNote) {
                          (e.currentTarget as HTMLElement).style.border = `1px solid ${cat.color}50`;
                          (e.currentTarget as HTMLElement).style.background = `${cat.color}15`;
                          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${cat.color}20`;
                        }
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.border = `1px solid ${hasNote ? 'rgba(255,255,255,0.05)' : `${cat.color}25`}`;
                        (e.currentTarget as HTMLElement).style.background = hasNote ? 'rgba(255,255,255,0.02)' : `${cat.color}0a`;
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      <span style={{ fontSize: 13, lineHeight: 1 }}>{cat.icon}</span>
                      <span style={{
                        fontSize: 10,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: hasNote ? 'rgba(255,255,255,0.2)' : cat.color,
                        fontWeight: 600,
                      }}>
                        {cat.label}
                      </span>
                      {hasNote && (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Image Prompt (6-Part Formula) Section */}
            {activeSection === 'edit' && (
              <div style={{ padding: '6px' }}>
                {/* Header hint */}
                <div style={{
                  padding: '4px 4px 6px',
                  fontSize: 9,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'rgba(255,255,255,0.2)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  6-Part Prompt Formula
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 4,
                  maxHeight: 300,
                  overflowY: 'auto',
                }}>
                  {EDIT_CATEGORIES.map((cat, index) => {
                    const hasNote = existingEditCats.has(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={(e) => { e.stopPropagation(); handleAddEditNote(cat.id); }}
                        disabled={hasNote}
                        title={hasNote ? `${cat.label} note already added` : `Add ${cat.label} note`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 9px',
                          borderRadius: 8,
                          border: `1px solid ${hasNote ? 'rgba(255,255,255,0.05)' : `${cat.color}25`}`,
                          background: hasNote ? 'rgba(255,255,255,0.02)' : `${cat.color}0a`,
                          cursor: hasNote ? 'not-allowed' : 'pointer',
                          opacity: hasNote ? 0.4 : 1,
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={e => {
                          if (!hasNote) {
                            (e.currentTarget as HTMLElement).style.border = `1px solid ${cat.color}50`;
                            (e.currentTarget as HTMLElement).style.background = `${cat.color}15`;
                            (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${cat.color}20`;
                          }
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.border = `1px solid ${hasNote ? 'rgba(255,255,255,0.05)' : `${cat.color}25`}`;
                          (e.currentTarget as HTMLElement).style.background = hasNote ? 'rgba(255,255,255,0.02)' : `${cat.color}0a`;
                          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                        }}
                      >
                        {/* Step number */}
                        <span style={{
                          fontSize: 8,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: hasNote ? 'rgba(255,255,255,0.15)' : `${cat.color}80`,
                          fontWeight: 700,
                          minWidth: 10,
                          flexShrink: 0,
                        }}>
                          {index + 1}
                        </span>
                        <span style={{ fontSize: 12, lineHeight: 1 }}>{cat.icon}</span>
                        <span style={{
                          fontSize: 10,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: hasNote ? 'rgba(255,255,255,0.2)' : cat.color,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {cat.label}
                        </span>
                        {hasNote && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '2px 0' }} />

      {/* ── Copy + Crop + Download ── */}
      <div style={{ padding: '4px' }}>
        {image.mediaType !== 'video' && (
          <button
            onClick={handleCopy}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '7px 10px',
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.65)',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'background 0.12s ease, color 0.12s ease',
              textAlign: 'left',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLElement).style.color = '#fff';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy to Clipboard
          </button>
        )}

        {/* ── Crop (images only) ── */}
        {image.mediaType !== 'video' && (
          <button
            onClick={handleCrop}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '7px 10px',
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.65)',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'background 0.12s ease, color 0.12s ease',
              textAlign: 'left',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLElement).style.color = '#fff';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2v4H2" />
              <path d="M18 22v-4h4" />
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            Crop
          </button>
        )}

        <button
          onClick={handleDownload}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '7px 10px',
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.65)',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'background 0.12s ease, color 0.12s ease',
            textAlign: 'left',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
            (e.currentTarget as HTMLElement).style.color = '#fff';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '2px 0' }} />

        {/* ── Move to Project ── */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMoveSubmenu(!showMoveSubmenu); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 10px', borderRadius: 8, background: 'transparent',
              border: 'none', color: 'rgba(255,255,255,0.65)', fontSize: 13,
              cursor: 'pointer', transition: 'background 0.12s ease, color 0.12s ease', textAlign: 'left',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            Move to Project
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {showMoveSubmenu && (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', left: '100%', top: 0, marginLeft: 4,
                background: 'rgba(10,11,20,0.97)', backdropFilter: 'blur(28px) saturate(200%)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                padding: 4, minWidth: 180, zIndex: 200,
                boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
                animation: 'modalSlideUp 0.15s ease forwards',
              }}
            >
              {projects.filter(p => p.id !== currentProjectId).map(project => (
                <button
                  key={project.id}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!currentProjectId || !image) return;
                    await moveNotesToProject(image.id, project.id);
                    await moveImageToProject(image.id, project.id);
                    decrementImageCount(currentProjectId);
                    incrementImageCount(project.id);
                    hideContextMenu();
                    showToast(`Moved to ${project.name}`);
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 7, background: 'transparent',
                    border: 'none', color: 'rgba(255,255,255,0.65)', fontSize: 12,
                    cursor: 'pointer', transition: 'background 0.12s ease', textAlign: 'left',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <span style={{ fontSize: 14 }}>📁</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                </button>
              ))}

              {projects.filter(p => p.id !== currentProjectId).length === 0 && (
                <div style={{ padding: '8px 10px', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                  No other projects
                </div>
              )}

              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />

              {/* New project inline */}
              <div style={{ padding: '4px 6px', display: 'flex', gap: 4 }}>
                <input
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && newProjectName.trim() && currentProjectId && image) {
                      e.stopPropagation();
                      const project = await createProject(newProjectName.trim(), 'mood-board');
                      await moveNotesToProject(image.id, project.id);
                      await moveImageToProject(image.id, project.id);
                      decrementImageCount(currentProjectId);
                      incrementImageCount(project.id);
                      hideContextMenu();
                      showToast(`Moved to ${project.name}`);
                    }
                  }}
                  placeholder="New project…"
                  onClick={e => e.stopPropagation()}
                  onPointerDown={e => e.stopPropagation()}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 6, padding: '5px 8px', fontSize: 11, color: '#ddd', outline: 'none',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                />
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!newProjectName.trim() || !currentProjectId || !image) return;
                    const project = await createProject(newProjectName.trim(), 'mood-board');
                    await moveNotesToProject(image.id, project.id);
                    await moveImageToProject(image.id, project.id);
                    decrementImageCount(currentProjectId);
                    incrementImageCount(project.id);
                    hideContextMenu();
                    showToast(`Moved to ${project.name}`);
                  }}
                  style={{
                    background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)',
                    borderRadius: 6, color: '#f97316', fontSize: 10, cursor: 'pointer', padding: '4px 8px',
                    fontWeight: 600, transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.25)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.15)'}
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '2px 0' }} />

        {/* ── Delete ── */}
        <button
          onClick={handleDelete}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '7px 10px',
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            color: '#ef4444',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'background 0.12s ease',
            textAlign: 'left',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          </svg>
          Delete Shot
        </button>
      </div>
    </div>
  );
}
