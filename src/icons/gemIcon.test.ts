import { describe, it, expect } from 'vitest';
import { gemIconUrl } from './gemIcon';

describe('gemIconUrl', () => {
  it('builds a base-aware local path, mapping the .dds source to the bundled .png', () => {
    expect(gemIconUrl('Art/2DArt/SkillIcons/4k/RangerIceShot.dds')).toBe(
      '/icons/poe2/Art/2DArt/SkillIcons/4k/RangerIceShot.png',
    );
  });

  it('returns a stable cached value for repeated lookups', () => {
    const a = gemIconUrl('Art/x.dds');
    const b = gemIconUrl('Art/x.dds');
    expect(a).toBe(b);
  });
});
