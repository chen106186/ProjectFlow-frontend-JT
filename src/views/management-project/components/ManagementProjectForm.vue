<template>
  <div class="project-form-page">
    <a-card class="project-form-card" :bordered="false" :loading="pageLoading">
      <h2 v-if="isEdit">编辑项目</h2>
      <a-form ref="formRef" :model="formState" :rules="formRules" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
        <a-form-item label="项目名称" name="name"><a-input v-model:value="formState.name" placeholder="请输入项目名称" /></a-form-item>
        <a-form-item label="项目经理" name="managerIds"><a-select mode="multiple" v-model:value="formState.managerIds" :options="managerOptions" placeholder="请选择项目经理（可多选）" /></a-form-item>
        <a-form-item label="项目类型" name="type"><a-select v-model:value="formState.type" :options="projectTypeOptions" /></a-form-item>
        <template v-if="formState.type !== 'EXTERNAL'">
          <a-form-item label="业务部门"><a-input v-model:value="formState.department" placeholder="请输入业务部门" /></a-form-item>
          <a-form-item label="承建单位"><a-input v-model:value="formState.contractor" placeholder="请输入承建单位" /></a-form-item>
          <a-form-item label="业务主管"><a-input v-model:value="formState.supervisor" placeholder="请输入业务主管" /></a-form-item>
        </template>
        <a-form-item v-if="isEdit" label="项目阶段">
          <a-select v-model:value="formState.stage" :options="currentStageOptions" placeholder="请选择项目阶段" />
        </a-form-item>
        <a-form-item label="项目节点">
          <div class="project-node-list">
            <a-tag v-for="node in displayNodeOptions" :key="node.value">{{ node.label }}</a-tag>
          </div>
        </a-form-item>
        <a-form-item v-if="!isEdit" label="项目状态"><a-select v-model:value="formState.status" :options="projectStatusOptions" /></a-form-item>
        <a-form-item label="合同状态"><a-select v-model:value="formState.contractStatus" :options="contractOptions" /></a-form-item>
        <a-form-item label="计划开始时间"><a-date-picker v-model:value="formState.plannedStartDate" value-format="YYYY-MM-DD" placeholder="请选择计划开始时间" /></a-form-item>
        <a-form-item label="计划结束时间"><a-date-picker v-model:value="formState.plannedEndDate" value-format="YYYY-MM-DD" placeholder="请选择计划结束时间" /></a-form-item>
        <a-form-item v-if="isEdit" label="实际开始时间"><a-date-picker v-model:value="formState.actualStartDate" value-format="YYYY-MM-DD" placeholder="请选择实际开始时间" /></a-form-item>
        <a-form-item v-if="isEdit" label="实际结束时间">
          <a-date-picker v-model:value="formState.actualEndDate" value-format="YYYY-MM-DD" placeholder="请选择实际结束时间"
            :class="{ 'date-overdue': isOverdueCompleted }" />
          <span v-if="isOverdueCompleted" class="overdue-hint">实际完成时间超出计划，状态将标记为逾期完成</span>
        </a-form-item>
        <a-form-item v-if="isEdit" label="项目状态"><a-select v-model:value="formState.status" :options="editableProjectStatusOptions" /></a-form-item>
        <a-form-item label="回款金额"><a-input-number v-model:value="formState.amount" :min="0" :precision="2" addon-after="万元" /></a-form-item>
        <a-form-item label="项目描述" name="description"><a-textarea v-model:value="formState.description" :rows="5" placeholder="请输入项目描述" /></a-form-item>
      </a-form>
      <div class="form-actions"><a-button @click="handleBack">取消</a-button><a-button type="primary" :loading="submitLoading" @click="handleSubmit">确认</a-button></div>
    </a-card>
  </div>
</template>

<script setup>
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createProject, getGanttNodes, getProjectDetail, getSystemUsers, updateProject } from '@/api/managementProject'
import { getDepartments } from '@/api/system'
import { useDictStore } from '@/store/dictStore'
import { OPERATION_ACTIONS, OPERATION_MODULES, recordOperationLog } from '@/utils/operationLog'

const route = useRoute()
const router = useRouter()
const dictStore = useDictStore()
const isEdit = computed(() => route.name === 'ManagementProjectEdit')
const formRef = ref()
const pageLoading = ref(false)
const submitLoading = ref(false)
const managerOptions = ref([])
const projectStatusOptions = ref([])
const contractOptions = ref([])

const projectTypeOptions = [
  { label: '数字化项目', value: 'DIGITALIZATION' },
  { label: '科技项目', value: 'RESEARCH' },
  { label: '外部项目', value: 'EXTERNAL' },
]
const projectNodeMap = {
  DIGITALIZATION: [
    { label: '可研批复', value: 'FEASIBILITY_APPROVAL' },
    { label: '招标', value: 'BIDDING' },
    { label: '合同签订', value: 'CONTRACT_SIGNING' },
    { label: '概设批复', value: 'PRELIMINARY_APPROVAL' },
    { label: '需求分析', value: 'REQUIREMENT_ANALYSIS' },
    { label: 'UI设计', value: 'UI_DESIGN' },
    { label: '开发', value: 'DEVELOPMENT' },
    { label: '测试', value: 'TESTING' },
    { label: '第三方测试', value: 'THIRD_PARTY_TESTING' },
    { label: '实施部署', value: 'DEPLOYMENT' },
    { label: '上线试运行', value: 'TRIAL_RUN' },
    { label: '验收', value: 'ACCEPTANCE' },
    { label: '完工', value: 'COMPLETION' },
  ],
  RESEARCH: [
    { label: '可研批复', value: 'FEASIBILITY_APPROVAL' },
    { label: '专利申请', value: 'PATENT_APPLICATION' },
    { label: '论文录用(软著申请)', value: 'PAPER_ACCEPTANCE_SOFTWARE_COPYRIGHT' },
    { label: '三方测评', value: 'THIRD_PARTY_EVALUATION' },
    { label: '验收准备', value: 'ACCEPTANCE_PREPARATION' },
    { label: '完工', value: 'COMPLETION' },
  ],
  EXTERNAL: [
    { label: '商务阶段', value: 'BUSINESS_STAGE' },
    { label: '用户调研', value: 'USER_RESEARCH' },
    { label: '需求确认', value: 'REQUIREMENT_CONFIRMATION' },
    { label: '合同签订', value: 'CONTRACT_SIGNING' },
    { label: '开发', value: 'DEVELOPMENT' },
    { label: '测试', value: 'TESTING' },
    { label: '部署实施', value: 'DEPLOYMENT_IMPLEMENTATION' },
    { label: '验收', value: 'ACCEPTANCE' },
    { label: '完工', value: 'COMPLETION' },
  ],
}

const getProjectNodeCodes = type => (projectNodeMap[type] || []).map(item => item.value)
const createDefaultForm = () => ({ name: '', managerIds: [], department: '', contractor: '', supervisor: '', type: 'DIGITALIZATION', nodes: getProjectNodeCodes('DIGITALIZATION'), stage: 'BUSINESS_OPPORTUNITY', status: 'NOT_STARTED', contractStatus: 'NOT_SIGNED', plannedStartDate: undefined, plannedEndDate: undefined, actualStartDate: undefined, actualEndDate: undefined, amount: 0, description: '' })
const formState = reactive(createDefaultForm())
const formRules = { name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }], managerIds: [{ required: true, type: 'array', min: 1, message: '请选择项目经理', trigger: 'change' }], type: [{ required: true, message: '请选择项目类型', trigger: 'change' }], description: [{ required: true, message: '请输入项目描述', trigger: 'blur' }] }
const allNodeOptions = computed(() => Object.values(projectNodeMap).flat())
const getProjectNodeName = code => allNodeOptions.value.find(item => item.value === code)?.label || code
const getProjectNodeCode = name => allNodeOptions.value.find(item => item.label === name || item.value === name)?.value || name
const displayNodeOptions = computed(() => {
  const codes = isEdit.value ? formState.nodes : getProjectNodeCodes(formState.type)
  return codes.map(code => ({ label: getProjectNodeName(code), value: code }))
})
const currentStageOptions = computed(() => projectNodeMap[formState.type] || [])
const isOverdueCompleted = computed(() => {
  if (!formState.actualEndDate || !formState.plannedEndDate) return false
  return formState.actualEndDate > formState.plannedEndDate
})

const editableProjectStatusOptions = computed(() => {
  const allItems = [...dictStore.getDictItems('taskStatus'), ...projectStatusOptions.value]
  const statusMap = new Map(allItems.map(item => [item.value, item.label]))
  return ['NOT_STARTED', 'IN_PROGRESS', 'DUE_SOON', 'OVERDUE', 'COMPLETED', 'OVERDUE_COMPLETED', 'PAUSED'].map(value => ({
    label: statusMap.get(value) || value,
    value,
    disabled: value !== 'PAUSED',
  }))
})

const loadReferenceData = async () => {
  const [userPage, depts] = await Promise.all([
    getSystemUsers({ pageNo: 1, pageSize: 200, enabled: true }),
    getDepartments(),
    dictStore.loadDicts(),
  ])
  const pmDept = (depts || []).find(d => d.name === '项目经理部')
  const allUsers = userPage.records || []
  const pmUsers = pmDept ? allUsers.filter(u => u.departmentId === pmDept.id) : allUsers
  managerOptions.value = (pmUsers.length ? pmUsers : allUsers).map(user => ({ label: user.realName, value: user.id }))
  projectStatusOptions.value = dictStore.getDictItems('projectStatus')
  contractOptions.value = dictStore.getDictItems('contractStatus')
}

const loadProject = async () => {
  if (!isEdit.value) return
  const [project, ganttNodes] = await Promise.all([
    getProjectDetail(route.params.id),
    getGanttNodes(route.params.id),
  ])
  const nodes = Array.isArray(ganttNodes)
    ? ganttNodes.map(node => node.nodeCode || getProjectNodeCode(node.nodeName)).filter(Boolean)
    : []
  Object.assign(formState, createDefaultForm(), {
    name: project.name || '',
    managerIds: project.managerIds || (project.managerId ? [project.managerId] : []),
    department: project.department || project.businessDepartment || '',
    contractor: project.contractor || project.contractorUnit || '',
    supervisor: project.supervisor || project.businessSupervisor || '',
    type: project.projectBusinessType || 'DIGITALIZATION',
    nodes,
    stage: (() => {
      const type = project.projectBusinessType || 'DIGITALIZATION'
      const opts = projectNodeMap[type] || []
      const s = project.stage
      return opts.some(o => o.value === s) ? s : (opts[0]?.value || '')
    })(),
    status: project.statusCode || project.status || 'NOT_STARTED',
    contractStatus: project.contractStatusCode || project.contractStatus || 'NOT_SIGNED',
    plannedStartDate: project.plannedStartDate || undefined,
    plannedEndDate: project.plannedEndDate || undefined,
    actualStartDate: project.actualStartDate || undefined,
    actualEndDate: project.actualEndDate || undefined,
    amount: project.amount ?? project.receivableAmount ?? 0,
    description: project.description || '',
  })
}

watch(() => formState.type, type => {
  if (!isEdit.value) formState.nodes = getProjectNodeCodes(type)
  formState.stage = projectNodeMap[type]?.[0]?.value || ''
  if (type === 'EXTERNAL') {
    formState.department = ''
    formState.contractor = ''
    formState.supervisor = ''
  }
})

onMounted(async () => {
  pageLoading.value = true
  try {
    await loadReferenceData()
    await loadProject()
  } catch (error) {
    message.error(error.message)
  } finally {
    pageLoading.value = false
  }
})

const handleBack = () => router.back()

const handleSubmit = async () => {
  if (submitLoading.value) return
  await formRef.value?.validate()
  submitLoading.value = true
  try {
    const projectData = {
      projectType: 'MANAGEMENT',
      projectBusinessType: formState.type,
      name: formState.name,
      stage: formState.stage,
      contractStatus: formState.contractStatus,
      plannedStartDate: formState.plannedStartDate || null,
      plannedEndDate: formState.plannedEndDate || null,
      actualStartDate: formState.actualStartDate || null,
      actualEndDate: formState.actualEndDate || null,
      managerIds: formState.managerIds,
      businessDepartment: formState.department,
      contractorUnit: formState.contractor,
      businessSupervisor: formState.supervisor,
      receivableAmount: formState.amount,
      description: formState.description,
    }
    if (!isEdit.value || formState.status === 'PAUSED') {
      projectData.status = formState.status
    }
    if (!isEdit.value) {
      projectData.nodes = formState.nodes.map(code => ({ nodeName: getProjectNodeName(code) }))
    }
    const savedProject = isEdit.value
      ? await updateProject(route.params.id, projectData)
      : await createProject(projectData)
    const projectId = savedProject?.id || route.params.id
    message.success(isEdit.value ? '项目编辑成功' : '项目新建成功')
    void recordOperationLog({
      module: OPERATION_MODULES.MANAGEMENT_PROJECT,
      action: isEdit.value ? OPERATION_ACTIONS.UPDATE : OPERATION_ACTIONS.CREATE,
      bizType: 'PROJECT',
      bizId: projectId,
      bizName: projectData.name,
      detail: isEdit.value ? `编辑管理类项目：${projectData.name}` : `新建管理类项目：${projectData.name}`,
      routeName: 'ManagementProjectDetail',
    })
    router.push({ name: 'ManagementProjectDetail', params: { id: projectId } })
  } catch (error) {
    message.error(error.message)
  } finally {
    submitLoading.value = false
  }
}
</script>

<style scoped>
.project-form-page { width: min(1600px, 100%); min-height: 100%; margin: 0 auto; overflow: visible; color: #262626; }
.project-form-card { width: min(1100px, 100%); margin: 0 auto; border: 1px solid #edf0f3; box-shadow: 0 2px 8px rgb(0 0 0 / 3%); }
.project-form-card :deep(.ant-card-body) { padding: 24px 50px 30px; }
.project-form-card h2 { margin: 0 0 24px; font-size: 18px; }
.project-form-card :deep(.ant-form-item) { margin-bottom: 28px; }
.project-form-card :deep(.ant-input-number), .project-form-card :deep(.ant-picker) { width: 100%; }
.project-node-list { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; min-height: 32px; padding: 3px 0; }
.project-node-list :deep(.ant-tag) { padding: 3px 10px; margin-inline-end: 0; color: #262626; background: #f5f5f5; border-color: #d9d9d9; }
.form-actions { display: flex; justify-content: flex-end; gap: 20px; }
.form-actions .ant-btn { width: 120px; }
.date-overdue :deep(.ant-picker-input input) { color: #f5222d; }
.overdue-hint { margin-left: 8px; color: #f5222d; font-size: 12px; }
</style>
