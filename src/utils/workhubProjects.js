export const workhubProjectOptions = projects => {
  const byId = new Map(projects.map(project => [String(project.id), project]))
  return projects
    .filter(project => !project.managementProjectId || !byId.has(String(project.managementProjectId)))
    .map(project => {
      const childCount = projects.filter(child => String(child.managementProjectId) === String(project.id)).length
      return {
        value: String(project.id),
        label: project.name || `未命名项目（${project.id}）`,
        description: childCount ? `管理项目 · 含 ${childCount} 个执行项目` : project.projectType === 'EXECUTION' ? '执行项目' : '管理项目',
      }
    })
}

export const workhubRootProjectId = (projects, id) => {
  const selected = projects.find(project => String(project.id) === String(id))
  const parent = selected?.managementProjectId
  return String(parent && projects.some(project => String(project.id) === String(parent)) ? parent : id || '')
}
