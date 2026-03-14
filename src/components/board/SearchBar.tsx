import { useEffect, useRef, useMemo } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useBoardStore } from '../../stores/useBoardStore';
import { useImageStore } from '../../stores/useImageStore';
import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../../types';

interface SearchBarProps {
    onJumpTo: (x: number, y: number) => void;
}

export function SearchBar({ onJumpTo }: SearchBarProps) {
    const isOpen = useUIStore((s) => s.isSearchOpen);
    const query = useUIStore((s) => s.searchQuery);
    const setQuery = useUIStore((s) => s.setSearchQuery);
    const setOpen = useUIStore((s) => s.setSearchOpen);

    const categoryNotes = useBoardStore((s) => s.categoryNotes);
    const editNotes = useBoardStore((s) => s.editNotes);
    const textNodes = useBoardStore((s) => s.textNodes);
    const promptNodes = useBoardStore((s) => s.promptNodes);
    const images = useImageStore((s) => s.images);

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const results = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        const items: { label: string; icon: string; x: number; y: number }[] = [];

        for (const n of categoryNotes) {
            if (n.text.toLowerCase().includes(q)) {
                const cat = SHOT_CATEGORIES.find(c => c.id === n.categoryId);
                items.push({ label: `${cat?.icon || '📎'} ${cat?.label}: "${n.text.slice(0, 40)}…"`, icon: cat?.icon || '📎', x: n.x, y: n.y });
            }
        }
        for (const n of editNotes) {
            if (n.text.toLowerCase().includes(q)) {
                const cat = EDIT_CATEGORIES.find(c => c.id === n.categoryId);
                items.push({ label: `${cat?.icon || '✏️'} ${cat?.label}: "${n.text.slice(0, 40)}…"`, icon: cat?.icon || '✏️', x: n.x, y: n.y });
            }
        }
        for (const n of textNodes) {
            if (n.text.toLowerCase().includes(q)) {
                items.push({ label: `📝 "${n.text.slice(0, 50)}…"`, icon: '📝', x: n.x, y: n.y });
            }
        }
        for (const n of promptNodes) {
            if (n.text.toLowerCase().includes(q)) {
                items.push({ label: `⚡ Prompt: "${n.text.slice(0, 40)}…"`, icon: '⚡', x: n.x, y: n.y });
            }
        }
        for (const img of images) {
            if (img.label && img.label.toLowerCase().includes(q)) {
                items.push({ label: `🖼️ Image: ${img.label}`, icon: '🖼️', x: img.x, y: img.y });
            }
        }

        return items.slice(0, 10);
    }, [query, categoryNotes, editNotes, textNodes, promptNodes, images]);

    if (!isOpen) return null;

    return (
        <div className="search-bar" onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'relative' }}>
                <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setOpen(false);
                    }}
                    placeholder="Search notes, labels, prompts…"
                />
            </div>
            {results.length > 0 && (
                <div className="search-results">
                    {results.map((r, i) => (
                        <div
                            key={i}
                            className="search-result"
                            onClick={() => {
                                onJumpTo(r.x, r.y);
                                setOpen(false);
                            }}
                        >
                            <span>{r.label}</span>
                        </div>
                    ))}
                </div>
            )}
            {query.trim() && results.length === 0 && (
                <div style={{ padding: '8px 10px', fontSize: 11, color: '#555' }}>
                    No results found
                </div>
            )}
        </div>
    );
}
