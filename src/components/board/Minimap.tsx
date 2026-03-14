import { useCallback } from 'react';
import type { BoardImage } from '../../types';
import type { CategoryNote, EditNote, PromptNode } from '../../types';

const DISPLAY_MAX_WIDTH = 350;

interface MinimapProps {
    images: BoardImage[];
    categoryNotes: CategoryNote[];
    editNotes: EditNote[];
    promptNodes: PromptNode[];
    panX: number;
    panY: number;
    zoom: number;
    containerWidth: number;
    containerHeight: number;
    onJump: (panX: number, panY: number) => void;
}

export function Minimap({
    images,
    categoryNotes,
    editNotes,
    promptNodes,
    panX,
    panY,
    zoom,
    containerWidth,
    containerHeight,
    onJump,
}: MinimapProps) {
    // Calculate bounds of all nodes
    const allNodes: { x: number; y: number; w: number; h: number; type: string }[] = [];

    for (const img of images) {
        const w = img.displayWidth ?? Math.min(img.width, DISPLAY_MAX_WIDTH);
        const h = img.displayHeight ?? (img.height > 0 ? (w / img.width) * img.height : w * 0.75);
        allNodes.push({ x: img.x, y: img.y, w, h, type: 'image' });
    }
    for (const n of categoryNotes) {
        allNodes.push({ x: n.x, y: n.y, w: n.width, h: n.height, type: 'note' });
    }
    for (const n of editNotes) {
        allNodes.push({ x: n.x, y: n.y, w: n.width, h: n.height, type: 'note' });
    }
    for (const n of promptNodes) {
        allNodes.push({ x: n.x, y: n.y, w: n.width, h: 80, type: 'note' });
    }

    if (allNodes.length === 0) return null;

    // Calculate bounding box with padding
    const PAD = 200;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of allNodes) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + n.w);
        maxY = Math.max(maxY, n.y + n.h);
    }
    minX -= PAD; minY -= PAD; maxX += PAD; maxY += PAD;

    const worldW = maxX - minX;
    const worldH = maxY - minY;

    const MINIMAP_W = 180;
    const MINIMAP_H = 120;
    const scaleX = MINIMAP_W / worldW;
    const scaleY = MINIMAP_H / worldH;
    const scale = Math.min(scaleX, scaleY);

    // Viewport indicator
    const vpLeft = (-panX / zoom - minX) * scale;
    const vpTop = (-panY / zoom - minY) * scale;
    const vpWidth = (containerWidth / zoom) * scale;
    const vpHeight = (containerHeight / zoom) * scale;

    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Convert minimap coords to world coords (center viewport on click)
        const worldX = clickX / scale + minX;
        const worldY = clickY / scale + minY;

        const newPanX = -(worldX * zoom - containerWidth / 2);
        const newPanY = -(worldY * zoom - containerHeight / 2);

        onJump(newPanX, newPanY);
    }, [scale, minX, minY, zoom, containerWidth, containerHeight, onJump]);

    return (
        <div className="minimap-container" onClick={handleClick}>
            {/* Render nodes */}
            {allNodes.map((n, i) => (
                <div
                    key={i}
                    className={`minimap-node${n.type === 'note' ? ' note-node' : ''}`}
                    style={{
                        left: (n.x - minX) * scale,
                        top: (n.y - minY) * scale,
                        width: Math.max(2, n.w * scale),
                        height: Math.max(2, n.h * scale),
                    }}
                />
            ))}

            {/* Viewport indicator */}
            <div
                className="minimap-viewport"
                style={{
                    left: Math.max(0, vpLeft),
                    top: Math.max(0, vpTop),
                    width: Math.min(MINIMAP_W, vpWidth),
                    height: Math.min(MINIMAP_H, vpHeight),
                }}
            />
        </div>
    );
}
