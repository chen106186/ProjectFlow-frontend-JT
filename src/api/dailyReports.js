import { API_ENDPOINTS } from './config'
import { request } from '@/utils/request'

export async function fetchDailyReports(params = {}) {
  return request(API_ENDPOINTS.dailyReports, { method: 'GET', params })
}

export async function createDailyReport(payload) {
  return request(API_ENDPOINTS.dailyReports, { method: 'POST', body: payload })
}
