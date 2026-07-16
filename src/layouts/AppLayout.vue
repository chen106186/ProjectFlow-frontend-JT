<template>
  <a-layout class="app-layout">
    <a-layout-header class="app-header">
      <router-link class="app-brand" to="/">
        <img class="app-brand__mark" src="/favicon.png" alt="" />
        <span>项目与开发管理系统</span>
      </router-link>

      <a-space :size="20">
        <a-badge :count="unreadNoticeCount" :overflow-count="99">
          <a-button class="app-header__icon" type="text" aria-label="通知" @click="handleNavigate('/notifications')">
            <BellOutlined />
          </a-button>
        </a-badge>
        <a-dropdown>
          <a-button class="app-user" type="text">
            <a-avatar :size="34"><UserOutlined /></a-avatar>
            <span>{{ currentUserName }}</span>
            <DownOutlined class="app-user__arrow" />
          </a-button>
          <template #overlay>
            <a-menu @click="handleUserMenuClick">
              <a-menu-item key="profile">
                <UserOutlined />
                个人信息
              </a-menu-item>
              <a-menu-item key="password">
                <LockOutlined />
                修改密码
              </a-menu-item>
              <a-menu-item key="logout">
                <LogoutOutlined />
                退出登录
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </a-space>
    </a-layout-header>

    <a-layout class="app-layout__body">
      <a-layout-sider
        v-model:collapsed="isSiderCollapsed"
        class="app-sider"
        :width="212"
        :collapsed-width="64"
        collapsible
        theme="light"
      >
        <a-menu mode="inline" :open-keys="openKeys" :selected-keys="selectedKeys" @open-change="handleOpenChange">
          <template v-for="item in visibleNavigation" :key="item.key">
            <a-sub-menu v-if="item.children?.length" :key="item.key">
              <template #icon><component :is="item.icon" /></template>
              <template #title>{{ item.label }}</template>
              <a-menu-item v-for="child in item.children" :key="child.key" @click="handleNavigate(child.path)">
                {{ child.label }}
              </a-menu-item>
            </a-sub-menu>

            <a-menu-item v-else :key="item.key" @click="handleNavigate(item.path)">
              <component :is="item.icon" />
              <span>{{ item.label }}</span>
            </a-menu-item>
          </template>
        </a-menu>
      </a-layout-sider>

      <a-layout-content :class="['app-content', { 'app-content--home': route.name === 'Home' }]">
        <header v-if="profileReady && route.name !== 'Home'" class="app-content__header">
          <a-breadcrumb>
            <a-breadcrumb-item v-for="(item, index) in breadcrumbItems" :key="item.title">
              <router-link v-if="item.path && index < breadcrumbItems.length - 1" :to="item.path">
                {{ item.title }}
              </router-link>
              <span v-else>{{ item.title }}</span>
            </a-breadcrumb-item>
          </a-breadcrumb>
        </header>

        <a-spin
          :spinning="profileLoading"
          :class="[
            'app-content__spin',
            {
              'app-content__spin--fixed': route.meta.isBugPage || route.meta.isProjectPage,
              'app-content__spin--project-form': route.name === 'ManagementProjectCreate' || route.name === 'ManagementProjectEdit',
            },
          ]"
        >
          <div
            v-if="profileReady"
            :class="[
              'app-content__body',
              {
                'app-content__body--fixed': route.meta.isBugPage || route.meta.isProjectPage,
                'app-content__body--project-form': route.name === 'ManagementProjectCreate' || route.name === 'ManagementProjectEdit',
              },
            ]"
          >
            <router-view />
          </div>
        </a-spin>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup>
import {
  BellOutlined,
  BookOutlined,
  BugOutlined,
  DownOutlined,
  FileOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  HomeOutlined,
  LockOutlined,
  LogoutOutlined,
  ProjectOutlined,
  SettingOutlined,
  UnorderedListOutlined,
  UsergroupAddOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getNotices } from '@/api/notices'
import { getCurrentUser } from '@/api/system'

const route = useRoute()
const router = useRouter()

const AUTH_PROFILE_KEY = 'authProfile'
const USER_INFO_KEY = 'userInfo'
const TOKEN_KEY = 'token'
const MENU_CACHE_KEYS = [
  AUTH_PROFILE_KEY,
  USER_INFO_KEY,
  'menus',
  'menuList',
  'systemMenus',
  'roleMenus',
  'permissions',
]

const isSiderCollapsed = ref(false)
const openKeys = ref([])
const profileLoading = ref(false)
const profileReady = ref(false)
const unreadNoticeCount = ref(0)
const authProfile = ref({
  menus: [],
  permissions: [],
  realName: '',
})

const ANY_WORK_CODES = ['task', 'bug', 'daily-report', 'project-report']

const navigationItems = [
  {
    key: '/',
    path: '/',
    label: '首页',
    icon: HomeOutlined,
    accessCodes: [],
    matches: [path => path === '/'],
  },
  {
    key: 'personal',
    label: '个人工作',
    icon: UsergroupAddOutlined,
    children: [
      { key: '/personal/statistics', path: '/personal/statistics', label: '我的统计', accessCodes: ANY_WORK_CODES, matches: [path => path === '/personal/statistics'] },
      { key: '/personal/tasks', path: '/personal/tasks', label: '我的任务', accessCodes: ['task'], matches: [path => path.startsWith('/personal/tasks')] },
      { key: '/personal/requirements', path: '/personal/requirements', label: '我的需求', accessCodes: ['requirement'], matches: [path => path.startsWith('/personal/requirements')] },
      { key: '/personal/bugs', path: '/personal/bugs', label: '我的 Bug', accessCodes: ['bug'], matches: [path => path === '/personal/bugs'] },
      { key: '/personal/daily', path: '/personal/daily', label: '我的日报', accessCodes: ['daily-report'], matches: [path => path.startsWith('/personal/daily')] },
     ],
  },
  {
    key: 'projects',
    label: '项目清单',
    icon: ProjectOutlined,
    children: [
      {
        key: '/projects/management',
        path: '/projects/management',
        label: '管理类项目',
        accessCodes: ['project'],
        matches: [path => path.startsWith('/projects/management')],
      },
      {
        key: '/projects/execution',
        path: '/projects/execution',
        label: '执行类项目',
        accessCodes: ['project'],
        matches: [path => path.startsWith('/projects/execution')],
      },
    ],
  },
  {
    key: 'tasks',
    label: '任务列表',
    icon: UnorderedListOutlined,
    children: [
      { key: '/tasks/all', path: '/tasks/all', label: '全部任务', accessCodes: ['task'], matches: [path => path === '/tasks/all'] },
      { key: '/tasks/development', path: '/tasks/development', label: '开发任务', accessCodes: ['task'], matches: [path => path === '/tasks/development'] },
      { key: '/tasks/testing', path: '/tasks/testing', label: '测试任务', accessCodes: ['task'], matches: [path => path === '/tasks/testing'] },
    ],
  },
  {
    key: '/requirements',
    path: '/requirements',
    label: '需求管理',
    icon: BookOutlined,
    accessCodes: ['requirement'],
    matches: [path => path.startsWith('/requirements')],
  },
  {
    key: '/bugs',
    path: '/bugs',
    label: 'Bug 列表',
    icon: BugOutlined,
    accessCodes: ['bug'],
    matches: [path => path.startsWith('/bugs')],
  },
  {
    key: '/files',
    path: '/files',
    label: '文件管理',
    icon: FileOutlined,
    accessCodes: ['file'],
    matches: [path => path.startsWith('/files')],
  },
  {
    key: '/daily-reports',
    path: '/daily-reports',
    label: '日报管理',
    icon: FileTextOutlined,
    accessCodes: ['daily-report'],
    matches: [path => path.startsWith('/daily-reports')],
  },
  {
    key: 'settings',
    label: '系统设置',
    icon: SettingOutlined,
    children: [
      { key: '/settings/users', path: '/settings/users', label: '用户管理', accessCodes: ['system:user'], matches: [path => path === '/settings/users'] },
      { key: '/settings/roles', path: '/settings/roles', label: '角色管理', accessCodes: ['system:role'], matches: [path => path === '/settings/roles'] },
      { key: '/settings/logs', path: '/settings/logs', label: '操作日志', accessCodes: ['system:log'], matches: [path => path === '/settings/logs'] },
    ],
  },
]

const routeGroupMap = {
  '/personal': 'personal',
  '/projects': 'projects',
  '/tasks': 'tasks',
  '/settings': 'settings',
}

const rootMenuKeys = new Set(navigationItems.filter(item => item.children?.length).map(item => item.key))
const hiddenNavigationKeys = new Set(['/files', '/daily-reports'])

const groupPathMap = {
  个人工作: '/personal/tasks',
  项目清单: '/projects/management',
  任务列表: '/tasks/all',
  需求管理: '/requirements',
  'Bug 列表': '/bugs',
  文件管理: '/files',
  日报管理: '/daily-reports',
  系统设置: '/settings/users',
}

const normalizeMenuPath = path => {
  if (!path) {
    return ''
  }

  const normalizedPath = String(path).replace(/\/+$/, '')
  return normalizedPath || '/'
}

const canAccess = item => {
  if (!item?.accessCodes?.length) {
    return true
  }

  return item.accessCodes?.some(code => authorizedMenuCodes.value.has(code)) || authorizedMenuPaths.value.has(normalizeMenuPath(item.path))
}

const syncOpenKeys = path => {
  const group = Object.entries(routeGroupMap).find(([prefix]) => path.startsWith(prefix))?.[1]
  openKeys.value = group ? [group] : []
}

const flattenVisibleItems = items => {
  const result = []

  for (const item of items) {
    if (item.children?.length) {
      result.push(...flattenVisibleItems(item.children))
      continue
    }

    result.push(item)
  }

  return result
}

const accessibleNavigation = computed(() => {
  return navigationItems
    .map(item => {
      if (!item.children) {
        return canAccess(item) ? item : null
      }

      const children = item.children.filter(child => canAccess(child))
      return children.length ? { ...item, children } : null
    })
    .filter(Boolean)
})

const canAccessPath = path => {
  const resolvedRoute = router.resolve(path)
  if (resolvedRoute.matched.some(record => record.meta?.hideInMenu)) {
    return true
  }

  const items = flattenVisibleItems(accessibleNavigation.value)
  return items.some(item => item.matches?.some(match => match(path)))
}

const getFirstAccessiblePath = () => {
  const items = flattenVisibleItems(visibleNavigation.value)
  return items[0]?.path || '/'
}

const ensureCurrentRouteAccess = () => {
  if (route.path === '/') {
    return
  }

  if (canAccessPath(route.path)) {
    return
  }

  const fallbackPath = getFirstAccessiblePath()

  if (route.path !== fallbackPath) {
    router.replace(fallbackPath)
  }
}

const currentUserName = computed(() => {
  if (authProfile.value.realName) {
    return authProfile.value.realName
  }

  try {
    const userInfo = JSON.parse(localStorage.getItem(USER_INFO_KEY) || '{}')
    return userInfo.realName || '管理员'
  } catch {
    return '管理员'
  }
})

const authorizedMenuCodes = computed(() => {
  const codes = new Set()

  for (const menu of authProfile.value.menus || []) {
    if (menu?.code) {
      codes.add(menu.code)
    }
  }

  for (const permission of authProfile.value.permissions || []) {
    if (permission) {
      codes.add(permission)
    }
  }

  return codes
})

const authorizedMenuPaths = computed(() => {
  const paths = new Set()

  for (const menu of authProfile.value.menus || []) {
    if (menu?.path) {
      paths.add(normalizeMenuPath(menu.path))
    }
  }

  return paths
})

const visibleNavigation = computed(() => {
  return accessibleNavigation.value
    .filter(item => !hiddenNavigationKeys.has(item.key))
    .filter(Boolean)
})

const selectedKeys = computed(() => {
  if (route.path.startsWith('/bugs')) return ['/bugs']
  if (route.path.startsWith('/personal/tasks')) return ['/personal/tasks']
  if (route.path.startsWith('/personal/requirements')) return ['/personal/requirements']
  if (route.path.startsWith('/personal/daily')) return ['/personal/daily']
  if (route.path.startsWith('/projects/management')) return ['/projects/management']
  if (route.path.startsWith('/projects/execution')) return ['/projects/execution']
  return [route.path]
})

const breadcrumbItems = computed(() => {
  const items = []
  const group = route.meta.group
  const parentTitle = route.meta.parentTitle
  const title = route.meta.title || '首页'

  if (group) {
    items.push({ title: group, path: groupPathMap[group] })
  }

  if (parentTitle && parentTitle !== title) {
    items.push({
      title: parentTitle,
      path: route.meta.parentPath || (route.path.startsWith('/projects/execution') ? '/projects/execution' : '/projects/management'),
    })
  }

  if (!group || group !== title) {
    items.push({ title })
  }

  if (route.name === 'PersonalTasks' && route.query.detail === 'task') {
    items.push({ title: '任务详情' })
  }

  if (['AllTasks', 'DevelopmentTasks', 'TestingTasks'].includes(route.name) && route.query.detail === 'task') {
    items.push({ title: '任务详情' })
  }

  return items
})

const saveAuthProfile = profile => {
  localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile))
  localStorage.setItem(
    USER_INFO_KEY,
    JSON.stringify({
      userId: profile.id,
      realName: profile.realName,
    })
  )
}

const clearAuthCache = () => {
  localStorage.removeItem(TOKEN_KEY)
  MENU_CACHE_KEYS.forEach(key => localStorage.removeItem(key))
  unreadNoticeCount.value = 0
  authProfile.value = {
    menus: [],
    permissions: [],
    realName: '',
  }
}

const loadUnreadNoticeCount = async () => {
  if (!localStorage.getItem(TOKEN_KEY)) {
    unreadNoticeCount.value = 0
    return
  }

  try {
    const result = await getNotices({ pageNo: 1, pageSize: 200, read: false })
    const records = result?.records || result?.data?.records || (Array.isArray(result) ? result : [])
    
    unreadNoticeCount.value = Number(result?.total ?? result?.data?.total ?? records.length) || 0
  } catch {
    unreadNoticeCount.value = 0
  }
}

const loadCurrentUserProfile = async () => {
  if (!localStorage.getItem(TOKEN_KEY)) {
    unreadNoticeCount.value = 0
    profileReady.value = true
    return
  }

  profileLoading.value = true

  try {
    const profile = await getCurrentUser()
    authProfile.value = {
      ...profile,
      menus: profile.menus || [],
      permissions: profile.permissions || [],
    }
    saveAuthProfile(profile)
    await loadUnreadNoticeCount()
    ensureCurrentRouteAccess()
  } finally {
    profileLoading.value = false
    profileReady.value = true
  }
}

onMounted(async () => {
  await loadCurrentUserProfile()
})

watch(
  () => route.path,
  path => {
    syncOpenKeys(path)

    if (profileReady.value) {
      ensureCurrentRouteAccess()
      loadUnreadNoticeCount()
    }
  },
  { immediate: true }
)

const handleOpenChange = keys => {
  const latestKey = [...keys].reverse().find(key => rootMenuKeys.has(key))
  openKeys.value = latestKey ? [latestKey] : []
}

const handleNavigate = path => {
  router.push(path)
}

const handleUserMenuClick = ({ key }) => {
  if (key === 'profile') {
    router.push('/account/profile')
    return
  }

  if (key === 'password') {
    router.push('/account/password')
    return
  }

  if (key === 'logout') {
    clearAuthCache()
    router.push('/login')
  }
}
</script>

<style scoped>
.app-layout {
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 24px 0 20px;
  line-height: normal;
  background: #ffffff8c;
  //box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
}

.app-brand {
  display: inline-flex;
  gap: 12px;
  align-items: center;
  color: #000;
  font-size: 20px;
  font-weight: 600;
}

.app-brand:hover {
  color: #fff;
}

.app-brand__mark {
  display: block;
  width: 30px;
  height: 30px;
  object-fit: contain;
  border-radius: 8px;
}

.app-header__icon,
.app-user {
  color: #262626;
}

.app-header__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  font-size: 20px;
}

.app-header__icon:hover,
.app-user:hover {
  color: #1677ff;
}

.app-user {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  height: auto;
  padding: 0;
  font-weight: 500;
}

.app-user__arrow {
  color: #595959;
  font-size: 12px;
}

.app-user :deep(.ant-avatar) {
  color: #fff;
  background: #1677ff;
}

.app-layout__body {
  flex: 1;
  height: calc(100vh - 68px);
  min-height: 0;
  overflow: hidden;
  background: radial-gradient(ellipse 800px 600px at 0% 0%, #0071e32e 0%, transparent 60%), radial-gradient(ellipse 700px 500px at 0% 100%, #34c75924 0%, transparent 60%), radial-gradient(ellipse 900px 700px at 100% 0%, #af52de24 0%, transparent 60%), radial-gradient(ellipse 700px 500px at 100% 100%, #ff9f0a1f 0%, transparent 60%), #f5f5f7;
}

.app-sider {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: #fff;
  border-right: 1px solid #f0f0f0;
}

.app-sider :deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.app-sider :deep(.ant-layout-sider-trigger) {
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.app-sider :deep(.ant-menu) {
  padding-top: 10px;
  border-inline-end: none;
  background: transparent;
}

.app-sider :deep(.ant-menu-inline.ant-menu-root > .ant-menu-item) {
  padding-inline-start: 14px !important;
}

.app-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  overscroll-behavior: contain;
}

.app-content--home {
  overflow-x: hidden;
  overflow-y: auto;
}

.app-content__header {
  z-index: 5;
  flex: 0 0 52px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: #fff;
  box-shadow: 0 1px 6px rgb(15 23 42 / 6%);
}

.app-content__spin {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.app-content__spin.ant-spin-nested-loading {
  overflow: auto;
}

.app-content__spin :deep(.ant-spin-container) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.app-content__body {
  flex: 1;
  min-height: 0;
  padding: 18px 18px 22px;
  overflow-x: hidden;
  overflow-y: auto;
}

.app-content--home .app-content__spin {
  flex: none;
  overflow: visible;
}

.app-content--home .app-content__spin :deep(.ant-spin-container) {
  height: auto;
  min-height: 100%;
  overflow: visible;
}

.app-content--home .app-content__body {
  flex: none;
  min-height: 100%;
  overflow: visible;
}

.app-content__spin--fixed {
  overflow: hidden;
}

.app-content__spin--fixed :deep(.ant-spin-container) {
  overflow: hidden;
}

.app-content__spin--project-form {
  overflow-x: hidden;
  overflow-y: auto;
}

.app-content__spin--project-form :deep(.ant-spin-container) {
  height: auto;
  min-height: 100%;
  overflow: visible;
}

.app-content__body--fixed {
  overflow-x: hidden;
  overflow-y: auto;
}

.app-content__body--project-form {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  overflow: visible;
}
</style>
