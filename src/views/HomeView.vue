<template>
  <div class="home-view">
    <section class="home-metrics" aria-label="项目概览">
      <button v-for="metric in metrics" :key="metric.title" class="metric-card" type="button" @click="handleMetricClick(metric.path)">
        <span class="metric-card__icon" :class="metric.iconClass"><component :is="metric.icon" /></span>
        <span class="metric-card__label">{{ metric.title }}</span>
        <span class="metric-card__value">--</span>
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
        <div class="todo-panel__empty">
          <a-empty description="暂无待办数据" />
          <span>待相关接口提供后展示任务与 Bug。</span>
        </div>
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
  FolderOpenOutlined,
  LeftOutlined,
  ProfileOutlined,
  RightOutlined,
} from '@ant-design/icons-vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import TaskCalendarModal from '@/components/TaskCalendarModal.vue'

const router = useRouter()
const activeTodoTab = ref('all')
const calendarValue = ref()
const isCalendarVisible = ref(false)

const metrics = [
  { title: '管理类项目', path: '/projects/management', icon: FolderOpenOutlined, iconClass: 'metric-card__icon--blue' },
  { title: '执行类项目', path: '/projects/execution', icon: CheckCircleOutlined, iconClass: 'metric-card__icon--green' },
  { title: '进行中项目', path: '/projects/execution', icon: ClockCircleOutlined, iconClass: 'metric-card__icon--orange' },
  { title: '已完成项目', path: '/projects/execution', icon: CheckCircleOutlined, iconClass: 'metric-card__icon--purple' },
]

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
