import * as Y from 'yjs';
// @ts-ignore — y-webrtc has no types
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useCollabStore } from '../stores/useCollabStore';
import type { CollabPeer } from '../stores/useCollabStore';
import { stopObserving, stopStoreSubscriptions, stopPolling } from './syncBridge';
import { stopBlobTransferService } from './blobTransfer';

let ydoc: Y.Doc | null = null;
let webrtcProvider: WebrtcProvider | null = null;
let idbPersistence: IndexeddbPersistence | null = null;
let awarenessInterval: ReturnType<typeof setInterval> | null = null;

const SIGNALING_SERVERS = [
    'wss://signaling.yjs.dev',
    'wss://y-webrtc-signaling.onrender.com',
];

export function getYDoc(): Y.Doc | null {
    return ydoc;
}

export function getProvider(): WebrtcProvider | null {
    return webrtcProvider;
}

// Shared Y.Maps
export function getImagesMap(): Y.Map<any> | null {
    return ydoc?.getMap('images') ?? null;
}
export function getCategoryNotesMap(): Y.Map<any> | null {
    return ydoc?.getMap('categoryNotes') ?? null;
}
export function getEditNotesMap(): Y.Map<any> | null {
    return ydoc?.getMap('editNotes') ?? null;
}
export function getTextNodesMap(): Y.Map<any> | null {
    return ydoc?.getMap('textNodes') ?? null;
}
export function getPromptNodesMap(): Y.Map<any> | null {
    return ydoc?.getMap('promptNodes') ?? null;
}
export function getConnectionsMap(): Y.Map<any> | null {
    return ydoc?.getMap('connections') ?? null;
}

export function startSession(roomId: string, projectId: string): Y.Doc {
    // Clean up any previous session
    stopSession();

    ydoc = new Y.Doc();

    // IndexedDB persistence for offline support
    idbPersistence = new IndexeddbPersistence(`collab-${roomId}`, ydoc);

    // WebRTC provider for P2P sync
    webrtcProvider = new WebrtcProvider(roomId, ydoc, {
        signaling: SIGNALING_SERVERS,
        // @ts-ignore
        peerOpts: {
            config: {
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            },
        },
    });

    const store = useCollabStore.getState();
    const peerId = ydoc.clientID.toString();
    useCollabStore.setState({ localPeerId: peerId });

    // Set awareness state
    const awareness = webrtcProvider.awareness;
    awareness.setLocalStateField('user', {
        name: store.localName,
        color: store.localColor,
        cursorX: 0,
        cursorY: 0,
        activeNodeId: null,
        isTyping: false,
    });

    // Listen for awareness changes
    const updatePeers = () => {
        const states = awareness.getStates();
        const peers: CollabPeer[] = [];
        states.forEach((state: any, clientId: number) => {
            if (clientId === ydoc!.clientID) return;
            const u = state.user;
            if (!u) return;
            peers.push({
                id: clientId.toString(),
                name: u.name || `Peer ${clientId}`,
                color: u.color || '#6366f1',
                cursorX: u.cursorX ?? 0,
                cursorY: u.cursorY ?? 0,
                activeNodeId: u.activeNodeId ?? null,
                isTyping: u.isTyping ?? false,
                lastSeen: Date.now(),
            });
        });
        useCollabStore.setState({ peers });
    };

    awareness.on('change', updatePeers);

    // Connection status
    webrtcProvider.on('synced', () => {
        useCollabStore.setState({ isConnected: true, isConnecting: false });
    });

    // Fallback: y-webrtc 'synced' event is notoriously unreliable if signaling servers drop or rate-limit.
    // Since WebRTC is decentralized, we force the UI to connected state after 2.5 seconds so users aren't stuck.
    setTimeout(() => {
        useCollabStore.setState(s => {
            if (s.isConnecting) return { isConnected: true, isConnecting: false };
            return s;
        });
    }, 2500);

    // Periodically broadcast cursor (handled externally via broadcastCursor)

    useCollabStore.setState({
        roomId,
        projectId,
        isConnecting: true,
    });

    return ydoc;
}

export function stopSession() {
    // Clean up sync machinery first
    stopObserving();
    stopStoreSubscriptions();
    stopPolling();
    stopBlobTransferService();
    if (awarenessInterval) {
        clearInterval(awarenessInterval);
        awarenessInterval = null;
    }
    if (webrtcProvider) {
        webrtcProvider.disconnect();
        webrtcProvider.destroy();
        webrtcProvider = null;
    }
    if (idbPersistence) {
        idbPersistence.destroy();
        idbPersistence = null;
    }
    if (ydoc) {
        ydoc.destroy();
        ydoc = null;
    }
    useCollabStore.getState().disconnect();
}

let cursorThrottleTimer: ReturnType<typeof setTimeout> | null = null;

export function broadcastCursor(x: number, y: number) {
    if (!webrtcProvider || cursorThrottleTimer) return;
    cursorThrottleTimer = setTimeout(() => { cursorThrottleTimer = null; }, 50);
    webrtcProvider.awareness.setLocalStateField('user', {
        ...webrtcProvider.awareness.getLocalState()?.user,
        cursorX: Math.round(x),
        cursorY: Math.round(y),
    });
}

export function broadcastActiveNode(nodeId: string | null) {
    if (!webrtcProvider) return;
    webrtcProvider.awareness.setLocalStateField('user', {
        ...webrtcProvider.awareness.getLocalState()?.user,
        activeNodeId: nodeId,
    });
}

export function broadcastTyping(isTyping: boolean) {
    if (!webrtcProvider) return;
    webrtcProvider.awareness.setLocalStateField('user', {
        ...webrtcProvider.awareness.getLocalState()?.user,
        isTyping,
    });
}
