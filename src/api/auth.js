import { API_ENDPOINTS } from './config'
import { request } from '@/utils/request'

export async function login(payload) {
  return request(API_ENDPOINTS.auth.login, { method: 'POST', body: payload })
}

export async function changePassword(payload) {
  return request(API_ENDPOINTS.auth.changePassword, { method: 'PATCH', body: payload })
}
