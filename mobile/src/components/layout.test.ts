import { describe, expect, it } from 'vitest';

import {
  accessibleTabBarBottomOffset,
  accessibleTabBarFootprint,
  accessibleTabBarHeight,
} from './layout';

describe('accessibleTabBarHeight', () => {
  it('keeps a compact touch-friendly content height separate from the safe inset', () => {
    expect(accessibleTabBarHeight(1)).toBe(56);
    expect(accessibleTabBarBottomOffset(0)).toBe(0);
    expect(accessibleTabBarBottomOffset(24)).toBe(0);
  });

  it('grows enough for scaled labels without doubling the navigation slab', () => {
    expect(accessibleTabBarHeight(1.5)).toBe(63);
    expect(accessibleTabBarHeight(2)).toBe(72);
    expect(accessibleTabBarFootprint(2, 24)).toBe(104);
  });

  it('falls back safely for invalid dimensions', () => {
    expect(accessibleTabBarHeight(Number.NaN)).toBe(56);
    expect(accessibleTabBarBottomOffset(-1)).toBe(0);
  });
});
