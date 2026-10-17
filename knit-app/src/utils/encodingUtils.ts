/**
 * Utilitaires d'encodage et décodage binaire haute performance pour Knit
 * Optimisé pour le streaming CRDT Yjs et les transferts d'images/avatars BLAKE3.
 * Évite les allocations mémoires en O(N^2) par concaténation de chaînes.
 */

const CHUNK_SIZE = 0x8000; // 32KB par bloc pour éviter le dépassement de pile avec String.fromCharCode.apply

/**
 * Convertit un Uint8Array en chaîne Base64 de façon optimisée par blocs.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Décode une chaîne Base64 en un Uint8Array sans allocations intermédiaires superflues.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
