export const canViewAllStatistics = profile => {
  if (!profile) return false
  if (profile.isGmOffice) return true

  const permissions = profile.permissions || []
  if (permissions.includes('system:user:update') || permissions.includes('system:role:update')) {
    return true
  }

  return (profile.roles || []).some(role => {
    const code = String(role?.code || '').toUpperCase()
    const name = String(role?.name || '')
    return code === 'ADMIN' || code === 'SUPER_ADMIN' || name === '超级管理员' || name === '管理员'
  })
}
