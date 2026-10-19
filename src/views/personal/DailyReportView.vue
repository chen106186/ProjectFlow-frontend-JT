<template>
  <div class="dr-page">
    <header class="dr-detail-header">
      <a-button class="dr-back-button" @click="handleBack">
        <template #icon><LeftOutlined /></template>
        返回
      </a-button>
      <a-space v-if="isEditableDate">
        <a-button @click="resetForm">重置</a-button>
        <a-button type="primary" :loading="submitLoading" @click="handleSave">保存</a-button>
      </a-space>
    </header>

    <div :class="['dr-page__body', { 'dr-page__body--single': isEditableDate }]">
      <div class="dr-left">
        <section class="dr-editor">
          <h2 class="dr-form-title">{{ pageTitle }}</h2>
          <a-spin :spinning="allLoading || submitLoading">
            <a-form
              layout="horizontal"
              class="dr-form"
              :label-col="{ style: { width: '5.5rem' } }"
              :wrapper-col="{ flex: 1 }"
            >
              <a-form-item label="日报日期">
                <a-date-picker
                  :value="form.reportDate"
                  @change="handleReportDateChange"
                  :allow-clear="false"
                  :disabled-date="disabledDailyDate"
                  class="dr-date-picker"
                />
              </a-form-item>
              <a-form-item label="日报内容">
                <div class="dr-rich-editor">
                  <TinymceEditor ref="editorRef" v-model="form.content" :disabled="!isEditableDate" :height="240" placeholder="请输入日报内容" />
                </div>
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
      </div>

      <DailyReportCalendarPanel
        v-if="!isEditableDate"
        v-model="calendarValue"
        :reports="allReports"
        :loading="allLoading"
        @select="handleDateSelect"
      />
    </div>
  </div>
</template>

<script setup>
import { FileOutlined, LeftOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'

import {
  createDailyReport,
  listDailyReportFiles,
  listMyDailyReports,
  updateDailyReport,
  uploadDailyReportFile,
} from '@/api/dailyReports'
import TinymceEditor from '@/components/TinymceEditor.vue'
import DailyReportCalendarPanel from './DailyReportCalendarPanel.vue'
import { getStoredProfile, isAdminProfile } from '@/utils/authScope'

const route = useRoute()
const router = useRouter()
const today = dayjs()
const editableDate = today
const yesterday = today.subtract(1, 'day')
const initialDate = getRouteDate()
const calendarValue = ref(initialDate)
const selectedDate = ref(initialDate)

const allLoading = ref(false)
const allReports = ref([])

const submitLoading = ref(false)
const form = ref({ reportDate: editableDate, content: '' })
const pendingFiles = ref([])
const existingFiles = ref([])
const editorRef = shallowRef()
const profile = getStoredProfile()

const reportMap = computed(() => {
  const map = {}
  for (const r of allReports.value) {
    if (r.reportDate && String(r.reporterId) === String(profile.id)) {
      const key = String(r.reportDate).slice(0, 10)
      map[key] = r
    }
  }
  return map
})

const currentReport = computed(() => {
  const reportId = route.query.id
  if (reportId) {
    const report = allReports.value.find(report => String(report.id) === String(reportId))
    if (report && dayjs(report.reportDate).isSame(selectedDate.value, 'day')) return report
  }
  return reportMap.value[selectedDate.value.format('YYYY-MM-DD')] || null
})
const isEditableDate = computed(() =>
  (selectedDate.value.isSame(today, 'day') || selectedDate.value.isSame(yesterday, 'day')) &&
  (!currentReport.value || isAdminProfile(profile) || String(currentReport.value.reporterId) === String(profile.id)))
const pageTitle = computed(() => {
  if (!isEditableDate.value) {
    return '日报详情'
  }

  return currentReport.value ? '编辑日报' : '填写日报'
})

const hasUnsavedChanges = computed(() =>
  form.value.content !== (currentReport.value?.content || '') || pendingFiles.value.length > 0)

const confirmDiscard = () => {
  if (submitLoading.value) {
    message.info('正在保存日报，请稍候')
    return Promise.resolve(false)
  }
  if (!hasUnsavedChanges.value) return Promise.resolve(true)
  return new Promise(resolve => Modal.confirm({
    title: '日报尚未保存',
    content: '离开后将丢失未保存的正文和待上传附件。是否继续？',
    okText: '放弃更改',
    cancelText: '继续编辑',
    onOk: () => resolve(true),
    onCancel: () => resolve(false),
  }))
}

const handleBeforeUnload = event => {
  if (!hasUnsavedChanges.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(confirmDiscard)
onBeforeRouteUpdate(async (to, from) => {
  if (to.query.date === from.query.date && to.query.id === from.query.id) return true
  return confirmDiscard()
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload))

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  await loadAll()
  syncForm()
})

watch(
  () => [route.query.date, route.query.id],
  () => {
    const date = getRouteDate()
    selectedDate.value = date
    calendarValue.value = date
    pendingFiles.value = []
    syncForm()
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

const handleDateSelect = async date => {
  if (date.isAfter(today, 'day')) {
    calendarValue.value = selectedDate.value
    return
  }

  if (date.isSame(selectedDate.value, 'day')) return
  if (!await confirmDiscard()) {
    calendarValue.value = selectedDate.value
    return
  }
  pendingFiles.value = []
  selectedDate.value = date
}

const handleReportDateChange = date => {
  if (date) handleDateSelect(date)
}

const disabledDailyDate = date => date && !date.isSame(today, 'day') && !date.isSame(yesterday, 'day')

function getRouteDate() {
  const date = route.query.date ? dayjs(String(route.query.date)) : editableDate
  if (!date.isValid() || date.isAfter(today, 'day')) {
    return editableDate
  }
  return date
}

const handleBack = () => router.back()

const isContentEmpty = () => {
  if (editorRef.value) {
    return editorRef.value.isEmpty()
  }

  return !String(form.value.content || '').replace(/<[^>]+>/g, '').trim()
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

const resetForm = async () => {
  if (!await confirmDiscard()) return
  syncForm()
  pendingFiles.value = []
}

const handleSave = async () => {
  if (submitLoading.value) return
  if (!form.value.reportDate || disabledDailyDate(form.value.reportDate)) {
    message.warning('只能填写当天和前一天的日报')
    return
  }
  if (isContentEmpty()) {
    message.warning('请输入日报内容')
    return
  }
  submitLoading.value = true
  let reportSaved = false
  try {
    let savedReport
    const payload = {
      reportDate: form.value.reportDate.format('YYYY-MM-DD'),
      content: form.value.content.trim(),
    }

    if (currentReport.value?.id) {
      savedReport = await updateDailyReport(currentReport.value.id, payload)
    } else {
      savedReport = await createDailyReport(payload)
    }

    const reportId = savedReport?.id || currentReport.value?.id
    reportSaved = true
    if (savedReport?.id) {
      allReports.value = [...allReports.value.filter(report => String(report.id) !== String(savedReport.id)), savedReport]
    }
    for (const file of [...pendingFiles.value]) {
      await uploadDailyReportFile(reportId, file.originFile)
      pendingFiles.value = pendingFiles.value.filter(item => item.uid !== file.uid)
    }
    await loadFiles(reportId)
    selectedDate.value = form.value.reportDate
    await loadAll()
    syncForm()
    message.success('日报及附件已保存')
  } catch (e) {
    message.error(reportSaved ? `正文已保存，附件上传未完成，请重试：${e.message || '上传失败'}` : (e.message || '操作失败'))
  } finally {
    submitLoading.value = false
  }
}
</script>

<style scoped>
.dr-page {
  display: flex;
  flex-direction: column;
  width: min(1600px, 100%);
  margin: 0 auto;
}

.dr-detail-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 0;
}

.dr-back-button {
  flex-shrink: 0;
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

.dr-page__body--single {
  grid-template-columns: minmax(0, 1fr);
}

.dr-left {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.dr-editor {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border: 1px solid #eef1f4;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 4%);
}

.dr-form-title {
  margin: 18px 0 0;
  color: #111827;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
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

.dr-rich-editor {
  position: relative;
  overflow: visible;
  border-radius: 8px;
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
  border-radius: 8px;
}

.dr-file-item > span:nth-child(2) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dr-file-empty {
  margin: 12px 0 0;
}

@media (max-width: 900px) {
  .dr-page__body {
    grid-template-columns: 1fr;
  }
}
</style>
