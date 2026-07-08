const trimTrailingSlash = value => value.replace(/\/+$/, '')

export const API_CONFIG = {
  baseURL: trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '/api'),
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 15000),
}

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    profile: '/auth/profile',
  },
  projects: '/projects',
  tasks: '/tasks',
  bugs: '/bugs',
  dailyReports: '/daily-reports',
}
