export type ThemeColors = {
  background: string;
  text: string;
  primary: string;
  secondary: string;
  card: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  gray: string;
  lightGray: string;
  white: string;
  black: string;
  mutedText: string;
  surface: string;
  header: string;
  headerText: string;
  tabBar: string;
  shadow: string;
};

export const lightTheme: ThemeColors = {
  background: '#FFFFFF',
  text: '#000000',
  primary: '#1E88E5',
  secondary: '#1565C0',
  card: '#F8FAFC',
  border: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gray: '#94A3B8',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  black: '#000000',
  mutedText: '#64748B',
  surface: '#FFFFFF',
  header: '#1E88E5',
  headerText: '#FFFFFF',
  tabBar: '#FFFFFF',
  shadow: 'rgba(15, 23, 42, 0.12)',
};

export const darkTheme: ThemeColors = {
  background: '#0B1220',
  text: '#F8FAFC',
  primary: '#3B82F6',
  secondary: '#1D4ED8',
  card: '#162033',
  border: '#243146',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gray: '#71839C',
  lightGray: '#243146',
  white: '#FFFFFF',
  black: '#000000',
  mutedText: '#A5B4C7',
  surface: '#111A2B',
  header: '#0F172A',
  headerText: '#F8FAFC',
  tabBar: '#0F172A',
  shadow: 'rgba(0, 0, 0, 0.35)',
};

export const getThemeColors = (isDark: boolean) => {
  return isDark ? darkTheme : lightTheme;
};

// Common styles
export const commonStyles = {
  shadow: {
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardShadow: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  }
};
