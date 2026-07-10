<template>
  <div class="project-detail-tabs">
    <div class="project-tabs">
      <button v-for="tab in tabs" :key="tab.key" type="button" :class="{ active: activeTab === tab.key }" @click="emit('update:activeTab', tab.key)">
        <component :is="tab.icon" />{{ tab.label }}
      </button>
    </div>

    <div class="project-detail__layout">
      <main class="project-detail__main">
        <section v-show="activeTab === 'gantt'" class="detail-panel gantt-panel">
          <div class="project-stat-row">
            <div v-for="item in ganttSummary" :key="item.label" class="semantic-card" :class="item.class">
              <span class="semantic-card__icon"><component :is="item.icon" /></span>
              <span class="semantic-card__content"><span>{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ item.desc }}</small></span>
            </div>
          </div>
          <div class="gantt-workspace" :style="{ gridTemplateColumns: `${ganttTableWidth}px minmax(0, 1fr)`, height: `${ganttWorkspaceHeight}px` }">
            <a-table class="gantt-node-table" row-key="id" :columns="ganttNodeColumns" :data-source="ganttNodeRows" :loading="detailLoading" :pagination="false" :custom-row="ganttCustomRow" size="small" table-layout="fixed">
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
        </section>

        <section v-if="activeTab === 'tasks'" class="detail-panel">
          <h3>全局风险预警</h3>
          <div class="risk-grid">
            <div v-for="risk in risks" :key="risk.label" class="semantic-card" :class="risk.class">
              <span class="semantic-card__icon"><component :is="risk.icon" /></span>
              <span class="semantic-card__content"><span>{{ risk.label }}</span><strong>{{ risk.value }}</strong><small>{{ risk.desc }}</small></span>
            </div>
          </div>
          <div class="section-heading"><h3>任务列表</h3><a-space><a-select value="全部状态" :options="taskStatusFilters" /><a-select value="全部负责人" :options="personFilterOptions" /></a-space></div>
          <a-table row-key="id" :columns="taskColumns" :data-source="taskRows" :loading="taskLoading" :pagination="pagination" size="small" :scroll="{ x: 950 }"><template #bodyCell="{ column, text }"><a-tag v-if="column.dataIndex === 'priority'" color="red">{{ text }}</a-tag><a-tag v-else-if="column.dataIndex === 'status'" color="processing">{{ text }}</a-tag></template></a-table>
        </section>

        <section v-if="activeTab === 'bugs'" class="detail-panel">
          <h3>Bug 总览</h3>
          <div class="bug-summary">
            <div v-for="item in bugSummary" :key="item.label" class="semantic-card" :class="item.class">
              <span class="semantic-card__icon"><component :is="item.icon" /></span>
              <span class="semantic-card__content"><span>{{ item.label }}</span><strong>{{ item.value }} 个</strong></span>
            </div>
          </div>
          <div class="section-heading"><h3>Bug 列表</h3><a-space><a-select value="全部状态" :options="bugStatusFilters" /><a-select value="全部指定人" :options="personFilterOptions" /></a-space></div>
          <a-table row-key="id" :columns="bugColumns" :data-source="bugRows" :loading="bugLoading" :pagination="pagination" size="small" :scroll="{ x: 900 }"><template #bodyCell="{ column, text }"><a-tag v-if="column.dataIndex === 'severity'" color="red">{{ text }}</a-tag><a-tag v-else-if="column.dataIndex === 'status'" color="orange">{{ text }}</a-tag></template></a-table>
        </section>

        <section v-if="activeTab === 'reports'" class="detail-panel">
          <div class="section-heading"><h2>汇报管理 <small>（共 {{ reportRows.length }} 条）</small></h2><a-button type="primary" @click="emit('create-report')"><PlusOutlined />新建汇报</a-button></div>
          <a-form class="report-filter" layout="inline"><a-form-item><a-input placeholder="搜索汇报标题 / 汇报对象 / 地点方式" /></a-form-item><a-form-item><a-select value="全部" :options="reportStatusFilters" /></a-form-item><a-form-item><a-range-picker /></a-form-item><a-button>重置</a-button></a-form>
          <a-table row-key="id" :columns="reportColumns" :data-source="reportRows" :loading="reportLoading" :pagination="pagination" :scroll="{ x: 900 }"><template #bodyCell="{ column, record, text }"><a-button v-if="column.dataIndex === 'title'" type="link" @click="emit('edit-report', record)">{{ text }}</a-button><a-tag v-else-if="column.dataIndex === 'status'" color="green">{{ text }}</a-tag></template></a-table>
        </section>

        <section v-if="activeTab === 'documents'" class="detail-panel">
          <div class="document-toolbar"><a-space><a-button type="primary" @click.stop="emit('open-upload')"><UploadOutlined />上传文件</a-button><a-button><FolderAddOutlined />新建文件夹</a-button><a-button><DownloadOutlined />批量下载</a-button><a-popconfirm title="确定删除选中的文件吗？" @confirm="emit('delete-documents')"><a-button danger :disabled="selectedDocumentIds.length === 0"><DeleteOutlined />批量删除</a-button></a-popconfirm></a-space><a-input-search placeholder="搜索文件名、上传人、分类..." /></div>
          <h3>分类导航</h3>
          <div class="document-categories"><button v-for="item in documentCategories" :key="item.label" type="button" :class="item.class"><span class="document-category__icon"><component :is="item.icon" /></span><span>{{ item.label }}</span><strong>{{ item.value }}</strong></button></div>
          <a-table row-key="id" :row-selection="documentRowSelection" :columns="documentColumns" :data-source="documentRows" :loading="documentLoading" :pagination="false">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'operation'"><a-space><a-button type="link" size="small" @click="emit('download-document', record)">下载</a-button><a-popconfirm title="确定删除该文件吗？" @confirm="emit('delete-document', record)"><a-button type="link" size="small" danger>删除</a-button></a-popconfirm></a-space></template>
            </template>
          </a-table>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { DeleteOutlined, DownloadOutlined, FolderAddOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { ref } from 'vue'

defineProps({
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

const emit = defineEmits(['update:activeTab', 'create-report', 'edit-report', 'open-upload', 'delete-documents', 'download-document', 'delete-document'])
const ganttRef = ref()

defineExpose({
  getGanttElement: () => ganttRef.value,
})
</script>

<style scoped>
.project-tabs { display: flex; gap: 44px; height: 44px; padding-left: 8px; }
.project-tabs button { display: inline-flex; align-items: center; gap: 7px; height: 44px; padding: 0 7px; background: transparent; border: 0; border-bottom: 3px solid transparent; cursor: pointer; }
.project-tabs button.active { color: #1677ff; border-bottom-color: #1677ff; }
.project-detail__layout { min-height: 530px; }
.project-detail__main { min-width: 0; overflow: hidden; background: #fff; }
.detail-panel { min-height: 530px; padding: 14px; overflow: auto; }
.detail-panel h3 { margin: 0 0 12px; }
.gantt-panel { padding: 12px; }
.project-stat-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
.project-stat-row .semantic-card, .risk-grid .semantic-card, .bug-summary .semantic-card { display: flex; gap: 12px; align-items: center; width: 100%; height: 86px; padding: 14px 15px; text-align: left; border: 1px solid rgb(0 0 0 / 5%); border-radius: 16px; box-shadow: 0 4px 16px rgb(0 0 0 / 5%); transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.28s ease; }
.project-stat-row .semantic-card:hover, .risk-grid .semantic-card:hover, .bug-summary .semantic-card:hover, .document-categories button:hover { box-shadow: 0 14px 28px rgb(0 0 0 / 10%); transform: translateY(-4px); }
.gantt-progress, .risk-due, .bug-confirmed { color: #0066cc; background: linear-gradient(135deg, #fff 0%, #edf6ff 100%); }
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
.gantt-scroll :deep(.gantt-in-progress .bar) { fill: #d6eaff; stroke: #0a84ff; }.gantt-scroll :deep(.gantt-in-progress .bar-progress) { fill: #0a84ff; }
.gantt-scroll :deep(.gantt-due-soon .bar), .gantt-scroll :deep(.gantt-due-soon .bar-progress) { fill: #ffd60a; stroke: #d6a600; }
.gantt-scroll :deep(.gantt-completed .bar), .gantt-scroll :deep(.gantt-completed .bar-progress) { fill: #30d158; stroke: #248a3d; }
.gantt-scroll :deep(.gantt-overdue .bar), .gantt-scroll :deep(.gantt-overdue .bar-progress) { fill: #ff453a; stroke: #d70015; }
.gantt-scroll :deep(.gantt-milestone .bar), .gantt-scroll :deep(.gantt-milestone .bar-progress) { fill: #30d158; stroke: #248a3d; }
.gantt-scroll :deep(.gantt-completed .bar-label), .gantt-scroll :deep(.gantt-overdue .bar-label), .gantt-scroll :deep(.gantt-in-progress .bar-label), .gantt-scroll :deep(.gantt-milestone .bar-label) { fill: #fff; }
.gantt-scroll :deep(.gantt-due-soon .bar-label), .gantt-scroll :deep(.gantt-not-started .bar-label) { fill: #1d1d1f; }
.risk-grid, .bug-summary, .document-categories { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 22px; }
.semantic-card__icon { display: inline-flex; flex: 0 0 36px; align-items: center; justify-content: center; width: 36px; height: 36px; font-size: 20px; background: rgb(255 255 255 / 78%); border-radius: 11px; box-shadow: 0 4px 12px rgb(0 0 0 / 6%); }
.semantic-card__content { min-width: 0; }.semantic-card__content > span, .semantic-card__content strong, .semantic-card__content small { display: block; }.semantic-card__content > span { color: #6e6e73; font-size: 13px; }.semantic-card__content strong { margin: 3px 0; color: #1d1d1f; font-size: 19px; }.semantic-card__content small { overflow: hidden; color: #86868b; text-overflow: ellipsis; white-space: nowrap; }
.risk-high, .bug-severe { color: #d70015; background: linear-gradient(135deg, #fff 0%, #fff0f1 100%); }.risk-medium, .bug-submitted { color: #c93400; background: linear-gradient(135deg, #fff 0%, #fff5e8 100%); }.risk-normal, .bug-closed { color: #248a3d; background: linear-gradient(135deg, #fff 0%, #eefbf2 100%); }
.section-heading, .document-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.section-heading h2, .section-heading h3 { margin: 0; }.section-heading small { color: #8c8c8c; font-weight: 400; }
.report-filter { margin-bottom: 18px; }.report-filter :deep(.ant-input) { width: 280px; }
.document-toolbar :deep(.ant-input-group-wrapper) { width: 300px; }
.document-categories { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.document-categories button { display: grid; grid-template-columns: 42px 1fr; padding: 15px; color: #1d1d1f; text-align: left; background: #fff; border: 1px solid rgb(0 0 0 / 5%); border-radius: 16px; box-shadow: 0 4px 16px rgb(0 0 0 / 5%); cursor: pointer; transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.28s ease; }
.document-categories button:first-child { border-color: #1677ff; }.document-category__icon { display: inline-flex; grid-row: 1 / 3; align-self: center; align-items: center; justify-content: center; width: 36px; height: 36px; font-size: 20px; border-radius: 11px; }.document-categories strong { font-size: 17px; }
.category-all { background: linear-gradient(135deg, #fff 0%, #edf6ff 100%); }.category-all .document-category__icon { color: #0066cc; background: #e5f2ff; }
.category-contract { background: linear-gradient(135deg, #fff 0%, #eefbf2 100%); }.category-contract .document-category__icon { color: #248a3d; background: #e5f8eb; }
.category-requirement { background: linear-gradient(135deg, #fff 0%, #fff5e8 100%); }.category-requirement .document-category__icon { color: #c93400; background: #ffecd6; }
.category-design { background: linear-gradient(135deg, #fff 0%, #f5efff 100%); }.category-design .document-category__icon { color: #7d3fc1; background: #eee2ff; }
.category-development { background: linear-gradient(135deg, #fff 0%, #fff7e8 100%); }.category-development .document-category__icon { color: #b25d00; background: #ffedcf; }
.category-acceptance { background: linear-gradient(135deg, #fff 0%, #eafbf7 100%); }.category-acceptance .document-category__icon { color: #00856a; background: #dff8f1; }
@media (max-width: 1280px) { .project-tabs { gap: 20px; } }
</style>
