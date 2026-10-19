export const isAdminProfile = profile => {
  if (!profile) return false

  return (profile.roles || []).some(role => {
    const code = String(role?.code || '').toUpperCase()
    return code === 'ADMIN' || code === 'SUPER_ADMIN'
  })
}

export const getStoredProfile = () => {
  try {
    const profile = JSON.parse(localStorage.getItem('authProfile') || '{}')
    const user = JSON.parse(localStorage.getItem('userInfo') || '{}')
    return { ...profile, id: profile.id ?? user.userId ?? user.id }
  } catch {
    return {}
  }
}

export const canEditRequirement = (requirement, profile = getStoredProfile()) =>
  Boolean(requirement && profile.id != null && (isAdminProfile(profile) || String(requirement.createdBy) === String(profile.id)))

export const canReviewRequirement = (requirement, profile = getStoredProfile()) =>
  Boolean(requirement && profile.id != null && (isAdminProfile(profile)
    || (requirement.reviewerId != null && String(requirement.reviewerId) === String(profile.id))
    || (requirement.reviewerId == null && String(requirement.createdBy) === String(profile.id))))

export const canViewAllStatistics = profile => {
  if (!profile) return false
  if (profile.isGmOffice) return true

  const permissions = profile.permissions || []
  if (permissions.includes('data:view:all')) {
    return true
  }
  return isAdminProfile(profile)
}
