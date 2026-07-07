<template>
  <div class="module-view">
    <header class="module-hero">
      <div>
        <p>{{ config.subtitle }}</p>
      </div>
      <a-space class="module-hero__actions">
        <a-button v-for="action in config.actions" :key="action" :type="action.includes('新建') || action.includes('填写') ? 'primary' : 'default'">
          <template #icon>
            <PlusOutlined v-if="action.includes('新建') || action.includes('填写')" />
            <DownloadOutlined v-else-if="action.includes('导出') || action.includes('报告')" />
            <UploadOutlined v-else-if="action.includes('导入')" />
            <SettingOutlined v-else />
          </template>
          {{ action }}
        </a-button>
      </a-space>
    </header>

    <section class="metric-grid" aria-label="页面统计">
      <a-card v-for="metric in config.metrics" :key="metric.label" class="metric-card" :bordered="false">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </a-card>
    </section>

    <template v-if="config.type === 'daily'">
      <section class="daily-layout">
        <a-card class="content-card" :bordered="false" title="今日日报">
          <a-form layout="vertical">
            <a-form-item label="今日完成">
              <a-textarea :rows="5" value="完成模块静态页面结构梳理；补充项目、任务、Bug 页面展示内容；整理待联调事项。" />
            </a-form-item>
            <a-form-item label="遇到问题">
              <a-textarea :rows="3" value="RP 源文件为专有二进制格式，当前先按项目已定义路由和视觉规范补齐静态页。" />
            </a-form-item>
            <a-form-item label="明日计划">
              <a-textarea :rows="3" value="根据手动测试反馈调整页面细节，并准备接口字段映射。" />
            </a-form-item>
          </a-form>
        </a-card>

        <a-card class="content-card" :bordered="false" title="本周概览">
          <a-timeline>
            <a-timeline-item color="green">2026-07-06 已提交日报</a-timeline-item>
            <a-timeline-item color="green">2026-07-05 已提交日报</a-timeline-item>
            <a-timeline-item color="blue">2026-07-04 待主管确认</a-timeline-item>
            <a-timeline-item color="gray">2026-07-03 已归档</a-timeline-item>
          </a-timeline>
        </a-card>
      </section>

      <a-card class="content-card daily-record-card" :bordered="false" title="日报提交记录">
        <a-table :columns="dailyColumns" :data-source="dailyRows" :pagination="false" size="middle" row-key="date">
          <template #bodyCell="{ column, text }">
            <a-tag v-if="column.dataIndex === 'status'" :color="text === '已提交' ? 'success' : 'warning'">{{ text }}</a-tag>
            <template v-else>{{ text }}</template>
          </template>
        </a-table>
      </a-card>
    </template>

    <template v-else-if="config.type === 'statistics'">
      <section class="statistics-layout">
        <a-card class="content-card" :bordered="false" title="工作量统计">
          <div v-for="item in statisticItems" :key="item.label" class="stat-row">
            <span>{{ item.label }}</span>
            <a-progress :percent="item.percent" :stroke-color="item.color" />
          </div>
        </a-card>

        <a-card class="content-card" :bordered="false" title="周期概览">
          <div class="summary-list">
            <div v-for="item in summaryItems" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </a-card>
      </section>

      <section class="statistics-panels">
        <a-card class="content-card" :bordered="false" title="任务状态分布">
          <div class="status-board">
            <div v-for="item in statusDistribution" :key="item.label" class="status-board__item">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <a-progress :percent="item.percent" size="small" :show-info="false" />
            </div>
          </div>
        </a-card>

        <a-card class="content-card" :bordered="false" title="项目参与排行">
          <a-table :columns="rankingColumns" :data-source="rankingRows" :pagination="false" size="small" row-key="project" />
        </a-card>
      </section>
    </template>

    <template v-else>
      <a-card class="filter-card" :bordered="false">
        <a-form class="filter-form" layout="inline">
          <a-form-item v-for="filter in config.filters" :key="filter.key" :label="filter.label">
            <a-input v-if="filter.type === 'input'" :placeholder="filter.placeholder" allow-clear />
            <a-select v-else-if="filter.type === 'select'" :placeholder="filter.placeholder" allow-clear>
              <a-select-option v-for="option in filter.options" :key="option" :value="option">{{ option }}</a-select-option>
            </a-select>
            <a-range-picker v-else />
          </a-form-item>
          <a-form-item>
            <a-space>
              <a-button type="primary">
                <template #icon><SearchOutlined /></template>
                查询
              </a-button>
              <a-button>重置</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-card>

      <a-card class="content-card table-card" :bordered="false">
        <template #title>
          <span class="table-title"><UnorderedListOutlined />{{ config.tableTitle }}</span>
        </template>
        <template #extra>
          <a-space>
            <a-button size="small">
              <template #icon><ReloadOutlined /></template>
              刷新
            </a-button>
            <a-button size="small">
              <template #icon><ColumnHeightOutlined /></template>
              密度
            </a-button>
          </a-space>
        </template>
        <a-table :columns="tableColumns" :data-source="config.rows" :pagination="pagination" :scroll="{ x: tableScrollWidth }" size="middle" row-key="key">
          <template #bodyCell="{ column, record, text }">
            <template v-if="column.dataIndex === 'status'">
              <a-tag :color="getStatusColor(text)">{{ text }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'priority' || column.dataIndex === 'severity'">
              <a-tag :color="getPriorityColor(text)">{{ text }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'progress'">
              <a-progress :percent="record.progress" size="small" />
            </template>
            <template v-else-if="column.dataIndex === 'operation'">
              <a-space>
                <a-button type="link" size="small" @click="handleView(record)">查看</a-button>
                <a-button type="link" size="small">编辑</a-button>
                <a-button type="link" size="small" danger>删除</a-button>
              </a-space>
            </template>
            <template v-else>
              {{ text }}
            </template>
          </template>
        </a-table>
      </a-card>
    </template>

    <a-drawer v-model:open="detailVisible" width="520" title="详情信息">
      <a-descriptions v-if="selectedRecord" :column="1" bordered size="small">
        <a-descriptions-item v-for="item in detailItems" :key="item.label" :label="item.label">
          <a-tag v-if="item.key === 'status'" :color="getStatusColor(item.value)">{{ item.value }}</a-tag>
          <a-progress v-else-if="item.key === 'progress'" :percent="item.value" size="small" />
          <template v-else>{{ item.value }}</template>
        </a-descriptions-item>
      </a-descriptions>
      <a-divider />
      <a-card class="drawer-card" :bordered="false" title="处理记录">
        <a-timeline>
          <a-timeline-item color="blue">创建记录并分配负责人</a-timeline-item>
          <a-timeline-item color="green">负责人更新当前处理进度</a-timeline-item>
          <a-timeline-item color="gray">等待下一节点确认</a-timeline-item>
        </a-timeline>
      </a-card>
    </a-drawer>
  </div>
</template>

<script setup>
import {
  ColumnHeightOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  UnorderedListOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import { getPriorityColor, getStatusColor, moduleConfigs } from './moduleConfigs'

const route = useRoute()
const detailVisible = ref(false)
const selectedRecord = ref(null)

const config = computed(() => moduleConfigs[route.name] || moduleConfigs.AllTasks)
const tableColumns = computed(() => [
  ...config.value.columns,
  { title: '操作', dataIndex: 'operation', fixed: 'right', width: 168 },
])
const tableScrollWidth = computed(() => tableColumns.value.reduce((total, column) => total + (column.width || column.minWidth || 160), 0))

const detailItems = computed(() => {
  if (!selectedRecord.value) {
    return []
  }

  const labelMap = {
    code: '编号',
    name: '名称',
    project: '所属项目',
    owner: '负责人',
    manager: '项目经理',
    type: '项目类型',
    stage: '当前阶段',
    priority: '优先级',
    severity: '严重程度',
    status: '状态',
    deadline: '截止日期',
    createdAt: '创建时间',
    period: '计划周期',
    progress: '完成度',
  }

  return Object.entries(selectedRecord.value)
    .filter(([key]) => key !== 'key')
    .map(([key, value]) => ({ key, label: labelMap[key] || key, value }))
})

const handleView = record => {
  selectedRecord.value = record
  detailVisible.value = true
}

const pagination = {
  current: 1,
  pageSize: 10,
  total: 42,
  showSizeChanger: true,
  showTotal: total => `共 ${total} 条`,
}

const statisticItems = [
  { label: '任务完成率', percent: 82, color: '#1677ff' },
  { label: 'Bug 关闭率', percent: 76, color: '#52c41a' },
  { label: '日报提交率', percent: 96, color: '#722ed1' },
  { label: '计划准时率', percent: 88, color: '#fa8c16' },
]

const summaryItems = [
  { label: '本周完成任务', value: '18 个' },
  { label: '本周修复 Bug', value: '9 个' },
  { label: '参与项目', value: '4 个' },
  { label: '待处理风险', value: '2 个' },
]

const dailyColumns = [
  { title: '日期', dataIndex: 'date', width: 140 },
  { title: '完成事项', dataIndex: 'finished' },
  { title: '风险问题', dataIndex: 'risk', width: 180 },
  { title: '状态', dataIndex: 'status', width: 100 },
]

const dailyRows = [
  { date: '2026-07-06', finished: '完成项目静态页面补齐，整理后续接口字段。', risk: 'RP 文件需导出 HTML 便于精确对齐', status: '已提交' },
  { date: '2026-07-05', finished: '完成首页、登录页视觉核对。', risk: '无', status: '已提交' },
  { date: '2026-07-04', finished: '梳理项目、任务、Bug 菜单结构。', risk: '部分字段待确认', status: '待确认' },
]

const statusDistribution = [
  { label: '待处理', value: 15, percent: 22 },
  { label: '进行中', value: 27, percent: 40 },
  { label: '待验收', value: 12, percent: 18 },
  { label: '已完成', value: 68, percent: 86 },
]

const rankingColumns = [
  { title: '项目', dataIndex: 'project' },
  { title: '任务数', dataIndex: 'tasks', width: 86 },
  { title: '完成率', dataIndex: 'rate', width: 92 },
]

const rankingRows = [
  { project: '项目管理与开发系统', tasks: 18, rate: '82%' },
  { project: '团队协同平台', tasks: 12, rate: '76%' },
  { project: '质量管理平台', tasks: 9, rate: '88%' },
]
</script>

<style scoped>
.module-view {
  min-width: 0;
}

.module-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.module-hero > div {
  min-width: 0;
}

.module-hero__actions {
  flex-shrink: 0;
}

.module-hero p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.metric-card {
  border: 1px solid #eef1f4;
  box-shadow: 0 2px 8px rgb(0 0 0 / 3%);
}

.metric-card :deep(.ant-card-body) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 17px 18px;
}

.metric-card span {
  color: #6b7280;
}

.metric-card strong {
  color: #17233d;
  font-size: 26px;
  font-weight: 600;
}

.filter-card,
.content-card {
  border: 1px solid #eef1f4;
  box-shadow: 0 2px 8px rgb(0 0 0 / 3%);
}

.filter-card {
  margin-bottom: 16px;
}

.filter-form {
  row-gap: 14px;
}

.filter-form :deep(.ant-input),
.filter-form :deep(.ant-select),
.filter-form :deep(.ant-picker) {
  width: 220px;
}

.table-card :deep(.ant-card-head) {
  min-height: 56px;
}

.table-card :deep(.ant-table-cell) {
  white-space: nowrap;
}

.table-title {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
}

.daily-layout,
.statistics-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
}

.daily-record-card,
.statistics-panels {
  margin-top: 16px;
}

.statistics-panels {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 460px;
  gap: 16px;
}

.daily-layout :deep(.ant-input) {
  background: #fbfcfe;
}

.stat-row + .stat-row {
  margin-top: 18px;
}

.stat-row > span {
  display: block;
  margin-bottom: 8px;
  color: #394b59;
  font-weight: 500;
}

.summary-list {
  display: grid;
  gap: 14px;
}

.summary-list div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 0;
  border-bottom: 1px solid #f0f2f5;
}

.summary-list span {
  color: #6b7280;
}

.summary-list strong {
  color: #17233d;
  font-size: 18px;
}

.status-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.status-board__item {
  padding: 14px;
  background: #fbfcfe;
  border: 1px solid #eef1f4;
  border-radius: 6px;
}

.status-board__item span {
  display: block;
  margin-bottom: 8px;
  color: #6b7280;
}

.status-board__item strong {
  display: block;
  margin-bottom: 10px;
  color: #17233d;
  font-size: 22px;
}

.drawer-card {
  background: #fbfcfe;
  border: 1px solid #eef1f4;
}

@media (max-width: 1200px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .daily-layout,
  .statistics-layout,
  .statistics-panels {
    grid-template-columns: 1fr;
  }

  .status-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
