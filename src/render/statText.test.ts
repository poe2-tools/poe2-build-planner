import { describe, it, expect } from 'vitest';
import { cleanStatText } from './statText';

describe('cleanStatText', () => {
  it('shows the display text after the pipe', () => {
    expect(
      cleanStatText('50% of [Evasion|Evasion Rating] also grants [ElementalDamage|Elemental Damage] reduction'),
    ).toBe('50% of Evasion Rating also grants Elemental Damage reduction');
  });

  it('shows the tag when there is no pipe', () => {
    expect(cleanStatText('You can apply an additional [Curse]')).toBe('You can apply an additional Curse');
  });

  it('preserves newlines between stat lines', () => {
    expect(
      cleanStatText('Recovery applied to [EnergyShield|Energy Shield]\n[EnergyShield|Energy Shield] does not Recharge'),
    ).toBe('Recovery applied to Energy Shield\nEnergy Shield does not Recharge');
  });

  it('leaves text without markup unchanged', () => {
    expect(cleanStatText('15% increased Mana Regeneration Rate')).toBe('15% increased Mana Regeneration Rate');
  });
});
