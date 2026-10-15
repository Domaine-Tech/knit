import React from 'react';

export type IconName =
  | 'folder'
  | 'folder-open'
  | 'file-text'
  | 'file-markdown'
  | 'search'
  | 'close'
  | 'save'
  | 'sun'
  | 'moon'
  | 'sync'
  | 'check'
  | 'warning'
  | 'info'
  | 'plus'
  | 'chevron-right'
  | 'chevron-down'
  | 'split'
  | 'slider'
  | 'vault'
  | 'collapse-all'
  | 'expand-all';

interface DuotoneIconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const DuotoneIcon: React.FC<DuotoneIconProps> = ({
  name,
  size = 18,
  className = '',
  style = {},
}) => {
  const primaryStroke = 'currentColor';
  const secondaryFill = 'var(--knit-primary)';

  const renderIconPaths = () => {
    switch (name) {
      case 'folder':
        return (
          <>
            <path
              d="M32 80 C32 62.3 46.3 48 64 48 L170.7 48 C187.7 48 203.9 54.7 216 66.7 L245.3 96 L416 96 C433.7 96 448 110.3 448 128 L448 384 C448 401.7 433.7 416 416 416 L64 416 C46.3 416 32 401.7 32 384 Z"
              fill={secondaryFill}
              fillOpacity="0.18"
            />
            <path
              d="M32 80 C32 62.3 46.3 48 64 48 L170.7 48 C187.7 48 203.9 54.7 216 66.7 L245.3 96 L416 96 C433.7 96 448 110.3 448 128 L448 384 C448 401.7 433.7 416 416 416 L64 416 C46.3 416 32 401.7 32 384 Z"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="28"
              strokeLinejoin="round"
            />
          </>
        );

      case 'folder-open':
        return (
          <>
            <path
              d="M32 96 C32 78.3 46.3 64 64 64 L170.7 64 C187.7 64 203.9 70.7 216 82.7 L245.3 112 L416 112 C433.7 112 448 126.3 448 144 L448 200 L64 200 L64 96 Z"
              fill={secondaryFill}
              fillOpacity="0.22"
            />
            <path
              d="M32 176 L448 176 L392 416 L32 416 Z"
              fill={secondaryFill}
              fillOpacity="0.15"
              stroke={primaryStroke}
              strokeWidth="28"
              strokeLinejoin="round"
            />
          </>
        );

      case 'file-text':
      case 'file-markdown':
        return (
          <>
            <path
              d="M96 48 L320 48 L416 144 L416 432 C416 449.7 401.7 464 384 464 L96 464 C78.3 464 64 449.7 64 432 L64 80 C64 62.3 78.3 48 96 48 Z"
              fill={secondaryFill}
              fillOpacity="0.18"
            />
            <path
              d="M96 48 L320 48 L416 144 L416 432 C416 449.7 401.7 464 384 464 L96 464 C78.3 464 64 449.7 64 432 L64 80 C64 62.3 78.3 48 96 48 Z"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="28"
              strokeLinejoin="round"
            />
            <path
              d="M320 48 L320 144 L416 144"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="28"
              strokeLinejoin="round"
            />
            {/* Lignes de texte ou badge M */}
            <line x1="144" y1="240" x2="336" y2="240" stroke={primaryStroke} strokeWidth="24" strokeLinecap="round" />
            <line x1="144" y1="320" x2="272" y2="320" stroke={primaryStroke} strokeWidth="24" strokeLinecap="round" />
          </>
        );

      case 'search':
        return (
          <>
            <circle
              cx="208"
              cy="208"
              r="128"
              fill={secondaryFill}
              fillOpacity="0.2"
              stroke={primaryStroke}
              strokeWidth="32"
            />
            <line
              x1="304"
              y1="304"
              x2="432"
              y2="432"
              stroke={primaryStroke}
              strokeWidth="36"
              strokeLinecap="round"
            />
          </>
        );

      case 'close':
        return (
          <>
            <line x1="128" y1="128" x2="384" y2="384" stroke={primaryStroke} strokeWidth="36" strokeLinecap="round" />
            <line x1="384" y1="128" x2="128" y2="384" stroke={primaryStroke} strokeWidth="36" strokeLinecap="round" />
          </>
        );

      case 'save':
        return (
          <>
            <rect
              x="64"
              y="64"
              width="384"
              height="384"
              rx="48"
              fill={secondaryFill}
              fillOpacity="0.18"
              stroke={primaryStroke}
              strokeWidth="32"
            />
            <rect x="144" y="64" width="224" height="128" rx="16" fill="var(--knit-bg)" stroke={primaryStroke} strokeWidth="24" />
          </>
        );

      case 'sun':
        return (
          <>
            <circle cx="256" cy="256" r="96" fill={secondaryFill} fillOpacity="0.25" stroke={primaryStroke} strokeWidth="28" />
            <line x1="256" y1="48" x2="256" y2="96" stroke={primaryStroke} strokeWidth="32" strokeLinecap="round" />
            <line x1="256" y1="416" x2="256" y2="464" stroke={primaryStroke} strokeWidth="32" strokeLinecap="round" />
            <line x1="48" y1="256" x2="96" y2="256" stroke={primaryStroke} strokeWidth="32" strokeLinecap="round" />
            <line x1="416" y1="256" x2="464" y2="256" stroke={primaryStroke} strokeWidth="32" strokeLinecap="round" />
            <line x1="109" y1="109" x2="143" y2="143" stroke={primaryStroke} strokeWidth="32" strokeLinecap="round" />
            <line x1="369" y1="369" x2="403" y2="403" stroke={primaryStroke} strokeWidth="32" strokeLinecap="round" />
            <line x1="109" y1="403" x2="143" y2="369" stroke={primaryStroke} strokeWidth="32" strokeLinecap="round" />
            <line x1="369" y1="143" x2="403" y2="109" stroke={primaryStroke} strokeWidth="32" strokeLinecap="round" />
          </>
        );

      case 'moon':
        return (
          <path
            d="M384 320 C368 328 350 336 328 336 C222 336 136 250 136 144 C136 112 144 82 160 56 C88 88 40 160 40 248 C40 363 133 456 248 456 C326 456 392 412 424 348 C411 350 398 352 384 320 Z"
            fill={secondaryFill}
            fillOpacity="0.2"
            stroke={primaryStroke}
            strokeWidth="28"
            strokeLinejoin="round"
          />
        );

      case 'sync':
        return (
          <>
            <path
              d="M400 256 C400 335.5 335.5 400 256 400 C194 400 141 360.7 121 306"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="32"
              strokeLinecap="round"
            />
            <polyline points="100,230 120,310 200,290" fill="none" stroke={primaryStroke} strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M112 256 C112 176.5 176.5 112 256 112 C318 112 371 151.3 391 206"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="32"
              strokeLinecap="round"
            />
            <polyline points="412,282 392,202 312,222" fill="none" stroke={primaryStroke} strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'check':
        return (
          <polyline
            points="96,256 208,368 416,160"
            fill="none"
            stroke="var(--knit-primary)"
            strokeWidth="44"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

      case 'warning':
        return (
          <>
            <polygon
              points="256,48 464,432 48,432"
              fill="#F59E0B"
              fillOpacity="0.2"
              stroke="#F59E0B"
              strokeWidth="32"
              strokeLinejoin="round"
            />
            <line x1="256" y1="192" x2="256" y2="288" stroke="#F59E0B" strokeWidth="32" strokeLinecap="round" />
            <circle cx="256" cy="360" r="16" fill="#F59E0B" />
          </>
        );

      case 'info':
        return (
          <>
            <circle cx="256" cy="256" r="192" fill={secondaryFill} fillOpacity="0.2" stroke={primaryStroke} strokeWidth="32" />
            <circle cx="256" cy="160" r="20" fill={primaryStroke} />
            <line x1="256" y1="224" x2="256" y2="352" stroke={primaryStroke} strokeWidth="32" strokeLinecap="round" />
          </>
        );

      case 'plus':
        return (
          <>
            <line x1="256" y1="112" x2="256" y2="400" stroke={primaryStroke} strokeWidth="36" strokeLinecap="round" />
            <line x1="112" y1="256" x2="400" y2="256" stroke={primaryStroke} strokeWidth="36" strokeLinecap="round" />
          </>
        );

      case 'chevron-right':
        return (
          <polyline
            points="176,112 320,256 176,400"
            fill="none"
            stroke={primaryStroke}
            strokeWidth="36"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

      case 'chevron-down':
        return (
          <polyline
            points="112,176 256,320 400,176"
            fill="none"
            stroke={primaryStroke}
            strokeWidth="36"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

      case 'slider':
        return (
          <>
            <line x1="64" y1="144" x2="448" y2="144" stroke={primaryStroke} strokeWidth="28" strokeLinecap="round" />
            <line x1="64" y1="368" x2="448" y2="368" stroke={primaryStroke} strokeWidth="28" strokeLinecap="round" />
            <circle cx="176" cy="144" r="56" fill={secondaryFill} fillOpacity="0.25" stroke={primaryStroke} strokeWidth="28" />
            <circle cx="336" cy="368" r="56" fill={secondaryFill} fillOpacity="0.25" stroke={primaryStroke} strokeWidth="28" />
          </>
        );

      case 'vault':
        return (
          <>
            <rect
              x="64"
              y="64"
              width="384"
              height="384"
              rx="48"
              fill={secondaryFill}
              fillOpacity="0.2"
              stroke={primaryStroke}
              strokeWidth="32"
            />
            <circle cx="256" cy="256" r="72" fill="none" stroke={primaryStroke} strokeWidth="32" />
            <circle cx="256" cy="256" r="24" fill={secondaryFill} />
          </>
        );

      case 'collapse-all':
        return (
          <>
            <polyline
              points="144,208 256,128 368,208"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="36"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="144,304 256,384 368,304"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="36"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'expand-all':
        return (
          <>
            <polyline
              points="144,128 256,208 368,128"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="36"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="144,384 256,304 368,384"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="36"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={`knit-icon ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
    >
      {renderIconPaths()}
    </svg>
  );
};
