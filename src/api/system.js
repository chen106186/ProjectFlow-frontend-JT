import { request } from '@/utils/request'

// 当前用户
export const getCurrentUser = () => request('/api/system/me')
export const getCurrentUserPermissions = () => request('/api/system/me/permissions')

// 用户管理
export const getUserList = params => request('/api/system/users', { params })
export const getUserDetail = id => request(`/api/system/users/${id}`)
export const createUser = data => request('/api/system/users', { method: 'POST', body: data })
export const updateUser = (id, data) => request(`/api/system/users/${id}`, { method: 'PUT', body: data })
export const updateUserEnabled = (id, enabled) => request(`/api/system/users/${id}/enabled`, { method: 'PATCH', body: { enabled } })
export const resetUserPassword = (id, password) => request(`/api/system/users/${id}/password`, { method: 'PATCH', body: { password } })
export const assignUserRoles = (id, roleIds) => request(`/api/system/users/${id}/roles`, { method: 'PUT', body: { roleIds } })

// 部门管理
export const getDepartments = () => request('/api/system/departments')

// 角色管理
export const getRoleList = () => request('/api/system/roles')
export const getRoleDetail = id => request(`/api/system/roles/${id}`)
export const createRole = data => request('/api/system/roles', { method: 'POST', body: data })
export const updateRole = (id, data) => request(`/api/system/roles/${id}`, { method: 'PUT', body: data })
export const deleteRole = id => request(`/api/system/roles/${id}`, { method: 'DELETE' })
export const getRoleMenuIds = id => request(`/api/system/roles/${id}/menus`)
export const assignRoleMenus = (id, menuIds) => request(`/api/system/roles/${id}/menus`, { method: 'PUT', body: { menuIds } })

// 菜单管理
export const getMenuList = () => request('/api/system/menus')
