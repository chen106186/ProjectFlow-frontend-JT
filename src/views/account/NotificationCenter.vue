<template>
  <section class="notification-center">
    <a-card class="notification-card" :bordered="false">
      <div class="notification-toolbar">
        <a-tabs v-model:active-key="activeTab" class="notification-tabs" @change="onTabChange">
          <a-tab-pane key="all" :tab="`全部 (${totalAll})`" />
          <a-tab-pane key="unread" :tab="`未读 (${totalUnread})`" />
          <a-tab-pane key="read" :tab="`已读 (${totalRead})`" />
        </a-tabs>

        <a-input-search v-model:value="keyword" class="notification-search" placeholder="搜索通知标题" allow-clear @search="handleSearch" @change="handleKeywordChange" />

        <a-button class="read-all-button" :loading="markingAll" @click="handleMarkAll">全部已读</a-button>
      </div>

      <a-spin wrapper-class-name="notification-list-spin" :spinning="loading">
        <div class="notification-list">
          <template v-if="noticeGroups.length">
            <section v-for="group in noticeGroups" :key="group.title" class="notification-group">
              <header class="notification-group__header">
                <strong>{{ group.title }}</strong>
                <span>{{ group.items.length }}条</span>
              </header>

              <article
                v-for="item in group.items"
                :key="item.id"
                :class="['notification-item', { unread: !item.read }]"
                @click="handleRead(item)"
              >
                <span :class="['notification-icon', noticeIconType(item.noticeType)]">
                  <WarningOutlined v-if="noticeIconType(item.noticeType) === 'warning'" />
                  <ProfileOutlined v-else-if="noticeIconType(item.noticeType) === 'task'" />
                  <BugOutlined v-else-if="noticeIconType(item.noticeType) === 'bug'" />
                  <SoundOutlined v-else />
                </span>

                <div class="notification-item__content">
                  <div class="notification-item__title">
                    <a-tag :class="['notification-tag', noticeIconType(item.noticeType)]">
                      {{ noticeTagLabel(item.noticeType) }}
                    </a-tag>
                    <strong>{{ item.title }}</strong>
                  </div>
                  <p>{{ item.content }}</p>
                </div>

                <div class="notification-item__extra">
                  <span>{{ formatTime(item.createdAt) }}</span>
                </div>
                <i v-if="!item.read" class="unread-dot" />
              </article>
            </section>
          </template>
          <a-empty v-else description="暂无通知" style="padding: 48px 0" />
        </div>
      </a-spin>
      <div class="notification-pagination">
        <a-pagination
          v-model:current="currentPage"
          v-model:page-size="pageSize"
          :total="pagedTotal"
          :page-size-options="pageSizeOptions"
          :show-total="t => `共 ${t} 条`"
          show-size-changer
          show-less-items
          @change="onPageChange"
        />
      </div>
    </a-card>
  </section>
</template>

<script setup>
import { BugOutlined, ProfileOutlined, SoundOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getNotices, markAllNoticesRead, markNoticeRead } from '@/api/notices'

const router = useRouter()

const activeTab = ref('all')
const keyword = ref('')
const loading = ref(false)
const markingAll = ref(false)
const notices = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = ['10', '50', '100']
const pagedTotal = ref(0)
const totalAll = ref(0)
const totalUnread = ref(0)
const totalRead = computed(() => Math.max(0, totalAll.value - totalUnread.value))

const NOTICE_TYPE_MAP = {
  TASK_ASSIGNED: { icon: 'task', label: '任务通知' },
  TASK_OVERDUE: { icon: 'warning', label: '预警通知' },
  PROJECT_WARNING: { icon: 'warning', label: '预警通知' },
  BUG_ASSIGNED: { icon: 'bug', label: 'BUG通知' },
  BUG_COMMENT: { icon: 'bug', label: '评论通知' },
  REQUIREMENT_STATUS_CHANGED: { icon: 'task', label: '需求通知' },
  SYSTEM: { icon: 'system', label: '系统通知' },
}

const noticeIconType = type => NOTICE_TYPE_MAP[type]?.icon || 'system'
const noticeTagLabel = type => NOTICE_TYPE_MAP[type]?.label || '通知'

const formatTime = (isoStr) => {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today - 86400000)
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const pad = n => String(n).padStart(2, '0')
  const hhmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (target >= today) return `今天 ${hhmm}`
  if (target >= yesterday) return `昨天 ${hhmm}`
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hhmm}`
}

const groupDate = (isoStr) => {
  if (!isoStr) return '更早'
  const d = new Date(isoStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today - 86400000)
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (target >= today) return '今天'
  if (target >= yesterday) return '昨天'
  return '更早'
}

const noticeGroups = computed(() => {
  const ORDER = ['今天', '昨天', '更早']
  const map = {}
  for (const n of notices.value) {
    const g = groupDate(n.createdAt)
    if (!map[g]) map[g] = []
    map[g].push(n)
  }
  return ORDER.filter(g => map[g]).map(g => ({ title: g, items: map[g] }))
})

const loadCounts = async () => {
  try {
    const [allRes, unreadRes] = await Promise.all([
      getNotices({ pageNo: 1, pageSize: 1 }),
      getNotices({ pageNo: 1, pageSize: 1, read: false }),
    ])
    totalAll.value = Number(allRes?.total ?? 0)
    totalUnread.value = Number(unreadRes?.total ?? 0)
  } catch { /* silent */ }
}

const loadNotices = async () => {
  loading.value = true
  try {
    const params = { pageNo: currentPage.value, pageSize: pageSize.value }
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    if (activeTab.value === 'unread') params.read = false
    if (activeTab.value === 'read') params.read = true
    const res = await getNotices(params)
    notices.value = res?.records || []
    pagedTotal.value = Number(res?.total ?? 0)
  } catch {
    message.error('加载通知失败')
  } finally {
    loading.value = false
  }
}

const handleRead = async (item) => {
  if (!item.read) {
    try {
      await markNoticeRead(item.id)
      item.read = true
      totalUnread.value = Math.max(0, totalUnread.value - 1)
      if (activeTab.value === 'unread') {
        pagedTotal.value = Math.max(0, pagedTotal.value - 1)
        notices.value = notices.value.filter(n => n.id !== item.id)
      }
    } catch { /* silent */ }
  }
  navigateTo(item)
}

const navigateTo = (item) => {
  if (!item.businessId) return
  const type = item.businessType
  if (type === 'Task') {
    router.push({ name: 'PersonalTaskDetail', params: { id: String(item.businessId) } })
  } else if (type === 'Bug') {
    router.push({ name: 'BugDetail', params: { id: String(item.businessId) } })
  } else if (type === 'ManagementProject') {
    router.push({ name: 'ManagementProjectDetail', params: { id: String(item.businessId) } })
  } else if (type === 'ExecutionProject') {
    router.push({ name: 'ExecutionProjectDetail', params: { id: String(item.businessId) } })
  }
}

const handleMarkAll = async () => {
  markingAll.value = true
  try {
    await markAllNoticesRead()
    totalUnread.value = 0
    notices.value.forEach(n => { n.read = true })
    if (activeTab.value === 'unread') {
      notices.value = []
      pagedTotal.value = 0
    }
    message.success('已全部标为已读')
  } catch {
    message.error('操作失败')
  } finally {
    markingAll.value = false
  }
}

const onTabChange = () => {
  currentPage.value = 1
  loadNotices()
}

const onPageChange = (page, size) => {
  currentPage.value = page
  pageSize.value = size
  loadNotices()
}

const handleSearch = () => {
  currentPage.value = 1
  loadNotices()
}

const handleKeywordChange = event => {
  if (event?.target?.value) return
  handleSearch()
}

onMounted(async () => {
  await Promise.all([loadCounts(), loadNotices()])
})
</script>

<style scoped>
.notification-center {
  width: min(1600px, 100%);
  height: calc(100vh - 68px - 52px - 40px);
  margin: 0 auto;
  min-height: 0;
  overflow: hidden;
}

.notification-card {
  height: 100%;
  min-height: 0;
  border: 1px solid var(--app-border);
  border-radius: 2px;
  box-shadow: none;
}

.notification-card :deep(.ant-card-body) {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 12px 18px 18px;
  overflow: hidden;
}

.notification-toolbar {
  flex: none;
  display: grid;
  grid-template-columns: auto 360px 120px;
  gap: 28px;
  align-items: center;
  margin-bottom: 16px;
}

.notification-tabs {
  min-width: 300px;
}

.notification-tabs :deep(.ant-tabs-nav) {
  margin: 0;
}

.notification-tabs :deep(.ant-tabs-tab) {
  padding: 10px 0;
  font-size: 14px;
  font-weight: 400;
}

.notification-tabs :deep(.ant-tabs-tab-btn) {
  font-size: 14px;
  font-weight: 400;
}

.notification-search {
  height: 40px;
}

.read-all-button {
  height: 40px;
  color: #1677ff;
}

.notification-list-spin {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.notification-list-spin :deep(.ant-spin-container) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.notification-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid #e8edf3;
  border-radius: 6px;
}

.notification-group + .notification-group {
  border-top: 12px solid #fff;
}

.notification-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 28px;
  color: #1f2937;
  background: #fff;
  border-bottom: 1px solid #edf0f3;
}

.notification-item {
  position: relative;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 160px;
  gap: 18px;
  align-items: center;
  min-height: 86px;
  padding: 16px 28px;
  background: #fff;
  border-left: 4px solid transparent;
  border-bottom: 1px solid #edf0f3;
  cursor: pointer;
  transition: background 0.15s;
}

.notification-item:hover {
  background: #f9fafb;
}

.notification-item:last-child {
  border-bottom: 0;
}

.notification-item.unread {
  border-left-color: #1677ff;
}

.notification-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #fff;
  font-size: 20px;
  border-radius: 50%;
}

.notification-icon.warning { background: #ff4d4f; }
.notification-icon.task { background: #1677ff; }
.notification-icon.bug { background: #fa8c16; }
.notification-icon.system { background: #6b7280; }

.notification-item__title {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 8px;
}

.notification-item__title strong {
  color: #1f2937;
  font-size: 14px;
}

.notification-tag {
  min-width: 76px;
  border: 0;
}

.notification-tag.warning {
  color: #ff4d4f;
  background: #fff1f0;
}

.notification-tag.task {
  color: #1677ff;
  background: #e6f4ff;
}

.notification-tag.bug {
  color: #fa8c16;
  background: #fff7e6;
}

.notification-tag.system {
  color: #6b7280;
  background: #f3f4f6;
}

.notification-item__content p {
  margin: 0;
  color: #6b7280;
}

.notification-item__extra {
  display: grid;
  justify-items: end;
  gap: 8px;
  color: #8c8c8c;
}

.unread-dot {
  position: absolute;
  top: 24px;
  right: 26px;
  width: 9px;
  height: 9px;
  background: #ff1f2d;
  border-radius: 50%;
}

.notification-pagination {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 40px;
  padding-top: 12px;
  background: #fff;
}
</style>
