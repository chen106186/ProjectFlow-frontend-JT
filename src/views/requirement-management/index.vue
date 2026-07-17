<template>
  <section class="req-mgmt-page">
    <a-card class="req-filter-card app-filter-card" :bordered="false">
      <a-form class="req-filter app-filter-form" layout="inline">
        <a-form-item label="关键字">
          <a-input v-model:value="query.keyword" allow-clear placeholder="标题/描述关键字" />
        </a-form-item>
        <a-form-item label="所属项目">
          <a-select v-model:value="query.projectId" allow-clear placeholder="全部" :options="projectOptions" option-filter-prop="label" show-search />
        </a-form-item>
        <a-form-item label="需求类型">
          <a-select v-model:value="query.requirementType" allow-clear placeholder="全部" :options="typeOptions" />
        </a-form-item>
        <a-form-item label="优先级">
          <a-select v-model:value="query.priority" allow-clear placeholder="全部" :options="priorityOptions" />
        </a-form-item>
        <a-form-item label="需求状态">
          <a-select v-model:value="query.status" allow-clear placeholder="全部" :options="statusOptions" />
        </a-form-item>
        <a-form-item class="filter-actions app-filter-actions">
          <a-space>
            <a-button type="primary" @click="handleSearch">查询</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card class="req-list-card" :bordered="false">
      <div class="req-list-toolbar">
        <a-button type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          新增需求
        </a-button>
        <div class="req-list-display">
          <template v-if="displayMode === 'group'">
            <span>分组条件：</span>
            <a-select v-model:value="groupField" :options="groupOptions" />
          </template>
          <a-radio-group v-model:value="displayMode" button-style="solid">
            <a-radio-button value="list">列表</a-radio-button>
            <a-radio-button value="group">分组</a-radio-button>
          </a-radio-group>
        </div>
      </div>

      <div class="req-table-wrap">
        <a-table
          v-if="displayMode === 'list'"
          row-key="id"
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          :pagination="false"
          :scroll="{ x: 1440 }"
          size="middle"
        >
          <template #bodyCell="{ column, record, text, index }">
            <template v-if="column.dataIndex === 'rowIndex'">
              {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
            </template>
            <template v-else-if="column.dataIndex === 'requirementNo'">
              <span class="req-no">{{ formatNo(record) }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'title'">
              <a-button type="link" class="req-title-link" @click="handleDetail(record)">{{ text }}</a-button>
            </template>
            <template v-else-if="column.dataIndex === 'projectId'">
              {{ projectMap[text] || '-' }}
            </template>
            <template v-else-if="column.dataIndex === 'requirementType'">
              <a-tag color="blue">{{ dictLabel('requirementType', text) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'priority'">
              <a-tag :color="priorityColor(text)">{{ dictLabel('requirementPriority', text) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'status'">
              <a-tag :color="statusColor(text)">{{ dictLabel('requirementStatus', text) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'createdAt'">
              {{ formatDateTime(text) }}
            </template>
            <template v-else-if="column.dataIndex === 'ops'">
              <a-space :size="4">
                <a-button type="link" size="small" @click="openEditModal(record)">编辑</a-button>
                <template v-if="record.status === 'PENDING_REVIEW'">
                  <a-divider type="vertical" style="margin: 0;" />
                  <a-button
                    type="link"
                    size="small"
                    :loading="opRecord === record.id + '_ACCEPTED'"
                    @click="handleStatusChange(record, 'ACCEPTED')"
                  >采纳</a-button>
                  <a-button
                    type="link"
                    size="small"
                    danger
                    :loading="opRecord === record.id + '_REJECTED'"
                    @click="handleStatusChange(record, 'REJECTED')"
                  >未采纳</a-button>
                  <a-button
                    type="link"
                    size="small"
                    :loading="opRecord === record.id + '_SHELVED'"
                    @click="handleStatusChange(record, 'SHELVED')"
                  >搁置</a-button>
                </template>
              </a-space>
            </template>
            <template v-else>{{ text || '-' }}</template>
          </template>
        </a-table>

        <div v-else class="req-group-list">
          <section v-for="(group, groupIndex) in groupedRows" :key="group.value" class="req-group">
            <header class="req-group__header">
              <button type="button" @click="handleToggleGroup(group.value)">
                <RightOutlined v-if="isGroupCollapsed(group.value)" />
                <DownOutlined v-else />
                {{ group.label }}
              </button>
              <a-tag>{{ group.rows.length }}</a-tag>
            </header>
            <a-table
              v-if="!isGroupCollapsed(group.value)"
              row-key="id"
              :columns="columns"
              :data-source="group.rows"
              :pagination="false"
              :scroll="{ x: 1440 }"
              :show-header="groupIndex === 0"
              size="middle"
            >
              <template #bodyCell="{ column, record, text, index }">
                <template v-if="column.dataIndex === 'rowIndex'">{{ index + 1 }}</template>
                <template v-else-if="column.dataIndex === 'requirementNo'">
                  <span class="req-no">{{ formatNo(record) }}</span>
                </template>
                <template v-else-if="column.dataIndex === 'title'">
                  <a-button type="link" class="req-title-link" @click="handleDetail(record)">{{ text }}</a-button>
                </template>
                <template v-else-if="column.dataIndex === 'projectId'">
                  {{ projectMap[text] || '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'requirementType'">
                  <a-tag color="blue">{{ dictLabel('requirementType', text) }}</a-tag>
                </template>
                <template v-else-if="column.dataIndex === 'priority'">
                  <a-tag :color="priorityColor(text)">{{ dictLabel('requirementPriority', text) }}</a-tag>
                </template>
                <template v-else-if="column.dataIndex === 'status'">
                  <a-tag :color="statusColor(text)">{{ dictLabel('requirementStatus', text) }}</a-tag>
                </template>
                <template v-else-if="column.dataIndex === 'ops'">
                  <a-space :size="4">
                    <a-button type="link" size="small" @click="openEditModal(record)">编辑</a-button>
                    <template v-if="record.status === 'PENDING_REVIEW'">
                      <a-divider type="vertical" style="margin: 0;" />
                      <a-button type="link" size="small" :loading="opRecord === record.id + '_ACCEPTED'" @click="handleStatusChange(record, 'ACCEPTED')">采纳</a-button>
                      <a-button type="link" size="small" danger :loading="opRecord === record.id + '_REJECTED'" @click="handleStatusChange(record, 'REJECTED')">未采纳</a-button>
                      <a-button type="link" size="small" :loading="opRecord === record.id + '_SHELVED'" @click="handleStatusChange(record, 'SHELVED')">搁置</a-button>
                    </template>
                  </a-space>
                </template>
                <template v-else>{{ text || '-' }}</template>
              </template>
            </a-table>
          </section>
        </div>
      </div>
      <div class="req-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :show-size-changer="pagination.showSizeChanger"
          :page-size-options="pagination.pageSizeOptions"
          :show-total="pagination.showTotal"
          @change="handlePageChange"
        />
      </div>
    </a-card>

    <!-- 新增 / 编辑弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="editId ? '编辑需求' : '添加需求'"
        width="40rem"
      :confirm-loading="modalLoading"
      ok-text="确认"
      cancel-text="取消"
      destroy-on-close
      @ok="handleModalSubmit"
      @cancel="handleModalCancel"
    >
      <a-form
        ref="modalFormRef"
        :model="modalForm"
        :rules="modalRules"
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 18 }"
        style="margin-top: 1.25rem;"
      >
        <a-form-item label="需求标题" name="title">
          <a-input v-model:value="modalForm.title" placeholder="请输入需求标题" />
        </a-form-item>
        <a-form-item label="所属项目" name="projectId">
          <a-select
            v-model:value="modalForm.projectId"
            show-search
            :options="projectOptions"
            option-filter-prop="label"
            placeholder="请选择所属项目"
          />
        </a-form-item>
        <a-form-item label="需求类型" name="requirementType">
          <a-select v-model:value="modalForm.requirementType" :options="typeOptions" placeholder="请选择需求类型" />
        </a-form-item>
        <a-form-item v-if="editId" label="需求状态" name="status">
          <a-select v-model:value="modalForm.status" :options="statusOptions" placeholder="请选择状态" />
        </a-form-item>
        <a-form-item v-else label="需求状态">
          <a-tag color="blue">待评审</a-tag>
          <span class="status-tip">新需求默认进入待评审流程</span>
        </a-form-item>
        <a-form-item label="优先级" name="priority">
          <a-select v-model:value="modalForm.priority" :options="priorityOptions" placeholder="请选择优先级" />
        </a-form-item>
        <a-form-item label="需求描述">
          <a-textarea v-model:value="modalForm.description" :rows="5" placeholder="请描述需求详情" />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup>
import { DownOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { getProjectList } from '@/api/managementProject'
import { createRequirement, listRequirements, updateRequirement, updateRequirementStatus } from '@/api/requirements'
import { useDictStore } from '@/store/dictStore'
import { formatDateTime } from '@/utils/dateTime'

const router = useRouter()
const dictStore = useDictStore()

const loading = ref(false)
const rows = ref([])
const projectMap = ref({})
const opRecord = ref('')
const modalVisible = ref(false)
const modalLoading = ref(false)
const editId = ref(null)
const modalFormRef = ref()
const displayMode = ref('list')
const groupField = ref('projectId')
const collapsedGroups = ref([])

const query = reactive({
  keyword: '',
  projectId: undefined,
  requirementType: undefined,
  priority: undefined,
  status: undefined,
})

const modalForm = reactive({
  title: '',
  projectId: undefined,
  requirementType: undefined,
  status: undefined,
  priority: undefined,
  description: '',
})

const modalRules = {
  title: [{ required: true, message: '请输入需求标题', trigger: 'blur' }],
  projectId: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  requirementType: [{ required: true, message: '请选择需求类型', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
}

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '50', '100'],
  showTotal: total => `共 ${total} 条`,
})

const typeOptions = computed(() => dictStore.getDictItems('requirementType'))
const priorityOptions = computed(() => dictStore.getDictItems('requirementPriority'))
const statusOptions = computed(() => dictStore.getDictItems('requirementStatus'))
const projectOptions = computed(() =>
  Object.entries(projectMap.value).map(([value, label]) => ({ value, label }))
)
const groupOptions = [
  { label: '所属项目', value: 'projectId' },
  { label: '需求类型', value: 'requirementType' },
  { label: '优先级', value: 'priority' },
  { label: '需求状态', value: 'status' },
  { label: '负责人', value: 'creatorName' },
]
const dictLabel = (type, value) => dictStore.getDictLabel(type, value) || value || '-'
const priorityColor = v => ({ URGENT: 'red', HIGH: 'orange', MEDIUM: 'gold', LOW: 'default' }[v] || 'default')
const statusColor = v => ({ PENDING_REVIEW: 'blue', ACCEPTED: 'green', REJECTED: 'red', SHELVED: 'orange' }[v] || 'default')
const statusSuccessText = status => ({ ACCEPTED: '已采纳', REJECTED: '未采纳', SHELVED: '已搁置' }[status] || '状态已更新')

const groupValueLabel = (field, value) => {
  if (!value || value === '未设置') return '未设置'
  if (field === 'projectId') return projectMap.value[value] || '未设置'
  if (field === 'requirementType') return dictLabel('requirementType', value)
  if (field === 'priority') return dictLabel('requirementPriority', value)
  if (field === 'status') return dictLabel('requirementStatus', value)
  return value
}

const groupedRows = computed(() => {
  const labelMap = { projectId: '所属项目', requirementType: '需求类型', priority: '优先级', status: '需求状态', creatorName: '负责人' }
  const groups = new Map()
  rows.value.forEach(item => {
    const value = item[groupField.value] || '未设置'
    if (!groups.has(value)) groups.set(value, [])
    groups.get(value).push(item)
  })
  return Array.from(groups, ([value, groupRows]) => ({
    value,
    label: `${labelMap[groupField.value]}：${groupValueLabel(groupField.value, value)}`,
    rows: groupRows,
  }))
})

const isGroupCollapsed = value => collapsedGroups.value.includes(value)
const handleToggleGroup = value => {
  collapsedGroups.value = isGroupCollapsed(value)
    ? collapsedGroups.value.filter(item => item !== value)
    : [...collapsedGroups.value, value]
}

watch(groupField, () => { collapsedGroups.value = [] })

const formatNo = record => {
  if (record.requirementNo != null) {
    const year = record.createdAt ? dayjs(record.createdAt).format('YYYY') : dayjs().format('YYYY')
    return `REQ-${year}-${String(record.requirementNo).padStart(4, '0')}`
  }
  return '-'
}

const columns = [
  { title: '序号', dataIndex: 'rowIndex', width: 60 },
  { title: '需求编号', dataIndex: 'requirementNo', width: 150 },
  { title: '需求标题', dataIndex: 'title', minWidth: 220 },
  { title: '所属项目', dataIndex: 'projectId', width: 180 },
  { title: '需求类型', dataIndex: 'requirementType', width: 110 },
  { title: '优先级', dataIndex: 'priority', width: 90 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '负责人', dataIndex: 'creatorName', width: 100 },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    width: 170,
    customRender: ({ text }) => formatDateTime(text),
  },
  { title: '操作', dataIndex: 'ops', width: 170, fixed: 'right' },
]

const fetchData = async () => {
  loading.value = true
  try {
    const result = await listRequirements({
      keyword: query.keyword || undefined,
      projectId: query.projectId || undefined,
      requirementType: query.requirementType || undefined,
      priority: query.priority || undefined,
      status: query.status || undefined,
      pageNo: pagination.current,
      pageSize: pagination.pageSize,
    })
    rows.value = result?.records || []
    pagination.total = result?.total || 0
  } catch (error) {
    rows.value = []
    pagination.total = 0
    message.error(error.message || '需求列表加载失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { pagination.current = 1; fetchData() }

const handleReset = () => {
  Object.assign(query, { keyword: '', projectId: undefined, requirementType: undefined, priority: undefined, status: undefined })
  pagination.current = 1
  fetchData()
}

const handlePageChange = (current, pageSize) => {
  pagination.current = current
  pagination.pageSize = pageSize
  fetchData()
}

const handleDetail = record =>
  router.push({ name: 'PersonalRequirementDetail', params: { id: record.id }, query: { from: 'management' } })

const openCreateModal = () => {
  editId.value = null
  Object.assign(modalForm, { title: '', projectId: undefined, requirementType: undefined, status: undefined, priority: undefined, description: '' })
  modalVisible.value = true
}

const openEditModal = record => {
  editId.value = record.id
  Object.assign(modalForm, {
    title: record.title || '',
    projectId: record.projectId,
    requirementType: record.requirementType,
    status: record.status,
    priority: record.priority,
    description: record.description || '',
  })
  modalVisible.value = true
}

const handleModalCancel = () => { modalVisible.value = false }

const handleModalSubmit = async () => {
  if (modalLoading.value) return
  await modalFormRef.value?.validate()
  modalLoading.value = true
  try {
    if (editId.value) {
      const updated = await updateRequirement(editId.value, {
        title: modalForm.title,
        projectId: modalForm.projectId,
        requirementType: modalForm.requirementType,
        status: modalForm.status || undefined,
        priority: modalForm.priority,
        description: modalForm.description || undefined,
      })
      const idx = rows.value.findIndex(r => r.id === editId.value)
      if (idx !== -1) rows.value[idx] = updated
      message.success('需求已更新')
    } else {
      await createRequirement({
        title: modalForm.title,
        projectId: modalForm.projectId,
        requirementType: modalForm.requirementType,
        priority: modalForm.priority,
        description: modalForm.description || undefined,
      })
      message.success('需求已提交')
      pagination.current = 1
      await fetchData()
    }
    modalVisible.value = false
  } catch (error) {
    message.error(error.message || '操作失败')
  } finally {
    modalLoading.value = false
  }
}

const handleStatusChange = async (record, status) => {
  const key = `${record.id}_${status}`
  opRecord.value = key
  try {
    const updated = await updateRequirementStatus(record.id, status)
    const idx = rows.value.findIndex(r => r.id === record.id)
    if (idx !== -1) rows.value[idx] = updated
    message.success(statusSuccessText(status))
  } catch (error) {
    message.error(error.message || '操作失败')
  } finally {
    opRecord.value = ''
  }
}

const initPage = async () => {
  await dictStore.loadDicts()
  const projectResult = await getProjectList({ pageNo: 1, pageSize: 200, projectType: 'MANAGEMENT' })
  projectMap.value = Object.fromEntries((projectResult.records || []).map(item => [item.id, item.name]))
  await fetchData()
}

onMounted(initPage)
</script>

<style scoped>
.req-mgmt-page {
  width: min(1600px, 100%);
  height: calc(100vh - 68px - 52px - 40px);
  min-height: 0;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.req-filter-card,
.req-list-card {
  border: 1px solid #edf0f3;
  box-shadow: 0 2px 8px rgb(0 0 0 / 3%);
}

.req-filter-card {
  flex: none;
}

.req-list-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.req-list-card :deep(.ant-card-head) {
  flex: none;
}

.req-list-card :deep(.ant-card-body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.req-list-toolbar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.req-list-display {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #666;
}

.req-list-display :deep(.ant-select) { width: 130px; }

.req-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.req-group-list { min-height: 100%; }
.req-group + .req-group { margin-top: 8px; }
.req-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 14px;
  font-weight: 600;
  background: #fafafa;
  border-top: 1px solid #edf0f3;
  border-bottom: 1px solid #edf0f3;
}
.req-group__header button {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 0;
  font-weight: 600;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.req-pagination {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 40px;
  padding-top: 12px;
  background: #fff;
}

.req-filter {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 20px;
}

.req-filter :deep(.ant-form-item) { margin-bottom: 0; }
.req-filter :deep(.ant-form-item-control),
.req-filter :deep(.ant-input),
.req-filter :deep(.ant-select) { width: 100%; }

.filter-actions { justify-self: end; }

.req-no { color: #8c8c8c; font-size: 13px; }
.req-title-link { padding: 0; }
.status-tip { margin-left: 8px; color: #8c8c8c; font-size: 12px; }

@media (max-width: 1440px) {
  .req-filter { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
