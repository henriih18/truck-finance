import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, type ThemeColors, type ThemeMode } from './colors';

type ThemeContextValue = {
  mode: ThemeMode;            // preferencia del usuario: 'light' | 'dark' | 'system'
  resolved: 'light' | 'dark'; // tema efectivo (después de aplicar 'system')
  colors: ThemeColors;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;          // cambia entre light y dark (ignora system)
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'truck-finance-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  // Cargar preferencia guardada al arrancar
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      } catch (e) {
        console.warn('[Theme] No se pudo cargar preferencia:', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  };

  const toggle = () => {
    // Si está en system o light → va a dark; si está en dark → va a light
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  // Resolver tema efectivo
  const resolved: 'light' | 'dark' =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const colors = resolved === 'dark' ? darkColors : lightColors;

  // No renderizar hasta cargar la preferencia (evita flash inicial)
  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ mode, resolved, colors, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
