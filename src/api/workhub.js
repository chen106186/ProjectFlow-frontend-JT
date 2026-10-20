import { request } from '@/utils/request'

const root = '/api/workhub'

export const getRequirementDelivery = id => request(`${root}/requirements/${id}/delivery`)
export const setRequirementTasks = (id, taskIds) => request(`${root}/requirements/${id}/tasks`, { method: 'PUT', body: { taskIds } })
export const acceptRequirement = (id, data) => request(`${root}/requirements/${id}/acceptance`, { method: 'PUT', body: data })
export const getProjectOverview = id => request(`${root}/projects/${id}/overview`)
export const listReleases = id => request(`${root}/projects/${id}/releases`)
export const createRelease = data => request(`${root}/releases`, { method: 'POST', body: data })
export const updateRelease = (id, data) => request(`${root}/releases/${id}`, { method: 'PUT', body: data })
export const getTaskBlocker = id => request(`${root}/tasks/${id}/blocker`)
export const getTaskRequirements = id => request(`${root}/tasks/${id}/requirements`)
export const setTaskBlocker = (id, reason) => request(`${root}/tasks/${id}/blocker`, { method: 'PUT', body: { reason } })
export const listWorkComments = (type, id) => request(`${root}/${type}/${id}/comments`)
export const getMentionCandidates = (type, id) => request(`${root}/${type}/${id}/mention-candidates`)
export const addWorkComment = (type, id, data) => request(`${root}/${type}/${id}/comments`, { method: 'POST', body: data })
export const searchWork = q => request(`${root}/search`, { params: { q } })
export const listSavedViews = scope => request(`${root}/saved-views`, { params: { scope } })
export const saveWorkView = data => request(`${root}/saved-views`, { method: 'POST', body: data })
export const deleteWorkView = id => request(`${root}/saved-views/${id}`, { method: 'DELETE' })

const workflow = id => `${root}/releases/${id}/workflow`
export const getIterationWorkflow = id => request(workflow(id))
export const updateIterationStage = (id, code, data) => request(`${workflow(id)}/stages/${code}`, { method: 'PUT', body: data })
export const addIterationRecord = (id, data) => request(`${workflow(id)}/records`, { method: 'POST', body: data })
export const saveReleaseApplication = (id, data) => request(`${workflow(id)}/application`, { method: 'PUT', body: data })
export const submitReleaseApplication = id => request(`${workflow(id)}/application/submit`, { method: 'POST' })
export const decideReleaseApplication = (id, data) => request(`${workflow(id)}/application/decision`, { method: 'POST', body: data })
export const withdrawReleaseApplication = (id, data) => request(`${workflow(id)}/application/withdraw`, { method: 'POST', body: data })
