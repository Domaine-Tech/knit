import React, { useEffect, useState } from 'react';
import { toast } from '../../stores/toastStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import type { ToastItem, IconName } from '../../types';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe((updated) => {
      setToasts(updated);
    });
  }, []);

  if (toasts.length === 0) return null;

  const getToastIcon = (type: ToastItem['type']): IconName => {
    switch (type) {
      case 'success':
        return 'check';
      case 'warning':
        return 'warning';
      case 'error':
        return 'warning';
      case 'sync':
        return 'sync';
      case 'info':
      default:
        return 'info';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          style={{
            pointerEvents: 'auto',
            width: 'var(--knit-toast-width)',
            padding: '12px 14px',
            backgroundColor: 'var(--knit-surface)',
            border: '1px solid var(--knit-border)',
            borderRadius: 'var(--knit-radius-md)',
            boxShadow: 'var(--knit-shadow-md)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            transition: 'all var(--knit-transition)',
            animation: 'toastFadeIn 150ms ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 2,
              animation: item.type === 'sync' ? 'spin 2s linear infinite' : 'none',
            }}
          >
            <DuotoneIcon name={getToastIcon(item.type)} size={18} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--knit-text)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{item.title}</span>
              {item.count && item.count > 1 && (
                <span
                  style={{
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 'var(--knit-radius-xs)',
                    backgroundColor: 'var(--knit-primary-soft)',
                    color: 'var(--knit-primary)',
                    fontWeight: 700,
                  }}
                >
                  +{item.count}
                </span>
              )}
            </div>

            {item.message && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--knit-text-secondary)',
                  marginTop: 2,
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}
              >
                {item.message}
              </div>
            )}

            {item.action && (
              <div style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className="knit-btn"
                  style={{
                    fontSize: 11,
                    padding: '3px 10px',
                    height: 'auto',
                    backgroundColor: 'var(--knit-primary)',
                    color: '#ffffff',
                    fontWeight: 600,
                    borderRadius: 'var(--knit-radius-xs)',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    item.action?.onClick();
                    toast.dismiss(item.id);
                  }}
                >
                  {item.action.label}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => toast.dismiss(item.id)}
            title="Fermer"
            style={{
              padding: 2,
              borderRadius: 'var(--knit-radius-xs)',
              color: 'var(--knit-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DuotoneIcon name="close" size={14} />
          </button>
        </div>
      ))}

      <style>{`
        @keyframes toastFadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
