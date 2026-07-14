<template>
  <a-layout class="app-layout">
    <a-layout-header class="app-header">
      <router-link class="app-brand" to="/">
        <span class="app-brand__mark">P</span>
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
          <template v-for="item in dynamicNavigation" :key="String(item.id)">
            <a-sub-menu v-if="item.children?.length" :key="String(item.id)">
              <template #icon><component :is="CODE_ICON_MAP[item.code] || FolderOutlined" /></template>
              <template #title>{{ item.name }}</template>
              <a-menu-item v-for="child in item.children" :key="menuItemKey(child)" @click="handleNavigate(child.path)">
                {{ child.name }}
              </a-menu-item>
            </a-sub-menu>

            <a-menu-item v-else :key="menuItemKey(item)" @click="handleNavigate(item.path)">
              <component :is="CODE_ICON_MAP[item.code] || FolderOutlined" />
              <span>{{ item.name }}</span>
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
          :class="['app-content__spin', { 'app-content__spin--fixed': route.meta.isBugPage || route.meta.isProjectPage }]"
        >
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
  FolderOutlined,
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

import { getCurrentUser } from '@/api/system'
import { getUnreadCount } from '@/api/notices'

const route = useRoute()
const router = useRouter()

const AUTH_PROFILE_KEY = 'authProfile'
const USER_INFO_KEY = 'userInfo'
const TOKEN_KEY = 'token'
const MENU_CACHE_KEYS = [AUTH_PROFILE_KEY, USER_INFO_KEY, 'menus', 'menuList', 'systemMenus', 'roleMenus', 'permissions']

// Icon mapping: backend menu code → Ant Design icon component
const CODE_ICON_MAP = {
  home: HomeOutlined,
  personal: UsergroupAddOutlined,
  projects: ProjectOutlined,
  tasks: UnorderedListOutlined,
  requirement: BookOutlined,
  bug: BugOutlined,
  file: FileOutlined,
  'daily-report': FileTextOutlined,
  'project-report': FileTextOutlined,
  system: SettingOutlined,
}

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

const isSiderCollapsed = ref(false)
const openKeys = ref([])
const profileLoading = ref(false)
const profileReady = ref(false)
const authProfile = ref({ menus: [], permissions: [], realName: '' })
const unreadNoticeCount = ref(0)

// Build tree from the flat menus array returned by /me
const buildNavTree = menus => {
  const map = new Map()
  const roots = []
  menus.forEach(m => map.set(m.id, { ...m, children: [] }))
  menus.forEach(m => {
    const node = map.get(m.id)
    if (m.parentId != null && map.has(m.parentId)) {
      map.get(m.parentId).children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

const dynamicNavigation = computed(() => buildNavTree(authProfile.value.menus || []))

// Key used as <a-menu-item :key>; must match selectedKeys values
const menuItemKey = item => item.path || String(item.id)

// True when routePath is the same as or a sub-path of menuPath
const pathMatchesRoute = (menuPath, routePath) => {
  if (!menuPath) return false
  if (menuPath === '/') return routePath === '/'
  return routePath === menuPath || routePath.startsWith(menuPath + '/')
}

// Find the deepest leaf menu item whose path matches the current route
const findActiveLeaf = (items, routePath) => {
  for (const item of items) {
    if (item.children?.length) {
      const found = findActiveLeaf(item.children, routePath)
      if (found) return found
    } else if (pathMatchesRoute(item.path, routePath)) {
      return item
    }
  }
  return null
}

const selectedKeys = computed(() => {
  const leaf = findActiveLeaf(dynamicNavigation.value, route.path)
  return leaf ? [menuItemKey(leaf)] : []
})

// IDs (as strings) of top-level items that have children, used by handleOpenChange
const rootGroupIds = computed(() =>
  new Set(dynamicNavigation.value.filter(i => i.children?.length).map(i => String(i.id)))
)

const syncOpenKeys = routePath => {
  for (const item of dynamicNavigation.value) {
    if (!item.children?.length) continue
    const hasMatch = item.children.some(child =>
      child.children?.length
        ? child.children.some(gc => pathMatchesRoute(gc.path, routePath))
        : pathMatchesRoute(child.path, routePath)
    )
    if (hasMatch) {
      openKeys.value = [String(item.id)]
      return
    }
  }
  openKeys.value = []
}

const canAccessPath = path => {
  const resolved = router.resolve(path)
  if (resolved.matched.some(r => r.meta?.hideInMenu)) return true
  return findActiveLeaf(dynamicNavigation.value, path) != null
}

const getFirstAccessiblePath = () => {
  const firstLeaf = items => {
    for (const item of items) {
      if (item.children?.length) {
        const found = firstLeaf(item.children)
        if (found) return found
      } else if (item.path) {
        return item.path
      }
    }
    return null
  }
  return firstLeaf(dynamicNavigation.value) || '/'
}

const ensureCurrentRouteAccess = () => {
  if (route.path === '/') return
  if (canAccessPath(route.path)) return
  const fallback = getFirstAccessiblePath()
  if (route.path !== fallback) router.replace(fallback)
}

const currentUserName = computed(() => {
  if (authProfile.value.realName) return authProfile.value.realName
  try {
    const userInfo = JSON.parse(localStorage.getItem(USER_INFO_KEY) || '{}')
    return userInfo.realName || '管理员'
  } catch {
    return '管理员'
  }
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

  if (route.name === 'PersonalBugs' && route.query.detail === 'bug') {
    items.push({ title: 'Bug 详情' })
  }

  return items
})

const saveAuthProfile = profile => {
  localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile))
  localStorage.setItem(USER_INFO_KEY, JSON.stringify({ userId: profile.id, realName: profile.realName }))
}

const clearAuthCache = () => {
  localStorage.removeItem(TOKEN_KEY)
  MENU_CACHE_KEYS.forEach(key => localStorage.removeItem(key))
  authProfile.value = { menus: [], permissions: [], realName: '' }
}

const loadCurrentUserProfile = async () => {
  if (!localStorage.getItem(TOKEN_KEY)) {
    profileReady.value = true
    return
  }

  profileLoading.value = true

  try {
    const profile = await getCurrentUser()
    authProfile.value = { ...profile, menus: profile.menus || [], permissions: profile.permissions || [] }
    saveAuthProfile(profile)
    ensureCurrentRouteAccess()
  } finally {
    profileLoading.value = false
    profileReady.value = true
  }
}

const loadUnreadNoticeCount = async () => {
  try {
    const res = await getUnreadCount()
    unreadNoticeCount.value = res?.data ?? 0
  } catch {
    // silent
  }
}

onMounted(async () => {
  await loadCurrentUserProfile()
  await loadUnreadNoticeCount()
})

// Re-sync open keys whenever the nav tree is (re)built from a fresh profile load
watch(dynamicNavigation, () => syncOpenKeys(route.path))

watch(
  () => route.path,
  path => {
    syncOpenKeys(path)
    if (profileReady.value) ensureCurrentRouteAccess()
  },
  { immediate: true }
)

const handleOpenChange = keys => {
  const latest = [...keys].reverse().find(k => rootGroupIds.value.has(k))
  openKeys.value = latest ? [latest] : []
}

const handleNavigate = path => {
  router.push(path)
}

const handleUserMenuClick = ({ key }) => {
  if (key === 'profile') { router.push('/account/profile'); return }
  if (key === 'password') { router.push('/account/password'); return }
  if (key === 'logout') { clearAuthCache(); router.push('/login') }
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
  flex: 1;
  height: calc(100vh - 68px);
  min-height: 0;
  overflow: hidden;
  background: #f5f7fa;
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

.app-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.app-content__header {
  position: sticky;
  top: 0;
  z-index: 5;
  flex: 0 0 52px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: #fff;
  box-shadow: 0 1px 6px rgb(15 23 42 / 6%);
}

.app-content__spin {
  flex: none;
  min-height: 0;
  overflow: visible;
}

.app-content__spin :deep(.ant-spin-container) {
  overflow: visible;
}

.app-content__body {
  flex: none;
  min-height: 0;
  padding: 18px 18px 22px;
  overflow: visible;
}

.app-content__spin--fixed {
  overflow: visible;
}

.app-content__spin--fixed :deep(.ant-spin-container) {
  overflow: visible;
}

.app-content__body--fixed {
  overflow: visible;
}
</style>
