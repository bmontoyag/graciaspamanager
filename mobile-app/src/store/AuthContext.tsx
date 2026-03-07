import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

interface AuthContextType {
    user: any;
    token: string | null;
    isLoading: boolean;
    login: (token: string, userData: any) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Carga inicial del token almacenado
        const loadStoredData = async () => {
            try {
                const storedToken = await AsyncStorage.getItem('@token');
                const storedUser = await AsyncStorage.getItem('@user');

                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                    // Inyectar en el interceptor de Axios
                    api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                }
            } catch (error) {
                console.error("Error cargando sesion", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadStoredData();
    }, []);

    const login = async (newToken: string, userData: any) => {
        await AsyncStorage.setItem('@token', newToken);
        await AsyncStorage.setItem('@user', JSON.stringify(userData));
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);
        setUser(userData);
    };

    const logout = async () => {
        await AsyncStorage.removeItem('@token');
        await AsyncStorage.removeItem('@user');
        delete api.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
