import { getProvider } from './yjsProvider';
import { useCollabStore } from '../stores/useCollabStore';
import { getBlob, storeBlob } from '../utils/db-operations';
import { revokeBlobUrl } from '../utils/image';
import { nanoid } from 'nanoid';

// Chunk size for WebRTC transfer (16KB)
const CHUNK_SIZE = 16 * 1024;

interface ChunkMessage {
    type: 'BLOB_CHUNK';
    offerId: string;
    chunkIndex: number;
    totalChunks: number;
    data: number[]; // Array of bytes
}

// Store for receiving chunks
const transferBuffers = new Map<string, {
    chunks: Uint8Array[];
    receivedCount: number;
    totalChunks: number;
    filename: string;
    mimeType: string;
    blobId: string;
}>();

let awarenessUnsub: (() => void) | null = null;

// Ensure this runs only once per session
export function startBlobTransferService() {
    stopBlobTransferService();

    const provider = getProvider();
    if (!provider) return;

    const awareness = provider.awareness;

    const handleAwarenessChange = () => {
        const store = useCollabStore.getState();
        const myId = awareness.clientID.toString();

        awareness.getStates().forEach((state: any, clientId: number) => {
            const peerId = clientId.toString();
            if (peerId === myId) return;

            const u = state.user;
            if (!u) return;

            // 1. Handle incoming Blob Offers
            if (u.blobOffers && Array.isArray(u.blobOffers)) {
                for (const offer of u.blobOffers) {
                    // Have we seen this offer?
                    if (!store.blobOffers.some(o => o.id === offer.id)) {
                        // Automatically check if we already have this blob in IDB
                        getBlob(offer.blobId).then(existing => {
                            if (!existing) {
                                // Show in UI as pending so user can accept
                                useCollabStore.getState().addBlobOffer({
                                    ...offer,
                                    peerId,
                                    status: 'pending',
                                    progress: 0,
                                    timestamp: Date.now()
                                });
                            }
                        });
                    }
                }
            }

            // 2. Handle incoming Blob Requests (from peers asking for our blob)
            if (u.blobRequests && Array.isArray(u.blobRequests)) {
                for (const req of u.blobRequests) {
                    // Send it only if it's meant for us, and we haven't already fulfilled it
                    if (req.targetPeerId === myId && !activeTransfers.has(req.offerId)) {
                        activeTransfers.add(req.offerId);
                        sendBlobChunks(req.offerId, req.blobId, peerId);
                    }
                }
            }

            // 3. Handle incoming Chunks
            if (u.blobChunk && u.blobChunk.targetPeerId === myId) {
                const chunkMessage = u.blobChunk.chunk as ChunkMessage;
                if (chunkMessage) {
                    handleIncomingChunk(chunkMessage);
                }
            }
        });
    };

    awareness.on('change', handleAwarenessChange);
    awarenessUnsub = () => awareness.off('change', handleAwarenessChange);
}

export function stopBlobTransferService() {
    if (awarenessUnsub) {
        awarenessUnsub();
        awarenessUnsub = null;
    }
    transferBuffers.clear();
    activeTransfers.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// Sending Blob Offers
// ─────────────────────────────────────────────────────────────────────────────

export async function broadcastBlobOffer(blobId: string, filename: string, size: number, mimeType: string) {
    const provider = getProvider();
    if (!provider) return;

    const offerId = nanoid(8);

    // Add to our awareness state so peers see it
    const current = provider.awareness.getLocalState()?.user || {};
    const existingOffers = current.blobOffers || [];

    provider.awareness.setLocalStateField('user', {
        ...current,
        blobOffers: [
            ...existingOffers,
            { id: offerId, blobId, filename, size, mimeType, peerName: current.name, peerColor: current.color }
        ]
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Requesting Blobs
// ─────────────────────────────────────────────────────────────────────────────

export function requestBlob(offerId: string, targetPeerId: string) {
    const provider = getProvider();
    if (!provider) return;

    const store = useCollabStore.getState();
    const offer = store.blobOffers.find(o => o.id === offerId);
    if (!offer) return;

    // Set up local buffer
    transferBuffers.set(offerId, {
        chunks: [],
        receivedCount: 0,
        totalChunks: 0, // Known later
        filename: offer.filename,
        mimeType: offer.mimeType,
        blobId: offer.blobId,
    });

    const current = provider.awareness.getLocalState()?.user || {};
    const existingReqs = current.blobRequests || [];

    provider.awareness.setLocalStateField('user', {
        ...current,
        blobRequests: [
            ...existingReqs,
            { offerId, targetPeerId, blobId: offer.blobId }
        ]
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sending Chunks
// ─────────────────────────────────────────────────────────────────────────────

const activeTransfers = new Set<string>();

async function sendBlobChunks(offerId: string, blobId: string, targetPeerId: string) {
    const blob = await getBlob(blobId);
    if (!blob) {
        activeTransfers.delete(offerId);
        return;
    }

    const provider = getProvider();
    if (!provider) return;

    const arrayBuffer = await blob.arrayBuffer();
    const ui8 = new Uint8Array(arrayBuffer);
    const totalChunks = Math.ceil(ui8.length / CHUNK_SIZE);

    let currentChunk = 0;

    // Listen for ACKs from the receiver
    const onAwarenessChange = () => {
        const states = provider.awareness.getStates();
        for (const [clientId, state] of states.entries()) {
            const peerId = clientId.toString();
            if (peerId === targetPeerId && state.user?.blobAck) {
                const ack = state.user.blobAck;
                if (ack.offerId === offerId && ack.chunkIndex === currentChunk) {
                    currentChunk++;
                    if (currentChunk < totalChunks) {
                        sendNextChunk();
                    } else {
                        // All chunks sent and acked!
                        provider.awareness.off('change', onAwarenessChange);
                        const current = provider.awareness.getLocalState()?.user || {};
                        provider.awareness.setLocalStateField('user', { ...current, blobChunk: null });
                        activeTransfers.delete(offerId);
                    }
                }
            }
        }
    };

    provider.awareness.on('change', onAwarenessChange);

    let retryTimer: ReturnType<typeof setTimeout>;

    const sendNextChunk = () => {
        if (currentChunk >= totalChunks) return;

        const start = currentChunk * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, ui8.length);
        const chunkData = Array.from(ui8.slice(start, end));

        const current = provider.awareness.getLocalState()?.user || {};
        provider.awareness.setLocalStateField('user', {
            ...current,
            blobChunk: {
                targetPeerId,
                chunk: {
                    type: 'BLOB_CHUNK',
                    offerId,
                    chunkIndex: currentChunk,
                    totalChunks,
                    data: chunkData
                }
            }
        });

        // Retry sending the same chunk if no ACK is received within 250ms
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
            if (currentChunk < totalChunks) {
                console.warn(`[BlobTransfer] Retrying chunk ${currentChunk}/${totalChunks} for ${offerId}`);
                sendNextChunk();
            }
        }, 250);
    };

    // Start sending
    sendNextChunk();
}

// ─────────────────────────────────────────────────────────────────────────────
// Receiving Chunks
// ─────────────────────────────────────────────────────────────────────────────

async function handleIncomingChunk(msg: ChunkMessage) {
    let buffer = transferBuffers.get(msg.offerId);
    if (!buffer) return;

    // Acknowledge the chunk immediately so sender can move on
    const provider = getProvider();
    if (provider) {
        const current = provider.awareness.getLocalState()?.user || {};
        provider.awareness.setLocalStateField('user', {
            ...current,
            blobAck: {
                offerId: msg.offerId,
                chunkIndex: msg.chunkIndex
            }
        });
    }

    // Only process if we haven't received this exact chunk yet
    if (!buffer.chunks[msg.chunkIndex]) {
        buffer.chunks[msg.chunkIndex] = new Uint8Array(msg.data);
        buffer.receivedCount++;
        buffer.totalChunks = msg.totalChunks;

        const progress = buffer.receivedCount / msg.totalChunks;

        // Update UI
        useCollabStore.getState().updateBlobOffer(msg.offerId, {
            status: 'transferring',
            progress
        });

        // Done?
        if (buffer.receivedCount === msg.totalChunks) {
            useCollabStore.getState().updateBlobOffer(msg.offerId, {
                status: 'done',
                progress: 1
            });

            // Reassemble
            const blobParts: BlobPart[] = [];
            for (let i = 0; i < buffer.totalChunks; i++) {
                blobParts.push(buffer.chunks[i].buffer as ArrayBuffer);
            }
            const finalBlob = new Blob(blobParts, { type: buffer.mimeType });

            // Save to IDB
            await storeBlob(buffer.blobId, finalBlob);
            revokeBlobUrl(buffer.blobId); // Invalidate cache so image renders

            transferBuffers.delete(msg.offerId);

            // Remove popup after a bit
            setTimeout(() => {
                useCollabStore.getState().removeBlobOffer(msg.offerId);
            }, 3000);

            // Clear ACK state after a short delay
            setTimeout(() => {
                if (provider) {
                    const current = provider.awareness.getLocalState()?.user || {};
                    if (current.blobAck?.offerId === msg.offerId) {
                        provider.awareness.setLocalStateField('user', { ...current, blobAck: null });
                    }
                }
            }, 500);
        }
    }
}
