/** Strip PoE tree stat markup: `[Tag|Display]` -> `Display`, `[Tag]` -> `Tag`. */
export function cleanStatText(s: string): string {
  return s.replace(/\[([^\]]+)\]/g, (_match, inner: string) => {
    const pipe = inner.indexOf('|');
    return pipe >= 0 ? inner.slice(pipe + 1) : inner;
  });
}
