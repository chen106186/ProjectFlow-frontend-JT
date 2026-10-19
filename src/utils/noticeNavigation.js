export const noticeReadEvent = 'projectflow:notice-read'

export const notifyNoticeRead = () => window.dispatchEvent(new Event(noticeReadEvent))

export const getNoticeRoute = notice => {
  if (!notice?.businessId) return null
  const names = {
    Task: 'PersonalTaskDetail',
    Bug: 'BugDetail',
    Requirement: 'PersonalRequirementDetail',
    ManagementProject: 'ManagementProjectDetail',
    ExecutionProject: 'ExecutionProjectDetail',
  }
  const name = names[notice.businessType]
  return name ? { name, params: { id: String(notice.businessId) } } : null
}
