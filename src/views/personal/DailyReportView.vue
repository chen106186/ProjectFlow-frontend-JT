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
                  v-model:value="form.reportDate"
                  :allow-clear="false"
                  :disabled-date="disabledDailyDate"
                  class="dr-date-picker"
                />
              </a-form-item>
              <a-form-item label="日报内容">
                <div class="dr-rich-editor">
                  <Toolbar v-if="editorRef && isEditableDate" :editor="editorRef" :default-config="toolbarConfig" mode="default" />
                  <Editor v-model="form.content" :default-config="editorConfig" mode="default" @on-created="handleEditorCreated" />
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
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  createDailyReport,
  listDailyReportFiles,
  listMyDailyReports,
  updateDailyReport,
  uploadDailyReportFile,
} from '@/api/dailyReports'
import DailyReportCalendarPanel from './DailyReportCalendarPanel.vue'

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

const richTextImageUploadConf = {
  MENU_CONF: {
    uploadImage: {
      async customUpload(file, insertFn) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/files/upload-image', {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          body: fd,
        }).catch(() => null)
        if (!res || !res.ok) {
          message.error('图片上传失败')
          return
        }
        const json = await res.json()
        if (json.errno === 0) {
          insertFn(json.data.url, json.data.alt || '', json.data.href || '')
        } else {
          message.error('图片上传失败')
        }
      },
    },
  },
}

const toolbarConfig = {
  toolbarKeys: [
    'headerSelect',
    'fontSize',
    '|',
    'bold',
    'italic',
    'underline',
    'through',
    'color',
    'bgColor',
    '|',
    'bulletedList',
    'numberedList',
    'justifyLeft',
    'justifyCenter',
    'justifyRight',
    '|',
    'uploadImage',
    'insertImage',
  ],
}
const editorConfig = { placeholder: '请输入日报内容', scroll: true, ...richTextImageUploadConf }

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
const isEditableDate = computed(() => selectedDate.value.isSame(today, 'day') || selectedDate.value.isSame(yesterday, 'day'))
const pageTitle = computed(() => {
  if (!isEditableDate.value) {
    return '日报详情'
  }

  return currentReport.value ? '编辑日报' : '填写日报'
})

onMounted(async () => {
  await loadAll()
  syncForm()
})

onBeforeUnmount(() => {
  editorRef.value?.destroy()
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

watch(
  isEditableDate,
  editable => {
    if (!editorRef.value) return
    if (editable) {
      editorRef.value.enable()
    } else {
      editorRef.value.disable()
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
  if (date.isAfter(today, 'day')) {
    calendarValue.value = selectedDate.value
    return
  }

  selectedDate.value = date
}

const disabledDailyDate = date => date && !date.isSame(today, 'day') && !date.isSame(yesterday, 'day')

function getRouteDate() {
  const date = route.query.date ? dayjs(String(route.query.date)) : editableDate
  if (!date.isValid() || date.isAfter(today, 'day')) {
    return editableDate
  }
  return date
}

const handleBack = () => {
  router.push('/personal/daily')
}

const handleEditorCreated = editor => {
  editorRef.value = editor
  if (!isEditableDate.value) {
    editor.disable()
  }
}

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

const resetForm = () => {
  syncForm()
  pendingFiles.value = []
}

const handleSave = async () => {
  if (!form.value.reportDate || disabledDailyDate(form.value.reportDate)) {
    message.warning('只能填写当天和前一天的日报')
    return
  }
  if (isContentEmpty()) {
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
  width: min(1600px, 100%);
  margin: 0 auto;
  background: #f5f6fa;
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
  border: 1px solid #d9d9d9;
  border-radius: 6px;
}

.dr-rich-editor :deep(.w-e-toolbar) {
  z-index: 10;
  border-bottom: 1px solid #d9d9d9;
}

.dr-rich-editor :deep(.w-e-drop-panel),
.dr-rich-editor :deep(.w-e-select-list) {
  z-index: 1000;
}

.dr-rich-editor :deep(.w-e-text-container) {
  min-height: 180px;
}

.dr-rich-editor :deep(.w-e-text-container img) {
  max-width: 100%;
  height: auto;
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

@media (max-width: 900px) {
  .dr-page__body {
    grid-template-columns: 1fr;
  }
}
</style>
