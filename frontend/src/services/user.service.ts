import { apiClient } from './api';
import { API_ENDPOINTS, STORAGE_KEYS } from '@/config/constants';
import { User, ApiResponse } from '@/types';
import { storage } from '@/utils/storage';

export interface UserUpdateRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  language?: string;
  timezone?: string;
  profileImageUrl?: string;
}

export const userService = {
  /**
   * Get current user from backend
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>(API_ENDPOINTS.USERS.CURRENT_USER);

    // Update local storage with fresh user data
    storage.set(STORAGE_KEYS.USER, response.data);
    localStorage.setItem('user', JSON.stringify(response.data));

    return response.data;
  },

  /**
   * Update user profile
   */
  updateUser: async (userId: string, data: UserUpdateRequest): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>(
      API_ENDPOINTS.USERS.USER_BY_ID(userId),
      data
    );

    // Update local storage with updated user data
    const updatedUser = response.data.data;
    storage.set(STORAGE_KEYS.USER, updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));

    return updatedUser;
  },

  /**
   * Get user by ID
   */
  getUserById: async (userId: string): Promise<User> => {
    const response = await apiClient.get<User>(
      API_ENDPOINTS.USERS.USER_BY_ID(userId)
    );
    return response.data;
  },
};
