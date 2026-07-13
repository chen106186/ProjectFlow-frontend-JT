import { request } from '@/utils/request'

export const listMyRequirements = () => request('/api/requirements/my')
export const listRequirements = params => request('/api/requirements', { params })
export const getRequirementById = id => request(`/api/requirements/${id}`)
export const createRequirement = data => request('/api/requirements', { method: 'POST', body: data })
export const updateRequirement = (id, data) => request(`/api/requirements/${id}`, { method: 'PUT', body: data })
export const updateRequirementStatus = (id, status) => request(`/api/requirements/${id}/status`, { method: 'PATCH', body: { status } })
export const getRequirementLogs = id => request(`/api/requirements/${id}/logs`)

