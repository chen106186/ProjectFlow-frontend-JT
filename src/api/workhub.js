import { request } from '@/utils/request'

const root = '/api/workhub'

export const getRequirementDelivery = id => request(`${root}/requirements/${id}/delivery`)
export const setRequirementTasks = (id, taskIds) => request(`${root}/requirements/${id}/tasks`, { method: 'PUT', body: { taskIds } })
export const acceptRequirement = (id, data) => request(`${root}/requirements/${id}/acceptance`, { method: 'PUT', body: data })
export const getProjectOverview = (id, params = {}) => request(`${root}/projects/${id}/overview`, { params })
export const listReleases = id => request(`${root}/projects/${id}/releases`)
export const createRelease = data => request(`${root}/releases`, { method: 'POST', body: data })
export const updateRelease = (id, data) => request(`${root}/releases/${id}`, { method: 'PUT', body: data })
export const getTaskBlocker = id => request(`${root}/tasks/${id}/blocker`)
export const getTaskRequirements = id => request(`${root}/tasks/${id}/requirements`)
export const setTaskBlocker = (id, reason) => request(`${root}/tasks/${id}/blocker`, { method: 'PUT', body: { reason } })
export const getReleaseExecution = taskId => request(`${root}/tasks/${taskId}/release-execution`)
export const updateReleasePlan = (taskId, data) => request(`${root}/tasks/${taskId}/release-execution/plan`, { method: 'PUT', body: data })
export const addReleaseMeeting = (taskId, data) => request(`${root}/tasks/${taskId}/release-execution/meetings`, { method: 'POST', body: data })
export const confirmReleaseMeeting = (taskId, meetingId) => request(`${root}/tasks/${taskId}/release-execution/meetings/${meetingId}/confirm`, { method: 'POST' })
export const submitReleaseReport = (taskId, data) => request(`${root}/tasks/${taskId}/release-execution/report`, { method: 'POST', body: data })
export const verifyReleaseReport = (taskId, decision, note) => request(`${root}/tasks/${taskId}/release-execution/report/verify`, { method: 'POST', body: { decision, note } })
export const listWorkComments = (type, id) => request(`${root}/${type}/${id}/comments`)
export const getMentionCandidates = (type, id) => request(`${root}/${type}/${id}/mention-candidates`)
export const addWorkComment = (type, id, data) => request(`${root}/${type}/${id}/comments`, { method: 'POST', body: data })
export const searchWork = q => request(`${root}/search`, { params: { q } })

const workflow = id => `${root}/releases/${id}/workflow`
export const getIterationWorkflow = id => request(workflow(id))
export const updateIterationStage = (id, code, data) => request(`${workflow(id)}/stages/${code}`, { method: 'PUT', body: data })
export const addIterationRecord = (id, data) => request(`${workflow(id)}/records`, { method: 'POST', body: data })
export const uploadIterationEvidence = (id, code, file) => {
  const body = new FormData()
  body.append('file', file)
  return request(`${workflow(id)}/stages/${code}/files`, { method: 'POST', body, timeout: 300000 })
}
export const saveReleaseApplication = (id, data) => request(`${workflow(id)}/application`, { method: 'PUT', body: data })
export const submitReleaseApplication = id => request(`${workflow(id)}/application/submit`, { method: 'POST' })
export const decideReleaseApplication = (id, data) => request(`${workflow(id)}/application/decision`, { method: 'POST', body: data })
export const withdrawReleaseApplication = (id, data) => request(`${workflow(id)}/application/withdraw`, { method: 'POST', body: data })
