<template>
  <section class="requirement-page">
    <a-card class="requirement-filter app-filter-card" :bordered="false">
      <a-form class="requirement-filter__form app-filter-form" layout="inline">
        <a-form-item label="搜索">
          <a-input v-model:value="query.keyword" allow-clear placeholder="请输入关键字" />
        </a-form-item>
        <a-form-item label="所属项目">
          <a-select v-model:value="query.projectId" allow-clear placeholder="全部" :options="projectFilterOptions" />
        </a-form-item>
        <a-form-item label="需求类型">
          <a-select v-model:value="query.requirementType" allow-clear placeholder="全部" :options="typeFilterOptions" />
        </a-form-item>
        <a-form-item label="优先级">
          <a-select v-model:value="query.priority" allow-clear placeholder="全部" :options="priorityFilterOptions" />
        </a-form-item>
        <a-form-item label="需求状态">
          <a-select v-model:value="query.status" allow-clear placeholder="全部" :options="statusFilterOptions" />
        </a-form-item>
        <a-form-item class="requirement-filter__actions app-filter-actions">
          <a-space>
            <a-button type="primary" @click="handleSearch">查询</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card class="requirement-list" :bordered="false">
      <div class="requirement-list__toolbar">
        <a-button type="primary" @click="openCreateModal">
          <PlusOutlined />
          新增需求
        </a-button>
        <div class="requirement-list__display">
          <span>分组条件：</span>
          <a-select v-model:value="groupField" :options="groupOptions" />
          <a-radio-group v-model:value="displayMode" button-style="solid">
            <a-radio-button value="list">列表</a-radio-button>
            <a-radio-button value="group">分组</a-radio-button>
          </a-radio-group>
        </div>
      </div>

      <a-table
        v-if="displayMode === 'list'"
        row-key="id"
        :columns="columns"
        :data-source="pagedRows"
        :pagination="pagination"
        :loading="loading"
        :scroll="{ x: 1220 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record, text }">
          <template v-if="column.dataIndex === 'requirementNo'">
            <span class="requirement-no">{{ text }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'title'">
            <a-button type="link" class="table-link" @click="handleDetail(record)">{{ text }}</a-button>
          </template>
          <template v-else-if="column.dataIndex === 'requirementType'">
            <a-tag color="blue">{{ text }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'priority'">
            <a-tag :color="priorityColor(record.priorityCode)">{{ text }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="statusColor(record.statusCode)">{{ text }}</a-tag>
          </template>
          <template v-else>{{ text || '-' }}</template>
        </template>
      </a-table>

      <div v-else class="requirement-group-list">
        <section v-for="group in groupedRows" :key="group.value" class="requirement-group">
          <header class="requirement-group__header">
            <strong>{{ group.label }}</strong>
            <a-tag>{{ group.rows.length }}</a-tag>
          </header>
          <a-table row-key="id" :columns="columns" :data-source="group.rows" :pagination="false" :scroll="{ x: 1220 }">
            <template #bodyCell="{ column, record, text }">
              <template v-if="column.dataIndex === 'title'">
                <a-button type="link" class="table-link" @click="handleDetail(record)">{{ text }}</a-button>
              </template>
              <template v-else-if="column.dataIndex === 'requirementType'">
                <a-tag color="blue">{{ text }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'priority'">
                <a-tag :color="priorityColor(record.priorityCode)">{{ text }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'status'">
                <a-tag :color="statusColor(record.statusCode)">{{ text }}</a-tag>
              </template>
              <template v-else>{{ text || '-' }}</template>
            </template>
          </a-table>
        </section>
      </div>
    </a-card>

    <a-modal
      v-model:open="createVisible"
      title="新增需求"
      width="720px"
      :confirm-loading="submitLoading"
      ok-text="确定"
      cancel-text="取消"
      @ok="handleSubmit"
    >
      <a-form ref="formRef" :model="formState" :rules="formRules" :label-col="{ span: 4 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="需求标题" name="title">
          <a-input v-model:value="formState.title" placeholder="请输入需求标题" />
        </a-form-item>
        <a-form-item label="所属项目" name="projectId">
          <a-select
            v-model:value="formState.projectId"
            show-search
            placeholder="请选择所属项目"
            :options="projectOptions"
            option-filter-prop="label"
          />
        </a-form-item>
        <a-form-item label="需求类型" name="requirementType">
          <a-select v-model:value="formState.requirementType" :options="typeOptions" placeholder="请选择需求类型" />
        </a-form-item>
        <a-form-item label="优先级" name="priority">
          <a-select v-model:value="formState.priority" :options="priorityOptions" placeholder="请选择优先级" />
        </a-form-item>
        <a-form-item label="审核人" name="reviewerId">
          <a-select
            v-model:value="formState.reviewerId"
            show-search
            :options="reviewerOptions"
            option-filter-prop="label"
            placeholder="请选择审核人"
          />
        </a-form-item>
        <a-form-item label="标签">
          <a-input v-model:value="formState.tags" placeholder="多个标签请用逗号分隔" />
        </a-form-item>
        <a-form-item label="需求描述" name="description">
          <a-textarea v-model:value="formState.description" :rows="6" placeholder="请输入需求描述" />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup>
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getProjectList, getSystemUsers } from '@/api/managementProject'
import { createRequirement, listMyRequirements } from '@/api/requirements'
import { useDictStore } from '@/store/dictStore'
import { formatDateTime } from '@/utils/dateTime'

const router = useRouter()
const dictStore = useDictStore()

const loading = ref(false)
const submitLoading = ref(false)
const createVisible = ref(false)
const formRef = ref()
const requirementRows = ref([])
const projectRows = ref([])
const userRows = ref([])

const query = reactive({
  keyword: '',
  projectId: undefined,
  requirementType: undefined,
  priority: undefined,
  status: undefined,
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: total => `共 ${total} 条`,
})

const displayMode = ref('list')
const groupField = ref('projectName')
const groupOptions = [{ label: '所属项目', value: 'projectName' }]

const createDefaultForm = () => ({
  title: '',
  projectId: undefined,
  reviewerId: undefined,
  requirementType: undefined,
  priority: undefined,
  description: '',
  tags: '',
})

const formState = reactive(createDefaultForm())

const formRules = {
  title: [{ required: true, message: '请输入需求标题', trigger: 'blur' }],
  projectId: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  reviewerId: [{ required: true, message: '请选择审核人', trigger: 'change' }],
  requirementType: [{ required: true, message: '请选择需求类型', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  description: [{ required: true, message: '请输入需求描述', trigger: 'blur' }],
}

const fallbackRequirementTypes = [
  { label: '功能需求', value: 'FUNCTION' },
  { label: '优化需求', value: 'OPTIMIZATION' },
]

const fallbackPriorities = [
  { label: '紧急', value: 'URGENT' },
  { label: '高', value: 'HIGH' },
  { label: '中', value: 'MEDIUM' },
  { label: '低', value: 'LOW' },
]

const fallbackStatuses = [
  { label: '待评审', value: 'PENDING_REVIEW' },
  { label: '已采纳', value: 'ACCEPTED' },
  { label: '已拒绝', value: 'REJECTED' },
]

const normalizeOptions = items => items.map(item => ({
  label: item.label,
  value: item.value,
}))

const typeOptions = computed(() => {
  const items = dictStore.getDictItems('requirementType')
  return items.length ? normalizeOptions(items) : fallbackRequirementTypes
})

const priorityOptions = computed(() => {
  const items = dictStore.getDictItems('requirementPriority')
  return items.length ? normalizeOptions(items) : fallbackPriorities
})

const statusOptions = computed(() => {
  const items = dictStore.getDictItems('requirementStatus')
  return items.length ? normalizeOptions(items) : fallbackStatuses
})

const typeFilterOptions = computed(() => typeOptions.value)
const priorityFilterOptions = computed(() => priorityOptions.value)
const statusFilterOptions = computed(() => statusOptions.value)
const projectOptions = computed(() => projectRows.value.map(project => ({ label: project.name, value: project.id })))
const reviewerOptions = computed(() => userRows.value.map(user => ({ label: user.realName || user.username, value: user.id })))
const projectFilterOptions = computed(() => projectOptions.value)
const projectMap = computed(() => Object.fromEntries(projectRows.value.map(project => [String(project.id), project.name])))

const optionLabel = (options, value) => options.find(item => item.value === value)?.label || value || '-'
const currentUserName = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}').realName || '当前用户'
  } catch {
    return '当前用户'
  }
}

const formatRequirementNo = item => {
  if (item.requirementNo != null) {
    const year = item.createdAt ? dayjs(item.createdAt).format('YYYY') : dayjs().format('YYYY')
    return `REQ-${year}-${String(item.requirementNo).padStart(4, '0')}`
  }
  const year = item.createdAt ? dayjs(item.createdAt).format('YYYY') : dayjs().format('YYYY')
  const suffix = String(item.id || '').slice(-4).padStart(4, '0')
  return `REQ-${year}-${suffix}`
}

const mapRequirement = item => ({
  id: item.id,
  requirementNo: formatRequirementNo(item),
  title: item.title,
  projectId: item.projectId,
  projectName: projectMap.value[String(item.projectId)] || '-',
  reviewerName: item.reviewerName || '-',
  requirementType: optionLabel(typeOptions.value, item.requirementType),
  requirementTypeCode: item.requirementType,
  priority: optionLabel(priorityOptions.value, item.priority),
  priorityCode: item.priority,
  status: optionLabel(statusOptions.value, item.status),
  statusCode: item.status,
  submitter: currentUserName(),
  createdAt: formatDateTime(item.createdAt),
})

const filteredRows = computed(() => {
  const keyword = query.keyword.trim()

  return requirementRows.value.filter(item => {
    if (keyword) {
      const text = [item.requirementNo, item.title, item.projectName, item.reviewerName].join(' ')
      if (!text.includes(keyword)) return false
    }
    if (query.projectId && String(item.projectId) !== String(query.projectId)) return false
    if (query.requirementType && item.requirementTypeCode !== query.requirementType) return false
    if (query.priority && item.priorityCode !== query.priority) return false
    if (query.status && item.statusCode !== query.status) return false
    return true
  })
})

const pagedRows = computed(() => {
  pagination.total = filteredRows.value.length
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredRows.value.slice(start, start + pagination.pageSize)
})

const groupedRows = computed(() => {
  const groups = new Map()

  filteredRows.value.forEach(item => {
    const key = item[groupField.value] || '未分组'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  })

  return Array.from(groups, ([value, rows]) => ({ value, label: value, rows }))
})

const columns = [
  { title: '需求编号', dataIndex: 'requirementNo', width: 150 },
  { title: '需求标题', dataIndex: 'title', minWidth: 260 },
  { title: '所属项目', dataIndex: 'projectName', width: 220 },
  { title: '需求类型', dataIndex: 'requirementType', width: 120 },
  { title: '优先级', dataIndex: 'priority', width: 100 },
  { title: '状态', dataIndex: 'status', width: 110 },
  { title: '提交人', dataIndex: 'submitter', width: 110 },
  { title: '审核人', dataIndex: 'reviewerName', width: 110 },
  { title: '创建时间', dataIndex: 'createdAt', width: 170 },
]

const priorityColor = value => ({ URGENT: 'red', HIGH: 'orange', MEDIUM: 'gold', LOW: 'default' }[value] || 'default')
const statusColor = value => ({ PENDING_REVIEW: 'blue', ACCEPTED: 'green', REJECTED: 'red' }[value] || 'default')

const loadProjects = async () => {
  const result = await getProjectList({ pageNo: 1, pageSize: 200, projectType: 'MANAGEMENT' })
  projectRows.value = result.records || []
}

const loadUsers = async () => {
  const result = await getSystemUsers({ pageNo: 1, pageSize: 200, enabled: true })
  userRows.value = result.records || []
}

const loadRequirements = async () => {
  loading.value = true
  try {
    const rows = await listMyRequirements()
    requirementRows.value = [...(rows || [])]
      .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
      .map(mapRequirement)
    pagination.total = filteredRows.value.length
  } catch (error) {
    requirementRows.value = []
    pagination.total = 0
    message.error(error.message || '需求加载失败')
  } finally {
    loading.value = false
  }
}

const initPage = async () => {
  await dictStore.loadDicts()
  await loadProjects()
  await loadUsers()
  await loadRequirements()
}

const handleSearch = () => {
  pagination.current = 1
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    projectId: undefined,
    requirementType: undefined,
    priority: undefined,
    status: undefined,
  })
  pagination.current = 1
}

const handleTableChange = page => {
  pagination.current = page.current
  pagination.pageSize = page.pageSize
}

const handleDetail = record => {
  router.push({ name: 'PersonalRequirementDetail', params: { id: record.id } })
}

const openCreateModal = () => {
  Object.assign(formState, createDefaultForm())
  formRef.value?.clearValidate()
  createVisible.value = true
}

const handleSubmit = async () => {
  if (submitLoading.value) return
  await formRef.value?.validate()
  submitLoading.value = true
  try {
    const created = await createRequirement({
      title: formState.title,
      projectId: formState.projectId,
      reviewerId: formState.reviewerId,
      requirementType: formState.requirementType,
      priority: formState.priority,
      description: formState.description,
      tags: formState.tags || undefined,
    })
    message.success('需求创建成功')
    createVisible.value = false
    await loadRequirements()
    if (created?.id) {
      router.push({ name: 'PersonalRequirementDetail', params: { id: created.id } })
    }
  } catch (error) {
    message.error(error.message || '需求创建失败')
  } finally {
    submitLoading.value = false
  }
}

onMounted(initPage)
</script>

<style scoped>
.requirement-page {
  min-width: 0;
  color: #262626;
}

.requirement-filter,
.requirement-list {
  border: 1px solid #edf0f3;
  box-shadow: 0 2px 8px rgb(0 0 0 / 3%);
}

.requirement-filter {
  margin-bottom: 16px;
}

.requirement-filter :deep(.ant-card-body) {
  padding: 20px 30px 4px;
}

.requirement-filter__form.app-filter-form {
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) repeat(4, minmax(150px, 1fr)) max-content !important;
  column-gap: 16px !important;
  align-items: end;
}

.requirement-filter__form :deep(.ant-form-item) {
  margin: 0 0 16px;
}

.requirement-filter__form :deep(.ant-form-item-row) {
  width: 100%;
  flex-wrap: nowrap;
}

.requirement-filter__form :deep(.ant-form-item-label) {
  flex: 0 0 72px;
}

.requirement-filter__form :deep(.ant-form-item-control),
.requirement-filter__form :deep(.ant-input),
.requirement-filter__form :deep(.ant-select) {
  width: 100%;
}

.requirement-filter__actions {
  grid-column: auto !important;
  justify-self: end;
}

.requirement-list :deep(.ant-card-body) {
  padding: 22px 30px 18px;
}

.requirement-list__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.requirement-list__display {
  display: flex;
  gap: 12px;
  align-items: center;
  color: #8c8c8c;
}

.requirement-list__display :deep(.ant-select) {
  width: 132px;
}

.table-link,
.requirement-no {
  font-family: 'Segoe UI', 'PingFang SC', sans-serif;
}

.requirement-group + .requirement-group {
  margin-top: 16px;
}

.requirement-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

@media (max-width: 1100px) {
  .requirement-filter__form {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .requirement-filter__actions {
    grid-column: 3;
  }
}

@media (max-width: 960px) {
  .requirement-filter__form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .requirement-filter__actions {
    grid-column: 2;
  }

  .requirement-list__toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
