import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const API_URL = 'https://railsmts.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error attaching access token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const res = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        if (res.data.accessToken) {
          await AsyncStorage.setItem('accessToken', res.data.accessToken);
          if (res.data.refreshToken) {
            await AsyncStorage.setItem('refreshToken', res.data.refreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status >= 500) {
      Toast.show({
        type: 'error',
        text1: 'Server Connection Error',
        text2: `Encountered an issue reaching the server (${error.response.status}). Please try pulling to refresh.`,
      });
    }

    return Promise.reject(error);
  }
);

export default api;
