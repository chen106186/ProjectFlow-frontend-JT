import { API_ENDPOINTS } from './config'
import { request } from '@/utils/request'

export async function login(payload) {
  return request(API_ENDPOINTS.auth.login, { method: 'POST', body: payload })
}
