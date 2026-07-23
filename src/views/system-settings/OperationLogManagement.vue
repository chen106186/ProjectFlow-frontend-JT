<template>
  <section class="operation-log-page">
    <a-card class="log-filter-card app-filter-card" :bordered="false">
      <a-form class="log-filter app-filter-form" layout="inline">
        <a-form-item label="关键字">
          <a-input v-model:value="query.keyword" allow-clear placeholder="日志内容关键字" />
        </a-form-item>
        <a-form-item label="模块">
          <a-select v-model:value="query.module" allow-clear placeholder="全部" :options="moduleOptions" show-search option-filter-prop="label" />
        </a-form-item>
        <a-form-item label="业务类型">
          <a-select v-model:value="query.businessType" allow-clear placeholder="全部" :options="bizTypeOptions" show-search option-filter-prop="label" />
        </a-form-item>
        <a-form-item label="操作类型">
          <a-select v-model:value="query.operationType" allow-clear placeholder="全部" :options="actionOptions" show-search option-filter-prop="label" />
        </a-form-item>
        <a-form-item label="操作人">
          <a-input v-model:value="query.operatorName" allow-clear placeholder="请输入操作人姓名" />
        </a-form-item>
        <a-form-item label="时间范围">
          <a-range-picker v-model:value="query.range" value-format="YYYY-MM-DD" style="width:100%" />
        </a-form-item>
        <a-form-item class="filter-actions app-filter-actions">
          <a-space>
            <a-button type="primary" @click="handleSearch">查询</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card class="log-list-card" :bordered="false">
      <div class="log-table-wrap">
        <a-table
          row-key="id"
          :columns="columns"
          :data-source="logs"
          :loading="loading"
          :pagination="false"
          :scroll="{ x: 1500 }"
          size="middle"
        >
          <template #bodyCell="{ column, record, text }">
            <template v-if="column.dataIndex === 'createdAt'">
              <span class="log-time">{{ formatDateTime(text) }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'module'">
              <a-tag :color="moduleColor(text)">{{ moduleLabel(text) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'operationType'">
              <a-tag :color="actionColor(text)">{{ actionLabel(text) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'businessType'">
              <span class="log-biz-type">{{ bizTypeLabel(text) }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'businessId'">
              <span class="log-business-id">{{ text || '-' }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'content'">
              <span class="log-content" :title="text">{{ text || '-' }}</span>
            </template>
            <template v-else>{{ text || '-' }}</template>
          </template>
        </a-table>
      </div>
      <div class="log-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :show-size-changer="pagination.showSizeChanger"
          :page-size-options="pagination.pageSizeOptions"
          :show-total="pagination.showTotal"
          @change="handlePageChange"
        />
      </div>
    </a-card>
  </section>
</template>

<script setup>
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'

import { getOperationLogs } from '@/api/system'
import { formatDateTime } from '@/utils/dateTime'

const createDefaultQuery = () => ({
  keyword: '',
  module: undefined,
  businessType: undefined,
  operationType: undefined,
  operatorName: '',
  range: [],
})

const loading = ref(false)
const logs = ref([])
const query = reactive(createDefaultQuery())
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: total => `共 ${total} 条`,
  pageSizeOptions: ['10', '50', '100'],
})

const MODULE_MAP = {
  'bug': { label: 'Bug', color: 'red' },
  'task': { label: '任务', color: 'blue' },
  'project': { label: '项目', color: 'purple' },
  'requirement': { label: '需求', color: 'cyan' },
  'daily-report': { label: '日报', color: 'green' },
  'project-report': { label: '项目汇报', color: 'geekblue' },
  'system': { label: '系统管理', color: 'orange' },
}

const ACTION_MAP = {
  CREATE: { label: '新建', color: 'green' },
  UPDATE: { label: '编辑', color: 'blue' },
  UPDATE_ACTUAL_TIME: { label: '更新工时', color: 'blue' },
  UPDATE_STATUS: { label: '状态变更', color: 'blue' },
  DELETE: { label: '删除', color: 'red' },
  ASSIGN: { label: '指派', color: 'orange' },
  ASSIGN_ROLES: { label: '分配角色', color: 'orange' },
  ASSIGN_MENUS: { label: '分配菜单', color: 'orange' },
  CLOSE: { label: '关闭', color: 'gray' },
  FIX: { label: '修复', color: 'cyan' },
  COMMENT: { label: '评论', color: 'purple' },
  STATUS_CHANGE: { label: '状态变更', color: 'blue' },
  ENABLE_CHANGED: { label: '启用状态', color: 'orange' },
  RESET_PASSWORD: { label: '重置密码', color: 'red' },
  CREATE_ITEM: { label: '新建条目', color: 'green' },
  UPDATE_ITEM: { label: '编辑条目', color: 'blue' },
  DELETE_ITEM: { label: '删除条目', color: 'red' },
}

const BIZ_TYPE_MAP = {
  Bug: 'Bug',
  Task: '任务',
  Project: '项目',
  ProjectNode: '项目节点',
  Requirement: '需求',
  DailyReport: '日报',
  ProjectReport: '项目汇报',
  Department: '部门',
  Role: '角色',
  Menu: '菜单',
  User: '用户',
}

const moduleOptions = Object.entries(MODULE_MAP).map(([value, { label }]) => ({ label, value }))
const actionOptions = Object.entries(ACTION_MAP).map(([value, { label }]) => ({ label, value }))
const bizTypeOptions = Object.entries(BIZ_TYPE_MAP).map(([value, label]) => ({ label, value }))

const moduleLabel = v => MODULE_MAP[v]?.label || v || '-'
const moduleColor = v => MODULE_MAP[v]?.color || 'default'
const actionLabel = v => ACTION_MAP[v]?.label || v || '-'
const actionColor = v => ACTION_MAP[v]?.color || 'default'
const bizTypeLabel = v => BIZ_TYPE_MAP[v] || v || '-'

const columns = [
  { title: '操作时间', dataIndex: 'createdAt', width: 180 },
  { title: '操作人', dataIndex: 'operatorName', width: 150 },
  { title: '模块', dataIndex: 'module', width: 150 },
  { title: '操作类型', dataIndex: 'operationType', width: 150 },
  { title: '业务类型', dataIndex: 'businessType', width: 150 },
  { title: '业务ID', dataIndex: 'businessId', width: 190 },
  { title: '日志内容', dataIndex: 'content', width: 530, ellipsis: true },
]

const fetchLogs = async () => {
  loading.value = true
  try {
    const result = await getOperationLogs({
      keyword: query.keyword || undefined,
      module: query.module || undefined,
      businessType: query.businessType || undefined,
      operationType: query.operationType || undefined,
      operatorName: query.operatorName || undefined,
      startDate: query.range?.[0] || undefined,
      endDate: query.range?.[1] || undefined,
      pageNo: pagination.current,
      pageSize: pagination.pageSize,
    })
    logs.value = result?.records || []
    pagination.total = result?.total || 0
  } catch (error) {
    logs.value = []
    pagination.total = 0
    message.error(error.message || '操作日志加载失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { pagination.current = 1; fetchLogs() }
const handleReset = () => { Object.assign(query, createDefaultQuery()); pagination.current = 1; fetchLogs() }
const handlePageChange = (current, pageSize) => { pagination.current = current; pagination.pageSize = pageSize; fetchLogs() }

onMounted(fetchLogs)
</script>

<style scoped>
.operation-log-page {
  width: min(1600px, 100%);
  height: calc(100vh - 68px - 52px - 40px);
  min-height: 0;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.log-filter-card,
.log-list-card {
  border: 1px solid #edf0f3;
  box-shadow: 0 2px 8px rgb(0 0 0 / 3%);
}

.log-filter-card {
  flex: none;
}

.log-list-card {
  flex: 1;
  min-height: 0;
}

.log-filter-card :deep(.ant-card-body),
.log-list-card :deep(.ant-card-body) {
  padding: 24px 28px;
}

.log-list-card :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.log-filter {
  display: grid;
  grid-template-columns: repeat(3, minmax(280px, 1fr));
  gap: 18px 28px;
  align-items: end;
}

.log-filter :deep(.ant-form-item) {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-bottom: 0;
}

.log-filter :deep(.ant-form-item-label) {
  padding: 0 0 8px;
  text-align: left;
}

.log-filter :deep(.ant-form-item-label > label) {
  height: auto;
  color: #262626;
  font-weight: 500;
}

.log-filter :deep(.ant-form-item-control),
.log-filter :deep(.ant-input),
.log-filter :deep(.ant-select),
.log-filter :deep(.ant-picker) { width: 100%; }

.filter-actions {
  grid-column: 3 / 5;
  justify-self: end;
  min-width: 0;
}

.log-time { color: #8c8c8c; font-size: 13px; font-variant-numeric: tabular-nums; }

.log-biz-type { color: #595959; font-size: 13px; }

.log-business-id {
  display: block;
  color: #262626;
  font-variant-numeric: tabular-nums;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.log-content {
  display: block;
  color: #434343;
  font-size: 13px;
  line-height: 1.7;
  white-space: normal;
  overflow-wrap: anywhere;
}

.log-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.log-list-card :deep(.ant-table) {
  width: 100%;
}

.log-list-card :deep(.ant-table-thead > tr > th),
.log-list-card :deep(.ant-table-tbody > tr > td) {
  padding: 18px 16px;
}

.log-pagination {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 40px;
  padding-top: 12px;
  background: #fff;
}

@media (max-width: 1440px) {
  .log-filter { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filter-actions { grid-column: 1 / -1; }
}

@media (max-width: 900px) {
  .log-filter { grid-template-columns: 1fr; }
  .filter-actions { justify-self: start; }
}
</style>
