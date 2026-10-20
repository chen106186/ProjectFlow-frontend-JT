<template>
  <div :class="['daily-list-page', { 'daily-list-page--wide': hideCalendar }]">
    <section class="daily-list-main">
      <div class="daily-list-toolbar">
        <a-space :size="12" wrap>
          <label class="daily-filter-item">
            <span>选中月份</span>
            <a-date-picker v-model:value="filters.month" picker="month" allow-clear placeholder="请选择月份" />
          </label>
          <label class="daily-filter-item">
            <span>内容</span>
            <a-input
              v-model:value="filters.keyword"
              allow-clear
              placeholder="请输入内容"
              style="width: 15rem"
              @press-enter="handleSearch"
            />
          </label>
          <label v-if="canViewAllReports" class="daily-filter-item">
            <span>提交人</span>
            <a-select
              v-model:value="filters.reporterId"
              allow-clear
              show-search
              option-filter-prop="label"
              placeholder="请输入提交人"
              :options="reporterOptions"
              style="width: 10rem"
            />
          </label>
          <a-button type="primary" @click="handleSearch">查询</a-button>
          <a-button @click="handleReset">重置</a-button>
        </a-space>
        <a-button type="primary" @click="goDetail(editableDate)">填写日报</a-button>
      </div>

      <a-table
        class="daily-report-table"
        :columns="columns"
        :data-source="reports"
        :loading="loading"
        :pagination="false"
        :scroll="{ y: '100%' }"
        table-layout="fixed"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'content'">
            <a-tooltip :title="getReportContent(record)">
              <a-button type="link" class="daily-content-link" @click="viewReport(record)">
                {{ getReportContent(record) }}
              </a-button>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === 'operation'">
            <a-tooltip title="查看">
              <a-button type="link" class="operation-icon-button" aria-label="查看" @click="viewReport(record)"><EyeOutlined /></a-button>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === 'updatedAt'">
            <span class="daily-submit-time">{{ formatDateTime(record.updatedAt || record.createdAt) }}</span>
          </template>
        </template>
      </a-table>

      <div class="daily-list-pagination">
        <a-pagination
          :current="paginationState.current"
          :page-size="paginationState.pageSize"
          :total="paginationState.total"
          :page-size-options="['10', '50', '100']"
          show-size-changer
          :show-total="total => `共 ${total} 条`"
          @change="handlePageChange"
        />
      </div>
    </section>

    <DailyReportCalendarPanel
      v-if="!hideCalendar"
      v-model="calendarValue"
      :reports="reports"
      :loading="loading"
      readonly
    />

    <a-modal v-model:open="reportModalOpen" :title="`${selectedReport?.reportDate || ''} 日报`" width="min(680px, 92vw)" :footer="null" @cancel="closeReport">
      <a-spin :spinning="reportFilesLoading">
        <div v-if="selectedReport" class="daily-preview">
          <p class="daily-preview__meta">{{ selectedReport.reporterName || '-' }} · 提交于 {{ formatDateTime(selectedReport.updatedAt || selectedReport.createdAt) }}</p>
          <div class="daily-preview__content">{{ getReportContent(selectedReport) }}</div>
          <strong>附件</strong>
          <a-empty v-if="!reportFiles.length" description="暂无附件" :image-style="{ height: '36px' }" />
          <div v-for="file in reportFiles" :key="file.id" class="daily-preview__file">
            <span>{{ file.originalName || file.name }}</span>
            <a-button type="link" @click="downloadReportFile(file)">下载</a-button>
          </div>
          <div class="daily-preview__actions">
            <span v-if="!canEditSelectedReport" class="daily-preview__readonly">仅今天和昨天的日报可编辑</span>
            <a-button v-if="canEditSelectedReport" type="primary" @click="editSelectedReport">编辑日报</a-button>
            <a-button @click="closeReport">关闭</a-button>
          </div>
        </div>
      </a-spin>
    </a-modal>
  </div>
</template>

<script setup>
import { EyeOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { fetchDailyReports, listDailyReportFiles } from '@/api/dailyReports'
import { downloadProjectFile } from '@/api/managementProject'
import { getUserList } from '@/api/system'
import { getStoredProfile, isAdminProfile } from '@/utils/authScope'
import { formatDateTime } from '@/utils/dateTime'
import DailyReportCalendarPanel from './DailyReportCalendarPanel.vue'

const router = useRouter()
const today = dayjs()
const editableDate = today
const calendarValue = ref(today)

const loading = ref(false)
const reports = ref([])
const users = ref([])
const reportModalOpen = ref(false)
const selectedReport = ref(null)
const reportFiles = ref([])
const reportFilesLoading = ref(false)
const filters = reactive({
  month: null,
  keyword: '',
  reporterId: undefined,
})
const query = reactive({
  month: null,
  keyword: '',
  reporterId: undefined,
})
const paginationState = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

const columns = [
  { title: '日期', dataIndex: 'reportDate', width: 160 },
  { title: '提交人', dataIndex: 'reporterName', width: 200 },
  { title: '内容', dataIndex: 'content', ellipsis: true,minWidth:200 },
  { title: '提交时间', dataIndex: 'updatedAt', width: 220 },
  { title: '操作', dataIndex: 'operation', width: 90 },
]

const profile = JSON.parse(localStorage.getItem('authProfile') || '{}')
const currentProfile = getStoredProfile()
const hasRole = code => (profile.roles || []).some(role => String(role?.code || '').toUpperCase() === code)
const canViewAllReports = computed(() => hasRole('GMO'))
const hideCalendar = computed(() => hasRole('GMO'))
const canEditSelectedReport = computed(() => {
  const report = selectedReport.value
  if (!report) return false
  const date = dayjs(report.reportDate)
  return (date.isSame(dayjs(), 'day') || date.isSame(dayjs().subtract(1, 'day'), 'day'))
    && (isAdminProfile(currentProfile) || String(report.reporterId) === String(currentProfile.id))
})

const userNames = computed(() => Object.fromEntries(users.value.map(user => [user.id, user.realName || user.username])))
const reporterOptions = computed(() => users.value.map(user => ({ label: user.realName || user.username, value: user.id })))


onMounted(async () => {
  await loadUsers()
  await loadReports()
})

async function loadUsers() {
  try {
    const result = await getUserList({ pageNo: 1, pageSize: 200 })
    users.value = result.records || []
  } catch {
    users.value = []
  }
}

async function loadReports() {
  loading.value = true
  try {
    const month = query.month
    const result = await fetchDailyReports({
      pageNo: paginationState.current,
      pageSize: paginationState.pageSize,
      reporterId: query.reporterId || undefined,
      dateFrom: month?.startOf('month').format('YYYY-MM-DD'),
      dateTo: month?.endOf('month').format('YYYY-MM-DD'),
      keyword: query.keyword.trim() || undefined,
    })
    reports.value = (result.records || []).map(report => ({
      ...report,
      reporterName: report.reporterName || userNames.value[report.reporterId] || '-',
    }))
    paginationState.total = result.total || 0
  } finally {
    loading.value = false
  }
}

function getReportContent(report) {
  const html = String(report?.content || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6])\s*>/gi, '\n')
  const text = typeof DOMParser === 'undefined'
    ? html.replace(/<[^>]+>/g, '').trim()
    : new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim()
  return text || '-'
}

async function handleSearch() {
  query.month = filters.month
  query.keyword = filters.keyword
  query.reporterId = filters.reporterId
  paginationState.current = 1
  await loadReports()
}

async function handleReset() {
  filters.month = null
  filters.keyword = ''
  filters.reporterId = undefined
  query.month = null
  query.keyword = ''
  query.reporterId = undefined
  paginationState.current = 1
  await loadReports()
}

async function handlePageChange(page, pageSize) {
  paginationState.current = pageSize === paginationState.pageSize ? page : 1
  paginationState.pageSize = pageSize
  await loadReports()
}

function goDetail(target) {
  const report = target && typeof target === 'object' ? target : null
  const reportDate = dayjs(report?.reportDate || target).format('YYYY-MM-DD')
  const query = { date: reportDate }
  if (report?.id) query.id = String(report.id)
  router.push({ path: '/personal/daily/detail', query })
}
async function viewReport(report) {
  selectedReport.value = report
  reportFiles.value = []
  reportModalOpen.value = true
  reportFilesLoading.value = true
  try {
    const files = await listDailyReportFiles(report.id) || []
    if (selectedReport.value?.id === report.id) reportFiles.value = files
  }
  catch (error) { message.error(error.message || '日报附件加载失败') }
  finally { if (selectedReport.value?.id === report.id) reportFilesLoading.value = false }
}
function closeReport() { reportModalOpen.value = false; selectedReport.value = null; reportFiles.value = []; reportFilesLoading.value = false }
function editSelectedReport() {
  if (!canEditSelectedReport.value) return
  const report = selectedReport.value
  closeReport()
  goDetail(report)
}
async function downloadReportFile(file) {
  try {
    const result = await downloadProjectFile(file.id)
    const url = URL.createObjectURL(result.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.fileName || file.originalName || '日报附件'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) { message.error(error.message || '附件下载失败') }
}
</script>

<style scoped>
.daily-list-page {
  height: 100%;
  min-height: 0;
  width: min(var(--app-content-max-width), 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 500px;
  gap: 16px;
  overflow: clip;
}

.daily-list-page--wide {
  grid-template-columns: minmax(0, 1fr);
}

.daily-list-main {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #fff;
  border: 1px solid #eef1f4;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 4%);
}

.daily-list-main {
  min-width: 0;
  padding: 16px 16px 10px;
  overflow: clip;
}

.daily-list-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.daily-filter-item {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.daily-filter-item span {
  flex-shrink: 0;
  color: #262626;
  font-size: 14px;
}

.daily-content-link {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  padding: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.daily-content-link :deep(span) {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operation-icon-button { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border-radius: 6px; }
.operation-icon-button :deep(svg) { width: 15px; height: 15px; }
.daily-submit-time { white-space: nowrap; }
.daily-preview__meta { color: #667085; }
.daily-preview__content { min-height: 100px; max-height: 45vh; overflow: auto; white-space: pre-wrap; word-break: break-word; padding: 16px; margin: 14px 0 20px; border-radius: 10px; background: #f7f9fc; line-height: 1.7; }
.daily-preview__file { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid #eef1f4; }
.daily-preview__file span { min-width: 0; overflow-wrap: anywhere; }
.daily-preview__actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.daily-preview__readonly { margin-right: auto; color: #8a94a6; }

.daily-report-table {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.daily-report-table :deep(.ant-spin-nested-loading),
.daily-report-table :deep(.ant-spin-container),
.daily-report-table :deep(.ant-table),
.daily-report-table :deep(.ant-table-container) {
  height: 100%;
  min-height: 0;
}

.daily-report-table :deep(.ant-spin-container),
.daily-report-table :deep(.ant-table-container) {
  display: flex;
  flex-direction: column;
}

.daily-report-table :deep(.ant-table-header) { flex: none; }

.daily-report-table :deep(.ant-table-body) {
  flex: 1;
  min-height: 0;
  max-height: none !important;
  overflow-y: auto !important;
}

.daily-list-pagination {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  height: 32px;
  margin-top: 10px;
}

@media (max-width: 1360px) {
  .daily-list-page {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .daily-list-page:not(.daily-list-page--wide) {
    grid-template-rows: minmax(420px, 1fr) auto;
  }
}
</style>
