import { useState } from 'react';
import type { Project } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import { useUIStore } from '../../stores/useUIStore';
import { useBlobUrl } from '../../hooks/useBlobUrl';
import { TypeBadge } from '../shared/TypeBadge';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { exportProject } from '../../utils/export-import';
import { hapticLight, hapticError } from '../../utils/haptic';

export function ProjectCard({ project }: { project: Project }) {
  const [showDelete, setShowDelete] = useState(false);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const showToast = useUIStore((s) => s.showToast);
  const thumbnailUrl = useBlobUrl(project.thumbnailBlobId);

  const handleDelete = async () => {
    hapticError();
    await deleteProject(project.id);
    showToast('Project deleted');
    setShowDelete(false);
  };

  const handleOpen = () => {
    hapticLight();
    setCurrentProject(project.id);
  };

  const timeAgo = getTimeAgo(project.updatedAt);

  return (
    <>
      <div
        style={{
          position: 'relative',
          background: 'rgba(10, 11, 20, 0.60)',
          backdropFilter: 'blur(32px) saturate(180%) brightness(1.1)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%) brightness(1.1)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          borderRadius: '16px',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s var(--spring-smooth)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        }}
        onClick={handleOpen}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(238, 124, 53, 0.30)';
          (e.currentTarget as HTMLElement).style.boxShadow =
            '0 8px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(238, 124, 53, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.10)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.09)';
          (e.currentTarget as HTMLElement).style.boxShadow =
            '0 4px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }}
      >
        {/* Thumbnail */}
        <div style={{ aspectRatio: '16/9', background: '#0a0b14', overflow: 'hidden' }}>
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={project.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              draggable={false}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.10)',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '10px 12px 12px' }}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#e4e6f2',
            marginBottom: '6px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            {project.name}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <TypeBadge type={project.type} size="xs" />
            <span style={{
              fontSize: '10px',
              color: 'rgba(110, 115, 134, 0.70)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
              {project.imageCount} {project.imageCount === 1 ? 'image' : 'images'} · {timeAgo}
            </span>
          </div>
        </div>

        {/* Action buttons — appear on hover */}
        <div
          className="touch-always-visible"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            gap: '6px',
            opacity: 0,
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={e => {
            // Keep visible when hovering buttons
            e.stopPropagation();
          }}
          ref={el => {
            if (!el) return;
            const card = el.parentElement;
            if (!card) return;
            card.addEventListener('mouseenter', () => { el.style.opacity = '1'; });
            card.addEventListener('mouseleave', () => { el.style.opacity = '0'; });
          }}
        >
          <button
            onClick={async (e) => {
              e.stopPropagation();
              hapticLight();
              try {
                showToast('Exporting project...');
                await exportProject(project.id);
                showToast('Project exported successfully');
              } catch (err) {
                console.error(err);
                showToast('Failed to export project');
              }
            }}
            style={{
              background: 'rgba(0, 0, 0, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'rgba(228, 230, 242, 0.65)',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              transition: 'all 0.15s ease',
              backdropFilter: 'blur(12px)',
            }}
            title="Export Project"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              hapticLight();
              setShowDelete(true);
            }}
            style={{
              background: 'rgba(0, 0, 0, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'rgba(228, 230, 242, 0.65)',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              transition: 'all 0.15s ease',
              backdropFilter: 'blur(12px)',
            }}
            title="Delete Project"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {showDelete && (
        <ConfirmDialog
          title="Delete Project"
          message={`Delete "${project.name}" and all its images? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
