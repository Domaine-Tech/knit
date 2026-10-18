/**
 * Sanitizer HTML whitelist pour Live Preview & rendus (B-059).
 * Autorise uniquement : kbd, u, mark, sub, sup, br, details, summary.
 */

const ALLOWED_TAGS = new Set([
  'kbd',
  'u',
  'mark',
  'sub',
  'sup',
  'br',
  'details',
  'summary',
]);

const DANGEROUS_TAG_RE =
  /<\/?(?:script|iframe|object|embed|style|link|meta|form|input|button|textarea|select|base)\b[^>]*>/gi;

const EVENT_ATTR_RE = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URL_RE = /\s+(?:href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi;

/** Neutralise les balises / attributs dangereux tout en conservant la whitelist. */
export function sanitizeAllowedHtml(input: string): string {
  let out = input.replace(DANGEROUS_TAG_RE, '');
  out = out.replace(EVENT_ATTR_RE, '');
  out = out.replace(JS_URL_RE, '');

  // Supprimer toute balise hors whitelist
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g, (full, tag: string) => {
    const lower = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(lower)) return '';
    if (lower === 'br') return '<br />';
    // Strip attributes sauf open sur details
    if (lower === 'details') {
      const open = /\bopen\b/i.test(full) ? ' open' : '';
      return full.startsWith('</') ? '</details>' : `<details${open}>`;
    }
    if (full.startsWith('</')) return `</${lower}>`;
    return `<${lower}>`;
  });

  return out;
}

/**
 * Escape HTML puis réinjecte uniquement les balises whitelistées **complètes**.
 * Les fragments seuls (`<kbd>` sans fermeture) sont échappés — évite les pastilles vides
 * quand on documente une balise dans du code inline `` `<kbd>` ``.
 */
export function escapeThenAllowlist(text: string): string {
  const placeholders: string[] = [];
  const protect = (m: string): string => {
    const safe = sanitizeAllowedHtml(m);
    if (!safe) return '';
    const idx = placeholders.length;
    placeholders.push(safe);
    return `\u0000PH${idx}\u0000`;
  };

  // Paires complètes d'abord, puis <br>, puis blocs details
  let withPh = text.replace(
    /<(kbd|u|mark|sub|sup|summary)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (m) => protect(m)
  );
  withPh = withPh.replace(/<br\s*\/?>/gi, (m) => protect(m));
  withPh = withPh.replace(
    /<details(?:\s[^>]*)?>[\s\S]*?<\/details>/gi,
    (m) => protect(m)
  );

  const escaped = withPh
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(/\u0000PH(\d+)\u0000/g, (_, n) => placeholders[Number(n)] || '');
}

export const HTML_INLINE_TAG_RE =
  /<(kbd|u|mark|sub|sup)(?:\s[^>]*)?>([\s\S]*?)<\/\1>|<br\s*\/?>/gi;

export const HTML_DETAILS_RE =
  /<details(?:\s[^>]*)?>([\s\S]*?)<\/details>/gi;
