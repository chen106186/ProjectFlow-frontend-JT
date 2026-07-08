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
            <span>管理员</span>
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
      <a-layout-sider v-model:collapsed="isSiderCollapsed" class="app-sider" :width="212" :collapsed-width="64" collapsible theme="light">
        <a-menu mode="inline" :open-keys="openKeys" :selected-keys="selectedKeys" @open-change="handleOpenChange">
          <a-menu-item key="/" @click="handleNavigate('/')">
            <HomeOutlined />
            <span>首页</span>
          </a-menu-item>

          <a-sub-menu key="personal">
            <template #icon><UsergroupAddOutlined /></template>
            <template #title>个人工作</template>
            <a-menu-item key="/personal/tasks" @click="handleNavigate('/personal/tasks')">我的任务</a-menu-item>
            <a-menu-item key="/personal/bugs" @click="handleNavigate('/personal/bugs')">我的 Bug</a-menu-item>
            <a-menu-item key="/personal/daily" @click="handleNavigate('/personal/daily')">我的日报</a-menu-item>
            <a-menu-item key="/personal/statistics" @click="handleNavigate('/personal/statistics')">我的统计</a-menu-item>
          </a-sub-menu>

          <a-sub-menu key="projects">
            <template #icon><ProjectOutlined /></template>
            <template #title>项目清单</template>
            <a-menu-item key="/projects/management" @click="handleNavigate('/projects/management')">管理类项目</a-menu-item>
            <a-menu-item key="/projects/execution" @click="handleNavigate('/projects/execution')">执行类项目</a-menu-item>
          </a-sub-menu>

          <a-sub-menu key="tasks">
            <template #icon><UnorderedListOutlined /></template>
            <template #title>任务列表</template>
            <a-menu-item key="/tasks/all" @click="handleNavigate('/tasks/all')">全部任务</a-menu-item>
            <a-menu-item key="/tasks/development" @click="handleNavigate('/tasks/development')">开发任务</a-menu-item>
            <a-menu-item key="/tasks/testing" @click="handleNavigate('/tasks/testing')">测试任务</a-menu-item>
          </a-sub-menu>

          <a-menu-item key="/bugs" @click="handleNavigate('/bugs')">
            <BugOutlined />
            <span>Bug 列表</span>
          </a-menu-item>
        </a-menu>
      </a-layout-sider>

      <a-layout-content class="app-content">
        <header v-if="route.name !== 'Home'" class="app-content__header">
          <a-breadcrumb>
            <a-breadcrumb-item v-for="(item, index) in breadcrumbItems" :key="item.title">
              <router-link v-if="item.path && index < breadcrumbItems.length - 1" :to="item.path">{{ item.title }}</router-link>
              <span v-else>{{ item.title }}</span>
            </a-breadcrumb-item>
          </a-breadcrumb>
        </header>
        <div :class="['app-content__body', { 'app-content__body--fixed': route.meta.isBugPage || route.meta.isProjectPage }]">
          <router-view />
        </div>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup>
import {
  BellOutlined,
  BugOutlined,
  DownOutlined,
  HomeOutlined,
  LogoutOutlined,
  ProjectOutlined,
  UnorderedListOutlined,
  UsergroupAddOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const isSiderCollapsed = ref(false)
const openKeys = ref([])
const selectedKeys = computed(() => {
  if (route.path.startsWith('/bugs')) return ['/bugs']
  if (route.path.startsWith('/projects/management')) return ['/projects/management']
  if (route.path.startsWith('/projects/execution')) return ['/projects/execution']
  return [route.path]
})
const groupPathMap = {
  '个人工作': '/personal/tasks',
  '项目清单': '/projects/management',
  '任务列表': '/tasks/all',
  'Bug 列表': '/bugs',
}
const breadcrumbItems = computed(() => {
  const items = []
  const group = route.meta.group
  const parentTitle = route.meta.parentTitle
  const title = route.meta.title || '首页'

  if (group) {
    items.push({ title: group, path: groupPathMap[group] })
  }

  if (parentTitle && parentTitle !== title) {
    items.push({ title: parentTitle, path: route.path.startsWith('/projects/execution') ? '/projects/execution' : '/projects/management' })
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
    items.push({ title: 'Bug详情' })
  }

  return items
})

const routeGroupMap = {
  '/personal': 'personal',
  '/projects': 'projects',
  '/tasks': 'tasks',
}

const syncOpenKeys = path => {
  const group = Object.entries(routeGroupMap).find(([prefix]) => path.startsWith(prefix))?.[1]
  openKeys.value = group ? [group] : []
}

watch(() => route.path, syncOpenKeys, { immediate: true })

const handleOpenChange = keys => {
  openKeys.value = keys.slice(-1)
}

const handleNavigate = path => {
  router.push(path)
}

const handleUserMenuClick = ({ key }) => {
  if (key === 'logout') {
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
  color: #fff;
}

.app-header__icon:hover,
.app-user:hover {
  color: #fff !important;
  background: rgb(255 255 255 / 10%) !important;
}

.app-user {
  display: inline-flex;
  gap: 9px;
  align-items: center;
  height: 44px;
  padding: 0 8px;
}

.app-user__arrow {
  margin-left: 3px;
  font-size: 11px;
}

.app-layout__body {
  height: calc(100vh - 68px);
  min-height: 0;
  overflow: hidden;
}

.app-sider {
  overflow: hidden;
  border-right: 1px solid #edf0f3;
}

.app-sider :deep(.ant-layout-sider-children) {
  padding-top: 4px;
  background: #fff;
}

.app-sider :deep(.ant-menu) {
  border-inline-end: 0;
}

.app-sider :deep(.ant-menu-item),
.app-sider :deep(.ant-menu-submenu-title) {
  width: calc(100% - 8px);
  margin-inline: 4px;
}

.app-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  background: #f5f5f7;
}

.app-content__header {
  display: flex;
  flex: 0 0 52px;
  align-items: center;
  justify-content: flex-start;
  padding: 0 28px;
  background: #fff;
  border-bottom: 1px solid #edf0f3;
}

.app-content__header :deep(.ant-breadcrumb) {
  font-size: 16px;
  line-height: 24px;
}

.app-content__body {
  flex: 1;
  min-height: 0;
  padding: 20px 28px 32px;
  overflow-x: hidden;
  overflow-y: auto;
  background: #f5f5f7;
}

.app-content__body--fixed {
  overflow: hidden;
}
</style>
