import axios from 'axios'
import { message } from 'ant-design-vue'

import { API_CONFIG } from '@/api/config'
import router from '@/router'

const TOKEN_KEY = 'token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export const setToken = token => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('userInfo')
  localStorage.removeItem('authProfile')
}

const getGatewayPathPrefix = () => {
  if (!API_CONFIG.baseURL) {
    return ''
  }

  if (!/^https?:\/\//.test(API_CONFIG.baseURL)) {
    return API_CONFIG.baseURL.replace(/\/+$/, '')
  }

  return new URL(API_CONFIG.baseURL).pathname.replace(/\/+$/, '')
}

const normalizeUrl = url => {
  if (/^https?:\/\//.test(url)) {
    return url
  }

  const prefix = getGatewayPathPrefix()

  if (prefix && prefix !== '/' && url.startsWith(`${prefix}/`)) {
    return url.slice(prefix.length)
  }

  return url
}

const getRequestPath = config => {
  const requestUrl = config?.url || ''

  if (!requestUrl) {
    return ''
  }

  if (/^https?:\/\//.test(requestUrl)) {
    return new URL(requestUrl).pathname
  }

  return requestUrl.startsWith('/') ? requestUrl : `/${requestUrl}`
}

const getResponseMessage = payload => payload?.message || payload?.msg || '请求失败'

const isLoginRequest = config => getRequestPath(config).endsWith('/auth/login')

const shouldHandleUnauthorizedAsExpired = config => Boolean(getToken()) && !isLoginRequest(config)

const getFileName = response => {
  const disposition = response.headers?.['content-disposition'] || ''
  const match = disposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i)

  if (!match) {
    return 'download'
  }

  return decodeURIComponent(match[1].replace(/"/g, '').trim())
}

const service = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
})

service.interceptors.request.use(config => {
  const token = getToken()

  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

service.interceptors.response.use(
  response => {
    if (response.config.responseType === 'blob') {
      return response
    }

    const payload = response.data

    if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'code')) {
      if (payload.code === 200 || payload.code === 0) {
        return payload.data
      }

      if (payload.code === 401 && shouldHandleUnauthorizedAsExpired(response.config)) {
        removeToken()
        router.replace('/login')
      }

      return Promise.reject(new Error(getResponseMessage(payload)))
    }

    return payload
  },
  error => {
    if (error.response?.status === 401 && shouldHandleUnauthorizedAsExpired(error.config)) {
      removeToken()
      message.error('登录已过期，请重新登录')
      router.replace('/login')
    }

    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.msg ||
      error.message ||
      '网络异常，请稍后重试'

    return Promise.reject(new Error(errorMessage))
  }
)

export const request = (url, options = {}) => {
  const { method = 'GET', params, body, data, ...restOptions } = options

  return service({
    url: normalizeUrl(url),
    method,
    params,
    data: body ?? data,
    ...restOptions,
  })
}

export const get = (url, params) => request(url, { params })

export const post = (url, data) => request(url, { method: 'POST', body: data })

export const download = async (url, options = {}) => {
  const response = await request(url, {
    method: 'GET',
    responseType: 'blob',
    ...options,
  })

  return {
    blob: response.data,
    fileName: getFileName(response),
  }
}

export const downloadPost = async (url, data, filename = 'export.xlsx') => {
  const result = await download(url, {
    method: 'POST',
    body: data,
  })

  triggerDownload(result.blob, result.fileName || filename)
}

export const downloadGet = async (url, filename = 'export') => {
  const result = await download(url)

  triggerDownload(result.blob, result.fileName || filename)
}

function triggerDownload(blob, filename) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
}

export default service
