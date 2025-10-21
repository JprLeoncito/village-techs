import { useTheme } from '../contexts/ThemeContext';

// Theme color hook for consistent styling using ThemeContext
export const useThemeColor = (variant: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'background' | 'text' | 'border' | 'card' | 'notification' | 'muted' | keyof any) => {
  const { theme } = useTheme();

  return theme.colors[variant as keyof typeof theme.colors];
};