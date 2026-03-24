import { create } from 'zustand';
import type { Connection, TextNode, CategoryNote, ShotCategoryId, EditNote, EditCategoryId, PromptNode, GodModeNode, DocumentNode, EvalResult } from '../types';
import { getDB } from '../utils/db';
import { nanoid } from 'nanoid';
import { getDocumentNodesByProject, storeDocumentNode, deleteDocumentNode } from '../utils/db-operations';
import { useImageStore } from './useImageStore';

interface BoardStore {
    connections: Connection[];
    textNodes: TextNode[];
    categoryNotes: CategoryNote[];
    editNotes: EditNote[];
    connectingFromId: string | null;
    boardMode: 'i2v' | 'edit';

    setBoardMode: (mode: 'i2v' | 'edit') => void;
    loadBoard: (projectId: string) => Promise<void>;

    startConnection: (fromId: string) => void;
    finishConnection: (projectId: string, toId: string) => Promise<void>;
    cancelConnection: () => void;
    removeConnection: (id: string) => Promise<void>;
    updateConnectionLabel: (id: string, label: string) => Promise<void>;

    addTextNode: (projectId: string, x: number, y: number) => Promise<string>;
    updateTextNode: (id: string, updates: Partial<TextNode>) => Promise<void>;
    removeTextNode: (id: string) => Promise<void>;

    addCategoryNote: (
        projectId: string,
        imageId: string,
        categoryId: ShotCategoryId,
        x: number,
        y: number
    ) => Promise<string>;
    updateCategoryNote: (id: string, updates: Partial<CategoryNote>) => Promise<void>;
    removeCategoryNote: (id: string) => Promise<void>;
    removeCategoryNotesForImage: (imageId: string) => Promise<void>;

    // ── Edit Notes ──
    addEditNote: (
        projectId: string,
        imageId: string,
        categoryId: EditCategoryId,
        x: number,
        y: number
    ) => Promise<string>;
    updateEditNote: (id: string, updates: Partial<EditNote>) => Promise<void>;
    removeEditNote: (id: string) => Promise<void>;
    removeEditNotesForImage: (imageId: string) => Promise<void>;

    // ── Note Duplication ──
    duplicateCategoryNoteToImage: (
        noteId: string,
        targetImageId: string,
        targetX: number,
        targetY: number,
        overwrite?: boolean,
    ) => Promise<{ success: boolean; conflict?: boolean; existingNoteId?: string }>;
    duplicateEditNoteToImage: (
        noteId: string,
        targetImageId: string,
        targetX: number,
        targetY: number,
        overwrite?: boolean,
    ) => Promise<{ success: boolean; conflict?: boolean; existingNoteId?: string }>;

    // ── Prompt Nodes ──
    promptNodes: PromptNode[];
    addPromptNode: (
        projectId: string,
        imageId: string,
        text: string,
        model: string,
        promptType: 'i2v' | 'edit',
        x: number,
        y: number,
    ) => Promise<string>;
    updatePromptNode: (id: string, updates: Partial<PromptNode>) => Promise<void>;
    removePromptNode: (id: string) => Promise<void>;
    regeneratePromptNode: (id: string, newText: string, newModel: string) => Promise<void>;
    restorePromptVersion: (id: string, versionIndex: number) => Promise<void>;

    // ── Auto-arrange ──
    autoArrangeNotes: (images: import('../types').BoardImage[]) => Promise<void>;

    // ── God Mode Nodes ──
    godModeNodes: GodModeNode[];
    addGodModeNode: (projectId: string, x: number, y: number) => Promise<string>;
    updateGodModeNode: (id: string, updates: Partial<GodModeNode>) => Promise<void>;
    removeGodModeNode: (id: string) => Promise<void>;

    // ── Document Nodes ──
    documentNodes: DocumentNode[];
    addDocumentNode: (projectId: string, x: number, y: number, title?: string, content?: string) => Promise<string>;
    updateDocumentNode: (id: string, updates: Partial<DocumentNode>) => Promise<void>;
    removeDocumentNode: (id: string) => Promise<void>;
    upsertDocumentNodeFromRemote: (node: DocumentNode) => void;
    removeDocumentNodeFromRemote: (id: string) => void;

    // ── Image Evaluation ──
    updateImageEvaluation: (imageId: string, evaluation: 'accepted' | 'rejected' | null, critique?: string) => Promise<void>;
    updatePromptNodeEval: (id: string, evalResult: EvalResult) => Promise<void>;

    // ── Move ──
    moveNotesToProject: (imageId: string, targetProjectId: string) => Promise<void>;

    // ── Remote-safe mutations (no Yjs write-back) ──
    upsertCategoryNoteFromRemote: (note: CategoryNote) => void;
    removeCategoryNoteFromRemote: (id: string) => void;
    upsertEditNoteFromRemote: (note: EditNote) => void;
    removeEditNoteFromRemote: (id: string) => void;
    upsertTextNodeFromRemote: (node: TextNode) => void;
    removeTextNodeFromRemote: (id: string) => void;
    upsertPromptNodeFromRemote: (node: PromptNode) => void;
    removePromptNodeFromRemote: (id: string) => void;
    upsertConnectionFromRemote: (conn: Connection) => void;
    removeConnectionFromRemote: (id: string) => void;
}

export const useBoardStore = create<BoardStore>((set, get) => ({
    connections: [],
    textNodes: [],
    categoryNotes: [],
    editNotes: [],
    promptNodes: [],
    godModeNodes: [],
    documentNodes: [],
    connectingFromId: null,
    boardMode: 'i2v',

    setBoardMode: (mode) => set({ boardMode: mode }),

    loadBoard: async (projectId) => {
        const db = await getDB();
        const connections = await db.getAllFromIndex('connections', 'by-project', projectId);
        const textNodes = await db.getAllFromIndex('textNodes', 'by-project', projectId);
        const categoryNotes = await db.getAllFromIndex('categoryNotes', 'by-project', projectId);
        const editNotes = await db.getAllFromIndex('editNotes', 'by-project', projectId);
        const promptNodes = await db.getAllFromIndex('promptNodes', 'by-project', projectId);
        const godModeNodesRaw = await db.getAllFromIndex('godModeNodes', 'by-project', projectId);
        // Backward compatibility: ensure connectedImageIds exists on old nodes
        const godModeNodes = godModeNodesRaw.map((g: any) => ({ ...g, connectedImageIds: g.connectedImageIds ?? [] }));
        const documentNodes = await getDocumentNodesByProject(projectId);
        set({ connections, textNodes, categoryNotes, editNotes, promptNodes, godModeNodes, documentNodes, connectingFromId: null });
    },

    startConnection: (fromId) => set({ connectingFromId: fromId }),

    finishConnection: async (projectId, toId) => {
        const fromId = get().connectingFromId;
        if (!fromId || fromId === toId) {
            set({ connectingFromId: null });
            return;
        }

        const exists = get().connections.some(c =>
            (c.fromId === fromId && c.toId === toId) ||
            (c.fromId === toId && c.toId === fromId)
        );

        if (!exists) {
            const db = await getDB();
            const newConn: Connection = {
                id: nanoid(),
                projectId,
                fromId,
                toId,
                label: ''
            };
            await db.put('connections', newConn);
            set(state => ({
                connections: [...state.connections, newConn],
                connectingFromId: null
            }));

            // If connecting to a God Mode node, add image to its connectedImageIds
            const godNode = get().godModeNodes.find(g => g.id === toId);
            if (godNode && !godNode.connectedImageIds.includes(fromId)) {
                const updated = { ...godNode, connectedImageIds: [...godNode.connectedImageIds, fromId] };
                await db.put('godModeNodes', updated);
                set(s => ({ godModeNodes: s.godModeNodes.map(g => g.id === toId ? updated : g) }));
            }
            // Also check reverse — from god mode to image
            const godNodeFrom = get().godModeNodes.find(g => g.id === fromId);
            if (godNodeFrom && !godNodeFrom.connectedImageIds.includes(toId)) {
                const updated = { ...godNodeFrom, connectedImageIds: [...godNodeFrom.connectedImageIds, toId] };
                await db.put('godModeNodes', updated);
                set(s => ({ godModeNodes: s.godModeNodes.map(g => g.id === fromId ? updated : g) }));
            }
        } else {
            set({ connectingFromId: null });
        }
    },

    cancelConnection: () => set({ connectingFromId: null }),

    removeConnection: async (id) => {
        const db = await getDB();
        await db.delete('connections', id);
        set(state => ({
            connections: state.connections.filter(c => c.id !== id)
        }));
    },

    updateConnectionLabel: async (id, label) => {
        const db = await getDB();
        const conn = await db.get('connections', id);
        if (conn) {
            conn.label = label;
            await db.put('connections', conn);
            set(state => ({
                connections: state.connections.map(c => c.id === id ? { ...c, label } : c)
            }));
        }
    },

    addTextNode: async (projectId, x, y) => {
        const db = await getDB();
        const id = nanoid();
        const newNode: TextNode = {
            id,
            projectId,
            text: '',
            x,
            y,
            width: 200,
            height: 100,
            color: '#ffffff',
            fontSize: 14
        };
        await db.put('textNodes', newNode);
        set(state => ({
            textNodes: [...state.textNodes, newNode]
        }));
        return id;
    },

    updateTextNode: async (id, updates) => {
        const db = await getDB();
        const node = await db.get('textNodes', id);
        if (node) {
            const updatedNode = { ...node, ...updates };
            await db.put('textNodes', updatedNode);
            set(state => ({
                textNodes: state.textNodes.map(n => n.id === id ? updatedNode : n)
            }));
        }
    },

    removeTextNode: async (id) => {
        const db = await getDB();
        await db.delete('textNodes', id);
        set(state => ({
            textNodes: state.textNodes.filter(n => n.id !== id)
        }));
    },

    // ─── Category Notes ──────────────────────────────────────────────────────

    addCategoryNote: async (projectId, imageId, categoryId, x, y) => {
        const db = await getDB();
        const id = nanoid();
        const newNote: CategoryNote = {
            id,
            projectId,
            imageId,
            categoryId,
            text: '',
            x,
            y,
            width: 240,
            height: 160,
            checkedPrompts: [],
            isMinimized: false,
        };
        await db.put('categoryNotes', newNote);
        set(state => ({ categoryNotes: [...state.categoryNotes, newNote] }));
        return id;
    },

    updateCategoryNote: async (id, updates) => {
        const db = await getDB();
        const note = await db.get('categoryNotes', id);
        if (note) {
            const updated = { ...note, ...updates };
            await db.put('categoryNotes', updated);
            set(state => ({
                categoryNotes: state.categoryNotes.map(n => n.id === id ? updated : n)
            }));
        }
    },

    removeCategoryNote: async (id) => {
        const db = await getDB();
        await db.delete('categoryNotes', id);
        set(state => ({
            categoryNotes: state.categoryNotes.filter(n => n.id !== id)
        }));
    },

    removeCategoryNotesForImage: async (imageId) => {
        const db = await getDB();
        const notes = await db.getAllFromIndex('categoryNotes', 'by-image', imageId);
        for (const note of notes) {
            await db.delete('categoryNotes', note.id);
        }
        set(state => ({
            categoryNotes: state.categoryNotes.filter(n => n.imageId !== imageId)
        }));
    },

    // ─── Edit Notes ──────────────────────────────────────────────────────────

    addEditNote: async (projectId, imageId, categoryId, x, y) => {
        const db = await getDB();
        const id = nanoid();
        const newNote: EditNote = {
            id,
            projectId,
            imageId,
            categoryId,
            text: '',
            x,
            y,
            width: 240,
            height: 160,
            checkedPrompts: [],
            isMinimized: false,
        };
        await db.put('editNotes', newNote);
        set(state => ({ editNotes: [...state.editNotes, newNote] }));
        return id;
    },

    updateEditNote: async (id, updates) => {
        const db = await getDB();
        const note = await db.get('editNotes', id);
        if (note) {
            const updated = { ...note, ...updates };
            await db.put('editNotes', updated);
            set(state => ({
                editNotes: state.editNotes.map(n => n.id === id ? updated : n)
            }));
        }
    },

    removeEditNote: async (id) => {
        const db = await getDB();
        await db.delete('editNotes', id);
        set(state => ({
            editNotes: state.editNotes.filter(n => n.id !== id)
        }));
    },

    removeEditNotesForImage: async (imageId) => {
        const db = await getDB();
        const notes = await db.getAllFromIndex('editNotes', 'by-image', imageId);
        for (const note of notes) {
            await db.delete('editNotes', note.id);
        }
        set(state => ({
            editNotes: state.editNotes.filter(n => n.imageId !== imageId)
        }));
    },

    // ─── Note Duplication ─────────────────────────────────────────────────────

    duplicateCategoryNoteToImage: async (noteId, targetImageId, targetX, targetY, overwrite = false) => {
        const sourceNote = get().categoryNotes.find(n => n.id === noteId);
        if (!sourceNote) return { success: false };

        // Check for conflict
        const existing = get().categoryNotes.find(
            n => n.imageId === targetImageId && n.categoryId === sourceNote.categoryId
        );

        if (existing && !overwrite) {
            return { success: false, conflict: true, existingNoteId: existing.id };
        }

        const db = await getDB();

        if (existing && overwrite) {
            // Overwrite the existing note's content
            const updated = {
                ...existing,
                text: sourceNote.text,
                checkedPrompts: [...sourceNote.checkedPrompts],
            };
            await db.put('categoryNotes', updated);
            set(state => ({
                categoryNotes: state.categoryNotes.map(n => n.id === existing.id ? updated : n)
            }));
            return { success: true };
        }

        // Create new duplicate
        const id = nanoid();
        const newNote: CategoryNote = {
            id,
            projectId: sourceNote.projectId,
            imageId: targetImageId,
            categoryId: sourceNote.categoryId,
            text: sourceNote.text,
            x: targetX,
            y: targetY,
            width: sourceNote.width,
            height: sourceNote.height,
            checkedPrompts: [...sourceNote.checkedPrompts],
            isMinimized: false,
        };
        await db.put('categoryNotes', newNote);
        set(state => ({ categoryNotes: [...state.categoryNotes, newNote] }));
        return { success: true };
    },

    duplicateEditNoteToImage: async (noteId, targetImageId, targetX, targetY, overwrite = false) => {
        const sourceNote = get().editNotes.find(n => n.id === noteId);
        if (!sourceNote) return { success: false };

        // Check for conflict
        const existing = get().editNotes.find(
            n => n.imageId === targetImageId && n.categoryId === sourceNote.categoryId
        );

        if (existing && !overwrite) {
            return { success: false, conflict: true, existingNoteId: existing.id };
        }

        const db = await getDB();

        if (existing && overwrite) {
            const updated = {
                ...existing,
                text: sourceNote.text,
                checkedPrompts: [...sourceNote.checkedPrompts],
            };
            await db.put('editNotes', updated);
            set(state => ({
                editNotes: state.editNotes.map(n => n.id === existing.id ? updated : n)
            }));
            return { success: true };
        }

        const id = nanoid();
        const newNote: EditNote = {
            id,
            projectId: sourceNote.projectId,
            imageId: targetImageId,
            categoryId: sourceNote.categoryId,
            text: sourceNote.text,
            x: targetX,
            y: targetY,
            width: sourceNote.width,
            height: sourceNote.height,
            checkedPrompts: [...sourceNote.checkedPrompts],
            isMinimized: false,
        };
        await db.put('editNotes', newNote);
        set(state => ({ editNotes: [...state.editNotes, newNote] }));
        return { success: true };
    },

    // ─── Prompt Nodes ────────────────────────────────────────────────────────

    addPromptNode: async (projectId, imageId, text, model, promptType, x, y) => {
        const db = await getDB();
        const id = nanoid();
        const newNode: PromptNode = {
            id,
            projectId,
            imageId,
            text,
            model,
            promptType,
            x,
            y,
            width: 280,
            isMinimized: false,
            createdAt: Date.now(),
        };
        await db.put('promptNodes', newNode);
        set(state => ({ promptNodes: [...state.promptNodes, newNode] }));
        return id;
    },

    updatePromptNode: async (id, updates) => {
        const db = await getDB();
        const node = await db.get('promptNodes', id);
        if (node) {
            const updated = { ...node, ...updates };
            await db.put('promptNodes', updated);
            set(state => ({
                promptNodes: state.promptNodes.map(n => n.id === id ? updated : n)
            }));
        }
    },

    removePromptNode: async (id) => {
        const db = await getDB();
        await db.delete('promptNodes', id);
        set(state => ({
            promptNodes: state.promptNodes.filter(n => n.id !== id)
        }));
    },

    regeneratePromptNode: async (id, newText, newModel) => {
        const db = await getDB();
        const node = await db.get('promptNodes', id);
        if (node) {
            // Push current version into history (keep max 3)
            const currentVersion = {
                text: node.text,
                model: node.model,
                createdAt: node.createdAt,
            };
            const prevHistory = node.history || [];
            const newHistory = [currentVersion, ...prevHistory].slice(0, 3);

            const updated = {
                ...node,
                text: newText,
                model: newModel,
                createdAt: Date.now(),
                history: newHistory,
            };
            await db.put('promptNodes', updated);
            set(state => ({
                promptNodes: state.promptNodes.map(n => n.id === id ? updated : n)
            }));
        }
    },

    restorePromptVersion: async (id, versionIndex) => {
        const db = await getDB();
        const node = await db.get('promptNodes', id);
        if (node && node.history && node.history[versionIndex]) {
            const version = node.history[versionIndex];
            // Push current into history in place of restored version
            const currentVersion = {
                text: node.text,
                model: node.model,
                createdAt: node.createdAt,
            };
            const newHistory = [...(node.history || [])];
            newHistory[versionIndex] = currentVersion;

            const updated = {
                ...node,
                text: version.text,
                model: version.model,
                createdAt: version.createdAt,
                history: newHistory,
            };
            await db.put('promptNodes', updated);
            set(state => ({
                promptNodes: state.promptNodes.map(n => n.id === id ? updated : n)
            }));
        }
    },

    // ─── God Mode Nodes ───────────────────────────────────────────────────────

    addGodModeNode: async (projectId, x, y) => {
        const db = await getDB();
        const id = nanoid();
        const newNode: GodModeNode = {
            id,
            projectId,
            title: 'God Mode',
            text: '',
            isEnabled: true,
            x,
            y,
            width: 280,
            isMinimized: false,
            createdAt: Date.now(),
            connectedImageIds: [],
        };
        await db.put('godModeNodes', newNode);
        set(state => ({ godModeNodes: [...state.godModeNodes, newNode] }));
        return id;
    },

    updateGodModeNode: async (id, updates) => {
        const db = await getDB();
        const node = await db.get('godModeNodes', id);
        if (node) {
            const updated = { ...node, ...updates };
            await db.put('godModeNodes', updated);
            set(state => ({
                godModeNodes: state.godModeNodes.map(n => n.id === id ? updated : n)
            }));
        }
    },

    removeGodModeNode: async (id) => {
        const db = await getDB();
        await db.delete('godModeNodes', id);
        set(state => ({
            godModeNodes: state.godModeNodes.filter(n => n.id !== id)
        }));
    },

    // ─── Document Nodes ───────────────────────────────────────────────────

    addDocumentNode: async (projectId, x, y, title = 'Brief', content = '') => {
        const id = nanoid();
        const node: DocumentNode = {
            id,
            projectId,
            title,
            content,
            x,
            y,
            width: 320,
            height: 200,
            isMinimized: false,
            createdAt: Date.now(),
            sourceType: 'paste',
        };
        await storeDocumentNode(node);
        set(state => ({ documentNodes: [...state.documentNodes, node] }));
        return id;
    },

    updateDocumentNode: async (id, updates) => {
        const node = get().documentNodes.find(n => n.id === id);
        if (!node) return;
        const updated = { ...node, ...updates };
        await storeDocumentNode(updated);
        set(state => ({ documentNodes: state.documentNodes.map(n => n.id === id ? updated : n) }));
    },

    removeDocumentNode: async (id) => {
        await deleteDocumentNode(id);
        set(state => ({ documentNodes: state.documentNodes.filter(n => n.id !== id) }));
    },

    upsertDocumentNodeFromRemote: (node) => {
        set(s => {
            const exists = s.documentNodes.some(n => n.id === node.id);
            return { documentNodes: exists ? s.documentNodes.map(n => n.id === node.id ? { ...n, ...node } : n) : [...s.documentNodes, node] };
        });
        storeDocumentNode(node).catch(() => {});
    },

    removeDocumentNodeFromRemote: (id) => {
        set(s => ({ documentNodes: s.documentNodes.filter(n => n.id !== id) }));
        deleteDocumentNode(id).catch(() => {});
    },

    // ─── Image Evaluation ─────────────────────────────────────────────────

    updateImageEvaluation: async (imageId, evaluation, critique) => {
        const imageStore = useImageStore.getState();
        const image = imageStore.images.find(i => i.id === imageId);
        if (!image) return;
        const updates: Partial<import('../types').BoardImage> = { evaluation };
        if (critique !== undefined) updates.evalCritique = critique;
        await imageStore.updateImageFields(imageId, updates);
    },

    updatePromptNodeEval: async (id, evalResult) => {
        const db = await getDB();
        const node = await db.get('promptNodes', id);
        if (!node) return;
        const updated = { ...node, evalResult };
        await db.put('promptNodes', updated);
        set(state => ({ promptNodes: state.promptNodes.map(n => n.id === id ? updated : n) }));
    },

    autoArrangeNotes: async (images) => {
        const db = await getDB();
        const { categoryNotes, editNotes } = get();
        const DISPLAY_MAX_WIDTH = 350;
        const GAP = 18;
        const MINIMIZED_H = 36;
        const NOTE_GAP = 6;

        const newCategoryNotes = [...categoryNotes];
        const newEditNotes = [...editNotes];

        for (const img of images) {
            const displayW = img.displayWidth ?? Math.min(img.width, DISPLAY_MAX_WIDTH);
            const noteX = img.x + displayW + GAP;
            let noteY = img.y;

            const imgCatNotes = newCategoryNotes.filter(n => n.imageId === img.id);
            const imgEditNotes = newEditNotes.filter(n => n.imageId === img.id);

            for (const note of imgCatNotes) {
                const updated = { ...note, x: noteX, y: noteY, isMinimized: true };
                await db.put('categoryNotes', updated);
                const idx = newCategoryNotes.findIndex(n => n.id === note.id);
                if (idx >= 0) newCategoryNotes[idx] = updated;
                noteY += MINIMIZED_H + NOTE_GAP;
            }

            for (const note of imgEditNotes) {
                const updated = { ...note, x: noteX, y: noteY, isMinimized: true };
                await db.put('editNotes', updated);
                const idx = newEditNotes.findIndex(n => n.id === note.id);
                if (idx >= 0) newEditNotes[idx] = updated;
                noteY += MINIMIZED_H + NOTE_GAP;
            }
        }

        set({ categoryNotes: newCategoryNotes, editNotes: newEditNotes });
    },

    // ─── Remote-safe mutations ────────────────────────────────────────────

    upsertCategoryNoteFromRemote: (note) => {
        set(s => {
            const exists = s.categoryNotes.some(n => n.id === note.id);
            return { categoryNotes: exists ? s.categoryNotes.map(n => n.id === note.id ? { ...n, ...note } : n) : [...s.categoryNotes, note] };
        });
        getDB().then(db => db.put('categoryNotes', note)).catch(() => { });
    },

    // ── Move Notes to Project ──
    moveNotesToProject: async (imageId, targetProjectId) => {
        const db = await getDB();
        const state = get();

        // Move category notes
        for (const note of state.categoryNotes.filter(n => n.imageId === imageId)) {
            const updated = { ...note, projectId: targetProjectId };
            await db.put('categoryNotes', updated);
        }
        // Move edit notes
        for (const note of state.editNotes.filter(n => n.imageId === imageId)) {
            const updated = { ...note, projectId: targetProjectId };
            await db.put('editNotes', updated);
        }
        // Move prompt nodes
        for (const node of state.promptNodes.filter(n => n.imageId === imageId)) {
            const updated = { ...node, projectId: targetProjectId };
            await db.put('promptNodes', updated);
        }
        // Remove connections involving this image
        const relatedConns = state.connections.filter(
            c => c.fromId === imageId || c.toId === imageId
        );
        for (const conn of relatedConns) {
            await db.delete('connections', conn.id);
        }

        // Update in-memory state
        set(s => ({
            categoryNotes: s.categoryNotes.filter(n => n.imageId !== imageId),
            editNotes: s.editNotes.filter(n => n.imageId !== imageId),
            promptNodes: s.promptNodes.filter(n => n.imageId !== imageId),
            connections: s.connections.filter(c => c.fromId !== imageId && c.toId !== imageId),
        }));
    },
    removeCategoryNoteFromRemote: (id) => {
        set(s => ({ categoryNotes: s.categoryNotes.filter(n => n.id !== id) }));
        getDB().then(db => db.delete('categoryNotes', id)).catch(() => { });
    },
    upsertEditNoteFromRemote: (note) => {
        set(s => {
            const exists = s.editNotes.some(n => n.id === note.id);
            return { editNotes: exists ? s.editNotes.map(n => n.id === note.id ? { ...n, ...note } : n) : [...s.editNotes, note] };
        });
        getDB().then(db => db.put('editNotes', note)).catch(() => { });
    },
    removeEditNoteFromRemote: (id) => {
        set(s => ({ editNotes: s.editNotes.filter(n => n.id !== id) }));
        getDB().then(db => db.delete('editNotes', id)).catch(() => { });
    },
    upsertTextNodeFromRemote: (node) => {
        set(s => {
            const exists = s.textNodes.some(n => n.id === node.id);
            return { textNodes: exists ? s.textNodes.map(n => n.id === node.id ? { ...n, ...node } : n) : [...s.textNodes, node] };
        });
        getDB().then(db => db.put('textNodes', node)).catch(() => { });
    },
    removeTextNodeFromRemote: (id) => {
        set(s => ({ textNodes: s.textNodes.filter(n => n.id !== id) }));
        getDB().then(db => db.delete('textNodes', id)).catch(() => { });
    },
    upsertPromptNodeFromRemote: (node) => {
        set(s => {
            const exists = s.promptNodes.some(n => n.id === node.id);
            return { promptNodes: exists ? s.promptNodes.map(n => n.id === node.id ? { ...n, ...node } : n) : [...s.promptNodes, node] };
        });
        getDB().then(db => db.put('promptNodes', node)).catch(() => { });
    },
    removePromptNodeFromRemote: (id) => {
        set(s => ({ promptNodes: s.promptNodes.filter(n => n.id !== id) }));
        getDB().then(db => db.delete('promptNodes', id)).catch(() => { });
    },
    upsertConnectionFromRemote: (conn) => {
        set(s => {
            const exists = s.connections.some(c => c.id === conn.id);
            return { connections: exists ? s.connections.map(c => c.id === conn.id ? { ...c, ...conn } : c) : [...s.connections, conn] };
        });
        getDB().then(db => db.put('connections', conn)).catch(() => { });
    },
    removeConnectionFromRemote: (id) => {
        set(s => ({ connections: s.connections.filter(c => c.id !== id) }));
        getDB().then(db => db.delete('connections', id)).catch(() => { });
    },
}));
