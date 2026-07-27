<template>
  <div class="home-view">
    <section class="home-metrics" aria-label="项目概览">
      <button v-for="metric in metrics" :key="metric.title" class="metric-card" type="button" @click="handleMetricClick(metric)">
        <span class="metric-card__icon" :class="metric.iconClass"><component :is="metric.icon" /></span>
        <span class="metric-card__label">{{ metric.title }}</span>
        <span class="metric-card__value">{{ summaryLoading ? '--' : metric.value }}</span>
      </button>
    </section>

    <section class="home-workspace">
      <a-card class="todo-panel" :bordered="false">
        <template #title>
          <span class="panel-title"><ProfileOutlined />{{ isGmOffice ? '全部待办事项' : '待办事项清单' }}</span>
        </template>
        <template #extra>
          <a-tabs v-model:active-key="activeTodoTab" class="todo-tabs" size="small">
            <a-tab-pane key="all" :tab="`全部（${todoCounts.all}）`" />
            <a-tab-pane key="task" :tab="`任务（${todoCounts.task}）`" />
            <a-tab-pane key="overdue" :tab="`逾期（${todoCounts.overdue}）`" />
            <a-tab-pane key="urgent" :tab="`紧急（${todoCounts.urgent}）`" />
            <a-tab-pane key="bug" :tab="`BUG（${todoCounts.bug}）`" />
            <a-tab-pane key="requirement" :tab="`需求（${todoCounts.requirement}）`" />
          </a-tabs>
        </template>
        <a-spin :spinning="todoLoading">
          <template v-if="filteredTodos.length > 0">
            <div class="todo-list">
              <button
                v-for="item in filteredTodos"
                :key="`${item.itemType}-${item.businessId}`"
                class="todo-card"
                :class="`todo-card--${todoStatus(item)}`"
                type="button"
                @click="handleTodoClick(item)"
              >
                <span class="todo-card__type" :class="`todo-card__type--${todoItemTypeKey(item.itemType)}`">
                  {{ todoItemTypeLabel(item.itemType) }}
                </span>
                <span class="todo-card__priority" :class="`todo-card__priority--${todoPriorityKey(item.priority)}`">
                  <component :is="priorityIcon(item.priority)" />
                  {{ priorityLabel(item.priority) }}
                </span>
                <span class="todo-card__content">
                  <strong>{{ item.title }}</strong>
                  <small v-if="item.itemType === 'BUG'">创建人：{{ item.creatorName || '-' }}　|　指定人：{{ item.ownerName || '-' }}　|　项目：{{ item.projectName || '-' }}</small>
                  <small v-else-if="item.itemType === 'REQUIREMENT'">创建人：{{ item.ownerName || '-' }}　|　需求类型：{{ requirementTypeLabel(item.requirementType) }}　|　项目：{{ item.projectName || '-' }}</small>
                  <small v-else>{{ item.ownerName || '待分配' }}　|　{{ item.plannedEndDate || '-' }} 截止　|　{{ item.projectName || '-' }}</small>
                </span>
                <span class="todo-card__badge" :class="`todo-card__badge--${todoBadgeStatus(item)}`">{{ todoStatusLabel(item) }}</span>
                <span class="todo-card__remaining" :class="`todo-card__remaining--${todoStatus(item)}`">{{ todoRemaining(item) }}</span>
              </button>
            </div>
          </template>
          <div v-else-if="!todoLoading" class="todo-panel__empty">
            <a-empty description="暂无待办数据" />
          </div>
        </a-spin>
      </a-card>

      <a-card class="calendar-panel" :bordered="false">
        <template #title>
          <span class="panel-title"><CalendarOutlined />任务日历</span>
        </template>
        <template #extra>
          <a-button type="link" @click="handleCalendarClick">
            <CalendarOutlined />
            完整任务日历
          </a-button>
        </template>
        <a-calendar v-model:value="calendarValue" :fullscreen="false">
          <template #headerRender="{ value, onChange }">
            <div class="calendar-panel__header">
              <a-button type="text" aria-label="上个月" @click="handleCalendarMonthChange(value, onChange, -1)">
                <LeftOutlined />
              </a-button>
              <span>{{ value.format('YYYY年M月') }}</span>
              <a-button type="text" aria-label="下个月" @click="handleCalendarMonthChange(value, onChange, 1)">
                <RightOutlined />
              </a-button>
            </div>
          </template>
        </a-calendar>
      </a-card>
    </section>

    <TaskCalendarModal v-model:open="isCalendarVisible" />

    <section class="home-stats">
      <div class="stats-header">
        <span class="panel-title"><BarChartOutlined />{{ isGmOffice ? '全员统计' : '我的统计' }}</span>
        <div class="stats-header__right">
          <a-select
            v-if="isGmOffice"
            v-model:value="statsTargetUserId"
            placeholder="查看全员"
            allow-clear
            style="width: 140px; margin-right: 10px;"
            :options="userOptions"
            @change="fetchMyStats"
          />
          <div class="stats-period">
            <button v-for="p in periods" :key="p.value" type="button" :class="['period-btn', { active: statsPeriod === p.value }]" @click="handlePeriodChange(p.value)">{{ p.label }}</button>
          </div>
        </div>
      </div>
      <div class="stats-kpi">
        <div class="kpi-card kpi-card--blue">
          <span class="kpi-label">总任务</span>
          <strong class="kpi-value">{{ statsLoading ? '--' : myStats.myTaskTotal }}</strong>
          <small class="kpi-sub">已完成 {{ myStats.myTaskCompleted }} 个</small>
        </div>
        <div class="kpi-card kpi-card--cyan">
          <span class="kpi-label">已完成</span>
          <strong class="kpi-value">{{ statsLoading ? '--' : myStats.myTaskCompleted }}</strong>
          <small class="kpi-sub">个任务</small>
        </div>
        <div class="kpi-card kpi-card--red">
          <span class="kpi-label">逾期</span>
          <strong class="kpi-value">{{ statsLoading ? '--' : myStats.myTaskOverdue }}</strong>
          <small class="kpi-sub">个任务</small>
        </div>
        <div class="kpi-card kpi-card--orange">
          <span class="kpi-label">我的 Bug</span>
          <strong class="kpi-value">{{ statsLoading ? '--' : myStats.myBugTotal }}</strong>
          <small class="kpi-sub">未关闭 {{ myStats.myBugOpen }}</small>
        </div>
        <div class="kpi-card kpi-card--purple">
          <span class="kpi-label">未关闭 Bug</span>
          <strong class="kpi-value">{{ statsLoading ? '--' : myStats.myBugOpen }}</strong>
          <small class="kpi-sub">个 Bug</small>
        </div>
      </div>
      <div class="stats-charts">
        <a-card class="chart-card" :bordered="false" :body-style="{ padding: '0.75rem 1rem' }">
          <template #title><span class="chart-title">任务完成趋势</span></template>
          <a-spin :spinning="statsLoading">
            <div ref="trendChartRef" class="chart-container"></div>
          </a-spin>
        </a-card>
        <a-card class="chart-card" :bordered="false" :body-style="{ padding: '0.75rem 1rem' }">
          <template #title><span class="chart-title">工作分布</span></template>
          <a-spin :spinning="statsLoading">
            <div class="dist-panels">
              <div class="dist-panel">
                <h4 class="dist-panel__title">项目分布</h4>
                <div ref="projectChartRef" class="chart-container donut-chart"></div>
                <ul class="chart-legend">
                  <li v-if="!projectLegendItems.length" class="legend-empty">暂无数据</li>
                  <li v-for="item in projectLegendItems" :key="item.name">
                    <span class="legend-dot" :style="{ background: item.color }"></span>{{ item.name }} <strong>{{ item.pct }}</strong>
                  </li>
                </ul>
              </div>
              <div class="dist-panel">
                <h4 class="dist-panel__title">任务状态分布</h4>
                <div ref="statusChartRef" class="chart-container donut-chart"></div>
                <ul class="chart-legend">
                  <li v-if="!statusLegendItems.length" class="legend-empty">暂无数据</li>
                  <li v-for="item in statusLegendItems" :key="item.name">
                    <span class="legend-dot" :style="{ background: item.color }"></span>{{ item.name }} <strong>{{ item.pct }}</strong>
                  </li>
                </ul>
              </div>
            </div>
          </a-spin>
        </a-card>
      </div>
    </section>
  </div>
</template>

<script setup>
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FireOutlined,
  FlagOutlined,
  FolderOpenOutlined,
  LeftOutlined,
  MinusCircleOutlined,
  ProfileOutlined,
  RightOutlined,
} from '@ant-design/icons-vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { getDashboardSummary, getDashboardTodos, getMyStatistics } from '@/api/dashboard'
import { getProjectList } from '@/api/managementProject'
import { getUserList } from '@/api/system'
import TaskCalendarModal from '@/components/TaskCalendarModal.vue'
import { canViewAllStatistics } from '@/utils/authScope'
import { useDictStore } from '@/store/dictStore'

echarts.use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const router = useRouter()
const dictStore = useDictStore()
const activeTodoTab = ref('all')
const calendarValue = ref(dayjs())
const isCalendarVisible = ref(false)
const summaryLoading = ref(false)
const todoLoading = ref(false)
const summary = ref({ managementProjectCount: 0, executionProjectCount: 0, inProgressProjectCount: 0, completedProjectCount: 0 })
const todos = ref([])

const isGmOffice = ref(false)
const statsTargetUserId = ref(null)
const userOptions = ref([])

const metrics = computed(() => [
  { title: '管理类项目', path: '/projects/management', icon: FolderOpenOutlined, iconClass: 'metric-card__icon--blue', value: summary.value.managementProjectCount },
  { title: '执行类项目', path: '/projects/execution', icon: CheckCircleOutlined, iconClass: 'metric-card__icon--green', value: summary.value.executionProjectCount },
  { title: '进行中项目', path: { path: '/projects/management', query: { status: 'IN_PROGRESS' } }, detailStatus: 'IN_PROGRESS', icon: ClockCircleOutlined, iconClass: 'metric-card__icon--orange', value: summary.value.inProgressProjectCount },
  { title: '已完成项目', path: { path: '/projects/management', query: { status: 'COMPLETED' } }, detailStatus: 'COMPLETED', icon: CheckCircleOutlined, iconClass: 'metric-card__icon--purple', value: summary.value.completedProjectCount },
])

const filteredTodos = computed(() => {
  if (activeTodoTab.value === 'all') return todos.value
  if (activeTodoTab.value === 'task') return todos.value.filter(t => t.itemType === 'TASK')
  if (activeTodoTab.value === 'overdue') return todos.value.filter(t => t.overdueDays > 0)
  if (activeTodoTab.value === 'urgent') return todos.value.filter(t => t.priority === 'URGENT')
  if (activeTodoTab.value === 'bug') return todos.value.filter(t => t.itemType === 'BUG')
  if (activeTodoTab.value === 'requirement') return todos.value.filter(t => t.itemType === 'REQUIREMENT')
  return todos.value
})

const todoCounts = computed(() => ({
  all: todos.value.length,
  task: todos.value.filter(t => t.itemType === 'TASK').length,
  overdue: todos.value.filter(t => t.overdueDays > 0).length,
  urgent: todos.value.filter(t => t.priority === 'URGENT').length,
  bug: todos.value.filter(t => t.itemType === 'BUG').length,
  requirement: todos.value.filter(t => t.itemType === 'REQUIREMENT').length,
}))

const todoStatus = item => {
  if (item.overdueDays > 0) return 'overdue'
  if (item.priority === 'URGENT') return 'urgent'
  const s = item.status
  if (s === 'DUE_SOON' || s === 'PENDING_VERIFY') return 'dueSoon'
  if (s === 'IN_PROGRESS' || s === 'FIXING') return 'inProgress'
  if (s === 'COMPLETED' || s === 'CLOSED' || s === 'ACCEPTED') return 'completed'
  if (s === 'PENDING_REVIEW') return 'notStarted'
  return 'notStarted'
}

const todoItemTypeKey = type => {
  if (type === 'BUG') return 'bug'
  if (type === 'REQUIREMENT') return 'requirement'
  return 'task'
}

const todoItemTypeLabel = type => {
  if (type === 'BUG') return 'BUG'
  if (type === 'REQUIREMENT') return '需求'
  return '任务'
}

const BUG_STATUS_LABEL = { PENDING_FIX: '待修复', FIXING: '修复中', PENDING_VERIFY: '待验证', CLOSED: '已关闭' }
const BUG_STATUS_BADGE = { FIXING: 'inProgress', PENDING_VERIFY: 'dueSoon', CLOSED: 'completed' }
const REQUIREMENT_STATUS_LABEL = { PENDING_REVIEW: '待评审', ACCEPTED: '已采纳', REJECTED: '已拒绝' }

const requirementTypeLabel = type => dictStore.getDictLabel('requirementType', type) || type || '-'

const todoBadgeStatus = item => {
  if (item.itemType === 'BUG') return BUG_STATUS_BADGE[item.status] || 'dueSoon'
  return todoStatus(item)
}

const todoStatusLabel = item => {
  if (item.itemType === 'BUG') return BUG_STATUS_LABEL[item.status] || item.status
  if (item.itemType === 'REQUIREMENT') return REQUIREMENT_STATUS_LABEL[item.status] || item.status
  const s = todoStatus(item)
  const map = { overdue: '逾期', urgent: '紧急', dueSoon: '即将到期', inProgress: '进行中', completed: '已完成', notStarted: '未开始' }
  return map[s] || '未开始'
}

const todoRemaining = item => {
  if (item.itemType === 'BUG') return '-'
  if (item.overdueDays > 0) return `逾期 ${item.overdueDays} 天`
  if (!item.plannedEndDate) return '-'
  const days = dayjs(item.plannedEndDate).diff(dayjs(), 'day')
  if (days < 0) return `逾期 ${Math.abs(days)} 天`
  if (days === 0) return '今天截止'
  return `剩余 ${days} 天`
}

const todoPriorityKey = priority => {
  const map = { URGENT: 'urgent', HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }
  return map[priority] || 'medium'
}

const priorityLabel = priority => {
  const map = { URGENT: '紧急', HIGH: '高', MEDIUM: '中', LOW: '低' }
  return map[priority] || '中'
}

const priorityIcon = priority => {
  if (priority === 'URGENT') return FireOutlined
  if (priority === 'HIGH') return FlagOutlined
  if (priority === 'MEDIUM') return ExclamationCircleOutlined
  return MinusCircleOutlined
}

const periods = [
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本季度', value: 'quarter' },
  { label: '本年', value: 'year' },
]
const statsPeriod = ref('week')
const statsLoading = ref(false)
const myStats = reactive({ myTaskTotal: 0, myTaskCompleted: 0, myTaskOverdue: 0, myBugTotal: 0, myBugOpen: 0, myRequirementTotal: 0, myRequirementAccepted: 0, unreadNoticeCount: 0, completionTrend: [], projectDistribution: {}, taskStatusDistribution: {} })

const CHART_COLORS = ['#1677ff', '#69b1ff', '#27c27a', '#ff7a45', '#9254de', '#c8cfd9']
const STATUS_LABEL_MAP = { COMPLETED: '已完成', IN_PROGRESS: '进行中', DUE_SOON: '即将到期', OVERDUE: '已逾期', NOT_STARTED: '未开始', PAUSED: '已暂停', OVERDUE_COMPLETED: '逾期完成', OVERDUE_START: '启动逾期', CANCELLED: '已取消' }
const STATUS_COLOR_MAP = { COMPLETED: '#27c27a', IN_PROGRESS: '#1677ff', DUE_SOON: '#ff7a45', OVERDUE: '#ff4d4f', NOT_STARTED: '#c8cfd9', PAUSED: '#9254de', OVERDUE_COMPLETED: '#fa8c16', OVERDUE_START: '#d48806', CANCELLED: '#8c8c8c' }

const projectLegendItems = computed(() => {
  const dist = myStats.projectDistribution || {}
  const total = Object.values(dist).reduce((s, v) => s + Number(v), 0)
  return Object.entries(dist).map(([name, value], i) => ({
    name,
    color: CHART_COLORS[i % CHART_COLORS.length],
    pct: total ? Math.round(Number(value) / total * 100) + '%' : '0%',
  }))
})

const statusLegendItems = computed(() => {
  const dist = myStats.taskStatusDistribution || {}
  const total = Object.values(dist).reduce((s, v) => s + Number(v), 0)
  return Object.entries(dist).map(([code, value]) => ({
    name: STATUS_LABEL_MAP[code] || code,
    color: STATUS_COLOR_MAP[code] || '#c8cfd9',
    pct: total ? Math.round(Number(value) / total * 100) + '%' : '0%',
  }))
})
const trendChartRef = ref()
const projectChartRef = ref()
const statusChartRef = ref()
let trendChart = null
let projectChart = null
let statusChart = null

const initCharts = () => {
  if (trendChartRef.value && !trendChart) trendChart = echarts.init(trendChartRef.value)
  if (projectChartRef.value && !projectChart) projectChart = echarts.init(projectChartRef.value)
  if (statusChartRef.value && !statusChart) statusChart = echarts.init(statusChartRef.value)
}

const createDonutOption = (data, colors, centerText) => ({
  color: colors,
  tooltip: { show: false },
  graphic: [{
    id: 'center',
    type: 'text',
    left: 'center',
    top: 'middle',
    style: { text: centerText ?? '', textAlign: 'center', fill: '#111827', fontSize: 22, fontWeight: 700 },
  }],
  series: [{
    type: 'pie',
    radius: ['68%', '82%'],
    center: ['50%', '50%'],
    avoidLabelOverlap: true,
    label: { show: false },
    labelLine: { show: false },
    data,
  }],
})

const renderTrendChart = () => {
  if (!trendChart) return
  const trend = myStats.completionTrend || []
  const dates = trend.map(p => p.date)
  const values = trend.map(p => p.count)
  trendChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 40, right: 16, top: 16, bottom: 40 },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11, rotate: dates.length > 14 ? 30 : 0, formatter: v => v.slice(5) } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11 } },
    series: [{ name: '完成任务', type: 'line', data: values, smooth: false, symbol: 'circle', symbolSize: 8, itemStyle: { color: '#fff', borderColor: '#2f80ed', borderWidth: 3 }, lineStyle: { width: 3, color: '#2f80ed' }, areaStyle: { color: 'rgba(47,128,237,0.12)' }, label: { show: true, formatter: ({ value }) => value || '', color: '#2f80ed', fontWeight: 700 } }],
  }, true)
}

const renderDistCharts = () => {
  if (!projectChart || !statusChart) return
  const projectDist = myStats.projectDistribution || {}
  const projectData = Object.entries(projectDist).map(([name, value], i) => ({
    value: Number(value), name, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
  }))
  projectChart.setOption(createDonutOption(
    projectData.length ? projectData : [{ value: 1, name: '暂无数据', itemStyle: { color: '#e8e8e8' } }],
    CHART_COLORS,
    projectData.length ? `${projectData.length} 个` : '-',
  ), true)

  const statusDist = myStats.taskStatusDistribution || {}
  const statusData = Object.entries(statusDist).map(([code, value]) => ({
    value: Number(value), name: STATUS_LABEL_MAP[code] || code, itemStyle: { color: STATUS_COLOR_MAP[code] || '#c8cfd9' },
  }))
  const statusTotal = statusData.reduce((s, d) => s + d.value, 0)
  statusChart.setOption(createDonutOption(
    statusData.length ? statusData : [{ value: 1, name: '暂无数据', itemStyle: { color: '#e8e8e8' } }],
    Object.values(STATUS_COLOR_MAP),
    statusData.length ? `${statusTotal} 个` : '-',
  ), true)
}

const fetchMyStats = async () => {
  statsLoading.value = true
  try {
    const data = await getMyStatistics(statsPeriod.value, statsTargetUserId.value)
    Object.assign(myStats, data)
    await nextTick()
    initCharts()
    renderTrendChart()
    renderDistCharts()
  } catch {
    // silent
  } finally {
    statsLoading.value = false
  }
}

const fetchSummary = async () => {
  summaryLoading.value = true
  try {
    summary.value = await getDashboardSummary()
  } catch {
    // silent
  } finally {
    summaryLoading.value = false
  }
}

const handlePeriodChange = period => {
  statsPeriod.value = period
}

watch(statsPeriod, fetchMyStats)

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    fetchSummary()
    fetchMyStats()
  }
}

onMounted(async () => {
  const profile = JSON.parse(localStorage.getItem('authProfile') || '{}')
  isGmOffice.value = canViewAllStatistics(profile)

  dictStore.loadDicts()
  summaryLoading.value = true
  todoLoading.value = true
  try {
    const requests = [getDashboardSummary(), getDashboardTodos()]
    if (isGmOffice.value) requests.push(getUserList({ pageSize: 500, enabled: true }))
    const [summaryResult, todoResult, userResult] = await Promise.allSettled(requests)

    if (summaryResult.status === 'fulfilled') {
      summary.value = summaryResult.value
    }

    if (todoResult.status === 'fulfilled') {
      todos.value = todoResult.value
    }

    if (isGmOffice.value && userResult?.status === 'fulfilled') {
      const records = userResult.value?.records || userResult.value || []
      userOptions.value = records.map(u => ({ value: u.id, label: u.realName || u.username }))
    }
  } finally {
    summaryLoading.value = false
    todoLoading.value = false
  }
  fetchMyStats()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  trendChart?.dispose()
  projectChart?.dispose()
  statusChart?.dispose()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

const handleMetricClick = async metric => {
  if (!metric?.detailStatus) {
    router.push(metric.path)
    return
  }

  try {
    const result = await getProjectList({
      pageNo: 1,
      pageSize: 1,
      projectType: 'MANAGEMENT',
      status: metric.detailStatus,
    })
    const project = result?.records?.[0] || result?.list?.[0]

    if (project?.id) {
      router.push({ name: 'ManagementProjectDetail', params: { id: String(project.id) } })
      return
    }

    message.warning(`暂无${metric.title}`)
  } catch (error) {
    message.error(error?.message || '项目跳转失败')
  }

  if (metric?.path) router.push(metric.path)
}

const handleCalendarClick = () => {
  isCalendarVisible.value = true
}

const handleCalendarMonthChange = (value, onChange, offset) => {
  onChange(value.clone().add(offset, 'month'))
}

const handleTodoClick = item => {
  if (item.itemType === 'BUG') {
    router.push({ name: 'BugDetail', params: { id: item.businessId } })
  } else if (item.itemType === 'REQUIREMENT') {
    router.push({ name: 'PersonalRequirementDetail', params: { id: item.businessId } })
  } else {
    router.push({ name: 'PersonalTasks', query: { detail: 'task', taskId: item.businessId } })
  }
}
</script>

<style scoped>
.home-view {
  width: min(1600px, 100%);
  margin: 0 auto;
}

.home-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 18px;
}

.metric-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 11px;
  align-items: center;
  min-height: 58px;
  padding: 10px 16px;
  color: #262626;
  text-align: left;
  background: #fff;
  border: 1px solid #eef1f4;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.metric-card:hover {
  border-color: #91caff;
  box-shadow: 0 5px 16px rgb(0 0 0 / 6%);
}

.metric-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
}

.metric-card__icon--blue {
  color: #1677ff;
  background: #e6f4ff;
}

.metric-card__icon--green {
  color: #52c41a;
  background: #f6ffed;
}

.metric-card__icon--orange {
  color: #fa8c16;
  background: #fff7e6;
}

.metric-card__icon--purple {
  color: #722ed1;
  background: #f9f0ff;
}

.metric-card__label {
  font-size: 14px;
}

.metric-card__value {
  color: #8c8c8c;
  font-size: 22px;
  font-weight: 600;
}

.home-workspace {
  --home-workspace-panel-height: 500px;

  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
  gap: 18px;
  align-items: start;
}

.todo-panel,
.calendar-panel {
  height: var(--home-workspace-panel-height);
  min-height: 470px;
  border: 1px solid #eef1f4;
  box-shadow: 0 2px 8px rgb(0 0 0 / 3%);
}

.todo-panel {
  display: flex;
  flex-direction: column;
}

.panel-title {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 17px;
  font-weight: 600;
}

.todo-panel :deep(.ant-card-head) {
  min-height: 60px;
}

.todo-panel :deep(.ant-card-head-title) {
  flex: none;
}

.todo-panel :deep(.ant-card-extra) {
  padding: 0;
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.todo-panel :deep(.ant-card-body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.todo-panel :deep(.ant-spin-nested-loading),
.todo-panel :deep(.ant-spin-container) {
  height: 100%;
  min-height: 0;
}

.todo-tabs {
  width: auto;
}

.todo-tabs :deep(.ant-tabs-nav) {
  margin: 0;
}

.todo-tabs :deep(.ant-tabs-tab) {
  padding: 8px 0;
  margin-left: 16px !important;
}

.todo-tabs :deep(.ant-tabs-content-holder) {
  display: none;
}

.todo-tabs :deep(.ant-tabs-nav-more) {
  display: none;
}

.todo-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 0;
  color: #bfbfbf;
  font-size: 13px;
}

.todo-list {
  display: grid;
  grid-auto-rows: 64px;
  gap: 8px;
  align-content: start;
  height: 100%;
  padding-right: 4px;
  overflow-y: auto;
}

.todo-card {
  display: grid;
  grid-template-columns: 36px 54px minmax(0, 1fr) 62px 72px;
  gap: 8px;
  align-items: center;
  height: 64px;
  min-height: 64px;
  padding: 6px 12px;
  text-align: left;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-left-width: 3px;
  border-radius: 8px;
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.todo-card:hover {
  box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
}

.todo-card--overdue {
  background: #fff7f7;
  border-color: #ffccc7;
}

.todo-card--urgent {
  background: #fff7f7;
  border-color: #ffccc7;
}

.todo-card--dueSoon {
  background: #fffaf0;
  border-color: #ffe7ba;
}

.todo-card--inProgress {
  background: #f7fbff;
  border-color: #bae0ff;
}

.todo-card--notStarted {
  background: #fafafa;
  border-color: #d9d9d9;
}

.todo-card--completed {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.todo-card__type {
  padding: 2px 5px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  border-radius: 4px;
}

.todo-card__type--task {
  color: #1677ff;
  background: #e6f4ff;
}

.todo-card__type--bug {
  color: #f5222d;
  background: #fff1f0;
}

.todo-card__type--requirement {
  color: #722ed1;
  background: #f9f0ff;
}

.todo-card__priority {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  justify-content: center;
  height: 26px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 5px;
}

.todo-card__priority--urgent {
  color: #f5222d;
  background: #fff1f0;
}

.todo-card__priority--high {
  color: #fa8c16;
  background: #fff7e6;
}

.todo-card__priority--medium {
  color: #d4b106;
  background: #fffbe6;
}

.todo-card__priority--low {
  color: #1677ff;
  background: #e6f4ff;
}

.todo-card__content {
  min-width: 0;
}

.todo-card__content strong,
.todo-card__content small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-card__content strong {
  color: #262626;
  font-size: 13px;
}

.todo-card__content small {
  margin-top: 3px;
  color: #8c8c8c;
  font-size: 11px;
}

.todo-card__badge {
  padding: 3px 6px;
  color: #fff;
  font-size: 10px;
  text-align: center;
  background: #8c8c8c;
  border-radius: 4px;
}

.todo-card__badge--overdue,
.todo-card__badge--urgent {
  background: #f5222d;
}

.todo-card__badge--dueSoon {
  background: #fa8c16;
}

.todo-card__badge--inProgress {
  background: #1677ff;
}

.todo-card__badge--completed {
  background: #52c41a;
}

.todo-card__remaining {
  color: #595959;
  font-size: 11px;
  text-align: center;
}

.todo-card__remaining--overdue,
.todo-card__remaining--urgent {
  color: #f5222d;
  font-weight: 600;
}

.todo-card__remaining--dueSoon {
  color: #fa8c16;
  font-weight: 600;
}

.todo-card__remaining--inProgress {
  color: #1677ff;
  font-weight: 600;
}

.todo-card__remaining--completed {
  color: #52c41a;
  font-weight: 600;
}

.calendar-panel :deep(.ant-picker-calendar-header) {
  padding-inline: 0;
}

.calendar-panel :deep(.ant-picker-cell-inner) {
  height: 48px;
}

.calendar-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 10px;
  font-weight: 500;
}

.calendar-panel :deep(.ant-card-body) {
  padding: 12px 18px 18px;
}

.home-stats {
  margin-top: 18px;
}

.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.stats-header__right {
  display: flex;
  align-items: center;
}

.stats-period {
  display: flex;
  gap: 4px;
}

.period-btn {
  padding: 4px 14px;
  color: #595959;
  font-size: 13px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.period-btn:hover {
  color: #1677ff;
  border-color: #1677ff;
}

.period-btn.active {
  color: #fff;
  background: #1677ff;
  border-color: #1677ff;
}

.stats-kpi {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.kpi-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 18px;
  background: #fff;
  border: 1px solid #eef1f4;
  border-left-width: 4px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 3%);
}

.kpi-card--blue   { border-left-color: #1677ff; }
.kpi-card--cyan   { border-left-color: #27c27a; }
.kpi-card--red    { border-left-color: #ff4d4f; }
.kpi-card--orange { border-left-color: #fa8c16; }
.kpi-card--purple { border-left-color: #9254de; }

.kpi-label {
  color: #8c8c8c;
  font-size: 13px;
}

.kpi-value {
  color: #262626;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.kpi-sub {
  color: #bfbfbf;
  font-size: 11px;
}

.stats-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-card {
  border: 1px solid #eef1f4;
  box-shadow: 0 2px 8px rgb(0 0 0 / 3%);
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
}

.chart-container {
  height: 220px;
}

.donut-chart {
  height: 140px;
}

.dist-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.dist-panel__title {
  margin: 0 0 6px;
  color: #595959;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
}

.chart-legend {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
}

.chart-legend li {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 2px 0;
  color: #595959;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-legend li strong {
  margin-left: auto;
  color: #262626;
  font-size: 12px;
}

.legend-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-empty {
  color: #bfbfbf;
  font-size: 12px;
}

@media (max-width: 1200px) {
  .home-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .home-workspace {
    grid-template-columns: 1fr;
  }

  .todo-panel,
  .calendar-panel {
    height: auto;
    min-height: auto;
  }

  .stats-kpi {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .stats-charts {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .home-metrics {
    grid-template-columns: 1fr;
  }

  .stats-kpi {
    grid-template-columns: 1fr;
  }
}
</style>
