import axios from 'axios';

export const apiurl= process.env.EXPO_PUBLIC_API_URL

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});