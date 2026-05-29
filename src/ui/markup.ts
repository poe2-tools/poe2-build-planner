import type { CSSProperties } from 'react';

// PoE build `additional_text` markup: `<NAME>{content}`, nesting + brace-balanced.
// Real examples: `<m>{<red>{Strength +5 is recommended}}`, `<silver>{Any Belt}\n\n...`.

export type MNode =
  | { type: 'text'; value: string }
  | { type: 'tag'; tag: string; children: MNode[] };

// Single-letter font/style tags. Order = toolbar order (R B I U S M L).
export const FONT_TAGS = ['r', 'b', 'i', 'u', 's', 'm', 'l'] as const;

// Named colours -> hex (toolbar swatches + styleForTag). Insertion order = swatch order.
export const COLOURS: Record<string, string> = {
  red: '#d65a5a',
  orange: '#e08a3c',
  yellow: '#e6d24a',
  green: '#6ec86e',
  blue: '#5a8ad6',
  indigo: '#5a5ad6',
  violet: '#9a5ad6',
  black: '#000000',
  white: '#ffffff',
  grey: '#9aa0b0',
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#d9c25a',
};

const RGB_RE = /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/;

// Is `name` a recognized tag (font letter, named colour, or rgb(...))?
function isKnownTag(name: string): boolean {
  return (FONT_TAGS as readonly string[]).includes(name) || name in COLOURS || RGB_RE.test(name);
}

// Parse markup into an AST. Never throws, never loses characters: a malformed /
// unclosed `<tag>{` (or anything that isn't a recognized opener) falls back to
// literal text.
export function parseMarkup(text: string): MNode[] {
  const r = parseNodes(text, 0, false);
  return mergeText(r.nodes);
}

// Parse from index `start`. When `inTag`, the run is the body of a tag and stops
// at the first top-level `}`.
//   - closed=true  => we consumed a closing `}` (only meaningful when inTag);
//                     `end` points just past it.
//   - closed=false => reached end of input without a close (inTag = unclosed tag).
function parseNodes(
  text: string,
  start: number,
  inTag: boolean,
): { nodes: MNode[]; end: number; closed: boolean } {
  const nodes: MNode[] = [];
  let buf = '';
  let i = start;
  const flush = () => {
    if (buf) {
      nodes.push({ type: 'text', value: buf });
      buf = '';
    }
  };
  while (i < text.length) {
    const ch = text[i];
    if (inTag && ch === '}') {
      flush();
      return { nodes, end: i + 1, closed: true };
    }
    if (ch === '<') {
      const tag = tryReadTag(text, i);
      if (tag) {
        const body = parseNodes(text, tag.bodyStart, true);
        if (body.closed) {
          flush();
          nodes.push({ type: 'tag', tag: tag.name, children: mergeText(body.nodes) });
          i = body.end;
          continue;
        }
        // Unclosed tag: everything from here to the end is malformed — emit it
        // all as literal text so no characters are lost.
        buf += text.slice(i);
        i = text.length;
        break;
      }
    }
    buf += ch;
    i += 1;
  }
  flush();
  return { nodes, end: i, closed: false };
}

// If `text[i]` starts a valid `<NAME>{` opener, return the tag name + the index
// just after `{`. Otherwise null (caller treats `<` as literal).
function tryReadTag(text: string, i: number): { name: string; bodyStart: number } | null {
  if (text[i] !== '<') return null;
  const close = text.indexOf('>', i + 1);
  if (close < 0) return null;
  if (text[close + 1] !== '{') return null;
  const name = text.slice(i + 1, close);
  if (!isKnownTag(name)) return null;
  return { name, bodyStart: close + 2 };
}

// Merge adjacent text nodes (cosmetic; keeps output minimal + stable for tests).
function mergeText(nodes: MNode[]): MNode[] {
  const out: MNode[] = [];
  for (const n of nodes) {
    const last = out[out.length - 1];
    if (n.type === 'text' && last && last.type === 'text') last.value += n.value;
    else out.push(n);
  }
  return out;
}

// Map a tag to CSS. Pure.
export function styleForTag(tag: string): CSSProperties {
  switch (tag) {
    case 'b':
      return { fontWeight: 'bold' };
    case 'i':
      return { fontStyle: 'italic' };
    case 'u':
      return { textDecoration: 'underline' };
    case 'r':
      return { fontWeight: 'normal', fontStyle: 'normal' };
    case 's':
      return { fontSize: '0.85em' };
    case 'm':
      return { fontSize: '1em' };
    case 'l':
      return { fontSize: '1.25em' };
  }
  if (tag in COLOURS) return { color: COLOURS[tag] };
  const m = tag.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (m) return { color: `rgb(${Number(m[1])}, ${Number(m[2])}, ${Number(m[3])})` };
  return {};
}

// Insert `<tag>{ selected }` around [selStart, selEnd). Returns the new text plus
// the selection range covering the inserted inner content (caret between braces
// when the selection was empty, so the user can keep typing). Pure.
export function wrapSelection(
  text: string,
  selStart: number,
  selEnd: number,
  tag: string,
): { text: string; selStart: number; selEnd: number } {
  const before = text.slice(0, selStart);
  const inner = text.slice(selStart, selEnd);
  const after = text.slice(selEnd);
  const open = `<${tag}>{`;
  const next = `${before}${open}${inner}}${after}`;
  const innerStart = before.length + open.length;
  return { text: next, selStart: innerStart, selEnd: innerStart + inner.length };
}
