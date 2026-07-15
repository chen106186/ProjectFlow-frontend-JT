<template>
  <section class="notification-center">
    <a-card class="notification-card" :bordered="false">
      <div class="notification-toolbar">
        <a-tabs v-model:active-key="activeTab" class="notification-tabs" @change="onTabChange">
          <a-tab-pane key="all" :tab="`全部 (${totalAll})`" />
          <a-tab-pane key="unread" :tab="`未读 (${totalUnread})`" />
          <a-tab-pane key="read" :tab="`已读 (${totalRead})`" />
        </a-tabs>

        <a-input v-model:value="keyword" class="notification-search" placeholder="搜索通知标题或内容" allow-clear>
          <template #suffix><SearchOutlined /></template>
        </a-input>

        <a-button class="read-all-button" :loading="markingAll" @click="handleMarkAll">全部已读</a-button>
      </div>

      <a-spin :spinning="loading">
        <div class="notification-list">
          <template v-if="filteredGroups.length">
            <section v-for="group in filteredGroups" :key="group.title" class="notification-group">
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
        <div v-if="pagedTotal > PAGE_SIZE" class="notification-pagination">
          <a-pagination
            v-model:current="currentPage"
            :total="pagedTotal"
            :page-size="PAGE_SIZE"
            :show-total="t => `共 ${t} 条`"
            show-less-items
            @change="onPageChange"
          />
        </div>
      </a-spin>
    </a-card>
  </section>
</template>

<script setup>
import { BugOutlined, ProfileOutlined, SearchOutlined, SoundOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getNotices, markAllNoticesRead, markNoticeRead } from '@/api/notices'

const router = useRouter()

const PAGE_SIZE = 20
const activeTab = ref('all')
const keyword = ref('')
const loading = ref(false)
const markingAll = ref(false)
const notices = ref([])
const currentPage = ref(1)
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

const filteredGroups = computed(() => {
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
    const params = { pageNo: currentPage.value, pageSize: PAGE_SIZE }
    if (activeTab.value === 'unread') params.read = false
    if (activeTab.value === 'read') params.read = true
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
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

let keywordTimer = null
watch(keyword, () => {
  clearTimeout(keywordTimer)
  keywordTimer = setTimeout(() => {
    currentPage.value = 1
    loadNotices()
  }, 300)
})

const onTabChange = () => {
  currentPage.value = 1
  loadNotices()
}

const onPageChange = (page) => {
  currentPage.value = page
  loadNotices()
}

onMounted(async () => {
  await Promise.all([loadCounts(), loadNotices()])
})
</script>

<style scoped>
.notification-center {
  min-height: 100%;
}

.notification-card {
  min-height: calc(100vh - 160px);
  border: 1px solid var(--app-border);
  border-radius: 2px;
  box-shadow: none;
}

.notification-card :deep(.ant-card-body) {
  padding: 12px 18px 18px;
}

.notification-toolbar {
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
  font-size: 16px;
  font-weight: 600;
}

.notification-search {
  height: 40px;
}

.read-all-button {
  height: 40px;
  color: #1677ff;
}

.notification-list {
  overflow: hidden;
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
  font-size: 16px;
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
  display: flex;
  justify-content: center;
  padding: 20px 0 8px;
}
</style>
