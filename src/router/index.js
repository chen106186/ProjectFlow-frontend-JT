import { createRouter, createWebHistory } from 'vue-router'

import AppLayout from '@/layouts/AppLayout.vue'
import BugManagementView from '@/views/bug-management-view/index.vue'
import ExecutionProject from '@/views/execution-project/index.vue'
import ExecutionProjectDetail from '@/views/execution-project/DetailView.vue'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import ManagementProject from '@/views/management-project/index.vue'
import ModuleView from '@/views/ModuleView.vue'
import RoleManagement from '@/views/system-settings/RoleManagement.vue'
import UserManagement from '@/views/system-settings/UserManagement.vue'

const moduleRoutes = [
  { path: 'personal/tasks', name: 'PersonalTasks', title: '我的任务', group: '个人工作' },
  { path: 'personal/bugs', name: 'PersonalBugs', title: '我的 Bug', group: '个人工作' },
  { path: 'personal/daily', name: 'PersonalDaily', title: '我的日报', group: '个人工作' },
  { path: 'personal/statistics', name: 'PersonalStatistics', title: '我的统计', group: '个人工作' },
  { path: 'tasks/all', name: 'AllTasks', title: '全部任务', group: '任务列表' },
  { path: 'tasks/development', name: 'DevelopmentTasks', title: '开发任务', group: '任务列表' },
  { path: 'tasks/testing', name: 'TestingTasks', title: '测试任务', group: '任务列表' },
  { path: 'requirements', name: 'RequirementManagement', title: '需求管理', group: '需求管理' },
  { path: 'files', name: 'FileManagement', title: '文件管理', group: '文件管理' },
  { path: 'daily-reports', name: 'DailyReportManagement', title: '日报管理', group: '日报管理' },
  { path: 'project-reports', name: 'ProjectReportManagement', title: '项目汇报管理', group: '项目汇报管理' },
  { path: 'settings/logs', name: 'OperationLogManagement', title: '操作日志', group: '系统设置' },
]

const bugRoutes = [
  { path: 'bugs', name: 'BugList', title: 'Bug 列表', view: 'list' },
  { path: 'bugs/new', name: 'BugCreate', title: '新增 Bug', view: 'create' },
  { path: 'bugs/:id/edit', name: 'BugEdit', title: '编辑 Bug', view: 'edit' },
  { path: 'bugs/:id', name: 'BugDetail', title: 'Bug 详情', view: 'detail' },
]

const managementProjectRoutes = [
  { path: 'projects/management', name: 'ManagementProjects', title: '管理类项目', view: 'list' },
  { path: 'projects/management/new', name: 'ManagementProjectCreate', title: '新建项目', view: 'create' },
  { path: 'projects/management/:id/edit', name: 'ManagementProjectEdit', title: '编辑项目', view: 'edit' },
  { path: 'projects/management/:id', name: 'ManagementProjectDetail', title: '项目详情', view: 'detail' },
]

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: LoginView,
      meta: { title: '登录' },
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'Home',
          component: HomeView,
          meta: { title: '首页' },
        },
        ...bugRoutes.map(route => ({
          path: route.path,
          name: route.name,
          component: BugManagementView,
          meta: {
            title: route.title,
            group: 'Bug 列表',
            bugView: route.view,
            isBugPage: true,
          },
        })),
        ...managementProjectRoutes.map(route => ({
          path: route.path,
          name: route.name,
          component: ManagementProject,
          meta: {
            title: route.title,
            group: '项目清单',
            parentTitle: '管理类项目',
            projectView: route.view,
            isProjectPage: true,
          },
        })),
        {
          path: 'projects/execution',
          name: 'ExecutionProjects',
          component: ExecutionProject,
          meta: { title: '执行类项目', group: '项目清单' },
        },
        {
          path: 'projects/execution/:id',
          name: 'ExecutionProjectDetail',
          component: ExecutionProjectDetail,
          meta: {
            title: '项目详情',
            group: '项目清单',
            parentTitle: '执行类项目',
            isProjectPage: true,
          },
        },
        {
          path: 'settings/users',
          name: 'UserManagement',
          component: UserManagement,
          meta: {
            title: '用户管理',
            group: '系统设置',
          },
        },
        {
          path: 'settings/roles',
          name: 'RoleManagement',
          component: RoleManagement,
          meta: {
            title: '角色管理',
            group: '系统设置',
          },
        },
        ...moduleRoutes.map(route => ({
          path: route.path,
          name: route.name,
          component: ModuleView,
          meta: {
            title: route.title,
            group: route.group,
          },
        })),
      ],
    },
  ],
})

router.afterEach(to => {
  document.title = `${to.meta.title || '首页'} - 项目与开发管理系统`
})

export default router
