import { API_ENDPOINTS } from './config'
import { api } from './request'

const unwrapResponse = response => {
  if (response && typeof response === 'object' && 'code' in response) {
    if (response.code !== 0) {
      throw new Error(response.message || '登录失败')
    }

    return response.data
  }

  return response
}

export async function login(payload) {
  const data = await api.post(API_ENDPOINTS.auth.login, payload)
  return unwrapResponse(data)
}
