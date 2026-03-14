/**
 * Module-level ref that holds the last known canvas-space mouse position.
 * Canvas.tsx writes to it on every mouse move; useClipboardPaste reads from it
 * at paste time so images land at the cursor instead of viewport center.
 */
export const canvasMousePos = { x: 0, y: 0, initialized: false };
