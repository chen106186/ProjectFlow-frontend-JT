<template>
  <section class="requirement-detail-page">
    <div class="detail-actions">
      <a-button class="back-button" @click="handleBack">
        <template #icon><ArrowLeftOutlined /></template>
        返回
      </a-button>
      <template v-if="requirement">
        <a-tag :color="statusColor(requirement.status)">{{ statusLabel }}</a-tag>
        <a-tag :color="priorityColor(requirement.priority)">{{ priorityLabel }}</a-tag>
        <div class="detail-actions__right">
          <a-button v-if="canEdit" @click="openEditModal">编辑</a-button>
          <template v-if="requirement.status === 'PENDING_REVIEW'">
            <a-button type="primary" :loading="statusLoading === 'ACCEPTED'" @click="handleStatusChange('ACCEPTED')">采纳</a-button>
            <a-button danger :loading="statusLoading === 'REJECTED'" @click="handleStatusChange('REJECTED')">未采纳</a-button>
            <a-button :loading="statusLoading === 'SHELVED'" @click="handleStatusChange('SHELVED')">搁置</a-button>
          </template>
        </div>
      </template>
    </div>

    <a-card class="detail-card" :bordered="false">
      <template #title>
        <span class="detail-card__title">需求信息</span>
      </template>

      <a-spin :spinning="loading">
        <template v-if="requirement">
          <table class="native-info-table">
            <tbody>
              <tr>
                <th>需求编号</th>
                <td>{{ requirementNo }}</td>
                <th>需求标题</th>
                <td colspan="3">{{ requirement.title || '-' }}</td>
              </tr>
              <tr>
                <th>所属项目</th>
                <td>{{ projectName }}</td>
                <th>需求类型</th>
                <td><a-tag color="blue">{{ typeLabel }}</a-tag></td>
                <th>优先级</th>
                <td><a-tag :color="priorityColor(requirement.priority)">{{ priorityLabel }}</a-tag></td>
              </tr>
              <tr>
                <th>提交人</th>
                <td>{{ requirement.creatorName || '-' }}</td>
                <th>状态</th>
                <td><a-tag :color="statusColor(requirement.status)">{{ statusLabel }}</a-tag></td>
                <th>创建时间</th>
                <td>{{ createdAtText }}</td>
              </tr>
            </tbody>
          </table>

          <section class="description-section">
            <h3 class="desciption-sub-title">需求描述</h3>
            <p class="description-section-detail">{{ requirement.description || '-' }}</p>
          </section>
        </template>
        <a-empty v-else-if="!loading" description="暂无需求详情" />
      </a-spin>
    </a-card>

    <a-card class="logs-card" :bordered="false">
      <template #title>
        <span class="detail-card__title">操作日志</span>
      </template>
      <a-spin :spinning="logsLoading">
        <a-empty v-if="!logsLoading && logs.length === 0" description="暂无操作日志" />
        <a-timeline v-else class="req-timeline">
          <a-timeline-item
            v-for="(log, idx) in logsReversed"
            :key="log.id"
            :color="idx === 0 ? 'blue' : (log.operationType === 'CREATE' ? 'green' : 'gray')"
          >
            <div class="log-meta">
              <span>{{ formatLogTime(log.createdAt) }}</span>
              <span class="log-operator">{{ log.operatorName || '-' }}</span>
            </div>
            <div class="log-content">{{ log.content || '-' }}</div>
          </a-timeline-item>
        </a-timeline>
      </a-spin>
    </a-card>

    <!-- 编辑弹窗 -->
    <a-modal
      v-model:open="editVisible"
      title="编辑需求"
      width="45rem"
      :confirm-loading="editLoading"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleEditSubmit"
    >
      <a-form ref="editFormRef" :model="editForm" :rules="editRules" :label-col="{ span: 4 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="需求标题" name="title">
          <a-input v-model:value="editForm.title" />
        </a-form-item>
        <a-form-item label="所属项目" name="projectId">
          <a-select v-model:value="editForm.projectId" show-search :options="projectOptions" option-filter-prop="label" />
        </a-form-item>
        <a-form-item label="需求类型" name="requirementType">
          <a-select v-model:value="editForm.requirementType" :options="typeOptions" />
        </a-form-item>
        <a-form-item label="优先级" name="priority">
          <a-select v-model:value="editForm.priority" :options="priorityOptions" />
        </a-form-item>
        <a-form-item label="审核人" name="reviewerId">
          <a-select v-model:value="editForm.reviewerId" show-search :options="reviewerOptions" option-filter-prop="label" />
        </a-form-item>
        <a-form-item label="标签">
          <a-input v-model:value="editForm.tags" placeholder="多个标签请用逗号分隔" />
        </a-form-item>
        <a-form-item label="需求描述" name="description">
          <a-textarea v-model:value="editForm.description" :rows="6" />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup>
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getProjectList, getSystemUsers } from '@/api/managementProject'
import { getRequirementById, getRequirementLogs, updateRequirement, updateRequirementStatus } from '@/api/requirements'
import { useDictStore } from '@/store/dictStore'
import { formatDateTime } from '@/utils/dateTime'

const route = useRoute()
const router = useRouter()
const dictStore = useDictStore()

const from = route.query.from

const loading = ref(false)
const requirement = ref(null)
const projectMap = ref({})
const userRows = ref([])
const statusLoading = ref('')
const editVisible = ref(false)
const editLoading = ref(false)
const editFormRef = ref()
const logs = ref([])
const logsLoading = ref(false)

const editForm = reactive({
  title: '',
  projectId: undefined,
  reviewerId: undefined,
  requirementType: undefined,
  priority: undefined,
  description: '',
  tags: '',
})

const editRules = {
  title: [{ required: true, message: '请输入需求标题', trigger: 'blur' }],
  projectId: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  reviewerId: [{ required: true, message: '请选择审核人', trigger: 'change' }],
  requirementType: [{ required: true, message: '请选择需求类型', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  description: [{ required: true, message: '请输入需求描述', trigger: 'blur' }],
}

const requirementNo = computed(() => {
  if (!requirement.value) return '-'
  if (requirement.value.requirementNo != null) {
    const year = requirement.value.createdAt ? dayjs(requirement.value.createdAt).format('YYYY') : dayjs().format('YYYY')
    return `REQ-${year}-${String(requirement.value.requirementNo).padStart(4, '0')}`
  }
  return '-'
})

const projectName = computed(() => projectMap.value[requirement.value?.projectId] || '-')
const typeLabel = computed(() => dictStore.getDictLabel('requirementType', requirement.value?.requirementType) || '-')
const priorityLabel = computed(() => dictStore.getDictLabel('requirementPriority', requirement.value?.priority) || '-')
const statusLabel = computed(() => dictStore.getDictLabel('requirementStatus', requirement.value?.status) || '-')
const createdAtText = computed(() => formatDateTime(requirement.value?.createdAt))
const logsReversed = computed(() => [...logs.value].reverse())

const currentUserId = () => {
  try { return JSON.parse(localStorage.getItem('userInfo') || '{}').id } catch { return null }
}
const canEdit = computed(() => requirement.value && String(requirement.value.createdBy) === String(currentUserId()))

const typeOptions = computed(() => dictStore.getDictItems('requirementType'))
const priorityOptions = computed(() => dictStore.getDictItems('requirementPriority'))
const projectOptions = computed(() => Object.entries(projectMap.value).map(([value, label]) => ({ value, label })))
const reviewerOptions = computed(() => userRows.value.map(user => ({ label: user.realName || user.username, value: user.id })))

const priorityColor = value => ({ URGENT: 'red', HIGH: 'orange', MEDIUM: 'gold', LOW: 'default' }[value] || 'default')
const statusColor = value => ({ PENDING_REVIEW: 'blue', ACCEPTED: 'green', REJECTED: 'red', SHELVED: 'orange' }[value] || 'default')
const statusSuccessText = status => ({ ACCEPTED: '需求已采纳', REJECTED: '需求未采纳', SHELVED: '需求已搁置' }[status] || '状态已更新')
const formatLogTime = dt => formatDateTime(dt)
const loadProjects = async () => {
  const result = await getProjectList({ pageNo: 1, pageSize: 200, projectType: 'EXECUTION' })
  projectMap.value = Object.fromEntries((result.records || []).map(item => [item.id, item.name]))
}

const loadUsers = async () => {
  const result = await getSystemUsers({ pageNo: 1, pageSize: 200, enabled: true })
  userRows.value = result.records || []
}

const loadDetail = async () => {
  loading.value = true
  try {
    requirement.value = await getRequirementById(route.params.id)
  } catch (error) {
    requirement.value = null
    message.error(error.message || '需求详情加载失败')
  } finally {
    loading.value = false
  }
}

const loadLogs = async () => {
  logsLoading.value = true
  try {
    logs.value = await getRequirementLogs(route.params.id) || []
  } catch {
    logs.value = []
  } finally {
    logsLoading.value = false
  }
}

const handleStatusChange = async status => {
  statusLoading.value = status
  try {
    requirement.value = await updateRequirementStatus(route.params.id, status)
    await loadLogs()
    message.success(statusSuccessText(status))
  } catch (error) {
    message.error(error.message || '状态更新失败')
  } finally {
    statusLoading.value = ''
  }
}

const openEditModal = () => {
  const r = requirement.value
  Object.assign(editForm, {
    title: r.title || '',
    projectId: r.projectId,
    reviewerId: r.reviewerId,
    requirementType: r.requirementType,
    priority: r.priority,
    description: r.description || '',
    tags: r.tags || '',
  })
  editFormRef.value?.clearValidate()
  editVisible.value = true
}

const handleEditSubmit = async () => {
  if (editLoading.value) return
  await editFormRef.value?.validate()
  editLoading.value = true
  try {
    requirement.value = await updateRequirement(route.params.id, {
      title: editForm.title,
      projectId: editForm.projectId,
      reviewerId: editForm.reviewerId,
      requirementType: editForm.requirementType,
      priority: editForm.priority,
      description: editForm.description,
      tags: editForm.tags || undefined,
    })
    await loadLogs()
    message.success('需求已更新')
    editVisible.value = false
  } catch (error) {
    message.error(error.message || '更新失败')
  } finally {
    editLoading.value = false
  }
}

const handleBack = () => {
  if (from === 'management') {
    router.push({ name: 'RequirementManagement' })
  } else {
    router.push({ name: 'PersonalRequirements' })
  }
}

const initPage = async () => {
  const id = route.params.id
  if (!id || id === 'undefined' || id === 'null') {
    message.error('无效的需求 ID，请重新进入')
    router.replace({ name: from === 'management' ? 'RequirementManagement' : 'PersonalRequirements' })
    return
  }
  await dictStore.loadDicts()
  await loadProjects()
  await loadUsers()
  await Promise.all([loadDetail(), loadLogs()])
}

onMounted(initPage)
</script>

<style scoped>
.requirement-detail-page {
  width: min(1600px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.detail-actions__right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.detail-card,
.logs-card {
  border: 1px solid #edf0f3;
  box-shadow: 0 2px 8px rgb(0 0 0 / 3%);
}

.detail-card :deep(.ant-card-body),
.logs-card :deep(.ant-card-body) {
  padding: 18px 22px 24px;
}

.detail-card :deep(.ant-card-head) {
  border-bottom: 0;
}

.detail-card__title {
  font-size: 16px;
  font-weight: 600;
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
  padding:8px 11px;
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

.description-section {
  margin-top: 16px;
  color: #333;
}

.description-section .desciption-sub-title{
  font-size: 16px;
  font-weight: 600;
}

.description-section .description-section-detail{

  background: #f5f5f7;
  border-radius: 8px;
  color: #1d1d1f;
  padding: 14px;
  font-size: 14px;
  line-height: 1.7;
}

.description-section h3 {
  margin: 0 0 14px;
  color: #111827;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
}

.description-section p {
  margin: 0;
  line-height: 1.9;
  white-space: pre-wrap;
}

.req-timeline {
  padding-top: 8px;
}

.log-meta {
  font-size: 13px;
  color: #8c8c8c;
  margin-bottom: 4px;
}

.log-operator {
  margin-left: 10px;
  font-weight: 500;
  color: #595959;
}

.log-content {
  font-size: 14px;
  color: #262626;
  line-height: 1.6;
}
</style>
