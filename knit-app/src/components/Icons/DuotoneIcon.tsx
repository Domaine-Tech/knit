import React from 'react';
import type { IconName } from '../../types';

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
            <circle cx="256" cy="256" r="44" fill={secondaryFill} fillOpacity="0.25" />
            <path
              d="M106 256 C106 173 173 106 256 106 C320 106 375 146 396 202"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="40"
              strokeLinecap="round"
            />
            <polyline
              points="426,132 400,212 320,186"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="40"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M406 256 C406 339 339 406 256 406 C192 406 137 366 116 310"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="40"
              strokeLinecap="round"
            />
            <polyline
              points="86,380 112,300 192,326"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="40"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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

      case 'chevron-left':
        return (
          <polyline
            points="336,112 192,256 336,400"
            fill="none"
            stroke={primaryStroke}
            strokeWidth="36"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

      case 'edit':
        return (
          <>
            <path
              d="M384 128 L320 64 L96 288 L96 352 L160 352 Z"
              fill={secondaryFill}
              fillOpacity="0.2"
              stroke={primaryStroke}
              strokeWidth="28"
              strokeLinejoin="round"
            />
            <line x1="288" y1="96" x2="352" y2="160" stroke={primaryStroke} strokeWidth="28" strokeLinecap="round" />
          </>
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

      case 'split':
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
              strokeWidth="28"
            />
            <line
              x1="256"
              y1="64"
              x2="256"
              y2="448"
              stroke={primaryStroke}
              strokeWidth="28"
            />
            <rect
              x="64"
              y="64"
              width="192"
              height="384"
              rx="48"
              fill={secondaryFill}
              fillOpacity="0.32"
            />
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

      case 'copy':
        return (
          <>
            <rect
              x="176"
              y="176"
              width="256"
              height="256"
              rx="40"
              fill={secondaryFill}
              fillOpacity="0.18"
              stroke={primaryStroke}
              strokeWidth="32"
            />
            <path
              d="M336 128 L336 88 C336 74.7 325.3 64 312 64 L104 64 C90.7 64 80 74.7 80 88 L80 296 C80 309.3 90.7 320 104 320 L144 320"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="32"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'external-link':
        return (
          <>
            <path
              d="M256 128 L112 128 C94.3 128 80 142.3 80 160 L80 400 C80 417.7 94.3 432 112 432 L352 432 C369.7 432 384 417.7 384 400 L384 256"
              fill={secondaryFill}
              fillOpacity="0.15"
              stroke={primaryStroke}
              strokeWidth="32"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline points="288,80 432,80 432,224" fill="none" stroke={primaryStroke} strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="432" y1="80" x2="240" y2="272" stroke={primaryStroke} strokeWidth="36" strokeLinecap="round" />
          </>
        );

      case 'clipboard':
        return (
          <>
            <rect
              x="96"
              y="96"
              width="320"
              height="352"
              rx="40"
              fill={secondaryFill}
              fillOpacity="0.18"
              stroke={primaryStroke}
              strokeWidth="32"
            />
            <rect x="176" y="48" width="160" height="80" rx="16" fill="var(--knit-surface)" stroke={primaryStroke} strokeWidth="28" />
            <line x1="160" y1="224" x2="352" y2="224" stroke={primaryStroke} strokeWidth="24" strokeLinecap="round" />
            <line x1="160" y1="304" x2="304" y2="304" stroke={primaryStroke} strokeWidth="24" strokeLinecap="round" />
          </>
        );

      case 'trash':
        return (
          <>
            <path
              d="M128 160 L144 448 C144 465.7 158.3 480 176 480 L336 480 C353.7 480 368 465.7 368 448 L384 160 Z"
              fill={secondaryFill}
              fillOpacity="0.18"
            />
            <path
              d="M128 160 L144 448 C144 465.7 158.3 480 176 480 L336 480 C353.7 480 368 465.7 368 448 L384 160 Z"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="32"
              strokeLinejoin="round"
            />
            <path
              d="M80 128 L432 128 M192 128 L192 80 C192 62.3 206.3 48 224 48 L288 48 C305.7 48 320 62.3 320 80 L320 128"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="32"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="208" y1="224" x2="208" y2="400" stroke={primaryStroke} strokeWidth="28" strokeLinecap="round" />
            <line x1="256" y1="224" x2="256" y2="400" stroke={primaryStroke} strokeWidth="28" strokeLinecap="round" />
            <line x1="304" y1="224" x2="304" y2="400" stroke={primaryStroke} strokeWidth="28" strokeLinecap="round" />
          </>
        );

      case 'pin':
        return (
          <>
            <path
              d="M176 64 L336 64 L304 192 L368 256 L272 256 L256 448 L240 256 L144 256 L208 192 Z"
              fill={secondaryFill}
              fillOpacity="0.22"
              stroke={primaryStroke}
              strokeWidth="32"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'link':
        return (
          <>
            <path
              d="M208 304 L304 208 M168 256 L128 296 C97 327 97 377 128 408 C159 439 209 439 240 408 L280 368 M344 256 L384 216 C415 185 415 135 384 104 C353 73 303 73 272 104 L232 144"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="36"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'folder-plus':
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
              strokeWidth="32"
              strokeLinejoin="round"
            />
            <line x1="240" y1="210" x2="240" y2="310" stroke={primaryStroke} strokeWidth="36" strokeLinecap="round" />
            <line x1="190" y1="260" x2="290" y2="260" stroke={primaryStroke} strokeWidth="36" strokeLinecap="round" />
          </>
        );

      case 'share':
        return (
          <>
            <line x1="160" y1="230" x2="350" y2="135" stroke={primaryStroke} strokeWidth="32" strokeLinecap="round" />
            <line x1="160" y1="282" x2="350" y2="377" stroke={primaryStroke} strokeWidth="32" strokeLinecap="round" />
            <circle cx="128" cy="256" r="48" fill={secondaryFill} fillOpacity="0.25" stroke={primaryStroke} strokeWidth="32" />
            <circle cx="384" cy="128" r="48" fill={secondaryFill} fillOpacity="0.25" stroke={primaryStroke} strokeWidth="32" />
            <circle cx="384" cy="384" r="48" fill={secondaryFill} fillOpacity="0.25" stroke={primaryStroke} strokeWidth="32" />
          </>
        );

      case 'arrow-right':
        return (
          <>
            <line x1="96" y1="256" x2="416" y2="256" stroke={primaryStroke} strokeWidth="40" strokeLinecap="round" />
            <polyline points="288,128 416,256 288,384" fill="none" stroke={primaryStroke} strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'x':
        return (
          <>
            <line x1="128" y1="128" x2="384" y2="384" stroke={primaryStroke} strokeWidth="40" strokeLinecap="round" />
            <line x1="384" y1="128" x2="128" y2="384" stroke={primaryStroke} strokeWidth="40" strokeLinecap="round" />
          </>
        );

      case 'user':
        return (
          <>
            <circle cx="256" cy="160" r="72" fill={secondaryFill} fillOpacity="0.25" stroke={primaryStroke} strokeWidth="32" />
            <path
              d="M128 432 C128 344 184 304 256 304 C328 304 384 344 384 432"
              fill={secondaryFill}
              fillOpacity="0.18"
              stroke={primaryStroke}
              strokeWidth="32"
              strokeLinecap="round"
            />
          </>
        );

      case 'upload':
        return (
          <>
            <path
              d="M112 368 L112 416 C112 433.7 126.3 448 144 448 L368 448 C385.7 448 400 433.7 400 416 L400 368"
              fill={secondaryFill}
              fillOpacity="0.18"
              stroke={primaryStroke}
              strokeWidth="32"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="256" y1="352" x2="256" y2="128" stroke={primaryStroke} strokeWidth="36" strokeLinecap="round" />
            <polyline
              points="160,224 256,128 352,224"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="36"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'shield':
        return (
          <>
            <path
              d="M256 64 L400 120 L400 248 C400 352 256 448 256 448 C256 448 112 352 112 248 L112 120 Z"
              fill={secondaryFill}
              fillOpacity="0.22"
              stroke={primaryStroke}
              strokeWidth="32"
              strokeLinejoin="round"
            />
          </>
        );

      case 'vault':
        return (
          <>
            {/* Corps blindé du coffre-fort */}
            <rect
              x="72"
              y="72"
              width="368"
              height="368"
              rx="40"
              fill={secondaryFill}
              fillOpacity="0.18"
              stroke={primaryStroke}
              strokeWidth="32"
              strokeLinejoin="round"
            />
            {/* Charnières gauche renforcées */}
            <rect x="52" y="136" width="20" height="52" rx="8" fill={primaryStroke} />
            <rect x="52" y="324" width="20" height="52" rx="8" fill={primaryStroke} />
            {/* Cadre intérieur de la porte */}
            <rect
              x="120"
              y="120"
              width="272"
              height="272"
              rx="24"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="18"
              strokeOpacity="0.4"
              strokeLinejoin="round"
            />
            {/* Cadran central à combinaison rotatif */}
            <circle
              cx="256"
              cy="256"
              r="68"
              fill={secondaryFill}
              fillOpacity="0.3"
              stroke={primaryStroke}
              strokeWidth="28"
            />
            {/* Rayons / poignée du cadran */}
            <line x1="256" y1="148" x2="256" y2="188" stroke={primaryStroke} strokeWidth="26" strokeLinecap="round" />
            <line x1="256" y1="324" x2="256" y2="364" stroke={primaryStroke} strokeWidth="26" strokeLinecap="round" />
            <line x1="148" y1="256" x2="188" y2="256" stroke={primaryStroke} strokeWidth="26" strokeLinecap="round" />
            <line x1="324" y1="256" x2="364" y2="256" stroke={primaryStroke} strokeWidth="26" strokeLinecap="round" />
            {/* Moyeu central */}
            <circle cx="256" cy="256" r="22" fill={primaryStroke} />
            {/* Voyant / point de verrouillage */}
            <circle cx="348" cy="168" r="12" fill={primaryStroke} />
          </>
        );

      case 'kanban':
        return (
          <>
            <rect
              x="56"
              y="72"
              width="104"
              height="368"
              rx="16"
              fill={secondaryFill}
              fillOpacity="0.2"
              stroke={primaryStroke}
              strokeWidth="28"
            />
            <rect
              x="204"
              y="72"
              width="104"
              height="264"
              rx="16"
              fill={secondaryFill}
              fillOpacity="0.2"
              stroke={primaryStroke}
              strokeWidth="28"
            />
            <rect
              x="352"
              y="72"
              width="104"
              height="320"
              rx="16"
              fill={secondaryFill}
              fillOpacity="0.2"
              stroke={primaryStroke}
              strokeWidth="28"
            />
          </>
        );

      case 'table':
        return (
          <>
            <rect
              x="56"
              y="80"
              width="400"
              height="352"
              rx="16"
              fill={secondaryFill}
              fillOpacity="0.15"
              stroke={primaryStroke}
              strokeWidth="28"
            />
            <line
              x1="56"
              y1="184"
              x2="456"
              y2="184"
              stroke={primaryStroke}
              strokeWidth="28"
            />
            <line
              x1="220"
              y1="80"
              x2="220"
              y2="432"
              stroke={primaryStroke}
              strokeWidth="24"
            />
          </>
        );

      case 'tag':
        return (
          <>
            <path
              d="M264 64 L432 64 C440.8 64 448 71.2 448 80 L448 248 L244 452 C236 460 224 464 212 464 C200 464 188 460 180 452 L60 332 C52 324 48 312 48 300 C48 288 52 276 60 268 Z"
              fill={secondaryFill}
              fillOpacity="0.22"
              stroke={primaryStroke}
              strokeWidth="28"
              strokeLinejoin="round"
            />
            <circle cx="376" cy="136" r="28" fill={primaryStroke} />
          </>
        );

      case 'command':
        return (
          <>
            <path
              d="M176 176 C176 131.8 140.2 96 96 96 C51.8 96 16 131.8 16 176 C16 220.2 51.8 256 96 256 L176 256 L176 336 L96 336 C51.8 336 16 371.8 16 416 C16 460.2 51.8 496 96 496 C140.2 496 176 460.2 176 416 L176 336 L336 336 L336 416 C336 460.2 371.8 496 416 496 C460.2 496 496 460.2 496 416 C496 371.8 460.2 336 416 336 L336 336 L336 256 L416 256 C460.2 256 496 220.2 496 176 C496 131.8 460.2 96 416 96 C371.8 96 336 131.8 336 176 L336 256 L176 256 Z"
              transform="scale(0.85) translate(46, 10)"
              fill={secondaryFill}
              fillOpacity="0.18"
              stroke={primaryStroke}
              strokeWidth="28"
              strokeLinejoin="round"
            />
          </>
        );

      case 'download':
        return (
          <>
            <path
              d="M256 80 L256 336 M160 240 L256 336 L352 240"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="32"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M80 368 L80 432 L432 432 L432 368"
              fill={secondaryFill}
              fillOpacity="0.2"
              stroke={primaryStroke}
              strokeWidth="32"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'filter':
        return (
          <>
            <path
              d="M64 96 L448 96 L296 272 L296 416 L216 368 L216 272 Z"
              fill={secondaryFill}
              fillOpacity="0.22"
              stroke={primaryStroke}
              strokeWidth="28"
              strokeLinejoin="round"
            />
          </>
        );

      case 'sort':
        return (
          <>
            <path
              d="M176 112 L176 400 M112 176 L176 112 L240 176"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="32"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M336 400 L336 112 M272 336 L336 400 L400 336"
              fill="none"
              stroke={secondaryFill}
              strokeWidth="32"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'knit':
      case 'logo':
        return (
          <g transform="translate(64, 64) scale(16)">
            <path
              d="M4 12a8 8 0 1 0 16 0 8 8 0 1 0 -16 0"
              fill={secondaryFill}
              fillOpacity="0.22"
              stroke="none"
            />
            <path
              d="M4 12a8 8 0 1 0 16 0 8 8 0 1 0 -16 0 M5 9c4 2 8 6 10 10 M9.5 4.85C13 7 17 11 19 15 M11.5 20c2.5 0 4.5 0.5 6 1.3"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );

      case 'bug':
        return (
          <>
            {/* Corps du bug */}
            <path
              d="M160 210 C160 145 352 145 352 210 L352 320 C352 390 160 390 160 320 Z"
              fill={secondaryFill}
              fillOpacity="0.22"
            />
            <path
              d="M160 210 C160 145 352 145 352 210 L352 320 C352 390 160 390 160 320 Z"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="26"
              strokeLinejoin="round"
            />
            {/* Tête */}
            <path
              d="M200 145 C200 105 312 105 312 145 Z"
              fill={secondaryFill}
              fillOpacity="0.3"
              stroke={primaryStroke}
              strokeWidth="24"
              strokeLinejoin="round"
            />
            {/* Ligne médiane de la carapace */}
            <path
              d="M256 160 L256 360"
              stroke={primaryStroke}
              strokeWidth="22"
              strokeLinecap="round"
            />
            {/* Antennes */}
            <path
              d="M225 105 Q195 55 160 65 M287 105 Q317 55 352 65"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="22"
              strokeLinecap="round"
            />
            {/* Pattes gauches */}
            <path
              d="M160 210 L95 180 L65 200 M160 265 L85 265 L65 300 M160 320 L95 355 L80 405"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Pattes droites */}
            <path
              d="M352 210 L417 180 L447 200 M352 265 L427 265 L447 300 M352 320 L417 355 L432 405"
              fill="none"
              stroke={primaryStroke}
              strokeWidth="22"
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
