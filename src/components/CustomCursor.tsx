import { useEffect, useRef, useState } from 'react';

// Only show on pointer-fine (desktop) devices
const IS_FINE_POINTER = typeof window !== 'undefined' &&
  window.matchMedia('(pointer: fine)').matches;

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  // Ring position — lags behind with spring
  const ringPos = useRef({ x: -100, y: -100 });
  const mousePos = useRef({ x: -100, y: -100 });
  const rafId = useRef<number>(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!IS_FINE_POINTER) return;

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };

      // Dot follows immediately
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%))`;
      }
    };

    // Animate ring with spring lag
    const animateRing = () => {
      const stiffness = 0.12; // lower = more lag
      const dx = mousePos.current.x - ringPos.current.x;
      const dy = mousePos.current.y - ringPos.current.y;
      ringPos.current.x += dx * stiffness;
      ringPos.current.y += dy * stiffness;

      if (ringRef.current) {
        ringRef.current.style.transform =
          `translate(calc(${ringPos.current.x}px - 50%), calc(${ringPos.current.y}px - 50%))`;
      }

      rafId.current = requestAnimationFrame(animateRing);
    };

    // Hover detection — magnetic feel on buttons / interactive elements
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest('button, a, [role="button"], input, textarea, select, label')) {
        setIsHovering(true);
      }
    };
    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest('button, a, [role="button"], input, textarea, select, label')) {
        setIsHovering(false);
      }
    };

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseover', onMouseOver, { passive: true });
    document.addEventListener('mouseout', onMouseOut, { passive: true });
    rafId.current = requestAnimationFrame(animateRing);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  // Don't render on touch devices
  if (!IS_FINE_POINTER) return null;

  return (
    <div className={isHovering ? 'cursor-hover' : ''}>
      <div ref={dotRef} className="custom-cursor-dot" />
      <div ref={ringRef} className="custom-cursor-ring" />
    </div>
  );
}
