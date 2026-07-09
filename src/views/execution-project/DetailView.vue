<template>
  <div class="execution-detail">
    <div class="execution-detail__heading">
      <a-button @click="handleBack"><ArrowLeftOutlined />返回</a-button>
      <a-tag color="processing">{{ currentProject?.status || '-' }}</a-tag>
    </div>

    <section class="execution-summary">
      <dl>
        <template v-for="item in summaryItems" :key="item.label">
          <dt>{{ item.label }}：</dt>
          <dd>
            <a-tag v-if="item.tag" :color="item.color">{{ item.value }}</a-tag>
            <template v-else>{{ item.value }}</template>
          </dd>
        </template>
      </dl>
      <div class="execution-summary__progress">
        <div class="execution-summary__title">
          <h3><ProjectOutlined />项目进度</h3>
          <span>根据项目进度权重计算</span>
        </div>
        <div class="execution-summary__bar">
          <a-progress :percent="ganttSummaryData.overallProgress" :show-info="false" stroke-color="#52c41a" />
          <strong>{{ ganttSummaryData.overallProgress }}%</strong>
        </div>
        <div class="summary-metrics">
          <div><strong>{{ taskRows.length }}</strong><span>关联任务</span></div>
          <div><strong class="danger">{{ bugRows.length }}</strong><span>关联Bug</span></div>
        </div>
      </div>
    </section>

    <section class="execution-detail-card">
      <div class="execution-tabs">
        <button v-for="tab in detailTabs" :key="tab.key" type="button" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
          <component :is="tab.icon" />{{ tab.label }}
        </button>
      </div>

      <div v-show="activeTab === 'gantt'" class="execution-tab-panel gantt-panel">
        <div class="execution-stat-row">
          <div v-for="item in ganttSummary" :key="item.label" class="semantic-card" :class="item.class">
            <span class="semantic-card__icon"><component :is="item.icon" /></span>
            <span class="semantic-card__content"><span>{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ item.desc }}</small></span>
          </div>
        </div>
        <div class="gantt-workspace" :style="{ gridTemplateColumns: `${ganttTableWidth}px minmax(0, 1fr)` }">
          <a-table class="gantt-node-table" row-key="id" :columns="ganttNodeColumns" :data-source="ganttNodeRows" :loading="detailLoading" :pagination="false" :custom-row="handleGanttRow" size="small" table-layout="fixed">
            <template #bodyCell="{ column, record, text }">
              <template v-if="column.dataIndex === 'status'"><a-tag :color="ganttStatusColors[text]">{{ text }}</a-tag></template>
              <template v-else-if="column.dataIndex === 'progress'"><a-progress :percent="text" size="small" /></template>
              <template v-else-if="column.dataIndex === 'actualEnd'"><span :class="{ 'date-overdue': record.isOverdue }">{{ text }}</span></template>
            </template>
          </a-table>
          <div ref="ganttRef" class="gantt-scroll"></div>
        </div>
      </div>

      <div v-show="activeTab === 'tasks'" class="execution-tab-panel">
        <div class="panel-title"><WarningOutlined />全局风险预警</div>
        <div class="risk-grid">
          <div v-for="risk in risks" :key="risk.label" class="semantic-card" :class="risk.class">
            <span class="semantic-card__icon"><component :is="risk.icon" /></span>
            <span class="semantic-card__content"><span>{{ risk.label }}</span><strong>{{ risk.value }}</strong><small>{{ risk.desc }}</small></span>
          </div>
        </div>
        <div class="section-heading">
          <h3><ProfileOutlined />任务列表</h3>
          <a-space><a-select value="全部状态" :options="taskStatusFilters" /><a-select value="全部负责人" :options="personFilterOptions" /></a-space>
        </div>
        <a-table row-key="id" :columns="taskColumns" :data-source="taskRows" :loading="taskLoading" :pagination="pagination" size="small" :scroll="{ x: 950 }">
          <template #bodyCell="{ column, text }">
            <a-tag v-if="column.dataIndex === 'priority'" color="red">{{ text }}</a-tag>
            <a-tag v-else-if="column.dataIndex === 'status'" color="processing">{{ text }}</a-tag>
          </template>
        </a-table>
      </div>

      <div v-show="activeTab === 'bugs'" class="execution-tab-panel">
        <div class="panel-title"><BugOutlined />BUG 总览</div>
        <div class="bug-summary">
          <div v-for="item in bugSummary" :key="item.label" class="semantic-card" :class="item.class">
            <span class="semantic-card__icon"><component :is="item.icon" /></span>
            <span class="semantic-card__content"><span>{{ item.label }}</span><strong>{{ item.value }} 个</strong></span>
          </div>
        </div>
        <div class="section-heading">
          <h3><BugOutlined />Bug 列表 <small>（共 {{ bugRows.length }} 个）</small></h3>
          <a-space><a-select value="全部状态" :options="bugStatusFilters" /><a-select value="全部指定人" :options="personFilterOptions" /></a-space>
        </div>
        <a-table row-key="id" :columns="bugColumns" :data-source="bugRows" :loading="bugLoading" :pagination="pagination" size="small" :scroll="{ x: 900 }">
          <template #bodyCell="{ column, text }">
            <a-tag v-if="column.dataIndex === 'severity'" color="red">{{ text }}</a-tag>
            <a-tag v-else-if="column.dataIndex === 'status'" color="orange">{{ text }}</a-tag>
          </template>
        </a-table>
      </div>

      <div v-show="activeTab === 'reports'" class="execution-tab-panel">
        <div class="section-heading">
          <h2>汇报管理 <small>（共 {{ reportRows.length }} 条）</small></h2>
          <a-button type="primary"><PlusOutlined />新建汇报</a-button>
        </div>
        <a-form class="report-filter" layout="inline">
          <a-form-item><a-input placeholder="搜索汇报标题 / 汇报对象 / 地点/方式 / 描述" /></a-form-item>
          <a-form-item label="状态"><a-select value="全部" :options="reportStatusFilters" /></a-form-item>
          <a-form-item label="计划时间"><a-range-picker /></a-form-item>
          <a-button>重置</a-button>
        </a-form>
        <a-table row-key="id" :columns="reportColumns" :data-source="reportRows" :loading="reportLoading" :pagination="pagination" :scroll="{ x: 900 }">
          <template #bodyCell="{ column, text }">
            <a-button v-if="column.dataIndex === 'title'" type="link">{{ text }}</a-button>
            <a-tag v-else-if="column.dataIndex === 'status'" color="green">{{ text }}</a-tag>
          </template>
        </a-table>
      </div>

      <div v-show="activeTab === 'documents'" class="execution-tab-panel">
        <div class="document-toolbar">
          <a-space>
            <a-button type="primary" @click="handleOpenUploadModal"><UploadOutlined />上传文件</a-button>
            <a-button><DownloadOutlined />批量下载</a-button>
            <a-popconfirm title="确定删除选中的文件吗？" @confirm="handleDeleteDocuments"><a-button danger :disabled="selectedDocumentIds.length === 0"><DeleteOutlined />批量删除</a-button></a-popconfirm>
          </a-space>
          <a-input-search placeholder="搜索文件名、上传人、分类..." />
        </div>
        <h3>分类导航</h3>
        <div class="document-categories">
          <button v-for="item in documentCategories" :key="item.label" type="button" :class="item.class">
            <span class="document-category__icon"><component :is="item.icon" /></span>
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </button>
        </div>
        <a-table row-key="id" :row-selection="documentRowSelection" :columns="documentColumns" :data-source="documentRows" :loading="documentLoading" :pagination="false">
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'operation'">
              <a-space>
                <a-button type="link" size="small" @click="handleDownloadDocument(record)">下载</a-button>
                <a-popconfirm title="确定删除该文件吗？" @confirm="handleDeleteDocument(record)"><a-button type="link" size="small" danger>删除</a-button></a-popconfirm>
              </a-space>
            </template>
          </template>
        </a-table>
      </div>
    </section>

    <a-modal v-model:open="uploadVisible" class="document-upload-modal" title="上传文件" :width="760" :footer="null" destroy-on-close>
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
import {
  ArrowLeftOutlined,
  BugOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  FileOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  FireOutlined,
  FlagOutlined,
  FolderOpenOutlined,
  InboxOutlined,
  PlusOutlined,
  ProfileOutlined,
  ProjectOutlined,
  SendOutlined,
  SnippetsOutlined,
  ToolOutlined,
  UploadOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import Gantt from 'frappe-gantt'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  deleteProjectFile,
  deleteProjectFiles,
  downloadProjectFile,
  getDicts,
  getGanttNodes,
  getGanttSummary,
  getProjectBugs,
  getProjectDetail,
  getProjectFiles,
  getProjectReports,
  getProjectTasks,
  getSystemUsers,
  updateGanttNode,
  uploadProjectFile,
} from '@/api/managementProject'

const route = useRoute()
const router = useRouter()
const activeTab = ref('gantt')
const ganttRef = ref()
const currentProject = ref(null)
const detailLoading = ref(false)
const taskLoading = ref(false)
const bugLoading = ref(false)
const reportLoading = ref(false)
const documentLoading = ref(false)
const selectedDocumentIds = ref([])
const uploadVisible = ref(false)
const uploadLoading = ref(false)
const ganttEditVisible = ref(false)
const ganttSubmitLoading = ref(false)
const uploadFiles = ref([])
const managerOptions = ref([])
const taskStatusOptions = ref([])
const dictLabels = reactive({})
let ganttInstance

const toOptions = values => values.map(value => ({ label: value, value }))
const detailTabs = [
  { key: 'gantt', label: '项目甘特图', icon: ProjectOutlined },
  { key: 'tasks', label: '任务列表', icon: ProfileOutlined },
  { key: 'bugs', label: 'Bug列表', icon: BugOutlined },
  { key: 'reports', label: '项目汇报', icon: FlagOutlined },
  { key: 'documents', label: '文档中心', icon: FolderOpenOutlined },
]
const ganttSummaryData = reactive({ total: 0, completed: 0, overdue: 0, dueSoon: 0, overallProgress: 0 })
const ganttSummary = computed(() => [
  { label: '项目状态', value: currentProject.value?.status || '-', desc: `整体进度 ${ganttSummaryData.overallProgress}%`, class: 'gantt-progress', icon: ProjectOutlined },
  { label: '延期任务', value: `${ganttSummaryData.overdue} 个`, desc: '需重点关注', class: 'risk-high', icon: WarningOutlined },
  { label: '即将到期', value: `${ganttSummaryData.dueSoon} 个`, desc: '未来 3 天内到期', class: 'risk-due', icon: ClockCircleOutlined },
])
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
  { title: '节点名称', dataIndex: 'name', width: 160 },
  { title: '计划开始', dataIndex: 'planStart', width: 120 },
  { title: '计划结束', dataIndex: 'planEnd', width: 120 },
  { title: '实际开始', dataIndex: 'actualStart', width: 120 },
  { title: '实际结束', dataIndex: 'actualEnd', width: 120 },
  { title: '状态', dataIndex: 'status', width: 90 },
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
const ganttFormRef = ref()
const ganttForm = reactive({ id: null, name: '', planStart: undefined, planEnd: undefined, actualStart: undefined, actualEnd: undefined, status: undefined, progress: 0 })
const ganttFormRules = {
  planStart: [{ required: true, message: '请选择计划开始日期', trigger: 'change' }],
  planEnd: [
    { required: true, message: '请选择计划结束日期', trigger: 'change' },
    {
      validator: (_, value) => !value || !ganttForm.planStart || !dayjs(value).isBefore(dayjs(ganttForm.planStart)) ? Promise.resolve() : Promise.reject(new Error('计划结束日期不能早于计划开始日期')),
      trigger: 'change',
    },
  ],
  status: [{ required: true, message: '请选择节点状态', trigger: 'change' }],
  progress: [{ required: true, message: '请输入节点进度', trigger: 'change' }],
}

const risks = computed(() => [
  { label: '高风险任务', value: `${taskRows.value.filter(item => item.priorityCode === 'HIGH').length} 个`, desc: '延期 ≥ 3 天', class: 'risk-high', icon: FireOutlined },
  { label: '中风险任务', value: `${taskRows.value.filter(item => item.priorityCode === 'MEDIUM').length} 个`, desc: '延期 1 - 2 天', class: 'risk-medium', icon: WarningOutlined },
  { label: '即将到期', value: `${ganttSummaryData.dueSoon} 个`, desc: '未来 3 天内到期', class: 'risk-due', icon: ClockCircleOutlined },
  { label: '按计划进行', value: `${Math.max(taskRows.value.length - ganttSummaryData.overdue, 0)} 个`, desc: '无延期风险', class: 'risk-normal', icon: CheckCircleOutlined },
])
const taskColumns = [{ title: '序号', dataIndex: 'id', width: 60 }, { title: '任务名称', dataIndex: 'name', width: 180 }, { title: '负责人', dataIndex: 'owner', width: 90 }, { title: '优先级', dataIndex: 'priority', width: 80 }, { title: '状态', dataIndex: 'status', width: 90 }, { title: '计划开始', dataIndex: 'planStart', width: 110 }, { title: '计划结束', dataIndex: 'planEnd', width: 110 }, { title: '实际开始', dataIndex: 'actualStart', width: 110 }, { title: '实际结束', dataIndex: 'actualEnd', width: 110 }]
const taskRows = ref([])
const taskStatusFilters = toOptions(['全部状态', '未开始', '进行中', '已完成'])
const personFilterOptions = toOptions(['全部负责人', '全部指定人', '张三', '李四', '王五'])
const bugSummary = computed(() => [{ label: '严重', value: bugRows.value.filter(item => item.priorityCode === 'URGENT' || item.severity === '严重').length, class: 'bug-severe', icon: ExclamationCircleOutlined }, { label: '已提交', value: bugRows.value.filter(item => item.statusCode === 'PENDING_FIX').length, class: 'bug-submitted', icon: SendOutlined }, { label: '已确认', value: bugRows.value.filter(item => item.statusCode === 'FIXING').length, class: 'bug-confirmed', icon: ToolOutlined }, { label: '已关闭', value: bugRows.value.filter(item => item.statusCode === 'CLOSED').length, class: 'bug-closed', icon: CheckCircleOutlined }])
const bugColumns = [{ title: '序号', dataIndex: 'id', width: 60 }, { title: 'BUG ID', dataIndex: 'code', width: 130 }, { title: '标题', dataIndex: 'title', width: 220 }, { title: '严重级别', dataIndex: 'severity', width: 100 }, { title: '状态', dataIndex: 'status', width: 100 }, { title: '指定人', dataIndex: 'assignee', width: 90 }, { title: '创建人', dataIndex: 'creator', width: 90 }]
const bugRows = ref([])
const bugStatusFilters = toOptions(['全部状态', '待处理', '修复中', '已完成'])
const reportStatusFilters = toOptions(['全部', '准备中', '进行中', '已完成'])
const reportColumns = [{ title: '汇报标题', dataIndex: 'title', width: 220 }, { title: '汇报类型', dataIndex: 'type', width: 110 }, { title: '状态', dataIndex: 'status', width: 100 }, { title: '计划时间', dataIndex: 'planTime', width: 150 }, { title: '实际时间', dataIndex: 'actualTime', width: 150 }, { title: '汇报对象', dataIndex: 'target', width: 110 }, { title: '地点/方式', dataIndex: 'place', width: 120 }]
const reportRows = ref([])
const documentCategories = computed(() => [{ label: '全部', value: documentRows.value.length, class: 'category-all', icon: FolderOpenOutlined }, ...['合同类', '需求类', '设计类', '开发类', '验收类'].map((label, index) => ({ label, value: documentRows.value.filter(item => item.category === label).length, class: ['category-contract', 'category-requirement', 'category-design', 'category-development', 'category-acceptance'][index], icon: [FileProtectOutlined, FileTextOutlined, SnippetsOutlined, CodeOutlined, FileDoneOutlined][index] }))])
const documentColumns = [{ title: '文件名', dataIndex: 'name' }, { title: '类型', dataIndex: 'type', width: 90 }, { title: '大小', dataIndex: 'size', width: 90 }, { title: '版本', dataIndex: 'version', width: 80 }, { title: '上传人', dataIndex: 'uploader', width: 80 }, { title: '分类', dataIndex: 'category', width: 90 }, { title: '上传时间', dataIndex: 'uploadTime', width: 130 }, { title: '操作', dataIndex: 'operation', width: 120 }]
const documentRows = ref([])
const documentRowSelection = computed(() => ({
  selectedRowKeys: selectedDocumentIds.value,
  onChange: keys => { selectedDocumentIds.value = keys },
}))
const pagination = { pageSize: 5, showSizeChanger: false }
const uploadForm = reactive({ location: '项目文档库', category: '需求类', description: '' })
const storageOptions = toOptions(['项目文档库', '公共文档库'])
const documentCategoryOptions = toOptions(['合同类', '需求类', '设计类', '开发类', '验收类'])
const summaryItems = computed(() => [{ label: '项目名称', value: currentProject.value?.name || '-' }, { label: '项目类型', value: '执行类项目' }, { label: '项目经理', value: currentProject.value?.manager || '-' }, { label: '项目阶段', value: currentProject.value?.stage || '-' }, { label: '项目状态', value: currentProject.value?.status || '-', tag: true, color: 'processing' }, { label: '计划开始', value: currentProject.value?.plannedStartDate || '-' }, { label: '计划结束', value: currentProject.value?.plannedEndDate || '-' }, { label: '项目描述', value: currentProject.value?.description || '-' }])
const demoProjectId = 'demo-execution-project'

const getDictLabel = (type, value) => dictLabels[type]?.[value] || value || '-'
const getUserName = id => managerOptions.value.find(item => item.value === id)?.label || (id ? `用户 ${id}` : '-')
const mapProject = project => ({ ...project, manager: getUserName(project.managerId), status: getDictLabel('projectStatus', project.status), statusCode: project.status })
const handleBack = () => router.push({ name: 'ExecutionProjects' })
const formatFileSize = size => size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil((size || 0) / 1024)}KB`
const isDemoProject = () => route.params.id === demoProjectId
const formatNodeDate = value => value === '-' ? undefined : value?.replaceAll('/', '-')
const getStatusLabel = value => ganttStatusOptions.value.find(item => item.value === value)?.label || getDictLabel('taskStatus', value)

const applyDemoProjectData = async () => {
  currentProject.value = {
    id: demoProjectId,
    name: '执行类项目演示数据',
    manager: '张三',
    stage: '开发',
    status: '进行中',
    statusCode: 'IN_PROGRESS',
    plannedStartDate: '2025-05-01',
    plannedEndDate: '2025-12-31',
    description: '用于演示执行类项目详情页的本地数据。',
  }
  Object.assign(ganttSummaryData, { total: 7, completed: 2, overdue: 2, dueSoon: 3, overallProgress: 45 })
  ganttNodeRows.value = [
    { id: 1, name: '项目立项', planStart: '2025/05/01', planEnd: '2025/05/10', actualStart: '2025/05/01', actualEnd: '2025/05/08', status: '已完成', statusCode: 'COMPLETED', progress: 100 },
    { id: 2, name: '需求分析', planStart: '2025/05/11', planEnd: '2025/05/31', actualStart: '2025/05/12', actualEnd: '2025/05/29', status: '已完成', statusCode: 'COMPLETED', progress: 100 },
    { id: 3, name: 'UI设计', planStart: '2025/06/01', planEnd: '2025/06/20', actualStart: '2025/06/02', actualEnd: '2025/06/18', status: '进行中', statusCode: 'IN_PROGRESS', progress: 75 },
    { id: 4, name: '开发阶段', planStart: '2025/06/21', planEnd: '2025/09/15', actualStart: '2025/06/21', actualEnd: '-', status: '进行中', statusCode: 'IN_PROGRESS', progress: 45 },
    { id: 5, name: '测试阶段', planStart: '2025/09/16', planEnd: '2025/10/15', actualStart: '-', actualEnd: '-', status: '未开始', statusCode: 'NOT_STARTED', progress: 0 },
    { id: 6, name: '上线试运行', planStart: '2025/10/16', planEnd: '2025/11/15', actualStart: '-', actualEnd: '-', status: '未开始', statusCode: 'NOT_STARTED', progress: 0 },
    { id: 7, name: '验收', planStart: '2025/11/16', planEnd: '2025/12/31', actualStart: '-', actualEnd: '-', status: '未开始', statusCode: 'NOT_STARTED', progress: 0 },
  ]
  taskRows.value = [
    { id: 1, name: '用户权限系统设计', owner: '张三', priority: '高', priorityCode: 'HIGH', status: '进行中', planStart: '06/01', planEnd: '06/10', actualStart: '06/01', actualEnd: '06/14' },
    { id: 2, name: '数据模型设计', owner: '李四', priority: '高', priorityCode: 'HIGH', status: '进行中', planStart: '06/05', planEnd: '06/15', actualStart: '06/05', actualEnd: '06/19' },
    { id: 3, name: '接口联调', owner: '王五', priority: '中', priorityCode: 'MEDIUM', status: '进行中', planStart: '06/08', planEnd: '06/18', actualStart: '06/08', actualEnd: '06/22' },
    { id: 4, name: '页面开发', owner: '赵六', priority: '中', priorityCode: 'MEDIUM', status: '进行中', planStart: '05/20', planEnd: '06/05', actualStart: '05/21', actualEnd: '06/07' },
    { id: 5, name: '测试用例编写', owner: '孙七', priority: '低', priorityCode: 'LOW', status: '未开始', planStart: '06/20', planEnd: '06/28', actualStart: '-', actualEnd: '-' },
  ]
  bugRows.value = [
    { id: 1, code: 'BUG-2026-00102', title: '登录页面验证码不刷新', severity: '严重', priorityCode: 'URGENT', status: '待处理', statusCode: 'PENDING_FIX', assignee: '张三', creator: '李四' },
    { id: 2, code: 'BUG-2026-00101', title: '数据导入时文件格式校验错误', severity: '严重', priorityCode: 'URGENT', status: '修复中', statusCode: 'FIXING', assignee: '张三', creator: '李四' },
    { id: 3, code: 'BUG-2026-00098', title: '报表导出后数据缺失', severity: '一般', priorityCode: 'MEDIUM', status: '已完成', statusCode: 'COMPLETED', assignee: '王五', creator: '李四' },
    { id: 4, code: 'BUG-2026-00095', title: '系统偶发性卡顿', severity: '一般', priorityCode: 'MEDIUM', status: '待处理', statusCode: 'PENDING_FIX', assignee: '赵六', creator: '李四' },
  ]
  reportRows.value = [
    { id: 1, title: '周四向领导汇报Q2进展', type: '周报', status: '准备中', planTime: '2026-06-15 14:00', actualTime: '-', target: '领导层', place: '会议室A' },
    { id: 2, title: '客户演示-权限管理模块', type: '客户汇报', status: '已完成', planTime: '2026-06-08 10:00', actualTime: '2026-06-08 10:05', target: 'XX客户', place: '线上腾讯会议' },
    { id: 3, title: '项目月度进度汇报', type: '月报', status: '已完成', planTime: '2026-06-01 11:00', actualTime: '2026-06-01 11:10', target: '管理层', place: '会议室B' },
    { id: 4, title: '版本发布前评审汇报', type: '评审汇报', status: '已完成', planTime: '2026-05-28 16:00', actualTime: '2026-05-28 16:20', target: '产品部、测试部', place: '线下会议室C' },
  ]
  documentRows.value = [
    { id: 'demo-doc-1', name: '项目需求说明书V2.0.docx', type: 'DOCX', size: '2.3MB', version: 'V2.0', uploader: '张三', category: '需求类', uploadTime: '2026-06-10' },
    { id: 'demo-doc-2', name: '系统架构设计图.drawio', type: 'DRAWIO', size: '1.1MB', version: 'V1.0', uploader: '李四', category: '设计类', uploadTime: '2026-06-11' },
    { id: 'demo-doc-3', name: '接口文档V1.2.docx', type: 'DOCX', size: '856KB', version: 'V1.2', uploader: '王五', category: '开发类', uploadTime: '2026-06-12' },
    { id: 'demo-doc-4', name: '合同扫描件.pdf', type: 'PDF', size: '4.5MB', version: 'V1.0', uploader: '赵六', category: '合同类', uploadTime: '2026-06-13' },
  ]
  await renderGantt()
}

const fetchReferenceData = async () => {
  try {
    const [dictGroups, userPage] = await Promise.all([
      getDicts(),
      getSystemUsers({ pageNo: 1, pageSize: 200, enabled: true }),
    ])
    dictGroups.forEach(group => {
      dictLabels[group.type] = Object.fromEntries(group.items.map(item => [item.value, item.label]))
    })
    taskStatusOptions.value = dictGroups.find(item => item.type === 'taskStatus')?.items || []
    managerOptions.value = userPage.records.map(user => ({ label: user.realName, value: user.id }))
  } catch (error) {
    message.error(error.message)
  }
}

const fetchProjectRelatedData = async projectId => {
  if (isDemoProject()) {
    await applyDemoProjectData()
    return
  }

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
    taskRows.value = taskResult.records.map(task => ({ id: task.id, name: task.name, owner: getUserName(task.assigneeId), priority: getDictLabel('taskPriority', task.priority), priorityCode: task.priority, status: getDictLabel('taskStatus', task.status), planStart: task.plannedStartDate || '-', planEnd: task.plannedEndDate || '-', actualStart: task.actualStartDate || '-', actualEnd: task.actualEndDate || '-' }))
    bugRows.value = bugResult.records.map(bug => ({ id: bug.id, code: `BUG-${bug.id}`, title: bug.title, severity: getDictLabel('bugPriority', bug.priority), priorityCode: bug.priority, status: getDictLabel('bugStatus', bug.status), statusCode: bug.status, assignee: getUserName(bug.assigneeId), creator: getUserName(bug.creatorId) }))
    reportRows.value = reportResult.records.map(report => ({ id: report.id, title: report.title, type: getDictLabel('reportType', report.reportType), status: getDictLabel('reportStatus', report.status), planTime: report.plannedDate, actualTime: report.actualDate || '-', target: report.targetAudience, place: report.locationMethod }))
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
  if (activeTab.value !== 'gantt') return
  await nextTick()
  const ganttElement = ganttRef.value
  if (!ganttElement) return
  ganttElement.innerHTML = ''
  if (!ganttTasks.value.length) return
  ganttInstance = new Gantt(ganttElement, ganttTasks.value, {
    view_mode: 'Month',
    readonly: true,
    language: 'zh',
    popup_on: 'hover',
    scroll_to: 'start',
  })
  const todayButton = ganttElement.querySelector('.today-button')
  if (todayButton) todayButton.textContent = '今天'
}

const handleOpenUploadModal = () => {
  uploadVisible.value = true
}

const handleGanttRow = record => ({
  onClick: () => {
    Object.assign(ganttForm, {
      id: record.id,
      name: record.name,
      planStart: formatNodeDate(record.planStart),
      planEnd: formatNodeDate(record.planEnd),
      actualStart: formatNodeDate(record.actualStart),
      actualEnd: formatNodeDate(record.actualEnd),
      status: record.statusCode,
      progress: record.progress,
    })
    ganttEditVisible.value = true
  },
})

const refreshDemoGanttSummary = () => {
  const rows = ganttNodeRows.value
  const completed = rows.filter(node => node.statusCode === 'COMPLETED').length
  const overdue = rows.filter(node => node.statusCode === 'OVERDUE').length
  const dueSoon = rows.filter(node => node.statusCode === 'DUE_SOON').length
  const overallProgress = rows.length ? Math.round(rows.reduce((total, node) => total + node.progress, 0) / rows.length) : 0
  Object.assign(ganttSummaryData, { total: rows.length, completed, overdue, dueSoon, overallProgress })
}

const updateDemoGanttNode = async () => {
  ganttNodeRows.value = ganttNodeRows.value.map(node => node.id === ganttForm.id ? {
    ...node,
    planStart: ganttForm.planStart.replaceAll('-', '/'),
    planEnd: ganttForm.planEnd.replaceAll('-', '/'),
    actualStart: ganttForm.actualStart?.replaceAll('-', '/') || '-',
    actualEnd: ganttForm.actualEnd?.replaceAll('-', '/') || '-',
    status: getStatusLabel(ganttForm.status),
    statusCode: ganttForm.status,
    progress: ganttForm.progress,
    isOverdue: ganttForm.status === 'OVERDUE',
  } : node)
  refreshDemoGanttSummary()
  ganttEditVisible.value = false
  await renderGantt()
  message.success('Demo节点更新成功')
}

const handleSaveGanttNode = async () => {
  if (ganttSubmitLoading.value) return

  await ganttFormRef.value?.validate()
  ganttSubmitLoading.value = true

  try {
    if (isDemoProject()) {
      await updateDemoGanttNode()
      return
    }

    await updateGanttNode(route.params.id, ganttForm.id, {
      nodeName: ganttForm.name,
      plannedStartDate: ganttForm.planStart,
      plannedEndDate: ganttForm.planEnd,
      actualStartDate: ganttForm.actualStart || null,
      actualEndDate: ganttForm.actualEnd || null,
      status: ganttForm.status,
      progressPercent: ganttForm.progress,
    })
    ganttEditVisible.value = false
    await fetchProjectRelatedData(route.params.id)
    message.success('节点更新成功')
  } catch (error) {
    message.error(error.message)
  } finally {
    ganttSubmitLoading.value = false
  }
}

const handleDocumentBeforeUpload = file => {
  if (file.size > 50 * 1024 * 1024) {
    message.warning('单个文件不能超过50MB')
    return false
  }
  uploadFiles.value.push({ uid: file.uid, name: file.name, size: file.size, percent: 0, originFile: file })
  return false
}

const handleRemoveUploadFile = uid => {
  uploadFiles.value = uploadFiles.value.filter(file => file.uid !== uid)
}

const handleStartUpload = async () => {
  if (!uploadFiles.value.length) {
    message.warning('请选择需要上传的文件')
    return
  }

  if (isDemoProject()) {
    uploadFiles.value.forEach(file => {
      documentRows.value.unshift({
        id: file.uid,
        name: file.name,
        type: file.name.split('.').pop()?.toUpperCase() || '-',
        size: formatFileSize(file.size),
        version: uploadForm.description || 'V1.0',
        uploader: 'Demo用户',
        category: uploadForm.category,
        uploadTime: dayjs().format('YYYY-MM-DD'),
      })
      file.percent = 100
    })
    message.success('Demo文件上传成功')
    uploadVisible.value = false
    uploadFiles.value = []
    return
  }

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
    await fetchProjectRelatedData(Number(route.params.id))
  } catch (error) {
    message.error(error.message)
  } finally {
    uploadLoading.value = false
  }
}

const handleDownloadDocument = async record => {
  if (isDemoProject()) {
    message.info(`Demo文件：${record.name}`)
    return
  }

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
  if (isDemoProject()) {
    documentRows.value = documentRows.value.filter(item => item.id !== record.id)
    message.success('Demo文件删除成功')
    return
  }

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

  if (isDemoProject()) {
    documentRows.value = documentRows.value.filter(item => !selectedDocumentIds.value.includes(item.id))
    selectedDocumentIds.value = []
    message.success('Demo文件批量删除成功')
    return
  }

  try {
    await deleteProjectFiles(selectedDocumentIds.value)
    documentRows.value = documentRows.value.filter(item => !selectedDocumentIds.value.includes(item.id))
    selectedDocumentIds.value = []
    message.success('文件批量删除成功')
  } catch (error) {
    message.error(error.message)
  }
}

watch(activeTab, renderGantt)
onBeforeUnmount(() => { ganttInstance = null })
onMounted(async () => {
  await fetchReferenceData()
  await fetchProjectRelatedData(route.params.id)
})
</script>

<style scoped>
.execution-detail { height: 100%; min-width: 0; overflow: auto; color: #262626; }
.execution-detail__heading { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
.execution-detail__heading :deep(.ant-tag) { padding: 6px 14px; font-size: 16px; }
.execution-summary { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; margin: 0 0 14px; padding: 16px 18px; background: #fff; border-radius: 8px; }
.execution-summary dl { display: grid; grid-template-columns: repeat(4, max-content minmax(90px, 1fr)); gap: 14px 10px; align-content: center; margin: 0; }
.execution-summary dt, .execution-summary dd { margin: 0; }
.execution-summary dt { color: #595959; }
.execution-summary dd { overflow-wrap: anywhere; }
.execution-summary__progress { padding-left: 20px; border-left: 1px solid #edf0f3; }
.execution-summary__title { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.execution-summary__title h3 { display: flex; gap: 7px; align-items: center; margin: 0; }
.execution-summary__title span { color: #595959; font-size: 13px; }
.execution-summary__bar { display: grid; grid-template-columns: minmax(0, 1fr) 58px; gap: 12px; align-items: center; margin-top: 12px; }
.execution-summary__bar strong { color: #52c41a; font-size: 20px; text-align: right; }
.summary-metrics { display: flex; gap: 20px; margin-top: 12px; }
.summary-metrics div { display: grid; gap: 2px; }
.summary-metrics span { color: #8c8c8c; font-size: 12px; }
.summary-metrics strong { font-size: 18px; }
.summary-metrics .danger { color: #ff4d4f; }
.execution-detail-card { min-height: 560px; overflow: hidden; background: #fff; }
.execution-tabs { display: flex; gap: 72px; height: 58px; padding: 0 20px; background: #fafafa; border-bottom: 1px solid #edf0f3; }
.execution-tabs button { display: inline-flex; gap: 8px; align-items: center; height: 58px; padding: 0 8px; color: #1f1f1f; font-size: 18px; background: transparent; border: 0; border-bottom: 4px solid transparent; cursor: pointer; }
.execution-tabs button.active { color: #1677ff; border-bottom-color: #1677ff; }
.execution-tab-panel { min-height: 520px; padding: 20px; overflow: auto; }
.panel-title { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; font-size: 16px; font-weight: 600; }
.execution-stat-row, .risk-grid, .bug-summary, .document-categories { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 22px; }
.execution-stat-row { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
.semantic-card { display: flex; gap: 14px; align-items: center; min-height: 86px; padding: 16px 18px; border: 1px solid #edf0f3; border-radius: 6px; }
.execution-stat-row .semantic-card { gap: 12px; width: 100%; height: 86px; min-height: 0; padding: 14px 15px; text-align: left; border: 1px solid rgb(0 0 0 / 5%); border-radius: 16px; box-shadow: 0 4px 16px rgb(0 0 0 / 5%); transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.28s ease; }
.execution-stat-row .semantic-card:hover { box-shadow: 0 14px 28px rgb(0 0 0 / 10%); transform: translateY(-4px); }
.semantic-card__icon { display: inline-flex; flex: 0 0 38px; align-items: center; justify-content: center; width: 38px; height: 38px; font-size: 20px; background: rgb(255 255 255 / 80%); border-radius: 8px; }
.semantic-card__content { min-width: 0; }
.semantic-card__content > span, .semantic-card__content strong, .semantic-card__content small { display: block; }
.semantic-card__content > span { color: #6e6e73; font-size: 13px; }
.semantic-card__content strong { margin: 4px 0; color: #1d1d1f; font-size: 24px; }
.semantic-card__content small { color: #697386; font-size: 13px; }
.gantt-progress, .risk-due, .bug-confirmed { color: #0066cc; background: linear-gradient(135deg, #fff 0%, #edf6ff 100%); }
.risk-high, .bug-severe { color: #ff4d4f; background: #fff1f0; }
.risk-medium, .bug-submitted { color: #fa8c16; background: #fff7e6; }
.risk-normal, .bug-closed { color: #21a66a; background: #f0fff7; }
.gantt-workspace { display: grid; min-height: 430px; overflow: hidden; border: 1px solid #edf0f3; }
.gantt-node-table { width: 100%; border-right: 1px solid #edf0f3; }
.gantt-node-table :deep(.ant-table-thead > tr > th) { height: 85px; padding: 8px 6px; text-align: center; white-space: nowrap; }
.gantt-node-table :deep(.ant-table-tbody > tr > td) { height: 48px; padding: 7px 6px; text-align: center; white-space: nowrap; }
.gantt-node-table :deep(.ant-table-tbody > tr) { cursor: pointer; }
.gantt-node-table :deep(.ant-table-tbody > tr:hover > td) { background: #edf6ff; }
.gantt-node-table :deep(.ant-progress) { min-width: 76px; }
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
.gantt-scroll :deep(.gantt-in-progress .bar) { fill: #d6eaff; stroke: #0a84ff; }
.gantt-scroll :deep(.gantt-in-progress .bar-progress) { fill: #0a84ff; }
.gantt-scroll :deep(.gantt-due-soon .bar), .gantt-scroll :deep(.gantt-due-soon .bar-progress) { fill: #ffd60a; stroke: #d6a600; }
.gantt-scroll :deep(.gantt-completed .bar), .gantt-scroll :deep(.gantt-completed .bar-progress), .gantt-scroll :deep(.gantt-milestone .bar), .gantt-scroll :deep(.gantt-milestone .bar-progress) { fill: #30d158; stroke: #248a3d; }
.gantt-scroll :deep(.gantt-overdue .bar), .gantt-scroll :deep(.gantt-overdue .bar-progress) { fill: #ff453a; stroke: #d70015; }
.gantt-scroll :deep(.gantt-completed .bar-label), .gantt-scroll :deep(.gantt-overdue .bar-label), .gantt-scroll :deep(.gantt-in-progress .bar-label), .gantt-scroll :deep(.gantt-milestone .bar-label) { fill: #fff; }
.gantt-scroll :deep(.gantt-due-soon .bar-label), .gantt-scroll :deep(.gantt-not-started .bar-label) { fill: #1d1d1f; }
.section-heading, .document-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.section-heading h2, .section-heading h3 { display: flex; gap: 8px; align-items: center; margin: 0; }
.section-heading small { color: #8c8c8c; font-weight: 400; }
.report-filter { display: flex; gap: 12px; margin-bottom: 18px; }
.report-filter :deep(.ant-input) { width: 360px; }
.document-toolbar :deep(.ant-input-group-wrapper) { width: 420px; }
.document-categories { display: grid; grid-auto-columns: minmax(220px, 1fr); grid-auto-flow: column; grid-template-columns: none; overflow-x: auto; padding-bottom: 4px; }
.document-categories button { display: grid; grid-template-columns: 46px minmax(0, 1fr); gap: 2px 14px; align-items: center; min-height: 92px; padding: 16px; text-align: left; background: #fff; border: 1px solid #edf0f3; border-radius: 6px; cursor: pointer; }
.document-categories button:first-child { border-color: #1677ff; box-shadow: 0 0 0 1px #1677ff inset; }
.document-category__icon { display: inline-flex; grid-row: 1 / 3; align-items: center; justify-content: center; width: 42px; height: 42px; font-size: 22px; border-radius: 8px; }
.document-categories strong { font-size: 18px; }
.category-all .document-category__icon { color: #1677ff; background: #e6f4ff; }
.category-contract .document-category__icon { color: #21a66a; background: #eafaf1; }
.category-requirement .document-category__icon { color: #faad14; background: #fff7e6; }
.category-design .document-category__icon { color: #722ed1; background: #f4edff; }
.category-development .document-category__icon { color: #fa8c16; background: #fff7e6; }
.category-acceptance .document-category__icon { color: #13c2c2; background: #e6fffb; }
.upload-drag-icon { margin: 0 0 8px; color: #1677ff; font-size: 40px; text-align: center; }
.upload-drag-title, .upload-drag-hint { margin: 0; text-align: center; }
.upload-drag-title span { color: #1677ff; }
.upload-drag-hint { color: #8c8c8c; }
.upload-list-title { margin: 18px 0 10px; }
.upload-file-list { min-height: 80px; }
.upload-file-item { display: grid; grid-template-columns: 24px minmax(0, 1fr) 70px 120px 42px 48px; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.upload-file-item__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.upload-file-item__success { color: #52c41a; }
.upload-form { margin-top: 16px; }
.upload-form__row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.upload-modal-actions, .gantt-edit-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
@media (max-width: 1280px) {
  .execution-summary { grid-template-columns: 1fr; }
  .execution-summary__progress { padding: 16px 0 0; border-top: 1px solid #edf0f3; border-left: 0; }
  .execution-summary dl { grid-template-columns: repeat(2, max-content minmax(120px, 1fr)); }
}
</style>
