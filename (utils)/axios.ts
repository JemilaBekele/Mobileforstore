import axios from 'axios';

export const apiurl= process.env.RACTNATIVE_PUBLIC_BACKEND_URL;

export const api = axios.create({
    baseURL: process.env.RACTNATIVE_PUBLIC_BACKEND_URL,
});