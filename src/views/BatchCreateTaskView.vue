<template>
  <div class="batch-task-page">
    <header class="batch-task-header">
      <div>
        <h2>批量创建任务（支持父子任务）</h2>
        <span>可通过表格一次创建多个任务及其子任务</span>
      </div>
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" :loading="submitting" @click="handleSubmit">确认创建</a-button>
      </a-space>
    </header>

    <a-card :bordered="false" class="batch-card defaults-card">
      <a-form class="defaults-form" layout="inline">
        <a-form-item label="所属项目" required>
          <a-select
            v-model:value="defaults.projectId"
            :options="projectOptions"
            placeholder="请选择项目"
            show-search
            option-filter-prop="label"
          />
        </a-form-item>
        <a-form-item label="默认负责人">
          <a-select
            v-model:value="defaults.assigneeId"
            :options="userOptions"
            placeholder="请选择负责人"
            allow-clear
            show-search
            option-filter-prop="label"
          />
        </a-form-item>
        <a-form-item label="默认角色">
          <a-select v-model:value="defaults.roleName" :options="roleOptions" placeholder="请选择角色" allow-clear />
        </a-form-item>
        <a-form-item label="默认优先级">
          <a-select v-model:value="defaults.priority" :options="priorityOptions" />
        </a-form-item>
        <a-form-item label="默认计划时间">
          <a-range-picker v-model:value="defaults.planDates" value-format="YYYY-MM-DD" />
        </a-form-item>
        <a-button type="primary" @click="applyDefaults">应用到全部任务</a-button>
      </a-form>
    </a-card>

    <a-card :bordered="false" class="batch-card">
      <div class="batch-toolbar">
        <a-space wrap>
          <a-button type="primary" @click="addParent">
            <template #icon><PlusOutlined /></template>
            添加父任务
          </a-button>
          <a-button :disabled="!canAddSelectedChild" @click="addChild(selectedKeys[0])">
            <template #icon><PlusOutlined /></template>
            添加子任务
          </a-button>
          <a-button :disabled="selectedKeys.length !== 1" @click="duplicateRow(selectedKeys[0])">复制</a-button>
          <a-button danger :disabled="!selectedKeys.length" @click="removeRows(selectedKeys)">删除</a-button>
        </a-space>
        <span>共 {{ rows.length }} 条任务（父任务 {{ parentRows.length }} 条，子任务 {{ childCount }} 条）</span>
      </div>

      <div class="table-wrap">
        <table class="task-table">
          <thead>
            <tr>
              <th><a-checkbox :checked="allSelected" :indeterminate="partSelected" @change="toggleAll" /></th>
              <th>序号</th>
              <th>任务名称</th>
              <th>角色</th>
              <th>优先级</th>
              <th>计划开始时间</th>
              <th>计划结束时间</th>
              <th>执行人</th>
              <th>任务描述</th>
              <th>标签</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in displayRows" :key="row.key">
              <td><a-checkbox :checked="selectedKeys.includes(row.key)" @change="toggleRow(row.key)" /></td>
              <td>{{ row.sequence }}</td>
              <td>
                <div class="name-cell" :class="{ 'name-cell--child': row.level > 0 }">
                  <span v-if="row.level" class="child-mark">└</span>
                  <a-input v-model:value="row.name" :placeholder="row.level ? '请输入子任务名称' : '请输入任务名称'" />
                </div>
              </td>
              <td><a-select v-model:value="row.roleName" :options="roleOptions" placeholder="请选择角色" allow-clear /></td>
              <td><a-select v-model:value="row.priority" :options="priorityOptions" placeholder="请选择优先级" /></td>
              <td><a-date-picker v-model:value="row.plannedStartDate" value-format="YYYY-MM-DD" placeholder="选择日期" /></td>
              <td><a-date-picker v-model:value="row.plannedEndDate" value-format="YYYY-MM-DD" placeholder="选择日期" /></td>
              <td>
                <a-select
                  v-model:value="row.assigneeId"
                  :options="userOptions"
                  placeholder="请选择执行人"
                  allow-clear
                  show-search
                  option-filter-prop="label"
                />
              </td>
              <td><a-input v-model:value="row.description" placeholder="请输入任务描述" /></td>
              <td><a-input v-model:value="row.tags" placeholder="请输入标签" /></td>
              <td>
                <a-space :size="4">
                  <a-button type="link" size="small" @click="duplicateRow(row.key)">复制</a-button>
                  <a-button v-if="!row.parentKey" type="link" size="small" @click="addChild(row.key)">添加子任务</a-button>
                  <a-button type="link" danger size="small" @click="removeRows([row.key])">删除</a-button>
                </a-space>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createTask, getDicts, getProjectList, getSystemUsers } from '@/api/managementProject'

const router = useRouter()
const users = ref([])
const projects = ref([])
const priorityOptions = ref([])
const selectedKeys = ref([])
const submitting = ref(false)
const defaults = reactive({
  projectId: undefined,
  assigneeId: undefined,
  roleName: undefined,
  priority: 'MEDIUM',
  planDates: [],
})

const roleOptions = [
  { label: '开发', value: '开发' },
  { label: '测试', value: '测试' },
  { label: '产品', value: '产品' },
  { label: '设计', value: '设计' },
]

let seed = 1

const newRow = parentKey => ({
  key: `row-${seed++}`,
  parentKey: parentKey || null,
  name: '',
  roleName: defaults.roleName,
  priority: defaults.priority,
  assigneeId: defaults.assigneeId,
  plannedStartDate: defaults.planDates?.[0],
  plannedEndDate: defaults.planDates?.[1],
  description: '',
  tags: '',
})

const rows = ref([newRow(), newRow()])

const readRecords = result => {
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.records)) return result.records
  if (Array.isArray(result?.data?.records)) return result.data.records
  return []
}

const userOptions = computed(() =>
  users.value.map(item => ({
    label: item.realName || item.name || item.username || `用户 ${item.id}`,
    value: item.id,
  })),
)

const projectOptions = computed(() =>
  projects.value.map(item => ({
    label: item.name,
    value: item.id,
  })),
)

const parentRows = computed(() => rows.value.filter(row => !row.parentKey))
const childCount = computed(() => rows.value.length - parentRows.value.length)
const selectedRow = computed(() => rows.value.find(row => row.key === selectedKeys.value[0]))
const canAddSelectedChild = computed(() => selectedKeys.value.length === 1 && selectedRow.value && !selectedRow.value.parentKey)

const displayRows = computed(() => {
  const result = []
  parentRows.value.forEach((parent, index) => {
    parent.level = 0
    parent.sequence = String(index + 1)
    result.push(parent)
    rows.value
      .filter(row => row.parentKey === parent.key)
      .forEach((child, childIndex) => {
        child.level = 1
        child.sequence = `${index + 1}.${childIndex + 1}`
        result.push(child)
      })
  })
  return result
})

const allSelected = computed(() => rows.value.length > 0 && selectedKeys.value.length === rows.value.length)
const partSelected = computed(() => selectedKeys.value.length > 0 && !allSelected.value)

const addParent = () => {
  rows.value.push(newRow())
}

const addChild = key => {
  const parent = rows.value.find(row => row.key === key)
  if (!parent || parent.parentKey) {
    message.warning('请先选择一个父任务')
    return
  }
  const child = newRow(parent.key)
  const insertIndex = Math.max(...rows.value.map((row, index) => (row.key === parent.key || row.parentKey === parent.key ? index : -1)))
  rows.value.splice(insertIndex + 1, 0, child)
}

const duplicateRow = key => {
  const source = rows.value.find(row => row.key === key)
  if (!source) return
  const copy = {
    ...source,
    key: `row-${seed++}`,
    name: source.name ? `${source.name}（副本）` : '',
  }
  rows.value.splice(rows.value.findIndex(row => row.key === key) + 1, 0, copy)
}

const removeRows = keys => {
  const removeKeySet = new Set(keys)
  keys.forEach(key => {
    rows.value.filter(row => row.parentKey === key).forEach(row => removeKeySet.add(row.key))
  })
  rows.value = rows.value.filter(row => !removeKeySet.has(row.key))
  selectedKeys.value = selectedKeys.value.filter(key => !removeKeySet.has(key))
  if (!rows.value.length) addParent()
}

const toggleRow = key => {
  selectedKeys.value = selectedKeys.value.includes(key)
    ? selectedKeys.value.filter(item => item !== key)
    : [...selectedKeys.value, key]
}

const toggleAll = event => {
  selectedKeys.value = event.target.checked ? rows.value.map(row => row.key) : []
}

const applyDefaults = () => {
  rows.value.forEach(row => {
    row.roleName = defaults.roleName || row.roleName
    row.priority = defaults.priority || row.priority
    row.assigneeId = defaults.assigneeId || row.assigneeId
    row.plannedStartDate = defaults.planDates?.[0] || row.plannedStartDate
    row.plannedEndDate = defaults.planDates?.[1] || row.plannedEndDate
  })
  message.success('已应用到全部任务')
}

const validateRows = () => {
  if (!defaults.projectId) {
    message.warning('请选择所属项目')
    return false
  }
  const invalidIndex = displayRows.value.findIndex(row => !row.name.trim() || !row.priority || !row.assigneeId)
  if (invalidIndex >= 0) {
    message.warning(`请完善第 ${displayRows.value[invalidIndex].sequence} 行的任务名称、优先级和执行人`)
    return false
  }
  const invalidDateRow = displayRows.value.find(row => row.plannedStartDate && row.plannedEndDate && row.plannedStartDate > row.plannedEndDate)
  if (invalidDateRow) {
    message.warning(`第 ${invalidDateRow.sequence} 行计划结束时间不能早于开始时间`)
    return false
  }
  return true
}

const handleSubmit = async () => {
  if (!validateRows()) return
  submitting.value = true
  try {
    const createdIds = new Map()
    for (const row of displayRows.value) {
      const created = await createTask({
        projectId: defaults.projectId,
        parentId: row.parentKey ? createdIds.get(row.parentKey) : undefined,
        name: row.name.trim(),
        roleName: row.roleName || undefined,
        priority: row.priority,
        assigneeId: row.assigneeId,
        plannedStartDate: row.plannedStartDate || undefined,
        plannedEndDate: row.plannedEndDate || undefined,
        description: row.description || undefined,
        tags: row.tags || undefined,
      })
      createdIds.set(row.key, created.id)
    }
    message.success('任务批量创建成功')
    router.push({ name: 'AllTasks' })
  } catch (error) {
    message.error(error.message || '任务批量创建失败')
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => router.push({ name: 'AllTasks' })

onMounted(async () => {
  try {
    const [dicts, userResult, projectResult] = await Promise.all([
      getDicts(),
      getSystemUsers({ pageNo: 1, pageSize: 200, enabled: true }),
      getProjectList({ pageNo: 1, pageSize: 200, projectType: 'EXECUTION' }),
    ])
    users.value = readRecords(userResult)
    projects.value = readRecords(projectResult)
    priorityOptions.value = (dicts.find(item => item.type === 'taskPriority')?.items || []).map(item => ({ label: item.label, value: item.value }))
    if (!priorityOptions.value.length) {
      priorityOptions.value = [
        { label: '低', value: 'LOW' },
        { label: '中', value: 'MEDIUM' },
        { label: '高', value: 'HIGH' },
        { label: '紧急', value: 'URGENT' },
      ]
    }
    if (!priorityOptions.value.some(item => item.value === defaults.priority)) {
      defaults.priority = priorityOptions.value[0]?.value
    }
    rows.value.forEach(row => {
      row.priority = defaults.priority
    })
  } catch (error) {
    message.error(error.message || '页面初始化失败')
  }
})
</script>

<style scoped>
.batch-task-page {
  min-height: 100%;
  padding: 1.25rem 1.5rem;
  background: #f6f8fc;
}

.batch-task-header,
.batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.batch-task-header {
  margin-bottom: 1rem;
}

.batch-task-header h2 {
  margin: 0 0 0.375rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
}

.batch-task-header span,
.batch-toolbar {
  color: #8c8c8c;
  font-size: 0.8125rem;
}

.batch-card {
  margin-bottom: 0.875rem;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.625rem rgb(31 41 55 / 6%);
}

.defaults-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.125rem;
  align-items: center;
}

.defaults-form :deep(.ant-form-item) {
  margin: 0;
}

.defaults-form :deep(.ant-select),
.defaults-form :deep(.ant-picker),
.defaults-form :deep(.ant-input) {
  width: 12rem;
}

.batch-toolbar {
  margin-bottom: 0.875rem;
}

.table-wrap {
  overflow: auto;
}

.task-table {
  width: 100%;
  min-width: 102rem;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.task-table th,
.task-table td {
  height: 3.375rem;
  padding: 0.375rem 0.5rem;
  border-right: 1px solid #edf0f3;
  border-bottom: 1px solid #edf0f3;
  text-align: left;
  vertical-align: middle;
}

.task-table th {
  height: 2.625rem;
  background: #fafbfc;
  color: #262626;
  white-space: nowrap;
}

.task-table th:first-child,
.task-table td:first-child {
  border-left: 1px solid #edf0f3;
}

.task-table th {
  border-top: 1px solid #edf0f3;
}

.task-table th:nth-child(1),
.task-table td:nth-child(1) {
  width: 2.5rem;
  text-align: center;
}

.task-table th:nth-child(2),
.task-table td:nth-child(2) {
  width: 4.25rem;
  text-align: center;
}

.task-table th:nth-child(3) {
  width: 14.5rem;
}

.task-table th:nth-child(4) {
  width: 8.5rem;
}

.task-table th:nth-child(5) {
  width: 8rem;
}

.task-table th:nth-child(6),
.task-table th:nth-child(7) {
  width: 10.5rem;
}

.task-table th:nth-child(8) {
  width: 11rem;
}

.task-table th:nth-child(9) {
  width: 13rem;
}

.task-table th:nth-child(10) {
  width: 11rem;
}

.task-table th:nth-child(11),
.task-table td:nth-child(11) {
  position: sticky;
  right: 0;
  z-index: 2;
  width: 14rem;
  background: #fff;
  box-shadow: -0.125rem 0 0.3125rem rgb(0 0 0 / 4%);
}

.task-table th:nth-child(11) {
  z-index: 3;
  background: #fafbfc;
}

.task-table :deep(.ant-picker),
.task-table :deep(.ant-select),
.task-table :deep(.ant-input) {
  width: 100%;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 0.3125rem;
}

.name-cell--child {
  padding-left: 1.5rem;
}

.child-mark {
  flex: none;
  color: #bfbfbf;
}

@media (max-width: 900px) {
  .batch-task-header,
  .batch-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .defaults-form :deep(.ant-form-item),
  .defaults-form :deep(.ant-select),
  .defaults-form :deep(.ant-picker),
  .defaults-form :deep(.ant-input) {
    width: 100%;
  }
}
</style>
