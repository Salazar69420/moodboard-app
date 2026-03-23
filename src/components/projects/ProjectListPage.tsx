import { useRef, useCallback } from 'react';
import { useProjectStore } from '../../stores/useProjectStore';
import { useUIStore } from '../../stores/useUIStore';
import { ProjectCard } from './ProjectCard';
import { NewProjectDialog } from './NewProjectDialog';
import { importProject } from '../../utils/export-import';

export function ProjectListPage() {
  const projects = useProjectStore((s) => s.projects);
  const isCreatingProject = useUIStore((s) => s.isCreatingProject);
  const setCreatingProject = useUIStore((s) => s.setCreatingProject);
  const showToast = useUIStore((s) => s.showToast);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast('Importing project...');
      await importProject(file);
      await loadProjects();
      showToast('Project imported successfully');
    } catch (err) {
      console.error(err);
      showToast('Failed to import project');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Scroll-linked aurora parallax (#12):
  // As the user scrolls the project grid, the aurora gradient shifts position,
  // creating a sense of depth — the background floats independently.
  const handleGridScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight || 1);
    // Map scroll 0→1 to aurora shift 20%→70% vertically
    const auroraY = 20 + pct * 50;
    el.style.setProperty('--aurora-scroll-y', `${auroraY.toFixed(1)}%`);
  }, []);

  return (
    <div className="h-full flex flex-col" style={{ background: '#060711' }}>
      {/* Header — glass panel with DM Serif brand (#3) */}
      <div
        className="project-header-safe"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: 'rgba(7, 8, 17, 0.82)',
          backdropFilter: 'blur(48px) saturate(220%) brightness(1.15)',
          WebkitBackdropFilter: 'blur(48px) saturate(220%) brightness(1.15)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.3)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Brand mark — DM Serif Display + system-ui subtitle (#3) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <h1
            className="font-brand"
            style={{
              fontSize: '22px',
              color: '#e4e6f2',
              letterSpacing: '0.06em',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            AIM Media
          </h1>
          <p
            style={{
              fontSize: '10px',
              color: 'rgba(110, 115, 134, 0.80)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              margin: 0,
              marginTop: '1px',
            }}
          >
            Mood Board
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '9px 18px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              color: '#e4e6f2',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              minHeight: '44px',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.09)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.18)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.10)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import
          </button>
          <button
            onClick={() => setCreatingProject(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '9px 18px',
              background: 'rgba(238, 124, 53, 0.15)',
              border: '1px solid rgba(238, 124, 53, 0.32)',
              color: '#f4a76a',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              minHeight: '44px',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(238, 124, 53, 0.24)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(238, 124, 53, 0.50)';
              (e.currentTarget as HTMLElement).style.color = '#f8bc90';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(238, 124, 53, 0.15)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(238, 124, 53, 0.32)';
              (e.currentTarget as HTMLElement).style.color = '#f4a76a';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Project
          </button>
        </div>
      </div>

      {/* Project grid with scroll-linked aurora (#12) */}
      <div
        ref={gridRef}
        onScroll={handleGridScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px 24px',
          position: 'relative',
          // Aurora shifts with scroll via --aurora-scroll-y
          '--aurora-scroll-y': '20%',
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 20% var(--aurora-scroll-y, 20%), rgba(99, 102, 241, 0.08) 0%, transparent 60%),' +
            'radial-gradient(ellipse 60% 40% at 80% calc(100% - var(--aurora-scroll-y, 20%)), rgba(238, 124, 53, 0.05) 0%, transparent 55%),' +
            'radial-gradient(ellipse 50% 35% at 50% 10%, rgba(34, 211, 238, 0.04) 0%, transparent 50%)',
        } as React.CSSProperties}
      >
        {projects.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', textAlign: 'center',
          }}>
            <div style={{ color: '#1e2030', marginBottom: '20px' }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </div>
            <h2
              className="font-brand"
              style={{ fontSize: '22px', color: 'rgba(110, 115, 134, 0.75)', marginBottom: '8px' }}
            >
              No projects yet
            </h2>
            <p style={{
              fontSize: '13px',
              color: 'rgba(90, 94, 115, 0.7)',
              marginBottom: '24px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
              Create a project to start organizing your AI generations
            </p>
            <button
              onClick={() => setCreatingProject(true)}
              style={{
                padding: '10px 22px',
                background: 'rgba(238, 124, 53, 0.15)',
                border: '1px solid rgba(238, 124, 53, 0.32)',
                color: '#f4a76a',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                minHeight: '44px',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(238, 124, 53, 0.24)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(238, 124, 53, 0.15)';
              }}
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {isCreatingProject && <NewProjectDialog />}
    </div>
  );
}
