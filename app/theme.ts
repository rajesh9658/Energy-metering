// app/theme.ts (NEW FILE BANAYEIN)
export const lightTheme = {
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
};

export const darkTheme = {
  background: '#0F172A',
  text: '#F1F5F9',
  primary: '#3B82F6',
  secondary: '#1D4ED8',
  card: '#1E293B',
  border: '#334155',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gray: '#64748B',
  lightGray: '#334155',
  white: '#FFFFFF',
  black: '#000000',
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