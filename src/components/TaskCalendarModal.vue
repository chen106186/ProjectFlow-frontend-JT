<template>
  <a-modal
    :open="open"
    :closable="false"
    :footer="null"
    :get-container="false"
    :mask="false"
    wrap-class-name="task-calendar-modal-wrap"
    @cancel="handleClose"
  >
    <section class="task-calendar-modal" aria-label="任务日历">
      <header class="task-calendar-modal__header">
        <h2>任务日历</h2>
        <a-button type="text" aria-label="关闭任务日历" @click="handleClose">
          <CloseOutlined />
        </a-button>
      </header>

      <div class="task-calendar-modal__body">
        <div class="task-calendar-modal__calendar">
          <a-spin :spinning="monthLoading">
            <a-calendar v-model:value="calendarValue" @select="handleDateSelect">
              <template #headerRender="{ value, onChange }">
                <div class="full-calendar-header">
                  <a-space :size="6">
                    <a-button type="text" aria-label="上个月" @click="handleMonthChange(value, onChange, -1)">
                      <LeftOutlined />
                    </a-button>
                    <strong>{{ value.format('YYYY年M月') }}</strong>
                    <a-button type="text" aria-label="下个月" @click="handleMonthChange(value, onChange, 1)">
                      <RightOutlined />
                    </a-button>
                    <a-button size="small" @click="handleToday(onChange)">今天</a-button>
                  </a-space>
                </div>
              </template>

              <template #dateCellRender="{ current }">
                <ul class="calendar-task-list">
                  <li v-for="task in getCalendarTasks(current).slice(0, 4)" :key="task.id || task.name" :title="task.name">
                    <span class="calendar-task-list__dot" :class="`calendar-task-list__dot--${taskCalendarStatus(task)}`" />
                    <span>{{ task.name }}</span>
                  </li>
                </ul>
              </template>
            </a-calendar>
          </a-spin>

          <div class="calendar-legend" aria-label="任务状态图例">
            <span v-for="item in statusLegend" :key="item.key">
              <i :class="`calendar-task-list__dot--${item.key}`" />{{ item.label }}
            </span>
          </div>
        </div>

        <aside class="daily-task-panel">
          <header class="daily-task-panel__header">
            <strong>{{ selectedDate.format('YYYY-MM-DD') }}</strong>
            <span v-if="selectedDate.isSame(today, 'day')">（今天）</span>
            <a-tag>{{ dayTasks.length }} 项</a-tag>
          </header>

          <a-spin :spinning="dayLoading">
            <div class="daily-task-panel__list">
              <button v-for="task in dayTasks" :key="task.id" class="daily-task-card" :class="`daily-task-card--${taskCardStatus(task)}`" type="button" @click="handleTaskClick(task)">
                <span class="daily-task-card__priority" :class="`daily-task-card__priority--${priorityKey(task.priority)}`">
                  <component :is="priorityIcon(task.priority)" />
                  {{ priorityLabel(task.priority) }}
                </span>
                <span class="daily-task-card__content">
                  <strong>{{ task.name }}</strong>
                  <small>{{ task.assigneeName || '待分配' }}　|　{{ task.plannedEndDate }} 截止　|　{{ task.projectName || '-' }}</small>
                </span>
                <span class="daily-task-card__state" :class="`daily-task-card__state--${taskCardStatus(task)}`">{{ statusLabel(task) }}</span>
                <span class="daily-task-card__remaining" :class="`daily-task-card__remaining--${taskCardStatus(task)}`">{{ remainingLabel(task) }}</span>
                <RightOutlined class="daily-task-card__arrow" />
              </button>
            </div>

            <a-empty v-if="!dayLoading && dayTasks.length === 0" class="daily-task-panel__empty" description="当日暂无任务" />
          </a-spin>
        </aside>
      </div>
    </section>
  </a-modal>
</template>

<script setup>
import {
  CloseOutlined,
  ExclamationCircleOutlined,
  FireOutlined,
  FlagOutlined,
  LeftOutlined,
  MinusCircleOutlined,
  RightOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import updateLocale from 'dayjs/plugin/updateLocale'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { getTaskCalendarDay, getTaskCalendarMonth } from '@/api/dashboard'

dayjs.extend(updateLocale)
dayjs.updateLocale('zh-cn', { weekStart: 0 })

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open'])

const router = useRouter()

const today = dayjs()
const calendarValue = ref(today)
const selectedDate = ref(today)
const monthLoading = ref(false)
const dayLoading = ref(false)
const monthData = ref({})
const dayTasks = ref([])

const statusLegend = [
  { key: 'urgent', label: '紧急' },
  { key: 'overdue', label: '逾期' },
  { key: 'dueSoon', label: '即将到期' },
  { key: 'inProgress', label: '进行中' },
  { key: 'notStarted', label: '未开始' },
  { key: 'completed', label: '已完成' },
]

const taskCalendarStatus = task => {
  if (task.priority === 'URGENT' && task.status !== 'COMPLETED') return 'urgent'
  const map = { OVERDUE: 'overdue', DUE_SOON: 'dueSoon', IN_PROGRESS: 'inProgress', COMPLETED: 'completed', PAUSED: 'notStarted', NOT_STARTED: 'notStarted' }
  return map[task.status] || 'notStarted'
}

const taskCardStatus = task => taskCalendarStatus(task)

const statusLabel = task => {
  const s = taskCardStatus(task)
  const map = { overdue: '逾期', urgent: '紧急', dueSoon: '即将到期', inProgress: '进行中', completed: '已完成', notStarted: '未开始' }
  return map[s] || '未开始'
}

const remainingLabel = task => {
  if (task.overdueDays > 0) return `逾期 ${task.overdueDays} 天`
  if (task.status === 'COMPLETED') return '已完成'
  if (task.remainingDays === 0) return '今天截止'
  if (task.remainingDays != null) return `剩余 ${task.remainingDays} 天`
  return '-'
}

const priorityKey = priority => {
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

const getCalendarTasks = current => {
  const key = current.format('YYYY-MM-DD')
  return monthData.value[key] || []
}

const fetchMonth = async (month) => {
  monthLoading.value = true
  try {
    const res = await getTaskCalendarMonth(month.format('YYYY-MM'))
    const map = {}
    if (res?.days) {
      for (const day of res.days) {
        if (day.tasks?.length) map[day.date] = day.tasks
      }
    }
    monthData.value = map
  } finally {
    monthLoading.value = false
  }
}

const fetchDay = async (date) => {
  dayLoading.value = true
  try {
    const res = await getTaskCalendarDay(date.format('YYYY-MM-DD'))
    dayTasks.value = res?.tasks || []
  } finally {
    dayLoading.value = false
  }
}

watch(() => props.open, isOpen => {
  if (isOpen) {
    calendarValue.value = today
    selectedDate.value = today
    fetchMonth(today)
    fetchDay(today)
  }
})

const handleDateSelect = value => {
  selectedDate.value = value
  fetchDay(value)
}

const handleMonthChange = (value, onChange, offset) => {
  const next = value.clone().add(offset, 'month')
  onChange(next)
  selectedDate.value = next.startOf('month')
  fetchMonth(next)
  fetchDay(next.startOf('month'))
}

const handleToday = onChange => {
  onChange(today)
  selectedDate.value = today
  fetchMonth(today)
  fetchDay(today)
}

const handleTaskClick = task => {
  emit('update:open', false)
  router.push({ name: 'AllTasks', query: { detail: 'task', taskId: task.id } })
}

const handleClose = () => {
  emit('update:open', false)
}
</script>

<style scoped>
.task-calendar-modal {
  height: 100%;
  overflow: hidden;
}

.task-calendar-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 18px 0 24px;
  border-bottom: 1px solid #f0f0f0;
}

.task-calendar-modal__header h2 {
  margin: 0;
  color: #1f1f1f;
  font-size: 20px;
  font-weight: 600;
}

.task-calendar-modal__body {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(340px, 0.95fr);
  gap: 26px;
  height: calc(100% - 52px);
  padding: 12px 24px 16px;
  overflow: hidden;
}

.task-calendar-modal__calendar {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
}

.task-calendar-modal__calendar :deep(.ant-picker-calendar) {
  flex: 1;
  min-height: 0;
}

.task-calendar-modal__calendar :deep(.ant-picker-calendar-header) {
  padding: 0 0 8px;
}

.task-calendar-modal__calendar :deep(.ant-picker-content) {
  height: calc(100vh - 230px);
}

.task-calendar-modal__calendar :deep(.ant-picker-cell-inner) {
  min-height: 96px;
  padding: 4px 5px;
  border-radius: 6px;
}

.task-calendar-modal__calendar :deep(.ant-picker-cell-selected .ant-picker-cell-inner) {
  background: #e6f4ff;
  outline: 1px solid #1677ff;
}

.task-calendar-modal__calendar :deep(.ant-picker-calendar-date-value) {
  font-size: 13px;
}

.full-calendar-header {
  display: flex;
  align-items: center;
  min-height: 34px;
}

.calendar-task-list {
  display: grid;
  gap: 2px;
  padding: 2px 0 0;
  margin: 0;
  list-style: none;
}

.calendar-task-list li {
  display: flex;
  gap: 4px;
  align-items: flex-start;
  min-width: 0;
  color: #434343;
  font-size: 12px;
  line-height: 17px;
}

.calendar-task-list li > span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calendar-task-list__dot,
.calendar-legend i {
  flex: 0 0 auto;
  width: 5px;
  height: 5px;
  margin-top: 6px;
  background: #bfbfbf;
  border-radius: 50%;
}

.calendar-task-list__dot--urgent {
  background: #f5222d !important;
}

.calendar-task-list__dot--overdue {
  background: #ff4d4f !important;
}

.calendar-task-list__dot--dueSoon {
  background: #fa8c16 !important;
}

.calendar-task-list__dot--inProgress {
  background: #40a9ff !important;
}

.calendar-task-list__dot--notStarted {
  background: #8c8c8c !important;
}

.calendar-task-list__dot--completed {
  background: #73d13d !important;
}

.calendar-legend {
  display: flex;
  gap: 14px;
  align-items: center;
  height: 28px;
  color: #8c8c8c;
  font-size: 12px;
}

.calendar-legend span {
  display: inline-flex;
  gap: 5px;
  align-items: center;
}

.calendar-legend i {
  display: inline-block;
  margin-top: 0;
}

.daily-task-panel {
  min-width: 0;
  overflow: hidden;
}

.daily-task-panel__header {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 42px;
  border-bottom: 1px solid #f0f0f0;
}

.daily-task-panel__header strong {
  font-size: 16px;
}

.daily-task-panel__header span {
  color: #8c8c8c;
}

.daily-task-panel__list {
  display: grid;
  gap: 8px;
  padding-top: 10px;
  overflow-y: auto;
  max-height: calc(100vh - 220px);
}

.daily-task-card {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) 62px 72px 16px;
  gap: 8px;
  align-items: center;
  min-height: 54px;
  padding: 6px 8px;
  text-align: left;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-left-width: 3px;
  border-radius: 7px;
  cursor: pointer;
}

.daily-task-card--overdue {
  background: #fff7f7;
  border-color: #ffccc7;
}

.daily-task-card--urgent {
  background: #fff7f7;
  border-color: #ffccc7;
}

.daily-task-card--dueSoon {
  background: #fffaf0;
  border-color: #ffe7ba;
}

.daily-task-card--inProgress {
  background: #f7fbff;
  border-color: #bae0ff;
}

.daily-task-card--notStarted {
  background: #fafafa;
  border-color: #d9d9d9;
}

.daily-task-card--completed {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.daily-task-card__priority {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  height: 28px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 5px;
}

.daily-task-card__priority--urgent {
  color: #f5222d;
  background: #fff1f0;
}

.daily-task-card__priority--high {
  color: #fa8c16;
  background: #fff7e6;
}

.daily-task-card__priority--medium {
  color: #d4b106;
  background: #fffbe6;
}

.daily-task-card__priority--low {
  color: #1677ff;
  background: #e6f4ff;
}

.daily-task-card__content {
  min-width: 0;
}

.daily-task-card__content strong,
.daily-task-card__content small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.daily-task-card__content strong {
  color: #262626;
  font-size: 12px;
}

.daily-task-card__content small {
  margin-top: 3px;
  color: #8c8c8c;
  font-size: 10px;
}

.daily-task-card__state {
  padding: 3px 6px;
  color: #fff;
  font-size: 10px;
  text-align: center;
  background: #8c8c8c;
  border-radius: 4px;
}

.daily-task-card__state--overdue,
.daily-task-card__state--urgent {
  background: #f5222d;
}

.daily-task-card__state--dueSoon {
  background: #fa8c16;
}

.daily-task-card__state--inProgress {
  background: #1677ff;
}

.daily-task-card__state--completed {
  background: #52c41a;
}

.daily-task-card__remaining {
  color: #595959;
  font-size: 11px;
  text-align: center;
}

.daily-task-card__remaining--overdue,
.daily-task-card__remaining--urgent {
  color: #f5222d;
  font-weight: 600;
}

.daily-task-card__remaining--dueSoon {
  color: #fa8c16;
  font-weight: 600;
}

.daily-task-card__remaining--inProgress {
  color: #1677ff;
  font-weight: 600;
}

.daily-task-card__remaining--completed {
  color: #52c41a;
  font-weight: 600;
}

.daily-task-card__arrow {
  color: #8c8c8c;
  font-size: 10px;
}

.daily-task-panel__empty {
  margin-top: 80px;
}

@media (max-width: 1360px) {
  .task-calendar-modal__body {
    grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.95fr);
    gap: 18px;
    padding-inline: 18px;
  }

  .daily-task-card {
    grid-template-columns: 50px minmax(0, 1fr) 56px 64px 14px;
    gap: 5px;
  }
}
</style>

<style>
body .ant-modal-root .task-calendar-modal-wrap {
  position: fixed;
  inset: 68px 0 0 212px;
  width: auto;
  height: auto;
  overflow: hidden;
}

.task-calendar-modal-wrap .ant-modal {
  top: 18px;
  width: calc(100% - 40px) !important;
  max-width: none;
  padding-bottom: 0;
  margin: 0 20px;
}

.task-calendar-modal-wrap .ant-modal-content {
  height: calc(100vh - 104px);
  padding: 0;
  overflow: hidden;
  border-radius: 10px;
  box-shadow: 0 14px 38px rgb(15 35 55 / 12%);
}

.task-calendar-modal-wrap .ant-modal-body {
  height: 100%;
}
</style>
