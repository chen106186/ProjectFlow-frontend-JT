<template>
  <div class="dr-page">
    <div class="dr-page__body">
      <div class="dr-left">
        <section class="dr-editor">
          <a-spin :spinning="allLoading || submitLoading">
            <a-form
              layout="horizontal"
              class="dr-form"
              :label-col="{ style: { width: '88px' } }"
              :wrapper-col="{ flex: 1 }"
            >
              <a-form-item label="日报日期">
                <a-date-picker
                  v-model:value="form.reportDate"
                  :allow-clear="false"
                  :disabled-date="disabledDailyDate"
                  class="dr-date-picker"
                />
              </a-form-item>
              <a-form-item label="日报内容">
                <a-textarea
                  v-model:value="form.content"
                  :rows="6"
                  :disabled="!isEditableDate"
                  placeholder="请输入日报内容"
                />
              </a-form-item>
              <a-form-item label="附件上传">
                <a-upload-dragger
                  :before-upload="handleBeforeUpload"
                  :show-upload-list="false"
                  :disabled="!isEditableDate"
                  multiple
                  class="dr-upload"
                >
                  <p class="dr-upload__icon"><UploadOutlined /></p>
                  <p class="dr-upload__text">点击或拖拽文件到此处上传</p>
                </a-upload-dragger>

                <div v-if="existingFiles.length || pendingFiles.length" class="dr-file-list">
                  <div v-for="file in existingFiles" :key="`saved-${file.id}`" class="dr-file-item">
                    <FileOutlined />
                    <span>{{ file.originalName || file.name }}</span>
                    <a-tag color="green">已上传</a-tag>
                  </div>
                  <div v-for="file in pendingFiles" :key="file.uid" class="dr-file-item">
                    <FileOutlined />
                    <span>{{ file.name }}</span>
                    <a-button type="link" size="small" @click="removePendingFile(file.uid)">移除</a-button>
                  </div>
                </div>
                <a-empty v-else class="dr-file-empty" description="暂无附件" />
              </a-form-item>
            </a-form>
          </a-spin>
        </section>

        <div class="dr-actions">
          <a-button :disabled="!isEditableDate" @click="resetForm">重置</a-button>
          <a-button type="primary" :disabled="!isEditableDate" :loading="submitLoading" @click="handleSave">保存</a-button>
        </div>
      </div>

      <aside class="dr-calendar-panel">
        <a-spin :spinning="allLoading">
          <a-calendar
            v-model:value="calendarValue"
            :fullscreen="false"
            :disabled-date="disabledCalendarDate"
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
    </div>
  </div>
</template>

<script setup>
import { FileOutlined, LeftOutlined, RightOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  createDailyReport,
  listDailyReportFiles,
  listMyDailyReports,
  updateDailyReport,
  uploadDailyReportFile,
} from '@/api/dailyReports'

const route = useRoute()
const today = dayjs()
const editableDate = today.subtract(1, 'day')
const initialDate = getRouteDate()
const calendarValue = ref(initialDate)
const selectedDate = ref(initialDate)

const allLoading = ref(false)
const allReports = ref([])

const submitLoading = ref(false)
const form = ref({ reportDate: editableDate, content: '' })
const pendingFiles = ref([])
const existingFiles = ref([])

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
const isEditableDate = computed(() => selectedDate.value.isSame(editableDate, 'day'))

onMounted(async () => {
  await loadAll()
  syncForm()
})

watch(
  () => route.query.date,
  () => {
    const date = getRouteDate()
    selectedDate.value = date
    calendarValue.value = date
  }
)

watch(
  () => form.value.reportDate,
  date => {
    if (!date || date.isSame(selectedDate.value, 'day')) return
    selectedDate.value = date
    calendarValue.value = date
  }
)

watch(
  () => selectedDate.value.format('YYYY-MM-DD'),
  () => {
    calendarValue.value = selectedDate.value
    syncForm()
  }
)

watch(
  () => currentReport.value?.id,
  id => {
    pendingFiles.value = []
    if (id) {
      loadFiles(id)
    } else {
      existingFiles.value = []
    }
  },
  { immediate: true }
)

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

async function loadFiles(reportId) {
  try {
    existingFiles.value = await listDailyReportFiles(reportId) || []
  } catch (e) {
    existingFiles.value = []
    message.error(e.message || '附件加载失败')
  }
}

function syncForm() {
  form.value = {
    reportDate: selectedDate.value,
    content: currentReport.value?.content || '',
  }
}

const handleDateSelect = date => {
  const dateKey = date.format('YYYY-MM-DD')

  if (date.isAfter(today, 'day') || (!date.isSame(editableDate, 'day') && !reportMap.value[dateKey])) {
    calendarValue.value = selectedDate.value
    return
  }

  selectedDate.value = date
}

const shiftMonth = (value, onChange, offset) => {
  onChange(value.clone().add(offset, 'month'))
}

const disabledDailyDate = date => date && !date.isSame(editableDate, 'day')
const disabledCalendarDate = date => date && date.isAfter(today, 'day')

function getRouteDate() {
  const date = route.query.date ? dayjs(String(route.query.date)) : editableDate
  if (!date.isValid() || date.isAfter(today, 'day')) {
    return editableDate
  }
  return date
}

const handleBeforeUpload = file => {
  const exists = pendingFiles.value.some(item => item.name === file.name && item.size === file.size)
  if (!exists) {
    pendingFiles.value.push({ uid: file.uid, name: file.name, size: file.size, originFile: file })
  }
  return false
}

const removePendingFile = uid => {
  pendingFiles.value = pendingFiles.value.filter(file => file.uid !== uid)
}

const resetForm = () => {
  syncForm()
  pendingFiles.value = []
}

const handleSave = async () => {
  if (!form.value.reportDate?.isSame(editableDate, 'day')) {
    message.warning('只能填写前一天的日报')
    return
  }
  if (!form.value.content?.trim()) {
    message.warning('请输入日报内容')
    return
  }
  submitLoading.value = true
  try {
    let savedReport
    const payload = {
      reportDate: form.value.reportDate.format('YYYY-MM-DD'),
      content: form.value.content.trim(),
    }

    if (currentReport.value?.id) {
      savedReport = await updateDailyReport(currentReport.value.id, payload)
      message.success('日报已更新')
    } else {
      savedReport = await createDailyReport(payload)
      message.success('日报已提交')
    }

    const reportId = savedReport?.id || currentReport.value?.id
    for (const file of pendingFiles.value) {
      await uploadDailyReportFile(reportId, file.originFile)
    }
    if (pendingFiles.value.length) {
      message.success('附件已上传')
      pendingFiles.value = []
      await loadFiles(reportId)
    }
    selectedDate.value = form.value.reportDate
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
  grid-template-columns: minmax(0, 7fr) minmax(260px, 3fr);
  gap: 16px;
  align-items: start;
  flex: 1;
  min-height: 0;
  padding: 16px;
}

.dr-left {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.dr-editor,
.dr-calendar-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border: 1px solid #eef1f4;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 4%);
}

.dr-editor {
  overflow: hidden;
}

.dr-editor :deep(.ant-spin-nested-loading),
.dr-editor :deep(.ant-spin-container) {
  min-height: 0;
  height: 100%;
}

.dr-form {
  padding: 20px 22px;
}

.dr-form :deep(.ant-form-item-label) {
  text-align: right;
}

.dr-form :deep(.ant-form-item-control) {
  min-width: 0;
}

.dr-date-picker {
  width: 220px;
}

.dr-upload :deep(.ant-upload-drag) {
  padding: 14px;
  border-color: #91caff;
  background: #fbfdff;
}

.dr-upload__icon {
  margin: 0 0 6px;
  color: #1677ff;
  font-size: 28px;
  line-height: 1;
  text-align: center;
}

.dr-upload__text {
  margin: 0;
  color: #595959;
  font-size: 12px;
  text-align: center;
}

.dr-file-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.dr-file-item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 34px;
  padding: 6px 10px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.dr-file-item > span:nth-child(2) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dr-file-empty {
  margin: 12px 0 0;
}

.dr-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  padding-top: 14px;
}

.dr-calendar-panel {
  align-items: stretch;
  justify-content: flex-start;
  height: 400px;
  padding: 10px;
}

.dr-calendar-panel :deep(.ant-spin-nested-loading),
.dr-calendar-panel :deep(.ant-spin-container),
.dr-calendar-panel :deep(.ant-picker-calendar) {
  width: 100%;
  height: 100%;
}

.dr-calendar-panel :deep(.ant-picker-calendar) {
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
}

.dr-calendar-panel :deep(.ant-picker-content) {
  height: 100%;
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

@media (max-width: 900px) {
  .dr-page__body {
    grid-template-columns: 1fr;
  }

  .dr-calendar-panel {
    width: 100%;
  }
}
</style>
