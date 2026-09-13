const MIN_TAB_BAR_CONTENT_HEIGHT = 56;
const TAB_BAR_BASE_HEIGHT = 36;
const TAB_BAR_SCALE_ALLOWANCE = 18;
const TAB_BAR_SCREEN_GAP = 8;

export function accessibleTabBarHeight(fontScale: number): number {
  const safeFontScale = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  return Math.ceil(Math.max(
    MIN_TAB_BAR_CONTENT_HEIGHT,
    TAB_BAR_BASE_HEIGHT + TAB_BAR_SCALE_ALLOWANCE * safeFontScale,
  ));
}

export function accessibleTabBarBottomOffset(bottomInset: number): number {
  void bottomInset;
  return 0;
}

export function accessibleTabBarFootprint(fontScale: number, bottomInset: number): number {
  return accessibleTabBarHeight(fontScale)
    + Math.ceil(Number.isFinite(bottomInset) && bottomInset > 0 ? bottomInset : 0)
    + TAB_BAR_SCREEN_GAP;
}
