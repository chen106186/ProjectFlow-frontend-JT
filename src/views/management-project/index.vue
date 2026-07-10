<template>
  <div class="project-page">
    <template v-if="viewMode === 'list'">
      <a-card class="project-filter" :bordered="false">
        <a-form class="project-filter__form" layout="inline">
          <a-form-item label="项目名称"><a-input v-model:value="query.keyword" allow-clear /></a-form-item>
          <a-form-item label="项目经理"><a-select v-model:value="query.managerId" :options="managerFilterOptions" /></a-form-item>
          <a-form-item label="项目类型"><a-select v-model:value="query.type" :options="typeFilterOptions" /></a-form-item>
          <a-form-item label="合同状态"><a-select v-model:value="query.contractStatus" :options="contractFilterOptions" /></a-form-item>
          <a-form-item label="项目阶段"><a-select v-model:value="query.stage" :options="stageFilterOptions" /></a-form-item>
          <a-form-item label="项目状态"><a-select v-model:value="query.status" :options="projectStatusFilterOptions" /></a-form-item>
          <a-form-item class="project-filter__actions"><a-space><a-button type="primary" @click="handleSearch">查询</a-button><a-button @click="handleReset">重置</a-button></a-space></a-form-item>
        </a-form>
      </a-card>

      <a-card class="project-list" :bordered="false">
        <div class="project-list__toolbar">
          <a-button type="primary" @click="handleCreate"><PlusOutlined />新建项目</a-button>
          <div class="project-list__display">
            <template v-if="displayMode === 'group'"><span>分组条件：</span><a-select v-model:value="groupField" :options="groupOptions" /></template>
            <a-radio-group v-model:value="displayMode" button-style="solid"><a-radio-button value="list">列表</a-radio-button><a-radio-button value="group">分组</a-radio-button></a-radio-group>
          </div>
        </div>
        <a-table v-if="displayMode === 'list'" row-key="id" :columns="projectColumns" :data-source="filteredProjects" :loading="projectLoading" :pagination="projectPagination" :scroll="{ x: 1480 }" @change="handleProjectTableChange">
          <template #bodyCell="{ column, record, index, text }">
            <template v-if="column.dataIndex === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.dataIndex === 'name'"><a-button type="link" class="table-link" @click="handleDetail(record)">{{ text }}</a-button></template>
            <template v-else-if="column.dataIndex === 'status'"><a-tag color="green">{{ text }}</a-tag></template>
            <template v-else-if="column.dataIndex === 'contractStatus'"><a-tag color="green">{{ text }}</a-tag></template>
            <template v-else-if="column.dataIndex === 'operation'"><a-space><a-button type="link" size="small" @click="handleEdit(record)"><EditOutlined /></a-button><a-popconfirm title="确定删除该项目吗？" @confirm="handleDelete(record)"><a-button type="link" size="small" danger><DeleteOutlined /></a-button></a-popconfirm></a-space></template>
          </template>
        </a-table>
        <div v-else class="project-group-list">
          <section v-for="(group, groupIndex) in groupedProjects" :key="group.value" class="project-group">
            <header class="project-group__header"><button type="button" @click="handleToggleGroup(group.value)"><RightOutlined v-if="isGroupCollapsed(group.value)" /><DownOutlined v-else />{{ group.label }}</button><a-tag>{{ group.rows.length }}</a-tag></header>
            <a-table v-if="!isGroupCollapsed(group.value)" row-key="id" :columns="projectColumns" :data-source="group.rows" :pagination="false" :scroll="{ x: 1480 }" :show-header="groupIndex === 0">
              <template #bodyCell="{ column, record, index, text }">
                <template v-if="column.dataIndex === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.dataIndex === 'name'"><a-button type="link" class="table-link" @click="handleDetail(record)">{{ text }}</a-button></template>
                <template v-else-if="column.dataIndex === 'status'"><a-tag color="green">{{ text }}</a-tag></template>
                <template v-else-if="column.dataIndex === 'contractStatus'"><a-tag color="green">{{ text }}</a-tag></template>
                <template v-else-if="column.dataIndex === 'operation'"><a-space><a-button type="link" size="small" @click="handleEdit(record)"><EditOutlined /></a-button><a-popconfirm title="确定删除该项目吗？" @confirm="handleDelete(record)"><a-button type="link" size="small" danger><DeleteOutlined /></a-button></a-popconfirm></a-space></template>
              </template>
            </a-table>
          </section>
        </div>
      </a-card>
    </template>

    <a-card v-else-if="viewMode === 'create' || viewMode === 'edit'" class="project-form-card" :bordered="false">
      <h2 v-if="viewMode === 'edit'">编辑项目</h2>
      <a-form ref="formRef" :model="formState" :rules="formRules" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
        <a-form-item label="项目名称" name="name"><a-input v-model:value="formState.name" placeholder="请输入项目名称" /></a-form-item>
        <a-form-item label="项目经理" name="managerId"><a-select v-model:value="formState.managerId" :options="managerOptions" placeholder="请选择项目经理" /></a-form-item>
        <a-form-item label="业务部门"><a-input v-model:value="formState.department" placeholder="请输入业务部门" /></a-form-item>
        <a-form-item label="承建单位"><a-input v-model:value="formState.contractor" placeholder="请输入承建单位" /></a-form-item>
        <a-form-item label="业务主管"><a-input v-model:value="formState.supervisor" placeholder="请输入业务主管" /></a-form-item>
        <a-form-item label="项目类型" name="type"><a-select v-model:value="formState.type" :options="projectTypeFormOptions" /></a-form-item>
        <a-form-item label="项目节点"><a-checkbox-group v-model:value="formState.nodes" :options="nodeOptions" /></a-form-item>
        <a-form-item label="项目阶段"><a-select v-model:value="formState.stage" :options="stageOptions" /></a-form-item>
        <a-form-item label="项目状态"><a-select v-model:value="formState.status" :options="projectStatusOptions" /></a-form-item>
        <a-form-item label="合同状态"><a-select v-model:value="formState.contractStatus" :options="contractOptions" /></a-form-item>
        <a-form-item label="回款金额"><a-input-number v-model:value="formState.amount" :min="0" :precision="2" addon-after="万元" /></a-form-item>
        <a-form-item label="项目描述" name="description"><a-textarea v-model:value="formState.description" :rows="5" placeholder="请输入项目描述" /></a-form-item>
      </a-form>
      <div class="form-actions"><a-button @click="handleBack">取消</a-button><a-button type="primary" :loading="submitLoading" @click="handleSubmit">确认</a-button></div>
    </a-card>

    <template v-else>
      <div class="project-detail">
        <div class="project-detail__heading"><a-button @click="handleBack"><ArrowLeftOutlined />返回</a-button><a-tag color="processing">{{ currentProject?.status || '-' }}</a-tag></div>
        <section class="project-summary">
          <dl><template v-for="item in summaryItems" :key="item.label"><dt>{{ item.label }}：</dt><dd><a-tag v-if="item.tag" :color="item.color">{{ item.value }}</a-tag><template v-else>{{ item.value }}</template></dd></template></dl>
          <div class="project-summary__progress">
            <div class="project-summary__title"><h3><ProjectOutlined />项目进度</h3><span>根据项目进度权重计算</span></div>
            <div class="project-summary__bar"><a-progress :percent="ganttSummaryData.overallProgress" :show-info="false" stroke-color="#52c41a" /><strong>{{ ganttSummaryData.overallProgress }}%</strong></div>
            <div class="summary-metrics"><div><strong>{{ taskRows.length }}</strong><span>关联任务</span></div><div><strong class="danger">{{ bugRows.length }}</strong><span>关联Bug</span></div></div>
          </div>
        </section>
        <ProjectDetailTabs
          ref="detailTabsRef"
          v-model:active-tab="activeTab"
          :tabs="detailTabs"
          :gantt-summary="ganttSummary"
          :gantt-table-width="ganttTableWidth"
          :gantt-node-columns="ganttNodeColumns"
          :gantt-node-rows="ganttNodeRows"
          :gantt-status-colors="ganttStatusColors"
          :gantt-custom-row="handleGanttRow"
          :detail-loading="detailLoading"
          :risks="risks"
          :task-columns="taskColumns"
          :task-rows="taskRows"
          :task-loading="taskLoading"
          :task-status-filters="taskStatusFilters"
          :person-filter-options="personFilterOptions"
          :bug-summary="bugSummary"
          :bug-columns="bugColumns"
          :bug-rows="bugRows"
          :bug-loading="bugLoading"
          :bug-status-filters="bugStatusFilters"
          :report-rows="reportRows"
          :report-columns="reportColumns"
          :report-loading="reportLoading"
          :report-status-filters="reportStatusFilters"
          :document-categories="documentCategories"
          :document-columns="documentColumns"
          :document-rows="documentRows"
          :document-loading="documentLoading"
          :document-row-selection="documentRowSelection"
          :selected-document-ids="selectedDocumentIds"
          :pagination="pagination"
          @create-report="handleCreateReport"
          @edit-report="handleEditReport"
          @open-upload="handleOpenUploadModal"
          @delete-documents="handleDeleteDocuments"
          @download-document="handleDownloadDocument"
          @delete-document="handleDeleteDocument"
        />
      </div>
    </template>

    <a-modal v-model:open="uploadVisible" class="document-upload-modal" title="上传文件" :width="760" :footer="null" :z-index="1200" destroy-on-close>
      <a-upload-dragger :before-upload="handleDocumentBeforeUpload" :show-upload-list="false" multiple accept=".doc,.docx,.xls,.xlsx,.pdf,.png,.jpg,.jpeg,.drawio">
        <p class="upload-drag-icon"><InboxOutlined /></p>
        <p class="upload-drag-title">拖拽文件到此处，<span>或点击选择文件</span></p>
        <p class="upload-drag-hint">支持：docx、xlsx、pdf、png、jpg、drawio</p>
        <p class="upload-drag-hint">单个文件不超过 50MB</p>
      </a-upload-dragger>
      <h3 class="upload-list-title">文件列表：</h3>
      <div class="upload-file-list">
        <div v-for="file in uploadFiles" :key="file.uid" class="upload-file-item">
          <FileOutlined class="upload-file-item__icon" />
          <span class="upload-file-item__name">{{ file.name }}</span>
          <span>{{ formatFileSize(file.size) }}</span>
          <a-progress :percent="file.percent" size="small" :show-info="false" />
          <span>{{ file.percent }}%</span>
          <a-button v-if="file.percent < 100" type="link" @click="handleRemoveUploadFile(file.uid)">取消</a-button>
          <CheckOutlined v-else class="upload-file-item__success" />
        </div>
        <a-empty v-if="uploadFiles.length === 0" description="暂无待上传文件" />
      </div>
      <a-form :model="uploadForm" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }" class="upload-form">
        <div class="upload-form__row">
          <a-form-item label="存储位置"><a-select v-model:value="uploadForm.location" :options="storageOptions" /></a-form-item>
          <a-form-item label="文件分类"><a-select v-model:value="uploadForm.category" :options="documentCategoryOptions" /></a-form-item>
        </div>
        <a-form-item label="版本说明"><a-textarea v-model:value="uploadForm.description" :rows="4" placeholder="请输入版本更新说明..." /></a-form-item>
      </a-form>
      <div class="upload-modal-actions"><a-button @click="uploadVisible = false">取消</a-button><a-button type="primary" :loading="uploadLoading" @click="handleStartUpload">开始上传</a-button></div>
    </a-modal>

    <a-modal v-model:open="reportVisible" class="report-modal" :title="reportMode === 'create' ? '新建汇报' : '编辑汇报'" :width="640" :footer="null" destroy-on-close>
      <a-form ref="reportFormRef" :model="reportForm" :rules="reportRules" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
        <a-form-item label="汇报标题" name="title"><a-input v-model:value="reportForm.title" placeholder="请输入汇报标题" /></a-form-item>
        <a-form-item label="汇报类型" name="type"><a-select v-model:value="reportForm.type" :options="reportTypeOptions" placeholder="请选择汇报类型" /></a-form-item>
        <a-form-item label="状态" name="status"><a-select v-model:value="reportForm.status" :options="reportStatusOptions" placeholder="请选择汇报状态" /></a-form-item>
        <a-form-item label="计划日期" name="planDate"><a-date-picker v-model:value="reportForm.planDate" format="YYYY-MM-DD" placeholder="请选择计划日期" /></a-form-item>
        <a-form-item label="实际日期"><a-date-picker v-model:value="reportForm.actualDate" format="YYYY-MM-DD" placeholder="请选择实际日期" /></a-form-item>
        <a-form-item label="关联任务"><a-select v-model:value="reportForm.task" :options="reportTaskOptions" placeholder="请选择关联任务" allow-clear /></a-form-item>
        <a-form-item label="汇报对象" name="target"><a-input v-model:value="reportForm.target" placeholder="请输入汇报对象" /></a-form-item>
        <a-form-item label="地点/方式" name="place"><a-input v-model:value="reportForm.place" placeholder="请输入地点或汇报方式" /></a-form-item>
        <a-form-item label="描述" name="description"><a-textarea v-model:value="reportForm.description" :rows="4" placeholder="请输入汇报描述" /></a-form-item>
      </a-form>
      <div class="report-modal__actions"><a-button @click="reportVisible = false">取消</a-button><a-button type="primary" :loading="reportSubmitLoading" @click="handleSubmitReport">确定</a-button></div>
    </a-modal>

    <a-modal v-model:open="ganttEditVisible" title="编辑节点" :width="560" :footer="null" destroy-on-close>
      <a-form ref="ganttFormRef" :model="ganttForm" :rules="ganttFormRules" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
        <a-form-item label="节点名称"><a-input :value="ganttForm.name" disabled /></a-form-item>
        <a-form-item label="计划开始" name="planStart"><a-date-picker v-model:value="ganttForm.planStart" value-format="YYYY-MM-DD" placeholder="请选择计划开始日期" /></a-form-item>
        <a-form-item label="计划结束" name="planEnd"><a-date-picker v-model:value="ganttForm.planEnd" value-format="YYYY-MM-DD" placeholder="请选择计划结束日期" /></a-form-item>
        <a-form-item label="实际开始"><a-date-picker v-model:value="ganttForm.actualStart" value-format="YYYY-MM-DD" placeholder="请选择实际开始日期" allow-clear /></a-form-item>
        <a-form-item label="实际结束"><a-date-picker v-model:value="ganttForm.actualEnd" value-format="YYYY-MM-DD" placeholder="请选择实际结束日期" allow-clear /></a-form-item>
        <a-form-item label="状态" name="status"><a-select v-model:value="ganttForm.status" :options="ganttStatusOptions" placeholder="请选择节点状态" /></a-form-item>
        <a-form-item label="进度" name="progress"><a-input-number v-model:value="ganttForm.progress" :min="0" :max="100" :precision="0" addon-after="%" /></a-form-item>
      </a-form>
      <div class="gantt-edit-actions"><a-button @click="ganttEditVisible = false">取消</a-button><a-button type="primary" :loading="ganttSubmitLoading" @click="handleSaveGanttNode">保存</a-button></div>
    </a-modal>
  </div>
</template>

<script setup>
import { ArrowLeftOutlined, BugOutlined, CheckCircleOutlined, CheckOutlined, ClockCircleOutlined, CodeOutlined, DeleteOutlined, DownOutlined, EditOutlined, ExclamationCircleOutlined, FileDoneOutlined, FileOutlined, FileProtectOutlined, FileTextOutlined, FireOutlined, FlagOutlined, FolderOpenOutlined, InboxOutlined, PlusOutlined, ProfileOutlined, ProjectOutlined, RightOutlined, SendOutlined, SnippetsOutlined, ToolOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import Gantt from 'frappe-gantt'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProjectDetailTabs from './components/ProjectDetailTabs.vue'
import {
  createProject,
  createProjectReport,
  deleteProject,
  deleteProjectFile,
  deleteProjectFiles,
  downloadProjectFile,
  getGanttNodes,
  getGanttSummary,
  getProjectBugs,
  getProjectDetail,
  getProjectFiles,
  getProjectList,
  getProjectReports,
  getProjectTasks,
  getSystemUsers,
  updateGanttNode,
  updateProject,
  updateProjectReport,
  uploadProjectFile,
} from '@/api/managementProject'
import { useDictStore } from '@/store/dictStore'

const route = useRoute()
const router = useRouter()
const dictStore = useDictStore()
const viewMode = computed(() => route.meta.projectView || 'list')
const formRef = ref()
const submitLoading = ref(false)
const projectLoading = ref(false)
const detailLoading = ref(false)
const taskLoading = ref(false)
const bugLoading = ref(false)
const reportLoading = ref(false)
const documentLoading = ref(false)
const selectedDocumentIds = ref([])
const editingId = ref(null)
const currentProject = ref(null)
const activeTab = ref('gantt')
const detailTabsRef = ref()
const uploadVisible = ref(false)
const uploadLoading = ref(false)
const uploadFiles = ref([])
const reportVisible = ref(false)
const ganttEditVisible = ref(false)
const ganttSubmitLoading = ref(false)
const ganttFormRef = ref()
const reportMode = ref('create')
const reportFormRef = ref()
const reportSubmitLoading = ref(false)
const editingReportId = ref(null)
let ganttInstance

const toOptions = values => values.map(value => ({ label: value, value }))
const managerOptions = ref([])
const projectTypeFormOptions = ref([])
const stageOptions = ref([])
const projectStatusOptions = ref([])
const contractOptions = ref([])
const taskStatusOptions = ref([])
const taskPriorityOptions = ref([])
const bugStatusOptions = ref([])
const bugPriorityOptions = ref([])
const reportTypeOptions = ref([])
const reportStatusOptions = ref([])
const dictLabels = reactive({})
const projectTypeLabels = {
  DIGITALIZATION: '数字化项目',
  INFORMATIZATION: '信息化项目',
  RESEARCH: '科研项目',
  MANAGEMENT: '管理类项目',
  EXECUTION: '执行类项目',
}
const withAll = options => [{ label: '全部', value: '全部' }, ...options]
const managerFilterOptions = computed(() => withAll(managerOptions.value))
const typeFilterOptions = computed(() => withAll(projectTypeFormOptions.value))
const stageFilterOptions = computed(() => withAll(stageOptions.value))
const projectStatusFilterOptions = computed(() => withAll(projectStatusOptions.value))
const contractFilterOptions = computed(() => withAll(contractOptions.value))
const nodeOptions = computed(() => stageOptions.value.map(item => ({ label: item.label, value: item.label })))
const groupOptions = [{ label: '项目经理', value: 'manager' }, { label: '项目阶段', value: 'stage' }, { label: '项目状态', value: 'status' }, { label: '项目类型', value: 'type' }, { label: '合同状态', value: 'contractStatus' }]

const projects = ref([])
const createDefaultForm = () => ({ name: '', managerId: undefined, department: '', contractor: '', supervisor: '', type: 'DIGITALIZATION', nodes: [], stage: 'BUSINESS_OPPORTUNITY', status: 'NOT_STARTED', contractStatus: 'NOT_SIGNED', amount: 0, description: '' })
const formState = reactive(createDefaultForm())
const query = reactive({ keyword: '', managerId: '全部', type: '全部', contractStatus: '全部', stage: '全部', status: '全部' })
const appliedQuery = reactive({ ...query })
const displayMode = ref('list')
const groupField = ref('manager')
const collapsedGroups = ref([])

const projectColumns = [
  { title: '序号', dataIndex: 'index', width: 65, fixed: 'left' },
  { title: '项目名称', dataIndex: 'name', width: 190 },
  { title: '项目经理', dataIndex: 'manager', width: 100 },
  { title: '业务部门', dataIndex: 'department', width: 150 },
  { title: '承建单位', dataIndex: 'contractor', width: 150 },
  { title: '业务主管', dataIndex: 'supervisor', width: 100 },
  { title: '项目阶段', dataIndex: 'stage', width: 110 },
  { title: '项目状态', dataIndex: 'status', width: 110 },
  { title: '合同状态', dataIndex: 'contractStatus', width: 110 },
  { title: '回款金额', dataIndex: 'amount', width: 110, customRender: ({ text }) => `${text}万元` },
  { title: '项目类型', dataIndex: 'type', width: 120 },
  { title: '项目描述', dataIndex: 'description', width: 170 },
  { title: '操作', dataIndex: 'operation', width: 110, fixed: 'right' },
]
const projectPagination = reactive({ current: 1, pageSize: 10, total: 0, pageSizeOptions: ['10', '50', '100'], showSizeChanger: true, showTotal: total => `共 ${total} 条` })
const pagination = { defaultPageSize: 10, pageSizeOptions: ['10', '50', '100'], showSizeChanger: true, showTotal: total => `共 ${total} 条` }
const formRules = { name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }], managerId: [{ required: true, message: '请选择项目经理', trigger: 'change' }], type: [{ required: true, message: '请选择项目类型', trigger: 'change' }], description: [{ required: true, message: '请输入项目描述', trigger: 'blur' }] }

const filteredProjects = computed(() => projects.value.filter(item => {
  const keywordMatched = !appliedQuery.keyword || item.name.includes(appliedQuery.keyword)
  return keywordMatched && ['type', 'stage'].every(key => appliedQuery[key] === '全部' || item[key] === appliedQuery[key])
}))
const groupedProjects = computed(() => {
  const labelMap = { manager: '项目经理', stage: '项目阶段', status: '项目状态', type: '项目类型', contractStatus: '合同状态' }
  const groups = new Map()
  filteredProjects.value.forEach(project => {
    const value = project[groupField.value] || '未设置'
    if (!groups.has(value)) groups.set(value, [])
    groups.get(value).push(project)
  })
  return Array.from(groups, ([value, rows]) => ({ value, label: `${labelMap[groupField.value]}：${value}`, rows }))
})

const detailTabs = [
  { key: 'gantt', label: '项目甘特图', icon: ProjectOutlined },
  { key: 'tasks', label: '任务列表', icon: ProfileOutlined },
  { key: 'bugs', label: 'Bug列表', icon: BugOutlined },
  { key: 'reports', label: '项目汇报', icon: FlagOutlined },
  { key: 'documents', label: '文档中心', icon: SnippetsOutlined },
]
const ganttSummaryData = reactive({ total: 0, completed: 0, overdue: 0, dueSoon: 0, overallProgress: 0 })
const ganttSummary = computed(() => [{ label: '项目状态', value: currentProject.value?.status || '-', desc: `整体进度 ${ganttSummaryData.overallProgress}%`, class: 'gantt-progress', icon: ProjectOutlined }, { label: '延期任务', value: `${ganttSummaryData.overdue} 个`, desc: '需重点关注', class: 'risk-high', icon: WarningOutlined }, { label: '即将到期', value: `${ganttSummaryData.dueSoon} 个`, desc: '未来 3 天内到期', class: 'risk-due', icon: ClockCircleOutlined }])
const ganttStatusColors = { 未开始: 'default', 进行中: 'processing', 即将到期: 'gold', 已完成: 'green', 已逾期: 'red', 里程碑: 'green' }
const ganttStatusClasses = { 未开始: 'gantt-not-started', 进行中: 'gantt-in-progress', 即将到期: 'gantt-due-soon', 已完成: 'gantt-completed', 已逾期: 'gantt-overdue', 里程碑: 'gantt-milestone' }
const ganttStatusOptions = computed(() => taskStatusOptions.value.length ? taskStatusOptions.value : [
  { label: '未开始', value: 'NOT_STARTED' },
  { label: '进行中', value: 'IN_PROGRESS' },
  { label: '即将到期', value: 'DUE_SOON' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已逾期', value: 'OVERDUE' },
])
const ganttNodeColumns = [
  { title: '节点名称', dataIndex: 'name', width: 160 }, { title: '计划开始', dataIndex: 'planStart', width: 120 }, { title: '计划结束', dataIndex: 'planEnd', width: 120 },
  { title: '实际开始', dataIndex: 'actualStart', width: 120 }, { title: '实际结束', dataIndex: 'actualEnd', width: 120 }, { title: '状态', dataIndex: 'status', width: 90 },
  { title: '进度', dataIndex: 'progress', width: 160 },
]
const ganttTableWidth = ganttNodeColumns.reduce((total, column) => total + column.width, 0)
const ganttNodeRows = ref([])
const ganttTasks = computed(() => ganttNodeRows.value.filter(node => node.planStart !== '-' && node.planEnd !== '-').map((node, index, rows) => ({
  id: String(node.id),
  name: node.name,
  start: node.planStart.replaceAll('/', '-'),
  end: node.status === '里程碑' ? dayjs(node.planEnd.replaceAll('/', '-')).add(1, 'day').format('YYYY-MM-DD') : node.planEnd.replaceAll('/', '-'),
  planStart: node.planStart,
  actualStart: node.actualStart,
  planEnd: node.planEnd,
  actualEnd: node.actualEnd,
  progress: node.progress,
  dependencies: index ? String(rows[index - 1].id) : undefined,
  custom_class: ganttStatusClasses[node.status],
})))
const ganttForm = reactive({ id: null, name: '', planStart: undefined, planEnd: undefined, actualStart: undefined, actualEnd: undefined, status: undefined, progress: 0 })
const ganttFormRules = {
  planStart: [{ required: true, message: '请选择计划开始日期', trigger: 'change' }],
  planEnd: [{ required: true, message: '请选择计划结束日期', trigger: 'change' }, { validator: (_, value) => !value || !ganttForm.planStart || !dayjs(value).isBefore(dayjs(ganttForm.planStart)) ? Promise.resolve() : Promise.reject(new Error('计划结束日期不能早于计划开始日期')), trigger: 'change' }],
  status: [{ required: true, message: '请选择节点状态', trigger: 'change' }],
  progress: [{ required: true, message: '请输入节点进度', trigger: 'change' }],
}

const risks = computed(() => {
  const today = dayjs().startOf('day')
  const nodes = ganttNodeRows.value.filter(n => n.planEnd !== '-' && n.statusCode !== 'COMPLETED')
  const highRisk = nodes.filter(n => today.diff(dayjs(n.planEnd.replaceAll('/', '-')), 'day') >= 3).length
  const medRisk = nodes.filter(n => { const d = today.diff(dayjs(n.planEnd.replaceAll('/', '-')), 'day'); return d >= 1 && d < 3 }).length
  const dueSoon = nodes.filter(n => { const diff = dayjs(n.planEnd.replaceAll('/', '-')).diff(today, 'day'); return diff >= 0 && diff <= 3 }).length
  const onTrack = nodes.filter(n => dayjs(n.planEnd.replaceAll('/', '-')).diff(today, 'day') > 3).length
  return [
    { label: '高风险节点', value: `${highRisk} 个`, desc: '延期 ≥ 3 天', class: 'risk-high', icon: FireOutlined },
    { label: '中风险节点', value: `${medRisk} 个`, desc: '延期 1 - 2 天', class: 'risk-medium', icon: WarningOutlined },
    { label: '即将到期', value: `${dueSoon} 个`, desc: '未来 3 天内到期', class: 'risk-due', icon: ClockCircleOutlined },
    { label: '按计划进行', value: `${onTrack} 个`, desc: '无延期风险', class: 'risk-normal', icon: CheckCircleOutlined },
  ]
})
const taskColumns = [{ title: '序号', dataIndex: 'id', width: 60 }, { title: '任务名称', dataIndex: 'name', width: 180 }, { title: '负责人', dataIndex: 'owner', width: 90 }, { title: '优先级', dataIndex: 'priority', width: 80 }, { title: '状态', dataIndex: 'status', width: 90 }, { title: '计划开始', dataIndex: 'planStart', width: 110 }, { title: '计划结束', dataIndex: 'planEnd', width: 110 }, { title: '实际开始', dataIndex: 'actualStart', width: 110 }, { title: '实际结束', dataIndex: 'actualEnd', width: 110 }]
const taskRows = ref([])
const taskStatusFilters = toOptions(['全部状态', '未开始', '进行中', '已完成'])
const personFilterOptions = toOptions(['全部负责人', '全部指定人', '张三', '李四', '王五'])
const bugSummary = computed(() => [{ label: '紧急', value: bugRows.value.filter(item => item.priorityCode === 'URGENT').length, class: 'bug-severe', icon: ExclamationCircleOutlined }, { label: '待修复', value: bugRows.value.filter(item => item.statusCode === 'PENDING_FIX').length, class: 'bug-submitted', icon: SendOutlined }, { label: '修复中', value: bugRows.value.filter(item => item.statusCode === 'FIXING').length, class: 'bug-confirmed', icon: ToolOutlined }, { label: '已关闭', value: bugRows.value.filter(item => item.statusCode === 'CLOSED').length, class: 'bug-closed', icon: CheckCircleOutlined }])
const bugColumns = [{ title: '序号', dataIndex: 'id', width: 60 }, { title: 'BUG ID', dataIndex: 'code', width: 130 }, { title: '标题', dataIndex: 'title', width: 220 }, { title: '严重级别', dataIndex: 'severity', width: 100 }, { title: '状态', dataIndex: 'status', width: 100 }, { title: '指定人', dataIndex: 'assignee', width: 90 }, { title: '创建人', dataIndex: 'creator', width: 90 }]
const bugRows = ref([])
const bugStatusFilters = toOptions(['全部状态', '待处理', '修复中', '已完成'])
const reportStatusFilters = toOptions(['全部', '准备中', '进行中', '已完成'])
const reportColumns = [{ title: '汇报标题', dataIndex: 'title', width: 220 }, { title: '汇报类型', dataIndex: 'type', width: 110 }, { title: '状态', dataIndex: 'status', width: 100 }, { title: '计划时间', dataIndex: 'planTime', width: 150 }, { title: '实际时间', dataIndex: 'actualTime', width: 150 }, { title: '汇报对象', dataIndex: 'target', width: 110 }, { title: '地点/方式', dataIndex: 'place', width: 120 }]
const reportRows = ref([])
const createDefaultReportForm = () => ({ title: '', type: 'WEEKLY', status: 'DRAFT', planDate: undefined, actualDate: undefined, task: undefined, target: '', place: '', description: '' })
const reportForm = reactive(createDefaultReportForm())
const reportTaskOptions = computed(() => taskRows.value.map(item => ({ label: item.name, value: item.id })))
const reportRules = { title: [{ required: true, message: '请输入汇报标题', trigger: 'blur' }], type: [{ required: true, message: '请选择汇报类型', trigger: 'change' }], status: [{ required: true, message: '请选择汇报状态', trigger: 'change' }], planDate: [{ required: true, message: '请选择计划日期', trigger: 'change' }], target: [{ required: true, message: '请输入汇报对象', trigger: 'blur' }], place: [{ required: true, message: '请输入地点或汇报方式', trigger: 'blur' }], description: [{ required: true, message: '请输入汇报描述', trigger: 'blur' }] }
const documentCategories = computed(() => [{ label: '全部', value: documentRows.value.length, class: 'category-all', icon: FolderOpenOutlined }, ...['合同类', '需求类', '设计类', '开发类', '验收类'].map((label, index) => ({ label, value: documentRows.value.filter(item => item.category === label).length, class: ['category-contract', 'category-requirement', 'category-design', 'category-development', 'category-acceptance'][index], icon: [FileProtectOutlined, FileTextOutlined, SnippetsOutlined, CodeOutlined, FileDoneOutlined][index] }))])
const documentColumns = [{ title: '文件名', dataIndex: 'name' }, { title: '类型', dataIndex: 'type', width: 90 }, { title: '大小', dataIndex: 'size', width: 90 }, { title: '版本', dataIndex: 'version', width: 80 }, { title: '上传人', dataIndex: 'uploader', width: 80 }, { title: '分类', dataIndex: 'category', width: 90 }, { title: '上传时间', dataIndex: 'uploadTime', width: 130 }, { title: '操作', dataIndex: 'operation', width: 120 }]
const documentRows = ref([])
const documentRowSelection = computed(() => ({
  selectedRowKeys: selectedDocumentIds.value,
  onChange: keys => { selectedDocumentIds.value = keys },
}))
const uploadForm = reactive({ location: '项目文档库', category: '需求类', description: '' })
const storageOptions = toOptions(['项目文档库', '公共文档库'])
const documentCategoryOptions = toOptions(['合同类', '需求类', '设计类', '开发类', '验收类'])
const summaryItems = computed(() => [
  { label: '项目名称', value: currentProject.value?.name || '-' },
  { label: '项目类型', value: currentProject.value?.type || '管理类项目' },
  { label: '项目经理', value: currentProject.value?.manager || '-' },
  { label: '业务部门', value: currentProject.value?.department || '-' },
  { label: '承建单位', value: currentProject.value?.contractor || '-' },
  { label: '业务主管', value: currentProject.value?.supervisor || '-' },
  { label: '项目阶段', value: currentProject.value?.stage || '-' },
  { label: '项目状态', value: currentProject.value?.status || '-', tag: true, color: 'processing' },
  { label: '合同状态', value: currentProject.value?.contractStatus || '-', tag: true, color: 'green' },
  { label: '回款金额', value: currentProject.value?.amount ? `${currentProject.value.amount}万元` : '0万元' },
  { label: '计划开始', value: currentProject.value?.plannedStartDate || '-' },
  { label: '计划结束', value: currentProject.value?.plannedEndDate || '-' },
])

const getDictLabel = (type, value) => dictLabels[type]?.[value] || value || '-'
const getUserName = id => managerOptions.value.find(item => item.value === id)?.label || (id ? `用户 ${id}` : '-')
const getStatusLabel = value => ganttStatusOptions.value.find(item => item.value === value)?.label || getDictLabel('taskStatus', value)
const mapProject = project => ({
  ...project,
  manager: getUserName(project.managerId),
  stage: getDictLabel('projectStage', project.stage),
  stageCode: project.stage,
  status: getDictLabel('projectStatus', project.status),
  statusCode: project.status,
  contractStatus: getDictLabel('contractStatus', project.contractStatus),
  contractStatusCode: project.contractStatus,
  type: project.type || projectTypeLabels[project.projectBusinessType] || project.projectBusinessType || '-',
  department: project.department || project.businessDepartment || '-',
  contractor: project.contractor || project.contractorUnit || '-',
  supervisor: project.supervisor || project.businessSupervisor || '-',
  amount: project.amount ?? project.receivableAmount ?? 0,
})

const mapProjectToForm = project => ({
  name: project.name || '',
  managerId: project.managerId,
  department: project.department || project.businessDepartment || '',
  contractor: project.contractor || project.contractorUnit || '',
  supervisor: project.supervisor || project.businessSupervisor || '',
  type: project.projectBusinessType || 'DIGITALIZATION',
  nodes: Array.isArray(project.nodes) ? project.nodes : [],
  stage: project.stage || 'BUSINESS_OPPORTUNITY',
  status: project.statusCode || project.status || 'NOT_STARTED',
  contractStatus: project.contractStatusCode || project.contractStatus || 'NOT_SIGNED',
  amount: project.amount ?? project.receivableAmount ?? 0,
  description: project.description || '',
})

const fetchReferenceData = async () => {
  try {
    const [userPage] = await Promise.all([
      getSystemUsers({ pageNo: 1, pageSize: 200, enabled: true }),
      dictStore.loadDicts(),
    ])
    const dictGroups = Object.entries(dictStore.state.groups).map(([type, group]) => ({ type, ...group }))
    dictGroups.forEach(group => {
      dictLabels[group.type] = Object.fromEntries(group.items.map(item => [item.value, item.label]))
    })
    projectTypeFormOptions.value = dictGroups.find(item => item.type === 'projectBusinessType')?.items || []
    stageOptions.value = dictGroups.find(item => item.type === 'projectStage')?.items || []
    projectStatusOptions.value = dictGroups.find(item => item.type === 'projectStatus')?.items || []
    contractOptions.value = dictGroups.find(item => item.type === 'contractStatus')?.items || []
    taskStatusOptions.value = dictGroups.find(item => item.type === 'taskStatus')?.items || []
    taskPriorityOptions.value = dictGroups.find(item => item.type === 'taskPriority')?.items || []
    bugStatusOptions.value = dictGroups.find(item => item.type === 'bugStatus')?.items || []
    bugPriorityOptions.value = dictGroups.find(item => item.type === 'bugPriority')?.items || []
    reportTypeOptions.value = dictGroups.find(item => item.type === 'reportType')?.items || []
    reportStatusOptions.value = dictGroups.find(item => item.type === 'reportStatus')?.items || []
    managerOptions.value = userPage.records.map(user => ({ label: user.realName, value: user.id }))
  } catch (error) {
    message.error(error.message)
  }
}

const fetchProjects = async () => {
  projectLoading.value = true
  try {
    const result = await getProjectList({
      projectType: 'MANAGEMENT',
      projectBusinessType: appliedQuery.type === '全部' ? undefined : appliedQuery.type,
      keyword: appliedQuery.keyword,
      managerId: appliedQuery.managerId === '全部' ? undefined : appliedQuery.managerId,
      stage: appliedQuery.stage === '全部' ? undefined : appliedQuery.stage,
      contractStatus: appliedQuery.contractStatus === '全部' ? undefined : appliedQuery.contractStatus,
      status: appliedQuery.status === '全部' ? undefined : appliedQuery.status,
      pageNo: projectPagination.current,
      pageSize: projectPagination.pageSize,
    })
    const rows = result.records.map(mapProject)
    projects.value = rows
    projectPagination.total = result.total
  } catch (error) {
    projects.value = []
    projectPagination.total = 0
    message.error(error.message)
  } finally {
    projectLoading.value = false
  }
}

const fetchProjectRelatedData = async projectId => {
  detailLoading.value = true
  taskLoading.value = true
  bugLoading.value = true
  reportLoading.value = true
  documentLoading.value = true
  try {
    const [project, nodes, ganttResult, taskResult, bugResult, reportResult, files] = await Promise.all([
      getProjectDetail(projectId),
      getGanttNodes(projectId),
      getGanttSummary(projectId),
      getProjectTasks({ projectId, pageNo: 1, pageSize: 200 }),
      getProjectBugs({ projectId, pageNo: 1, pageSize: 200 }),
      getProjectReports({ projectId, pageNo: 1, pageSize: 200 }),
      getProjectFiles({ businessType: 'PROJECT', businessId: projectId }),
    ])
    currentProject.value = mapProject(project)
    Object.assign(ganttSummaryData, ganttResult)
    ganttNodeRows.value = nodes.map(node => ({ id: node.id, name: node.nodeName, planStart: node.plannedStartDate?.replaceAll('-', '/') || '-', planEnd: node.plannedEndDate?.replaceAll('-', '/') || '-', actualStart: node.actualStartDate?.replaceAll('-', '/') || '-', actualEnd: node.actualEndDate?.replaceAll('-', '/') || '-', status: getDictLabel('taskStatus', node.status), statusCode: node.status, progress: node.progressPercent || 0, isOverdue: node.status === 'OVERDUE' }))
    taskRows.value = taskResult.records.map(task => ({ id: task.id, name: task.name, owner: getUserName(task.assigneeId), priority: getDictLabel('taskPriority', task.priority), status: getDictLabel('taskStatus', task.status), planStart: task.plannedStartDate || '-', planEnd: task.plannedEndDate || '-', actualStart: task.actualStartDate || '-', actualEnd: task.actualEndDate || '-' }))
    bugRows.value = bugResult.records.map(bug => ({ id: bug.id, code: `BUG-${bug.id}`, title: bug.title, severity: getDictLabel('bugPriority', bug.priority), priorityCode: bug.priority, status: getDictLabel('bugStatus', bug.status), statusCode: bug.status, assignee: getUserName(bug.assigneeId), creator: getUserName(bug.creatorId) }))
    reportRows.value = reportResult.records.map(report => ({ id: report.id, title: report.title, type: getDictLabel('reportType', report.reportType), typeCode: report.reportType, status: getDictLabel('reportStatus', report.status), statusCode: report.status, planTime: report.plannedDate, actualTime: report.actualDate || '-', target: report.targetAudience, place: report.locationMethod, description: report.description }))
    documentRows.value = files.map(file => ({ id: file.id, name: file.originalName, type: file.originalName.split('.').pop()?.toUpperCase() || '-', size: formatFileSize(file.fileSize), version: file.versionNo || '-', uploader: getUserName(file.uploaderId), category: file.fileCategory || '-', uploadTime: file.uploadedAt || '-' }))
    await renderGantt()
  } catch (error) {
    message.error(error.message)
  } finally {
    detailLoading.value = false
    taskLoading.value = false
    bugLoading.value = false
    reportLoading.value = false
    documentLoading.value = false
  }
}

const renderGantt = async () => {
  if (viewMode.value !== 'detail' || activeTab.value !== 'gantt') return
  await nextTick()
  const ganttElement = detailTabsRef.value?.getGanttElement()
  if (!ganttElement) return
  ganttElement.innerHTML = ''
  if (!ganttTasks.value.length) return
  ganttInstance = new Gantt(ganttElement, ganttTasks.value, {
    view_mode: 'Month',
    readonly: true,
    language: 'zh',
    popup_on: 'hover',
    popup: ({ task, set_title, set_subtitle, set_details }) => {
      set_title('计划与实际时间')
      set_subtitle('')
      set_details(`<div class="gantt-popup__dates"><span>计划开始</span><strong>${task.planStart}</strong><span>实际开始</span><strong>${task.actualStart === '-' ? '未填写' : task.actualStart}</strong><span>计划结束</span><strong>${task.planEnd}</strong><span>实际结束</span><strong>${task.actualEnd === '-' ? '未填写' : task.actualEnd}</strong></div>`)
    },
    scroll_to: 'start',
  })
  const todayButton = ganttElement.querySelector('.today-button')
  if (todayButton) todayButton.textContent = '今天'
}

const syncQueryFromRoute = () => {
  if (viewMode.value !== 'list') return
  const status = route.query.status
  if (typeof status === 'string' && status) {
    query.status = status
    appliedQuery.status = status
    projectPagination.current = 1
  }
}

const syncRoute = async () => {
  if (viewMode.value === 'create') { Object.assign(formState, createDefaultForm()); editingId.value = null; return }
  if (viewMode.value === 'list') { syncQueryFromRoute(); await fetchProjects(); return }
  const projectId = route.params.id
  if (viewMode.value === 'edit') {
    detailLoading.value = true
    try {
      const [project, nodes] = await Promise.all([getProjectDetail(projectId), getGanttNodes(projectId)])
      Object.assign(formState, createDefaultForm(), mapProjectToForm(project))
      formState.nodes = nodes.map(n => n.nodeName)
      editingId.value = project.id
    } catch (error) {
      message.error(error.message)
    } finally {
      detailLoading.value = false
    }
  }
  if (viewMode.value === 'detail') { activeTab.value = 'gantt'; await fetchProjectRelatedData(projectId) }
}
watch(() => [route.name, route.params.id, route.query.status], syncRoute)
watch(activeTab, renderGantt)
watch(groupField, () => { collapsedGroups.value = [] })
onBeforeUnmount(() => { ganttInstance = null })
onMounted(async () => {
  await fetchReferenceData()
  await syncRoute()
})

const handleSearch = async () => { Object.assign(appliedQuery, query); projectPagination.current = 1; await fetchProjects() }
const handleReset = async () => { Object.assign(query, { keyword: '', managerId: '全部', type: '全部', contractStatus: '全部', stage: '全部', status: '全部' }); Object.assign(appliedQuery, query); projectPagination.current = 1; await fetchProjects() }
const handleProjectTableChange = async page => { projectPagination.current = page.current; projectPagination.pageSize = page.pageSize; await fetchProjects() }
const isGroupCollapsed = value => collapsedGroups.value.includes(value)
const handleToggleGroup = value => {
  collapsedGroups.value = isGroupCollapsed(value) ? collapsedGroups.value.filter(item => item !== value) : [...collapsedGroups.value, value]
}
const handleGanttRow = record => ({
  onClick: () => {
    Object.assign(ganttForm, {
      id: record.id,
      name: record.name,
      planStart: record.planStart === '-' ? undefined : record.planStart.replaceAll('/', '-'),
      planEnd: record.planEnd === '-' ? undefined : record.planEnd.replaceAll('/', '-'),
      actualStart: record.actualStart === '-' ? undefined : record.actualStart.replaceAll('/', '-'),
      actualEnd: record.actualEnd === '-' ? undefined : record.actualEnd.replaceAll('/', '-'),
      status: record.statusCode,
      progress: record.progress,
    })
    ganttEditVisible.value = true
  },
})
const handleSaveGanttNode = async () => {
  if (ganttSubmitLoading.value) return
  await ganttFormRef.value?.validate()
  ganttSubmitLoading.value = true
  try {
    await updateGanttNode(route.params.id, ganttForm.id, { nodeName: ganttForm.name, plannedStartDate: ganttForm.planStart, plannedEndDate: ganttForm.planEnd, actualStartDate: ganttForm.actualStart || null, actualEndDate: ganttForm.actualEnd || null, status: ganttForm.status, progressPercent: ganttForm.progress })
    ganttEditVisible.value = false
    await fetchProjectRelatedData(route.params.id)
    message.success('节点更新成功')
  } catch (error) {
    message.error(error.message)
  } finally {
    ganttSubmitLoading.value = false
  }
}
const handleCreate = () => router.push({ name: 'ManagementProjectCreate' })
const handleEdit = record => {
  router.push({ name: 'ManagementProjectEdit', params: { id: record.id } })
}
const handleDetail = record => router.push({ name: 'ManagementProjectDetail', params: { id: record.id } })
const handleBack = () => router.push({ name: 'ManagementProjects' })
const handleDelete = async record => {
  try {
    await deleteProject(record.id)
    message.success('项目删除成功')
    await fetchProjects()
  } catch (error) {
    message.error(error.message)
  }
}
const handleOpenUploadModal = () => {
  uploadVisible.value = true
}
const handleDocumentBeforeUpload = file => {
  if (file.size > 50 * 1024 * 1024) { message.warning('单个文件不能超过50MB'); return false }
  uploadFiles.value.push({ uid: file.uid, name: file.name, size: file.size, percent: 0, originFile: file })
  return false
}
const handleRemoveUploadFile = uid => { uploadFiles.value = uploadFiles.value.filter(file => file.uid !== uid) }
const formatFileSize = size => size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(size / 1024)}KB`
const handleStartUpload = async () => {
  if (!uploadFiles.value.length) { message.warning('请选择需要上传的文件'); return }
  uploadLoading.value = true
  try {
    for (const uploadFile of uploadFiles.value) {
      const data = new FormData()
      data.append('businessType', 'PROJECT')
      data.append('businessId', route.params.id)
      data.append('storageLocation', uploadForm.location)
      data.append('fileCategory', uploadForm.category)
      data.append('versionNo', uploadForm.description)
      data.append('file', uploadFile.originFile)
      await uploadProjectFile(data)
      uploadFile.percent = 100
    }
    message.success('文件上传成功')
    uploadVisible.value = false
    uploadFiles.value = []
    await fetchProjectRelatedData(route.params.id)
  } catch (error) {
    message.error(error.message)
  } finally { uploadLoading.value = false }
}
const handleDownloadDocument = async record => {
  try {
    const result = await downloadProjectFile(record.id)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(result.blob)
    link.download = result.fileName
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (error) {
    message.error(error.message)
  }
}
const handleDeleteDocument = async record => {
  try {
    await deleteProjectFile(record.id)
    documentRows.value = documentRows.value.filter(item => item.id !== record.id)
    message.success('文件删除成功')
  } catch (error) {
    message.error(error.message)
  }
}
const handleDeleteDocuments = async () => {
  if (!selectedDocumentIds.value.length) return
  try {
    await deleteProjectFiles(selectedDocumentIds.value)
    documentRows.value = documentRows.value.filter(item => !selectedDocumentIds.value.includes(item.id))
    selectedDocumentIds.value = []
    message.success('文件批量删除成功')
  } catch (error) {
    message.error(error.message)
  }
}
const handleCreateReport = () => {
  reportMode.value = 'create'
  editingReportId.value = null
  Object.assign(reportForm, createDefaultReportForm())
  reportVisible.value = true
}
const handleEditReport = record => {
  reportMode.value = 'edit'
  editingReportId.value = record.id
  Object.assign(reportForm, { title: record.title, type: record.typeCode, status: record.statusCode, planDate: dayjs(record.planTime), actualDate: record.actualTime === '-' ? undefined : dayjs(record.actualTime), task: undefined, target: record.target, place: record.place, description: record.description })
  reportVisible.value = true
}
const handleSubmitReport = async () => {
  if (reportSubmitLoading.value) return
  await reportFormRef.value?.validate()
  reportSubmitLoading.value = true
  try {
    const reportData = { projectId: route.params.id, title: reportForm.title, reportType: reportForm.type, status: reportForm.status, plannedDate: reportForm.planDate.format('YYYY-MM-DD'), actualDate: reportForm.actualDate?.format('YYYY-MM-DD') || null, targetAudience: reportForm.target, locationMethod: reportForm.place, description: reportForm.description }
    if (editingReportId.value) await updateProjectReport(editingReportId.value, reportData)
    else await createProjectReport(reportData)
    message.success(editingReportId.value ? '汇报编辑成功' : '汇报新建成功')
    reportVisible.value = false
    await fetchProjectRelatedData(route.params.id)
  } catch (error) {
    message.error(error.message)
  } finally { reportSubmitLoading.value = false }
}
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
      status: formState.status,
      contractStatus: formState.contractStatus,
      managerId: formState.managerId,
      businessDepartment: formState.department,
      contractorUnit: formState.contractor,
      businessSupervisor: formState.supervisor,
      receivableAmount: formState.amount,
      description: formState.description,
    }
    if (editingId.value) {
      projectData.nodeNames = formState.nodes
    } else if (formState.nodes.length) {
      projectData.nodes = formState.nodes.map(name => ({ nodeName: name }))
    }
    const savedProject = editingId.value
      ? await updateProject(editingId.value, projectData)
      : await createProject(projectData)
    message.success(editingId.value ? '项目编辑成功' : '项目新建成功')
    router.push({ name: 'ManagementProjectDetail', params: { id: savedProject.id || editingId.value } })
  } catch (error) {
    message.error(error.message)
  } finally { submitLoading.value = false }
}
</script>

<style scoped>
.project-page { height: 100%; min-width: 0; overflow-x: hidden; overflow-y: auto; color: #262626; }
.project-filter, .project-list, .project-form-card { border: 1px solid #edf0f3; box-shadow: 0 2px 8px rgb(0 0 0 / 3%); }
.project-filter { margin-bottom: 16px; }
.project-filter :deep(.ant-card-body) { padding: 16px 18px 2px; }
.project-filter__form { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: 26px; }
.project-filter__form :deep(.ant-form-item) { margin: 0 0 14px; }
.project-filter__form :deep(.ant-form-item-row) { width: 100%; flex-wrap: nowrap; }
.project-filter__form :deep(.ant-form-item-label) { flex: 0 0 80px; width: 80px; text-align: right; }
.project-filter__form :deep(.ant-form-item-control), .project-filter__form :deep(.ant-input), .project-filter__form :deep(.ant-select) { width: 100%; }
.project-filter__actions { justify-self: end; }
.project-list :deep(.ant-card-body) { padding: 18px; }
.project-list__toolbar, .section-heading, .document-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.project-list__display { display: flex; align-items: center; gap: 12px; color: #666; }
.project-list__display :deep(.ant-select) { width: 130px; }
.project-list :deep(.ant-table-cell) { white-space: nowrap; }
.project-group-list { max-height: 520px; overflow-y: auto; }
.project-group + .project-group { margin-top: 8px; }
.project-group__header { display: flex; align-items: center; justify-content: space-between; height: 40px; padding: 0 14px; font-weight: 600; background: #fafafa; border-top: 1px solid #edf0f3; border-bottom: 1px solid #edf0f3; }
.project-group__header button { display: inline-flex; gap: 8px; align-items: center; padding: 0; font-weight: 600; background: transparent; border: 0; cursor: pointer; }
.table-link { height: auto; padding: 0; }
.project-form-card { width: min(1100px, 100%); margin: 0 auto; }
.project-form-card :deep(.ant-card-body) { padding: 24px 50px 30px; }
.project-form-card h2 { margin: 0 0 24px; font-size: 18px; }
.project-form-card :deep(.ant-form-item) { margin-bottom: 28px; }
.project-form-card :deep(.ant-input-number) { width: 100%; }
.project-form-card :deep(.ant-checkbox-group) { display: flex; flex-wrap: wrap; gap: 10px 18px; }
.form-actions { display: flex; justify-content: flex-end; gap: 20px; }
.form-actions .ant-btn { width: 120px; }
.project-detail { min-height: 100%; }
.project-detail__heading { display: flex; align-items: center; gap: 16px; margin-bottom: 6px; }
.project-detail__heading :deep(.ant-tag) { padding: 6px 14px; font-size: 16px; }
.project-tabs { display: flex; gap: 44px; height: 44px; padding-left: 8px; }
.project-tabs button { display: inline-flex; align-items: center; gap: 7px; height: 44px; padding: 0 7px; background: transparent; border: 0; border-bottom: 3px solid transparent; cursor: pointer; }
.project-tabs button.active { color: #1677ff; border-bottom-color: #1677ff; }
.project-detail__layout { min-height: 530px; }
.project-detail__main { min-width: 0; overflow: hidden; background: #fff; }
.detail-panel { min-height: 530px; padding: 14px; overflow: auto; }
.detail-panel h3 { margin: 0 0 12px; }
.gantt-panel { padding: 12px; }
.project-stat-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
.project-stat-row .semantic-card { display: flex; gap: 12px; align-items: center; width: 100%; height: 86px; padding: 14px 15px; text-align: left; border: 1px solid rgb(0 0 0 / 5%); border-radius: 16px; box-shadow: 0 4px 16px rgb(0 0 0 / 5%); transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.28s ease; }
.project-stat-row .semantic-card:hover { box-shadow: 0 14px 28px rgb(0 0 0 / 10%); transform: translateY(-4px); }
.gantt-progress { color: #0066cc; background: linear-gradient(135deg, #fff 0%, #edf6ff 100%); }
.gantt-workspace { display: grid; min-height: 430px; overflow: hidden; border: 1px solid #edf0f3; }
.gantt-node-table { width: 100%; border-right: 1px solid #edf0f3; }
.gantt-node-table :deep(.ant-table-thead > tr > th) { height: 85px; padding: 8px 6px; text-align: center; white-space: nowrap; }
.gantt-node-table :deep(.ant-table-tbody > tr > td) { height: 48px; padding: 7px 6px; text-align: center; white-space: nowrap; }
.gantt-node-table :deep(.ant-table-tbody > tr) { cursor: pointer; }
.gantt-node-table :deep(.ant-table-tbody > tr:hover > td) { background: #edf6ff; }
.gantt-node-table :deep(.ant-progress) { min-width: 76px; }
.gantt-edit-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
.gantt-edit-actions .ant-btn { min-width: 88px; }
.date-overdue { color: #ff4d4f; }
.gantt-scroll { width: 100%; min-width: 0; min-height: 430px; overflow: hidden; }
.gantt-scroll :deep(.gantt-container) { overflow-x: auto; overflow-y: hidden; border-radius: 0; }
.gantt-scroll :deep(.popup-wrapper) { padding: 14px 16px; border: 1px solid rgb(0 0 0 / 6%); border-radius: 12px; box-shadow: 0 12px 32px rgb(0 0 0 / 14%); }
.gantt-scroll :deep(.popup-wrapper .title) { margin-bottom: 10px; font-size: 14px; }
.gantt-scroll :deep(.gantt-popup__dates) { display: grid; grid-template-columns: 64px 92px; gap: 7px 14px; align-items: center; font-size: 12px; }
.gantt-scroll :deep(.gantt-popup__dates span) { color: #86868b; }
.gantt-scroll :deep(.gantt-popup__dates strong) { color: #1d1d1f; font-weight: 500; }
.gantt-scroll :deep(.bar-wrapper) { cursor: default; }
.gantt-scroll :deep(.gantt-not-started .bar), .gantt-scroll :deep(.gantt-not-started .bar-progress) { fill: #aeaeb2; stroke: #aeaeb2; }
.gantt-scroll :deep(.gantt-in-progress .bar) { fill: #d6eaff; stroke: #0a84ff; }.gantt-scroll :deep(.gantt-in-progress .bar-progress) { fill: #0a84ff; }
.gantt-scroll :deep(.gantt-due-soon .bar), .gantt-scroll :deep(.gantt-due-soon .bar-progress) { fill: #ffd60a; stroke: #d6a600; }
.gantt-scroll :deep(.gantt-completed .bar), .gantt-scroll :deep(.gantt-completed .bar-progress) { fill: #30d158; stroke: #248a3d; }
.gantt-scroll :deep(.gantt-overdue .bar), .gantt-scroll :deep(.gantt-overdue .bar-progress) { fill: #ff453a; stroke: #d70015; }
.gantt-scroll :deep(.gantt-milestone .bar), .gantt-scroll :deep(.gantt-milestone .bar-progress) { fill: #30d158; stroke: #248a3d; }
.gantt-scroll :deep(.gantt-completed .bar-label), .gantt-scroll :deep(.gantt-overdue .bar-label), .gantt-scroll :deep(.gantt-in-progress .bar-label) { fill: #fff; }
.gantt-scroll :deep(.gantt-due-soon .bar-label), .gantt-scroll :deep(.gantt-not-started .bar-label) { fill: #1d1d1f; }
.gantt-scroll :deep(.gantt-milestone .bar-label) { fill: #fff; }
.risk-grid, .bug-summary, .document-categories { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 22px; }
.risk-grid .semantic-card, .bug-summary .semantic-card { display: flex; gap: 12px; align-items: center; width: 100%; height: 86px; padding: 14px 15px; text-align: left; border: 1px solid rgb(0 0 0 / 5%); border-radius: 16px; box-shadow: 0 4px 16px rgb(0 0 0 / 5%); transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.28s ease; }
.risk-grid .semantic-card:hover, .bug-summary .semantic-card:hover { box-shadow: 0 14px 28px rgb(0 0 0 / 10%); transform: translateY(-4px); }
.semantic-card__icon { display: inline-flex; flex: 0 0 36px; align-items: center; justify-content: center; width: 36px; height: 36px; font-size: 20px; background: rgb(255 255 255 / 78%); border-radius: 11px; box-shadow: 0 4px 12px rgb(0 0 0 / 6%); }
.semantic-card__content { min-width: 0; }.semantic-card__content > span, .semantic-card__content strong, .semantic-card__content small { display: block; }.semantic-card__content > span { color: #6e6e73; font-size: 13px; }.semantic-card__content strong { margin: 3px 0; color: #1d1d1f; font-size: 19px; }.semantic-card__content small { overflow: hidden; color: #86868b; text-overflow: ellipsis; white-space: nowrap; }
.risk-high, .bug-severe { color: #d70015; background: linear-gradient(135deg, #fff 0%, #fff0f1 100%); }.risk-medium, .bug-submitted { color: #c93400; background: linear-gradient(135deg, #fff 0%, #fff5e8 100%); }.risk-due, .bug-confirmed { color: #0066cc; background: linear-gradient(135deg, #fff 0%, #edf6ff 100%); }.risk-normal, .bug-closed { color: #248a3d; background: linear-gradient(135deg, #fff 0%, #eefbf2 100%); }
.section-heading h2, .section-heading h3 { margin: 0; }.section-heading small { color: #8c8c8c; font-weight: 400; }
.report-filter { margin-bottom: 18px; }.report-filter :deep(.ant-input) { width: 280px; }
.document-toolbar :deep(.ant-input-group-wrapper) { width: 300px; }
.document-categories { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.document-categories button { display: grid; grid-template-columns: 42px 1fr; padding: 15px; color: #1d1d1f; text-align: left; background: #fff; border: 1px solid rgb(0 0 0 / 5%); border-radius: 16px; box-shadow: 0 4px 16px rgb(0 0 0 / 5%); cursor: pointer; transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.28s ease; }
.document-categories button:hover { box-shadow: 0 14px 28px rgb(0 0 0 / 10%); transform: translateY(-4px); }
.document-categories button:first-child { border-color: #1677ff; }.document-category__icon { display: inline-flex; grid-row: 1 / 3; align-self: center; align-items: center; justify-content: center; width: 36px; height: 36px; font-size: 20px; border-radius: 11px; }.document-categories strong { font-size: 17px; }
.category-all { background: linear-gradient(135deg, #fff 0%, #edf6ff 100%); }.category-all .document-category__icon { color: #0066cc; background: #e5f2ff; }
.category-contract { background: linear-gradient(135deg, #fff 0%, #eefbf2 100%); }.category-contract .document-category__icon { color: #248a3d; background: #e5f8eb; }
.category-requirement { background: linear-gradient(135deg, #fff 0%, #fff5e8 100%); }.category-requirement .document-category__icon { color: #c93400; background: #ffecd6; }
.category-design { background: linear-gradient(135deg, #fff 0%, #f5efff 100%); }.category-design .document-category__icon { color: #7d3fc1; background: #eee2ff; }
.category-development { background: linear-gradient(135deg, #fff 0%, #fff7e8 100%); }.category-development .document-category__icon { color: #b25d00; background: #ffedcf; }
.category-acceptance { background: linear-gradient(135deg, #fff 0%, #eafbf7 100%); }.category-acceptance .document-category__icon { color: #00856a; background: #dff8f1; }
.project-summary { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; margin: 12px 0 14px; padding: 16px 18px; background: #fff; border-radius: 8px; }
.project-summary__progress { padding-left: 20px; border-left: 1px solid #edf0f3; }
.project-summary__title { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.project-summary__title h3 { display: flex; gap: 7px; align-items: center; margin: 0; }
.project-summary__title span { color: #595959; font-size: 13px; }
.project-summary__bar { display: grid; grid-template-columns: minmax(0, 1fr) 58px; gap: 12px; align-items: center; margin-top: 12px; }
.project-summary__bar strong { color: #52c41a; font-size: 20px; text-align: right; }
.summary-metrics { display: grid; grid-template-columns: repeat(2, 80px); margin-top: 10px; text-align: center; }
.summary-metrics strong, .summary-metrics span { display: block; }.summary-metrics strong { color: #1677ff; font-size: 20px; }.summary-metrics span { color: #8c8c8c; font-size: 12px; }.danger { color: #ff4d4f !important; }.warning { color: #fa8c16 !important; }.success { color: #52c41a !important; }
.project-summary dl { display: grid; grid-template-columns: repeat(4, max-content minmax(90px, 1fr)); gap: 14px 10px; align-content: center; margin: 0; }.project-summary dt, .project-summary dd { margin: 0; }.project-summary dt { color: #595959; }.project-summary dd { overflow-wrap: anywhere; }
.document-upload-modal :deep(.ant-modal-body) { padding-top: 8px; }
.document-upload-modal :deep(.ant-upload-drag) { padding: 18px; border: 2px dashed #91caff; background: #fbfdff; }
.upload-drag-icon { margin: 0 !important; color: #1677ff; font-size: 48px; }
.upload-drag-title { margin: 8px 0 4px !important; font-size: 17px; font-weight: 500; }.upload-drag-title span { color: #1677ff; }
.upload-drag-hint { margin: 2px 0 !important; color: #8c8c8c; }
.upload-list-title { margin: 18px 0 10px; }
.upload-file-list { min-height: 70px; padding-bottom: 14px; border-bottom: 1px solid #edf0f3; }
.upload-file-item { display: grid; grid-template-columns: 28px minmax(180px, 1fr) 72px 160px 48px 46px; gap: 10px; align-items: center; min-height: 42px; }
.upload-file-item__icon { color: #1677ff; font-size: 22px; }.upload-file-item__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.upload-file-item__success { color: #52c41a; }
.upload-form { margin-top: 18px; }.upload-form__row { display: block; }.upload-form :deep(.ant-form-item) { margin-bottom: 18px; }.upload-form :deep(.ant-select) { width: 100%; }
.upload-modal-actions { display: flex; justify-content: flex-end; gap: 16px; }.upload-modal-actions .ant-btn { width: 118px; }
.report-modal :deep(.ant-modal-body) { padding-top: 12px; }.report-modal :deep(.ant-form-item) { margin-bottom: 20px; }.report-modal :deep(.ant-picker), .report-modal :deep(.ant-select) { width: 100%; }.report-modal__actions { display: flex; justify-content: flex-end; gap: 10px; }.report-modal__actions .ant-btn { min-width: 80px; }
@media (max-width: 1280px) { .project-filter__form { grid-template-columns: repeat(2, minmax(0, 1fr)); }.project-tabs { gap: 20px; }.project-summary { grid-template-columns: 1fr; }.project-summary__progress { padding: 16px 0 0; border-top: 1px solid #edf0f3; border-left: 0; }.project-summary dl { grid-template-columns: repeat(2, max-content minmax(120px, 1fr)); } }
</style>
