import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api'

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,   // sends the refresh_token HttpOnly cookie
})

/* ── Attach Bearer token from localStorage ───────────────────────────── */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

/* ── 401 → refresh → retry once ─────────────────────────────────────── */
let isRefreshing = false
let queue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // No intentar refresh si el error viene de endpoints de autenticación
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
      localStorage.setItem('access_token', newToken)
      queue.forEach((cb) => cb(newToken))
      queue = []
      original.headers!.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch {
      queue = []
      localStorage.removeItem('access_token')
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
