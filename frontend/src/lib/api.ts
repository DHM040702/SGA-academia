import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api'

// ── Token en memoria (NO localStorage — evita robo por XSS) ──────────────────
let _accessToken: string | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}
export function getAccessToken() {
  return _accessToken
}

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,   // envía la cookie HttpOnly refresh_token
})

/* ── Adjuntar Bearer token desde memoria ─────────────────────────────────── */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (_accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${_accessToken}`
  }
  return config
})

/* ── 401 → refresh → reintentar una vez ─────────────────────────────────── */
let isRefreshing = false
let queue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    const url = original.url ?? ''
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/me')

    if (error.response?.status !== 401 || original._retry || isAuthEndpoint) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve) =>
        queue.push((token) => {
          original.headers!.Authorization = `Bearer ${token}`
          resolve(api(original))
        }),
      )
    }

    original._retry = true
    isRefreshing = true

    try {
      const { data } = await api.post<{ access_token: string }>('/auth/refresh')
      const newToken = data.access_token
      setAccessToken(newToken)
      queue.forEach((cb) => cb(newToken))
      queue = []
      original.headers!.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch {
      queue = []
      setAccessToken(null)
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
