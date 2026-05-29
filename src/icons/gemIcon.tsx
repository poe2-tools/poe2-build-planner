const cache = new Map<string, string>();

export function gemIconUrl(iconDdsFile: string): string {
  const cached = cache.get(iconDdsFile);
  if (cached) return cached;
  // Icons are vendored locally (scripts/fetch-icons.mjs) as PNGs under public/icons/poe2/;
  // BASE_URL keeps the path correct under a GitHub Pages project subpath.
  const rel = iconDdsFile.replace(/\.dds$/i, '.png');
  const url = `${import.meta.env.BASE_URL}icons/poe2/${rel}`;
  cache.set(iconDdsFile, url);
  return url;
}

export function GemIcon({ iconDdsFile, size = 32 }: { iconDdsFile: string; size?: number }) {
  return (
    <img
      src={gemIconUrl(iconDdsFile)}
      width={size}
      height={size}
      loading="lazy"
      alt=""
      onError={(e) => {
        e.currentTarget.style.visibility = 'hidden';
      }}
      style={{ objectFit: 'contain', flex: '0 0 auto' }}
    />
  );
}
