<template>
  <div class="execution-project-page">
    <a-card class="execution-filter app-filter-card" :bordered="false">
      <a-form class="execution-filter__form app-filter-form" layout="inline">
        <a-form-item label="项目名称"><a-input v-model:value="query.keyword" allow-clear placeholder="请输入项目名称" /></a-form-item>
        <a-form-item label="项目经理"><a-select v-model:value="query.managerId" :options="managerFilterOptions" /></a-form-item>
        <a-form-item label="项目阶段"><a-select v-model:value="query.stage" :options="stageFilterOptions" /></a-form-item>
        <a-form-item label="项目状态"><a-select v-model:value="query.status" :options="statusFilterOptions" /></a-form-item>
        <a-form-item class="execution-filter__actions app-filter-actions"><a-space><a-button type="primary" @click="handleSearch">查询</a-button><a-button @click="handleReset">重置</a-button></a-space></a-form-item>
      </a-form>
    </a-card>

    <a-card class="execution-list" :bordered="false">
      <div class="execution-list__toolbar">
        <a-button type="primary" @click="handleCreate"><PlusOutlined />新建项目</a-button>
        <div class="execution-list__display">
          <template v-if="displayMode === 'group'"><span>分组条件：</span><a-select v-model:value="groupField" :options="groupOptions" /></template>
          <a-radio-group v-model:value="displayMode" button-style="solid"><a-radio-button value="list">列表</a-radio-button><a-radio-button value="group">分组</a-radio-button></a-radio-group>
        </div>
      </div>

      <a-table v-if="displayMode === 'list'" row-key="id" :columns="columns" :data-source="visibleProjects" :loading="loading" :pagination="pagination" :scroll="{ x: 980 }" @change="handleTableChange">
        <template #bodyCell="{ column, record, index, text }">
          <template v-if="column.dataIndex === 'index'">{{ (pagination.current - 1) * pagination.pageSize + index + 1 }}</template>
          <template v-else-if="column.dataIndex === 'name'"><a-button type="link" class="table-link" @click="handleDetail(record)">{{ text }}</a-button></template>
          <template v-else-if="column.dataIndex === 'status'"><a-tag color="processing">{{ text }}</a-tag></template>
          <template v-else-if="column.dataIndex === 'operation'"><a-space><a-button type="link" size="small" @click="handleEdit(record)"><EditOutlined />编辑</a-button><a-popconfirm title="确定删除该项目吗？" @confirm="handleDelete(record)"><a-button type="link" size="small" danger><DeleteOutlined />删除</a-button></a-popconfirm></a-space></template>
        </template>
      </a-table>

      <div v-else class="execution-groups">
        <section v-for="(group, groupIndex) in groupedProjects" :key="group.value" class="execution-group">
          <header class="execution-group__header"><button type="button" @click="handleToggleGroup(group.value)"><RightOutlined v-if="collapsedGroups.includes(group.value)" /><DownOutlined v-else />{{ group.label }}</button><a-tag>{{ group.rows.length }}</a-tag></header>
          <a-table v-if="!collapsedGroups.includes(group.value)" row-key="id" :columns="columns" :data-source="group.rows" :pagination="false" :scroll="{ x: 980 }" :show-header="groupIndex === 0">
            <template #bodyCell="{ column, record, index, text }">
              <template v-if="column.dataIndex === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.dataIndex === 'name'"><a-button type="link" class="table-link" @click="handleDetail(record)">{{ text }}</a-button></template>
              <template v-else-if="column.dataIndex === 'status'"><a-tag color="processing">{{ text }}</a-tag></template>
              <template v-else-if="column.dataIndex === 'operation'"><a-space><a-button type="link" size="small" @click="handleEdit(record)"><EditOutlined />编辑</a-button><a-popconfirm title="确定删除该项目吗？" @confirm="handleDelete(record)"><a-button type="link" size="small" danger><DeleteOutlined />删除</a-button></a-popconfirm></a-space></template>
            </template>
          </a-table>
        </section>
      </div>
    </a-card>

    <a-modal v-model:open="formVisible" class="execution-form-modal" :title="editingId ? '编辑项目' : '新建项目'" :footer="null" :width="700" destroy-on-close>
      <a-form ref="formRef" class="execution-form" :model="formState" :rules="formRules" :label-col="{ flex: '138px' }" :wrapper-col="{ flex: '368px' }">
        <a-form-item label="项目名称" name="name">
          <a-select v-model:value="formState.name" class="execution-project-name-select" show-search :filter-option="filterOption" :options="managementProjectNameOptions" placeholder="请搜索或选择" @change="handleProjectNameChange">
            <template #suffixIcon><SearchOutlined /></template>
          </a-select>
        </a-form-item>
        <a-form-item label="项目负责人" name="managerId"><a-select v-model:value="formState.managerId" :options="managerOptions" placeholder="根据项目名称带出" disabled /></a-form-item>
        <a-form-item label="项目类型" name="projectBusinessType"><a-select v-model:value="formState.projectBusinessType" :options="projectBusinessTypeOptions" placeholder="根据项目名称带出" disabled /></a-form-item>
      </a-form>
      <div class="form-actions"><a-button @click="formVisible = false">取消</a-button><a-button type="primary" :loading="submitLoading" @click="handleSubmit">确认</a-button></div>
    </a-modal>

  </div>
</template>

<script setup>
import { DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { createProject, deleteProject, getDicts, getProjectDetail, getProjectList, getProjectStats, getSystemUsers, updateProject } from '@/api/managementProject'
import { OPERATION_ACTIONS, OPERATION_MODULES, recordOperationLog } from '@/utils/operationLog'

const loading = ref(false)
const submitLoading = ref(false)
const formVisible = ref(false)
const editingId = ref(null)
const formRef = ref()
const router = useRouter()
const projects = ref([])
const managerOptions = ref([])
const managementProjectOptions = ref([])
const projectBusinessTypeOptions = ref([])
const statusOptions = ref([])
const statusLabels = reactive({})
const displayMode = ref('list')
const groupField = ref('stage')
const collapsedGroups = ref([])

const stageOptions = ref([])
const withAll = options => [{ label: '全部', value: '全部' }, ...options]
const managerFilterOptions = computed(() => withAll(managerOptions.value))
const stageFilterOptions = computed(() => withAll(stageOptions.value))
const statusFilterOptions = computed(() => withAll(statusOptions.value))
const groupOptions = [{ label: '项目阶段', value: 'stage' }, { label: '项目经理', value: 'manager' }, { label: '项目状态', value: 'status' }]
const query = reactive({ keyword: '', managerId: '全部', stage: '全部', status: '全部' })
const appliedQuery = reactive({ ...query })
const pagination = reactive({ current: 1, pageSize: 10, total: 0, pageSizeOptions: ['10', '20', '50'], showSizeChanger: true, showTotal: total => `共 ${total} 条` })

const columns = [
  { title: '序号', dataIndex: 'index', width: 70 },
  { title: '项目名称', dataIndex: 'name', width: 210 },
  { title: '项目经理', dataIndex: 'manager', width: 120 },
  { title: '项目阶段', dataIndex: 'stage', width: 130 },
  { title: '项目状态', dataIndex: 'status', width: 120 },
  { title: '任务数', dataIndex: 'taskCount', width: 100 },
  { title: 'BUG数', dataIndex: 'bugCount', width: 100 },
  { title: '操作', dataIndex: 'operation', width: 190, fixed: 'right' },
]

const createDefaultForm = () => ({ name: '', department: '', managerId: undefined, participantIds: [], managementProjectId: undefined, projectBusinessType: undefined, stage: 'REQUIREMENT_ANALYSIS', status: 'NOT_STARTED', description: '' })
const formState = reactive(createDefaultForm())
const formRules = {
  name: [{ required: true, message: '请选择项目名称', trigger: 'change' }],
  managerId: [{ required: true, message: '所选项目未设置项目负责人', trigger: 'change' }],
  projectBusinessType: [{ required: true, message: '所选项目未设置项目类型', trigger: 'change' }],
}

const visibleProjects = computed(() => projects.value)
const groupedProjects = computed(() => {
  const labelMap = { stage: '项目阶段', manager: '项目经理', status: '项目状态' }
  const groups = new Map()
  visibleProjects.value.forEach(project => {
    const value = project[groupField.value] || '未设置'
    if (!groups.has(value)) groups.set(value, [])
    groups.get(value).push(project)
  })
  return Array.from(groups, ([value, rows]) => ({ value, label: `${labelMap[groupField.value]}：${value}`, rows }))
})

const getManagerName = id => managerOptions.value.find(item => item.value === id)?.label || (id ? `用户 ${id}` : '-')
const filterOption = (input, option) => option.label.toLowerCase().includes(input.toLowerCase())
const managementProjectNameOptions = computed(() => managementProjectOptions.value.map(item => ({ label: item.label, value: item.label, projectId: item.value, managerId: item.managerId, projectBusinessType: item.projectBusinessType })))
const handleProjectNameChange = value => {
  const selectedProject = managementProjectNameOptions.value.find(item => item.value === value)
  if (selectedProject) {
    formState.managementProjectId = selectedProject.projectId
    formState.managerId = selectedProject.managerId
    formState.projectBusinessType = selectedProject.projectBusinessType
  }
}
const fetchReferenceData = async () => {
  try {
    const [dicts, users, managementProjects] = await Promise.all([
      getDicts(),
      getSystemUsers({ pageNo: 1, pageSize: 200, enabled: true }),
      getProjectList({ projectType: 'MANAGEMENT', pageNo: 1, pageSize: 200 }),
    ])
    stageOptions.value = dicts.find(item => item.type === 'projectStage')?.items || []
    projectBusinessTypeOptions.value = dicts.find(item => item.type === 'projectBusinessType')?.items || []
    const projectStatus = dicts.find(item => item.type === 'projectStatus')?.items || []
    statusOptions.value = projectStatus
    Object.assign(statusLabels, Object.fromEntries(projectStatus.map(item => [item.value, item.label])))
    managerOptions.value = users.records.map(user => ({ label: user.realName, value: user.id }))
    managementProjectOptions.value = managementProjects.records
      .filter(project => project.projectBusinessType !== 'RESEARCH')
      .map(project => ({ label: project.name, value: project.id, managerId: project.managerId, projectBusinessType: project.projectBusinessType }))
  } catch (error) {
    message.error(error.message)
  }
}

const fetchProjects = async () => {
  loading.value = true
  try {
    const result = await getProjectList({
      projectType: 'EXECUTION',
      keyword: appliedQuery.keyword || undefined,
      managerId: managerOptions.value.some(item => item.value === appliedQuery.managerId) ? appliedQuery.managerId : undefined,
      stage: stageOptions.value.some(item => item.value === appliedQuery.stage) ? appliedQuery.stage : undefined,
      status: statusOptions.value.some(item => item.value === appliedQuery.status) ? appliedQuery.status : undefined,
      pageNo: pagination.current,
      pageSize: pagination.pageSize,
    })
    const ids = result.records.map(p => p.id)
    const statsMap = ids.length
      ? Object.fromEntries((await getProjectStats(ids)).map(s => [s.projectId, s]))
      : {}
    const rows = result.records.map(project => ({
      ...project,
      department: project.department || project.businessDepartment || '-',
      manager: getManagerName(project.managerId),
      stage: stageOptions.value.find(item => item.value === project.stage)?.label || project.stage || '-',
      stageCode: project.stage,
      status: statusLabels[project.status] || project.status || '-',
      statusCode: project.status,
      taskCount: statsMap[project.id]?.taskCount ?? 0,
      bugCount: statsMap[project.id]?.bugCount ?? 0,
    }))
    projects.value = rows
    pagination.total = result.total
  } catch (error) {
    projects.value = []
    pagination.total = 0
    message.error(error.message)
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  Object.assign(appliedQuery, query)
  pagination.current = 1
  await fetchProjects()
  void recordOperationLog({
    module: OPERATION_MODULES.EXECUTION_PROJECT,
    action: OPERATION_ACTIONS.QUERY,
    bizType: 'PROJECT',
    bizName: '执行类项目列表',
    detail: { keyword: query.keyword, managerId: query.managerId, stage: query.stage, status: query.status },
    routeName: 'ExecutionProjects',
  })
}
const handleReset = async () => { Object.assign(query, { keyword: '', managerId: '全部', stage: '全部', status: '全部' }); Object.assign(appliedQuery, query); pagination.current = 1; await fetchProjects() }
const handleTableChange = async page => { pagination.current = page.current; pagination.pageSize = page.pageSize; await fetchProjects() }
const handleToggleGroup = value => { collapsedGroups.value = collapsedGroups.value.includes(value) ? collapsedGroups.value.filter(item => item !== value) : [...collapsedGroups.value, value] }
const handleCreate = () => { editingId.value = null; Object.assign(formState, createDefaultForm()); formVisible.value = true }
const handleEdit = async record => {
  editingId.value = record.id
  formVisible.value = true
  try {
    const detail = await getProjectDetail(record.id)
    Object.assign(formState, createDefaultForm(), {
      name: detail.name,
      department: detail.businessDepartment || detail.department || '',
      managerId: detail.managerId,
      participantIds: detail.participantIds || [],
      managementProjectId: detail.managementProjectId || undefined,
      projectBusinessType: detail.projectBusinessType || undefined,
      stage: detail.stage,
      status: detail.status,
      description: detail.description,
    })
  } catch (error) {
    message.error(error.message)
    formVisible.value = false
  }
}
const handleDetail = record => {
  void recordOperationLog({
    module: OPERATION_MODULES.EXECUTION_PROJECT,
    action: OPERATION_ACTIONS.DETAIL,
    bizType: 'PROJECT',
    bizId: record.id,
    bizName: record.name,
    detail: `查看执行类项目详情：${record.name}`,
    routeName: 'ExecutionProjectDetail',
  })
  router.push({ name: 'ExecutionProjectDetail', params: { id: record.id } })
}
const handleDelete = async record => {
  try {
    await deleteProject(record.id)
    message.success('项目删除成功')
    void recordOperationLog({
      module: OPERATION_MODULES.EXECUTION_PROJECT,
      action: OPERATION_ACTIONS.DELETE,
      bizType: 'PROJECT',
      bizId: record.id,
      bizName: record.name,
      detail: `删除执行类项目：${record.name}`,
      routeName: 'ExecutionProjects',
    })
    await fetchProjects()
  } catch (error) { message.error(error.message) }
}
const handleSubmit = async () => {
  if (submitLoading.value) return
  await formRef.value?.validate()
  submitLoading.value = true
  try {
    const data = {
      projectType: 'EXECUTION',
      projectBusinessType: formState.projectBusinessType,
      name: formState.name,
      businessDepartment: formState.department,
      managerId: formState.managerId,
      participantIds: formState.participantIds,
      managementProjectId: formState.managementProjectId || null,
      stage: formState.stage,
      status: formState.status,
      description: formState.description,
    }
    const savedProject = editingId.value
      ? await updateProject(editingId.value, data)
      : await createProject(data)
    message.success(editingId.value ? '项目编辑成功' : '项目新建成功')
    void recordOperationLog({
      module: OPERATION_MODULES.EXECUTION_PROJECT,
      action: editingId.value ? OPERATION_ACTIONS.UPDATE : OPERATION_ACTIONS.CREATE,
      bizType: 'PROJECT',
      bizId: savedProject?.id || editingId.value,
      bizName: data.name,
      detail: editingId.value ? `编辑执行类项目：${data.name}` : `新建执行类项目：${data.name}`,
      routeName: editingId.value ? 'ExecutionProjects' : 'ExecutionProjectDetail',
    })
    formVisible.value = false
    await fetchProjects()
    if (!editingId.value && savedProject?.id) {
      router.push({ name: 'ExecutionProjectDetail', params: { id: savedProject.id } })
    }
  } catch (error) {
    message.error(error.message)
  } finally {
    submitLoading.value = false
  }
}

watch(groupField, () => { collapsedGroups.value = [] })
onMounted(async () => { await fetchReferenceData(); await fetchProjects() })
</script>

<style scoped>
.execution-project-page { height: 100%;  width: min(1600px, 100%);  margin: 0 auto; overflow-y: auto; color: #262626; }
.execution-filter, .execution-list { border: 1px solid #edf0f3; box-shadow: 0 2px 8px rgb(0 0 0 / 3%); }
.execution-filter { margin-bottom: 16px; }
.execution-filter :deep(.ant-card-body) { padding: 20px 30px 4px; }
.execution-filter__form.app-filter-form { display: grid; grid-template-columns: minmax(180px, 1.3fr) repeat(3, minmax(140px, 1fr)) max-content !important; column-gap: 24px !important; align-items: end; }
.execution-filter__form :deep(.ant-form-item) { margin: 0 0 16px; }
.execution-filter__form :deep(.ant-form-item-row) { width: 100%; flex-wrap: nowrap; }
.execution-filter__form :deep(.ant-form-item-label) { flex: 0 0 76px; }
.execution-filter__form :deep(.ant-form-item-control), .execution-filter__form :deep(.ant-select), .execution-filter__form :deep(.ant-input) { width: 100%; }
.execution-filter__actions { grid-column: auto !important; justify-self: end; }
.execution-list :deep(.ant-card-body) { padding: 22px 30px 18px; }
.execution-list__toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.execution-list__display { display: flex; align-items: center; gap: 12px; color: #8c8c8c; }
.execution-list__display :deep(.ant-select) { width: 132px; }
.execution-list :deep(.ant-table-cell) { white-space: nowrap; }
.table-link { height: auto; padding: 0; }
.execution-groups { max-height: 560px; overflow-y: auto; }
.execution-group + .execution-group { margin-top: 8px; }
.execution-group__header { display: flex; align-items: center; justify-content: space-between; height: 40px; padding: 0 14px; background: #fafafa; border-block: 1px solid #edf0f3; }
.execution-group__header button { display: inline-flex; align-items: center; gap: 8px; padding: 0; font-weight: 600; background: transparent; border: 0; cursor: pointer; }
.execution-form { padding: 4px 28px 0 0; }
.execution-form :deep(.ant-form-item) { margin-bottom: 34px; }
.execution-form :deep(.ant-form-item-label) { text-align: right; }
.execution-form :deep(.ant-form-item-label > label) { height: 34px; font-size: 16px; }
.execution-form :deep(.ant-form-item-control-input) { min-height: 34px; }
.execution-form :deep(.ant-input),
.execution-form :deep(.ant-select-selector) { min-height: 34px; border-radius: 6px; }
.execution-form :deep(.ant-select-selection-placeholder) { color: #c8c8c8; font-size: 16px; }
.execution-project-name-select :deep(.ant-select-arrow) { right: auto; left: 12px; color: #a8a8a8; font-size: 18px; }
.execution-project-name-select :deep(.ant-select-selection-search) { inset-inline-start: 44px; inset-inline-end: 11px; }
.execution-project-name-select :deep(.ant-select-selection-placeholder),
.execution-project-name-select :deep(.ant-select-selection-item) { padding-left: 36px; }
.execution-form :deep(textarea.ant-input) { height: 100px; resize: none; }
.form-actions { display: flex; justify-content: flex-end; gap: 24px; padding: 2px 54px 0 0; }
.form-actions .ant-btn { min-width: 94px; height: 44px; font-size: 16px; border-radius: 7px; }
@media (max-width: 960px) { .execution-filter__form.app-filter-form { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }.execution-filter__actions { grid-column: 2 !important; } }
</style>
