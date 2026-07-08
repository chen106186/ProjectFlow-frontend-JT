<template>
  <div class="project-page">
    <template v-if="viewMode === 'list'">
      <a-card class="project-filter" :bordered="false">
        <a-form class="project-filter__form" layout="inline">
          <a-form-item label="项目名称"><a-input v-model:value="query.keyword" allow-clear /></a-form-item>
          <a-form-item label="项目经理"><a-select v-model:value="query.manager" :options="managerFilterOptions" /></a-form-item>
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
        <a-table v-if="displayMode === 'list'" row-key="id" :columns="projectColumns" :data-source="filteredProjects" :pagination="pagination" :scroll="{ x: 1480 }">
          <template #bodyCell="{ column, record, index, text }">
            <template v-if="column.dataIndex === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.dataIndex === 'name'"><a-button type="link" class="table-link" @click="handleDetail(record)">{{ text }}</a-button></template>
            <template v-else-if="column.dataIndex === 'status'"><a-tag color="green">{{ text }}</a-tag></template>
            <template v-else-if="column.dataIndex === 'contractStatus'"><a-tag color="green">{{ text }}</a-tag></template>
            <template v-else-if="column.dataIndex === 'operation'"><a-space><a-button type="link" size="small" @click="handleEdit(record)"><EditOutlined /></a-button><a-popconfirm title="确定删除该项目吗？" @confirm="handleDelete(record)"><a-button type="link" size="small" danger><DeleteOutlined /></a-button></a-popconfirm></a-space></template>
          </template>
        </a-table>
        <div v-else class="project-group-list">
          <section v-for="group in groupedProjects" :key="group.value" class="project-group">
            <header class="project-group__header"><button type="button" @click="handleToggleGroup(group.value)"><RightOutlined v-if="isGroupCollapsed(group.value)" /><DownOutlined v-else />{{ group.label }}</button><a-tag>{{ group.rows.length }}</a-tag></header>
            <a-table v-if="!isGroupCollapsed(group.value)" row-key="id" :columns="projectColumns" :data-source="group.rows" :pagination="false" :scroll="{ x: 1480 }" :show-header="false">
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
        <a-form-item label="项目经理" name="manager"><a-select v-model:value="formState.manager" :options="managerOptions" placeholder="请选择项目经理" /></a-form-item>
        <a-form-item label="业务部门"><a-input v-model:value="formState.department" placeholder="请输入业务部门" /></a-form-item>
        <a-form-item label="承建单位"><a-input v-model:value="formState.contractor" placeholder="请输入承建单位" /></a-form-item>
        <a-form-item label="业务主管"><a-select v-model:value="formState.supervisor" :options="managerOptions" placeholder="请选择业务主管" /></a-form-item>
        <a-form-item label="项目类型" name="type"><a-select v-model:value="formState.type" :options="typeOptions" /></a-form-item>
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
        <div class="project-detail__heading"><a-button @click="handleBack"><ArrowLeftOutlined />返回</a-button><a-tag color="processing">进行中</a-tag></div>
        <section class="project-summary">
          <dl><template v-for="item in summaryItems" :key="item.label"><dt>{{ item.label }}：</dt><dd><a-tag v-if="item.tag" :color="item.color">{{ item.value }}</a-tag><template v-else>{{ item.value }}</template></dd></template></dl>
          <div class="project-summary__progress">
            <div class="project-summary__title"><h3><ProjectOutlined />项目进度</h3><span>根据项目进度权重计算</span></div>
            <div class="project-summary__bar"><a-progress :percent="75" :show-info="false" stroke-color="#52c41a" /><strong>75%</strong></div>
            <div class="summary-metrics"><div><strong>6</strong><span>关联任务</span></div><div><strong class="danger">4</strong><span>关联Bug</span></div></div>
          </div>
        </section>
        <div class="project-tabs">
          <button v-for="tab in detailTabs" :key="tab.key" type="button" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key"><component :is="tab.icon" />{{ tab.label }}</button>
        </div>
        <div class="project-detail__layout">
          <main class="project-detail__main">
            <section v-show="activeTab === 'gantt'" class="detail-panel gantt-panel">
              <div class="project-stat-row"><div v-for="item in ganttSummary" :key="item.label" class="semantic-card" :class="item.class"><span class="semantic-card__icon"><component :is="item.icon" /></span><span class="semantic-card__content"><span>{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ item.desc }}</small></span></div></div>
              <div class="gantt-workspace" :style="{ gridTemplateColumns: `${ganttTableWidth}px minmax(0, 1fr)` }">
                <a-table class="gantt-node-table" row-key="id" :columns="ganttNodeColumns" :data-source="ganttNodeRows" :pagination="false" :custom-row="handleGanttRow" size="small" table-layout="fixed">
                  <template #bodyCell="{ column, record, text }">
                    <template v-if="column.dataIndex === 'status'"><a-tag :color="ganttStatusColors[text]">{{ text }}</a-tag></template>
                    <template v-else-if="column.dataIndex === 'progress'"><a-progress :percent="text" size="small" /></template>
                    <template v-else-if="column.dataIndex === 'actualEnd'"><span :class="{ 'date-overdue': record.isOverdue }">{{ text }}</span></template>
                  </template>
                </a-table>
                <div ref="ganttRef" class="gantt-scroll"></div>
              </div>
            </section>

            <section v-if="activeTab === 'tasks'" class="detail-panel">
              <h3>全局风险预警</h3>
              <div class="risk-grid"><div v-for="risk in risks" :key="risk.label" class="semantic-card" :class="risk.class"><span class="semantic-card__icon"><component :is="risk.icon" /></span><span class="semantic-card__content"><span>{{ risk.label }}</span><strong>{{ risk.value }}</strong><small>{{ risk.desc }}</small></span></div></div>
              <div class="section-heading"><h3>任务列表</h3><a-space><a-select value="全部状态" :options="taskStatusFilters" /><a-select value="全部负责人" :options="personFilterOptions" /></a-space></div>
              <a-table row-key="id" :columns="taskColumns" :data-source="taskRows" :pagination="pagination" size="small" :scroll="{ x: 950 }"><template #bodyCell="{ column, text }"><a-tag v-if="column.dataIndex === 'priority'" color="red">{{ text }}</a-tag><a-tag v-else-if="column.dataIndex === 'status'" color="processing">{{ text }}</a-tag></template></a-table>
            </section>

            <section v-if="activeTab === 'bugs'" class="detail-panel">
              <h3>Bug 总览</h3><div class="bug-summary"><div v-for="item in bugSummary" :key="item.label" class="semantic-card" :class="item.class"><span class="semantic-card__icon"><component :is="item.icon" /></span><span class="semantic-card__content"><span>{{ item.label }}</span><strong>{{ item.value }} 个</strong></span></div></div>
              <div class="section-heading"><h3>Bug 列表</h3><a-space><a-select value="全部状态" :options="bugStatusFilters" /><a-select value="全部指定人" :options="personFilterOptions" /></a-space></div>
              <a-table row-key="id" :columns="bugColumns" :data-source="bugRows" :pagination="pagination" size="small" :scroll="{ x: 900 }"><template #bodyCell="{ column, text }"><a-tag v-if="column.dataIndex === 'severity'" color="red">{{ text }}</a-tag><a-tag v-else-if="column.dataIndex === 'status'" color="orange">{{ text }}</a-tag></template></a-table>
            </section>

            <section v-if="activeTab === 'reports'" class="detail-panel">
              <div class="section-heading"><h2>汇报管理 <small>（共 {{ reportRows.length }} 条）</small></h2><a-button type="primary" @click="handleCreateReport"><PlusOutlined />新建汇报</a-button></div>
              <a-form class="report-filter" layout="inline"><a-form-item><a-input placeholder="搜索汇报标题 / 汇报对象 / 地点方式" /></a-form-item><a-form-item><a-select value="全部" :options="reportStatusFilters" /></a-form-item><a-form-item><a-range-picker /></a-form-item><a-button>重置</a-button></a-form>
              <a-table row-key="id" :columns="reportColumns" :data-source="reportRows" :pagination="pagination" :scroll="{ x: 900 }"><template #bodyCell="{ column, record, text }"><a-button v-if="column.dataIndex === 'title'" type="link" @click="handleEditReport(record)">{{ text }}</a-button><a-tag v-else-if="column.dataIndex === 'status'" color="green">{{ text }}</a-tag></template></a-table>
            </section>

            <section v-if="activeTab === 'documents'" class="detail-panel">
              <div class="document-toolbar"><a-space><a-button type="primary" @click.stop="handleOpenUploadModal"><UploadOutlined />上传文件</a-button><a-button><FolderAddOutlined />新建文件夹</a-button><a-button><DownloadOutlined />批量下载</a-button><a-button danger><DeleteOutlined />批量删除</a-button></a-space><a-input-search placeholder="搜索文件名、上传人、分类..." /></div>
              <h3>分类导航</h3><div class="document-categories"><button v-for="item in documentCategories" :key="item.label" type="button" :class="item.class"><span class="document-category__icon"><component :is="item.icon" /></span><span>{{ item.label }}</span><strong>{{ item.value }}</strong></button></div>
              <a-table row-key="id" :row-selection="{}" :columns="documentColumns" :data-source="documentRows" :pagination="false">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.dataIndex === 'operation'"><a-space><a-button type="link" size="small" @click="handleDownloadDocument(record)">下载</a-button><a-popconfirm title="确定删除该文件吗？" @confirm="handleDeleteDocument(record)"><a-button type="link" size="small" danger>删除</a-button></a-popconfirm></a-space></template>
                </template>
              </a-table>
            </section>
          </main>

        </div>
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
        <a-form-item label="计划日期" name="planDate"><a-date-picker v-model:value="reportForm.planDate" show-time format="YYYY-MM-DD HH:mm" placeholder="请选择计划日期" /></a-form-item>
        <a-form-item label="实际日期"><a-date-picker v-model:value="reportForm.actualDate" show-time format="YYYY-MM-DD HH:mm" placeholder="请选择实际日期" /></a-form-item>
        <a-form-item label="关联任务"><a-select v-model:value="reportForm.task" :options="reportTaskOptions" placeholder="请选择关联任务" allow-clear /></a-form-item>
        <a-form-item label="汇报对象"><a-input v-model:value="reportForm.target" placeholder="请输入汇报对象" /></a-form-item>
        <a-form-item label="地点/方式"><a-input v-model:value="reportForm.place" placeholder="请输入地点或汇报方式" /></a-form-item>
        <a-form-item label="描述"><a-textarea v-model:value="reportForm.description" :rows="4" placeholder="请输入汇报描述" /></a-form-item>
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
import { ArrowLeftOutlined, BugOutlined, CheckCircleOutlined, CheckOutlined, ClockCircleOutlined, CodeOutlined, DeleteOutlined, DownOutlined, DownloadOutlined, EditOutlined, ExclamationCircleOutlined, FileDoneOutlined, FileOutlined, FileProtectOutlined, FileTextOutlined, FireOutlined, FlagOutlined, FolderAddOutlined, FolderOpenOutlined, InboxOutlined, PlusOutlined, ProfileOutlined, ProjectOutlined, RightOutlined, SendOutlined, SnippetsOutlined, ToolOutlined, UploadOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import Gantt from 'frappe-gantt'
import 'frappe-gantt-css'
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const viewMode = computed(() => route.meta.projectView || 'list')
const formRef = ref()
const submitLoading = ref(false)
const editingId = ref(null)
const activeTab = ref('gantt')
const ganttRef = ref()
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
const managerOptions = toOptions(['张三', '李四', '王五', '赵六'])
const typeOptions = toOptions(['数字化项目', '信息化项目', '科研项目'])
const stageOptions = toOptions(['商机跟进', '可研批复', '招标', '合同签订', '概设批复', '需求分析', 'UI设计', '开发', '测试', '上线试运行'])
const projectStatusOptions = toOptions(['未开始', '进行中', '已完成', '已暂停'])
const contractOptions = toOptions(['未签订', '已签订'])
const withAll = options => [{ label: '全部', value: '全部' }, ...options]
const managerFilterOptions = withAll(managerOptions)
const typeFilterOptions = withAll(typeOptions)
const stageFilterOptions = withAll(stageOptions)
const projectStatusFilterOptions = withAll(projectStatusOptions)
const contractFilterOptions = withAll(contractOptions)
const nodeOptions = stageOptions.map(item => item.value)
const groupOptions = [{ label: '项目经理', value: 'manager' }, { label: '项目阶段', value: 'stage' }, { label: '项目状态', value: 'status' }, { label: '项目类型', value: 'type' }, { label: '合同状态', value: 'contractStatus' }]

const projects = ref([
  { id: 1, name: '数字化管理系统', manager: '张三', department: '国网有限公司', contractor: '科技有限公司', supervisor: '李四', stage: '可研批复', status: '已完成', contractStatus: '已签订', amount: 320, type: '数字化项目', description: '国网项目', nodes: ['可研批复', '招标', '合同签订', '需求分析', 'UI设计', '开发', '测试'] },
  { id: 2, name: '企业协同办公平台', manager: '王五', department: '综合管理部', contractor: '软件技术公司', supervisor: '赵六', stage: '开发', status: '进行中', contractStatus: '已签订', amount: 180, type: '信息化项目', description: '协同办公平台建设', nodes: ['需求分析', 'UI设计', '开发', '测试'] },
  { id: 3, name: '数据治理分析平台', manager: '张三', department: '数据中心', contractor: '科技有限公司', supervisor: '李四', stage: '需求分析', status: '进行中', contractStatus: '未签订', amount: 260, type: '科研项目', description: '企业数据治理项目', nodes: ['可研批复', '需求分析', '开发', '测试'] },
  { id: 4, name: '智能运维管理系统', manager: '李四', department: '运维中心', contractor: '智能科技公司', supervisor: '王五', stage: '测试', status: '进行中', contractStatus: '已签订', amount: 210, type: '数字化项目', description: '智能运维平台', nodes: ['需求分析', 'UI设计', '开发', '测试', '上线试运行'] },
])

const createDefaultForm = () => ({ name: '', manager: undefined, department: '', contractor: '', supervisor: undefined, type: '数字化项目', nodes: [], stage: '商机跟进', status: '未开始', contractStatus: '未签订', amount: 0, description: '' })
const formState = reactive(createDefaultForm())
const query = reactive({ keyword: '', manager: '全部', type: '全部', contractStatus: '全部', stage: '全部', status: '全部' })
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
const pagination = { defaultPageSize: 10, pageSizeOptions: ['10', '50', '100'], showSizeChanger: true, showTotal: total => `共 ${total} 条` }
const formRules = { name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }], manager: [{ required: true, message: '请选择项目经理', trigger: 'change' }], type: [{ required: true, message: '请选择项目类型', trigger: 'change' }], description: [{ required: true, message: '请输入项目描述', trigger: 'blur' }] }

const filteredProjects = computed(() => projects.value.filter(item => {
  const keywordMatched = !appliedQuery.keyword || item.name.includes(appliedQuery.keyword)
  return keywordMatched && ['manager', 'type', 'contractStatus', 'stage', 'status'].every(key => appliedQuery[key] === '全部' || item[key] === appliedQuery[key])
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
const ganttSummary = [{ label: '项目状态', value: '进行中', desc: '整体进度 75%', class: 'gantt-progress', icon: ProjectOutlined }, { label: '延期任务', value: '2 个', desc: '需重点关注', class: 'risk-high', icon: WarningOutlined }, { label: '即将到期', value: '3 个', desc: '未来 3 天内到期', class: 'risk-due', icon: ClockCircleOutlined }]
const ganttStatusColors = { 未开始: 'default', 进行中: 'processing', 即将到期: 'gold', 已完成: 'green', 已逾期: 'red', 里程碑: 'green' }
const ganttStatusClasses = { 未开始: 'gantt-not-started', 进行中: 'gantt-in-progress', 即将到期: 'gantt-due-soon', 已完成: 'gantt-completed', 已逾期: 'gantt-overdue', 里程碑: 'gantt-milestone' }
const ganttStatusOptions = toOptions(Object.keys(ganttStatusColors))
const ganttNodeColumns = [
  { title: '节点名称', dataIndex: 'name', width: 160 }, { title: '计划开始', dataIndex: 'planStart', width: 120 }, { title: '计划结束', dataIndex: 'planEnd', width: 120 },
  { title: '实际开始', dataIndex: 'actualStart', width: 120 }, { title: '实际结束', dataIndex: 'actualEnd', width: 120 }, { title: '状态', dataIndex: 'status', width: 90 },
  { title: '进度', dataIndex: 'progress', width: 160 },
]
const ganttTableWidth = ganttNodeColumns.reduce((total, column) => total + column.width, 0)
const ganttNodeRows = ref([
  { id: 1, name: '可研批复', planStart: '2025/04/01', planEnd: '2025/04/01', actualStart: '2025/04/01', actualEnd: '2025/04/01', status: '里程碑', progress: 100 },
  { id: 2, name: '招标', planStart: '2025/04/21', planEnd: '2025/05/20', actualStart: '2025/04/21', actualEnd: '2025/05/20', status: '已完成', progress: 100 },
  { id: 3, name: '合同签订', planStart: '2025/05/21', planEnd: '2025/06/10', actualStart: '2025/05/22', actualEnd: '2025/06/11', status: '已逾期', progress: 100, isOverdue: true },
  { id: 4, name: '概设批复', planStart: '2025/06/11', planEnd: '2025/07/01', actualStart: '2025/06/12', actualEnd: '2025/07/02', status: '已完成', progress: 100, isOverdue: true },
  { id: 5, name: '需求分析', planStart: '2025/07/02', planEnd: '2025/09/30', actualStart: '2025/07/03', actualEnd: '-', status: '进行中', progress: 65 },
  { id: 6, name: 'UI设计', planStart: '2025/10/01', planEnd: '2025/10/20', actualStart: '-', actualEnd: '-', status: '即将到期', progress: 0 },
  { id: 7, name: '开发', planStart: '2025/10/21', planEnd: '2025/11/10', actualStart: '-', actualEnd: '-', status: '未开始', progress: 0 },
])
const ganttTasks = computed(() => ganttNodeRows.value.map((node, index) => ({
  id: String(node.id),
  name: node.name,
  start: node.planStart.replaceAll('/', '-'),
  end: node.status === '里程碑' ? dayjs(node.planEnd.replaceAll('/', '-')).add(1, 'day').format('YYYY-MM-DD') : node.planEnd.replaceAll('/', '-'),
  progress: node.progress,
  dependencies: index ? String(ganttNodeRows.value[index - 1].id) : undefined,
  custom_class: ganttStatusClasses[node.status],
})))
const ganttForm = reactive({ id: null, name: '', planStart: undefined, planEnd: undefined, actualStart: undefined, actualEnd: undefined, status: undefined, progress: 0 })
const ganttFormRules = {
  planStart: [{ required: true, message: '请选择计划开始日期', trigger: 'change' }],
  planEnd: [{ required: true, message: '请选择计划结束日期', trigger: 'change' }, { validator: (_, value) => !value || !ganttForm.planStart || !dayjs(value).isBefore(dayjs(ganttForm.planStart)) ? Promise.resolve() : Promise.reject(new Error('计划结束日期不能早于计划开始日期')), trigger: 'change' }],
  status: [{ required: true, message: '请选择节点状态', trigger: 'change' }],
  progress: [{ required: true, message: '请输入节点进度', trigger: 'change' }],
}

const risks = [{ label: '高风险任务', value: '3 个', desc: '延期 ≥ 3 天', class: 'risk-high', icon: FireOutlined }, { label: '中风险任务', value: '2 个', desc: '延期 1 - 2 天', class: 'risk-medium', icon: WarningOutlined }, { label: '即将到期', value: '4 个', desc: '未来 3 天内到期', class: 'risk-due', icon: ClockCircleOutlined }, { label: '按计划进行', value: '8 个', desc: '无延期风险', class: 'risk-normal', icon: CheckCircleOutlined }]
const taskColumns = [{ title: '序号', dataIndex: 'id', width: 60 }, { title: '任务名称', dataIndex: 'name', width: 180 }, { title: '负责人', dataIndex: 'owner', width: 90 }, { title: '优先级', dataIndex: 'priority', width: 80 }, { title: '状态', dataIndex: 'status', width: 90 }, { title: '计划开始', dataIndex: 'planStart', width: 110 }, { title: '计划结束', dataIndex: 'planEnd', width: 110 }, { title: '实际开始', dataIndex: 'actualStart', width: 110 }, { title: '实际结束', dataIndex: 'actualEnd', width: 110 }]
const taskRows = Array.from({ length: 6 }, (_, index) => ({ id: index + 1, name: '用户权限系统设计', owner: ['张三', '李四', '王五'][index % 3], priority: '高', status: '进行中', planStart: '06/01', planEnd: '06/10', actualStart: '06/01', actualEnd: '06/14' }))
const taskStatusFilters = toOptions(['全部状态', '未开始', '进行中', '已完成'])
const personFilterOptions = toOptions(['全部负责人', '全部指定人', '张三', '李四', '王五'])
const bugSummary = [{ label: '严重', value: 5, class: 'bug-severe', icon: ExclamationCircleOutlined }, { label: '已提交', value: 12, class: 'bug-submitted', icon: SendOutlined }, { label: '已确认', value: 8, class: 'bug-confirmed', icon: ToolOutlined }, { label: '已关闭', value: 10, class: 'bug-closed', icon: CheckCircleOutlined }]
const bugColumns = [{ title: '序号', dataIndex: 'id', width: 60 }, { title: 'BUG ID', dataIndex: 'code', width: 130 }, { title: '标题', dataIndex: 'title', width: 220 }, { title: '严重级别', dataIndex: 'severity', width: 100 }, { title: '状态', dataIndex: 'status', width: 100 }, { title: '指定人', dataIndex: 'assignee', width: 90 }, { title: '创建人', dataIndex: 'creator', width: 90 }]
const bugRows = Array.from({ length: 5 }, (_, index) => ({ id: index + 1, code: `BUG-2026-00${102 - index}`, title: ['登录页面验证码不刷新', '数据导入时文件格式校验错误', '报表导出数据缺失', '系统偶发性卡顿', '权限调整后菜单未生效'][index], severity: '严重', status: index % 2 ? '修复中' : '待处理', assignee: '张三', creator: '李四' }))
const bugStatusFilters = toOptions(['全部状态', '待处理', '修复中', '已完成'])
const reportStatusFilters = toOptions(['全部', '准备中', '进行中', '已完成'])
const reportColumns = [{ title: '汇报标题', dataIndex: 'title', width: 220 }, { title: '汇报类型', dataIndex: 'type', width: 110 }, { title: '状态', dataIndex: 'status', width: 100 }, { title: '计划时间', dataIndex: 'planTime', width: 150 }, { title: '实际时间', dataIndex: 'actualTime', width: 150 }, { title: '汇报对象', dataIndex: 'target', width: 110 }, { title: '地点/方式', dataIndex: 'place', width: 120 }]
const reportRows = ref([{ id: 1, title: '周四向领导汇报Q2进展', type: '周报', status: '准备中', planTime: '2026-06-15 14:00', actualTime: '-', target: '领导层', place: '会议室A', task: '需求分析', description: '汇报项目季度进展' }, { id: 2, title: '客户演示-权限管理模块', type: '客户汇报', status: '已完成', planTime: '2026-06-08 10:00', actualTime: '2026-06-08 10:05', target: 'XX客户', place: '线上腾讯会议', task: '用户权限系统设计', description: '演示权限管理模块' }, { id: 3, title: '项目月度进度汇报', type: '月报', status: '已完成', planTime: '2026-06-01 11:00', actualTime: '2026-06-01 11:10', target: '管理层', place: '会议室B', task: '需求分析', description: '月度项目进度汇报' }])
const createDefaultReportForm = () => ({ title: '', type: '进展汇报', status: '未开始', planDate: undefined, actualDate: undefined, task: undefined, target: '', place: '', description: '' })
const reportForm = reactive(createDefaultReportForm())
const reportTypeOptions = toOptions(['进展汇报', '周报', '月报', '客户汇报', '评审汇报', '专项汇报'])
const reportStatusOptions = toOptions(['未开始', '准备中', '进行中', '已完成'])
const reportTaskOptions = toOptions(['需求分析', '用户权限系统设计', 'UI设计', '开发', '测试'])
const reportRules = { title: [{ required: true, message: '请输入汇报标题', trigger: 'blur' }], type: [{ required: true, message: '请选择汇报类型', trigger: 'change' }], status: [{ required: true, message: '请选择汇报状态', trigger: 'change' }], planDate: [{ required: true, message: '请选择计划日期', trigger: 'change' }] }
const documentCategories = [{ label: '全部', value: 26, class: 'category-all', icon: FolderOpenOutlined }, { label: '合同类', value: 5, class: 'category-contract', icon: FileProtectOutlined }, { label: '需求类', value: 4, class: 'category-requirement', icon: FileTextOutlined }, { label: '设计类', value: 6, class: 'category-design', icon: SnippetsOutlined }, { label: '开发类', value: 5, class: 'category-development', icon: CodeOutlined }, { label: '验收类', value: 3, class: 'category-acceptance', icon: FileDoneOutlined }]
const documentColumns = [{ title: '文件名', dataIndex: 'name' }, { title: '类型', dataIndex: 'type', width: 90 }, { title: '大小', dataIndex: 'size', width: 90 }, { title: '版本', dataIndex: 'version', width: 80 }, { title: '上传人', dataIndex: 'uploader', width: 80 }, { title: '分类', dataIndex: 'category', width: 90 }, { title: '上传时间', dataIndex: 'uploadTime', width: 130 }, { title: '操作', dataIndex: 'operation', width: 120 }]
const documentRows = ref([{ id: 1, name: '项目需求说明书V2.0.docx', type: 'DOCX', size: '2.3MB', version: 'V2.0', uploader: '张三', category: '开发类', uploadTime: '06-20 10:30' }, { id: 2, name: '系统架构设计图.drawio', type: 'DRAWIO', size: '1.1MB', version: 'V1.0', uploader: '李四', category: '设计类', uploadTime: '06-19 15:20' }, { id: 3, name: '接口文档V1.2.docx', type: 'DOCX', size: '856KB', version: 'V1.2', uploader: '王五', category: '开发类', uploadTime: '06-18 09:15' }, { id: 4, name: '合同扫描件.pdf', type: 'PDF', size: '4.5MB', version: 'V1.0', uploader: '赵六', category: '合同类', uploadTime: '06-15 14:00' }, { id: 5, name: '项目验收报告.pdf', type: 'PDF', size: '3.2MB', version: 'V1.0', uploader: '-', category: '验收类', uploadTime: '-' }])
const uploadForm = reactive({ location: '项目文档库', category: '需求类', description: '' })
const storageOptions = toOptions(['项目文档库', '公共文档库'])
const documentCategoryOptions = toOptions(['合同类', '需求类', '设计类', '开发类', '验收类'])
const summaryItems = [{ label: '项目名称', value: 'XX企业数字化管理系统' }, { label: '业务部门', value: 'XX科技有限公司' }, { label: '承建单位', value: 'XX科技有限公司' }, { label: '业务主管', value: '李四' }, { label: '项目类型', value: '数字化项目' }, { label: '项目经理', value: '张三' }, { label: '项目阶段', value: '可研批复' }, { label: '项目状态', value: '进行中', tag: true, color: 'processing' }, { label: '合同状态', value: '已签订', tag: true, color: 'green' }, { label: '回款金额', value: '回款XX万元' }]

const renderGantt = async () => {
  if (viewMode.value !== 'detail' || activeTab.value !== 'gantt') return
  await nextTick()
  if (!ganttRef.value) return
  ganttRef.value.innerHTML = ''
  ganttInstance = new Gantt(ganttRef.value, ganttTasks.value, { view_mode: 'Month', readonly: true, language: 'zh', popup: false, scroll_to: 'start' })
  const todayButton = ganttRef.value.querySelector('.today-button')
  if (todayButton) todayButton.textContent = '今天'
}

const syncRoute = () => {
  if (viewMode.value === 'create') { Object.assign(formState, createDefaultForm()); editingId.value = null; return }
  const project = projects.value.find(item => item.id === Number(route.params.id))
  if (viewMode.value === 'edit' && project) { Object.assign(formState, project); editingId.value = project.id }
  if (viewMode.value === 'detail') { activeTab.value = 'gantt'; renderGantt() }
}
watch(() => [route.name, route.params.id], syncRoute, { immediate: true })
watch(activeTab, renderGantt)
watch(groupField, () => { collapsedGroups.value = [] })
onBeforeUnmount(() => { ganttInstance = null })

const handleSearch = () => Object.assign(appliedQuery, query)
const handleReset = () => { Object.assign(query, { keyword: '', manager: '全部', type: '全部', contractStatus: '全部', stage: '全部', status: '全部' }); Object.assign(appliedQuery, query) }
const isGroupCollapsed = value => collapsedGroups.value.includes(value)
const handleToggleGroup = value => {
  collapsedGroups.value = isGroupCollapsed(value) ? collapsedGroups.value.filter(item => item !== value) : [...collapsedGroups.value, value]
}
const handleGanttRow = record => ({
  onClick: () => {
    Object.assign(ganttForm, {
      id: record.id,
      name: record.name,
      planStart: record.planStart.replaceAll('/', '-'),
      planEnd: record.planEnd.replaceAll('/', '-'),
      actualStart: record.actualStart === '-' ? undefined : record.actualStart.replaceAll('/', '-'),
      actualEnd: record.actualEnd === '-' ? undefined : record.actualEnd.replaceAll('/', '-'),
      status: record.status,
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
    const rowIndex = ganttNodeRows.value.findIndex(item => item.id === ganttForm.id)
    if (rowIndex === -1) return
    ganttNodeRows.value[rowIndex] = {
      ...ganttNodeRows.value[rowIndex],
      planStart: ganttForm.planStart.replaceAll('-', '/'),
      planEnd: ganttForm.planEnd.replaceAll('-', '/'),
      actualStart: ganttForm.actualStart?.replaceAll('-', '/') || '-',
      actualEnd: ganttForm.actualEnd?.replaceAll('-', '/') || '-',
      status: ganttForm.status,
      progress: ganttForm.progress,
      isOverdue: ganttForm.status === '已逾期',
    }
    ganttEditVisible.value = false
    await renderGantt()
    message.success('节点更新成功')
  } finally {
    ganttSubmitLoading.value = false
  }
}
const handleCreate = () => router.push({ name: 'ManagementProjectCreate' })
const handleEdit = record => router.push({ name: 'ManagementProjectEdit', params: { id: record.id } })
const handleDetail = record => router.push({ name: 'ManagementProjectDetail', params: { id: record.id } })
const handleBack = () => router.push({ name: 'ManagementProjects' })
const handleDelete = record => { projects.value = projects.value.filter(item => item.id !== record.id); message.success('项目删除成功') }
const handleOpenUploadModal = () => {
  uploadVisible.value = true
}
const handleDocumentBeforeUpload = file => {
  if (file.size > 50 * 1024 * 1024) { message.warning('单个文件不能超过50MB'); return false }
  uploadFiles.value.push({ uid: file.uid, name: file.name, size: file.size, percent: 0 })
  return false
}
const handleRemoveUploadFile = uid => { uploadFiles.value = uploadFiles.value.filter(file => file.uid !== uid) }
const formatFileSize = size => size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(size / 1024)}KB`
const handleStartUpload = () => {
  if (!uploadFiles.value.length) { message.warning('请选择需要上传的文件'); return }
  uploadLoading.value = true
  try { uploadFiles.value = uploadFiles.value.map(file => ({ ...file, percent: 100 })); message.success('文件已加入上传队列') } finally { uploadLoading.value = false }
}
const handleDownloadDocument = record => message.info(`${record.name} 为原型文件`)
const handleDeleteDocument = record => { documentRows.value = documentRows.value.filter(item => item.id !== record.id); message.success('文件删除成功') }
const handleCreateReport = () => {
  reportMode.value = 'create'
  editingReportId.value = null
  Object.assign(reportForm, createDefaultReportForm())
  reportVisible.value = true
}
const handleEditReport = record => {
  reportMode.value = 'edit'
  editingReportId.value = record.id
  Object.assign(reportForm, { title: record.title, type: record.type, status: record.status, planDate: dayjs(record.planTime), actualDate: record.actualTime === '-' ? undefined : dayjs(record.actualTime), task: record.task, target: record.target, place: record.place, description: record.description })
  reportVisible.value = true
}
const handleSubmitReport = async () => {
  if (reportSubmitLoading.value) return
  await reportFormRef.value?.validate()
  reportSubmitLoading.value = true
  try {
    const reportData = { title: reportForm.title, type: reportForm.type, status: reportForm.status, planTime: reportForm.planDate.format('YYYY-MM-DD HH:mm'), actualTime: reportForm.actualDate?.format('YYYY-MM-DD HH:mm') || '-', task: reportForm.task, target: reportForm.target, place: reportForm.place, description: reportForm.description }
    if (editingReportId.value) {
      const index = reportRows.value.findIndex(item => item.id === editingReportId.value)
      reportRows.value[index] = { ...reportRows.value[index], ...reportData }
      message.success('汇报编辑成功')
    } else {
      const nextId = Math.max(...reportRows.value.map(item => item.id)) + 1
      reportRows.value.unshift({ id: nextId, ...reportData })
      message.success('汇报新建成功')
    }
    reportVisible.value = false
  } finally { reportSubmitLoading.value = false }
}
const handleSubmit = async () => {
  if (submitLoading.value) return
  await formRef.value?.validate()
  submitLoading.value = true
  try {
    if (editingId.value) { const index = projects.value.findIndex(item => item.id === editingId.value); projects.value[index] = { ...projects.value[index], ...formState }; message.success('项目编辑成功') }
    else { projects.value.unshift({ ...formState, id: Math.max(...projects.value.map(item => item.id)) + 1 }); message.success('项目新建成功') }
    handleBack()
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
.gantt-scroll :deep(.bar-wrapper) { cursor: default; }
.gantt-scroll :deep(.gantt-not-started .bar), .gantt-scroll :deep(.gantt-not-started .bar-progress) { fill: #aeaeb2; stroke: #aeaeb2; }
.gantt-scroll :deep(.gantt-in-progress .bar) { fill: #d6eaff; stroke: #0a84ff; }.gantt-scroll :deep(.gantt-in-progress .bar-progress) { fill: #0a84ff; }
.gantt-scroll :deep(.gantt-due-soon .bar), .gantt-scroll :deep(.gantt-due-soon .bar-progress) { fill: #ffd60a; stroke: #d6a600; }
.gantt-scroll :deep(.gantt-completed .bar), .gantt-scroll :deep(.gantt-completed .bar-progress) { fill: #30d158; stroke: #248a3d; }
.gantt-scroll :deep(.gantt-overdue .bar), .gantt-scroll :deep(.gantt-overdue .bar-progress) { fill: #ff453a; stroke: #d70015; }
.gantt-scroll :deep(.gantt-milestone .bar), .gantt-scroll :deep(.gantt-milestone .bar-progress) { fill: #30d158; stroke: #248a3d; transform: rotate(45deg) scale(0.72); transform-box: fill-box; transform-origin: center; }
.gantt-scroll :deep(.gantt-completed .bar-label), .gantt-scroll :deep(.gantt-overdue .bar-label), .gantt-scroll :deep(.gantt-in-progress .bar-label) { fill: #fff; }
.gantt-scroll :deep(.gantt-due-soon .bar-label), .gantt-scroll :deep(.gantt-not-started .bar-label) { fill: #1d1d1f; }
.gantt-scroll :deep(.gantt-milestone .bar-label) { fill: #248a3d; transform: translateX(12px); }
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
