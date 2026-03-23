interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    // Depth blur backdrop (#21) — content behind darkens and blurs like real frosted glass
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center modal-backdrop"
      style={{ background: 'rgba(4, 5, 12, 0.55)' }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'rgba(11, 12, 22, 0.82)',
          backdropFilter: 'blur(48px) saturate(220%) brightness(1.12)',
          WebkitBackdropFilter: 'blur(48px) saturate(220%) brightness(1.12)',
          border: '1px solid rgba(255, 255, 255, 0.11)',
          borderRadius: '18px',
          padding: '24px',
          width: '100%',
          maxWidth: '360px',
          boxShadow:
            '0 24px 64px rgba(0, 0, 0, 0.65), 0 8px 24px rgba(0, 0, 0, 0.40), inset 0 1px 0 rgba(255, 255, 255, 0.10)',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e4e6f2', marginBottom: '8px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          {title}
        </h3>
        <p style={{ fontSize: '13px', color: 'rgba(110, 115, 134, 0.85)', marginBottom: '24px', fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 18px',
              fontSize: '13px',
              color: 'rgba(228, 230, 242, 0.60)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '10px',
              cursor: 'pointer',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              transition: 'all 0.15s ease',
              minHeight: '44px',
              minWidth: '44px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#fca5a5',
              background: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid rgba(239, 68, 68, 0.30)',
              borderRadius: '10px',
              cursor: 'pointer',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              transition: 'all 0.15s ease',
              minHeight: '44px',
              minWidth: '44px',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
