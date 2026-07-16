<template>
  <div class="execution-detail">
    <div class="execution-detail__heading">
      <a-button @click="handleBack"><ArrowLeftOutlined />返回</a-button>
      <a-tag color="processing">{{ currentProject?.status || '-' }}</a-tag>
    </div>

    <section class="execution-summary">
      <table class="execution-summary-table">
        <tbody>
          <tr v-for="(row, rowIndex) in summaryRows" :key="rowIndex">
            <template v-for="item in row" :key="item.label">
              <th>{{ item.label }}</th>
              <td>
                <a-tag v-if="item.tag" :color="item.color">{{ item.value }}</a-tag>
                <template v-else>{{ item.value }}</template>
              </td>
            </template>
            <template v-for="index in 4 - row.length" :key="`empty-${rowIndex}-${index}`">
              <th></th>
              <td></td>
            </template>
          </tr>
        </tbody>
      </table>
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
          <div><strong>{{ taskPagination.total }}</strong><span>关联任务</span></div>
          <div><strong class="danger">{{ bugPagination.total }}</strong><span>关联Bug</span></div>
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
        <div class="gantt-workspace" :style="{ gridTemplateColumns: `${$px2rem(ganttTableWidth)} minmax(0, 1fr)`, height: $px2rem(ganttWorkspaceHeight) }">
          <a-table class="gantt-node-table" row-key="id" :columns="ganttNodeColumns" :data-source="ganttNodeRows" :loading="detailLoading" :pagination="false" :custom-row="handleGanttRow" size="small" table-layout="fixed">
            <template #bodyCell="{ column, record, text }">
              <template v-if="column.dataIndex === 'status'"><a-tag :color="ganttStatusColors[text]">{{ text }}</a-tag></template>
              <template v-else-if="column.dataIndex === 'progress'"><a-progress :percent="text" size="small" /></template>
              <template v-else-if="column.dataIndex === 'planTime' || column.dataIndex === 'actualTime'">
                <span class="date-range" :class="{ 'date-overdue': column.dataIndex === 'actualTime' && record.isOverdue }">
                  <template v-if="text === '-'">-</template>
                  <template v-else>
                    <span>{{ text.split(' ~ ')[0] }}</span>
                    <span>{{ text.split(' ~ ')[1] }}</span>
                  </template>
                </span>
              </template>
            </template>
          </a-table>
          <div ref="ganttRef" class="gantt-scroll"></div>
        </div>
      </div>

      <div v-show="activeTab === 'tasks'" class="execution-tab-panel">
        <h3>全局风险预警</h3>
        <div class="risk-grid">
          <div v-for="risk in risks" :key="risk.label" class="semantic-card" :class="risk.class">
            <span class="semantic-card__icon"><component :is="risk.icon" /></span>
            <span class="semantic-card__content"><span>{{ risk.label }}</span><strong>{{ risk.value }}</strong><small>{{ risk.desc }}</small></span>
          </div>
        </div>
        <div class="section-heading">
          <h3>任务列表</h3>
          <a-space><a-select value="全部状态" :options="taskStatusFilters" /><a-select value="全部负责人" :options="personFilterOptions" /></a-space>
        </div>
        <a-table row-key="id" class="project-task-table" :columns="taskColumns" :data-source="taskRows" :loading="taskLoading" :pagination="false" size="small" :scroll="{ x: 1390, y: 500 }">
          <template #bodyCell="{ column, record, text }">
            <a-button v-if="column.dataIndex === 'name'" type="link" @click="handleTaskDetail(record)">{{ text }}</a-button>
            <a-tag v-else-if="column.dataIndex === 'priority'" color="red">{{ text }}</a-tag>
            <a-tag v-else-if="column.dataIndex === 'riskLevel'" :color="getTaskRiskColor(text)">{{ text }}</a-tag>
          </template>
        </a-table>
        <a-pagination class="detail-list-pagination" :current="taskPagination.current" :page-size="taskPagination.pageSize" :total="taskPagination.total" :page-size-options="taskPagination.pageSizeOptions" :show-total="taskPagination.showTotal" show-size-changer @change="(page, pageSize) => handleTablePaginationChange(taskPagination, page, pageSize, fetchTaskPage)" />
      </div>

      <div v-show="activeTab === 'bugs'" class="execution-tab-panel">
        <h3>Bug 总览</h3>
        <div class="bug-summary">
          <div v-for="item in bugSummary" :key="item.label" class="semantic-card" :class="item.class">
            <span class="semantic-card__icon"><component :is="item.icon" /></span>
            <span class="semantic-card__content"><span>{{ item.label }}</span><strong>{{ item.value }} 个</strong></span>
          </div>
        </div>
        <div class="section-heading">
          <h3>Bug 列表</h3>
          <a-space><a-select value="全部状态" :options="bugStatusFilters" /><a-select value="全部指定人" :options="personFilterOptions" /></a-space>
        </div>
        <a-table row-key="id" class="project-bug-table" :columns="bugColumns" :data-source="bugRows" :loading="bugLoading" :pagination="false" size="small" :scroll="{ x: 840, y: 500 }">
          <template #bodyCell="{ column, record, text }">
            <a-button v-if="column.dataIndex === 'title'" type="link" @click="handleBugDetail(record)">{{ text }}</a-button>
            <a-tag v-else-if="column.dataIndex === 'severity'" color="red">{{ text }}</a-tag>
            <a-tag v-else-if="column.dataIndex === 'status'" color="orange">{{ text }}</a-tag>
          </template>
        </a-table>
        <a-pagination class="detail-list-pagination" :current="bugPagination.current" :page-size="bugPagination.pageSize" :total="bugPagination.total" :page-size-options="bugPagination.pageSizeOptions" :show-total="bugPagination.showTotal" show-size-changer @change="(page, pageSize) => handleTablePaginationChange(bugPagination, page, pageSize, fetchBugPage)" />
      </div>

      <div v-show="activeTab === 'reports'" class="execution-tab-panel">
        <div class="section-heading">
          <h2>汇报管理 <small>（共 {{ reportPagination.total }} 条）</small></h2>
          <a-button type="primary" @click="handleCreateReport"><PlusOutlined />新建汇报</a-button>
        </div>
        <a-form class="report-filter app-filter-form" layout="inline">
          <a-form-item><a-input v-model:value="reportFilter.keyword" allow-clear placeholder="搜索汇报标题 / 汇报对象 / 地点方式" /></a-form-item>
          <a-form-item><a-select v-model:value="reportFilter.status" :options="reportStatusFilters" /></a-form-item>
          <a-form-item><a-range-picker v-model:value="reportFilter.dateRange" value-format="YYYY-MM-DD" /></a-form-item>
          <a-button @click="handleResetReportFilter">重置</a-button>
        </a-form>
        <a-table row-key="id" class="project-report-table" :columns="reportColumns" :data-source="filteredReportRows" :loading="reportLoading" :pagination="false" :scroll="{ x: 1040, y: 500 }" :custom-row="getReportCustomRow">
          <template #bodyCell="{ column, record, text }">
            <a-button v-if="column.dataIndex === 'title'" type="link" @click.stop="handleViewReport(record)">{{ text }}</a-button>
            <a-tag v-else-if="column.dataIndex === 'status'" color="green">{{ text }}</a-tag>
            <a-space v-else-if="column.dataIndex === 'operation'" :size="2" @click.stop>
              <a-button type="link" size="small" @click.stop="handleEditReport(record)">编辑</a-button>
              <a-popconfirm title="确定删除该汇报吗？" ok-text="删除" cancel-text="取消" @confirm="handleDeleteReport(record)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </a-table>
        <a-pagination class="detail-list-pagination" :current="reportPagination.current" :page-size="reportPagination.pageSize" :total="reportPagination.total" :page-size-options="reportPagination.pageSizeOptions" :show-total="reportPagination.showTotal" show-size-changer @change="(page, pageSize) => handleTablePaginationChange(reportPagination, page, pageSize, fetchReportPage)" />
      </div>

      <div v-show="activeTab === 'documents'" class="execution-tab-panel">
        <div class="document-toolbar">
          <a-space>
            <a-button type="primary" @click="handleOpenUploadModal"><UploadOutlined />上传文件</a-button>
            <a-button @click="handleCreateFolder"><FolderAddOutlined />新建文件夹</a-button>
            <a-button :disabled="!canBatchDownload" @click="handleBatchDownload"><DownloadOutlined />批量下载</a-button>
            <a-popconfirm title="确定删除选中的文件吗？" @confirm="handleDeleteDocuments"><a-button danger :disabled="selectedDocumentIds.length === 0"><DeleteOutlined />批量删除</a-button></a-popconfirm>
          </a-space>
          <a-input-search v-model:value="documentSearch" placeholder="搜索文件名、上传人、分类..." />
        </div>
        <div class="document-breadcrumb">
          <span>文件夹支持展开查看，上传时可选择目标文件夹。</span>
        </div>
        <h3>分类导航</h3>
        <div class="document-categories">
          <button v-for="item in documentCategories" :key="item.value" type="button" :class="[item.class, { active: item.active }]" @click="handleSelectDocumentCategory(item.value)">
            <span class="document-category__icon"><component :is="item.icon" /></span>
            <span>{{ item.label }}</span>
            <strong>{{ item.count }}</strong>
          </button>
        </div>
        <a-table row-key="id" class="project-document-table" :row-selection="documentRowSelection" :columns="documentColumns" :data-source="pagedDocumentRows" :loading="documentLoading" :pagination="false" :scroll="{ x: 1040, y: 200 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'name'">
              <button type="button" class="document-name" :class="{ 'document-name--folder': record.isFolder, 'document-name--child': record.isChildFile }" @click="record.isFolder ? handleToggleFolder(record) : handleDownloadDocument(record)">
                <FolderOpenOutlined v-if="record.isFolder" />
                <FileOutlined v-else />
                <span>{{ record.name }}</span>
              </button>
            </template>
            <template v-else-if="column.dataIndex === 'category'">
              <a-tag :color="record.isFolder ? 'gold' : 'blue'">{{ record.category }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'operation'">
              <a-space v-if="!record.isFolder">
                <a-button type="link" size="small" @click="handleDownloadDocument(record)">下载</a-button>
                <a-popconfirm title="确定删除该文件吗？" @confirm="handleDeleteDocument(record)"><a-button type="link" size="small" danger>删除</a-button></a-popconfirm>
              </a-space>
              <span v-else class="document-row-muted">-</span>
            </template>
          </template>
        </a-table>
        <a-pagination class="detail-list-pagination" :current="documentPagination.current" :page-size="documentPagination.pageSize" :total="filteredDocsBySearch.length" :page-size-options="documentPagination.pageSizeOptions" :show-total="documentPagination.showTotal" show-size-changer @change="(page, pageSize) => handleTablePaginationChange(documentPagination, page, pageSize)" />
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
          <a-button v-if="file.percent < 100" type="link" @click="handleRemoveUploadFile(file.uid)">取消</a-button>
          <CheckOutlined v-else class="upload-file-item__success" />
        </div>
        <a-empty v-if="uploadFiles.length === 0" description="暂无待上传文件" />
      </div>
      <a-form :model="uploadForm" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }" class="upload-form">
        <div class="upload-form__row">
          <a-form-item label="存储位置"><a-select v-model:value="uploadForm.location" :options="storageOptions" /></a-form-item>
          <a-form-item label="目标文件夹"><a-select v-model:value="uploadForm.folderId" allow-clear :options="folderOptions" placeholder="请选择目标文件夹" /></a-form-item>
          <a-form-item label="文件分类"><a-select v-model:value="uploadForm.category" :options="documentCategoryOptions" /></a-form-item>
        </div>
        <a-form-item label="版本说明"><a-textarea v-model:value="uploadForm.description" :rows="4" placeholder="请输入版本更新说明..." /></a-form-item>
      </a-form>
      <div class="upload-modal-actions"><a-button @click="uploadVisible = false">取消</a-button><a-button type="primary" :loading="uploadLoading" @click="handleStartUpload">开始上传</a-button></div>
    </a-modal>

    <a-modal v-model:open="reportDetailVisible" class="report-detail-modal" :width="1120" :footer="null" destroy-on-close>
      <a-spin :spinning="reportDetailLoading">
        <div v-if="currentReportDetail" class="report-detail-view">
          <div class="report-detail-header">
            <strong>{{ currentReportDetail.title }}</strong>
          </div>

          <div class="report-detail-info-table">
            <div class="report-detail-info-grid">
              <span>类型</span><strong>{{ currentReportDetail.type }}</strong>
              <span>状态</span><strong><a-tag color="processing">{{ currentReportDetail.status }}</a-tag></strong>
              <span>汇报对象</span><strong>{{ currentReportDetail.target }}</strong>
              <span>地点/方式</span><strong>{{ currentReportDetail.place }}</strong>
              <span>计划日期</span><strong>{{ currentReportDetail.planTime }}</strong>
              <span>实际日期</span><strong>{{ currentReportDetail.actualTime }}</strong>
              <span>创建时间</span><strong>{{ currentReportDetail.createdAt }}</strong>
              <span>任务进度</span>
              <strong class="report-detail-progress">
                <a-progress :percent="currentReportDetail.progress" :show-info="false" size="small" />
                <em>{{ currentReportDetail.progress }}%</em>
              </strong>
            </div>
            <div class="report-detail-description">
              <span>描述</span>
              <p>{{ currentReportDetail.description }}</p>
            </div>
          </div>

          <div class="report-detail-section-title">
            <FileTextOutlined />
            <span>准备工作 ({{ currentReportDetail.items.length }})</span>
          </div>
          <div class="report-detail-remark">
            <label>备注：</label>
            <a-textarea v-model:value="reportDetailRemark" :rows="3" placeholder="请输入备注" />
          </div>
          <div class="report-detail-remark-actions">
            <a-button type="primary" @click="handleConfirmReportRemark">确认</a-button>
          </div>
          <div class="report-task-toolbar">
            <a-button type="primary" @click="handleAddReportTask">添加任务</a-button>
            <a-radio-group v-model:value="reportDetailTaskType" button-style="solid">
              <a-radio-button value="meeting">会议任务</a-radio-button>
              <a-radio-button value="related">关联任务</a-radio-button>
            </a-radio-group>
          </div>
          <a-table row-key="id" :columns="reportItemColumns" :data-source="currentReportDetail.items" :pagination="false" size="small" :scroll="{ x: 980 }">
            <template #bodyCell="{ column, text }">
              <a-tag v-if="column.dataIndex === 'priority'" color="red">{{ text }}</a-tag>
              <a-tag v-else-if="column.dataIndex === 'status'" color="processing">{{ text }}</a-tag>
            </template>
          </a-table>

          <div class="report-detail-section-title report-detail-log-title">
            <FileTextOutlined />
            <span>操作日志</span>
          </div>
          <a-timeline v-if="currentReportDetail.logs.length" class="report-detail-logs">
            <a-timeline-item v-for="log in currentReportDetail.logs" :key="log.id">
              <span class="report-detail-log-meta">{{ log.time }}　{{ log.user }}</span>
              <p>{{ log.content }}</p>
            </a-timeline-item>
          </a-timeline>
          <a-empty v-else description="暂无操作日志" />
        </div>
        <a-empty v-else-if="!reportDetailLoading" description="暂无汇报详情" />
      </a-spin>
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

    <a-modal
      v-model:open="folderVisible"
      title="新建文件夹"
      :width="460"
      :confirm-loading="folderLoading"
      ok-text="确定"
      cancel-text="取消"
      destroy-on-close
      @ok="handleSubmitFolder"
      @cancel="folderName = ''"
    >
      <a-form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="文件夹名称" required>
          <a-input v-model:value="folderName" placeholder="请输入文件夹名称" maxlength="50" show-count />
        </a-form-item>
      </a-form>
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
  FolderAddOutlined,
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
  createProjectFolder,
  createProjectReport,
  deleteProjectReport,
  deleteProjectFile,
  deleteProjectFiles,
  downloadProjectFile,
  downloadProjectFiles,
  getDicts,
  getGanttNodes,
  getGanttSummary,
  getProjectBugs,
  getProjectDetail,
  getProjectFiles,
  getProjectReportDetail,
  getProjectFolders,
  getProjectReports,
  getProjectTasks,
  getSystemUsers,
  updateProjectReport,
  updateGanttNode,
  uploadProjectFile,
} from '@/api/managementProject'
import { formatDateTime } from '@/utils/dateTime'
import { OPERATION_ACTIONS, OPERATION_MODULES, recordOperationLog } from '@/utils/operationLog'

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
const selectedDocumentCategory = ref('全部')
const documentSearch = ref('')
const uploadVisible = ref(false)
const uploadLoading = ref(false)

const reportVisible = ref(false)
const reportDetailVisible = ref(false)
const reportDetailLoading = ref(false)
const currentReportDetail = ref(null)
const reportDetailRemark = ref('')
const reportDetailTaskType = ref('meeting')

const folderVisible = ref(false)
const folderLoading = ref(false)
const folderName = ref('')
const folderRows = ref([])
const expandedFolderIds = ref([])
const ganttEditVisible = ref(false)
const ganttSubmitLoading = ref(false)
const uploadFiles = ref([])
const managerOptions = ref([])
const taskStatusOptions = ref([])
const reportTypeOptions = ref([])
const reportStatusOptions = ref([])
const fileCategoryOptions = ref([])
const dictLabels = reactive({})
let ganttInstance

const toOptions = values => values.map(value => ({ label: value, value }))
const detailTabs = [
  { key: 'gantt', label: '项目甘特图', icon: ProjectOutlined },
  { key: 'tasks', label: '任务列表', icon: ProfileOutlined },
  { key: 'bugs', label: 'Bug列表', icon: BugOutlined },
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
  { title: '计划时间', dataIndex: 'planTime', width: 120 },
  { title: '实际时间', dataIndex: 'actualTime', width: 120 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '进度', dataIndex: 'progress', width: 160 },
]
const ganttTableWidth = ganttNodeColumns.reduce((total, column) => total + column.width, 0)
const ganttNodeRows = ref([])
const ganttWorkspaceHeight = computed(() => 86 + ganttNodeRows.value.length * 72)
const formatDateRange = (start, end) => start === '-' && end === '-' ? '-' : `${start} ~ ${end}`
const normalizeGanttEnd = (start, end, status) => {
  const startDate = dayjs(start)
  const endDate = dayjs(end)
  return status === '里程碑' || !endDate.isAfter(startDate) ? endDate.add(1, 'day').format('YYYY-MM-DD') : end
}
const ganttTasks = computed(() => {
  const validRows = ganttNodeRows.value.filter(node => node.planStart !== '-' && node.planEnd !== '-')
  const fallbackStart = validRows[0]?.planStart?.replaceAll('/', '-') || dayjs().format('YYYY-MM-DD')
  let previousVisibleTaskId
  return ganttNodeRows.value.map(node => {
    const hasPlanTime = node.planStart !== '-' && node.planEnd !== '-'
    const taskId = String(node.id)
    const task = {
      id: taskId,
      name: node.name,
      start: hasPlanTime ? node.planStart.replaceAll('/', '-') : fallbackStart,
      end: hasPlanTime ? normalizeGanttEnd(node.planStart.replaceAll('/', '-'), node.planEnd.replaceAll('/', '-'), node.status) : dayjs(fallbackStart).add(1, 'day').format('YYYY-MM-DD'),
      planStart: node.planStart,
      actualStart: node.actualStart,
      planEnd: node.planEnd,
      actualEnd: node.actualEnd,
      progress: hasPlanTime ? node.progress : 0,
      dependencies: hasPlanTime && previousVisibleTaskId ? previousVisibleTaskId : undefined,
      custom_class: hasPlanTime ? ganttStatusClasses[node.status] : 'gantt-empty-row',
    }
    if (hasPlanTime) previousVisibleTaskId = taskId
    return task
  })
})
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

const taskRiskKey = task => {
  if (task.statusCode === 'DUE_SOON') return 'due'
  if (task.statusCode !== 'OVERDUE') return 'normal'
  const days = task.planEnd && task.planEnd !== '-' ? dayjs().diff(dayjs(task.planEnd), 'day') : 0
  return days >= 3 ? 'high' : 'medium'
}
const risks = computed(() => {
  const counts = { high: 0, medium: 0, due: 0, normal: 0 }
  for (const task of taskRows.value) counts[taskRiskKey(task)]++
  return [
    { label: '高风险任务', value: `${counts.high} 个`, desc: '延期 ≥ 3 天', class: 'risk-high', icon: FireOutlined },
    { label: '中风险任务', value: `${counts.medium} 个`, desc: '延期 1 - 2 天', class: 'risk-medium', icon: WarningOutlined },
    { label: '即将到期', value: `${counts.due} 个`, desc: '未来 3 天内到期', class: 'risk-due', icon: ClockCircleOutlined },
    { label: '按计划进行', value: `${counts.normal} 个`, desc: '无延期风险', class: 'risk-normal', icon: CheckCircleOutlined },
  ]
})
const createTablePagination = () => reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  pageSizeOptions: ['10', '50', '100'],
  showTotal: total => `共 ${total} 条`,
})
const handleTablePaginationChange = async (target, page, pageSize, loadPage) => {
  target.current = page
  target.pageSize = pageSize
  if (loadPage) await loadPage()
}
const taskColumns = [
  { title: '序号', dataIndex: 'index', width: 70 },
  { title: '任务名称', dataIndex: 'name', width: 190 },
  { title: '风险等级', dataIndex: 'riskLevel', width: 100 },
  { title: '角色', dataIndex: 'role', width: 100 },
  { title: '标签', dataIndex: 'tag', width: 120 },
  { title: '负责人', dataIndex: 'owner', width: 100 },
  { title: '优先级', dataIndex: 'priority', width: 90 },
  { title: '计划开始日期', dataIndex: 'planStart', width: 130 },
  { title: '计划结束日期', dataIndex: 'planEnd', width: 130 },
  { title: '实际开始日期', dataIndex: 'actualStart', width: 130 },
  { title: '实际完成日期', dataIndex: 'actualEnd', width: 130 },
]
const taskPagination = createTablePagination()
const taskRows = ref([])
const taskStatusFilters = toOptions(['全部状态', '未开始', '进行中', '已完成'])
const personFilterOptions = toOptions(['全部负责人', '全部指定人', '张三', '李四', '王五'])
const bugSummary = computed(() => [{ label: '严重', value: bugRows.value.filter(item => item.priorityCode === 'URGENT' || item.severity === '严重').length, class: 'bug-severe', icon: ExclamationCircleOutlined }, { label: '已提交', value: bugRows.value.filter(item => item.statusCode === 'PENDING_FIX').length, class: 'bug-submitted', icon: SendOutlined }, { label: '已确认', value: bugRows.value.filter(item => item.statusCode === 'FIXING').length, class: 'bug-confirmed', icon: ToolOutlined }, { label: '已关闭', value: bugRows.value.filter(item => item.statusCode === 'CLOSED').length, class: 'bug-closed', icon: CheckCircleOutlined }])
const bugColumns = [{ title: 'BUG ID', dataIndex: 'code', width: 130 }, { title: '标题', dataIndex: 'title', width: 220 }, { title: '严重级别', dataIndex: 'severity', width: 100 }, { title: '状态', dataIndex: 'status', width: 100 }, { title: '指定人', dataIndex: 'assignee', width: 90 }, { title: '创建人', dataIndex: 'creator', width: 90 }]
const bugPagination = createTablePagination()
const bugRows = ref([])
const bugStatusFilters = toOptions(['全部状态', '待处理', '修复中', '已完成'])
const reportStatusFilters = toOptions(['全部', '准备中', '进行中', '已完成'])
const reportColumns = [{ title: '汇报标题', dataIndex: 'title', width: 220 }, { title: '汇报类型', dataIndex: 'type', width: 110 }, { title: '状态', dataIndex: 'status', width: 100 }, { title: '计划时间', dataIndex: 'planTime', width: 150 }, { title: '实际时间', dataIndex: 'actualTime', width: 150 }, { title: '汇报对象', dataIndex: 'target', width: 110 }, { title: '地点/方式', dataIndex: 'place', width: 120 }, { title: '操作', dataIndex: 'operation', width: 140, fixed: 'right' }]
const reportPagination = createTablePagination()
const reportRows = ref([])
const reportItemColumns = [
  { title: '任务', dataIndex: 'content', width: 240 },
  { title: '负责人', dataIndex: 'owner', width: 100 },
  { title: '优先级', dataIndex: 'priority', width: 90 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '截止日期', dataIndex: 'plannedDate', width: 120 },
  { title: '备注', dataIndex: 'description', width: 180 },
]
const reportFilter = reactive({ keyword: '', status: '全部', dateRange: [] })
const reportMode = ref('create')
const reportFormRef = ref()
const reportSubmitLoading = ref(false)
const editingReportId = ref(null)
const createDefaultReportForm = () => ({ title: '', type: 'WEEKLY', status: 'DRAFT', planDate: undefined, actualDate: undefined, task: undefined, target: '', place: '', description: '' })
const reportForm = reactive(createDefaultReportForm())
const reportTaskOptions = computed(() => taskRows.value.map(item => ({ label: item.name, value: item.id })))
const reportRules = { title: [{ required: true, message: '请输入汇报标题', trigger: 'blur' }], type: [{ required: true, message: '请选择汇报类型', trigger: 'change' }], status: [{ required: true, message: '请选择汇报状态', trigger: 'change' }], planDate: [{ required: true, message: '请选择计划日期', trigger: 'change' }], target: [{ required: true, message: '请输入汇报对象', trigger: 'blur' }], place: [{ required: true, message: '请输入地点或汇报方式', trigger: 'blur' }], description: [{ required: true, message: '请输入汇报描述', trigger: 'blur' }] }
const filteredReportRows = computed(() => reportRows.value.filter(record => {
  const keyword = reportFilter.keyword.trim()
  if (keyword) {
    const content = [record.title, record.target, record.place, record.description, record.taskName].filter(Boolean).join(' ')
    if (!content.includes(keyword)) return false
  }
  if (reportFilter.status && reportFilter.status !== '全部' && record.status !== reportFilter.status) return false
  if (reportFilter.dateRange?.length === 2) {
    const [startDate, endDate] = reportFilter.dateRange
    const planDate = record.planTime
    if (!planDate) return false
    const current = dayjs(planDate)
    if (current.isBefore(dayjs(startDate), 'day') || current.isAfter(dayjs(endDate), 'day')) return false
  }
  return true
}))
watch(reportFilter, async () => {
  reportPagination.current = 1
  await fetchReportPage()
})
const documentCategoryMeta = computed(() => {
  const fallback = [
    { label: '合同类', value: 'CONTRACT' },
    { label: '需求类', value: 'REQUIREMENT' },
    { label: '设计类', value: 'DESIGN' },
    { label: '开发类', value: 'DEVELOPMENT' },
    { label: '验收类', value: 'ACCEPTANCE' },
  ]
  return fileCategoryOptions.value.length ? fileCategoryOptions.value : fallback
})
const documentCategories = computed(() => {
  const files = documentDisplayRows.value
  return [{ label: '全部', value: '全部', count: files.length, class: 'category-all', icon: FolderOpenOutlined }, ...documentCategoryMeta.value.map((item, index) => ({ label: item.label, value: item.value, count: files.filter(file => file.categoryCode === item.value || file.category === item.label).length, class: ['category-contract', 'category-requirement', 'category-design', 'category-development', 'category-acceptance'][index], icon: [FileProtectOutlined, FileTextOutlined, SnippetsOutlined, CodeOutlined, FileDoneOutlined][index] }))].map(item => ({ ...item, active: item.value === selectedDocumentCategory.value }))
})
const documentColumns = [{ title: '文件名', dataIndex: 'name' }, { title: '类型', dataIndex: 'type', width: 90 }, { title: '大小', dataIndex: 'size', width: 90 }, { title: '版本', dataIndex: 'version', width: 80 }, { title: '上传人', dataIndex: 'uploader', width: 80 }, { title: '分类', dataIndex: 'category', width: 90 }, { title: '上传时间', dataIndex: 'uploadTime', width: 170 }, { title: '操作', dataIndex: 'operation', width: 120 }]
const documentPagination = createTablePagination()
const documentRows = ref([])
const folderOptions = computed(() => folderRows.value.map(folder => ({ label: folder.name, value: folder.id })))
const isFolderExpanded = folderId => expandedFolderIds.value.map(String).includes(String(folderId))
const folderDisplayRows = computed(() => folderRows.value.map(folder => ({
  id: `folder-${folder.id}`,
  folderId: folder.id,
  name: folder.name,
  type: '文件夹',
  size: '-',
  version: '-',
  uploader: '-',
  category: '文件夹',
  uploadTime: formatDateTime(folder.createdAt),
  isFolder: true,
  expanded: isFolderExpanded(folder.id),
})))
const matchesDocumentCategory = file => selectedDocumentCategory.value === '全部' || file.categoryCode === selectedDocumentCategory.value || file.category === selectedDocumentCategory.value
const documentDisplayRows = computed(() => documentRows.value.map(file => ({ ...file, isFolder: false, parentFolderId: file.folderId || null })))
const rootDocumentRows = computed(() => documentDisplayRows.value.filter(file => !file.parentFolderId && matchesDocumentCategory(file)))
const filesByFolderId = computed(() => {
  const grouped = new Map()
  documentDisplayRows.value.forEach(file => {
    if (!file.parentFolderId || !matchesDocumentCategory(file)) return
    const key = String(file.parentFolderId)
    grouped.set(key, [...(grouped.get(key) || []), { ...file, rowKey: `folder-${key}-file-${file.id}`, isChildFile: true }])
  })
  return grouped
})
const filteredDocumentRows = computed(() => {
  const rows = [...rootDocumentRows.value]
  folderDisplayRows.value.forEach(folder => {
    const children = filesByFolderId.value.get(String(folder.folderId)) || []
    if (selectedDocumentCategory.value !== '全部' && children.length === 0) return
    rows.push(folder)
    if (folder.expanded) rows.push(...children)
  })
  return rows
})
const canBatchDownload = computed(() => selectedDocumentIds.value.length > 0)
const folderKey = folderId => `folder-${folderId}`
const getFolderFileIds = folderId => documentRows.value
  .filter(file => String(file.folderId || '') === String(folderId))
  .map(file => file.id)
const normalizeDocumentSelection = keys => {
  const selected = new Set(keys)
  folderRows.value.forEach(folder => {
    const key = folderKey(folder.id)
    const childIds = getFolderFileIds(folder.id)
    if (!childIds.length) return
    if (childIds.every(id => selected.has(id))) selected.add(key)
    else selected.delete(key)
  })
  return Array.from(selected)
}
const handleDocumentSelect = (record, checked) => {
  const next = new Set(selectedDocumentIds.value)
  if (record.isFolder) {
    const key = folderKey(record.folderId)
    const childIds = getFolderFileIds(record.folderId)
    if (checked) {
      next.add(key)
      childIds.forEach(id => next.add(id))
    } else {
      next.delete(key)
      childIds.forEach(id => next.delete(id))
    }
  } else if (checked) {
    next.add(record.id)
  } else {
    next.delete(record.id)
  }
  selectedDocumentIds.value = normalizeDocumentSelection(Array.from(next))
}
const handleDocumentSelectAll = selected => {
  const next = new Set(selectedDocumentIds.value)
  filteredDocumentRows.value.forEach(row => {
    const key = row.isFolder ? folderKey(row.folderId) : row.id
    if (selected) next.add(key)
    else next.delete(key)
    if (row.isFolder) {
      getFolderFileIds(row.folderId).forEach(id => selected ? next.add(id) : next.delete(id))
    }
  })
  selectedDocumentIds.value = normalizeDocumentSelection(Array.from(next))
}
const documentRowSelection = computed(() => ({
  selectedRowKeys: selectedDocumentIds.value,
  onSelect: handleDocumentSelect,
  onSelectAll: handleDocumentSelectAll,
}))
const filteredDocsBySearch = computed(() => {
  const q = documentSearch.value.trim().toLowerCase()
  if (!q) return filteredDocumentRows.value
  return filteredDocumentRows.value.filter(row =>
    [row.name, row.uploader, row.category].some(v => v && v.toLowerCase().includes(q))
  )
})
const pagedDocumentRows = computed(() => {
  const start = (documentPagination.current - 1) * documentPagination.pageSize
  return filteredDocsBySearch.value.slice(start, start + documentPagination.pageSize)
})
watch([documentSearch, selectedDocumentCategory], () => {
  documentPagination.current = 1
})
const uploadForm = reactive({ location: '项目文档库', folderId: undefined, category: 'REQUIREMENT', description: '' })
const storageOptions = toOptions(['项目文档库', '公共文档库'])
const documentCategoryOptions = computed(() => documentCategoryMeta.value.map(item => ({ label: item.label, value: item.value })))
const summaryItems = computed(() => [
  { label: '项目名称', value: currentProject.value?.name || '-' },
  { label: '项目类型', value: '执行类项目' },
  { label: '业务部门', value: currentProject.value?.department || '-' },
  { label: '项目经理', value: currentProject.value?.manager || '-' },
  { label: '项目阶段', value: currentProject.value?.stage || '-' },
  { label: '项目状态', value: currentProject.value?.status || '-', tag: true, color: 'processing' },
  { label: '计划开始', value: currentProject.value?.plannedStartDate || '-' },
  { label: '计划结束', value: currentProject.value?.plannedEndDate || '-' },
  { label: '项目描述', value: currentProject.value?.description || '-' },
])
const summaryRows = computed(() => {
  const rows = []
  for (let i = 0; i < summaryItems.value.length; i += 4) {
    rows.push(summaryItems.value.slice(i, i + 4))
  }
  return rows
})
const getDictLabel = (type, value) => dictLabels[type]?.[value] || value || '-'
const getUserName = id => managerOptions.value.find(item => item.value === id)?.label || (id ? `用户 ${id}` : '-')
const resolveFileCategory = value => {
  const matched = fileCategoryOptions.value.find(item => item.value === value || item.label === value)
  return { value: matched?.value || value || '-', label: matched?.label || value || '-' }
}

const isFinishedStatus = value => ['COMPLETED', 'DONE', 'FINISHED', '已完成'].includes(value)
const mapReportDetail = report => {
  const items = (report.items || []).map(item => ({
    id: item.id,
    content: item.content || '-',
    owner: getUserName(item.ownerId),
    priority: getDictLabel('taskPriority', item.priority),
    status: getDictLabel('taskStatus', item.status),
    statusCode: item.status,
    plannedDate: item.plannedDate || '-',
    description: item.description || '-',
  }))
  const completedCount = items.filter(item => isFinishedStatus(item.statusCode) || isFinishedStatus(item.status)).length
  const logs = []
  if (report.updatedAt && report.updatedAt !== report.createdAt) {
    logs.push({ id: 'updated', time: formatDateTime(report.updatedAt), user: getUserName(report.updatedBy), content: '更新项目汇报信息' })
  }
  if (report.createdAt) {
    logs.push({ id: 'created', time: formatDateTime(report.createdAt), user: getUserName(report.createdBy), content: `新建汇报【${report.title}】，状态${getDictLabel('reportStatus', report.status)}` })
  }

  return {
    id: report.id,
    title: report.title || '-',
    type: getDictLabel('reportType', report.reportType),
    status: getDictLabel('reportStatus', report.status),
    planTime: report.plannedDate || '-',
    actualTime: report.actualDate || '-',
    target: report.targetAudience || '-',
    place: report.locationMethod || '-',
    description: report.description || '-',
    createdAt: formatDateTime(report.createdAt),
    progress: items.length ? Math.round((completedCount / items.length) * 100) : 0,
    items,
    logs,
  }
}
const mapProject = project => ({
  ...project,
  department: project.department || project.businessDepartment || '-',
  manager: getUserName(project.managerId),
  stage: getDictLabel('projectStage', project.stage),
  stageCode: project.stage,
  status: getDictLabel('projectStatus', project.status),
  statusCode: project.status,
})
const handleBack = () => router.push({ name: 'ExecutionProjects' })
const handleTaskDetail = record => router.push({ name: 'AllTasks', query: { detail: 'task', taskId: String(record.id) } })
const handleBugDetail = record => router.push({ name: 'BugDetail', params: { id: String(record.id) } })
const formatFileSize = size => size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil((size || 0) / 1024)}KB`
const formatNodeDate = value => {
  if (!value || value === '-') return undefined
  const date = dayjs(String(value).replaceAll('/', '-'))
  return date.isValid() ? date.format('YYYY-MM-DD') : undefined
}
const getStatusLabel = value => ganttStatusOptions.value.find(item => item.value === value)?.label || getDictLabel('taskStatus', value)

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
    reportTypeOptions.value = dictGroups.find(item => item.type === 'reportType')?.items || []
    reportStatusOptions.value = dictGroups.find(item => item.type === 'reportStatus')?.items || []
    fileCategoryOptions.value = dictGroups.find(item => item.type === 'fileCategory')?.items || []
    managerOptions.value = userPage.records.map(user => ({ label: user.realName, value: user.id }))
  } catch (error) {
    message.error(error.message)
  }
}

const getTaskRiskLevel = task => {
  if (task.status === 'OVERDUE') {
    const overdueDays = task.plannedEndDate ? dayjs().diff(dayjs(task.plannedEndDate), 'day') : 0
    return overdueDays >= 3 ? '高风险' : '中风险'
  }
  return task.status === 'DUE_SOON' ? '中风险' : '低风险'
}
const getTaskRiskColor = riskLevel => ({ 高风险: 'red', 中风险: 'orange', 低风险: 'green' }[riskLevel] || 'default')
const mapTaskRow = (task, index) => ({
  id: task.id,
  index: (taskPagination.current - 1) * taskPagination.pageSize + index + 1,
  name: task.name,
  riskLevel: getTaskRiskLevel(task),
  role: task.roleName || '-',
  tag: task.tags || '-',
  owner: getUserName(task.assigneeId),
  priority: getDictLabel('taskPriority', task.priority),
  priorityCode: task.priority,
  status: getDictLabel('taskStatus', task.status),
  statusCode: task.status,
  planStart: task.plannedStartDate || '-',
  planEnd: task.plannedEndDate || '-',
  actualStart: task.actualStartDate || '-',
  actualEnd: task.actualEndDate || '-',
})
const mapBugRow = bug => ({ id: bug.id, code: `BUG-${bug.id}`, title: bug.title, severity: getDictLabel('bugPriority', bug.priority), priorityCode: bug.priority, status: getDictLabel('bugStatus', bug.status), statusCode: bug.status, assignee: getUserName(bug.assigneeId), creator: getUserName(bug.creatorId) })
const mapReportRow = report => ({ id: report.id, title: report.title, type: getDictLabel('reportType', report.reportType), status: getDictLabel('reportStatus', report.status), planTime: report.plannedDate, actualTime: report.actualDate || '-', target: report.targetAudience, place: report.locationMethod })
const applyTaskResult = result => {
  taskRows.value = result.records.map(mapTaskRow)
  taskPagination.total = result.total ?? result.records.length
}
const applyBugResult = result => {
  bugRows.value = result.records.map(mapBugRow)
  bugPagination.total = result.total ?? result.records.length
}
const applyReportResult = result => {
  reportRows.value = result.records.map(mapReportRow)
  reportPagination.total = result.total ?? result.records.length
}
const getReportQueryParams = projectId => {
  const status = reportStatusOptions.value.find(item => item.label === reportFilter.status || item.value === reportFilter.status)?.value
  return {
    projectId,
    pageNo: reportPagination.current,
    pageSize: reportPagination.pageSize,
    keyword: reportFilter.keyword.trim() || undefined,
    status: reportFilter.status === '全部' ? undefined : status,
    plannedDateFrom: reportFilter.dateRange?.[0],
    plannedDateTo: reportFilter.dateRange?.[1],
  }
}
const fetchTaskPage = async () => {
  taskLoading.value = true
  try {
    applyTaskResult(await getProjectTasks({ projectId: route.params.id, pageNo: taskPagination.current, pageSize: taskPagination.pageSize }))
  } catch (error) {
    message.error(error.message)
  } finally {
    taskLoading.value = false
  }
}
const fetchBugPage = async () => {
  bugLoading.value = true
  try {
    applyBugResult(await getProjectBugs({ projectId: route.params.id, pageNo: bugPagination.current, pageSize: bugPagination.pageSize }))
  } catch (error) {
    message.error(error.message)
  } finally {
    bugLoading.value = false
  }
}
const fetchReportPage = async () => {
  reportLoading.value = true
  try {
    applyReportResult(await getProjectReports(getReportQueryParams(route.params.id)))
  } catch (error) {
    message.error(error.message)
  } finally {
    reportLoading.value = false
  }
}

const fetchProjectRelatedData = async projectId => {
  detailLoading.value = true
  taskLoading.value = true
  bugLoading.value = true
  reportLoading.value = true
  documentLoading.value = true

  try {
    const [project, nodes, ganttResult, taskResult, bugResult, reportResult, files, folders] = await Promise.all([
      getProjectDetail(projectId),
      getGanttNodes(projectId),
      getGanttSummary(projectId),
      getProjectTasks({ projectId, pageNo: taskPagination.current, pageSize: taskPagination.pageSize }),
      getProjectBugs({ projectId, pageNo: bugPagination.current, pageSize: bugPagination.pageSize }),
      getProjectReports(getReportQueryParams(projectId)),
      getProjectFiles({ businessType: 'PROJECT', businessId: projectId }),
      getProjectFolders({ businessType: 'PROJECT', businessId: projectId }),
    ])
    currentProject.value = mapProject(project)
    void recordOperationLog({
      module: OPERATION_MODULES.EXECUTION_PROJECT,
      action: OPERATION_ACTIONS.DETAIL,
      bizType: 'PROJECT',
      bizId: projectId,
      bizName: currentProject.value?.name,
      detail: `查看执行类项目详情：${currentProject.value?.name || projectId}`,
      routeName: 'ExecutionProjectDetail',
    })
    Object.assign(ganttSummaryData, ganttResult)
    ganttNodeRows.value = nodes.map(node => {
      const planStart = node.plannedStartDate?.replaceAll('-', '/') || '-'
      const planEnd = node.plannedEndDate?.replaceAll('-', '/') || '-'
      const actualStart = node.actualStartDate?.replaceAll('-', '/') || '-'
      const actualEnd = node.actualEndDate?.replaceAll('-', '/') || '-'
      return { id: node.id, name: node.label || node.nodeName, planStart, planEnd, planTime: formatDateRange(planStart, planEnd), actualStart, actualEnd, actualTime: formatDateRange(actualStart, actualEnd), status: getDictLabel('taskStatus', node.status), statusCode: node.status, progress: node.progressPercent || 0, isOverdue: node.status === 'OVERDUE' }
    })
    applyTaskResult(taskResult)
    applyBugResult(bugResult)
    applyReportResult(reportResult)
    folderRows.value = folders || []
    expandedFolderIds.value = folderRows.value.map(folder => folder.id)
    documentRows.value = files.map(file => {
      const category = resolveFileCategory(file.fileCategory)
      return { id: file.id, folderId: file.folderId || null, name: file.originalName, type: file.originalName.split('.').pop()?.toUpperCase() || '-', size: formatFileSize(file.fileSize), version: file.versionNo || '-', uploader: getUserName(file.uploaderId), categoryCode: category.value, category: category.label, uploadTime: formatDateTime(file.uploadedAt) }
    })

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
    upper_header_height: 44,
    lower_header_height: 32,
    bar_height: 30,
    padding: 42,
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

const refreshFolders = async () => {
  folderRows.value = await getProjectFolders({ businessType: 'PROJECT', businessId: route.params.id })
  expandedFolderIds.value = folderRows.value.map(folder => folder.id)
}

const handleOpenUploadModal = async () => {
  try {
    await refreshFolders()
  } catch (error) {
    message.error(error.message || '目标文件夹加载失败')
  }
  uploadVisible.value = true
}

const handleToggleFolder = folder => {
  const folderId = folder?.folderId || folder?.id
  if (!folderId) return
  const key = String(folderId)
  expandedFolderIds.value = isFolderExpanded(key)
    ? expandedFolderIds.value.filter(id => String(id) !== key)
    : [...expandedFolderIds.value, folderId]
  selectedDocumentIds.value = []
}

const handleCreateFolder = () => {
  folderName.value = ''
  folderVisible.value = true
}

const handleSubmitFolder = async () => {
  const name = folderName.value.trim()
  if (!name) {
    message.warning('请输入文件夹名称')
    return
  }
  folderLoading.value = true
  try {
    const folder = await createProjectFolder({
      businessType: 'PROJECT',
      businessId: route.params.id,
      name,
    })
    folderRows.value = [folder, ...folderRows.value]
    expandedFolderIds.value = [...expandedFolderIds.value, folder.id]
    uploadForm.folderId = folder.id
    folderName.value = ''
    folderVisible.value = false
    selectedDocumentCategory.value = '全部'
    message.success('文件夹新建成功')
  } catch (error) {
    message.error(error.message || '文件夹新建失败')
  } finally {
    folderLoading.value = false
  }
}

const safeDownloadName = value => String(value || 'files').replace(/[\\/:*?"<>|]/g, '_')
const handleSelectDocumentCategory = category => {
  selectedDocumentCategory.value = category
  const visibleIds = new Set(filteredDocumentRows.value.map(item => item.isFolder ? folderKey(item.folderId) : item.id))
  selectedDocumentIds.value = normalizeDocumentSelection(selectedDocumentIds.value.filter(id => visibleIds.has(id)))
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
    ganttFormRef.value?.clearValidate()
    ganttEditVisible.value = true
  },
})

const handleSaveGanttNode = async () => {
  if (ganttSubmitLoading.value) return

  await ganttFormRef.value?.validate()
  ganttSubmitLoading.value = true

  try {
    await updateGanttNode(route.params.id, ganttForm.id, {
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
  if (file.size > 50 * 1024 * 1024) { message.warning('单个文件不能超过50MB'); return false }
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

  uploadLoading.value = true
  try {
    for (const uploadFile of uploadFiles.value) {
      const data = new FormData()
      data.append('businessType', 'PROJECT')
      data.append('businessId', route.params.id)
      data.append('storageLocation', uploadForm.location)
      data.append('fileCategory', uploadForm.category)
      if (uploadForm.folderId) data.append('folderId', uploadForm.folderId)
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
  } finally {
    uploadLoading.value = false
  }
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

const handleBatchDownload = async () => {
  if (!selectedDocumentIds.value.length) {
    message.warning('请先选择要下载的文件')
    return
  }
  const folderIds = selectedDocumentIds.value
    .filter(id => String(id).startsWith('folder-'))
    .map(id => String(id).replace('folder-', ''))
  const fileIds = selectedDocumentIds.value.filter(id => !String(id).startsWith('folder-'))
  if (!fileIds.length && !folderIds.length) {
    message.warning('暂无可下载文件')
    return
  }
  try {
    const result = await downloadProjectFiles({ fileIds, folderIds })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(result.blob)
    const selectedFolder = folderIds.length === 1 && selectedDocumentIds.value.length === getFolderFileIds(folderIds[0]).length + 1
      ? folderRows.value.find(folder => String(folder.id) === String(folderIds[0]))
      : null
    link.download = selectedFolder
      ? `${safeDownloadName(currentProject.value?.name)}-${safeDownloadName(selectedFolder.name)}.zip`
      : `${safeDownloadName(currentProject.value?.name || 'files')}.zip`
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (error) {
    message.error(error.message || '批量下载失败')
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
  if (selectedDocumentIds.value.some(id => String(id).startsWith('folder-'))) {
    message.warning('文件夹暂不支持批量删除，请只选择文件')
    return
  }
  const fileIds = selectedDocumentIds.value.filter(id => !String(id).startsWith('folder-'))
  if (!fileIds.length) {
    message.warning('请选择需要删除的文件，文件夹暂不支持批量删除')
    return
  }

  try {
    await deleteProjectFiles(fileIds)
    documentRows.value = documentRows.value.filter(item => !fileIds.includes(item.id))
    selectedDocumentIds.value = []
    message.success('文件批量删除成功')
  } catch (error) {
    message.error(error.message)
  }
}

const handleResetReportFilter = () => {
  reportFilter.keyword = ''
  reportFilter.status = '全部'
  reportFilter.dateRange = []
}

const getReportCustomRow = record => ({
  onClick: () => handleViewReport(record),
})

const handleViewReport = async record => {
  reportDetailVisible.value = true
  reportDetailLoading.value = true
  currentReportDetail.value = null
  reportDetailRemark.value = ''
  reportDetailTaskType.value = 'meeting'
  try {
    const report = await getProjectReportDetail(record.id)
    currentReportDetail.value = mapReportDetail(report)
  } catch (error) {
    message.error(error.message)
    reportDetailVisible.value = false
  } finally {
    reportDetailLoading.value = false
  }
}

const handleConfirmReportRemark = () => {
  message.success('备注已确认')
}

const handleAddReportTask = () => {
  message.info('新增任务功能待接口确认')
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
  Object.assign(reportForm, { title: record.title, type: record.typeCode, status: record.statusCode, planDate: dayjs(record.planTime), actualDate: record.actualTime === '-' ? undefined : dayjs(record.actualTime), task: record.taskId || undefined, target: record.target, place: record.place, description: record.description })
  reportVisible.value = true
}

const handleSubmitReport = async () => {
  if (reportSubmitLoading.value) return

  await reportFormRef.value?.validate()
  reportSubmitLoading.value = true
  try {
    const reportData = { projectId: route.params.id, title: reportForm.title, reportType: reportForm.type, status: reportForm.status, plannedDate: reportForm.planDate.format('YYYY-MM-DD'), actualDate: reportForm.actualDate?.format('YYYY-MM-DD') || null, taskId: reportForm.task || undefined, targetAudience: reportForm.target, locationMethod: reportForm.place, description: reportForm.description }
    if (editingReportId.value) await updateProjectReport(editingReportId.value, reportData)
    else await createProjectReport(reportData)
    void recordOperationLog({
      module: OPERATION_MODULES.EXECUTION_PROJECT,
      action: editingReportId.value ? OPERATION_ACTIONS.UPDATE : OPERATION_ACTIONS.CREATE,
      bizType: 'PROJECT_REPORT',
      bizId: editingReportId.value,
      bizName: reportForm.title,
      detail: editingReportId.value ? `编辑项目汇报：${reportForm.title}` : `新建项目汇报：${reportForm.title}`,
      routeName: 'ExecutionProjectDetail',
    })
    message.success(editingReportId.value ? '汇报编辑成功' : '汇报新建成功')
    reportVisible.value = false
    await fetchProjectRelatedData(route.params.id)
  } catch (error) {
    message.error(error.message)
  } finally {
    reportSubmitLoading.value = false
  }
}

const handleDeleteReport = async record => {
  try {
    await deleteProjectReport(record.id)
    void recordOperationLog({
      module: OPERATION_MODULES.EXECUTION_PROJECT,
      action: OPERATION_ACTIONS.DELETE,
      bizType: 'PROJECT_REPORT',
      bizId: record.id,
      bizName: record.title,
      detail: `删除项目汇报：${record.title}`,
      routeName: 'ExecutionProjectDetail',
    })
    message.success('汇报删除成功')
    await fetchProjectRelatedData(route.params.id)
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
.execution-detail {
  width: min(1600px, 100%);
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  overflow-x: hidden;
  overflow-y: auto;
  color: #262626;
}
.execution-detail__heading { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
.execution-detail__heading :deep(.ant-tag) { padding: 6px 14px; font-size: 16px; }
.execution-summary { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; margin: 0 0 14px; padding: 16px 18px; background: #fff; border-radius: 8px; }
.execution-summary-table { width: 100%; table-layout: fixed; border-collapse: collapse; }
.execution-summary-table th,
.execution-summary-table td { min-height: 42px; padding: 10px 12px; text-align: left; border: 1px solid #e5e6eb; }
.execution-summary-table th { width: 100px; color: #1f1f1f; font-weight: 600; background: #fafafa; }
.execution-summary-table td { color: #262626; overflow-wrap: anywhere; }
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
.execution-detail-card { min-height: 560px; overflow: visible; background: #fff; }
.execution-tabs { display: flex; gap: 44px; height: 44px; padding-left: 8px; }
.execution-tabs button { display: inline-flex; gap: 7px; align-items: center; height: 44px; padding: 0 7px; color: #1f1f1f; background: transparent; border: 0; border-bottom: 3px solid transparent; cursor: pointer; }
.execution-tabs button.active { color: #1677ff; border-bottom-color: #1677ff; }
.execution-tab-panel { min-height: 530px; padding: 14px; overflow: visible; }
.execution-tab-panel h3 { margin: 0 0 12px; }
.gantt-panel { padding: 12px; }
.execution-stat-row, .risk-grid, .bug-summary, .document-categories { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 22px; }
.execution-stat-row { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
.project-bug-table :deep(.ant-table-body),
.project-task-table :deep(.ant-table-body),
.project-report-table :deep(.ant-table-body),
.project-document-table :deep(.ant-table-body) {
  height: 200px;
  overflow-y: auto !important;
}
.detail-list-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.semantic-card { display: flex; gap: 14px; align-items: center; min-height: 86px; padding: 16px 18px; border: 1px solid #edf0f3; border-radius: 6px; }
.execution-stat-row .semantic-card, .risk-grid .semantic-card, .bug-summary .semantic-card { gap: 12px; width: 100%; height: 86px; min-height: 0; padding: 14px 15px; text-align: left; border: 1px solid rgb(0 0 0 / 5%); border-radius: 16px; box-shadow: 0 4px 16px rgb(0 0 0 / 5%); transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.28s ease; }
.execution-stat-row .semantic-card:hover, .risk-grid .semantic-card:hover, .bug-summary .semantic-card:hover, .document-categories button:hover { box-shadow: 0 14px 28px rgb(0 0 0 / 10%); transform: translateY(-4px); }
.semantic-card__icon { display: inline-flex; flex: 0 0 36px; align-items: center; justify-content: center; width: 36px; height: 36px; font-size: 20px; background: rgb(255 255 255 / 78%); border-radius: 11px; box-shadow: 0 4px 12px rgb(0 0 0 / 6%); }
.semantic-card__content { min-width: 0; }
.semantic-card__content > span, .semantic-card__content strong, .semantic-card__content small { display: block; }
.semantic-card__content > span { color: #6e6e73; font-size: 13px; }
.semantic-card__content strong { margin: 3px 0; color: #1d1d1f; font-size: 19px; }
.semantic-card__content small { overflow: hidden; color: #86868b; text-overflow: ellipsis; white-space: nowrap; }
.gantt-progress, .risk-due, .bug-confirmed { color: #0066cc; background: linear-gradient(135deg, #fff 0%, #edf6ff 100%); }
.risk-high, .bug-severe { color: #d70015; background: linear-gradient(135deg, #fff 0%, #fff0f1 100%); }
.risk-medium, .bug-submitted { color: #c93400; background: linear-gradient(135deg, #fff 0%, #fff5e8 100%); }
.risk-normal, .bug-closed { color: #248a3d; background: linear-gradient(135deg, #fff 0%, #eefbf2 100%); }
.gantt-workspace { display: grid; min-height: 0; overflow: hidden; border: 1px solid #edf0f3; }
.gantt-node-table { width: 100%; border-right: 1px solid #edf0f3; }
.gantt-node-table :deep(.ant-table-container), .gantt-node-table :deep(.ant-table), .gantt-node-table :deep(.ant-table-content) { height: 100%; }
.gantt-node-table :deep(.ant-table-thead > tr > th) { height: 86PX; padding: 8PX 6PX; text-align: center; white-space: nowrap; }
.gantt-node-table :deep(.ant-table-tbody > tr > td) { height: 72PX; padding: 6PX; text-align: center; white-space: nowrap; }
.gantt-node-table :deep(.ant-table-tbody > tr) { cursor: pointer; }
.gantt-node-table :deep(.ant-table-tbody > tr:hover > td) { background: #edf6ff; }
.gantt-node-table :deep(.ant-progress) { min-width: 76px; }
.date-range { display: inline-flex; flex-direction: column; gap: 4PX; align-items: center; justify-content: center; height: 48PX; line-height: 20PX; }
.date-overdue { color: #ff4d4f; }
.gantt-scroll { width: 100%; min-width: 0; height: 100%; min-height: 0; overflow: hidden; }
.gantt-scroll :deep(.gantt-container) { height: 100%; overflow-x: auto; overflow-y: hidden; border-radius: 0; }
.gantt-scroll :deep(.gantt) { display: block; height: 100%; }
.gantt-scroll :deep(.popup-wrapper) { padding: 14px 16px; border: 1px solid rgb(0 0 0 / 6%); border-radius: 12px; box-shadow: 0 12px 32px rgb(0 0 0 / 14%); }
.gantt-scroll :deep(.popup-wrapper .title) { margin-bottom: 10px; font-size: 14px; }
.gantt-scroll :deep(.gantt-popup__dates) { display: grid; grid-template-columns: 64px 92px; gap: 7px 14px; align-items: center; font-size: 12px; }
.gantt-scroll :deep(.gantt-popup__dates span) { color: #86868b; }
.gantt-scroll :deep(.gantt-popup__dates strong) { color: #1d1d1f; font-weight: 500; }
.gantt-scroll :deep(.bar-wrapper) { cursor: default; }
.gantt-scroll :deep(.bar-wrapper.gantt-empty-row), .gantt-scroll :deep(.gantt-empty-row .bar-wrapper), .gantt-scroll :deep(.gantt-empty-row .bar-group), .gantt-scroll :deep(.gantt-empty-row .bar-label) { visibility: hidden; }
.gantt-scroll :deep(.gantt-not-started .bar), .gantt-scroll :deep(.gantt-not-started .bar-progress) { fill: #aeaeb2; stroke: #aeaeb2; }
.gantt-scroll :deep(.gantt-in-progress .bar) { fill: #d6eaff; stroke: #0a84ff; }
.gantt-scroll :deep(.gantt-in-progress .bar-progress) { fill: #0a84ff; }
.gantt-scroll :deep(.gantt-due-soon .bar), .gantt-scroll :deep(.gantt-due-soon .bar-progress) { fill: #ffd60a; stroke: #d6a600; }
.gantt-scroll :deep(.gantt-completed .bar), .gantt-scroll :deep(.gantt-completed .bar-progress), .gantt-scroll :deep(.gantt-milestone .bar), .gantt-scroll :deep(.gantt-milestone .bar-progress) { fill: #30d158; stroke: #248a3d; }
.gantt-scroll :deep(.gantt-overdue .bar), .gantt-scroll :deep(.gantt-overdue .bar-progress) { fill: #ff453a; stroke: #d70015; }
.gantt-scroll :deep(.gantt-completed .bar-label), .gantt-scroll :deep(.gantt-overdue .bar-label), .gantt-scroll :deep(.gantt-in-progress .bar-label), .gantt-scroll :deep(.gantt-milestone .bar-label) { fill: #fff; }
.gantt-scroll :deep(.gantt-due-soon .bar-label), .gantt-scroll :deep(.gantt-not-started .bar-label) { fill: #1d1d1f; }
.section-heading, .document-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.document-breadcrumb { display: flex; align-items: center; gap: 6px; margin: -2px 0 16px; color: #8c8c8c; font-size: 13px; }
.document-breadcrumb strong { color: #262626; font-weight: 600; }
.section-heading h2, .section-heading h3 { margin: 0; }
.section-heading small { color: #8c8c8c; font-weight: 400; }
.report-filter { margin-bottom: 18px; }
.report-filter :deep(.ant-input) { width: 280px; }
.report-detail-modal :deep(.ant-modal-body) { padding: 0; background: #f5f5f5; border-radius: 8px; }
.report-detail-modal :deep(.ant-modal-close) { top: 12px; right: 12px; }
.report-detail-view { min-height: 620px; padding: 18px 22px 22px; background: #fff; border-radius: 8px; }
.report-detail-header { display: flex; align-items: center; min-height: 32px; padding-right: 42px; margin-bottom: 14px; }
.report-detail-header strong { font-size: 16px; }
.report-detail-info-table { margin-bottom: 24px; border: 1px solid #e5e6eb; border-right: 0; border-bottom: 0; }
.report-detail-info-grid { display: grid; grid-template-columns: 86px minmax(120px, 1fr) 86px minmax(120px, 1fr) 86px minmax(120px, 1fr) 86px minmax(120px, 1fr); }
.report-detail-info-grid span,
.report-detail-info-grid strong,
.report-detail-description span,
.report-detail-description p { min-height: 42px; padding: 10px 12px; border-right: 1px solid #e5e6eb; border-bottom: 1px solid #e5e6eb; }
.report-detail-info-grid span,
.report-detail-description span { color: #1f1f1f; font-weight: 600; background: #fafafa; }
.report-detail-info-grid strong { min-width: 0; font-weight: 400; overflow-wrap: anywhere; }
.report-detail-progress { display: grid; grid-template-columns: minmax(0, 80px) 38px; gap: 10px; align-items: center; }
.report-detail-progress em { font-style: normal; font-size: 12px; }
.report-detail-description { display: grid; grid-template-columns: 86px minmax(0, 1fr); margin: 0; color: #404040; }
.report-detail-description p { margin: 0; }
.report-detail-section-title { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 12px; font-size: 18px; }
.report-detail-remark { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 10px; align-items: flex-start; margin-bottom: 10px; }
.report-detail-remark label { padding-top: 6px; font-weight: 500; }
.report-detail-remark-actions { display: flex; justify-content: flex-end; margin-bottom: 14px; }
.report-task-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.report-detail-log-title { margin-top: 28px; }
.report-detail-logs { min-height: 130px; padding: 16px 18px 4px; border: 1px solid #f0f0f0; border-radius: 6px; }
.report-detail-log-meta { color: #8c8c8c; font-size: 12px; }
.report-detail-logs p { margin: 6px 0 0; color: #1f1f1f; }
.report-detail-view :deep(.ant-table-cell) { white-space: nowrap; }
.report-modal :deep(.ant-modal-body) { padding-top: 12px; }
.report-modal :deep(.ant-form-item) { margin-bottom: 20px; }
.report-modal :deep(.ant-picker),
.report-modal :deep(.ant-select) { width: 100%; }
.report-modal__actions { display: flex; justify-content: flex-end; gap: 10px; }
.report-modal__actions .ant-btn { min-width: 80px; }
.document-toolbar :deep(.ant-input-group-wrapper) { width: 300px; }
.document-categories { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.document-categories button { display: grid; grid-template-columns: 42px 1fr; padding: 15px; color: #1d1d1f; text-align: left; background: #fff; border: 1px solid rgb(0 0 0 / 5%); border-radius: 16px; box-shadow: 0 4px 16px rgb(0 0 0 / 5%); cursor: pointer; transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.28s ease; }
.document-categories button:first-child { border-color: #1677ff; }
.document-categories button.active { color: #1677ff; border-color: #1677ff; box-shadow: 0 0 0 2px rgb(22 119 255 / 12%); }
.document-category__icon { display: inline-flex; grid-row: 1 / 3; align-self: center; align-items: center; justify-content: center; width: 36px; height: 36px; font-size: 20px; border-radius: 11px; }
.document-categories strong { font-size: 17px; }
.document-name { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; padding: 0; color: #1677ff; text-align: left; cursor: pointer; background: transparent; border: 0; }
.document-name span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.document-name--child { padding-left: 28px; }
.document-name--folder,
.document-name--folder:disabled { color: #8a5a00; cursor: pointer; }
.document-row-muted { color: #bfbfbf; }
.category-all { background: linear-gradient(135deg, #fff 0%, #edf6ff 100%); }
.category-all .document-category__icon { color: #0066cc; background: #e5f2ff; }
.category-contract { background: linear-gradient(135deg, #fff 0%, #eefbf2 100%); }
.category-contract .document-category__icon { color: #248a3d; background: #e5f8eb; }
.category-requirement { background: linear-gradient(135deg, #fff 0%, #fff5e8 100%); }
.category-requirement .document-category__icon { color: #c93400; background: #ffecd6; }
.category-design { background: linear-gradient(135deg, #fff 0%, #f5efff 100%); }
.category-design .document-category__icon { color: #7d3fc1; background: #eee2ff; }
.category-development { background: linear-gradient(135deg, #fff 0%, #fff7e8 100%); }
.category-development .document-category__icon { color: #b25d00; background: #ffedcf; }
.category-acceptance { background: linear-gradient(135deg, #fff 0%, #eafbf7 100%); }
.category-acceptance .document-category__icon { color: #00856a; background: #dff8f1; }
.document-upload-modal :deep(.ant-modal-body) { padding-top: 8px; }
.document-upload-modal :deep(.ant-upload-drag) { padding: 18px; border: 2px dashed #91caff; background: #fbfdff; }
.upload-drag-icon { margin: 0 !important; color: #1677ff; font-size: 48px; text-align: center; }
.upload-drag-title { margin: 8px 0 4px !important; font-size: 17px; font-weight: 500; text-align: center; }
.upload-drag-hint { margin: 2px 0 !important; color: #8c8c8c; text-align: center; }
.upload-drag-title span { color: #1677ff; }
.upload-list-title { margin: 18px 0 10px; }
.upload-file-list { min-height: 70px; padding-bottom: 14px; border-bottom: 1px solid #edf0f3; }
.upload-file-item { display: grid; grid-template-columns: 28px minmax(180px, 1fr) 72px 46px; gap: 10px; align-items: center; min-height: 42px; }
.upload-file-item__icon { color: #1677ff; font-size: 22px; }
.upload-file-item__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.upload-file-item__success { color: #52c41a; }
.upload-form { margin-top: 18px; }
.upload-form__row { display: block; }
.upload-form :deep(.ant-form-item) { margin-bottom: 18px; }
.upload-form :deep(.ant-select) { width: 100%; }
.upload-modal-actions, .gantt-edit-actions { display: flex; justify-content: flex-end; gap: 16px; margin-top: 8px; }
.upload-modal-actions .ant-btn { width: 118px; }
@media (max-width: 1280px) {
  .execution-tabs { gap: 20px; }
  .execution-summary { grid-template-columns: 1fr; }
  .execution-summary__progress { padding: 16px 0 0; border-top: 1px solid #edf0f3; border-left: 0; }
}
</style>
