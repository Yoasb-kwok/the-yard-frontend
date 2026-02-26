/**
 * API Client for Studio Management System
 * Handles all HTTP requests to the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '/api' : 'http://localhost:3002/api');

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  msg?: string;
  token?: string;
  user?: any;
  profile?: any;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * Make an API request
 */
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${path}`;
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Check if response has content
    const contentType = response.headers.get('content-type');
    let data: ApiResponse<T>;
    
    // Handle empty responses (e.g., 204 No Content)
    if (response.status === 204) {
      return { success: true } as ApiResponse<T>;
    }
    
    // Read response text once
    const responseText = await response.text();
    
    if (contentType && contentType.includes('application/json')) {
      try {
        if (responseText.trim() === '') {
          // Empty JSON response
          return { success: true } as ApiResponse<T>;
        }
        data = JSON.parse(responseText);
      } catch (jsonError) {
        throw new Error(`Invalid JSON response from server (${response.status}): ${responseText.substring(0, 100)}`);
      }
    } else {
      // Non-JSON response (e.g., HTML error page)
      throw new ApiError(response.status, responseText || `Server error (${response.status})`);
    }

    if (!response.ok) {
      throw new ApiError(response.status, data.msg || 'Request failed');
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Handle network errors, CORS errors, etc.
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Cannot connect to API server. Please ensure the backend is running.');
    }
    throw new Error('Network error: ' + (error as Error).message);
  }
}

/**
 * API Client methods
 */
export const api = {
  /**
   * GET request
   */
  get: <T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> => {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return request<T>(endpoint + queryString, { method: 'GET' });
  },

  /**
   * POST request
   */
  post: <T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> => {
    return request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * PATCH request
   */
  patch: <T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> => {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  /**
   * DELETE request
   */
  delete: <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};

export { ApiError };
export type { ApiResponse };
