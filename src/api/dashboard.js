import { request } from '@/utils/request'

export const getDashboardSummary = () => request('/api/dashboard/summary')
export const getDashboardTodos = () => request('/api/dashboard/todos')
export const getMyStatistics = (period = 'week', targetUserId = null) => {
  const params = { period }
  if (targetUserId != null) params.targetUserId = targetUserId
  return request('/api/dashboard/my-statistics', { params })
}
export const getTaskCalendarMonth = month => request('/api/task-calendar/month', { params: { month } })
export const getTaskCalendarDay = date => request('/api/task-calendar/day', { params: { date } })
