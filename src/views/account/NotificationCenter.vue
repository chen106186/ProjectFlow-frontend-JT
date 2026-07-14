<template>
  <section class="notification-center">
    <a-card class="notification-card" :bordered="false">
      <div class="notification-toolbar">
        <a-tabs v-model:active-key="activeTab" class="notification-tabs">
          <a-tab-pane key="all" tab="全部 (12)" />
          <a-tab-pane key="unread" tab="未读 (5)" />
          <a-tab-pane key="read" tab="已读 (7)" />
        </a-tabs>

        <a-input v-model:value="keyword" class="notification-search" placeholder="搜索通知标题或内容" allow-clear>
          <template #suffix><SearchOutlined /></template>
        </a-input>

        <a-button class="read-all-button">全部已读</a-button>
      </div>

      <div class="notification-list">
        <section v-for="group in filteredGroups" :key="group.title" class="notification-group">
          <header class="notification-group__header">
            <strong>{{ group.title }}</strong>
            <span>{{ group.items.length }}条</span>
          </header>

          <article v-for="item in group.items" :key="item.id" :class="['notification-item', { unread: item.unread }]">
            <span :class="['notification-icon', item.type]">
              <WarningOutlined v-if="item.type === 'warning'" />
              <ProfileOutlined v-else-if="item.type === 'task'" />
              <BugOutlined v-else-if="item.type === 'bug'" />
              <SoundOutlined v-else />
            </span>

            <div class="notification-item__content">
              <div class="notification-item__title">
                <a-tag :class="['notification-tag', item.type]">{{ item.tag }}</a-tag>
                <strong>{{ item.title }}</strong>
              </div>
              <p>{{ item.meta }}</p>
            </div>

            <div class="notification-item__extra">
              <span>{{ item.time }}</span>
              <a-button type="link">查看详情</a-button>
            </div>
            <i v-if="item.unread" class="unread-dot" />
          </article>
        </section>
      </div>
    </a-card>
  </section>
</template>

<script setup>
import { BugOutlined, ProfileOutlined, SearchOutlined, SoundOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { computed, ref } from 'vue'

const activeTab = ref('all')
const keyword = ref('')

const notificationGroups = [
  {
    title: '今天',
    items: [
      {
        id: 'notice-1',
        type: 'warning',
        tag: '预警通知',
        title: '任务「API接口开发」已逾期2天，请及时处理',
        meta: '项目：XX管理平台　｜　任务负责人：张三',
        time: '10分钟前',
        unread: true,
      },
      {
        id: 'notice-2',
        type: 'task',
        tag: '任务通知',
        title: '张三 将任务「门店管理页面开发」分配给您',
        meta: '项目：XX管理平台　｜　任务优先级：中',
        time: '1小时前',
        unread: true,
      },
    ],
  },
  {
    title: '昨天',
    items: [
      {
        id: 'notice-3',
        type: 'bug',
        tag: 'BUG通知',
        title: '您有一条BUG待处理：「保存按钮无响应」',
        meta: '项目：XX管理平台　｜　提交人：李四',
        time: '昨天 16:20',
        unread: false,
      },
      {
        id: 'notice-4',
        type: 'system',
        tag: '系统通知',
        title: '项目「XX管理平台」已进入测试阶段',
        meta: '系统自动推送',
        time: '昨天 16:30',
        unread: false,
      },
    ],
  },
]

const filteredGroups = computed(() => {
  const text = keyword.value.trim().toLowerCase()

  return notificationGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        const matchedTab =
          activeTab.value === 'all' ||
          (activeTab.value === 'unread' && item.unread) ||
          (activeTab.value === 'read' && !item.unread)
        const matchedKeyword = !text || `${item.title}${item.meta}${item.tag}`.toLowerCase().includes(text)
        return matchedTab && matchedKeyword
      }),
    }))
    .filter(group => group.items.length)
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

.notification-item__extra :deep(.ant-btn) {
  min-width: 96px;
  height: 36px;
  border: 1px solid #e6edf5;
  border-radius: 5px;
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
</style>
