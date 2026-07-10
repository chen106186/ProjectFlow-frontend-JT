<template>
  <div class="home-view">
    <section class="home-metrics" aria-label="项目概览">
      <button v-for="metric in metrics" :key="metric.title" class="metric-card" type="button" @click="handleMetricClick(metric.path)">
        <span class="metric-card__icon" :class="metric.iconClass"><component :is="metric.icon" /></span>
        <span class="metric-card__label">{{ metric.title }}</span>
        <span class="metric-card__value">{{ summaryLoading ? '--' : metric.value }}</span>
      </button>
    </section>

    <section class="home-workspace">
      <a-card class="todo-panel" :bordered="false">
        <template #title>
          <span class="panel-title"><ProfileOutlined />待办事项清单</span>
        </template>
        <template #extra>
          <a-tabs v-model:active-key="activeTodoTab" class="todo-tabs" size="small">
            <a-tab-pane key="all" tab="全部" />
            <a-tab-pane key="overdue" tab="逾期" />
            <a-tab-pane key="urgent" tab="紧急" />
            <a-tab-pane key="bug" tab="BUG" />
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
              >
                <span class="todo-card__type" :class="`todo-card__type--${item.itemType === 'BUG' ? 'bug' : 'task'}`">
                  {{ item.itemType === 'BUG' ? 'BUG' : '任务' }}
                </span>
                <span class="todo-card__priority" :class="`todo-card__priority--${todoPriorityKey(item.priority)}`">
                  <component :is="priorityIcon(item.priority)" />
                  {{ priorityLabel(item.priority) }}
                </span>
                <span class="todo-card__content">
                  <strong>{{ item.title }}</strong>
                  <small>{{ item.ownerName || '待分配' }}　|　{{ item.plannedEndDate || '-' }} 截止　|　{{ item.projectName || '-' }}</small>
                </span>
                <span class="todo-card__badge" :class="`todo-card__badge--${todoStatus(item)}`">{{ todoStatusLabel(item) }}</span>
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
        <a-button type="link" block @click="handleCalendarClick">
          <CalendarOutlined />
          查看完整日历
        </a-button>
      </a-card>
    </section>

    <TaskCalendarModal v-model:open="isCalendarVisible" />
  </div>
</template>

<script setup>
import {
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
import dayjs from 'dayjs'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getDashboardSummary, getDashboardTodos } from '@/api/dashboard'
import TaskCalendarModal from '@/components/TaskCalendarModal.vue'

const router = useRouter()
const activeTodoTab = ref('all')
const calendarValue = ref(dayjs())
const isCalendarVisible = ref(false)
const summaryLoading = ref(false)
const todoLoading = ref(false)
const summary = ref({ managementProjectCount: 0, executionProjectCount: 0, inProgressProjectCount: 0, completedProjectCount: 0 })
const todos = ref([])

const metrics = computed(() => [
  { title: '管理类项目', path: '/projects/management', icon: FolderOpenOutlined, iconClass: 'metric-card__icon--blue', value: summary.value.managementProjectCount },
  { title: '执行类项目', path: '/projects/execution', icon: CheckCircleOutlined, iconClass: 'metric-card__icon--green', value: summary.value.executionProjectCount },
  { title: '进行中项目', path: '/projects/execution', icon: ClockCircleOutlined, iconClass: 'metric-card__icon--orange', value: summary.value.inProgressProjectCount },
  { title: '已完成项目', path: '/projects/execution', icon: CheckCircleOutlined, iconClass: 'metric-card__icon--purple', value: summary.value.completedProjectCount },
])

const filteredTodos = computed(() => {
  if (activeTodoTab.value === 'all') return todos.value
  if (activeTodoTab.value === 'overdue') return todos.value.filter(t => t.overdueDays > 0)
  if (activeTodoTab.value === 'urgent') return todos.value.filter(t => t.priority === 'URGENT')
  if (activeTodoTab.value === 'bug') return todos.value.filter(t => t.itemType === 'BUG')
  return todos.value
})

const todoStatus = item => {
  if (item.overdueDays > 0) return 'overdue'
  if (item.priority === 'URGENT') return 'urgent'
  const s = item.status
  if (s === 'DUE_SOON' || s === 'PENDING_VERIFY') return 'dueSoon'
  if (s === 'IN_PROGRESS' || s === 'FIXING') return 'inProgress'
  if (s === 'COMPLETED' || s === 'CLOSED') return 'completed'
  return 'notStarted'
}

const todoStatusLabel = item => {
  const s = todoStatus(item)
  const map = { overdue: '逾期', urgent: '紧急', dueSoon: '即将到期', inProgress: '进行中', completed: '已完成', notStarted: '未开始' }
  return map[s] || '未开始'
}

const todoRemaining = item => {
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

onMounted(async () => {
  summaryLoading.value = true
  todoLoading.value = true
  try {
    const [s, t] = await Promise.all([getDashboardSummary(), getDashboardTodos()])
    summary.value = s
    todos.value = t
  } finally {
    summaryLoading.value = false
    todoLoading.value = false
  }
})

const handleMetricClick = path => {
  router.push(path)
}

const handleCalendarClick = () => {
  isCalendarVisible.value = true
}

const handleCalendarMonthChange = (value, onChange, offset) => {
  onChange(value.clone().add(offset, 'month'))
}
</script>

<style scoped>
.home-view {
  min-width: 0;
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
  border-radius: 7px;
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) 282px;
  gap: 18px;
}

.todo-panel,
.calendar-panel {
  min-height: 470px;
  border: 1px solid #eef1f4;
  box-shadow: 0 2px 8px rgb(0 0 0 / 3%);
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

.todo-panel :deep(.ant-card-extra) {
  padding: 0;
}

.todo-tabs {
  width: 320px;
}

.todo-tabs :deep(.ant-tabs-nav) {
  margin: 0;
}

.todo-tabs :deep(.ant-tabs-content-holder) {
  display: none;
}

.todo-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 350px;
  color: #bfbfbf;
  font-size: 13px;
}

.todo-list {
  display: grid;
  gap: 8px;
}

.todo-card {
  display: grid;
  grid-template-columns: 36px 54px minmax(0, 1fr) 62px 72px;
  gap: 8px;
  align-items: center;
  min-height: 54px;
  padding: 6px 12px;
  text-align: left;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-left-width: 3px;
  border-radius: 7px;
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

@media (max-width: 1200px) {
  .home-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
