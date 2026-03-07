import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

interface ThemeColors {
    sidebar: string;
    primary: string;
    bgPage: string;
    bgCard: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    success: string;
    danger: string;
    warning: string;
    info: string;
    purple: string;
}

const DEFAULT_THEME: ThemeColors = {
    sidebar: '#2C3E50',
    primary: '#2C3E50',
    bgPage: '#F1F2F6',
    bgCard: '#FFFFFF',
    textPrimary: '#2C3E50',
    textSecondary: '#636E72',
    textMuted: '#B2BEC3',
    border: '#DFE6E9',
    success: '#00B894',
    danger: '#E74C3C',
    warning: '#F39C12',
    info: '#0984E3',
    purple: '#8E44AD',
};

const ThemeContext = createContext<ThemeColors>(DEFAULT_THEME);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [colors, setColors] = useState<ThemeColors>(DEFAULT_THEME);

    useEffect(() => {
        api.get('/configuration').then(res => {
            const c = res.data;
            setColors(prev => ({
                ...prev,
                sidebar: c.sidebarColor || prev.sidebar,
                primary: c.primaryColor || prev.primary,
                bgPage: c.backgroundColor || prev.bgPage,
            }));
        }).catch(() => { /* usa defaults */ });
    }, []);

    return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

// Helper para acceder a los colores de tema en StyleSheet (no puede usar hooks)
export let AppColors: ThemeColors = DEFAULT_THEME;

export function syncAppColors(colors: ThemeColors) {
    AppColors = colors;
}
