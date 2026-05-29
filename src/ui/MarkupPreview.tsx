import type { CSSProperties, ReactNode } from 'react';
import { parseMarkup, styleForTag } from './markup';
import type { MNode } from './markup';

function render(nodes: MNode[]): ReactNode {
  return nodes.map((n, i) =>
    n.type === 'text' ? (
      <span key={i}>{n.value}</span>
    ) : (
      <span key={i} style={styleForTag(n.tag)}>
        {render(n.children)}
      </span>
    ),
  );
}

/** Renders PoE `<tag>{...}` markup as styled (nestable) spans. Inline; wrap it in a
 *  `white-space: pre-wrap` container to honour newlines. */
export default function MarkupPreview({ text, style }: { text: string; style?: CSSProperties }) {
  return <span style={{ whiteSpace: 'pre-wrap', ...style }}>{render(parseMarkup(text))}</span>;
}
