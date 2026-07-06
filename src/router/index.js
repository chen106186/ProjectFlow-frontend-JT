import { createRouter, createWebHistory } from 'vue-router'

import AppLayout from '@/layouts/AppLayout.vue'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import ModuleView from '@/views/ModuleView.vue'

const moduleRoutes = [
  { path: 'personal/tasks', name: 'PersonalTasks', title: '我的任务', group: '个人工作' },
  { path: 'personal/bugs', name: 'PersonalBugs', title: '我的 Bug', group: '个人工作' },
  { path: 'personal/daily', name: 'PersonalDaily', title: '我的日报', group: '个人工作' },
  { path: 'personal/statistics', name: 'PersonalStatistics', title: '我的统计', group: '个人工作' },
  { path: 'projects/management', name: 'ManagementProjects', title: '管理类项目', group: '项目清单' },
  { path: 'projects/execution', name: 'ExecutionProjects', title: '执行类项目', group: '项目清单' },
  { path: 'tasks/all', name: 'AllTasks', title: '全部任务', group: '任务列表' },
  { path: 'tasks/development', name: 'DevelopmentTasks', title: '开发任务', group: '任务列表' },
  { path: 'tasks/testing', name: 'TestingTasks', title: '测试任务', group: '任务列表' },
  { path: 'bugs', name: 'BugList', title: 'Bug 列表', group: 'Bug 列表' },
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
