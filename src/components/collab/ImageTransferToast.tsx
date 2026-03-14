import { useCollabStore } from '../../stores/useCollabStore';
import { requestBlob } from '../../collab/blobTransfer';

export function ImageTransferToast() {
    const offers = useCollabStore((s) => s.blobOffers);
    const updateBlobOffer = useCollabStore((s) => s.updateBlobOffer);
    const removeBlobOffer = useCollabStore((s) => s.removeBlobOffer);

    if (offers.length === 0) return null;

    const pendingOffers = offers.filter(o => o.status === 'pending');
    const transferOffers = offers.filter(o => o.status === 'accepting' || o.status === 'transferring');
    const doneOffers = offers.filter(o => o.status === 'done');
    const erroredOffers = offers.filter(o => o.status === 'error');

    // Aggregate sizes
    const pendingSize = pendingOffers.reduce((sum, o) => sum + o.size, 0);
    const sizeStr = pendingSize > 1024 * 1024
        ? `${(pendingSize / 1024 / 1024).toFixed(1)} MB`
        : `${Math.round(pendingSize / 1024)} KB`;

    // Aggregate progress
    const totalDownloadingSize = transferOffers.reduce((sum, o) => sum + o.size, 0);
    const downloadedSize = transferOffers.reduce((sum, o) => sum + (o.size * o.progress), 0);
    const overallProgress = totalDownloadingSize > 0 ? downloadedSize / totalDownloadingSize : 0;

    const handleAcceptAll = () => {
        pendingOffers.forEach(o => {
            updateBlobOffer(o.id, { status: 'accepting' });
            requestBlob(o.id, o.peerId);
        });
    };

    const handleDismissPending = () => {
        pendingOffers.forEach(o => removeBlobOffer(o.id));
    };

    const peerNames = Array.from(new Set(pendingOffers.map(o => o.peerName))).join(', ');

    return (
        <div style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 450,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            pointerEvents: 'none', // Lets clicks pass through background
        }}>
            {pendingOffers.length > 0 && (
                <div style={{
                    pointerEvents: 'auto',
                    background: 'rgba(8,9,16,0.96)',
                    backdropFilter: 'blur(24px) saturate(200%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
                    animation: 'slideUpIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    width: 300,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span style={{
                            fontSize: 12, fontWeight: 600, color: '#e5e5e5',
                            fontFamily: "'Inter', system-ui, sans-serif",
                        }}>
                            Incoming Images
                        </span>
                    </div>

                    <div style={{
                        fontSize: 10.5, color: '#888',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        marginBottom: 12,
                        lineHeight: 1.4,
                    }}>
                        {peerNames} wants to sync {pendingOffers.length} missing image{pendingOffers.length !== 1 ? 's' : ''} ({sizeStr}).
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            onClick={handleDismissPending}
                            style={{
                                flex: 1, padding: '7px', borderRadius: 6,
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'transparent', color: '#888',
                                fontSize: 10, fontWeight: 600,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                cursor: 'pointer', transition: 'all 0.12s ease',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.color = '#888';
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={handleAcceptAll}
                            style={{
                                flex: 2, padding: '7px', borderRadius: 6,
                                border: '1px solid rgba(249,115,22,0.3)',
                                background: 'rgba(249,115,22,0.1)',
                                color: '#f97316', fontSize: 10, fontWeight: 600,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                cursor: 'pointer', transition: 'all 0.12s ease',
                                boxShadow: '0 0 8px rgba(249,115,22,0.08)',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(249,115,22,0.15)';
                                e.currentTarget.style.boxShadow = '0 0 12px rgba(249,115,22,0.15)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(249,115,22,0.1)';
                                e.currentTarget.style.boxShadow = '0 0 8px rgba(249,115,22,0.08)';
                            }}
                        >
                            Accept & Sync
                        </button>
                    </div>
                </div>
            )}

            {transferOffers.length > 0 && (
                <div style={{
                    pointerEvents: 'auto',
                    background: 'rgba(8,9,16,0.96)',
                    backdropFilter: 'blur(24px) saturate(200%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
                    animation: 'slideUpIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    width: 300,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{
                            fontSize: 11, fontWeight: 600, color: '#e5e5e5',
                            fontFamily: "'Inter', system-ui, sans-serif",
                        }}>
                            Downloading {transferOffers.length} image{transferOffers.length !== 1 ? 's' : ''}...
                        </span>
                        <span style={{ fontSize: 10, color: '#f97316', fontFamily: "'JetBrains Mono', monospace" }}>
                            {Math.round(overallProgress * 100)}%
                        </span>
                    </div>

                    <div style={{
                        height: 4, borderRadius: 2,
                        background: 'rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%', borderRadius: 2,
                            background: 'linear-gradient(90deg, #f97316, #fb923c)',
                            width: `${Math.round(overallProgress * 100)}%`,
                            transition: 'width 0.3s ease',
                            boxShadow: '0 0 8px rgba(249,115,22,0.4)',
                        }} />
                    </div>
                </div>
            )}

            {doneOffers.length > 0 && transferOffers.length === 0 && pendingOffers.length === 0 && (
                <div style={{
                    pointerEvents: 'auto',
                    background: 'rgba(8,9,16,0.96)',
                    backdropFilter: 'blur(24px) saturate(200%)',
                    border: '1px solid rgba(74,222,128,0.2)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
                    animation: 'slideUpIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span style={{
                        fontSize: 11, fontWeight: 600, color: '#4ade80',
                        fontFamily: "'Inter', system-ui, sans-serif",
                    }}>
                        All {doneOffers.length} missing images synced
                    </span>
                </div>
            )}

            {erroredOffers.length > 0 && transferOffers.length === 0 && pendingOffers.length === 0 && (
                <div style={{
                    pointerEvents: 'auto',
                    background: 'rgba(8,9,16,0.96)',
                    backdropFilter: 'blur(24px) saturate(200%)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
                    animation: 'slideUpIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span style={{
                        fontSize: 11, fontWeight: 600, color: '#ef4444',
                        fontFamily: "'Inter', system-ui, sans-serif",
                    }}>
                        {erroredOffers.length} transfer(s) failed
                    </span>
                </div>
            )}

            <style>{`
        @keyframes slideUpIn {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
        </div>
    );
}
