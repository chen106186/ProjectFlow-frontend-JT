import { API_ENDPOINTS } from './config'
import { request } from '@/utils/request'

export async function fetchDailyReports(params = {}) {
  return request(API_ENDPOINTS.dailyReports, { method: 'GET', params })
}

export async function listMyDailyReports() {
  return request(`${API_ENDPOINTS.dailyReports}/my`, { method: 'GET' })
}

export async function createDailyReport(payload) {
  return request(API_ENDPOINTS.dailyReports, { method: 'POST', body: payload })
}

export async function updateDailyReport(id, payload) {
  return request(`${API_ENDPOINTS.dailyReports}/${id}`, { method: 'PUT', body: payload })
}

export async function listDailyReportFiles(reportId) {
  return request('/api/files', { method: 'GET', params: { businessType: 'daily-report', businessId: reportId } })
}

export async function uploadDailyReportFile(reportId, file) {
  const data = new FormData()
  data.append('businessType', 'daily-report')
  data.append('businessId', reportId)
  data.append('file', file)
  return request('/api/files', { method: 'POST', body: data })
}
