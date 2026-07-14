import { request } from '@/utils/request'

export const getNotices = (params) => request('/api/notices', { params })
export const getUnreadCount = () => request('/api/notices/unread-count')
export const markNoticeRead = (id) => request(`/api/notices/${id}/read`, { method: 'PATCH' })
export const markAllNoticesRead = () => request('/api/notices/read-all', { method: 'PATCH' })
