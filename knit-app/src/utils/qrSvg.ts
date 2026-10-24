/**
 * Générateur QR Code ISO (SVG) via `uqr` — scannable par un lecteur réel.
 * Payload typique : PIN LAN à 6 chiffres (B-017b).
 */
import { encode } from 'uqr';

/** Encode une chaîne en SVG QR (modules data + finder patterns ISO). */
export function buildQrSvg(payload: string, sizePx = 160): string {
  const text = payload.trim() || 'knit';
  const { data, size } = encode(text, { ecc: 'M' });
  const cell = sizePx / size;
  const rects: string[] = [];

  for (let y = 0; y < size; y++) {
    const row = data[y];
    for (let x = 0; x < size; x++) {
      if (row[x]) {
        rects.push(
          `<rect x="${(x * cell).toFixed(2)}" y="${(y * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="currentColor"/>`
        );
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}" role="img" aria-label="QR Code">${rects.join('')}</svg>`;
}
