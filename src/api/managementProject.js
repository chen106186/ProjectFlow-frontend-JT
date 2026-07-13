import { download, request } from '@/utils/request'

const normalizePageParams = params => {
  if (!params) return params
  const pageSize = Number(params.pageSize)
  if (!Number.isFinite(pageSize) || pageSize <= 200) return params
  return { ...params, pageSize: 200 }
}

export const getProjectList = params => request('/api/projects', { params: normalizePageParams(params) })
export const getProjectDetail = id => request(`/api/projects/${id}`)
export const createProject = data => request('/api/projects', { method: 'POST', body: data })
export const updateProject = (id, data) => request(`/api/projects/${id}`, { method: 'PUT', body: data })
export const deleteProject = id => request(`/api/projects/${id}`, { method: 'DELETE' })

export const getGanttNodes = projectId => request(`/api/projects/${projectId}/gantt`)
export const getGanttSummary = projectId => request(`/api/projects/${projectId}/gantt/summary`)
export const updateGanttNode = (projectId, nodeId, data) => request(`/api/projects/${projectId}/nodes/${nodeId}`, { method: 'PATCH', body: data })

export const getProjectTasks = params => request('/api/tasks', { params })
export const getProjectBugs = params => request('/api/bugs', { params })

export const getProjectReports = params => request('/api/project-reports', { params })
export const getProjectReportDetail = id => request(`/api/project-reports/${id}`)
export const createProjectReport = data => request('/api/project-reports', { method: 'POST', body: data })
export const updateProjectReport = (id, data) => request(`/api/project-reports/${id}`, { method: 'PUT', body: data })
export const deleteProjectReport = id => request(`/api/project-reports/${id}`, { method: 'DELETE' })

export const getProjectFiles = params => request('/api/files', { params })
export const uploadProjectFile = data => request('/api/files', { method: 'POST', body: data })
export const deleteProjectFile = id => request(`/api/files/${id}`, { method: 'DELETE' })
export const deleteProjectFiles = ids => request('/api/files/batch', { method: 'DELETE', body: { ids } })
export const downloadProjectFile = id => download(`/api/files/${id}/download`)

export const getProjectStats = projectIds => request('/api/projects/stats', { params: { projectIds: projectIds.join(',') } })

export const getTaskById = id => request(`/api/tasks/${id}`)
export const createTask = data => request('/api/tasks', { method: 'POST', body: data })
export const updateTask = (id, data) => request(`/api/tasks/${id}`, { method: 'PUT', body: data })
export const deleteTask = id => request(`/api/tasks/${id}`, { method: 'DELETE' })

export const getBugById = id => request(`/api/bugs/${id}`)
export const createBug = data => request('/api/bugs', { method: 'POST', body: data })
export const updateBug = (id, data) => request(`/api/bugs/${id}`, { method: 'PUT', body: data })
export const deleteBug = id => request(`/api/bugs/${id}`, { method: 'DELETE' })
export const getMyBugs = () => request('/api/bugs/my')
export const closeBug = id => request(`/api/bugs/${id}/close`, { method: 'PATCH' })
export const fixBug = (id, data) => request(`/api/bugs/${id}/fix`, { method: 'POST', body: data })
export const assignBug = (id, data) => request(`/api/bugs/${id}/assign`, { method: 'PATCH', body: data })
export const addBugComment = (id, data) => request(`/api/bugs/${id}/comments`, { method: 'POST', body: data })
export const listBugComments = id => request(`/api/bugs/${id}/comments`)

export const getMyStatistics = period => request('/api/dashboard/my-statistics', { params: { period } })

export const getDicts = () => request('/api/dicts')
export const getSystemUsers = params => request('/api/system/users', { params })
