import { API_ENDPOINTS } from './config'
import { api } from './request'

const unwrapResponse = response => {
  if (response && typeof response === 'object' && 'code' in response) {
    if (response.code !== 0) {
      throw new Error(response.message || '日报接口请求失败')
    }

    return response.data
  }

  return response
}

export async function fetchDailyReports(params = {}) {
  const data = await api.get(API_ENDPOINTS.dailyReports, { params })
  return unwrapResponse(data)
}

export async function createDailyReport(payload) {
  const data = await api.post(API_ENDPOINTS.dailyReports, payload)
  return unwrapResponse(data)
}
