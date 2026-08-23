import { describe, expect, it } from 'vitest';

import { accessibleTabBarHeight } from './layout';

describe('accessibleTabBarHeight', () => {
  it('keeps the minimum touch-friendly content height and adds the Android safe inset', () => {
    expect(accessibleTabBarHeight(1, 24)).toBe(88);
  });

  it('grows with the system font scale instead of clipping tab labels', () => {
    expect(accessibleTabBarHeight(1.5, 24)).toBe(108);
    expect(accessibleTabBarHeight(2, 0)).toBe(112);
  });

  it('falls back safely for invalid dimensions', () => {
    expect(accessibleTabBarHeight(Number.NaN, -1)).toBe(64);
  });
});
