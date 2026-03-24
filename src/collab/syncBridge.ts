/**
 * SYNC BRIDGE — Bulletproof two-way sync between Yjs Y.Maps and Zustand stores.
 *
 * THREE sync mechanisms running simultaneously for reliability:
 *   1. Y.Doc 'update' event   → real-time, fires on any doc change
 *   2. Polling interval       → every 3 seconds, failsafe
 *   3. Manual "Sync" button   → force push + pull
 *
 * The `_isRemote` flag prevents echo loops (pull doesn't re-push).
 */

import {
    getImagesMap,
    getCategoryNotesMap,
    getEditNotesMap,
    getTextNodesMap,
    getPromptNodesMap,
    getConnectionsMap,
    getDocumentNodesMap,
    getYDoc,
    getProvider,
} from './yjsProvider';
import { useImageStore } from '../stores/useImageStore';
import { useBoardStore } from '../stores/useBoardStore';
import { broadcastBlobOffer } from './blobTransfer';
import type {
    BoardImage,
    CategoryNote,
    EditNote,
    TextNode,
    PromptNode,
    Connection,
    DocumentNode,
} from '../types';

let _isRemote = false;

// ═══════════════════════════════════════════════════════════════════════════════
//  PUSH: Local Zustand → Yjs Y.Maps
// ═══════════════════════════════════════════════════════════════════════════════

export function pushAllLocalState() {
    const doc = getYDoc();
    if (!doc) return;

    const imagesMap = getImagesMap();
    const catNotesMap = getCategoryNotesMap();
    const editNotesMap = getEditNotesMap();
    const textMap = getTextNodesMap();
    const promptMap = getPromptNodesMap();
    const connMap = getConnectionsMap();

    doc.transact(() => {
        // Images
        const images = useImageStore.getState().images;
        if (imagesMap) {
            for (const img of images) {
                imagesMap.set(img.id, { ...img });
            }
        }

        const boardState = useBoardStore.getState();

        // Notes
        if (catNotesMap) {
            for (const n of boardState.categoryNotes) catNotesMap.set(n.id, { ...n });
        }
        if (editNotesMap) {
            for (const n of boardState.editNotes) editNotesMap.set(n.id, { ...n });
        }

        // Nodes
        if (textMap) {
            for (const n of boardState.textNodes) textMap.set(n.id, { ...n });
        }
        if (promptMap) {
            for (const n of boardState.promptNodes) promptMap.set(n.id, { ...n });
        }

        // Connections
        if (connMap) {
            for (const c of boardState.connections) connMap.set(c.id, { ...c });
        }

        // Document nodes
        const docMap = getDocumentNodesMap();
        if (docMap) {
            for (const n of boardState.documentNodes) docMap.set(n.id, { ...n });
        }
    });

    // For any images that have a blob, broadcast an offer so peers can fetch the blob
    const images = useImageStore.getState().images;
    for (const img of images) {
        if (img.blobId) {
            // Assuming it might fail if blob size is unknown, but we have placeholder values if needed
            // We can use the image size/type if stored, but we don't store size in BoardImage.
            // Let's pass defaults, blobTransfer will resolve it if needed
            broadcastBlobOffer(img.blobId, img.filename, 1024, img.mimeType);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PULL: Yjs Y.Maps → Local Zustand stores
// ═══════════════════════════════════════════════════════════════════════════════

export function pullAllFromYjs() {
    _isRemote = true;
    try {
        const activeNodeId = getProvider()?.awareness.getLocalState()?.user?.activeNodeId;

        const imagesMap = getImagesMap();
        if (imagesMap) {
            const store = useImageStore.getState();
            imagesMap.forEach((data: BoardImage) => {
                if (data && data.id) store.upsertImageFromRemote(data);
            });
            const remoteIds = new Set(imagesMap.keys());
            store.images.forEach(img => {
                if (!remoteIds.has(img.id)) store.removeImageFromRemote(img.id);
            });
        }

        const catNotesMap = getCategoryNotesMap();
        if (catNotesMap) {
            const store = useBoardStore.getState();
            catNotesMap.forEach((data: CategoryNote) => {
                if (data && data.id && data.id !== activeNodeId) store.upsertCategoryNoteFromRemote(data);
            });
            const remoteIds = new Set(catNotesMap.keys());
            store.categoryNotes.forEach(note => {
                if (!remoteIds.has(note.id)) store.removeCategoryNoteFromRemote(note.id);
            });
        }

        const editNotesMap = getEditNotesMap();
        if (editNotesMap) {
            const store = useBoardStore.getState();
            editNotesMap.forEach((data: EditNote) => {
                if (data && data.id && data.id !== activeNodeId) store.upsertEditNoteFromRemote(data);
            });
            const remoteIds = new Set(editNotesMap.keys());
            store.editNotes.forEach(note => {
                if (!remoteIds.has(note.id)) store.removeEditNoteFromRemote(note.id);
            });
        }

        const textMap = getTextNodesMap();
        if (textMap) {
            const store = useBoardStore.getState();
            textMap.forEach((data: TextNode) => {
                if (data && data.id && data.id !== activeNodeId) store.upsertTextNodeFromRemote(data);
            });
            const remoteIds = new Set(textMap.keys());
            store.textNodes.forEach(node => {
                if (!remoteIds.has(node.id)) store.removeTextNodeFromRemote(node.id);
            });
        }

        const promptMap = getPromptNodesMap();
        if (promptMap) {
            const store = useBoardStore.getState();
            promptMap.forEach((data: PromptNode) => {
                if (data && data.id) store.upsertPromptNodeFromRemote(data);
            });
            const remoteIds = new Set(promptMap.keys());
            store.promptNodes.forEach(node => {
                if (!remoteIds.has(node.id)) store.removePromptNodeFromRemote(node.id);
            });
        }

        const connMap = getConnectionsMap();
        if (connMap) {
            const store = useBoardStore.getState();
            connMap.forEach((data: Connection) => {
                if (data && data.id) store.upsertConnectionFromRemote(data);
            });
            const remoteIds = new Set(connMap.keys());
            store.connections.forEach(conn => {
                if (!remoteIds.has(conn.id)) store.removeConnectionFromRemote(conn.id);
            });
        }

        const docNodesMap = getDocumentNodesMap();
        if (docNodesMap) {
            const store = useBoardStore.getState();
            docNodesMap.forEach((data: DocumentNode) => {
                if (data && data.id) store.upsertDocumentNodeFromRemote(data);
            });
            const remoteIds = new Set(docNodesMap.keys());
            store.documentNodes.forEach(node => {
                if (!remoteIds.has(node.id)) store.removeDocumentNodeFromRemote(node.id);
            });
        }

    } finally {
        _isRemote = false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STORE SUBSCRIPTIONS: Auto-push local mutations → Yjs
// ═══════════════════════════════════════════════════════════════════════════════

let storeUnsubs: Array<() => void> = [];

export function startStoreSubscriptions() {
    stopStoreSubscriptions();

    // Watch image store changes
    storeUnsubs.push(
        useImageStore.subscribe((state, prevState) => {
            if (_isRemote) return;
            const map = getImagesMap();
            const doc = getYDoc();
            if (!map || !doc) return;

            doc.transact(() => {
                const currentIds = new Set(state.images.map(i => i.id));
                const prevIds = new Set(prevState.images.map(i => i.id));

                for (const img of state.images) {
                    if (!prevIds.has(img.id)) {
                        // New image added!
                        map.set(img.id, { ...img });

                        if (img.blobId) {
                            // Trigger explicit WebRTC blob transfer offer
                            broadcastBlobOffer(img.blobId, img.filename, 1024, img.mimeType);
                        }
                    } else {
                        // Existed before, maybe changed
                        const prev = prevState.images.find(i => i.id === img.id);
                        if (prev && hasImageChanged(prev, img)) {
                            map.set(img.id, { ...img });
                        }
                    }
                }

                for (const id of prevIds) {
                    if (!currentIds.has(id)) map.delete(id);
                }
            });
        })
    );

    // Watch board store changes
    storeUnsubs.push(
        useBoardStore.subscribe((state, prevState) => {
            if (_isRemote) return;
            const doc = getYDoc();
            if (!doc) return;

            doc.transact(() => {
                syncArrayToYMap(prevState.categoryNotes, state.categoryNotes, getCategoryNotesMap());
                syncArrayToYMap(prevState.editNotes, state.editNotes, getEditNotesMap());
                syncArrayToYMap(prevState.textNodes, state.textNodes, getTextNodesMap());
                syncArrayToYMap(prevState.promptNodes, state.promptNodes, getPromptNodesMap());
                syncArrayToYMap(prevState.connections, state.connections, getConnectionsMap());
                syncArrayToYMap(prevState.documentNodes, state.documentNodes, getDocumentNodesMap());
            });
        })
    );
}

export function stopStoreSubscriptions() {
    for (const unsub of storeUnsubs) unsub();
    storeUnsubs = [];
}

// ═══════════════════════════════════════════════════════════════════════════════
//  OBSERVERS: Y.Map.observe for real-time remote changes → Zustand
// ═══════════════════════════════════════════════════════════════════════════════

let observers: Array<() => void> = [];
let docUpdateTimer: ReturnType<typeof setTimeout>;

export function startObserving() {
    stopObserving();

    const doc = getYDoc();
    if (!doc) return;

    // Listen for ANY Y.Doc update (most reliable signal that remote data arrived)
    const onDocUpdate = () => {
        // Debounce: pull all after 50ms of no updates
        clearTimeout(docUpdateTimer);
        docUpdateTimer = setTimeout(() => {
            pullAllFromYjs();
        }, 50);
    };
    doc.on('update', onDocUpdate);
    observers.push(() => doc.off('update', onDocUpdate));
}

export function stopObserving() {
    clearTimeout(docUpdateTimer);
    for (const unsub of observers) unsub();
    observers = [];
}

// ═══════════════════════════════════════════════════════════════════════════════
//  POLLING: Failsafe 3-second interval that guarantees sync
// ═══════════════════════════════════════════════════════════════════════════════

let pollInterval: ReturnType<typeof setInterval> | null = null;

export function startPolling() {
    stopPolling();
    // Pull immediately
    pullAllFromYjs();
    // Then every 3 seconds
    pollInterval = setInterval(() => {
        pullAllFromYjs();
    }, 3000);
}

export function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function hasImageChanged(prev: BoardImage, cur: BoardImage): boolean {
    return (
        prev.x !== cur.x || prev.y !== cur.y ||
        prev.width !== cur.width || prev.height !== cur.height ||
        prev.displayWidth !== cur.displayWidth || prev.displayHeight !== cur.displayHeight ||
        prev.label !== cur.label || prev.shotOrder !== cur.shotOrder ||
        prev.accentColor !== cur.accentColor || prev.blobId !== cur.blobId
    );
}

function hasNodeChanged(prev: any, current: any): boolean {
    if (prev === current) return false;
    const keys = new Set([...Object.keys(prev), ...Object.keys(current)]);
    for (const key of keys) {
        const val1 = prev[key];
        const val2 = current[key];
        if (Array.isArray(val1) && Array.isArray(val2)) {
            if (val1.length !== val2.length) return true;
            for (let i = 0; i < val1.length; i++) {
                if (val1[i] !== val2[i]) return true;
            }
        } else if (val1 !== val2) {
            return true;
        }
    }
    return false;
}

function syncArrayToYMap<T extends { id: string }>(
    prev: T[], current: T[], map: any
) {
    if (!map) return;
    const currentIds = new Set(current.map(x => x.id));
    const prevIds = new Set(prev.map(x => x.id));

    for (const item of current) {
        if (!prevIds.has(item.id)) {
            const copy: any = { ...item };
            if ('isMinimized' in copy || 'checkedPrompts' in copy) {
                copy.isMinimized = copy.isMinimized ?? false;
            }
            map.set(item.id, copy);
        } else {
            const prevItem = prev.find(x => x.id === item.id);
            if (prevItem) {
                const copyItem: any = { ...item };
                if ('isMinimized' in copyItem || 'checkedPrompts' in copyItem) {
                    copyItem.isMinimized = copyItem.isMinimized ?? false;
                }
                const copyPrev: any = { ...prevItem };
                if ('isMinimized' in copyPrev || 'checkedPrompts' in copyPrev) {
                    copyPrev.isMinimized = copyPrev.isMinimized ?? false;
                }

                if (hasNodeChanged(copyPrev, copyItem)) {
                    map.set(item.id, copyItem);
                }
            }
        }
    }

    for (const id of prevIds) {
        if (!currentIds.has(id)) map.delete(id);
    }
}
