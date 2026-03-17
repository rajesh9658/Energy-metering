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
  background: '#F3F6FA',
  text: '#142033',
  primary: '#2E7BC7',
  secondary: '#245F9E',
  card: '#EAF0F6',
  border: '#D4DEE9',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gray: '#8595AA',
  lightGray: '#E9EFF5',
  white: '#FFFFFF',
  black: '#0F172A',
  mutedText: '#617287',
  surface: '#FDFEFF',
  header: '#3A8AD6',
  headerText: '#FFFFFF',
  tabBar: '#F7FAFD',
  shadow: 'rgba(0, 0, 0, 0.14)',
};

export const darkTheme: ThemeColors = {
  background: '#0D1422',
  text: '#F3F7FC',
  primary: '#4A8FFF',
  secondary: '#2B6FE0',
  card: '#182235',
  border: '#27354B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gray: '#7B8EA8',
  lightGray: '#25344A',
  white: '#FFFFFF',
  black: '#000000',
  mutedText: '#B0BFD1',
  surface: '#121C2E',
  header: '#111A2D',
  headerText: '#F8FAFC',
  tabBar: '#10192B',
  shadow: 'rgba(0, 0, 0, 0.42)',
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
