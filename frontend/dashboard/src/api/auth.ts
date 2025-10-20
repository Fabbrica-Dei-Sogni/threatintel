// src/api/auth.ts
import axios from 'axios';
import type { AxiosResponse} from 'axios';

const baseURL: string = import.meta.env.VUE_APP_API_URL || 'https://alessandromodica.com:2443/honeypot';

const apiClient = axios.create({
    baseURL,
    timeout: 8000,
});

// Tipi parametri e risposta generica (da definire meglio in futuro)
interface RegisterUserParams {
    username: string;
    email: string;
    password: string;
}

interface LoginUserParams {
    username: string;
    password: string;
}

// Tipo generico per la risposta di registrazione/login (adatta a seconda della risposta backend)
interface AuthResponse {
    token?: string;
    userId?: string;
    message?: string;
    [key: string]: any;
}

export async function registerUser(
    username: string,
    email: string,
    password: string
): Promise<AxiosResponse<AuthResponse>> {
    try {
        const response = await apiClient.post<AuthResponse>('/auth/register', { username, email, password });
        return response;
    } catch (error) {
        throw error;
    }
}

export async function loginUser(
    username: string,
    password: string
): Promise<AxiosResponse<AuthResponse>> {
    try {
        const response = await apiClient.post<AuthResponse>('/auth/login', { username, password });
        return response;
    } catch (error) {
        throw error;
    }
}
