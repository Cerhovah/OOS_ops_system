const MIN_TAB_BAR_CONTENT_HEIGHT = 60;
const TAB_BAR_BASE_HEIGHT = 48;
const TAB_BAR_SCALE_ALLOWANCE = 12;
const MIN_TAB_BAR_BOTTOM_OFFSET = 10;
const TAB_BAR_SCREEN_GAP = 12;

export function accessibleTabBarHeight(fontScale: number): number {
  const safeFontScale = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  return Math.ceil(Math.max(
    MIN_TAB_BAR_CONTENT_HEIGHT,
    TAB_BAR_BASE_HEIGHT + TAB_BAR_SCALE_ALLOWANCE * safeFontScale,
  ));
}

export function accessibleTabBarBottomOffset(bottomInset: number): number {
  const safeBottomInset = Number.isFinite(bottomInset) && bottomInset > 0 ? bottomInset : 0;
  return Math.ceil(Math.max(MIN_TAB_BAR_BOTTOM_OFFSET, safeBottomInset + 4));
}

export function accessibleTabBarFootprint(fontScale: number, bottomInset: number): number {
  return accessibleTabBarHeight(fontScale)
    + accessibleTabBarBottomOffset(bottomInset)
    + TAB_BAR_SCREEN_GAP;
}
