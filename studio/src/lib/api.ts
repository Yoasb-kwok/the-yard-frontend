/**
 * API Client for Studio Management System
 * Handles all HTTP requests to the backend API.
 */


const DEFAULT_PROD_API_URL = 'https://theyardapis.01tech.work/api';
const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '/api' : DEFAULT_PROD_API_URL);

/** Build full request path. Backend expects /api/student/..., /api/admin/..., so ensure /api prefix when base might not include it. */
function buildRequestUrl(endpoint: string): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const pathWithApi = path.startsWith('/api') ? path : `/api${path}`;
  const base = (API_BASE_URL || '').replace(/\/api\/?$/, '') || (import.meta.env.DEV ? '' : 'http://localhost:3002');
  return base ? `${base}${pathWithApi}` : pathWithApi;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  msg?: string;
  /** Some error handlers use `message` instead of `msg`; both are read on HTTP errors. */
  message?: string;
  /** Optional backend error code, e.g. TRIAL_LOGIN_REQUIRED */
  code?: string;
  token?: string;
  user?: any;
  profile?: any;
}

class ApiError extends Error {
  /** Extra fields from error JSON (e.g. current_status). */
  data?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    code?: string,
    data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }

  status: number;
  code?: string;
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
  const url = buildRequestUrl(endpoint);
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
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
      const errText =
        (typeof data.msg === 'string' && data.msg.trim()) ||
        (typeof data.message === 'string' && data.message.trim()) ||
        `Request failed (${response.status})`;
      const errCode =
        typeof data.code === 'string'
          ? data.code
          : (data.data && typeof (data.data as { code?: unknown }).code === 'string')
            ? ((data.data as { code: string }).code)
            : undefined;
      const errPayload: Record<string, unknown> = {};
      if (typeof data.current_status === 'string') {
        errPayload.current_status = data.current_status;
      }
      if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        Object.assign(errPayload, data.data as Record<string, unknown>);
      }
      throw new ApiError(
        response.status,
        errText,
        errCode,
        Object.keys(errPayload).length > 0 ? errPayload : undefined,
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const msg = error instanceof Error ? error.message : String(error);
    // fetch() throws TypeError for "Failed to fetch" (connection refused, DNS, CORS, mixed content, etc.)
    const looksLikeFetchNetworkFailure =
      error instanceof TypeError &&
      (/fetch/i.test(msg) || /network/i.test(msg) || /load failed/i.test(msg));
    if (looksLikeFetchNetworkFailure) {
      const baseHint = import.meta.env.DEV
        ? 'Dev: ensure studio_backend is running on port 3002, or set VITE_API_URL to your API (must include /api). Vite proxies /api → localhost:3002 when VITE_API_URL is unset.'
        : 'Set VITE_API_URL to your deployed API origin (with /api). Ensure CORS allows this site and the server is reachable.';
      throw new Error(
        `Network error (${msg}): could not reach ${url}. ${baseHint}`
      );
    }
    throw new Error('Network error: ' + msg);
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
