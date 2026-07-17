<template>
  <div :class="['project-page', { 'project-page--list': viewMode === 'list' }]">
    <template v-if="viewMode === 'list'">
      <a-card class="project-filter app-filter-card" :bordered="false">
        <a-form class="project-filter__form app-filter-form" layout="inline">
          <a-form-item label="项目名称"><a-input v-model:value="query.keyword" allow-clear /></a-form-item>
          <a-form-item label="项目经理"><a-select v-model:value="query.managerId" :options="managerFilterOptions" /></a-form-item>
          <a-form-item label="项目类型"><a-select v-model:value="query.type" :options="typeFilterOptions" /></a-form-item>
          <a-form-item label="合同状态"><a-select v-model:value="query.contractStatus" :options="contractFilterOptions" /></a-form-item>
          <a-form-item label="项目阶段"><a-select v-model:value="query.stage" :options="stageFilterOptions" /></a-form-item>
          <a-form-item label="项目状态"><a-select v-model:value="query.status" :options="projectStatusFilterOptions" /></a-form-item>
          <a-form-item class="project-filter__actions app-filter-actions"><a-space><a-button type="primary" @click="handleSearch">查询</a-button><a-button @click="handleReset">重置</a-button></a-space></a-form-item>
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
        <div class="project-list__content">
        <a-table v-if="displayMode === 'list'" row-key="id" :columns="projectColumns" :data-source="filteredProjects" :loading="projectLoading" :pagination="false" :scroll="{ x: 1480 }">
          <template #bodyCell="{ column, record, index, text }">
            <template v-if="column.dataIndex === 'index'">{{ (projectPagination.current - 1) * projectPagination.pageSize + index + 1 }}</template>
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
        </div>
        <a-pagination
          class="project-list__pagination"
          :current="projectPagination.current"
          :page-size="projectPagination.pageSize"
          :total="projectPagination.total"
          :page-size-options="projectPagination.pageSizeOptions"
          :show-size-changer="projectPagination.showSizeChanger"
          :show-total="projectPagination.showTotal"
          @change="handleProjectPageChange"
        />
      </a-card>
    </template>

    <template v-else>
      <div class="project-detail">
        <div class="project-detail__heading"><a-button @click="handleBack"><ArrowLeftOutlined />返回</a-button><a-tag color="processing">{{ currentProject?.status || '-' }}</a-tag></div>
        <section class="project-summary">
          <table class="project-summary-table">
            <tbody>
              <tr v-for="(row, rowIndex) in summaryRows" :key="rowIndex">
                <template v-for="item in row" :key="item.label">
                  <th>{{ item.label }}</th>
                  <td><a-tag v-if="item.tag" :color="item.color">{{ item.value }}</a-tag><template v-else>{{ item.value }}</template></td>
                </template>
                <template v-for="index in 4 - row.length" :key="`empty-${rowIndex}-${index}`">
                  <th></th>
                  <td></td>
                </template>
              </tr>
            </tbody>
          </table>
          <div class="project-summary__progress">
            <div class="project-summary__title"><h3><ProjectOutlined />项目进度</h3><span>根据项目进度权重计算</span></div>
            <div class="project-summary__bar"><a-progress :percent="ganttSummaryData.overallProgress" :show-info="false" stroke-color="#52c41a" /><strong>{{ ganttSummaryData.overallProgress }}%</strong></div>
            <div class="summary-metrics"><div><strong>{{ taskPagination.total }}</strong><span>关联任务</span></div><div><strong class="danger">{{ bugPagination.total }}</strong><span>关联Bug</span></div></div>
          </div>
        </section>
        <ProjectDetailTabs
          :key="route.params.id"
          ref="detailTabsRef"
          v-model:active-tab="activeTab"
          :tabs="detailTabs"
          :gantt-summary="ganttSummary"
          :gantt-table-width="ganttTableWidth"
          :gantt-workspace-height="ganttWorkspaceHeight"
          :gantt-node-columns="ganttNodeColumns"
          :gantt-node-rows="ganttNodeRows"
          :gantt-status-colors="ganttStatusColors"
          :gantt-custom-row="handleGanttRow"
          :detail-loading="detailLoading"
          :risks="risks"
          :task-columns="taskColumns"
          :task-rows="taskRows"
          :task-loading="taskLoading"
          :task-pagination="taskPagination"
          :task-status-filters="taskStatusFilters"
          :person-filter-options="personFilterOptions"
          :bug-summary="bugSummary"
          :bug-columns="bugColumns"
          :bug-rows="bugRows"
          :bug-loading="bugLoading"
          :bug-pagination="bugPagination"
          :bug-status-filters="bugStatusFilters"
          :bug-assignee-options="bugAssigneeOptions"
          :report-rows="reportRows"
          :report-columns="reportTableColumns"
          :report-loading="reportLoading"
          :report-pagination="reportPagination"
          :report-status-filters="reportStatusFilters"
          :document-categories="documentCategories"
          :document-columns="documentColumns"
          :document-rows="filteredDocumentRows"
          :document-loading="documentLoading"
          :document-row-selection="documentRowSelection"
          :selected-document-ids="selectedDocumentIds"
          :expanded-document-folder-ids="expandedFolderIds"
          @task-page-change="handleTaskPageChange"
          @bug-page-change="handleBugPageChange"
          @bug-filter-change="handleBugFilterChange"
          @view-task="handleTaskDetail"
          @view-bug="handleBugDetail"
          @report-page-change="handleReportPageChange"
          @report-filter-change="handleReportFilterChange"
          @create-report="handleCreateReport"
          @view-report="handleViewReport"
          @edit-report="handleEditReport"
          @delete-report="handleDeleteReport"
          @open-upload="handleOpenUploadModal"
          @create-folder="handleCreateFolder"
          @batch-download="handleBatchDownload"
          @select-document-category="handleSelectDocumentCategory"
          @toggle-folder="handleToggleFolder"
          @delete-documents="handleDeleteDocuments"
          @download-document="handleDownloadDocument"
          @delete-document="handleDeleteDocument"
          @delete-folder="handleDeleteFolder"
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
            <span>准备工作</span>
          </div>
          <div class="report-detail-remark">
            <label>备注：</label>
            <a-textarea v-model:value="reportDetailRemark" :rows="3" placeholder="请输入备注" />
          </div>
          <div class="report-detail-attachment">
            <label>上传附件：</label>
            <div class="report-detail-attachment__content">
              <a-upload-dragger :before-upload="handleReportAttachmentBeforeUpload" :show-upload-list="false" multiple accept=".docx,.xlsx,.pdf,.png,.jpg,.jpeg,.drawio">
                <p class="ant-upload-drag-icon"><InboxOutlined /></p>
                <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p class="ant-upload-hint">支持 docx、xlsx、pdf、png、jpg、drawio，单个文件不超过 50MB</p>
              </a-upload-dragger>
              <div v-if="reportAttachmentRows.length || reportAttachmentFiles.length" class="report-detail-attachment__list">
                <div v-for="file in reportAttachmentRows" :key="`uploaded-${file.id}`">
                  <FileOutlined />
                  <span>{{ file.name }}</span>
                  <a-button type="link" size="small" @click="handleDownloadReportAttachment(file)">下载</a-button>
                </div>
                <div v-for="file in reportAttachmentFiles" :key="`pending-${file.uid}`">
                  <FileOutlined />
                  <span>{{ file.name }}</span>
                  <a-button type="link" size="small" danger @click="handleRemoveReportAttachment(file.uid)">移除</a-button>
                </div>
              </div>
            </div>
          </div>
          <div class="report-detail-remark-actions">
            <a-button type="primary" :loading="reportAttachmentUploading" @click="handleConfirmReportRemark">保存</a-button>
          </div>
          <div class="report-task-toolbar">
            <a-button type="primary" @click="handleOpenTaskPicker"><PlusOutlined />添加关联任务</a-button>
          </div>
          <a-table row-key="id" class="report-item-table" :columns="reportItemColumns" :data-source="currentReportDetail.items" :pagination="false" size="small" :scroll="{ x: 1000, y: 200 }">
            <template #bodyCell="{ column, text, record }">
              <template v-if="column.dataIndex === 'content'">
                <a-space :size="4">
                  <span>{{ text }}</span>
                  <a-tag v-if="record.relatedTaskId" color="blue" style="margin:0;font-size:0.6875rem;line-height:1.125rem;padding:0 0.25rem;">关联</a-tag>
                </a-space>
              </template>
              <a-tag v-else-if="column.dataIndex === 'priority'" color="orange">{{ text }}</a-tag>
              <a-tag v-else-if="column.dataIndex === 'status'" color="processing">{{ text }}</a-tag>
              <template v-else-if="column.dataIndex === 'operation'">
                <a-space :size="2">
                  <a-button v-if="!record.relatedTaskId" type="link" size="small" @click="handleEditReportItem(record)">编辑</a-button>
                  <a-button type="link" danger size="small" @click="handleDeleteReportItem(record)">删除</a-button>
                </a-space>
              </template>
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

    <a-modal v-model:open="reportItemVisible" title="编辑准备项" :width="560" :footer="null" destroy-on-close>
      <a-form ref="reportItemFormRef" :model="reportItemForm" :rules="reportItemRules" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
        <a-form-item label="任务内容" name="content"><a-input v-model:value="reportItemForm.content" placeholder="请输入任务内容" /></a-form-item>
        <a-form-item label="负责人" name="ownerId"><a-select v-model:value="reportItemForm.ownerId" :options="managerOptions" placeholder="请选择负责人" show-search :filter-option="(input, option) => option.label.toLowerCase().includes(input.toLowerCase())" /></a-form-item>
        <a-form-item label="优先级" name="priority"><a-select v-model:value="reportItemForm.priority" :options="taskPriorityOptions" placeholder="请选择优先级" /></a-form-item>
        <a-form-item label="状态" name="status"><a-select v-model:value="reportItemForm.status" :options="taskStatusOptions" placeholder="请选择状态" /></a-form-item>
        <a-form-item label="截止日期"><a-date-picker v-model:value="reportItemForm.plannedDate" value-format="YYYY-MM-DD" placeholder="请选择截止日期" allow-clear style="width:100%" /></a-form-item>
        <a-form-item label="描述"><a-textarea v-model:value="reportItemForm.description" :rows="3" placeholder="请输入描述" /></a-form-item>
      </a-form>
      <div class="report-modal__actions">
        <a-button @click="reportItemVisible = false">取消</a-button>
        <a-button type="primary" :loading="reportItemLoading" @click="handleSubmitReportItem">确定</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="taskPickerVisible" title="添加关联任务" :width="760" :confirm-loading="taskPickerConfirming" ok-text="确认" cancel-text="取消" destroy-on-close @ok="handleLinkTasks">
      <a-table row-key="id" :columns="taskPickerColumns" :data-source="taskPickerRows" :row-selection="taskPickerRowSelection" :loading="taskPickerLoading" :pagination="false" size="small" :scroll="{ x: 620, y: 360 }" />
      <a-pagination class="task-picker-pagination" :current="taskPickerPagination.current" :page-size="taskPickerPagination.pageSize" :total="taskPickerPagination.total" :page-size-options="['10', '50', '100']" show-size-changer :show-total="total => `共 ${total} 条`" @change="handleTaskPickerPageChange" />
    </a-modal>

    <a-modal v-model:open="reportVisible" class="report-modal" :title="reportMode === 'create' ? '新建汇报' : '编辑汇报'" :width="640" :footer="null" destroy-on-close>
      <a-form ref="reportFormRef" :model="reportForm" :rules="reportRules" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
        <a-form-item label="汇报标题" name="title"><a-input v-model:value="reportForm.title" placeholder="请输入汇报标题" /></a-form-item>
        <a-form-item label="汇报类型" name="type"><a-select v-model:value="reportForm.type" :options="reportTypeOptions" placeholder="请选择汇报类型" /></a-form-item>
        <a-form-item label="状态" name="status"><a-select v-model:value="reportForm.status" :options="reportStatusOptions" placeholder="请选择汇报状态" /></a-form-item>
        <a-form-item label="计划日期" name="planDate"><a-date-picker v-model:value="reportForm.planDate" format="YYYY-MM-DD" placeholder="请选择计划日期" /></a-form-item>
        <a-form-item label="实际日期"><a-date-picker v-model:value="reportForm.actualDate" format="YYYY-MM-DD" placeholder="请选择实际日期" /></a-form-item>
        <!--<a-form-item label="关联任务"><a-select v-model:value="reportForm.task" :options="reportTaskOptions" placeholder="请选择关联任务" allow-clear /></a-form-item>-->
        <a-form-item label="汇报对象" name="target"><a-input v-model:value="reportForm.target" placeholder="请输入汇报对象" /></a-form-item>
        <a-form-item label="地点/方式" name="place"><a-input v-model:value="reportForm.place" placeholder="请输入地点或汇报方式" /></a-form-item>
        <a-form-item label="描述" name="description"><a-textarea v-model:value="reportForm.description" :rows="4" placeholder="请输入汇报描述" /></a-form-item>
      </a-form>
      <div class="report-modal__actions"><a-button @click="reportVisible = false">取消</a-button><a-button type="primary" :loading="reportSubmitLoading" @click="handleSubmitReport">确定</a-button></div>
    </a-modal>

    <a-modal v-model:open="ganttEditVisible" title="编辑节点" :width="400" :footer="null" destroy-on-close>
      <a-form ref="ganttFormRef" :model="ganttForm" :rules="ganttFormRules" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
        <a-form-item label="节点名称"><a-input :value="ganttForm.name" disabled /></a-form-item>
        <a-form-item label="计划开始" name="planStart"><a-date-picker v-model:value="ganttForm.planStart" value-format="YYYY-MM-DD" placeholder="请选择计划开始日期" /></a-form-item>
        <a-form-item label="计划结束" name="planEnd"><a-date-picker v-model:value="ganttForm.planEnd" value-format="YYYY-MM-DD" placeholder="请选择计划结束日期" /></a-form-item>
        <a-form-item label="实际开始"><a-date-picker v-model:value="ganttForm.actualStart" value-format="YYYY-MM-DD" placeholder="请选择实际开始日期" allow-clear /></a-form-item>
        <a-form-item label="实际结束"><a-date-picker v-model:value="ganttForm.actualEnd" value-format="YYYY-MM-DD" placeholder="请选择实际结束日期" allow-clear /></a-form-item>
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
  createProjectFolder,
  deleteProjectFolder,
  createProjectReport,
  createReportItem,
  deleteProject,
  deleteProjectFile,
  deleteProjectFiles,
  deleteProjectReport,
  deleteReportItem,
  downloadProjectFile,
  downloadProjectFiles,
  getGanttNodes,
  getGanttSummary,
  getProjectBugs,
  getProjectDetail,
  getProjectFiles,
  getProjectFolders,
  getProjectList,
  getProjectReportDetail,
  getProjectReports,
  getProjectTasks,
  getSystemUsers,
  updateGanttNode,
  updateProjectReport,
  updateReportItem,
  updateReportStatus,
  uploadProjectFile,
} from '@/api/managementProject'
import { getOperationLogs } from '@/api/system'
import { useDictStore } from '@/store/dictStore'
import { formatDateTime } from '@/utils/dateTime'
import { OPERATION_ACTIONS, OPERATION_MODULES, recordOperationLog } from '@/utils/operationLog'

const route = useRoute()
const router = useRouter()
const dictStore = useDictStore()
const viewMode = computed(() => route.meta.projectView || 'list')
const projectLoading = ref(false)
const detailLoading = ref(false)
const taskLoading = ref(false)
const bugLoading = ref(false)
const reportLoading = ref(false)
const documentLoading = ref(false)
const selectedDocumentIds = ref([])
const selectedDocumentCategory = ref('全部')
const currentProject = ref(null)
const activeTab = ref('gantt')
const detailTabsRef = ref()
const uploadVisible = ref(false)
const uploadLoading = ref(false)
const uploadFiles = ref([])
const folderVisible = ref(false)
const folderLoading = ref(false)
const folderName = ref('')
const folderRows = ref([])
const expandedFolderIds = ref([])
const reportVisible = ref(false)
const reportDetailVisible = ref(false)
const reportDetailLoading = ref(false)
const currentReportDetail = ref(null)
const reportDetailRemark = ref('')
const reportDetailTaskType = ref('meeting')
const reportAttachmentRows = ref([])
const reportAttachmentFiles = ref([])
const reportAttachmentUploading = ref(false)
const ganttEditVisible = ref(false)
const ganttSubmitLoading = ref(false)
const ganttFormRef = ref()
const reportMode = ref('create')
const reportFormRef = ref()
const reportSubmitLoading = ref(false)
const editingReportId = ref(null)
const reportItemVisible = ref(false)
const reportItemMode = ref('create')
const reportItemLoading = ref(false)
const editingItemId = ref(null)
const reportItemFormRef = ref()
const taskPickerVisible = ref(false)
const taskPickerLoading = ref(false)
const taskPickerRows = ref([])
const taskPickerPagination = reactive({ current: 1, pageSize: 10, total: 0 })
const selectedTaskIds = ref([])
const selectedTaskRecords = ref(new Map())
const taskPickerConfirming = ref(false)
let ganttInstance

const toOptions = values => values.map(value => ({ label: value, value }))
const managementProjectTypeOptions = [
  { label: '数字化项目', value: 'DIGITALIZATION' },
  { label: '科技项目', value: 'RESEARCH' },
  { label: '外部项目', value: 'EXTERNAL' },
]
const managerOptions = ref([])
const projectTypeFormOptions = ref([...managementProjectTypeOptions])
const stageOptions = ref([])
const projectStatusOptions = ref([])
const contractOptions = ref([])
const taskStatusOptions = ref([])
const taskPriorityOptions = ref([])
const bugStatusOptions = ref([])
const bugPriorityOptions = ref([])
const reportTypeOptions = ref([])
const reportStatusOptions = ref([])
const fileCategoryOptions = ref([])
const dictLabels = reactive({})
const projectTypeLabels = {
  DIGITALIZATION: '数字化项目',
  INFORMATIZATION: '信息化项目',
  RESEARCH: '科技项目',
  EXTERNAL: '外部项目',
  MANAGEMENT: '管理类项目',
  EXECUTION: '执行类项目',
}
const withAll = options => [{ label: '全部', value: '全部' }, ...options]
const managerFilterOptions = computed(() => withAll(managerOptions.value))
const typeFilterOptions = computed(() => withAll(projectTypeFormOptions.value))
const stageFilterOptions = computed(() => withAll(stageOptions.value))
const projectStatusFilterOptions = computed(() => withAll(projectStatusOptions.value))
const contractFilterOptions = computed(() => withAll(contractOptions.value))
const groupOptions = [{ label: '项目经理', value: 'manager' }, { label: '项目阶段', value: 'stage' }, { label: '项目状态', value: 'status' }, { label: '项目类型', value: 'type' }, { label: '合同状态', value: 'contractStatus' }]

const projects = ref([])
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
const createDetailPagination = () => reactive({ current: 1, pageSize: 10, total: 0 })
const taskPagination = createDetailPagination()
const bugPagination = createDetailPagination()
const reportPagination = createDetailPagination()
const reportListFilter = reactive({ keyword: '', status: '全部', dateRange: [] })
const filteredProjects = computed(() => projects.value)
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
const ganttStatusColors = { 未开始: 'default', 启动逾期: 'orange', 进行中: 'processing', 即将到期: 'gold', 已逾期: 'red', 已完成: 'green', 逾期完成: 'volcano', 里程碑: 'green' }
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
const normalizeGanttEnd = (start, end) => {
  const startDate = dayjs(start)
  const endDate = dayjs(end)
  const renderEnd = endDate.isAfter(startDate) ? endDate.subtract(1, 'day') : endDate
  return `${renderEnd.format('YYYY-MM-DD')} 23:59:59`
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
      end: hasPlanTime ? normalizeGanttEnd(node.planStart.replaceAll('/', '-'), node.planEnd.replaceAll('/', '-')) : dayjs(fallbackStart).add(1, 'day').format('YYYY-MM-DD'),
      planStart: node.planStart,
      actualStart: node.actualStart,
      planEnd: node.planEnd,
      actualEnd: node.actualEnd,
      progress: 0,
      dependencies: hasPlanTime && previousVisibleTaskId ? previousVisibleTaskId : undefined,
      custom_class: hasPlanTime ? ganttStatusClasses[node.status] : 'gantt-empty-row',
    }
    if (hasPlanTime) previousVisibleTaskId = taskId
    return task
  })
})
const ganttScrollStart = computed(() => {
  const earliestPlanStart = ganttNodeRows.value
    .map(node => formatNodeDate(node.planStart))
    .filter(Boolean)
    .sort()[0]
  return earliestPlanStart ? dayjs(earliestPlanStart).subtract(1, 'month').format('YYYY-MM-DD') : 'start'
})
const ganttForm = reactive({ id: null, name: '', planStart: undefined, planEnd: undefined, actualStart: undefined, actualEnd: undefined, progress: 0 })
const ganttFormRules = {
  planStart: [{ required: true, message: '请选择计划开始日期', trigger: 'change' }],
  planEnd: [{ required: true, message: '请选择计划结束日期', trigger: 'change' }, { validator: (_, value) => !value || !ganttForm.planStart || !dayjs(value).isBefore(dayjs(ganttForm.planStart)) ? Promise.resolve() : Promise.reject(new Error('计划结束日期不能早于计划开始日期')), trigger: 'change' }],
  progress: [{ required: true, message: '请输入节点进度', trigger: 'change' }],
}

const risks = [{ label: '高风险任务', value: '3 个', desc: '延期 ≥ 3 天', class: 'risk-high', icon: FireOutlined }, { label: '中风险任务', value: '2 个', desc: '延期 1 - 2 天', class: 'risk-medium', icon: WarningOutlined }, { label: '即将到期', value: '4 个', desc: '未来 3 天内到期', class: 'risk-due', icon: ClockCircleOutlined }, { label: '按计划进行', value: '8 个', desc: '无延期风险', class: 'risk-normal', icon: CheckCircleOutlined }]
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
const taskRows = ref([])
const taskStatusFilters = toOptions(['全部状态', '未开始', '进行中', '已完成'])
const personFilterOptions = toOptions(['全部负责人', '全部指定人', '张三', '李四', '王五'])
const bugSummary = computed(() => [{ key: 'urgent', label: '紧急', value: bugRows.value.filter(item => item.priorityCode === 'URGENT').length, class: 'bug-severe', icon: ExclamationCircleOutlined }, { key: 'pending', label: '待修复', value: bugRows.value.filter(item => item.statusCode === 'PENDING_FIX').length, class: 'bug-submitted', icon: SendOutlined }, { key: 'fixing', label: '修复中', value: bugRows.value.filter(item => item.statusCode === 'FIXING').length, class: 'bug-confirmed', icon: ToolOutlined }, { key: 'closed', label: '已关闭', value: bugRows.value.filter(item => item.statusCode === 'CLOSED').length, class: 'bug-closed', icon: CheckCircleOutlined }])
const bugColumns = [{ title: 'BUG ID', dataIndex: 'code', width: 130 }, { title: '标题', dataIndex: 'title', width: 220 }, { title: '严重级别', dataIndex: 'severity', width: 100 }, { title: '状态', dataIndex: 'status', width: 100 }, { title: '指定人', dataIndex: 'assignee', width: 90 }, { title: '创建人', dataIndex: 'creator', width: 90 }]
const bugRows = ref([])
const bugStatusFilters = [
  { label: '全部状态', value: '' },
  { label: '待修复', value: 'PENDING_FIX' },
  { label: '修复中', value: 'FIXING' },
  { label: '待验证', value: 'PENDING_VERIFY' },
  { label: '已关闭', value: 'CLOSED' },
]
const bugAssigneeOptions = computed(() => [{ label: '全部指定人', value: '' }, ...managerOptions.value])
const bugListFilter = reactive({ status: '', assigneeId: '', priority: '' })
const reportStatusFilters = computed(() => [{ label: '全部', value: '全部' }, ...reportStatusOptions.value])
const reportColumns = [{ title: '汇报标题', dataIndex: 'title', width: 220 }, { title: '汇报类型', dataIndex: 'type', width: 110 }, { title: '状态', dataIndex: 'status', width: 100 }, { title: '计划时间', dataIndex: 'planTime', width: 150 }, { title: '实际时间', dataIndex: 'actualTime', width: 150 }, { title: '汇报对象', dataIndex: 'target', width: 110 }, { title: '地点/方式', dataIndex: 'place', width: 120 }]
const reportRows = ref([])
const reportTableColumns = [
  { title: '汇报标题', dataIndex: 'title', width: 220 },
  { title: '汇报类型', dataIndex: 'type', width: 110 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '计划时间', dataIndex: 'planTime', width: 150 },
  { title: '实际时间', dataIndex: 'actualTime', width: 150 },
  { title: '汇报对象', dataIndex: 'target', width: 110 },
  { title: '地点/方式', dataIndex: 'place', width: 120 },
  { title: '操作', dataIndex: 'operation', width: 140, fixed: 'right' },
]
const reportItemColumns = [
  { title: '任务内容', dataIndex: 'content', width: 220 },
  { title: '负责人', dataIndex: 'owner', width: 100 },
  { title: '优先级', dataIndex: 'priority', width: 90 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '截止日期', dataIndex: 'plannedDate', width: 120 },
  { title: '描述', dataIndex: 'description', width: 160 },
  { title: '操作', dataIndex: 'operation', width: 100, fixed: 'right' },
]
const taskPickerColumns = [
  { title: '任务名称', dataIndex: 'name', width: 200 },
  { title: '负责人', dataIndex: 'owner', width: 100 },
  { title: '优先级', dataIndex: 'priority', width: 90 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '计划结束', dataIndex: 'planEnd', width: 120 },
]
const createDefaultReportForm = () => ({ title: '', type: 'WEEKLY', status: 'DRAFT', planDate: undefined, actualDate: undefined, task: undefined, target: '', place: '', description: '' })
const createDefaultItemForm = () => ({ content: '', ownerId: undefined, priority: 'MEDIUM', status: 'NOT_STARTED', plannedDate: undefined, description: '' })
const reportItemForm = reactive(createDefaultItemForm())
const reportItemRules = { content: [{ required: true, message: '请输入任务内容', trigger: 'blur' }], ownerId: [{ required: true, message: '请选择负责人', trigger: 'change' }], priority: [{ required: true, message: '请选择优先级', trigger: 'change' }], status: [{ required: true, message: '请选择状态', trigger: 'change' }] }
const reportForm = reactive(createDefaultReportForm())
const reportTaskOptions = computed(() => taskRows.value.map(item => ({ label: item.name, value: item.id })))
const reportRules = { title: [{ required: true, message: '请输入汇报标题', trigger: 'blur' }], type: [{ required: true, message: '请选择汇报类型', trigger: 'change' }], status: [{ required: true, message: '请选择汇报状态', trigger: 'change' }], planDate: [{ required: true, message: '请选择计划日期', trigger: 'change' }], target: [{ required: true, message: '请输入汇报对象', trigger: 'blur' }], place: [{ required: true, message: '请输入地点或汇报方式', trigger: 'blur' }], description: [{ required: true, message: '请输入汇报描述', trigger: 'blur' }] }
const documentCategoryMeta = computed(() => {
  return fileCategoryOptions.value.length ? fileCategoryOptions.value : defaultFileCategories
})
const defaultFileCategories = [
  { label: '合同类', value: 'CONTRACT' },
  { label: '需求类', value: 'REQUIREMENT' },
  { label: '设计类', value: 'DESIGN' },
  { label: '开发类', value: 'DEVELOPMENT' },
  { label: '验收类', value: 'ACCEPTANCE' },
]
const documentCategories = computed(() => {
  const files = documentDisplayRows.value
  return [{ label: '全部', value: '全部', count: files.length, class: 'category-all', icon: FolderOpenOutlined }, ...documentCategoryMeta.value.map((item, index) => ({ label: item.label, value: item.value, count: files.filter(file => file.categoryCode === item.value).length, class: ['category-contract', 'category-requirement', 'category-design', 'category-development', 'category-acceptance'][index], icon: [FileProtectOutlined, FileTextOutlined, SnippetsOutlined, CodeOutlined, FileDoneOutlined][index] }))].map(item => ({ ...item, active: item.value === selectedDocumentCategory.value }))
})
const documentColumns = [{ title: '文件名', dataIndex: 'name' }, { title: '类型', dataIndex: 'type', width: 90 }, { title: '大小', dataIndex: 'size', width: 90 }, { title: '版本', dataIndex: 'version', width: 90 }, { title: '上传人', dataIndex: 'uploader', width: 120 }, { title: '分类', dataIndex: 'category', width: 90 }, { title: '上传时间', dataIndex: 'uploadTime', width: 220 }, { title: '操作', dataIndex: 'operation', width: 120 }]
const documentRows = ref([])
const folderOptions = computed(() => folderRows.value.map(folder => ({ label: folder.name, value: folder.id })))
const isFolderExpanded = folderId => expandedFolderIds.value.map(String).includes(String(folderId))
const folderDisplayRows = computed(() => folderRows.value.map(folder => ({
  id: `folder-${folder.id}`,
  folderId: folder.id,
  rowKey: `folder-${folder.id}`,
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
const matchesDocumentCategory = file => selectedDocumentCategory.value === '全部' || file.categoryCode === selectedDocumentCategory.value
const documentDisplayRows = computed(() => documentRows.value.map(file => ({ ...file, rowKey: `file-${file.id}`, isFolder: false, parentFolderId: file.folderId || null })))
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
const uploadForm = reactive({ location: '项目文档库', folderId: undefined, category: 'REQUIREMENT', description: '' })
const storageOptions = toOptions(['项目文档库', '公共文档库'])
const documentCategoryOptions = computed(() => documentCategoryMeta.value.map(item => ({ label: item.label, value: item.value })))
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
  const options = [...defaultFileCategories, ...fileCategoryOptions.value]
  const matched = options.find(item => item.value === value || item.label === value)
  return { value: matched?.value || value || '-', label: matched?.label || value || '-' }
}
const isFinishedStatus = value => ['COMPLETED', 'DONE', 'FINISHED', '已完成'].includes(value)
const REPORT_LOG_BIZ_TYPES = new Set(['ProjectReport', 'PROJECT_REPORT', 'project-report', 'ProjectReportItem', 'PROJECT_REPORT_ITEM', 'ReportItem', '项目汇报', '汇报准备项'])
const REPORT_LOG_MODULES = new Set(['project-report', 'PROJECT_REPORT', 'ProjectReport', '项目汇报'])
const pickArray = (...values) => values.find(value => Array.isArray(value)) || []
const normalizeReportLog = (log, index = 0) => {
  const time = log.operationTime || log.createdAt || log.createTime || log.time || log.updatedAt
  const user = log.operatorName || log.operator || log.userName || log.createdByName || getUserName(log.operatorId || log.createdBy || log.userId)
  const content = log.content || log.detail || log.description || log.message || log.operationContent || log.logContent || log.remark
  return {
    id: log.id || `${time || 'log'}-${index}`,
    rawTime: time,
    time: formatDateTime(time),
    user: user || '-',
    content: content || '-',
  }
}
const normalizeReportLogs = (report, extraLogs = []) => {
  const detailLogs = pickArray(report.logs, report.operationLogs, report.operationLogList, report.histories, report.auditLogs)
  const merged = [...extraLogs, ...detailLogs]
  const normalized = merged
    .map(normalizeReportLog)
    .filter(log => log.content && log.content !== '-')

  if (normalized.length) {
    const uniqueLogs = new Map()
    normalized.forEach(log => {
      const key = `${log.rawTime || log.time}-${log.user}-${log.content}`
      if (!uniqueLogs.has(key)) uniqueLogs.set(key, log)
    })
    return Array.from(uniqueLogs.values()).sort((a, b) => new Date(b.rawTime || 0) - new Date(a.rawTime || 0))
  }

  const fallbackLogs = []
  if (report.updatedAt && report.updatedAt !== report.createdAt) {
    fallbackLogs.push({ id: 'updated', rawTime: report.updatedAt, time: formatDateTime(report.updatedAt), user: getUserName(report.updatedBy), content: `更新项目汇报【${report.title || '-'}】` })
  }
  if (report.createdAt) {
    fallbackLogs.push({ id: 'created', rawTime: report.createdAt, time: formatDateTime(report.createdAt), user: getUserName(report.createdBy), content: `新建汇报【${report.title || '-'}】，状态${getDictLabel('reportStatus', report.status)}` })
  }
  return fallbackLogs
}
const isReportOperationLog = (log, reportId, itemIds = []) => {
  const bizType = log.businessType || log.bizType || log.module || log.moduleCode
  const bizId = log.businessId || log.bizId || log.targetId || log.entityId
  const module = log.module || log.moduleCode
  const relatedBizIds = new Set([String(reportId), ...itemIds.map(id => String(id))])
  return relatedBizIds.has(String(bizId || '')) && (REPORT_LOG_BIZ_TYPES.has(bizType) || REPORT_LOG_MODULES.has(module))
}
const fetchReportOperationLogs = async (reportId, itemIds = []) => {
  try {
    const result = await getOperationLogs({
      module: 'project-report',
      pageNo: 1,
      pageSize: 100,
    })
    const rows = pickArray(result?.records, result?.list, result?.rows, result?.data)
    return rows.filter(log => isReportOperationLog(log, reportId, itemIds))
  } catch {
    return []
  }
}
const loadReportDetail = async reportId => {
  const report = await getProjectReportDetail(reportId)
  const itemIds = (report.items || []).map(item => item.id).filter(Boolean)
  const logs = await fetchReportOperationLogs(reportId, itemIds)
  return mapReportDetail(report, logs)
}
const mapReportDetail = (report, extraLogs = []) => {
  const items = (report.items || []).map(item => ({
    id: item.id,
    content: item.content || '-',
    owner: getUserName(item.ownerId),
    ownerId: item.ownerId,
    priority: getDictLabel('taskPriority', item.priority),
    priorityCode: item.priority,
    status: getDictLabel('taskStatus', item.status),
    statusCode: item.status,
    plannedDate: item.plannedDate || '-',
    description: item.description || '-',
    relatedTaskId: item.relatedTaskId || null,
  }))
  const completedCount = items.filter(item => isFinishedStatus(item.statusCode) || isFinishedStatus(item.status)).length
  const logs = normalizeReportLogs(report, extraLogs)

  return {
    id: report.id,
    title: report.title || '-',
    type: getDictLabel('reportType', report.reportType),
    status: getDictLabel('reportStatus', report.status),
    statusCode: report.status,
    planTime: report.plannedDate || '-',
    actualTime: report.actualDate || '-',
    target: report.targetAudience || '-',
    place: report.locationMethod || '-',
    description: report.description || '-',
    remark: report.remark || '',
    createdAt: formatDateTime(report.createdAt),
    progress: items.length ? Math.round((completedCount / items.length) * 100) : 0,
    items,
    logs,
  }
}
const getStatusLabel = value => ganttStatusOptions.value.find(item => item.value === value)?.label || getDictLabel('taskStatus', value)
const formatNodeDate = value => {
  if (!value || value === '-') return undefined
  const date = dayjs(String(value).replaceAll('/', '-'))
  return date.isValid() ? date.format('YYYY-MM-DD') : undefined
}
const mapProject = project => ({
  ...project,
  manager: getUserName(project.managerId),
  stage: getDictLabel('projectStage', project.stage),
  stageCode: project.stage,
  status: getDictLabel('projectStatus', project.status),
  statusCode: project.status,
  contractStatus: getDictLabel('contractStatus', project.contractStatus),
  contractStatusCode: project.contractStatus,
  type: projectTypeLabels[project.projectBusinessType] || project.type || project.projectBusinessType || '-',
  department: project.department || project.businessDepartment || '-',
  contractor: project.contractor || project.contractorUnit || '-',
  supervisor: project.supervisor || project.businessSupervisor || '-',
  amount: project.amount ?? project.receivableAmount ?? 0,
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
    projectTypeFormOptions.value = [...managementProjectTypeOptions]
    stageOptions.value = dictGroups.find(item => item.type === 'projectStage')?.items || []
    projectStatusOptions.value = dictGroups.find(item => item.type === 'projectStatus')?.items || []
    contractOptions.value = dictGroups.find(item => item.type === 'contractStatus')?.items || []
    taskStatusOptions.value = dictGroups.find(item => item.type === 'taskStatus')?.items || []
    taskPriorityOptions.value = dictGroups.find(item => item.type === 'taskPriority')?.items || []
    bugStatusOptions.value = dictGroups.find(item => item.type === 'bugStatus')?.items || []
    bugPriorityOptions.value = dictGroups.find(item => item.type === 'bugPriority')?.items || []
    reportTypeOptions.value = dictGroups.find(item => item.type === 'reportType')?.items || []
    reportStatusOptions.value = dictGroups.find(item => item.type === 'reportStatus')?.items || []
    fileCategoryOptions.value = dictGroups.find(item => item.type === 'fileCategory')?.items || []
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

const getTaskRiskLevel = task => {
  if (['COMPLETED', 'PAUSED'].includes(task.status)) return '按计划进行'
  if (!task.plannedEndDate) return '按计划进行'
  const today = dayjs().startOf('day')
  const planEnd = dayjs(task.plannedEndDate).startOf('day')
  const overdueDays = today.diff(planEnd, 'day')
  if (overdueDays > 0) return overdueDays >= 3 ? '高风险' : '中风险'
  const daysUntilDue = planEnd.diff(today, 'day')
  return daysUntilDue <= 3 ? '即将到期' : '按计划进行'
}
const mapTaskRow = (task, index) => ({
  id: task.id,
  index: (taskPagination.current - 1) * taskPagination.pageSize + index + 1,
  name: task.name,
  riskLevel: getTaskRiskLevel(task),
  role: task.roleName || '-',
  tag: task.tags || '-',
  owner: getUserName(task.assigneeId),
  assigneeId: task.assigneeId,
  priority: getDictLabel('taskPriority', task.priority),
  priorityCode: task.priority,
  status: getDictLabel('taskStatus', task.status),
  statusCode: task.status,
  planStart: task.plannedStartDate || '-',
  planEnd: task.plannedEndDate || '-',
  plannedEndDate: task.plannedEndDate || null,
  actualStart: task.actualStartDate || '-',
  actualEnd: task.actualEndDate || '-',
})
const mapBugRow = bug => ({ id: bug.id, code: `BUG-${bug.id}`, title: bug.title, severity: getDictLabel('bugPriority', bug.priority), priorityCode: bug.priority, status: getDictLabel('bugStatus', bug.status), statusCode: bug.status, assignee: getUserName(bug.assigneeId), creator: getUserName(bug.creatorId) })
const mapReportRow = report => ({ id: report.id, title: report.title, type: getDictLabel('reportType', report.reportType), typeCode: report.reportType, status: getDictLabel('reportStatus', report.status), statusCode: report.status, planTime: report.plannedDate, actualTime: report.actualDate || '-', target: report.targetAudience, place: report.locationMethod, description: report.description, taskId: report.taskId || report.relatedTaskId || undefined, taskName: report.taskName || report.relatedTaskName || undefined })
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
const getReportQueryParams = projectId => ({
  projectId,
  pageNo: reportPagination.current,
  pageSize: reportPagination.pageSize,
  keyword: reportListFilter.keyword || undefined,
  status: reportListFilter.status === '全部' ? undefined : reportListFilter.status,
  plannedDateFrom: reportListFilter.dateRange?.[0],
  plannedDateTo: reportListFilter.dateRange?.[1],
})
const fetchTaskPage = async (projectId = route.params.id) => {
  taskLoading.value = true
  try {
    applyTaskResult(await getProjectTasks({ projectId, pageNo: taskPagination.current, pageSize: taskPagination.pageSize }))
  } catch (error) {
    message.error(error.message)
  } finally {
    taskLoading.value = false
  }
}
const fetchBugPage = async (projectId = route.params.id) => {
  bugLoading.value = true
  try {
    applyBugResult(await getProjectBugs({ projectId, pageNo: bugPagination.current, pageSize: bugPagination.pageSize, ...Object.fromEntries(Object.entries(bugListFilter).filter(([, value]) => value !== '')) }))
  } catch (error) {
    message.error(error.message)
  } finally {
    bugLoading.value = false
  }
}
const fetchReportPage = async (projectId = route.params.id) => {
  reportLoading.value = true
  try {
    applyReportResult(await getProjectReports(getReportQueryParams(projectId)))
  } catch (error) {
    message.error(error.message)
  } finally {
    reportLoading.value = false
  }
}
const handleTaskPageChange = async (page, pageSize) => {
  taskPagination.current = page
  taskPagination.pageSize = pageSize
  await fetchTaskPage()
}
const handleBugPageChange = async (page, pageSize) => {
  bugPagination.current = page
  bugPagination.pageSize = pageSize
  await fetchBugPage()
}
const handleBugFilterChange = async filter => {
  bugListFilter.status = filter.status || ''
  bugListFilter.assigneeId = filter.assigneeId || ''
  bugListFilter.priority = filter.priority || ''
  bugPagination.current = 1
  await fetchBugPage()
}
const handleReportPageChange = async (page, pageSize) => {
  reportPagination.current = page
  reportPagination.pageSize = pageSize
  await fetchReportPage()
}
const handleReportFilterChange = async filter => {
  Object.assign(reportListFilter, filter)
  reportPagination.current = 1
  await fetchReportPage()
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
    if (viewMode.value === 'detail') {
      void recordOperationLog({
        module: OPERATION_MODULES.MANAGEMENT_PROJECT,
        action: OPERATION_ACTIONS.DETAIL,
        bizType: 'PROJECT',
        bizId: projectId,
        bizName: currentProject.value?.name,
        detail: `查看管理类项目详情：${currentProject.value?.name || projectId}`,
        routeName: 'ManagementProjectDetail',
      })
    }
    Object.assign(ganttSummaryData, ganttResult)
    ganttNodeRows.value = nodes.map(node => {
      const planStart = node.plannedStartDate?.replaceAll('-', '/') || '-'
      const planEnd = node.plannedEndDate?.replaceAll('-', '/') || '-'
      const actualStart = node.actualStartDate?.replaceAll('-', '/') || '-'
      const actualEnd = node.actualEndDate?.replaceAll('-', '/') || '-'
      return { id: node.id, name: node.nodeName, planStart, planEnd, planTime: formatDateRange(planStart, planEnd), actualStart, actualEnd, actualTime: formatDateRange(actualStart, actualEnd), status: getDictLabel('taskStatus', node.status), statusCode: node.status, progress: node.progressPercent || 0, isOverdue: node.status === 'OVERDUE' || node.status === 'OVERDUE_START' || node.status === 'OVERDUE_COMPLETED' }
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
    upper_header_height: 44,
    lower_header_height: 32,
    bar_height: 30,
    padding: 42,
    popup: ({ task, set_title, set_subtitle, set_details }) => {
      set_title('计划与实际时间')
      set_subtitle('')
      set_details(`<div class="gantt-popup__dates"><span>计划开始</span><strong>${task.planStart}</strong><span>实际开始</span><strong>${task.actualStart === '-' ? '未填写' : task.actualStart}</strong><span>计划结束</span><strong>${task.planEnd}</strong><span>实际结束</span><strong>${task.actualEnd === '-' ? '未填写' : task.actualEnd}</strong></div>`)
    },
    scroll_to: ganttScrollStart.value,
  })
  const pixelsPerDay = ganttInstance.config.column_width / 30
  ganttNodeRows.value.forEach(node => {
    const planStart = formatNodeDate(node.planStart)
    const actualStart = formatNodeDate(node.actualStart)
    const actualEnd = formatNodeDate(node.actualEnd) || (actualStart ? dayjs().format('YYYY-MM-DD') : undefined)
    if (!planStart || !actualStart || !actualEnd) return

    const bar = ganttInstance.get_bar(String(node.id))
    if (!bar || dayjs(actualEnd).isBefore(dayjs(actualStart))) return

    const actualBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    actualBar.setAttribute('class', 'gantt-actual-bar')
    actualBar.setAttribute('x', bar.x + dayjs(actualStart).diff(dayjs(planStart), 'day') * pixelsPerDay)
    actualBar.setAttribute('y', bar.y)
    actualBar.setAttribute('width', Math.max(dayjs(actualEnd).diff(dayjs(actualStart), 'day'), 1) * pixelsPerDay)
    actualBar.setAttribute('height', bar.height)
    actualBar.setAttribute('rx', 3)
    actualBar.setAttribute('ry', 3)
    bar.bar_group.insertBefore(actualBar, bar.bar_group.querySelector('.bar-label'))
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
  if (viewMode.value === 'list') { syncQueryFromRoute(); await fetchProjects(); return }
  const projectId = route.params.id
  if (viewMode.value === 'detail') {
    activeTab.value = 'gantt'
    taskPagination.current = 1
    bugPagination.current = 1
    reportPagination.current = 1
    Object.assign(reportListFilter, { keyword: '', status: '全部', dateRange: [] })
    await fetchProjectRelatedData(projectId)
  }
}
watch(() => [route.name, route.params.id, route.query.status], syncRoute)
watch(activeTab, renderGantt)
watch(groupField, () => { collapsedGroups.value = [] })
onBeforeUnmount(() => { ganttInstance = null })
onMounted(async () => {
  await fetchReferenceData()
  await syncRoute()
})

const handleSearch = async () => {
  Object.assign(appliedQuery, query)
  projectPagination.current = 1
  await fetchProjects()
  void recordOperationLog({
    module: OPERATION_MODULES.MANAGEMENT_PROJECT,
    action: OPERATION_ACTIONS.QUERY,
    bizType: 'PROJECT',
    bizName: '管理类项目列表',
    detail: {
      keyword: query.keyword,
      managerId: query.managerId,
      type: query.type,
      contractStatus: query.contractStatus,
      stage: query.stage,
      status: query.status,
    },
    routeName: 'ManagementProjects',
  })
}
const handleReset = async () => { Object.assign(query, { keyword: '', managerId: '全部', type: '全部', contractStatus: '全部', stage: '全部', status: '全部' }); Object.assign(appliedQuery, query); projectPagination.current = 1; await fetchProjects() }
const handleProjectPageChange = async (page, pageSize) => { projectPagination.current = page; projectPagination.pageSize = pageSize; await fetchProjects() }
const isGroupCollapsed = value => collapsedGroups.value.includes(value)
const handleToggleGroup = value => {
  collapsedGroups.value = isGroupCollapsed(value) ? collapsedGroups.value.filter(item => item !== value) : [...collapsedGroups.value, value]
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
    await updateGanttNode(route.params.id, ganttForm.id, { nodeName: ganttForm.name, plannedStartDate: ganttForm.planStart, plannedEndDate: ganttForm.planEnd, actualStartDate: ganttForm.actualStart || null, actualEndDate: ganttForm.actualEnd || null, progressPercent: ganttForm.progress })
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
const handleDetail = record => {
  void recordOperationLog({
    module: OPERATION_MODULES.MANAGEMENT_PROJECT,
    action: OPERATION_ACTIONS.DETAIL,
    bizType: 'PROJECT',
    bizId: record.id,
    bizName: record.name,
    detail: `查看管理类项目详情：${record.name}`,
    routeName: 'ManagementProjectDetail',
  })
  router.push({ name: 'ManagementProjectDetail', params: { id: record.id } })
}
const handleBack = () => router.push({ name: 'ManagementProjects' })
const handleTaskDetail = record => router.push({ name: 'AllTasks', query: { detail: 'task', taskId: String(record.id) } })
const handleBugDetail = record => router.push({ name: 'BugDetail', params: { id: String(record.id) } })
const handleDelete = async record => {
  try {
    await deleteProject(record.id)
    message.success('项目删除成功')
    void recordOperationLog({
      module: OPERATION_MODULES.MANAGEMENT_PROJECT,
      action: OPERATION_ACTIONS.DELETE,
      bizType: 'PROJECT',
      bizId: record.id,
      bizName: record.name,
      detail: `删除管理类项目：${record.name}`,
      routeName: 'ManagementProjects',
    })
    await fetchProjects()
  } catch (error) {
    message.error(error.message)
  }
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
const handleSelectDocumentCategory = category => {
  selectedDocumentCategory.value = category
  const visibleIds = new Set(filteredDocumentRows.value.map(item => item.isFolder ? folderKey(item.folderId) : item.id))
  selectedDocumentIds.value = normalizeDocumentSelection(selectedDocumentIds.value.filter(id => visibleIds.has(id)))
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
const handleDeleteFolder = async record => {
  try {
    await deleteProjectFolder(record.folderId)
    folderRows.value = folderRows.value.filter(folder => String(folder.id) !== String(record.folderId))
    documentRows.value = documentRows.value.map(file =>
      String(file.folderId) === String(record.folderId) ? { ...file, folderId: null } : file
    )
    message.success('文件夹已删除，文件夹内文件已移至根目录')
  } catch (error) {
    message.error(error.message || '删除失败')
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
const loadReportAttachments = async reportId => {
  const files = await getProjectFiles({ businessType: 'PROJECT_REPORT', businessId: reportId })
  reportAttachmentRows.value = files.map(file => ({
    id: file.id,
    name: file.originalName,
  }))
}
const handleReportAttachmentBeforeUpload = file => {
  if (file.size > 50 * 1024 * 1024) {
    message.warning('单个文件不能超过50MB')
    return false
  }
  reportAttachmentFiles.value.push({ uid: file.uid, name: file.name, originFile: file })
  return false
}
const handleRemoveReportAttachment = uid => {
  reportAttachmentFiles.value = reportAttachmentFiles.value.filter(file => file.uid !== uid)
}
const handleDownloadReportAttachment = async file => {
  try {
    const result = await downloadProjectFile(file.id)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(result.blob)
    link.download = result.fileName
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (error) {
    message.error(error.message)
  }
}
const handleViewReport = async record => {
  reportDetailVisible.value = true
  reportDetailLoading.value = true
  currentReportDetail.value = null
  reportDetailRemark.value = ''
  reportDetailTaskType.value = 'meeting'
  reportAttachmentRows.value = []
  reportAttachmentFiles.value = []
  try {
    const [detail] = await Promise.all([
      loadReportDetail(record.id),
      loadReportAttachments(record.id),
    ])
    currentReportDetail.value = detail
    reportDetailRemark.value = currentReportDetail.value.remark
  } catch (error) {
    message.error(error.message)
    reportDetailVisible.value = false
  } finally { reportDetailLoading.value = false }
}
const handleConfirmReportRemark = async () => {
  if (!currentReportDetail.value) return
  reportAttachmentUploading.value = true
  try {
    await updateProjectReport(currentReportDetail.value.id, { remark: reportDetailRemark.value })
    for (const attachment of [...reportAttachmentFiles.value]) {
      const data = new FormData()
      data.append('businessType', 'PROJECT_REPORT')
      data.append('businessId', currentReportDetail.value.id)
      data.append('file', attachment.originFile)
      await uploadProjectFile(data)
      handleRemoveReportAttachment(attachment.uid)
    }
    currentReportDetail.value = await loadReportDetail(currentReportDetail.value.id)
    reportDetailRemark.value = currentReportDetail.value.remark
    await loadReportAttachments(currentReportDetail.value.id)
    message.success('汇报信息已保存')
  } catch (error) {
    message.error(error.message)
  } finally {
    reportAttachmentUploading.value = false
  }
}
const handleEditReportItem = item => {
  reportItemMode.value = 'edit'
  editingItemId.value = item.id
  Object.assign(reportItemForm, {
    content: item.content === '-' ? '' : item.content,
    ownerId: item.ownerId,
    priority: item.priorityCode,
    status: item.statusCode,
    plannedDate: item.plannedDate === '-' ? undefined : item.plannedDate,
    description: item.description === '-' ? '' : item.description,
  })
  reportItemFormRef.value?.clearValidate()
  reportItemVisible.value = true
}
const handleDeleteReportItem = async item => {
  if (!currentReportDetail.value) return
  try {
    await deleteReportItem(currentReportDetail.value.id, item.id)
    currentReportDetail.value = await loadReportDetail(currentReportDetail.value.id)
    reportDetailRemark.value = currentReportDetail.value.remark
    message.success('准备项已删除')
  } catch (error) {
    message.error(error.message)
  }
}
const handleSubmitReportItem = async () => {
  if (reportItemLoading.value) return
  await reportItemFormRef.value?.validate()
  if (!currentReportDetail.value) return
  reportItemLoading.value = true
  try {
    const data = {
      content: reportItemForm.content,
      ownerId: reportItemForm.ownerId,
      priority: reportItemForm.priority,
      status: reportItemForm.status,
      plannedDate: reportItemForm.plannedDate || null,
      description: reportItemForm.description || null,
    }
    if (editingItemId.value) {
      await updateReportItem(currentReportDetail.value.id, editingItemId.value, data)
    } else {
      await createReportItem(currentReportDetail.value.id, data)
    }
    currentReportDetail.value = await loadReportDetail(currentReportDetail.value.id)
    reportDetailRemark.value = currentReportDetail.value.remark
    reportItemVisible.value = false
    message.success(editingItemId.value ? '准备项已更新' : '准备项已添加')
  } catch (error) {
    message.error(error.message)
  } finally { reportItemLoading.value = false }
}
const handleUpdateReportStatus = async status => {
  if (!currentReportDetail.value) return
  try {
    await updateReportStatus(currentReportDetail.value.id, { status })
    currentReportDetail.value = await loadReportDetail(currentReportDetail.value.id)
    reportDetailRemark.value = currentReportDetail.value.remark
    message.success('状态已更新')
  } catch (error) {
    message.error(error.message)
  }
}
const linkedTaskIds = computed(() => {
  if (!currentReportDetail.value) return new Set()
  return new Set(currentReportDetail.value.items.filter(item => item.relatedTaskId).map(item => String(item.relatedTaskId)))
})
const taskPickerRowSelection = computed(() => ({
  selectedRowKeys: selectedTaskIds.value,
  preserveSelectedRowKeys: true,
  onChange: keys => {
    selectedTaskIds.value = keys
    const selectedKeys = new Set(keys.map(String))
    const next = new Map(selectedTaskRecords.value)
    taskPickerRows.value.forEach(task => {
      if (selectedKeys.has(String(task.id))) next.set(String(task.id), task)
      else next.delete(String(task.id))
    })
    selectedTaskRecords.value = next
  },
  getCheckboxProps: record => ({ disabled: linkedTaskIds.value.has(String(record.id)) }),
}))
const fetchTaskPickerTasks = async () => {
  taskPickerLoading.value = true
  try {
    const result = await getProjectTasks({
      projectId: route.params.id,
      pageNo: taskPickerPagination.current,
      pageSize: taskPickerPagination.pageSize,
    })
    taskPickerRows.value = result.records.map(task => ({
      id: task.id,
      name: task.name,
      owner: getUserName(task.assigneeId),
      assigneeId: task.assigneeId,
      priority: getDictLabel('taskPriority', task.priority),
      priorityCode: task.priority,
      status: getDictLabel('taskStatus', task.status),
      statusCode: task.status,
      planEnd: task.plannedEndDate || '-',
      plannedEndDate: task.plannedEndDate || null,
    }))
    taskPickerPagination.total = result.total ?? result.records.length
  } catch (error) {
    taskPickerRows.value = []
    taskPickerPagination.total = 0
    message.error(error.message)
  } finally {
    taskPickerLoading.value = false
  }
}
const handleOpenTaskPicker = async () => {
  selectedTaskIds.value = []
  selectedTaskRecords.value = new Map()
  taskPickerPagination.current = 1
  taskPickerVisible.value = true
  await fetchTaskPickerTasks()
}
const handleTaskPickerPageChange = async (page, pageSize) => {
  taskPickerPagination.current = page
  taskPickerPagination.pageSize = pageSize
  await fetchTaskPickerTasks()
}
const handleLinkTasks = async () => {
  if (!selectedTaskIds.value.length) { message.warning('请选择要关联的任务'); return }
  if (!currentReportDetail.value) return
  taskPickerConfirming.value = true
  try {
    const tasksToLink = Array.from(selectedTaskRecords.value.values())
    await Promise.all(tasksToLink.map(task => createReportItem(currentReportDetail.value.id, {
      content: task.name,
      ownerId: task.assigneeId || null,
      priority: task.priorityCode || 'MEDIUM',
      status: task.statusCode || 'NOT_STARTED',
      plannedDate: task.plannedEndDate || null,
      description: null,
      relatedTaskId: task.id,
    })))
    currentReportDetail.value = await loadReportDetail(currentReportDetail.value.id)
    reportDetailRemark.value = currentReportDetail.value.remark
    taskPickerVisible.value = false
    selectedTaskIds.value = []
    selectedTaskRecords.value = new Map()
    message.success(`已关联 ${tasksToLink.length} 个任务`)
  } catch (error) {
    message.error(error.message)
  } finally { taskPickerConfirming.value = false }
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
  Object.assign(reportForm, { title: record.title, type: record.typeCode, status: record.statusCode, planDate: dayjs(record.planTime), actualDate: record.actualTime === '-' ? undefined : dayjs(record.actualTime), task: record.taskId ? String(record.taskId) : undefined, target: record.target, place: record.place, description: record.description })
  reportVisible.value = true
}
const handleSubmitReport = async () => {
  if (reportSubmitLoading.value) return
  await reportFormRef.value?.validate()
  reportSubmitLoading.value = true
  try {
    const reportData = { projectId: route.params.id, title: reportForm.title, reportType: reportForm.type, status: reportForm.status, plannedDate: reportForm.planDate.format('YYYY-MM-DD'), actualDate: reportForm.actualDate?.format('YYYY-MM-DD') || null, relatedTaskId: reportForm.task || undefined, targetAudience: reportForm.target, locationMethod: reportForm.place, description: reportForm.description }
    if (editingReportId.value) await updateProjectReport(editingReportId.value, reportData)
    else await createProjectReport(reportData)
    void recordOperationLog({
      module: OPERATION_MODULES.MANAGEMENT_PROJECT,
      action: editingReportId.value ? OPERATION_ACTIONS.UPDATE : OPERATION_ACTIONS.CREATE,
      bizType: 'PROJECT_REPORT',
      bizId: editingReportId.value,
      bizName: reportForm.title,
      detail: editingReportId.value ? `编辑项目汇报：${reportForm.title}` : `新建项目汇报：${reportForm.title}`,
      routeName: 'ManagementProjectDetail',
    })
    message.success(editingReportId.value ? '汇报编辑成功' : '汇报新建成功')
    reportVisible.value = false
    await fetchProjectRelatedData(route.params.id)
  } catch (error) {
    message.error(error.message)
  } finally { reportSubmitLoading.value = false }
}
const handleDeleteReport = async record => {
  try {
    await deleteProjectReport(record.id)
    void recordOperationLog({
      module: OPERATION_MODULES.MANAGEMENT_PROJECT,
      action: OPERATION_ACTIONS.DELETE,
      bizType: 'PROJECT_REPORT',
      bizId: record.id,
      bizName: record.title,
      detail: `删除项目汇报：${record.title}`,
      routeName: 'ManagementProjectDetail',
    })
    message.success('汇报删除成功')
    await fetchProjectRelatedData(route.params.id)
  } catch (error) {
    message.error(error.message)
  }
}
</script>

<style scoped>
.project-page { min-height: 100%; width: min(1600px, 100%); margin: 0 auto; overflow: visible; color: #262626; }
.project-page--list { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; }
.project-filter, .project-list { border: 1px solid #edf0f3; box-shadow: 0 2px 8px rgb(0 0 0 / 3%); }
.project-filter { flex: 0 0 auto; margin-bottom: 16px; }
.project-filter :deep(.ant-card-body) { padding: 16px 18px 2px; }
.project-filter__form { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: 26px; }
.project-filter__form :deep(.ant-form-item) { margin: 0 0 14px; }
.project-filter__form :deep(.ant-form-item-row) { width: 100%; flex-wrap: nowrap; }
.project-filter__form :deep(.ant-form-item-label) { flex: 0 0 80px; width: 80px; text-align: right; }
.project-filter__form :deep(.ant-form-item-control), .project-filter__form :deep(.ant-input), .project-filter__form :deep(.ant-select) { width: 100%; }
.project-filter__actions { justify-self: end; }
.project-list { flex: 1; min-height: 0; margin-bottom: 20px; }
.project-list :deep(.ant-card-body) { display: flex; flex-direction: column; height: 100%; min-height: 0; padding: 18px 18px 10px; }
.project-list__toolbar, .section-heading, .document-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.project-list__toolbar { flex: 0 0 auto; }
.project-list__content { flex: 1; min-height: 0; margin-bottom: 10px; overflow: auto; }
.project-list__content > :deep(.ant-table-wrapper) { min-height: 100%; }
.project-list__pagination { flex: 0 0 auto; align-self: flex-end; }
.project-list__display { display: flex; align-items: center; gap: 12px; color: #666; }
.project-list__display :deep(.ant-select) { width: 130px; }
.project-list :deep(.ant-table-cell) { white-space: nowrap; }
.project-group-list { min-height: 100%; }
.project-group + .project-group { margin-top: 8px; }
.project-group__header { display: flex; align-items: center; justify-content: space-between; height: 40px; padding: 0 14px; font-weight: 600; background: #fafafa; border-top: 1px solid #edf0f3; border-bottom: 1px solid #edf0f3; }
.project-group__header button { display: inline-flex; gap: 8px; align-items: center; padding: 0; font-weight: 600; background: transparent; border: 0; cursor: pointer; }
.table-link { height: auto; padding: 0; }
.project-detail { min-height: 100%; overflow: visible; }
.project-detail__heading { display: flex; align-items: center; gap: 16px; margin-bottom: 6px; }
.project-detail__heading :deep(.ant-tag) { padding: 6px 14px; font-size: 16px; }
.project-tabs { display: flex; gap: 44px; height: 44px; padding-left: 8px; }
.project-tabs button { display: inline-flex; align-items: center; gap: 7px; height: 44px; padding: 0 7px; background: transparent; border: 0; border-bottom: 3px solid transparent; cursor: pointer; }
.project-tabs button.active { color: #1677ff; border-bottom-color: #1677ff; }
.project-detail__layout { min-height: 530px; }
.project-detail__main { min-width: 0; overflow: visible; background: #fff; }
.detail-panel { min-height: 530px; padding: 14px; overflow: visible; }
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
.project-summary-table { width: 100%; table-layout: fixed; border-collapse: collapse; }
.project-summary-table th,
.project-summary-table td { min-height: 42px; padding: 10px 12px; text-align: left; border: 1px solid #e5e6eb; }
.project-summary-table th { width: 100px; color: #1f1f1f; font-weight: 600; background: #fafafa; }
.project-summary-table td { color: #262626; overflow-wrap: anywhere; }
.document-upload-modal :deep(.ant-modal-body) { padding-top: 8px; }
.document-upload-modal :deep(.ant-upload-drag) { padding: 18px; border: 2px dashed #91caff; background: #fbfdff; }
.upload-drag-icon { margin: 0 !important; color: #1677ff; font-size: 48px; }
.upload-drag-title { margin: 8px 0 4px !important; font-size: 17px; font-weight: 500; }.upload-drag-title span { color: #1677ff; }
.upload-drag-hint { margin: 2px 0 !important; color: #8c8c8c; }
.upload-list-title { margin: 18px 0 10px; }
.upload-file-list { min-height: 70px; padding-bottom: 14px; border-bottom: 1px solid #edf0f3; }
.upload-file-item { display: grid; grid-template-columns: 28px minmax(180px, 1fr) 72px 46px; gap: 10px; align-items: center; min-height: 42px; }
.upload-file-item__icon { color: #1677ff; font-size: 22px; }.upload-file-item__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.upload-file-item__success { color: #52c41a; }
.upload-form { margin-top: 18px; }.upload-form__row { display: block; }.upload-form :deep(.ant-form-item) { margin-bottom: 18px; }.upload-form :deep(.ant-select) { width: 100%; }
.upload-modal-actions { display: flex; justify-content: flex-end; gap: 16px; }.upload-modal-actions .ant-btn { width: 118px; }
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
.report-detail-remark { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 10px; align-items: flex-start; margin-bottom: 10px; }
.report-detail-remark label { padding-top: 6px; font-weight: 500; }
.report-detail-attachment { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 10px; align-items: flex-start; margin-bottom: 10px; }
.report-detail-attachment > label { padding-top: 6px; font-weight: 500; }
.report-detail-attachment__content { min-width: 0; }
.report-detail-attachment :deep(.ant-upload-drag) { padding: 12px; background: #fafcff; }
.report-detail-attachment :deep(.ant-upload-drag-icon) { margin-bottom: 4px; font-size: 30px; }
.report-detail-attachment :deep(.ant-upload-text) { margin-bottom: 2px; font-size: 14px; }
.report-detail-attachment :deep(.ant-upload-hint) { font-size: 12px; }
.report-detail-attachment__list { margin-top: 8px; border: 1px solid #edf0f3; border-radius: 6px; }
.report-detail-attachment__list > div { display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; gap: 8px; align-items: center; min-height: 34px; padding: 2px 10px; }
.report-detail-attachment__list > div + div { border-top: 1px solid #edf0f3; }
.report-detail-attachment__list span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.report-detail-remark-actions { display: flex; justify-content: center; margin-bottom: 14px; }
.report-task-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.report-item-table :deep(.ant-table-body) { max-height: 200px; overflow-y: auto !important; }
.task-picker-pagination { display: flex; justify-content: flex-end; margin-top: 12px; }
.report-detail-log-title { margin-top: 28px; }
.report-detail-logs { height: 200px; padding: 16px 18px 4px; overflow-x: hidden; overflow-y: auto; border: 1px solid #f0f0f0; border-radius: 6px; }
.report-detail-log-meta { color: #8c8c8c; font-size: 12px; }
.report-detail-logs p { margin: 6px 0 0; color: #1f1f1f; }
.report-detail-view :deep(.ant-table-cell) { white-space: nowrap; }
.report-modal :deep(.ant-modal-body) { padding-top: 12px; }.report-modal :deep(.ant-form-item) { margin-bottom: 20px; }.report-modal :deep(.ant-picker), .report-modal :deep(.ant-select) { width: 100%; }.report-modal__actions { display: flex; justify-content: flex-end; gap: 10px; }.report-modal__actions .ant-btn { min-width: 80px; }
@media (max-width: 1280px) { .project-filter__form { grid-template-columns: repeat(2, minmax(0, 1fr)); }.project-tabs { gap: 20px; }.project-summary { grid-template-columns: 1fr; }.project-summary__progress { padding: 16px 0 0; border-top: 1px solid #edf0f3; border-left: 0; } }
</style>
