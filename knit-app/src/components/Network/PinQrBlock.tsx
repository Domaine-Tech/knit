import React, { useMemo } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { buildQrSvg } from '../../utils/qrSvg';

export interface PinQrBlockProps {
  pinCode: string | null | undefined;
  qrSize?: number;
  pinFontSize?: number;
  letterSpacing?: number;
  isRefreshing?: boolean;
  onCopyPin?: () => void;
  onRefreshPin?: () => void;
  /** Affiche le QR même sans PIN (payload de repli). */
  qrFallbackPayload?: string;
  showQrCaption?: boolean;
  caption?: string;
}

/**
 * Affichage partagé PIN LAN (6 chiffres) + QR SVG + bouton rafraîchir.
 */
export const PinQrBlock: React.FC<PinQrBlockProps> = ({
  pinCode,
  qrSize = 120,
  pinFontSize = 22,
  letterSpacing = 4,
  isRefreshing = false,
  onCopyPin,
  onRefreshPin,
  qrFallbackPayload,
  showQrCaption = false,
  caption,
}) => {
  const qrSvg = useMemo(() => {
    const payload = pinCode || qrFallbackPayload;
    return payload ? buildQrSvg(payload, qrSize) : '';
  }, [pinCode, qrFallbackPayload, qrSize]);

  if (!pinCode && !qrSvg) return null;

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      {pinCode && (
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <div className="knit-label" style={{ marginBottom: 0 }}>
              PIN LAN (6 chiffres)
            </div>
            {onRefreshPin && (
              <button
                type="button"
                className="knit-btn"
                data-tooltip="Régénérer le PIN"
                disabled={isRefreshing}
                onClick={() => onRefreshPin()}
                style={{ padding: '2px 8px', fontSize: 11 }}
              >
                <DuotoneIcon name="sync" size={12} />
                {isRefreshing ? '…' : 'Rafraîchir'}
              </button>
            )}
          </div>
          <div
            style={{
              fontFamily: 'var(--knit-font-mono)',
              fontSize: pinFontSize,
              fontWeight: 700,
              letterSpacing,
              color: 'var(--knit-primary)',
              cursor: onCopyPin ? 'pointer' : 'default',
            }}
            data-tooltip={onCopyPin ? 'Cliquer pour copier' : undefined}
            onClick={() => onCopyPin?.()}
          >
            {pinCode}
          </div>
          {caption && (
            <div style={{ fontSize: 11, color: 'var(--knit-text-muted)', marginTop: 4 }}>
              {caption}
            </div>
          )}
        </div>
      )}
      {qrSvg && (
        <div
          style={{
            color: 'var(--knit-text)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
          data-tooltip="QR du PIN LAN"
        >
          <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
          {showQrCaption && (
            <span style={{ fontSize: 11, color: 'var(--knit-text-muted)' }}>
              QR du PIN LAN (scannable)
            </span>
          )}
        </div>
      )}
    </div>
  );
};
