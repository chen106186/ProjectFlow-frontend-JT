import axios from 'axios'
import { API_CONFIG } from '@/api/config'

const getToken = () => localStorage.getItem('token')

const getGatewayPathPrefix = () => {
  if (!API_CONFIG.baseURL) {
    return ''
  }

  if (!/^https?:\/\//i.test(API_CONFIG.baseURL)) {
    return API_CONFIG.baseURL
  }

  return new URL(API_CONFIG.baseURL).pathname.replace(/\/+$/, '')
}

const normalizeUrl = url => {
  if (/^https?:\/\//i.test(url)) {
    return url
  }

  const prefix = getGatewayPathPrefix()
  if (prefix && url.startsWith(`${prefix}/`)) {
    return url.slice(prefix.length)
  }

  return url
}

const service = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
})

service.interceptors.request.use(config => {
  const token = getToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

service.interceptors.response.use(
  response => {
    if (response.config.responseType === 'blob') {
      return response
    }

    const result = response.data

    if (result?.code !== 0) {
      return Promise.reject(new Error(result?.message || result?.msg || '请求失败'))
    }

    return result.data
  },
  error => Promise.reject(new Error(error.response?.data?.message || error.response?.data?.msg || error.message || '请求失败')),
)

export const request = (url, options = {}) => {
  const { body, data, headers, ...config } = options

  return service({
    url: normalizeUrl(url),
    ...config,
    headers,
    data: body ?? data,
  })
}

export const download = async url => {
  const response = await service({
    url: normalizeUrl(url),
    method: 'GET',
    responseType: 'blob',
  })
  const disposition = response.headers?.['content-disposition'] || ''
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1]

  return {
    blob: response.data,
    fileName: encodedName ? decodeURIComponent(encodedName) : 'download',
  }
}
