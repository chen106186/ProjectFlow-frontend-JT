<template>
  <div class="project-detail-tabs">
    <div class="project-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        :class="{ active: activeTab === tab.key }"
        @click="emit('update:activeTab', tab.key)"
      >
        <component :is="tab.icon" />
        {{ tab.label }}
      </button>
    </div>

    <div class="project-detail__layout">
      <main class="project-detail__main">
        <section v-show="activeTab === 'gantt'" class="detail-panel gantt-panel">
          <div class="project-stat-row">
            <div v-for="item in ganttSummary" :key="item.label" class="semantic-card" :class="item.class">
              <span class="semantic-card__icon"><component :is="item.icon" /></span>
              <span class="semantic-card__content">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.desc }}</small>
              </span>
            </div>
          </div>
          <div class="gantt-workspace" :style="{ gridTemplateColumns: `${ganttTableWidth}px minmax(0, 1fr)`, height: `${ganttWorkspaceHeight}px` }">
            <a-table
              class="gantt-node-table"
              row-key="id"
              :columns="ganttNodeColumns"
              :data-source="ganttNodeRows"
              :loading="detailLoading"
              :pagination="false"
              :custom-row="ganttCustomRow"
              size="small"
              table-layout="fixed"
            >
              <template #bodyCell="{ column, record, text }">
                <template v-if="column.dataIndex === 'status'">
                  <a-tag :color="ganttStatusColors[text]">{{ text }}</a-tag>
                </template>
                <template v-else-if="column.dataIndex === 'progress'">
                  <a-progress :percent="text" size="small" />
                </template>
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
        </section>

        <section v-if="activeTab === 'tasks'" class="detail-panel">
          <h3>全局风险预警</h3>
          <div class="risk-grid">
            <div v-for="risk in risks" :key="risk.label" class="semantic-card" :class="risk.class">
              <span class="semantic-card__icon"><component :is="risk.icon" /></span>
              <span class="semantic-card__content">
                <span>{{ risk.label }}</span>
                <strong>{{ risk.value }}</strong>
                <small>{{ risk.desc }}</small>
              </span>
            </div>
          </div>
          <div class="section-heading">
            <h3>任务列表</h3>
            <a-space>
              <a-select value="全部状态" :options="taskStatusFilters" />
              <a-select value="全部负责人" :options="personFilterOptions" />
            </a-space>
          </div>
          <a-table row-key="id" :columns="taskColumns" :data-source="taskRows" :loading="taskLoading" :pagination="pagination" size="small" :scroll="{ x: 950 }">
            <template #bodyCell="{ column, text }">
              <a-tag v-if="column.dataIndex === 'priority'" color="red">{{ text }}</a-tag>
              <a-tag v-else-if="column.dataIndex === 'status'" color="processing">{{ text }}</a-tag>
            </template>
          </a-table>
        </section>

        <section v-if="activeTab === 'bugs'" class="detail-panel">
          <h3>Bug 总览</h3>
          <div class="bug-summary">
            <div v-for="item in bugSummary" :key="item.label" class="semantic-card" :class="item.class">
              <span class="semantic-card__icon"><component :is="item.icon" /></span>
              <span class="semantic-card__content">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }} 个</strong>
              </span>
            </div>
          </div>
          <div class="section-heading">
            <h3>Bug 列表</h3>
            <a-space>
              <a-select value="全部状态" :options="bugStatusFilters" />
              <a-select value="全部指定人" :options="personFilterOptions" />
            </a-space>
          </div>
          <a-table row-key="id" :columns="bugColumns" :data-source="bugRows" :loading="bugLoading" :pagination="pagination" size="small" :scroll="{ x: 900 }">
            <template #bodyCell="{ column, text }">
              <a-tag v-if="column.dataIndex === 'severity'" color="red">{{ text }}</a-tag>
              <a-tag v-else-if="column.dataIndex === 'status'" color="orange">{{ text }}</a-tag>
            </template>
          </a-table>
        </section>

        <section v-if="activeTab === 'reports'" class="detail-panel">
          <div class="section-heading">
            <h2>汇报管理 <small>（共 {{ filteredReportRows.length }} 条）</small></h2>
            <a-button type="primary" @click="emit('create-report')">
              <PlusOutlined />
              新建汇报
            </a-button>
          </div>

          <a-form class="report-filter app-filter-form" layout="inline">
            <a-form-item>
              <a-input v-model:value="reportFilter.keyword" allow-clear placeholder="搜索汇报标题 / 汇报对象 / 地点方式" />
            </a-form-item>
            <a-form-item>
              <a-select v-model:value="reportFilter.status" :options="reportStatusFilters" />
            </a-form-item>
            <a-form-item>
              <a-range-picker v-model:value="reportFilter.dateRange" value-format="YYYY-MM-DD" />
            </a-form-item>
            <a-button @click="handleResetReportFilter">重置</a-button>
          </a-form>

          <a-table row-key="id" :columns="reportColumns" :data-source="filteredReportRows" :loading="reportLoading" :pagination="pagination" :scroll="{ x: 1040 }" :custom-row="getReportCustomRow">
            <template #bodyCell="{ column, record, text }">
              <a-button v-if="column.dataIndex === 'title'" type="link" @click.stop="emit('view-report', record)">{{ text }}</a-button>
              <a-tag v-else-if="column.dataIndex === 'status'" color="green">{{ text }}</a-tag>
              <a-space v-else-if="column.dataIndex === 'operation'" :size="2" @click.stop>
                <a-button type="link" size="small" @click.stop="emit('edit-report', record)">编辑</a-button>
                <a-popconfirm title="确定删除该汇报吗？" ok-text="删除" cancel-text="取消" @confirm="emit('delete-report', record)">
                  <a-button type="link" size="small" danger>删除</a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table>
        </section>

        <section v-if="activeTab === 'documents'" class="detail-panel">
          <div class="document-toolbar">
            <a-space>
              <a-button type="primary" @click.stop="emit('open-upload')"><UploadOutlined />上传文件</a-button>
              <a-button @click="emit('create-folder')"><FolderAddOutlined />新建文件夹</a-button>
              <a-button :disabled="!canBatchDownload" @click="emit('batch-download')"><DownloadOutlined />批量下载</a-button>
              <a-popconfirm title="确定删除选中文件吗？" @confirm="emit('delete-documents')">
                <a-button danger :disabled="selectedDocumentIds.length === 0"><DeleteOutlined />批量删除</a-button>
              </a-popconfirm>
            </a-space>
            <a-input-search v-model:value="documentSearch" placeholder="搜索文件名、上传人、分类..." style="width: 300px" />
          </div>
          <div class="document-breadcrumb">
            <span>文件夹支持展开查看，上传时可选择目标文件夹。</span>
          </div>
          <h3>分类导航</h3>
          <div class="document-categories">
            <button v-for="item in documentCategories" :key="item.value" type="button" :class="[item.class, { active: item.active }]" @click="emit('select-document-category', item.value)">
              <span class="document-category__icon"><component :is="item.icon" /></span>
              <span>{{ item.label }}</span>
              <strong>{{ item.count }}</strong>
            </button>
          </div>
          <a-table row-key="id" :row-selection="documentRowSelection" :columns="documentColumns" :data-source="filteredDocsBySearch" :loading="documentLoading" :pagination="false">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'name'">
                <button type="button" class="document-name" :class="{ 'document-name--folder': record.isFolder, 'document-name--child': record.isChildFile }" @click="record.isFolder ? emit('toggle-folder', record) : emit('download-document', record)">
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
                  <a-button type="link" size="small" @click="emit('download-document', record)">下载</a-button>
                  <a-popconfirm title="确定删除该文件吗？" @confirm="emit('delete-document', record)">
                    <a-button type="link" size="small" danger>删除</a-button>
                  </a-popconfirm>
                </a-space>
                <span v-else class="document-row-muted">-</span>
              </template>
            </template>
          </a-table>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { DeleteOutlined, DownloadOutlined, FileOutlined, FolderAddOutlined, FolderOpenOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { computed, reactive, ref } from 'vue'

const props = defineProps({
  activeTab: { type: String, required: true },
  tabs: { type: Array, required: true },
  ganttSummary: { type: Array, required: true },
  ganttTableWidth: { type: Number, required: true },
  ganttWorkspaceHeight: { type: Number, required: true },
  ganttNodeColumns: { type: Array, required: true },
  ganttNodeRows: { type: Array, required: true },
  ganttStatusColors: { type: Object, required: true },
  ganttCustomRow: { type: Function, required: true },
  detailLoading: { type: Boolean, default: false },
  risks: { type: Array, required: true },
  taskColumns: { type: Array, required: true },
  taskRows: { type: Array, required: true },
  taskLoading: { type: Boolean, default: false },
  taskStatusFilters: { type: Array, required: true },
  personFilterOptions: { type: Array, required: true },
  bugSummary: { type: Array, required: true },
  bugColumns: { type: Array, required: true },
  bugRows: { type: Array, required: true },
  bugLoading: { type: Boolean, default: false },
  bugStatusFilters: { type: Array, required: true },
  reportRows: { type: Array, required: true },
  reportColumns: { type: Array, required: true },
  reportLoading: { type: Boolean, default: false },
  reportStatusFilters: { type: Array, required: true },
  documentCategories: { type: Array, required: true },
  documentColumns: { type: Array, required: true },
  documentRows: { type: Array, required: true },
  documentLoading: { type: Boolean, default: false },
  documentRowSelection: { type: Object, required: true },
  selectedDocumentIds: { type: Array, required: true },
  expandedDocumentFolderIds: { type: Array, default: () => [] },
  pagination: { type: Object, required: true },
})

const emit = defineEmits([
  'update:activeTab',
  'create-report',
  'view-report',
  'edit-report',
  'delete-report',
  'open-upload',
  'create-folder',
  'batch-download',
  'select-document-category',
  'toggle-folder',
  'delete-documents',
  'download-document',
  'delete-document',
])

const ganttRef = ref()
const documentSearch = ref('')
const canBatchDownload = computed(() => props.selectedDocumentIds.length > 0)
const filteredDocsBySearch = computed(() => {
  const q = documentSearch.value.trim().toLowerCase()
  if (!q) return props.documentRows
  return props.documentRows.filter(row =>
    [row.name, row.uploader, row.category].some(v => v && v.toLowerCase().includes(q))
  )
})

const reportFilter = reactive({
  keyword: '',
  status: '全部',
  dateRange: [],
})

const filteredReportRows = computed(() =>
  props.reportRows.filter(record => {
    const keyword = reportFilter.keyword.trim()
    if (keyword) {
      const content = [record.title, record.target, record.place, record.description, record.taskName].filter(Boolean).join(' ')
      if (!content.includes(keyword)) return false
    }

    if (reportFilter.status && reportFilter.status !== '全部' && record.statusCode !== reportFilter.status) {
      return false
    }

    if (reportFilter.dateRange?.length === 2) {
      const [startDate, endDate] = reportFilter.dateRange
      const planDate = record.planTime
      if (!planDate) return false
      const current = dayjs(planDate)
      if (current.isBefore(dayjs(startDate), 'day') || current.isAfter(dayjs(endDate), 'day')) {
        return false
      }
    }

    return true
  })
)

const handleResetReportFilter = () => {
  reportFilter.keyword = ''
  reportFilter.status = '全部'
  reportFilter.dateRange = []
}

const getReportCustomRow = record => ({
  onClick: () => emit('view-report', record),
})

defineExpose({
  getGanttElement: () => ganttRef.value,
})
</script>

<style scoped>
.project-tabs {
  flex: 0 0 44px;
  display: flex;
  gap: 32px;
  height: 44px;
  padding-left: 8px;
}

.project-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 44px;
  padding: 0 7px;
  background: transparent;
  border: 0;
  border-bottom: 3px solid transparent;
  cursor: pointer;
}

.project-tabs button.active {
  color: #1677ff;
  border-bottom-color: #1677ff;
}

.project-detail__layout {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.project-detail__main {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #fff;
}

.detail-panel {
  flex: 1;
  height: 100%;
  min-height: 0;
  padding: 14px;
  overflow: auto;
}

.detail-panel h3 {
  margin: 0 0 12px;
}

.gantt-panel {
  padding: 12px;
}

.project-stat-row,
.risk-grid,
.bug-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 22px;
}

.project-stat-row {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 16px;
}

.project-stat-row .semantic-card,
.risk-grid .semantic-card,
.bug-summary .semantic-card {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  height: 86px;
  min-height: 0;
  padding: 14px 15px;
  text-align: left;
  border: 1px solid rgb(0 0 0 / 5%);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgb(0 0 0 / 5%);
  transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.28s ease;
}

.project-stat-row .semantic-card:hover,
.risk-grid .semantic-card:hover,
.bug-summary .semantic-card:hover {
  box-shadow: 0 14px 28px rgb(0 0 0 / 10%);
  transform: translateY(-4px);
}

.semantic-card__icon {
  display: inline-flex;
  flex: 0 0 36px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 20px;
  background: rgb(255 255 255 / 78%);
  border-radius: 11px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 6%);
}

.semantic-card__content {
  min-width: 0;
}

.semantic-card__content > span,
.semantic-card__content strong,
.semantic-card__content small {
  display: block;
}

.semantic-card__content > span {
  color: #6e6e73;
  font-size: 13px;
}

.semantic-card__content strong {
  margin: 3px 0;
  color: #1d1d1f;
  font-size: 19px;
}

.semantic-card__content small {
  overflow: hidden;
  color: #86868b;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gantt-progress,
.risk-due,
.bug-confirmed {
  color: #0066cc;
  background: linear-gradient(135deg, #fff 0%, #edf6ff 100%);
}

.risk-high,
.bug-severe {
  color: #d70015;
  background: linear-gradient(135deg, #fff 0%, #fff0f1 100%);
}

.risk-medium,
.bug-submitted {
  color: #c93400;
  background: linear-gradient(135deg, #fff 0%, #fff5e8 100%);
}

.risk-normal,
.bug-closed {
  color: #248a3d;
  background: linear-gradient(135deg, #fff 0%, #eefbf2 100%);
}

.gantt-workspace {
  display: grid;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #edf0f3;
}

.gantt-node-table {
  width: 100%;
  border-right: 1px solid #edf0f3;
}

.gantt-node-table :deep(.ant-table-container),
.gantt-node-table :deep(.ant-table),
.gantt-node-table :deep(.ant-table-content) {
  height: 100%;
}

.gantt-node-table :deep(.ant-table-thead > tr > th) {
  height: 86PX;
  padding: 8PX 6PX;
  text-align: center;
  white-space: nowrap;
}

.gantt-node-table :deep(.ant-table-tbody > tr > td) {
  height: 72PX;
  padding: 6PX;
  text-align: center;
  white-space: nowrap;
}

.gantt-node-table :deep(.ant-table-tbody > tr) {
  cursor: pointer;
}

.gantt-node-table :deep(.ant-table-tbody > tr:hover > td) {
  background: #edf6ff;
}

.gantt-node-table :deep(.ant-progress) {
  min-width: 76px;
}

.date-range {
  display: inline-flex;
  flex-direction: column;
  gap: 4PX;
  align-items: center;
  justify-content: center;
  height: 48PX;
  line-height: 20PX;
}

.date-overdue {
  color: #ff4d4f;
}

.gantt-scroll {
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.gantt-scroll :deep(.gantt-container) {
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  border-radius: 0;
}

.gantt-scroll :deep(.gantt) {
  display: block;
  height: 100%;
}

.gantt-scroll :deep(.popup-wrapper) {
  padding: 14px 16px;
  border: 1px solid rgb(0 0 0 / 6%);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgb(0 0 0 / 14%);
}

.gantt-scroll :deep(.popup-wrapper .title) {
  margin-bottom: 10px;
  font-size: 14px;
}

.gantt-scroll :deep(.gantt-popup__dates) {
  display: grid;
  grid-template-columns: 64px 92px;
  gap: 7px 14px;
  align-items: center;
  font-size: 12px;
}

.gantt-scroll :deep(.gantt-popup__dates span) {
  color: #86868b;
}

.gantt-scroll :deep(.gantt-popup__dates strong) {
  color: #1d1d1f;
  font-weight: 500;
}

.gantt-scroll :deep(.bar-wrapper) {
  cursor: default;
}

.gantt-scroll :deep(.bar-wrapper.gantt-empty-row),
.gantt-scroll :deep(.gantt-empty-row .bar-wrapper),
.gantt-scroll :deep(.gantt-empty-row .bar-group),
.gantt-scroll :deep(.gantt-empty-row .bar-label) {
  visibility: hidden;
}

.gantt-scroll :deep(.gantt-not-started .bar),
.gantt-scroll :deep(.gantt-not-started .bar-progress) {
  fill: #aeaeb2;
  stroke: #aeaeb2;
}

.gantt-scroll :deep(.gantt-in-progress .bar) {
  fill: #d6eaff;
  stroke: #0a84ff;
}

.gantt-scroll :deep(.gantt-in-progress .bar-progress) {
  fill: #0a84ff;
}

.gantt-scroll :deep(.gantt-due-soon .bar),
.gantt-scroll :deep(.gantt-due-soon .bar-progress) {
  fill: #ffd60a;
  stroke: #d6a600;
}

.gantt-scroll :deep(.gantt-completed .bar),
.gantt-scroll :deep(.gantt-completed .bar-progress),
.gantt-scroll :deep(.gantt-milestone .bar),
.gantt-scroll :deep(.gantt-milestone .bar-progress) {
  fill: #30d158;
  stroke: #248a3d;
}

.gantt-scroll :deep(.gantt-overdue .bar),
.gantt-scroll :deep(.gantt-overdue .bar-progress) {
  fill: #ff453a;
  stroke: #d70015;
}

.gantt-scroll :deep(.gantt-completed .bar-label),
.gantt-scroll :deep(.gantt-overdue .bar-label),
.gantt-scroll :deep(.gantt-in-progress .bar-label),
.gantt-scroll :deep(.gantt-milestone .bar-label) {
  fill: #fff;
}

.gantt-scroll :deep(.gantt-due-soon .bar-label),
.gantt-scroll :deep(.gantt-not-started .bar-label) {
  fill: #1d1d1f;
}

.section-heading,
.document-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.report-filter {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.report-filter :deep(.ant-input),
.report-filter :deep(.ant-select),
.report-filter :deep(.ant-picker) {
  min-width: 220px;
}

.document-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -2px 0 16px;
  color: #8c8c8c;
  font-size: 13px;
}

.document-breadcrumb strong {
  color: #262626;
  font-weight: 600;
}

.document-categories {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 22px;
}

.document-categories button {
  display: grid;
  grid-template-columns: 42px 1fr;
  padding: 15px;
  color: #1d1d1f;
  text-align: left;
  background: #fff;
  border: 1px solid rgb(0 0 0 / 5%);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgb(0 0 0 / 5%);
  cursor: pointer;
  transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.28s ease;
}

.document-categories button:hover {
  box-shadow: 0 14px 28px rgb(0 0 0 / 10%);
  transform: translateY(-4px);
}

.document-categories button:first-child {
  border-color: #1677ff;
}

.document-categories button.active {
  color: #1677ff;
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgb(22 119 255 / 12%);
}

.document-category__icon {
  display: inline-flex;
  grid-row: 1 / 3;
  align-self: center;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 20px;
  border-radius: 11px;
}

.document-categories strong { font-size: 17px; }

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

.document-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 0;
  color: #1677ff;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.document-name--child {
  padding-left: 28px;
}

.document-name span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-name--folder,
.document-name--folder:disabled {
  color: #8a5a00;
  cursor: default;
}

.document-row-muted {
  color: #bfbfbf;
}

@media (max-width: 1200px) {
  .document-categories {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
