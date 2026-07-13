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
          <h3>任务列表</h3>
          <a-table row-key="id" :columns="taskColumns" :data-source="taskRows" :loading="taskLoading" :pagination="pagination" size="small" :scroll="{ x: 950 }">
            <template #bodyCell="{ column, text }">
              <a-tag v-if="column.dataIndex === 'priority'" color="red">{{ text }}</a-tag>
              <a-tag v-else-if="column.dataIndex === 'status'" color="processing">{{ text }}</a-tag>
            </template>
          </a-table>
        </section>

        <section v-if="activeTab === 'bugs'" class="detail-panel">
          <h3>Bug 列表</h3>
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

          <a-form class="report-filter" layout="inline">
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

          <a-table row-key="id" :columns="reportColumns" :data-source="filteredReportRows" :loading="reportLoading" :pagination="pagination" :scroll="{ x: 1040 }">
            <template #bodyCell="{ column, record, text }">
              <a-button v-if="column.dataIndex === 'title'" type="link" @click="emit('edit-report', record)">{{ text }}</a-button>
              <a-tag v-else-if="column.dataIndex === 'status'" color="green">{{ text }}</a-tag>
              <a-space v-else-if="column.dataIndex === 'operation'" :size="2">
                <a-button type="link" size="small" @click="emit('edit-report', record)">编辑</a-button>
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
              <a-button type="primary" @click.stop="emit('open-upload')">
                <UploadOutlined />
                上传文件
              </a-button>
              <a-popconfirm title="确定删除选中文件吗？" @confirm="emit('delete-documents')">
                <a-button danger :disabled="selectedDocumentIds.length === 0">
                  <DeleteOutlined />
                  批量删除
                </a-button>
              </a-popconfirm>
            </a-space>
          </div>
          <div class="document-categories">
            <button v-for="item in documentCategories" :key="item.label" type="button" :class="[item.class, { active: item.active }]" @click="emit('select-document-category', item.label)">
              <span class="document-category__icon"><component :is="item.icon" /></span>
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </button>
          </div>
          <a-table row-key="id" :row-selection="documentRowSelection" :columns="documentColumns" :data-source="documentRows" :loading="documentLoading" :pagination="false">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'name'">
                <button type="button" class="document-name" @click="emit('download-document', record)">
                  <FileOutlined />
                  <span>{{ record.name }}</span>
                </button>
              </template>
              <template v-else-if="column.dataIndex === 'category'">
                <a-tag color="blue">{{ record.category }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'operation'">
                <a-space>
                  <a-button type="link" size="small" @click="emit('download-document', record)">下载</a-button>
                  <a-popconfirm title="确定删除该文件吗？" @confirm="emit('delete-document', record)">
                    <a-button type="link" size="small" danger>删除</a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { DeleteOutlined, FileOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons-vue'
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
  pagination: { type: Object, required: true },
})

const emit = defineEmits([
  'update:activeTab',
  'create-report',
  'edit-report',
  'delete-report',
  'open-upload',
  'select-document-category',
  'delete-documents',
  'download-document',
  'delete-document',
])

const ganttRef = ref()
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

    if (reportFilter.status && reportFilter.status !== '全部' && record.status !== reportFilter.status) {
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

defineExpose({
  getGanttElement: () => ganttRef.value,
})
</script>

<style scoped>
.project-tabs {
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
  min-height: 530px;
}

.project-detail__main {
  min-width: 0;
  overflow: hidden;
  background: #fff;
}

.detail-panel {
  min-height: 530px;
  padding: 14px;
  overflow: auto;
}

.detail-panel h3 {
  margin: 0 0 12px;
}

.gantt-panel {
  padding: 12px;
}

.project-stat-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.project-stat-row .semantic-card {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  height: 86px;
  padding: 14px 15px;
  border: 1px solid rgb(0 0 0 / 5%);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgb(0 0 0 / 5%);
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

.gantt-node-table :deep(.ant-table-thead > tr > th) {
  text-align: center;
  white-space: nowrap;
}

.gantt-node-table :deep(.ant-table-tbody > tr > td) {
  text-align: center;
  white-space: nowrap;
}

.gantt-node-table :deep(.ant-table-tbody > tr) {
  cursor: pointer;
}

.gantt-node-table :deep(.ant-table-tbody > tr:hover > td) {
  background: #edf6ff;
}

.date-range {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
}

.date-overdue {
  color: #ff4d4f;
}

.gantt-scroll {
  width: 100%;
  min-width: 0;
  height: 100%;
  overflow: hidden;
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

.document-categories {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.document-categories button {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  background: #fff;
  border: 1px solid #edf0f3;
  border-radius: 12px;
  cursor: pointer;
}

.document-categories button.active {
  color: #1677ff;
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgb(22 119 255 / 12%);
}

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

.document-name span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1200px) {
  .document-categories {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
