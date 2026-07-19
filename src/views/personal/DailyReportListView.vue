<template>
  <div class="daily-list-page">
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
          <a-button type="primary" @click="handleSearch">查询</a-button>
          <a-button @click="handleReset">重置</a-button>
        </a-space>
        <a-button type="primary" @click="goDetail(editableDate)">填写日报</a-button>
      </div>

      <a-table
        class="daily-report-table"
        :columns="columns"
        :data-source="pagedReports"
        :loading="loading"
        :pagination="false"
        :scroll="{ y: '100%' }"
        table-layout="fixed"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'content'">
            <a-tooltip :title="getReportContent(record)">
              <a-button type="link" class="daily-content-link" @click="goDetail(record)">
                {{ getReportContent(record) }}
              </a-button>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === 'operation'">
            <a-tooltip title="查看">
              <a-button type="link" class="operation-icon-button" aria-label="查看" @click="goDetail(record)"><EyeOutlined /></a-button>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === 'updatedAt'">
            {{ formatDateTime(record.updatedAt || record.createdAt) }}
          </template>
        </template>
      </a-table>

      <div class="daily-list-pagination">
        <a-pagination
          :current="paginationState.current"
          :page-size="paginationState.pageSize"
          :total="filteredReports.length"
          :page-size-options="['10', '50', '100']"
          show-size-changer
          :show-total="total => `共 ${total} 条`"
          @change="handlePageChange"
        />
      </div>
    </section>

    <DailyReportCalendarPanel
      v-model="calendarValue"
      :reports="reports"
      :loading="loading"
      readonly
    />
  </div>
</template>

<script setup>
import { EyeOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { listMyDailyReports } from '@/api/dailyReports'
import { formatDateTime } from '@/utils/dateTime'
import DailyReportCalendarPanel from './DailyReportCalendarPanel.vue'

const router = useRouter()
const today = dayjs()
const editableDate = today
const calendarValue = ref(today)

const loading = ref(false)
const reports = ref([])
const filters = reactive({
  month: null,
  keyword: '',
})
const query = reactive({
  month: null,
  keyword: '',
})
const paginationState = reactive({
  current: 1,
  pageSize: 10,
})

const columns = [
  { title: '日期', dataIndex: 'reportDate', width: 140 },
  { title: '提交人', dataIndex: 'reporterName', width: 120 },
  { title: '内容', dataIndex: 'content', ellipsis: true },
  { title: '提交时间', dataIndex: 'updatedAt', width: 220 },
  { title: '操作', dataIndex: 'operation', width: 90 },
]

const filteredReports = computed(() => {
  const keyword = query.keyword.trim().toLowerCase()
  const month = query.month?.format('YYYY-MM')

  return reports.value.filter(report => {
    const matchesMonth = !month || String(report.reportDate).slice(0, 7) === month
    const content = getReportContent(report).toLowerCase()
    const matchesKeyword = !keyword || content.includes(keyword)
    return matchesMonth && matchesKeyword
  })
})

const pagedReports = computed(() => {
  const start = (paginationState.current - 1) * paginationState.pageSize
  return filteredReports.value.slice(start, start + paginationState.pageSize)
})


onMounted(async () => {
  await loadReports()
})

async function loadReports() {
  loading.value = true
  try {
    reports.value = await listMyDailyReports() || []
  } finally {
    loading.value = false
  }
}

function getReportContent(report) {
  const text = String(report?.content || '').replace(/<[^>]+>/g, '').trim()
  return text || '-'
}

function handleSearch() {
  query.month = filters.month
  query.keyword = filters.keyword
  paginationState.current = 1
}

function handleReset() {
  filters.month = null
  filters.keyword = ''
  query.month = null
  query.keyword = ''
  paginationState.current = 1
}

function handlePageChange(page, pageSize) {
  paginationState.current = pageSize === paginationState.pageSize ? page : 1
  paginationState.pageSize = pageSize
}

function goDetail(target) {
  const report = target && typeof target === 'object' ? target : null
  const reportDate = dayjs(report?.reportDate || target).format('YYYY-MM-DD')
  const query = { date: reportDate }
  if (report?.id) query.id = String(report.id)
  router.push({ path: '/personal/daily/detail', query })
}
</script>

<style scoped>
.daily-list-page {
  height: 100%;
  min-height: 0;
  width: min(1600px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 500px;
  gap: 16px;
  overflow: clip;
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

@media (max-width: 1100px) {
  .daily-list-page {
    grid-template-columns: 1fr;
  }
}
</style>
