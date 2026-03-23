import { useEffect, useState, useCallback } from 'react';
import { useProjectStore } from '../stores/useProjectStore';
import { Layout } from './Layout';
import { ProjectListPage } from './projects/ProjectListPage';
import { BoardPage } from './board/BoardPage';
import { SplashScreen } from './SplashScreen';
import { CustomCursor } from './CustomCursor';

export function App() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const isLoaded = useProjectStore((s) => s.isLoaded);
  const loadProjects = useProjectStore((s) => s.loadProjects);

  // Splash screen: show on first load, dismiss after animation (#6)
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Mouse-reactive glass shimmer (#5):
  // Tracks global mouse position as CSS custom properties on :root
  // so all .glass-panel elements can react to the light source position.
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const xPct = (e.clientX / window.innerWidth) * 100;
    const yPct = (e.clientY / window.innerHeight) * 100;
    const root = document.documentElement;
    root.style.setProperty('--mouse-x-pct', xPct.toFixed(1));
    root.style.setProperty('--mouse-y-pct', yPct.toFixed(1));
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <>
      {/* Custom glow cursor — desktop only (#7) */}
      <CustomCursor />

      {/* Cinematic load sequence (#6) */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      <Layout>
        {!isLoaded ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-[#555] text-sm">Loading...</div>
          </div>
        ) : currentProjectId ? (
          <BoardPage />
        ) : (
          <ProjectListPage />
        )}
      </Layout>
    </>
  );
}
