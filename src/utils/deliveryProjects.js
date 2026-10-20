export const deliveryProjectIds = (projects, projectId) => {
  const selected = projects.find(project => String(project.id) === String(projectId))
  if (!selected) return projectId ? [String(projectId)] : []
  const ids = new Set([String(selected.id)])
  if (selected.managementProjectId) ids.add(String(selected.managementProjectId))
  for (const project of projects) {
    if (String(project.managementProjectId) === String(selected.id)) ids.add(String(project.id))
  }
  return [...ids]
}
