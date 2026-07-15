<template>
  <aside :class="['dr-calendar-panel', { 'dr-calendar-panel--readonly': readonly }]">
    <a-spin :spinning="loading">
      <a-calendar
        v-model:value="calendarValue"
        :fullscreen="false"
        :disabled-date="readonly ? undefined : disabledCalendarDate"
        @select="handleDateSelect"
      >
        <template #headerRender="{ value, onChange }">
          <div class="dr-cal-header">
            <a-button type="text" size="small" aria-label="上个月" @click="shiftMonth(value, onChange, -1)">
              <LeftOutlined />
            </a-button>
            <strong>{{ value.format('YYYY年M月') }}</strong>
            <a-button type="text" size="small" aria-label="下个月" @click="shiftMonth(value, onChange, 1)">
              <RightOutlined />
            </a-button>
          </div>
        </template>

        <template #dateCellRender="{ current }">
          <div v-if="reportMap[current.format('YYYY-MM-DD')]" class="dr-cal-dot dr-cal-dot--done" />
          <div v-else-if="current.isBefore(today, 'day')" class="dr-cal-dot dr-cal-dot--missing" />
        </template>
      </a-calendar>
    </a-spin>
  </aside>
</template>

<script setup>
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Object, required: true },
  reports: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'select'])
const today = dayjs()

const calendarValue = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const reportMap = computed(() => {
  const map = {}
  for (const report of props.reports) {
    if (report.reportDate) {
      map[String(report.reportDate).slice(0, 10)] = report
    }
  }
  return map
})

function handleDateSelect(date) {
  if (props.readonly) return
  if (date.isAfter(today, 'day')) return
  emit('select', date)
}

function shiftMonth(value, onChange, offset) {
  onChange(value.clone().add(offset, 'month'))
}

const disabledCalendarDate = date => date && date.isAfter(today, 'day')
</script>

<style scoped>
.dr-calendar-panel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  height: 400px;
  min-height: 0;
  width: 100%;
  padding: 10px;
  overflow-x: hidden;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #eef1f4;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 4%);
}

.dr-calendar-panel :deep(.ant-spin-nested-loading),
.dr-calendar-panel :deep(.ant-spin-container),
.dr-calendar-panel :deep(.ant-picker-calendar) {
  width: 100%;
  height: 100%;
}

.dr-calendar-panel :deep(.ant-picker-calendar) {
  min-width: 0;
  overflow-x: hidden;
  border: 0;
}

.dr-calendar-panel :deep(.ant-picker-calendar-header) {
  padding: 0;
}

.dr-calendar-panel :deep(.ant-picker-panel) {
  border-top: 0;
}

.dr-calendar-panel :deep(.ant-picker-body) {
  height: calc(100% - 28px);
  padding: 4px 0 0;
  overflow-x: hidden;
}

.dr-calendar-panel :deep(.ant-picker-content) {
  height: 100%;
  table-layout: fixed;
}

.dr-calendar-panel--readonly :deep(.ant-picker-cell) {
  cursor: default;
  pointer-events: none;
}

.dr-calendar-panel--readonly :deep(.ant-picker-cell-selected .ant-picker-cell-inner),
.dr-calendar-panel--readonly :deep(.ant-picker-cell-today .ant-picker-cell-inner) {
  color: #262626 !important;
}

.dr-calendar-panel :deep(.ant-picker-content th) {
  height: 18px;
  color: #8c8c8c;
  font-size: 11px;
  font-weight: 400;
}

.dr-calendar-panel :deep(.ant-picker-cell) {
  padding: 1px 0;
}

.dr-calendar-panel :deep(.ant-picker-cell-inner) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 42px;
  min-width: 0;
  padding: 1px 0;
  line-height: 14px;
}

.dr-calendar-panel :deep(.ant-picker-calendar-date-value) {
  font-size: 11px;
  line-height: 14px;
}

.dr-calendar-panel :deep(.ant-picker-cell-selected .ant-picker-cell-inner) {
  background: #e6f4ff;
}

.dr-calendar-panel :deep(.ant-picker-cell-disabled .ant-picker-cell-inner) {
  width: 100%;
  height: 42px;
  color: #bfbfbf;
  background: #f5f5f5;
  cursor: not-allowed;
}

.dr-calendar-panel :deep(.ant-picker-cell-disabled::before) {
  display: none;
}

.dr-cal-header {
  display: grid;
  grid-template-columns: 28px 1fr 28px;
  align-items: center;
  width: 100%;
  height: 28px;
}

.dr-cal-header strong {
  color: #262626;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}

.dr-cal-dot {
  width: 5px;
  height: 5px;
  margin: 1px auto 0;
  border-radius: 50%;
}

.dr-cal-dot--done {
  background: #52c41a;
}

.dr-cal-dot--missing {
  background: #f5222d;
}
</style>
