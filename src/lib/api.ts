import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env["VITE_API_BASE_URL"] ?? "http://127.0.0.1:8000/api";
const ACCESS_TOKEN_KEY = "casfeta.accessToken";
const REFRESH_TOKEN_KEY = "casfeta.refreshToken";

export const api = axios.create({
  baseURL: API_BASE_URL.replace(/\/$/, ""),
  headers: { "Content-Type": "application/json" },
});

type ApiListResponse<T> = { count?: number; results: T[] };

export async function getApiList<T>(url: string, params?: Record<string, string | number | boolean>) {
  const { data } = await api.get<T[] | ApiListResponse<T>>(url, { params });
  return Array.isArray(data) ? data : data.results;
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetriableRequest | undefined;
    const requestUrl = request?.url ?? "";
    if (
      error.response?.status !== 401 ||
      !request ||
      request._retry ||
      ["/auth/login/", "/auth/refresh/", "/auth/logout/"].some((path) => requestUrl.includes(path))
    ) {
      return Promise.reject(error);
    }

    if (typeof window === "undefined") return Promise.reject(error);
    const currentAccessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    const sentAuthorization = request.headers.Authorization;
    if (currentAccessToken && sentAuthorization !== `Bearer ${currentAccessToken}`) {
      request._retry = true;
      request.headers.Authorization = `Bearer ${currentAccessToken}`;
      return api.request(request);
    }

    const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      clearTokens();
      return Promise.reject(error);
    }

    request._retry = true;
    refreshPromise ??= api
      .post<AuthTokens>("/auth/refresh/", { refresh: refreshToken })
      .then(({ data }) => {
        window.localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
        window.localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
        return data.access;
      })
      .catch(() => {
        clearTokens();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });

    const accessToken = await refreshPromise;
    if (!accessToken) return Promise.reject(error);
    request.headers.Authorization = `Bearer ${accessToken}`;
    return api.request(request);
  },
);

type AuthTokens = { access: string; refresh: string };
type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role_codes: string[];
};

type AuthResponse = AuthTokens & {
  user: {
    id: number;
    username: string;
    email: string;
    full_name: string;
    role_codes: string[];
  };
};

type LoginCredentials = { username: string; password: string };
type SignupDetails = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  confirm_password: string;
  phone: string;
  preferred_language: "en";
  gender: "MALE" | "FEMALE";
  date_of_birth: string | null;
  branch: number;
  course_programme: string;
  study_year: number | null;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

function saveTokens({ access, refresh }: AuthResponse) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function hasAccessToken() {
  return typeof window !== "undefined" && Boolean(window.localStorage.getItem(ACCESS_TOKEN_KEY));
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function login(credentials: LoginCredentials) {
  const { data } = await api.post<AuthResponse>("/auth/login/", credentials);
  saveTokens(data);
  return data.user;
}

export async function register(details: SignupDetails) {
  const { data } = await api.post<AuthResponse>("/auth/register/", details);
  saveTokens(data);
  return data.user;
}

export async function getCurrentUser() {
  const { data } = await api.get<AuthUser>("/auth/me/");
  return data;
}

export async function logout() {
  const refresh = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  try {
    if (refresh) await api.post("/auth/logout/", { refresh });
  } finally {
    clearTokens();
  }
}

export function getApiErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return "An unexpected error occurred. Please try again.";

  const data = error.response?.data as
    { detail?: string; message?: string; [field: string]: unknown } | undefined;
  if (data?.detail) return data.detail;
  if (data?.message) return data.message;

  const messages = Object.entries(data ?? {}).flatMap(([field, value]) => {
    if (field === "code" || field === "errors") return [];
    const items = Array.isArray(value) ? value : [value];
    return items.filter((item): item is string => typeof item === "string");
  });
  if (messages.length) return messages.join(" ");

  if (!error.response)
    return "Could not connect to the server. Make sure the Django backend is running.";
  return "The request failed. Check your details and try again.";
}
