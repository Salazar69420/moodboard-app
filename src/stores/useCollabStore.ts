import { create } from 'zustand';

export interface CollabPeer {
    id: string;
    name: string;
    color: string;
    cursorX: number;
    cursorY: number;
    activeNodeId: string | null;
    isTyping: boolean;
    lastSeen: number;
}

export interface BlobOffer {
    id: string;
    peerId: string;
    peerName: string;
    peerColor: string;
    blobId: string;
    filename: string;
    size: number;
    mimeType: string;
    progress: number; // 0..1
    status: 'pending' | 'accepting' | 'transferring' | 'done' | 'error';
    timestamp: number;
}

interface CollabStore {
    // Session state
    isConnected: boolean;
    isConnecting: boolean;
    roomId: string | null;
    projectId: string | null;
    localPeerId: string;
    localName: string;
    localColor: string;

    // Session-scoped API key + model (NOT persisted)
    sessionApiKey: string;
    sessionModel: string;

    // Peers
    peers: CollabPeer[];

    // Blob offers
    blobOffers: BlobOffer[];

    // Modal state
    showSessionModal: boolean;
    showJoinOverlay: boolean;
    joinPhase: 'connecting' | 'syncing' | 'ready';

    // Actions
    setConnected: (connected: boolean) => void;
    setConnecting: (connecting: boolean) => void;
    setRoom: (roomId: string | null, projectId: string | null) => void;
    setLocalName: (name: string) => void;
    setLocalColor: (color: string) => void;
    setSessionApiKey: (key: string) => void;
    setSessionModel: (model: string) => void;
    setPeers: (peers: CollabPeer[]) => void;
    updatePeer: (id: string, data: Partial<CollabPeer>) => void;
    removePeer: (id: string) => void;
    addBlobOffer: (offer: BlobOffer) => void;
    updateBlobOffer: (id: string, data: Partial<BlobOffer>) => void;
    removeBlobOffer: (id: string) => void;
    setShowSessionModal: (show: boolean) => void;
    setShowJoinOverlay: (show: boolean) => void;
    setJoinPhase: (phase: 'connecting' | 'syncing' | 'ready') => void;
    disconnect: () => void;
}

const PEER_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4'];

function getRandomColor(): string {
    return PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)];
}

function getStoredName(): string {
    try {
        return localStorage.getItem('collab-name') || '';
    } catch { return ''; }
}

export const useCollabStore = create<CollabStore>((set) => ({
    isConnected: false,
    isConnecting: false,
    roomId: null,
    projectId: null,
    localPeerId: '',
    localName: getStoredName(),
    localColor: getRandomColor(),

    sessionApiKey: '',
    sessionModel: '',

    peers: [],
    blobOffers: [],

    showSessionModal: false,
    showJoinOverlay: false,
    joinPhase: 'connecting',

    setConnected: (isConnected) => set({ isConnected }),
    setConnecting: (isConnecting) => set({ isConnecting }),
    setRoom: (roomId, projectId) => set({ roomId, projectId }),
    setLocalName: (name) => {
        try { localStorage.setItem('collab-name', name); } catch { /* ignore */ }
        set({ localName: name });
    },
    setLocalColor: (color) => set({ localColor: color }),
    setSessionApiKey: (key) => set({ sessionApiKey: key }),
    setSessionModel: (model) => set({ sessionModel: model }),

    setPeers: (peers) => set({ peers }),
    updatePeer: (id, data) => set(s => ({
        peers: s.peers.map(p => p.id === id ? { ...p, ...data } : p),
    })),
    removePeer: (id) => set(s => ({
        peers: s.peers.filter(p => p.id !== id),
    })),

    addBlobOffer: (offer) => set(s => ({ blobOffers: [...s.blobOffers, offer] })),
    updateBlobOffer: (id, data) => set(s => ({
        blobOffers: s.blobOffers.map(o => o.id === id ? { ...o, ...data } : o),
    })),
    removeBlobOffer: (id) => set(s => ({
        blobOffers: s.blobOffers.filter(o => o.id !== id),
    })),

    setShowSessionModal: (show) => set({ showSessionModal: show }),
    setShowJoinOverlay: (show) => set({ showJoinOverlay: show }),
    setJoinPhase: (phase) => set({ joinPhase: phase }),

    disconnect: () => set({
        isConnected: false,
        isConnecting: false,
        roomId: null,
        projectId: null,
        peers: [],
        blobOffers: [],
        sessionApiKey: '',
        sessionModel: '',
        showJoinOverlay: false,
        joinPhase: 'connecting',
    }),
}));
