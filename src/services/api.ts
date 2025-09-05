import { toast } from "@/hooks/use-toast";
import { warn, error, debug } from "@/utils/logging";
import { getUserLoggingLevel } from "@/utils/userPreferences";

interface ApiCallOptions extends RequestInit {
  body?: any;
  params?: Record<string, any>;
  suppress404Toast?: boolean; // New option to suppress toast for 404 errors
  externalApi?: boolean;
}

export const API_BASE_URL = "/api";
//export const API_BASE_URL = 'http://192.168.1.111:3010';

export async function apiCall(endpoint: string, options?: ApiCallOptions): Promise<any> {
  const userLoggingLevel = getUserLoggingLevel();
  let url = options?.externalApi ? endpoint : `${API_BASE_URL}${endpoint}`;

  if (options?.params) {
    const queryParams = new URLSearchParams(options.params).toString();
    url = `${url}?${queryParams}`;
  }
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  // Only add Authorization header for internal API calls
  if (!options?.externalApi) {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      warn(userLoggingLevel, "No authentication token found in localStorage for internal API call.");
    }
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Send cookies with all API requests
  };

  if (options?.body && typeof options.body === 'object') {
    debug(userLoggingLevel, `API Call: Request body for ${endpoint}:`, options.body);
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorData: any;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: "Failed to parse JSON error response." };
        }
      } else {
        errorData = { message: await response.text() };
      }
      const errorMessage = errorData.error || errorData.message || `API call failed with status ${response.status}`;

      // Suppress toast for 404 errors if suppress404Toast is true
      if (response.status === 404 && options?.suppress404Toast) {
        debug(userLoggingLevel, `API call returned 404 for ${endpoint}, toast suppressed. Returning null.`);
        return null; // Return null for 404 with suppression
      } else {
        toast({
          title: "API Error",
          description: errorMessage,
          variant: "destructive",
        });
        if (errorMessage.includes('Authentication: Invalid or expired token.')) {
          localStorage.removeItem('token');
          window.location.reload();
        }
        throw new Error(errorMessage);
      }
    }

    // Handle cases where the response might be empty (e.g., DELETE requests)
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (err: any) {
    error(userLoggingLevel, "API call network error:", err);
    toast({
      title: "Network Error",
      description: err.message || "Could not connect to the server.",
      variant: "destructive",
    });
    throw new Error(err.message);
  }
}

export const api = {
  get: (endpoint: string, options?: ApiCallOptions) => apiCall(endpoint, { ...options, method: 'GET' }),
  post: (endpoint: string, options?: ApiCallOptions) => apiCall(endpoint, { ...options, method: 'POST' }),
  put: (endpoint: string, options?: ApiCallOptions) => apiCall(endpoint, { ...options, method: 'PUT' }),
  delete: (endpoint: string, options?: ApiCallOptions) => apiCall(endpoint, { ...options, method: 'DELETE' }),
};