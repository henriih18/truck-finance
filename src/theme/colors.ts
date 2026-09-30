/**
 * Paletas de color para modo claro y oscuro.
 * Sistema semántico: los componentes usan `colors.background`, `colors.text`, etc.
 * en vez de colores hardcoded, así cambian automáticamente con el tema.
 */

export type ThemeColors = {
  // Fondos
  background: string;       // fondo de pantalla
  surface: string;          // tarjetas, secciones
  surfaceMuted: string;     // inputs, fondos secundarios
  surfaceHighlight: string;  // secciones destacadas (flete neto)
  // Texto
  text: string;             // texto principal
  textSecondary: string;    // labels, subtitulos
  textMuted: string;        // hints, placeholders
  textOnPrimary: string;    // texto sobre color primario
  textOnAccent: string;     // texto sobre verde destacado
  // Bordes
  border: string;
  borderSubtle: string;
  // Marca
  primary: string;          // verde esmeralda (acción principal)
  primaryMuted: string;     // versión clara para fondos
  success: string;          // verde positivo
  danger: string;           // rojo
  warning: string;          // amarillo
  info: string;             // cyan
  // Especiales
  accent: string;           // verde destacado para tarjeta "por cobrar"
  accentBg: string;         // fondo de la tarjeta "por cobrar"
  accentText: string;       // texto sobre accentBg
  // Tab bar
  tabActive: string;
  tabInactive: string;
};

export const lightColors: ThemeColors = {
  background: '#ffffff',
  surface: '#f9fafb',
  surfaceMuted: '#f3f4f6',
  surfaceHighlight: '#d1fae5',
  text: '#111827',
  textSecondary: '#4b5563',
  textMuted: '#6b7280',
  textOnPrimary: '#ffffff',
  textOnAccent: '#ffffff',
  border: '#e5e7eb',
  borderSubtle: '#f3f4f6',
  primary: '#059669',
  primaryMuted: '#d1fae5',
  success: '#059669',
  danger: '#dc2626',
  warning: '#eab308',
  info: '#0ea5e9',
  accent: '#059669',
  accentBg: '#059669',
  accentText: '#ffffff',
  tabActive: '#059669',
  tabInactive: '#6b7280',
};

export const darkColors: ThemeColors = {
  background: '#0f172a',          // slate-900
  surface: '#1e293b',            // slate-800
  surfaceMuted: '#334155',        // slate-700
  surfaceHighlight: '#064e3b',    // verde oscuro
  text: '#f1f5f9',               // slate-100
  textSecondary: '#cbd5e1',      // slate-300
  textMuted: '#94a3b8',          // slate-400
  textOnPrimary: '#ffffff',
  textOnAccent: '#ffffff',
  border: '#334155',             // slate-700
  borderSubtle: '#1e293b',
  primary: '#10b981',            // emerald-500 (más brillante en dark)
  primaryMuted: '#064e3b',
  success: '#10b981',
  danger: '#f87171',             // red-400 (más brillante)
  warning: '#fbbf24',
  info: '#38bdf8',
  accent: '#10b981',
  accentBg: '#065f46',
  accentText: '#ffffff',
  tabActive: '#10b981',
  tabInactive: '#94a3b8',
};

export type ThemeMode = 'light' | 'dark' | 'system';
