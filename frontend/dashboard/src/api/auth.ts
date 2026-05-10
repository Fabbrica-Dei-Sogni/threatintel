/**
 * ThreatIntel - Reference Implementation Dashboard
 * 
 * This file is part of the reference frontend implementation of the 
 * ThreatIntel Distributed Forensics Engine.
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Production or commercial use of this specific interface requires 
 * a valid commercial license from the author.
 */

// src/api/auth.ts
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { getEnv } from '../config';

const baseURL: string = getEnv('VITE_APP_API_URL') || `${import.meta.env.BASE_URL}api`.replace(/\/+$/, '');

export const apiClient = axios.create({
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

export async function getAuthMode(): Promise<AxiosResponse<{ allowAnonymous: boolean, anonymousRole: string }>> {
    try {
        const response = await apiClient.get('/auth/mode');
        return response;
    } catch (error) {
        throw error;
    }
}
