const MIN_TAB_BAR_CONTENT_HEIGHT = 64;
const SCALED_TAB_BAR_CONTENT_HEIGHT = 56;

export function accessibleTabBarHeight(fontScale: number, bottomInset: number): number {
  const safeFontScale = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  const safeBottomInset = Number.isFinite(bottomInset) && bottomInset > 0 ? bottomInset : 0;
  const contentHeight = Math.max(MIN_TAB_BAR_CONTENT_HEIGHT, SCALED_TAB_BAR_CONTENT_HEIGHT * safeFontScale);
  return Math.ceil(contentHeight + safeBottomInset);
}
