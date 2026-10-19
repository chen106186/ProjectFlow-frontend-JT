export const deliveryProjectIds = (projects, projectId) => {
  const selected = projects.find(project => String(project.id) === String(projectId))
  if (!selected) return projectId ? [Number(projectId)] : []
  const ids = new Set([Number(selected.id)])
  if (selected.managementProjectId) ids.add(Number(selected.managementProjectId))
  for (const project of projects) {
    if (String(project.managementProjectId) === String(selected.id)) ids.add(Number(project.id))
  }
  return [...ids]
}
