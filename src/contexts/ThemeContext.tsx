import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'default' | 'dark' | 'luxury' | 'minimal';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeClasses: {
    background: string;
    card: string;
    text: string;
    header: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeConfig: Record<Theme, { background: string; card: string; text: string; header: string }> = {
  default: {
    background: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950',
    card: 'bg-slate-800/80 border-slate-700/50',
    text: 'text-white',
    header: 'backdrop-blur-sm bg-slate-950/30 border-slate-800/50'
  },
  dark: {
    background: 'bg-gradient-to-br from-gray-900 via-black to-gray-900',
    card: 'bg-gray-800/80 border-gray-700/50',
    text: 'text-white',
    header: 'backdrop-blur-sm bg-gray-900/30 border-gray-800/50'
  },
  luxury: {
    background: 'bg-gradient-to-br from-amber-950 via-yellow-950 to-amber-950',
    card: 'bg-amber-900/80 border-amber-800/50',
    text: 'text-amber-50',
    header: 'backdrop-blur-sm bg-amber-950/30 border-amber-800/50'
  },
  minimal: {
    background: 'bg-gradient-to-br from-yellow-50 via-white to-purple-50',
    card: 'bg-white/90 border-gray-200 shadow-lg',
    text: 'text-gray-900',
    header: 'backdrop-blur-sm bg-white/90 border-gray-200/50'
  }
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as Theme;
      return saved || 'minimal';
    }
    return 'minimal';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeClasses: themeConfig[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

