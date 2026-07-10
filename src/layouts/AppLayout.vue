<template>
  <a-layout class="app-layout">
    <a-layout-header class="app-header">
      <router-link class="app-brand" to="/">
        <span class="app-brand__mark">P</span>
        <span>项目与开发管理系统</span>
      </router-link>

      <a-space :size="20">
        <a-badge :count="0">
          <a-button class="app-header__icon" type="text" aria-label="通知">
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

      <a-layout-content class="app-content">
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

        <a-spin :spinning="profileLoading" class="app-content__spin">
          <div
            v-if="profileReady"
            :class="['app-content__body', { 'app-content__body--fixed': route.meta.isBugPage || route.meta.isProjectPage }]"
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
  LogoutOutlined,
  ProjectOutlined,
  SettingOutlined,
  UnorderedListOutlined,
  UsergroupAddOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getCurrentUser } from '@/api/system'

const route = useRoute()
const router = useRouter()

const AUTH_PROFILE_KEY = 'authProfile'
const USER_INFO_KEY = 'userInfo'
const TOKEN_KEY = 'token'

const isSiderCollapsed = ref(false)
const openKeys = ref([])
const profileLoading = ref(false)
const profileReady = ref(false)
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
      { key: '/personal/tasks', path: '/personal/tasks', label: '我的任务', accessCodes: ['task'], matches: [path => path === '/personal/tasks'] },
      { key: '/personal/bugs', path: '/personal/bugs', label: '我的 Bug', accessCodes: ['bug'], matches: [path => path === '/personal/bugs'] },
      { key: '/personal/daily', path: '/personal/daily', label: '我的日报', accessCodes: ['daily-report'], matches: [path => path === '/personal/daily'] },
      { key: '/personal/statistics', path: '/personal/statistics', label: '我的统计', accessCodes: ANY_WORK_CODES, matches: [path => path === '/personal/statistics'] },
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
    key: '/project-reports',
    path: '/project-reports',
    label: '项目汇报管理',
    icon: FolderOpenOutlined,
    accessCodes: ['project-report'],
    matches: [path => path.startsWith('/project-reports')],
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

const groupPathMap = {
  个人工作: '/personal/tasks',
  项目清单: '/projects/management',
  任务列表: '/tasks/all',
  需求管理: '/requirements',
  'Bug 列表': '/bugs',
  文件管理: '/files',
  日报管理: '/daily-reports',
  项目汇报管理: '/project-reports',
  系统设置: '/settings/users',
}

const canAccess = accessCodes => {
  if (!accessCodes?.length) {
    return true
  }

  return accessCodes.some(code => authorizedCodes.value.has(code))
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

const canAccessPath = path => {
  const items = flattenVisibleItems(visibleNavigation.value)
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

const authorizedCodes = computed(() => {
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

const visibleNavigation = computed(() => {
  return navigationItems
    .map(item => {
      if (!item.children) {
        return canAccess(item.accessCodes) ? item : null
      }

      const children = item.children.filter(child => canAccess(child.accessCodes))
      return children.length ? { ...item, children } : null
    })
    .filter(Boolean)
})

const selectedKeys = computed(() => {
  if (route.path.startsWith('/bugs')) return ['/bugs']
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
      path: route.path.startsWith('/projects/execution') ? '/projects/execution' : '/projects/management',
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

  if (route.name === 'PersonalBugs' && route.query.detail === 'bug') {
    items.push({ title: 'Bug 详情' })
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

const loadCurrentUserProfile = async () => {
  if (!localStorage.getItem(TOKEN_KEY)) {
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
  if (key === 'logout') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_INFO_KEY)
    localStorage.removeItem(AUTH_PROFILE_KEY)
    router.push('/login')
  }
}
</script>

<style scoped>
.app-layout {
  min-width: 1100px;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 68px;
  padding: 0 24px 0 52px;
  line-height: normal;
  background: #001529;
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
}

.app-brand {
  display: inline-flex;
  gap: 12px;
  align-items: center;
  color: #fff;
  font-size: 20px;
  font-weight: 600;
}

.app-brand:hover {
  color: #fff;
}

.app-brand__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  background: #1677ff;
  border-radius: 8px;
}

.app-header__icon,
.app-user {
  color: rgb(255 255 255 / 88%);
}

.app-header__icon:hover,
.app-user:hover {
  color: #fff;
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
  font-size: 12px;
}

.app-layout__body {
  min-height: 0;
  background: #f5f7fa;
}

.app-sider {
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

.app-content {
  min-width: 0;
  padding: 18px 18px 22px;
  overflow: auto;
}

.app-content__header {
  padding: 14px 18px;
  margin-bottom: 14px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(15 23 42 / 6%);
}

.app-content__spin {
  width: 100%;
}

.app-content__body {
  min-height: calc(100vh - 68px - 54px - 18px - 22px);
}

.app-content__body--fixed {
  overflow: hidden;
}
</style>
