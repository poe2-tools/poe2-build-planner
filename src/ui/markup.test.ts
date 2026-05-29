import { describe, it, expect } from 'vitest';
import { parseMarkup, styleForTag, wrapSelection, COLOURS, FONT_TAGS } from './markup';

describe('parseMarkup', () => {
  it('parses plain text into a single text node', () => {
    expect(parseMarkup('hello world')).toEqual([{ type: 'text', value: 'hello world' }]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseMarkup('')).toEqual([]);
  });

  it('parses a single tag', () => {
    expect(parseMarkup('<b>{bold}')).toEqual([
      { type: 'tag', tag: 'b', children: [{ type: 'text', value: 'bold' }] },
    ]);
  });

  it('parses a named colour tag', () => {
    expect(parseMarkup('<red>{danger}')).toEqual([
      { type: 'tag', tag: 'red', children: [{ type: 'text', value: 'danger' }] },
    ]);
  });

  it('parses an rgb(...) tag', () => {
    expect(parseMarkup('<rgb(255, 0, 0)>{x}')).toEqual([
      { type: 'tag', tag: 'rgb(255, 0, 0)', children: [{ type: 'text', value: 'x' }] },
    ]);
  });

  it('parses a nested tag', () => {
    expect(parseMarkup('<m>{<red>{x}}')).toEqual([
      {
        type: 'tag',
        tag: 'm',
        children: [{ type: 'tag', tag: 'red', children: [{ type: 'text', value: 'x' }] }],
      },
    ]);
  });

  it('parses text before and after a tag', () => {
    expect(parseMarkup('Take <green>{BEFORE} BoneShatter')).toEqual([
      { type: 'text', value: 'Take ' },
      { type: 'tag', tag: 'green', children: [{ type: 'text', value: 'BEFORE' }] },
      { type: 'text', value: ' BoneShatter' },
    ]);
  });

  it('keeps newlines inside text nodes', () => {
    expect(parseMarkup('<silver>{Any Belt}\n\nplain')).toEqual([
      { type: 'tag', tag: 'silver', children: [{ type: 'text', value: 'Any Belt' }] },
      { type: 'text', value: '\n\nplain' },
    ]);
  });

  it('keeps newlines inside a tag body', () => {
    expect(parseMarkup('<grey>{line1\nline2}')).toEqual([
      { type: 'tag', tag: 'grey', children: [{ type: 'text', value: 'line1\nline2' }] },
    ]);
  });

  it('handles a multi-level brace-balanced body', () => {
    // outer body contains a nested tag plus surrounding literal text
    expect(parseMarkup('<m>{a <b>{c} d}')).toEqual([
      {
        type: 'tag',
        tag: 'm',
        children: [
          { type: 'text', value: 'a ' },
          { type: 'tag', tag: 'b', children: [{ type: 'text', value: 'c' }] },
          { type: 'text', value: ' d' },
        ],
      },
    ]);
  });

  it('leaves an unclosed tag as literal text without throwing', () => {
    expect(parseMarkup('<b>{oops')).toEqual([{ type: 'text', value: '<b>{oops' }]);
  });

  it('leaves an unknown tag as literal text', () => {
    expect(parseMarkup('<xyz>{hi}')).toEqual([{ type: 'text', value: '<xyz>{hi}' }]);
  });

  it('treats a stray < as literal text', () => {
    expect(parseMarkup('a < b')).toEqual([{ type: 'text', value: 'a < b' }]);
  });

  it('treats a tag name not followed by a brace as literal', () => {
    expect(parseMarkup('<b> not a tag')).toEqual([{ type: 'text', value: '<b> not a tag' }]);
  });

  it('does not lose characters on a malformed nested close', () => {
    // missing the outer close brace
    expect(parseMarkup('<m>{<red>{x}')).toEqual([{ type: 'text', value: '<m>{<red>{x}' }]);
  });
});

describe('styleForTag', () => {
  it('maps font tags', () => {
    expect(styleForTag('b')).toEqual({ fontWeight: 'bold' });
    expect(styleForTag('i')).toEqual({ fontStyle: 'italic' });
    expect(styleForTag('u')).toEqual({ textDecoration: 'underline' });
    expect(styleForTag('r')).toEqual({ fontWeight: 'normal', fontStyle: 'normal' });
    expect(styleForTag('s')).toEqual({ fontSize: '0.85em' });
    expect(styleForTag('m')).toEqual({ fontSize: '1em' });
    expect(styleForTag('l')).toEqual({ fontSize: '1.25em' });
  });

  it('maps named colours to hex', () => {
    expect(styleForTag('red')).toEqual({ color: '#d65a5a' });
    expect(styleForTag('gold')).toEqual({ color: '#d9c25a' });
    expect(styleForTag('black')).toEqual({ color: '#000000' });
  });

  it('maps rgb(...) to a CSS rgb colour', () => {
    expect(styleForTag('rgb(255, 0, 0)')).toEqual({ color: 'rgb(255, 0, 0)' });
    expect(styleForTag('rgb(10,20,30)')).toEqual({ color: 'rgb(10, 20, 30)' });
  });

  it('returns an empty object for an unknown tag', () => {
    expect(styleForTag('xyz')).toEqual({});
  });
});

describe('wrapSelection', () => {
  it('wraps a selection in the middle', () => {
    const r = wrapSelection('abcdef', 2, 4, 'b');
    expect(r.text).toBe('ab<b>{cd}ef');
    // inner content selected
    expect(r.text.slice(r.selStart, r.selEnd)).toBe('cd');
  });

  it('inserts empty braces and places caret inside when there is no selection', () => {
    const r = wrapSelection('abc', 1, 1, 'red');
    expect(r.text).toBe('a<red>{}bc');
    expect(r.selStart).toBe(r.selEnd);
    expect(r.text.slice(0, r.selStart)).toBe('a<red>{');
  });

  it('wraps at the start of the string', () => {
    const r = wrapSelection('abc', 0, 2, 'i');
    expect(r.text).toBe('<i>{ab}c');
    expect(r.text.slice(r.selStart, r.selEnd)).toBe('ab');
  });

  it('wraps at the end of the string', () => {
    const r = wrapSelection('abc', 1, 3, 'u');
    expect(r.text).toBe('a<u>{bc}');
    expect(r.text.slice(r.selStart, r.selEnd)).toBe('bc');
  });

  it('wraps the entire string', () => {
    const r = wrapSelection('xy', 0, 2, 'm');
    expect(r.text).toBe('<m>{xy}');
    expect(r.text.slice(r.selStart, r.selEnd)).toBe('xy');
  });

  it('wraps with an rgb tag', () => {
    const r = wrapSelection('hi', 0, 2, 'rgb(1, 2, 3)');
    expect(r.text).toBe('<rgb(1, 2, 3)>{hi}');
  });
});

describe('exported constants', () => {
  it('exposes the font tag list', () => {
    expect(FONT_TAGS).toEqual(['r', 'b', 'i', 'u', 's', 'm', 'l']);
  });

  it('exposes the colour map', () => {
    expect(COLOURS.red).toBe('#d65a5a');
    expect(Object.keys(COLOURS)).toContain('silver');
  });
});
