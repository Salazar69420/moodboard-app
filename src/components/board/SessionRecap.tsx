import { useState, useEffect, useCallback } from 'react';
import { useImageStore } from '../../stores/useImageStore';
import { useBoardStore } from '../../stores/useBoardStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { generateSessionRecap } from '../../utils/ai-features';

interface SessionRecapProps {
  projectId: string;
}

export function SessionRecap({ projectId }: SessionRecapProps) {
  const [recapText, setRecapText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const images = useImageStore((s) => s.images);
  const categoryNotes = useBoardStore((s) => s.categoryNotes);
  const editNotes = useBoardStore((s) => s.editNotes);
  const promptNodes = useBoardStore((s) => s.promptNodes);

  const dismiss = useCallback(() => {
    setIsFadingOut(true);
    setTimeout(() => setIsDismissed(true), 600);
  }, []);

  useEffect(() => {
    if (isDismissed || isLoading || recapText) return;
    if (images.length < 2) return;

    const { apiKey, model: settingsModel } = useSettingsStore.getState();
    if (!apiKey) return;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const model = settingsModel || 'anthropic/claude-opus-4-6';
        const allNotes = [...categoryNotes, ...editNotes];
        const imagesWithNotes = new Set(allNotes.map(n => n.imageId));
        const imagesWithPrompts = new Set(promptNodes.map(p => p.imageId));

        const metadata = {
          totalImages: images.length,
          imagesWithNoNotes: images.filter(img => !imagesWithNotes.has(img.id)).length,
          imagesWithNotesNoPrompt: images.filter(img => imagesWithNotes.has(img.id) && !imagesWithPrompts.has(img.id)).length,
          imagesWithOutdatedPrompts: 0,
          imageNames: images.filter(i => i.label).map(i => i.label!).slice(0, 8),
          lastUpdated: Math.max(...images.map(i => i.createdAt), 0),
        };

        const recap = await generateSessionRecap(apiKey, model, metadata);
        if (recap) setRecapText(recap);
      } catch {
        // Silently fail — recap is non-critical
      } finally {
        setIsLoading(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [projectId, images.length]);

  useEffect(() => {
    if (recapText && !isDismissed) {
      const timer = setTimeout(dismiss, 15000);
      return () => clearTimeout(timer);
    }
  }, [recapText, isDismissed, dismiss]);

  if (isDismissed || (!recapText && !isLoading)) return null;

  return (
    <div className={`session-recap ${isFadingOut ? 'fading-out' : ''}`}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f97316, #f59e0b)',
            boxShadow: '0 0 8px rgba(249,115,22,0.5)',
            animation: 'pulse 2s ease-in-out infinite',
            display: 'inline-block',
          }} />
          <span style={{
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            Session Recap
          </span>
        </div>
        <button
          onClick={dismiss}
          className="spring-btn"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#555',
            cursor: 'pointer',
            fontSize: 14,
            padding: '2px 6px',
          }}
        >✕</button>
      </div>

      {isLoading ? (
        <div style={{
          color: '#555',
          fontSize: 12,
          fontFamily: "'Inter', system-ui, sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
          Recalling where you left off...
        </div>
      ) : (
        <p style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: 13,
          fontFamily: "'Inter', system-ui, sans-serif",
          lineHeight: 1.6,
          margin: 0,
        }}>
          {recapText}
        </p>
      )}

      {recapText && !isFadingOut && (
        <div style={{
          marginTop: 12,
          height: 2,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #f97316, #f59e0b)',
            borderRadius: 2,
            animation: 'shrinkBar 15s linear forwards',
          }} />
        </div>
      )}

      <style>{`
        @keyframes shrinkBar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
