const compact = values => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== '' && value !== '全部'))
const dateValue = value => value?.format ? value.format('YYYY-MM-DD') : value

export const buildTaskFilters = (filters, context = {}) => compact({
  keyword: filters.keyword,
  projectId: context.projectId ?? filters.projectId,
  assigneeId: context.routeName === 'PersonalTasks' ? context.userId : filters.assigneeId,
  roleName: context.routeName === 'DevelopmentTasks' ? '开发' : context.routeName === 'TestingTasks' ? '测试' : filters.roleName,
  priority: filters.priority,
  status: filters.status,
  plannedEndDate: dateValue(filters.plannedEndDate),
})

export const buildBugFilters = (filters, context = {}) => compact({
  keyword: filters.keyword,
  projectId: context.projectId ?? filters.projectId,
  taskId: filters.taskId,
  priority: filters.priority,
  status: filters.status,
  creatorId: filters.creatorId,
  assigneeId: filters.assigneeId,
  createdFrom: dateValue(filters.createdAtRange?.[0] ?? filters.createdFrom),
  createdTo: dateValue(filters.createdAtRange?.[1] ?? filters.createdTo),
  mineOnly: context.mineOnly || undefined,
})

export const buildRequirementFilters = (filters, context = {}) => compact({
  keyword: filters.keyword,
  projectId: filters.projectId,
  requirementType: filters.requirementType,
  priority: filters.priority,
  status: filters.status,
  mineOnly: context.mineOnly || undefined,
})

export const buildOperationLogFilters = filters => compact({
  keyword: filters.keyword,
  module: filters.module,
  businessType: filters.businessType,
  businessId: filters.businessId,
  operationType: filters.operationType,
  operatorId: filters.operatorId,
  operatorName: filters.operatorName,
  startDate: dateValue(filters.range?.[0] ?? filters.startDate),
  endDate: dateValue(filters.range?.[1] ?? filters.endDate),
})
