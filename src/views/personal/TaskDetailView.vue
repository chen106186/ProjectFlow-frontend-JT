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
              <a-button type="primary" @click="uploadOpen = true">上传文件</a-button>
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
                    <a-button type="link" @click="handleDownloadAttachment(record)">下载</a-button>
                    <a-popconfirm title="确认删除该附件?" ok-text="删除" cancel-text="取消" @confirm="handleDeleteAttachment(record)">
                      <a-button type="link" danger>删除</a-button>
                    </a-popconfirm>
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
            <article v-for="bug in relatedBugs" v-else :key="bug.id || bug.bugNo || bug.code" class="bug-card">
              <p><BugOutlined /> {{ formatBugNo(bug) }}</p>
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

    <a-modal v-model:open="uploadOpen" width="40rem" title="上传文件" centered>
      <template #footer>
        <a-space>
          <a-button @click="uploadOpen = false">取消</a-button>
          <a-button type="primary" :loading="uploadLoading" @click="handleStartUpload">开始上传</a-button>
        </a-space>
      </template>
      <a-upload-dragger class="upload-dragger" :file-list="uploadFiles" name="file" :before-upload="handleBeforeUpload" @remove="handleRemoveUploadFile">
        <p class="upload-icon"><InboxOutlined /></p>
        <p>拖拽文件到此处，或点击选择文件</p>
        <p class="muted">支持：docx、xlsx、pdf、png、jpg、drawio，单个文件不超过 50MB</p>
      </a-upload-dragger>
    </a-modal>
  </section>
</template>

<script setup>
import { BugOutlined, EditOutlined, FileOutlined, FileTextOutlined, InboxOutlined, LeftOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { deleteProjectFile, downloadProjectFile, getProjectBugs, getProjectFiles, getTaskById, uploadProjectFile } from '@/api/managementProject'
import { useDictStore } from '@/store/dictStore'
import { formatDateTime } from '@/utils/dateTime'

const route = useRoute()
const router = useRouter()
const dictStore = useDictStore()

const loading = ref(false)
const taskDetail = ref(null)
const attachmentRows = ref([])
const relatedBugRows = ref([])
const uploadOpen = ref(false)
const uploadLoading = ref(false)
const uploadFiles = ref([])

const attachmentColumns = [
  { title: '文件名', dataIndex: 'name', width: 230 },
  { title: '类型', dataIndex: 'type', width: 100 },
  { title: '大小', dataIndex: 'size', width: 100 },
  { title: '版本', dataIndex: 'version', width: 100 },
  { title: '上传人', dataIndex: 'uploaderName', width: 120 },
  { title: '上传时间', dataIndex: 'uploadTime', width: 130 },
  { title: '操作', dataIndex: 'operation', width: 110 },
]

const attachments = computed(() =>
  attachmentRows.value.map(item => ({
    id: item.id,
    name: item.originalName || '-',
    type: getFileType(item),
    size: formatFileSize(item.fileSize),
    version: item.versionNo || '-',
    uploaderName: item.uploaderId ? `用户 ${item.uploaderId}` : '-',
    uploadTime: formatShortDateTime(item.uploadedAt),
  }))
)

const operationLogs = computed(() => Array.isArray(taskDetail.value?.logs) ? taskDetail.value.logs : [])
const relatedBugs = computed(() => relatedBugRows.value)

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

const getFileType = file => {
  const fileName = file?.originalName || ''
  const extension = fileName.includes('.') ? fileName.split('.').pop() : ''
  return extension ? extension.toUpperCase() : (file?.contentType || '-')
}

const formatFileSize = size => {
  const value = Number(size)
  if (!Number.isFinite(value)) {
    return '-'
  }
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)}MB`
  }
  return `${Math.ceil(value / 1024)}KB`
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

const formatBugNo = bug => {
  if (bug?.bugNo) return `#${String(bug.bugNo).padStart(3, '0')}`
  if (bug?.code) return bug.code
  return bug?.id ? `BUG-${bug.id}` : '-'
}

const fetchTaskDetail = async () => {
  loading.value = true

  try {
    await dictStore.loadDicts()
    const [detail, files, bugs] = await Promise.all([
      getTaskById(route.params.id),
      getProjectFiles({ businessType: 'TASK', businessId: route.params.id }),
      fetchAllTaskBugs(route.params.id),
    ])
    taskDetail.value = detail
    attachmentRows.value = Array.isArray(files) ? files : []
    relatedBugRows.value = bugs
  } catch (error) {
    message.error(error.message || '任务详情加载失败')
  } finally {
    loading.value = false
  }
}

const fetchAllTaskBugs = async taskId => {
  const pageSize = 200
  const first = await getProjectBugs({ taskId, pageNo: 1, pageSize })
  const records = [...(first.records || [])]
  const total = Number(first.total || records.length)
  const pages = Math.ceil(total / pageSize)
  for (let pageNo = 2; pageNo <= pages; pageNo += 1) {
    const next = await getProjectBugs({ taskId, pageNo, pageSize })
    records.push(...(next.records || []))
  }
  return records
}

const handleBack = () => router.back()

const handleBeforeUpload = file => {
  if (file.size > 50 * 1024 * 1024) {
    message.warning('单个文件不能超过50MB')
    return false
  }
  uploadFiles.value.push({
    uid: file.uid,
    name: file.name,
    status: 'done',
    originFile: file,
  })
  return false
}

const handleRemoveUploadFile = file => {
  uploadFiles.value = uploadFiles.value.filter(item => item.uid !== file.uid)
}

const refreshAttachments = async () => {
  const files = await getProjectFiles({ businessType: 'TASK', businessId: route.params.id })
  attachmentRows.value = Array.isArray(files) ? files : []
}

const handleStartUpload = async () => {
  if (!uploadFiles.value.length) {
    message.warning('请选择需要上传的文件')
    return
  }

  uploadLoading.value = true
  try {
    for (const uploadFile of uploadFiles.value) {
      const data = new FormData()
      data.append('businessType', 'TASK')
      data.append('businessId', route.params.id)
      data.append('storageLocation', 'BUSINESS')
      data.append('file', uploadFile.originFile)
      await uploadProjectFile(data)
    }
    message.success('文件上传成功')
    uploadOpen.value = false
    uploadFiles.value = []
    await refreshAttachments()
  } catch (error) {
    message.error(error.message || '文件上传失败')
  } finally {
    uploadLoading.value = false
  }
}

const handleDownloadAttachment = async record => {
  try {
    const result = await downloadProjectFile(record.id)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(result.blob)
    link.download = result.fileName
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (error) {
    message.error(error.message || '附件下载失败')
  }
}

const handleDeleteAttachment = async record => {
  try {
    await deleteProjectFile(record.id)
    attachmentRows.value = attachmentRows.value.filter(item => item.id !== record.id)
    message.success('附件删除成功')
  } catch (error) {
    message.error(error.message || '附件删除失败')
  }
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
  border-radius: 8px;
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
  height: 34px;
  padding: 8px 11px;
  font-size: 14px;
  text-align: left;
  border: 1px solid #edf0f3;
  word-break: break-word;
}

.native-info-table th {
  width: 10%;
  color: #111827;
  font-weight: 500;
  background: #fafafa;
}

.native-info-table td {
  width: 20%;
  background: #fff;
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

.upload-dragger {
  margin-bottom: 12px;
}

.upload-icon {
  color: #1677ff;
  font-size: 42px;
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
