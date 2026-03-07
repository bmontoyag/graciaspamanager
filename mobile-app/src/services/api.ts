import axios from 'axios';

// Utilizaremos la IP local de la maquina de desarrollo o la variable de entorno
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.18.6:3001';


export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para inyectar token (Se agregará lógica de JWT luego de configurar AsyncStorage)
api.interceptors.request.use(
    async (config) => {
        // const token = await AsyncStorage.getItem('token');
        // if (token) {
        //     config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);
