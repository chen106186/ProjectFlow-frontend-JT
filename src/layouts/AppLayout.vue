<template>
  <a-layout class="app-layout">
    <a-layout-header class="app-header">
      <router-link class="app-brand" to="/">
        <img class="app-brand__mark" src="/favicon.png" alt="" />
        <span>项目与开发管理系统</span>
      </router-link>

      <a-space :size="20">
        <a-dropdown v-model:open="noticeDropdownOpen" :trigger="['click']" placement="bottomRight" @open-change="handleNoticeDropdownOpen">
          <a-badge :count="unreadNoticeCount" :overflow-count="99">
            <a-button class="app-header__icon" type="text" aria-label="通知">
              <BellOutlined />
            </a-button>
          </a-badge>
          <template #overlay>
            <section class="notice-dropdown">
              <header class="notice-dropdown__header">
                <strong>消息通知</strong>
                <span v-if="unreadNoticeCount" class="notice-dropdown__unread">
                  未读 {{ unreadNoticeCount > 99 ? '99+' : unreadNoticeCount }}
                </span>
              </header>
              <a-spin :spinning="recentNoticesLoading">
                <div v-if="recentNotices.length" class="notice-dropdown__list">
                  <button
                    v-for="notice in recentNotices"
                    :key="notice.id"
                    :class="['notice-dropdown__item', { 'notice-dropdown__item--unread': !notice.read }]"
                    type="button"
                    @click="handleRecentNoticeClick(notice)"
                  >
                    <span class="notice-dropdown__title">{{ notice.title }}</span>
                    <span class="notice-dropdown__content">{{ notice.content }}</span>
                    <span class="notice-dropdown__time">{{ formatNoticeTime(notice.createdAt) }}</span>
                  </button>
                </div>
                <a-empty v-else-if="!recentNoticesLoading" description="暂无消息" class="notice-dropdown__empty" />
              </a-spin>
              <div class="notice-dropdown__footer">
                <a-button type="link" block @click="handleViewAllNotices">查看所有消息</a-button>
              </div>
            </section>
          </template>
        </a-dropdown>
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
        <a-menu mode="inline" :motion="{ css: false }" :open-keys="openKeys" :selected-keys="selectedKeys" @open-change="handleOpenChange">
          <template v-for="item in visibleNavigation" :key="item.key">
            <a-sub-menu v-if="item.children?.length" :key="item.key">
              <template #icon><component :is="item.icon" /></template>
              <template #title>{{ item.label }}</template>
              <a-menu-item v-for="child in item.children" :key="child.key" @click="handleNavigate(child.path)">
                {{ child.label }}
              </a-menu-item>
            </a-sub-menu>

            <a-menu-item v-else :key="item.key" @click="handleNavigate(item.path)">
              <template #icon><component :is="item.icon" /></template>
              <span>{{ item.label }}</span>
            </a-menu-item>
          </template>
        </a-menu>
      </a-layout-sider>

      <a-layout-content
        :class="[
          'app-content',
          {
            'app-content--home': route.name === 'Home',
            'app-content--fixed-list': isFixedListPage,
          },
        ]"
      >
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
          :wrapper-class-name="[
            'app-content__spin',
            route.meta.isBugPage || route.meta.isProjectPage || isFixedListPage ? 'app-content__spin--fixed' : '',
            route.name === 'ManagementProjectCreate' || route.name === 'ManagementProjectEdit' ? 'app-content__spin--project-form' : '',
          ].filter(Boolean).join(' ')"
        >
          <div
            v-if="profileReady"
            :class="[
              'app-content__body',
              {
                'app-content__body--fixed': route.meta.isBugPage || route.meta.isProjectPage,
                'app-content__body--fixed-list': isFixedListPage,
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
import { message } from 'ant-design-vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getNotices, getUnreadCount, markNoticeRead } from '@/api/notices'
import { getCurrentUser } from '@/api/system'
import { getNoticeRoute, noticeReadEvent, notifyNoticeRead } from '@/utils/noticeNavigation'

const route = useRoute()
const router = useRouter()

const fixedListRouteNames = new Set([
  'PersonalTasks',
  'PersonalRequirements',
  'PersonalBugs',
  'PersonalDaily',
  'AllTasks',
  'DevelopmentTasks',
  'TestingTasks',
  'RequirementManagement',
  'BugList',
])
const isFixedListPage = computed(() => fixedListRouteNames.has(route.name) && route.query.detail !== 'task')

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
const noticeDropdownOpen = ref(false)
const recentNoticesLoading = ref(false)
const recentNotices = ref([])
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
      { key: '/personal/bugs', path: '/personal/bugs', label: '我的 Bug', accessCodes: [], matches: [path => path === '/personal/bugs'] },
      { key: '/personal/daily', path: '/personal/daily', label: '我的日报', accessCodes: ['daily-report'], matches: [path => path.startsWith('/personal/daily')] },
     ],
  },
  {
    key: 'projects',
    label: '项目清单',
    icon: ProjectOutlined,
    children: [
      { key: '/workhub', path: '/workhub', label: '项目工作台', accessCodes: ['project', 'task', 'bug', 'requirement'], matches: [path => path.startsWith('/workhub')] },
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
      { key: '/tasks/all', path: '/tasks/all', label: '全部任务', accessCodes: ['task'], matches: [path => path.startsWith('/tasks/all')] },
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
    accessCodes: [],
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
  '/workhub': 'projects',
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
  if (route.path.startsWith('/tasks/all')) return ['/tasks/all']
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
      id: profile.id,
      realName: profile.realName,
    })
  )
}

const clearAuthCache = () => {
  localStorage.removeItem(TOKEN_KEY)
  MENU_CACHE_KEYS.forEach(key => localStorage.removeItem(key))
  unreadNoticeCount.value = 0
  noticeDropdownOpen.value = false
  recentNotices.value = []
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
    const result = await getUnreadCount()
    unreadNoticeCount.value = Number(result?.count ?? result) || 0
  } catch {
    unreadNoticeCount.value = 0
  }
}

const loadRecentNotices = async () => {
  if (!localStorage.getItem(TOKEN_KEY)) {
    recentNotices.value = []
    return
  }

  recentNoticesLoading.value = true
  try {
    const result = await getNotices({ pageNo: 1, pageSize: 5 })
    recentNotices.value = result?.records || result?.data?.records || []
  } catch (error) {
    recentNotices.value = []
    message.error(error.message || '通知加载失败')
  } finally {
    recentNoticesLoading.value = false
  }
}

const formatNoticeTime = value => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = number => String(number).padStart(2, '0')
  return `${date.getMonth() + 1}-${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const handleNoticeDropdownOpen = open => {
  if (open) loadRecentNotices()
}

const handleRecentNoticeClick = async notice => {
  if (!notice.read) {
    try {
      await markNoticeRead(notice.id)
      notice.read = true
      notifyNoticeRead()
    } catch (error) {
      message.error(error.message || '标记已读失败')
    }
  }
  noticeDropdownOpen.value = false
  const target = getNoticeRoute(notice)
  if (target) await router.push(target)
  else handleViewAllNotices()
}

const handleViewAllNotices = () => {
  noticeDropdownOpen.value = false
  handleNavigate('/notifications')
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
  window.addEventListener(noticeReadEvent, loadUnreadNoticeCount)
  await loadCurrentUserProfile()
})

onBeforeUnmount(() => window.removeEventListener(noticeReadEvent, loadUnreadNoticeCount))

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
  color: var(--app-text, #1d1d1f);
  background:
    radial-gradient(circle at 8% 0%, rgb(0 122 255 / 12%), transparent 24rem),
    radial-gradient(circle at 92% 0%, rgb(175 82 222 / 10%), transparent 28rem),
    linear-gradient(180deg, #fbfbfd 0%, #f5f5f7 52%, #f2f2f7 100%);
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 22px;
  line-height: normal;
  background: rgb(255 255 255 / 72%);
  border-bottom: 1px solid rgb(60 60 67 / 12%);
  box-shadow: 0 8px 26px rgb(0 0 0 / 5%);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
}

.app-brand {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  color: #1d1d1f;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.app-brand:hover {
  color: #007aff;
}

.app-brand__mark {
  display: block;
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 8px 20px rgb(0 122 255 / 22%);
}

.app-header__icon,
.app-user {
  color: #1d1d1f;
}

.app-header__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  font-size: 18px;
  background: rgb(255 255 255 / 56%);
  border: 1px solid rgb(60 60 67 / 12%);
  border-radius: 999px;
}

.app-header__icon:hover,
.app-user:hover {
  color: #007aff;
  background: rgb(0 122 255 / 8%);
}

.notice-dropdown {
  display: flex;
  flex-direction: column;
  width: 380px;
  max-height: 440px;
  overflow: hidden;
  background: rgb(255 255 255 / 86%);
  border: 1px solid rgb(60 60 67 / 14%);
  border-radius: 20px;
  box-shadow: 0 24px 70px rgb(0 0 0 / 18%);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
}

.notice-dropdown__header {
  display: flex;
  flex: 0 0 52px;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  background: linear-gradient(90deg, rgb(245 245 247 / 88%) 0%, rgb(255 255 255 / 64%) 100%);
  border-bottom: 1px solid rgb(60 60 67 / 12%);
}

.notice-dropdown__header strong {
  color: #1d1d1f;
  font-size: 15px;
  font-weight: 600;
}

.notice-dropdown__unread {
  padding: 3px 8px;
  color: #007aff;
  font-size: 12px;
  line-height: 18px;
  background: rgb(0 122 255 / 10%);
  border-radius: 999px;
}

.notice-dropdown__list {
  flex: 1;
  overflow-y: auto;
  scrollbar-color: #c9d1dc transparent;
  scrollbar-width: thin;
}

.notice-dropdown__list::-webkit-scrollbar {
  width: 6px;
}

.notice-dropdown__list::-webkit-scrollbar-thumb {
  background: #c9d1dc;
  border-radius: 3px;
}

.notice-dropdown__item {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 5px;
  padding: 14px 18px 13px 22px;
  overflow: hidden;
  color: #1f2937;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #f0f2f5;
  cursor: default;
  transition: background-color 0.2s ease;
}

.notice-dropdown__item:hover {
  background: rgb(0 122 255 / 6%);
}

.notice-dropdown__item--unread::before {
  position: absolute;
  top: 22px;
  left: 10px;
  width: 6px;
  height: 6px;
  content: '';
  background: #007aff;
  border-radius: 50%;
}

.notice-dropdown__title,
.notice-dropdown__content,
.notice-dropdown__time {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-dropdown__title {
  line-height: 20px;
  font-size: 14px;
  font-weight: 600;
}

.notice-dropdown__content {
  color: #6e6e73;
  font-size: 12px;
  line-height: 18px;
}

.notice-dropdown__time {
  color: #86868b;
  font-size: 12px;
  line-height: 18px;
}

.notice-dropdown__empty {
  min-height: 200px;
  margin: 0;
}

.notice-dropdown__footer {
  flex: 0 0 52px;
  padding: 8px 14px;
  background: rgb(255 255 255 / 62%);
  border-top: 1px solid rgb(60 60 67 / 12%);
}

.notice-dropdown__footer :deep(.ant-btn) {
  height: 34px;
  color: #007aff;
  font-weight: 500;
  background: rgb(0 122 255 / 9%);
  border-radius: 999px;
}

.app-user {
  display: inline-flex;
  gap: 9px;
  align-items: center;
  height: 38px;
  padding: 2px 8px 2px 3px;
  font-weight: 600;
  background: rgb(255 255 255 / 56%);
  border: 1px solid rgb(60 60 67 / 12%);
  border-radius: 999px;
}

.app-user__arrow {
  color: #6e6e73;
  font-size: 12px;
}

.app-user :deep(.ant-avatar) {
  color: #fff;
  background: linear-gradient(180deg, #0a84ff 0%, #007aff 100%);
  box-shadow: 0 8px 18px rgb(0 122 255 / 24%);
}

.app-layout__body {
  flex: 1;
  height: calc(100vh - 56px);
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(ellipse 800px 600px at 0% 0%, rgb(0 122 255 / 12%) 0%, transparent 60%),
    radial-gradient(ellipse 700px 500px at 0% 100%, rgb(52 199 89 / 10%) 0%, transparent 60%),
    radial-gradient(ellipse 900px 700px at 100% 0%, rgb(175 82 222 / 10%) 0%, transparent 60%),
    #f5f5f7;
}

.app-sider {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  background: rgb(255 255 255 / 66%);
  border-right: 1px solid rgb(60 60 67 / 12%);
  box-shadow: 10px 0 34px rgb(0 0 0 / 4%);
}

.app-sider::-webkit-scrollbar {
  display: none;
}

.app-sider :deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.app-sider :deep(.ant-layout-sider-trigger) {
  color: #6e6e73;
  background: rgb(255 255 255 / 70%);
  border-top: 1px solid rgb(60 60 67 / 12%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.app-sider :deep(.ant-menu) {
  padding: 12px 8px;
  border-inline-end: none;
  background: transparent;
}

.app-sider :deep(.ant-menu-inline.ant-menu-root > .ant-menu-item),
.app-sider :deep(.ant-menu-inline.ant-menu-root > .ant-menu-submenu > .ant-menu-submenu-title) {
  display: flex;
  align-items: center;
  min-height: 42px;
  margin: 3px 0;
  padding-inline-start: 16px !important;
  color: #424245;
  border-radius: 14px;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.app-sider :deep(.ant-menu-inline.ant-menu-root > .ant-menu-item:hover),
.app-sider :deep(.ant-menu-inline.ant-menu-root > .ant-menu-submenu > .ant-menu-submenu-title:hover) {
  color: #007aff;
  background: rgb(0 122 255 / 7%);
}

.app-sider :deep(.ant-menu-item-selected) {
  color: #007aff !important;
  background: rgb(0 122 255 / 12%) !important;
  box-shadow: inset 0 0 0 1px rgb(0 122 255 / 8%);
}

.app-sider :deep(.ant-menu-item-selected::after) {
  display: none;
}

.app-sider :deep(.ant-menu-inline.ant-menu-root > .ant-menu-item > .anticon),
.app-sider :deep(.ant-menu-inline.ant-menu-root > .ant-menu-submenu > .ant-menu-submenu-title > .anticon) {
  flex: 0 0 16px;
  width: 16px;
  margin-inline-end: 10px;
  text-align: center;
}

.app-sider :deep(.ant-menu-inline .ant-menu-sub .ant-menu-item) {
  padding-inline-start: 0 !important;
  text-align: center;
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
  padding: 0 28px;
  background: rgb(255 255 255 / 58%);
  border-bottom: 1px solid rgb(60 60 67 / 10%);
  box-shadow: 0 8px 24px rgb(0 0 0 / 4%);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
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
  padding: 22px 24px 28px;
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

.app-content__body--fixed-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-bottom: 10px;
  overflow: clip;
}

.app-content--fixed-list,
.app-content--fixed-list .app-content__spin.ant-spin-nested-loading,
.app-content--fixed-list .app-content__spin :deep(.ant-spin-container) {
  overflow: clip;
}

.app-content__body--project-form {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  overflow: visible;
}

@media (max-width: 1440px) {
  .app-content__header {
    padding-inline: 20px;
  }

  .app-content__body {
    padding: 16px 16px 20px;
  }

  .app-content__body--fixed-list {
    padding-bottom: 10px;
  }
}
</style>
