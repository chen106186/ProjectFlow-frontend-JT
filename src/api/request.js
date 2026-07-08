import { API_CONFIG } from './config'

const buildURL = (url, params) => {
  const isAbsolute = /^https?:\/\//i.test(url)
  const fullURL = isAbsolute ? url : `${API_CONFIG.baseURL}${url.startsWith('/') ? url : `/${url}`}`

  if (!params || !Object.keys(params).length) {
    return fullURL
  }

  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value)
    }
  })

  const queryString = query.toString()
  return queryString ? `${fullURL}${fullURL.includes('?') ? '&' : '?'}${queryString}` : fullURL
}

const getToken = () => localStorage.getItem('token')

export async function request(url, options = {}) {
  const { params, headers, timeout = API_CONFIG.timeout, ...fetchOptions } = options
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout)
  const token = getToken()

  try {
    const response = await fetch(buildURL(url, params), {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        ...(fetchOptions.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    })

    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json') ? await response.json() : await response.text()

    if (!response.ok) {
      const message = data?.message || data?.msg || `请求失败：${response.status}`
      throw new Error(message)
    }

    return data
  } finally {
    window.clearTimeout(timer)
  }
}

export const api = {
  get: (url, options) => request(url, { ...options, method: 'GET' }),
  post: (url, data, options) => request(url, { ...options, method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data) }),
  put: (url, data, options) => request(url, { ...options, method: 'PUT', body: data instanceof FormData ? data : JSON.stringify(data) }),
  delete: (url, options) => request(url, { ...options, method: 'DELETE' }),
}
