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
                <li v-for="task in getCalendarTasks(current).slice(0, 4)" :key="task.title" :title="task.title">
                  <span class="calendar-task-list__dot" :class="`calendar-task-list__dot--${task.status}`" />
                  <span>{{ task.title }}</span>
                </li>
              </ul>
            </template>
          </a-calendar>

          <div class="calendar-legend" aria-label="任务状态图例">
            <span v-for="item in statusLegend" :key="item.key">
              <i :class="`calendar-task-list__dot--${item.key}`" />{{ item.label }}
            </span>
          </div>
        </div>

        <aside class="daily-task-panel">
          <header class="daily-task-panel__header">
            <strong>{{ selectedDate.format('YYYY-MM-DD') }}</strong>
            <span v-if="selectedDate.isSame(referenceToday, 'day')">（今天）</span>
            <a-tag>{{ selectedTasks.length }} 项</a-tag>
          </header>

          <div class="daily-task-panel__list">
            <button v-for="task in selectedTasks" :key="task.id" class="daily-task-card" :class="`daily-task-card--${task.status}`" type="button">
              <span class="daily-task-card__priority" :class="`daily-task-card__priority--${task.priorityKey}`">
                <component :is="task.icon" />
                {{ task.priority }}
              </span>
              <span class="daily-task-card__content">
                <strong>{{ task.title }}</strong>
                <small>{{ task.owner }}　|　{{ task.deadline }} 截止　|　{{ task.project }}</small>
              </span>
              <span class="daily-task-card__state" :class="`daily-task-card__state--${task.status}`">{{ task.state }}</span>
              <span class="daily-task-card__remaining" :class="`daily-task-card__remaining--${task.status}`">{{ task.remaining }}</span>
              <RightOutlined class="daily-task-card__arrow" />
            </button>
          </div>

          <a-empty v-if="selectedTasks.length === 0" class="daily-task-panel__empty" description="当日暂无任务" />
        </aside>
      </div>
    </section>
  </a-modal>
</template>

<script setup>
import {
  CheckCircleOutlined,
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
import { computed, ref, watch } from 'vue'

dayjs.extend(updateLocale)
dayjs.updateLocale('zh-cn', {
  weekStart: 0,
})

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:open'])

const referenceToday = dayjs('2026-06-16')
const calendarValue = ref(referenceToday)
const selectedDate = ref(referenceToday)

const statusLegend = [
  { key: 'urgent', label: '紧急' },
  { key: 'overdue', label: '逾期' },
  { key: 'dueSoon', label: '即将到期' },
  { key: 'inProgress', label: '进行中' },
  { key: 'notStarted', label: '未开始' },
  { key: 'completed', label: '已完成' },
]

const calendarTasks = {
  '2026-06-01': [
    { title: '数据库表结构设计', status: 'dueSoon' },
    { title: '项目需求评审会议', status: 'urgent' },
  ],
  '2026-06-02': [
    { title: '权限校验接口联调', status: 'overdue' },
  ],
  '2026-06-03': [
    { title: '订单列表API开发', status: 'dueSoon' },
    { title: '系统部署文档编写', status: 'notStarted' },
  ],
  '2026-06-04': [
    { title: '数据加密方案评审', status: 'dueSoon' },
  ],
  '2026-06-05': [
    { title: '登录页面UI优化', status: 'dueSoon' },
    { title: 'BUG-00106 复现', status: 'notStarted' },
  ],
  '2026-06-08': [
    { title: '数据迁移方案确认', status: 'dueSoon' },
    { title: 'XX企业项目立项', status: 'urgent' },
  ],
  '2026-06-09': [
    { title: 'BUG-00108 报告', status: 'overdue' },
    { title: '性能压测方案', status: 'dueSoon' },
    { title: '里程碑Sprint4评审', status: 'urgent' },
  ],
  '2026-06-10': [
    { title: '数据迁移方案评审', status: 'dueSoon' },
    { title: '消息推送功能开发', status: 'dueSoon' },
  ],
  '2026-06-11': [
    { title: '后端接口联调', status: 'urgent' },
    { title: 'BUG-00112 权限绕过漏洞', status: 'overdue' },
    { title: '前端页面开发', status: 'urgent' },
  ],
  '2026-06-12': [
    { title: '性能测试执行', status: 'dueSoon' },
    { title: 'BUG-00102 修复验证', status: 'completed' },
  ],
  '2026-06-15': [
    { title: '前端页面开发-用户管理模块', status: 'urgent' },
    { title: '系统部署文档', status: 'notStarted' },
    { title: 'YY平台需求变更', status: 'dueSoon' },
  ],
  '2026-06-16': [
    { title: '商品列表API联调', status: 'overdue' },
    { title: '订单模块代码Review', status: 'dueSoon' },
  ],
  '2026-06-17': [
    { title: '用户管理模块联调', status: 'urgent' },
    { title: 'API文档更新', status: 'notStarted' },
  ],
  '2026-06-18': [
    { title: '系统部署文档', status: 'notStarted' },
    { title: 'Sprint 5 计划会', status: 'dueSoon' },
    { title: '里程碑Sprint5完成确认', status: 'urgent' },
  ],
  '2026-06-19': [
    { title: '性能优化方案评审', status: 'dueSoon' },
    { title: 'BUG-00120 接口响应超时', status: 'overdue' },
  ],
  '2026-06-22': [
    { title: '数据库备份方案', status: 'dueSoon' },
    { title: '系统部署文档', status: 'notStarted' },
    { title: 'YY平台需求变更审批', status: 'dueSoon' },
    { title: 'XX企业项目验收确认', status: 'urgent' },
  ],
  '2026-06-25': [
    { title: '阶段汇报材料整理', status: 'dueSoon' },
  ],
  '2026-06-27': [
    { title: '安全漏洞扫描', status: 'urgent' },
  ],
}

const referenceDayTasks = [
  { id: 1, title: '前端页面开发-用户管理模块', owner: '张三', deadline: '2026-06-15', project: '国内XX数字化项目', priority: '紧急', priorityKey: 'urgent', status: 'overdue', state: '逾期', remaining: '逾期 3 天', icon: FireOutlined },
  { id: 2, title: '数据迁移方案评审', owner: '王五', deadline: '2026-06-10', project: '国内XX数字化项目', priority: '高', priorityKey: 'high', status: 'overdue', state: '逾期', remaining: '逾期 1 天', icon: FlagOutlined },
  { id: 3, title: '后端接口联调-权限校验', owner: '李四', deadline: '2026-06-12', project: '国内XX数字化项目', priority: '高', priorityKey: 'high', status: 'dueSoon', state: '即将到期', remaining: '剩余 1 天', icon: FireOutlined },
  { id: 4, title: '性能测试执行', owner: '张三', deadline: '2026-06-14', project: '国内XX数字化项目', priority: '中', priorityKey: 'medium', status: 'inProgress', state: '进行中', remaining: '剩余 3 天', icon: ExclamationCircleOutlined },
  { id: 5, title: '系统部署文档编写', owner: '赵六', deadline: '2026-06-18', project: '国内XX数字化项目', priority: '低', priorityKey: 'low', status: 'notStarted', state: '未开始', remaining: '剩余 7 天', icon: MinusCircleOutlined },
  { id: 6, title: 'BUG-2026-00102 登录异常', owner: '李四', deadline: '2026-06-11', project: '国内XX数字化项目', priority: '中', priorityKey: 'medium', status: 'completed', state: '已完成', remaining: '已完成', icon: CheckCircleOutlined },
]

const selectedTasks = computed(() => {
  if (selectedDate.value.isSame(referenceToday, 'day')) {
    return referenceDayTasks
  }

  return (calendarTasks[selectedDate.value.format('YYYY-MM-DD')] || []).map((task, index) => ({
    id: `${selectedDate.value.format('YYYYMMDD')}-${index}`,
    title: task.title,
    owner: '待分配',
    deadline: selectedDate.value.format('YYYY-MM-DD'),
    project: '项目与开发管理系统',
    priority: '中',
    priorityKey: 'medium',
    status: task.status,
    state: statusLegend.find(item => item.key === task.status)?.label || '未开始',
    remaining: selectedDate.value.isBefore(referenceToday, 'day') ? '已到期' : '待处理',
    icon: ExclamationCircleOutlined,
  }))
})

watch(() => props.open, isOpen => {
  if (isOpen) {
    calendarValue.value = referenceToday
    selectedDate.value = referenceToday
  }
})

const getCalendarTasks = current => calendarTasks[current.format('YYYY-MM-DD')] || []

const handleDateSelect = value => {
  selectedDate.value = value
}

const handleMonthChange = (value, onChange, offset) => {
  const nextValue = value.clone().add(offset, 'month')
  onChange(nextValue)
  selectedDate.value = nextValue
}

const handleToday = onChange => {
  onChange(referenceToday)
  selectedDate.value = referenceToday
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

.daily-task-card__state--overdue {
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

.daily-task-card__remaining--overdue {
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
