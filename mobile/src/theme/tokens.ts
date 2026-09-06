export const tokens = {
  color: {
    light: {
      background: '#F7F7F5',
      surface: '#FFFFFF',
      foreground: '#171A1F',
      muted: '#667085',
      border: '#E1E4E8',
      accent: '#3159D9',
      accentSoft: '#EDF1FF',
      warning: '#8A5300',
      warningSoft: '#FFF2D8',
      danger: '#9A2E2E',
      dangerSoft: '#FDECEC',
      overlay: 'rgba(0,0,0,0.35)',
      inverse: '#FFFFFF',
    },
    dark: {
      background: '#101214',
      surface: '#191C20',
      foreground: '#F2F4F7',
      muted: '#B7C0CC',
      border: '#3A4048',
      accent: '#AFC6FF',
      accentSoft: '#1B315E',
      warning: '#FFD28A',
      warningSoft: '#4A3515',
      danger: '#FFB4AB',
      dangerSoft: '#56211E',
      overlay: 'rgba(0,0,0,0.58)',
      inverse: '#101214',
    },
  },
  space: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { none: 0, control: 12, card: 16, pill: 999 },
  type: { caption: 13, body: 16, title: 24, heading: 30, timer: 64 },
  hitTarget: 48,
} as const;

export const lightColors = tokens.color.light;
export const darkColors = tokens.color.dark;
