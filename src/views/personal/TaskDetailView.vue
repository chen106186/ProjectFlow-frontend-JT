<template>
  <section class="task-detail-page">
    <div class="detail-actions">
      <a-button class="back-button" @click="handleBack">
        <template #icon><LeftOutlined /></template>
        返回
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <a-card class="detail-card task-summary-card" :bordered="false">
        <table class="native-info-table">
          <tbody>
            <tr>
              <th>任务名称</th>
              <td>{{ taskDetail?.name || '-' }}</td>
              <th>所属项目</th>
              <td>{{ getProjectName(taskDetail) }}</td>
              <th>负责人</th>
              <td>{{ getUserName(taskDetail) }}</td>
            </tr>
            <tr>
              <th>角色</th>
              <td>{{ taskDetail?.roleName || '-' }}</td>
              <th>创建时间</th>
              <td>{{ getDateValue(taskDetail?.createdAt || taskDetail?.createTime || taskDetail?.createdTime) }}</td>
              <th>优先级</th>
              <td><a-tag :color="getPriorityColor(taskDetail?.priority)">{{ getDictLabel('taskPriority', taskDetail?.priority) || '-' }}</a-tag></td>
            </tr>
            <tr>
              <th>状态</th>
              <td><a-tag :color="getStatusColor(taskDetail?.status)">{{ getDictLabel('taskStatus', taskDetail?.status) || '-' }}</a-tag></td>
              <th>计划开始日期</th>
              <td>{{ getDateValue(taskDetail?.plannedStartDate) }}</td>
              <th>计划结束日期</th>
              <td>{{ getDateValue(taskDetail?.plannedEndDate) }}</td>
            </tr>
            <tr>
              <th>实际开始日期</th>
              <td>{{ getDateValue(taskDetail?.actualStartDate) }}</td>
              <th>实际结束日期</th>
              <td>{{ getDateValue(taskDetail?.actualEndDate) }}</td>
              <th>标签</th>
              <td>{{ taskDetail?.tags || '-' }}</td>
            </tr>
            <tr>
              <th>任务描述</th>
              <td colspan="5">{{ taskDetail?.description || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </a-card>

      <div class="detail-content-grid">
        <main class="detail-main">
          <a-card class="detail-card attachment-card" :bordered="false">
            <template #title>
              <span class="section-title"><FileTextOutlined /> 附件展示</span>
            </template>
            <template #extra>
              <a-button type="primary">上传文件</a-button>
            </template>

            <a-table
              :columns="attachmentColumns"
              :data-source="attachments"
              :pagination="false"
              row-key="id"
              size="middle"
              :locale="{ emptyText: '暂无附件' }"
            >
              <template #bodyCell="{ column, record, text }">
                <template v-if="column.dataIndex === 'name'">
                  <span class="file-name"><FileOutlined />{{ text }}</span>
                </template>
                <template v-else-if="column.dataIndex === 'operation'">
                  <a-space :size="4">
                    <a-button type="link">下载</a-button>
                    <a-button type="link" danger>删除</a-button>
                  </a-space>
                </template>
                <template v-else>{{ record[column.dataIndex] || '-' }}</template>
              </template>
            </a-table>
          </a-card>

          <a-card class="detail-card log-card" :bordered="false">
            <template #title>
              <span class="section-title"><EditOutlined /> 操作日志</span>
            </template>

            <a-empty v-if="!operationLogs.length" description="暂无操作日志" />
            <a-timeline v-else>
              <a-timeline-item v-for="log in operationLogs" :key="log.id">
                <span class="log-meta">{{ formatDateTime(log.time || log.createdAt || log.createTime) }}　{{ log.userName || log.operatorName || log.user || '-' }}</span>
                <p>{{ log.content || log.detail || log.text || '-' }}</p>
              </a-timeline-item>
            </a-timeline>
          </a-card>
        </main>

        <aside class="related-bugs-card">
          <a-card class="detail-card" :bordered="false">
            <template #title>
              <span class="section-title"><BugOutlined /> 关联Bug ({{ relatedBugs.length }})</span>
            </template>

            <a-empty v-if="!relatedBugs.length" description="暂无关联Bug" />
            <article v-for="bug in relatedBugs" v-else :key="bug.id || bug.code" class="bug-card">
              <p><BugOutlined /> {{ bug.code || bug.bugNo || bug.id }}</p>
              <strong>{{ bug.title || bug.name || '-' }}</strong>
              <div>
                <a-tag :color="getBugLevelColor(bug.priority || bug.severity)">{{ getDictLabel('bugPriority', bug.priority || bug.severity) || bug.priority || bug.severity || '-' }}</a-tag>
                <a-tag :color="getBugStatusColor(bug.status)">{{ getDictLabel('bugStatus', bug.status) || bug.status || '-' }}</a-tag>
              </div>
            </article>
          </a-card>
        </aside>
      </div>
    </a-spin>
  </section>
</template>

<script setup>
import { BugOutlined, EditOutlined, FileOutlined, FileTextOutlined, LeftOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getTaskById } from '@/api/managementProject'
import { useDictStore } from '@/store/dictStore'
import { formatDateTime } from '@/utils/dateTime'

const route = useRoute()
const router = useRouter()
const dictStore = useDictStore()

const loading = ref(false)
const taskDetail = ref(null)

const attachmentColumns = [
  { title: '文件名', dataIndex: 'name', width: 230 },
  { title: '类型', dataIndex: 'type', width: 100 },
  { title: '大小', dataIndex: 'size', width: 100 },
  { title: '版本', dataIndex: 'version', width: 100 },
  { title: '上传人', dataIndex: 'uploaderName', width: 120 },
  { title: '上传时间', dataIndex: 'uploadTime', width: 130 },
  { title: '操作', dataIndex: 'operation', width: 110 },
]

const getArrayField = (record, fields) => {
  for (const field of fields) {
    if (Array.isArray(record?.[field])) {
      return record[field]
    }
  }

  return []
}

const attachments = computed(() =>
  getArrayField(taskDetail.value, ['attachments', 'files', 'fileList', 'documents']).map((item, index) => ({
    id: item.id || item.fileId || item.name || index,
    name: item.name || item.fileName || item.originalName || '-',
    type: item.type || item.fileType || item.extension || '-',
    size: item.sizeText || item.fileSizeText || item.size || '-',
    version: item.version || '-',
    uploaderName: item.uploaderName || item.uploadUserName || item.creatorName || '-',
    uploadTime: formatShortDateTime(item.uploadTime || item.createdAt || item.createTime),
  }))
)

const operationLogs = computed(() => getArrayField(taskDetail.value, ['logs', 'operationLogs', 'histories', 'historyList']))
const relatedBugs = computed(() => getArrayField(taskDetail.value, ['relatedBugs', 'bugs', 'bugList']))

const getDictLabel = (type, value) => {
  if (!value) {
    return ''
  }

  return dictStore.getDictLabel(type, value)
}

const getDateValue = value => {
  if (!value) {
    return '-'
  }

  return String(value).replace('T', ' ').slice(0, 10)
}

const formatShortDateTime = value => {
  if (!value) {
    return '-'
  }

  const text = String(value).replace('T', ' ')
  return text.length > 10 ? text.slice(5, 16) : text
}

const getProjectName = task => task?.projectName || task?.project?.name || task?.projectTitle || task?.projectId || '-'
const getUserName = task => task?.assigneeName || task?.assignee?.realName || task?.ownerName || task?.assigneeId || '-'

const getStatusColor = status => {
  const map = { NOT_STARTED: 'default', IN_PROGRESS: 'blue', DUE_SOON: 'orange', OVERDUE: 'red', COMPLETED: 'green', PAUSED: 'purple' }
  return map[status] || 'default'
}

const getPriorityColor = priority => {
  const map = { URGENT: 'red', HIGH: 'orange', MEDIUM: 'blue', LOW: 'default' }
  return map[priority] || 'default'
}

const getBugLevelColor = level => {
  const map = { FATAL: 'red', CRITICAL: 'red', SERIOUS: 'red', HIGH: 'red', MEDIUM: 'orange', LOW: 'blue', NORMAL: 'orange' }
  return map[level] || 'orange'
}

const getBugStatusColor = status => {
  const map = { SUBMITTED: 'blue', CONFIRMED: 'orange', FIXING: 'orange', PENDING_VERIFY: 'purple', CLOSED: 'green', RESOLVED: 'green' }
  return map[status] || 'blue'
}

const fetchTaskDetail = async () => {
  loading.value = true

  try {
    await dictStore.loadDicts()
    taskDetail.value = await getTaskById(route.params.id)
  } catch (error) {
    message.error(error.message || '任务详情加载失败')
  } finally {
    loading.value = false
  }
}

const handleBack = () => {
  router.push('/personal/tasks')
}

onMounted(fetchTaskDetail)
</script>

<style scoped>
.task-detail-page {
  min-height: 100%;
}

.detail-actions {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 8px;
}

.back-button {
  width: 124px;
}

.detail-card {
  border: 1px solid var(--app-border);
  border-radius: 6px;
  box-shadow: none;
}

.detail-card :deep(.ant-card-body) {
  padding: 14px 18px;
}

.task-summary-card {
  margin-bottom: 12px;
}

.native-info-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  color: #111827;
}

.native-info-table th,
.native-info-table td {
  height: 48px;
  padding: 12px 14px;
  font-size: 14px;
  text-align: left;
  border: 1px solid #e6ebf1;
  word-break: break-word;
}

.native-info-table th {
  width: 12%;
  color: #334155;
  font-weight: 700;
  background: #f3f6fa;
}

.native-info-table td {
  width: 21.333%;
  background: #fff;
  font-weight: 400;
}

.detail-content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 12px;
  align-items: start;
}

.detail-main {
  min-width: 0;
}

.attachment-card {
  margin-bottom: 12px;
}

.attachment-card :deep(.ant-card-head),
.log-card :deep(.ant-card-head),
.related-bugs-card :deep(.ant-card-head) {
  min-height: 36px;
  padding: 0 16px;
  border-bottom: 0;
}

.attachment-card :deep(.ant-card-head-title),
.log-card :deep(.ant-card-head-title),
.related-bugs-card :deep(.ant-card-head-title) {
  padding: 8px 0;
}

.attachment-card :deep(.ant-card-extra) {
  padding: 6px 0;
}

.attachment-card :deep(.ant-btn-primary) {
  height: 30px;
}

.section-title {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: #111827;
  font-size: 16px;
  font-weight: 700;
}

.file-name {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.log-card {
  min-height: 334px;
}

.log-card :deep(.ant-card-body) {
  max-height: 336px;
  overflow: auto;
}

.log-meta {
  color: #8c8c8c;
  font-size: 13px;
}

.log-card p {
  margin: 6px 0 0;
  color: #111827;
}

.related-bugs-card {
  min-width: 0;
}

.related-bugs-card .detail-card {
  min-height: 456px;
}

.related-bugs-card :deep(.ant-card-body) {
  max-height: 520px;
  overflow: auto;
}

.bug-card {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
}

.bug-card + .bug-card {
  margin-top: 10px;
}

.bug-card p {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin: 0 0 4px;
  color: #8c8c8c;
}

.bug-card strong {
  display: block;
  margin-bottom: 8px;
  color: #111827;
  font-weight: 500;
}

</style>
