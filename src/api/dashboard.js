import { request } from '@/utils/request'

export const getDashboardSummary = () => request('/api/dashboard/summary')
export const getDashboardTodos = () => request('/api/dashboard/todos')
export const getMyStatistics = (period = 'week') => request('/api/dashboard/my-statistics', { params: { period } })
export const getTaskCalendarMonth = month => request('/api/task-calendar/month', { params: { month } })
export const getTaskCalendarDay = date => request('/api/task-calendar/day', { params: { date } })
