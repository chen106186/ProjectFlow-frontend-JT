<template>
  <div class="dr-page">
    <div class="dr-page__body">
      <!-- 左侧日历 -->
      <div class="dr-cal-wrap">
        <a-spin :spinning="allLoading">
          <a-calendar v-model:value="calendarValue" @select="handleDateSelect">
            <template #headerRender="{ value, onChange }">
              <div class="dr-cal-header">
                <a-space :size="6">
                  <a-button type="text" aria-label="上个月" @click="shiftMonth(value, onChange, -1)">
                    <LeftOutlined />
                  </a-button>
                  <strong>{{ value.format('YYYY年M月') }}</strong>
                  <a-button type="text" aria-label="下个月" @click="shiftMonth(value, onChange, 1)">
                    <RightOutlined />
                  </a-button>
                  <a-button size="small" @click="goToday(onChange)">今天</a-button>
                </a-space>
              </div>
            </template>

            <template #dateCellRender="{ current }">
              <div v-if="reportMap[current.format('YYYY-MM-DD')]" class="dr-cal-dot" />
            </template>
          </a-calendar>
        </a-spin>
      </div>

      <!-- 右侧日报内容面板 -->
      <aside class="dr-panel">
        <header class="dr-panel__header">
          <div class="dr-panel__date">
            <strong>{{ selectedDate.format('YYYY-MM-DD') }}</strong>
            <span v-if="selectedDate.isSame(today, 'day')" class="dr-today-badge">今天</span>
          </div>
          <div>
            <a-button v-if="currentReport" size="small" style="margin-right:8px" @click="openEdit">
              <EditOutlined />编辑
            </a-button>
            <a-button type="primary" size="small" @click="openCreate">
              <PlusOutlined />新建日报
            </a-button>
          </div>
        </header>

        <div class="dr-panel__body">
          <template v-if="currentReport">
            <div class="dr-report-block">
              <div class="dr-report-label">工作内容</div>
              <div class="dr-report-content">{{ currentReport.content }}</div>
            </div>
            <div class="dr-report-meta">
              提交时间：{{ formatDateTime(currentReport.updatedAt || currentReport.createdAt) }}
            </div>
          </template>
          <a-empty
            v-else
            class="dr-panel__empty"
            :description="`${selectedDate.format('YYYY-MM-DD')} 暂无日报`"
          />
        </div>
      </aside>
    </div>

    <!-- 新建 / 编辑弹窗 -->
    <a-modal v-model:open="modalOpen" width="680px" :title="editingId ? '编辑日报' : '新建日报'" centered>
      <template #footer>
        <a-space>
          <a-button @click="modalOpen = false">取消</a-button>
          <a-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</a-button>
        </a-space>
      </template>
      <a-form layout="horizontal" :label-col="{ span: 4 }">
        <a-form-item label="日报日期">
          <a-date-picker
            v-model:value="form.reportDate"
            :allow-clear="false"
            :disabled="!!editingId"
            :disabled-date="disabledFuture"
          />
        </a-form-item>
        <a-form-item label="工作内容">
          <a-textarea v-model:value="form.content" :rows="10" placeholder="请输入工作内容" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { EditOutlined, LeftOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, onMounted, ref } from 'vue'

import { createDailyReport, listMyDailyReports, updateDailyReport } from '@/api/dailyReports'

const today = dayjs()
const calendarValue = ref(today)
const selectedDate = ref(today)
const allLoading = ref(false)
const allReports = ref([])

const modalOpen = ref(false)
const editingId = ref(null)
const submitLoading = ref(false)
const form = ref({ reportDate: dayjs(), content: '' })

const reportMap = computed(() => {
  const map = {}
  for (const r of allReports.value) {
    if (r.reportDate) {
      const key = String(r.reportDate).slice(0, 10)
      map[key] = r
    }
  }
  return map
})

const currentReport = computed(() => reportMap.value[selectedDate.value.format('YYYY-MM-DD')] || null)

onMounted(loadAll)

async function loadAll() {
  allLoading.value = true
  try {
    allReports.value = await listMyDailyReports() || []
  } catch (e) {
    message.error(e.message || '日报加载失败')
  } finally {
    allLoading.value = false
  }
}

const handleDateSelect = date => {
  selectedDate.value = date
}

const shiftMonth = (value, onChange, offset) => {
  onChange(value.clone().add(offset, 'month'))
}

const goToday = onChange => {
  onChange(today)
  calendarValue.value = today
  selectedDate.value = today
}

const disabledFuture = date => date && date.isAfter(today, 'day')

const formatDateTime = val => {
  if (!val) return '-'
  const s = String(val)
  return s.length > 10 ? s.replace('T', ' ').slice(0, 16) : s
}

const openCreate = () => {
  editingId.value = null
  form.value = { reportDate: selectedDate.value, content: '' }
  modalOpen.value = true
}

const openEdit = () => {
  if (!currentReport.value) return
  editingId.value = currentReport.value.id
  form.value = {
    reportDate: dayjs(String(currentReport.value.reportDate).slice(0, 10)),
    content: currentReport.value.content || '',
  }
  modalOpen.value = true
}

const handleSubmit = async () => {
  if (!form.value.content?.trim()) {
    message.warning('请输入工作内容')
    return
  }
  submitLoading.value = true
  try {
    if (editingId.value) {
      await updateDailyReport(editingId.value, { content: form.value.content })
      message.success('日报已更新')
    } else {
      await createDailyReport({
        reportDate: form.value.reportDate.format('YYYY-MM-DD'),
        content: form.value.content,
      })
      message.success('日报已提交')
    }
    modalOpen.value = false
    await loadAll()
  } catch (e) {
    message.error(e.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}
</script>

<style scoped>
.dr-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 68px);
  min-height: 0;
  background: #f5f6fa;
}

.dr-page__body {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(360px, 1fr);
  gap: 18px;
  flex: 1;
  min-height: 0;
  padding: 16px 20px 16px 16px;
}

.dr-cal-wrap {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #eef1f4;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 4%);
}

.dr-cal-wrap :deep(.ant-picker-calendar) {
  border-radius: 0;
}

.dr-cal-wrap :deep(.ant-picker-calendar-header) {
  padding: 0;
}

.dr-cal-wrap :deep(.ant-picker-content) {
  height: calc(100vh - 160px);
}

.dr-cal-wrap :deep(.ant-picker-cell-inner) {
  min-height: 88px;
  padding: 4px 6px;
  border-radius: 6px;
}

.dr-cal-wrap :deep(.ant-picker-cell-selected .ant-picker-cell-inner) {
  background: #e6f4ff;
  outline: 1px solid #1677ff;
}

.dr-cal-wrap :deep(.ant-picker-calendar-date-value) {
  font-size: 13px;
}

.dr-cal-header {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid #f0f0f0;
}

.dr-cal-dot {
  width: 6px;
  height: 6px;
  margin-top: 4px;
  background: #52c41a;
  border-radius: 50%;
}

/* 右侧面板 */
.dr-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #eef1f4;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 4%);
}

.dr-panel__header {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 18px;
  border-bottom: 1px solid #f0f0f0;
}

.dr-panel__date {
  display: flex;
  gap: 8px;
  align-items: center;
}

.dr-panel__date strong {
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
}

.dr-today-badge {
  padding: 1px 7px;
  color: #1677ff;
  font-size: 12px;
  background: #e6f4ff;
  border-radius: 10px;
}

.dr-panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 18px;
}

.dr-report-block {
  padding: 16px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.dr-report-label {
  margin-bottom: 10px;
  color: #8c8c8c;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dr-report-content {
  color: #262626;
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.dr-report-meta {
  margin-top: 14px;
  color: #bfbfbf;
  font-size: 12px;
}

.dr-panel__empty {
  margin-top: 80px;
}
</style>
