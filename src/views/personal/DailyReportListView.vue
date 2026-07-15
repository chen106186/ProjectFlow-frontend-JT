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
        :columns="columns"
        :data-source="filteredReports"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'content'">
            <a-tooltip :title="getReportContent(record)">
              <a-button type="link" class="daily-content-link" @click="goDetail(record.reportDate)">
                {{ getReportContent(record) }}
              </a-button>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === 'operation'">
            <a-button type="link" @click="goDetail(record.reportDate)">查看</a-button>
          </template>
          <template v-else-if="column.dataIndex === 'updatedAt'">
            {{ formatDateTime(record.updatedAt || record.createdAt) }}
          </template>
        </template>
      </a-table>
    </section>

    <aside v-if="canViewWeeklyStatus" class="weekly-submit-card">
      <header class="weekly-submit-card__header">
        <strong>本周提交情况</strong>
        <div class="weekly-switch">
          <a-button type="text" size="small" @click="shiftWeek(-1)"><LeftOutlined /></a-button>
          <span>{{ weekRangeText }}</span>
          <a-button type="text" size="small" @click="shiftWeek(1)"><RightOutlined /></a-button>
        </div>
      </header>

      <a-spin :spinning="weeklyLoading">
        <div class="weekly-grid">
          <span class="weekly-grid__corner" />
          <span v-for="day in weekDays" :key="day.key" class="weekly-grid__weekday">{{ day.label }}</span>

          <template v-for="user in weeklyUsers" :key="user.id">
            <span class="weekly-grid__name">{{ user.realName || user.username }}</span>
            <span
              v-for="day in weekDays"
              :key="`${user.id}-${day.key}`"
              :class="['weekly-grid__cell', { 'weekly-grid__cell--done': hasReport(user.id, day.key) }]"
              :title="day.key"
            >
              {{ day.dateText }}
            </span>
          </template>
        </div>
      </a-spin>
    </aside>
  </div>
</template>

<script setup>
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { fetchDailyReports, listMyDailyReports } from '@/api/dailyReports'
import { getUserList } from '@/api/system'
import { formatDateTime } from '@/utils/dateTime'

const router = useRouter()
const today = dayjs()
const editableDate = today

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

const weeklyLoading = ref(false)
const weeklyUsers = ref([])
const weeklyReports = ref([])
const weeklyBaseDate = ref(today)

const columns = [
  { title: '日期', dataIndex: 'reportDate', width: 140 },
  { title: '内容', dataIndex: 'content', ellipsis: true },
  { title: '提交时间', dataIndex: 'updatedAt', width: 180 },
  { title: '操作', dataIndex: 'operation', width: 90 },
]

const pagination = computed(() => ({
  current: paginationState.current,
  pageSize: paginationState.pageSize,
  showSizeChanger: true,
  showTotal: total => `共 ${total} 条`,
}))

const currentProfile = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('authProfile') || '{}')
  } catch {
    return {}
  }
})

const canViewWeeklyStatus = computed(() => {
  const roles = currentProfile.value.roles || []
  return roles.some(role => {
    const name = role?.name || ''
    const code = String(role?.code || '').toLowerCase()
    return name === '超级管理员' || name === '开发经理' || ['super_admin', 'super-admin', 'admin', 'development-manager', 'dev-manager'].includes(code)
  })
})

const weekStart = computed(() => weeklyBaseDate.value.subtract((weeklyBaseDate.value.day() + 6) % 7, 'day'))
const weekDays = computed(() => {
  const labels = ['一', '二', '三', '四', '五', '六', '日']
  return Array.from({ length: 7 }, (_, index) => {
    const date = weekStart.value.add(index, 'day')
    return {
      key: date.format('YYYY-MM-DD'),
      label: labels[index],
      dateText: date.format('DD'),
    }
  })
})
const weekRangeText = computed(() => `${weekDays.value[0].key} ~ ${weekDays.value[6].key}`)

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

onMounted(async () => {
  await loadReports()
  if (canViewWeeklyStatus.value) {
    await loadWeeklyStatus()
  }
})

async function loadReports() {
  loading.value = true
  try {
    reports.value = await listMyDailyReports() || []
  } finally {
    loading.value = false
  }
}

async function loadWeeklyStatus() {
  weeklyLoading.value = true
  try {
    const [usersResult, reportsResult] = await Promise.all([
      getUserList({ pageNo: 1, pageSize: 200, enabled: true }),
      fetchDailyReports({
        pageNo: 1,
        pageSize: 200,
        dateFrom: weekDays.value[0].key,
        dateTo: weekDays.value[6].key,
      }),
    ])
    weeklyUsers.value = usersResult?.records || []
    weeklyReports.value = reportsResult?.records || []
  } finally {
    weeklyLoading.value = false
  }
}

function getReportContent(report) {
  const text = String(report?.content || '').replace(/<[^>]+>/g, '').trim()
  return text || '-'
}

function hasReport(userId, date) {
  return weeklyReports.value.some(report => String(report.reporterId) === String(userId) && String(report.reportDate).slice(0, 10) === date)
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

function handleTableChange(page) {
  paginationState.current = page.current
  paginationState.pageSize = page.pageSize
}

async function shiftWeek(amount) {
  weeklyBaseDate.value = weeklyBaseDate.value.add(amount, 'week')
  await loadWeeklyStatus()
}

function goDetail(date) {
  const reportDate = dayjs(date).format('YYYY-MM-DD')
  router.push({ path: '/personal/daily/detail', query: { date: reportDate } })
}
</script>

<style scoped>
.daily-list-page {
  width: min(1600px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
}

.daily-list-main,
.weekly-submit-card {
  background: #fff;
  border: 1px solid #eef1f4;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 4%);
}

.daily-list-main {
  min-width: 0;
  padding: 16px;
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
  max-width: 100%;
  height: auto;
  padding: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.weekly-submit-card {
  padding: 14px;
}

.weekly-submit-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.weekly-submit-card__header strong {
  color: #1f2a44;
  font-size: 16px;
}

.weekly-switch {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  color: #596579;
  font-size: 12px;
}

.weekly-grid {
  display: grid;
  grid-template-columns: 46px repeat(7, 1fr);
  gap: 5px;
  align-items: center;
}

.weekly-grid__corner,
.weekly-grid__weekday,
.weekly-grid__name {
  color: #596579;
  font-size: 12px;
  font-weight: 600;
}

.weekly-grid__weekday {
  text-align: center;
}

.weekly-grid__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weekly-grid__cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  color: #8c9bb0;
  font-size: 11px;
  background: #eef5ff;
  border-radius: 2px;
}

.weekly-grid__cell--done {
  color: #fff;
  background: #3d8bff;
}

@media (max-width: 1100px) {
  .daily-list-page {
    grid-template-columns: 1fr;
  }
}
</style>
