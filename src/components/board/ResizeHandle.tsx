import React from 'react';

export type Corner = 'nw' | 'ne' | 'sw' | 'se';

interface ResizeHandleProps {
    corner: Corner;
    onResizeStart: (e: React.PointerEvent, corner: Corner) => void;
}

export function ResizeHandle({ corner, onResizeStart }: ResizeHandleProps) {
    const positionStyles = {
        nw: { top: -6, left: -6, cursor: 'nwse-resize' },
        ne: { top: -6, right: -6, cursor: 'nesw-resize' },
        sw: { bottom: -6, left: -6, cursor: 'nesw-resize' },
        se: { bottom: -6, right: -6, cursor: 'nwse-resize' },
    }[corner];

    return (
        <div
            className="absolute bg-white border border-[#6366f1] rounded-full z-10 hover:scale-125 transition-transform shadow hover:shadow-lg"
            style={{
                ...positionStyles,
                width: 14,
                height: 14,
                touchAction: 'none',
            }}
            onPointerDown={(e) => onResizeStart(e, corner)}
        />
    );
}
