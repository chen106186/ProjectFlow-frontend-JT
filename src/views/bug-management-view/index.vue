<template>
  <div :class="['bug-page', { 'bug-page--list': viewMode === 'list' }]">
    <template v-if="viewMode === 'list'">
      <a-card class="bug-filter app-filter-card" :bordered="false">
        <a-form :model="queryParams" class="bug-filter__form app-filter-form" layout="inline">
          <a-form-item label="搜索"><a-input v-model:value="queryParams.keyword" allow-clear placeholder="请输入关键字"  /></a-form-item>
          <a-form-item label="所属项目"><a-select v-model:value="queryParams.projectId" :options="projectOptions" placeholder="全部" allow-clear @change="handleSearch" /></a-form-item>
          <a-form-item label="严重等级"><a-select v-model:value="queryParams.priority" :options="priorityFilterOptions" placeholder="全部" allow-clear @change="handleSearch" /></a-form-item>
          <a-form-item label="状态"><a-select v-model:value="queryParams.status" :options="statusFilterOptions" placeholder="全部" allow-clear @change="handleSearch" /></a-form-item>
          <a-form-item label="创建人"><a-select v-model:value="queryParams.creatorId" :options="userOptions" placeholder="全部" allow-clear show-search option-filter-prop="label" @change="handleSearch" /></a-form-item>
          <a-form-item label="指定人"><a-select v-model:value="queryParams.assigneeId" :options="userOptions" placeholder="全部" allow-clear show-search option-filter-prop="label" @change="handleSearch" /></a-form-item>
          <a-form-item class="bug-filter__actions app-filter-actions">
            <a-space><a-button type="primary" @click="handleSearch">查询</a-button><a-button @click="handleReset">重置</a-button></a-space>
          </a-form-item>
        </a-form>
      </a-card>

      <a-card class="bug-list" :bordered="false">
        <div class="bug-list__toolbar">
          <a-button type="primary" @click="handleCreate"><PlusOutlined />新增Bug</a-button>
          <div class="bug-list__group">
            <template v-if="displayMode === 'group'">
              <span>分组条件：</span>
              <a-select v-model:value="groupField" :options="groupOptions" />
            </template>
            <a-radio-group v-model:value="displayMode" button-style="solid">
              <a-radio-button value="list">列表</a-radio-button>
              <a-radio-button value="group">分组</a-radio-button>
            </a-radio-group>
          </div>
        </div>

        <template v-if="displayMode === 'list'">
          <a-table
            class="bug-list__table"
            row-key="id"
            :columns="columns"
            :data-source="bugs"
            :pagination="{ current, pageSize, total, showSizeChanger: true, showTotal: t => `共 ${t} 条`, pageSizeOptions: ['10', '50', '100'] }"
            :loading="listLoading"
            :scroll="{ x: 1260, y: 'calc(100vh - 440px)' }"
            size="middle"
            table-layout="fixed"
            @change="handleTableChange"
          >
            <template #bodyCell="{ column, record, text, index }">
              <template v-if="column.dataIndex === 'index'">{{ (current - 1) * pageSize + index + 1 }}</template>
              <template v-else-if="column.dataIndex === 'bugNo'"><span class="bug-no">{{ text ? '#' + String(text).padStart(3, '0') : '-' }}</span></template>
              <template v-else-if="column.dataIndex === 'title'">
                <a-tooltip :title="text">
                  <span class="bug-title-text" @click="handleDetail(record)">{{ text }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'priority'">
                <a-tag :color="priorityColors[text]">{{ priorityLabels[text] || text }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'status'">
                <a-tag :color="statusColors[text]">{{ statusLabels[text] || text }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'createdAt'">{{ formatDateTime(text) }}</template>
              <template v-else-if="column.dataIndex === 'operation'">
                <a-space>
                  <a-button type="link" size="small" @click="handleDetail(record)">详情</a-button>
                  <a-button v-if="!isClosedBug(record)" type="link" size="small" @click="handleEdit(record)">编辑</a-button>
                  <a-button v-if="!isClosedBug(record)" type="link" size="small" danger @click="handleCloseBugFromList(record)">关闭</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </template>

        <template v-else>
          <div class="bug-group-list">
            <div v-for="(group, key) in groupedBugs" :key="key" class="bug-group">
              <h4 class="bug-group__title">{{ key || '未分组' }} ({{ group.length }})</h4>
              <a-table
                row-key="id"
                :columns="columns.filter(c => c.dataIndex !== 'index')"
                :data-source="group"
                :pagination="false"
                :scroll="{ x: 1200 }"
                size="middle"
                table-layout="fixed"
              >
                <template #bodyCell="{ column, record, text }">
                  <template v-if="column.dataIndex === 'bugNo'"><span class="bug-no">{{ text ? '#' + String(text).padStart(3, '0') : '-' }}</span></template>
                  <template v-else-if="column.dataIndex === 'title'">
                    <a-tooltip :title="text">
                      <span class="bug-title-text" @click="handleDetail(record)">{{ text }}</span>
                    </a-tooltip>
                  </template>
                  <template v-else-if="column.dataIndex === 'priority'">
                    <a-tag :color="priorityColors[text]">{{ priorityLabels[text] || text }}</a-tag>
                  </template>
                  <template v-else-if="column.dataIndex === 'status'">
                    <a-tag :color="statusColors[text]">{{ statusLabels[text] || text }}</a-tag>
                  </template>
                  <template v-else-if="column.dataIndex === 'createdAt'">{{ formatDateTime(text) }}</template>
                  <template v-else-if="column.dataIndex === 'operation'">
                    <a-space>
                      <a-button type="link" size="small" @click="handleDetail(record)">详情</a-button>
                      <a-button v-if="!isClosedBug(record)" type="link" size="small" @click="handleEdit(record)">编辑</a-button>
                      <a-button v-if="!isClosedBug(record)" type="link" size="small" danger @click="handleCloseBugFromList(record)">关闭</a-button>
                    </a-space>
                  </template>
                  <template v-else>{{ text || '-' }}</template>
                </template>
              </a-table>
            </div>
            <a-empty v-if="!bugs.length" />
          </div>
          <a-pagination
            class="bug-list__pagination"
            :current="current"
            :page-size="pageSize"
            :total="total"
            :page-size-options="['10', '50', '100']"
            :show-total="t => `共 ${t} 条`"
            show-size-changer
            @change="handleGroupPageChange"
          />
        </template>
      </a-card>
    </template>

    <a-card v-else-if="viewMode === 'create' || viewMode === 'edit'" class="bug-form-card" :bordered="false">
      <div class="panel-heading">
        <h2>{{ viewMode === 'create' ? '新增Bug' : '编辑Bug' }}</h2>
      </div>
      <a-form ref="formRef" :model="formState" :rules="formRules" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
        <div class="bug-form-fields">
          <a-form-item label="Bug标题" name="title"><a-input v-model:value="formState.title" placeholder="请输入Bug标题" /></a-form-item>
          <a-form-item label="所属项目" name="projectId"><a-select v-model:value="formState.projectId" :options="projectOptions" placeholder="请选择所属项目" @change="handleProjectChange" /></a-form-item>
          <a-form-item label="关联任务">
            <a-select v-model:value="formState.taskId" :options="relatedTaskOptions" placeholder="请选择关联任务（非必填）" allow-clear show-search option-filter-prop="label" :loading="relatedTaskLoading" :disabled="!formState.projectId" />
          </a-form-item>
          <a-form-item label="指派给" name="assigneeId"><a-select v-model:value="formState.assigneeId" :options="bugFormUserOptions" placeholder="请选择负责人" show-search option-filter-prop="label" /></a-form-item>
          <a-form-item label="严重等级" name="priority"><a-select v-model:value="formState.priority" :options="priorityOptions" /></a-form-item>
          <a-form-item label="问题描述" name="description">
            <a-textarea v-model:value="formState.description" :rows="8" placeholder="请输入问题描述" />
          </a-form-item>
          <a-form-item label="重现步骤">
            <div class="bug-rich-editor">
              <Toolbar v-if="editorRef" :editor="editorRef" :default-config="toolbarConfig" mode="default" />
              <Editor v-model="formState.reproduceSteps" :default-config="editorConfig" mode="default" @on-created="handleEditorCreated" />
            </div>
          </a-form-item>
        </div>
      </a-form>
      <div class="form-actions">
        <a-button type="primary" :loading="submitLoading" @click="handleSubmit"><CheckOutlined />确认</a-button>
        <a-button @click="handleBack"><CloseOutlined />取消</a-button>
      </div>
    </a-card>

    <template v-else>
      <div class="detail-page">
        <a-spin :spinning="detailLoading">
          <!-- Header -->
          <div class="detail-header">
            <a-button class="detail-back" @click="handleBack"><ArrowLeftOutlined />返回</a-button>
            <template v-if="selectedBug">
              <span class="detail-bug-no">{{ selectedBug.bugNo ? '#' + String(selectedBug.bugNo).padStart(3, '0') : '' }}</span>
              <h1 class="detail-title">{{ selectedBug.title }}</h1>
            </template>
          </div>

          <div v-if="selectedBug" class="detail-body">
            <!-- Left: main content -->
            <div class="detail-main">
              <a-card class="detail-card bug-detail-overview" :bordered="false">
                <template #title><span class="detail-card__title">Bug详情</span></template>
                <section class="detail-section">
                  <h3>基本信息</h3>
                <table class="native-info-table">
                  <tbody>
                    <tr>
                      <th>所属项目</th>
                      <td>{{ selectedBug.projectName || '-' }}</td>
                      <th>负责人</th>
                      <td>{{ selectedBug.assigneeName || '-' }}</td>
                    </tr>
                    <tr>
                      <th>创建人</th>
                      <td>{{ selectedBug.creatorName || '-' }}</td>
                      <th>创建时间</th>
                      <td>{{ formatDateTime(selectedBug.createdAt) }}</td>
                    </tr>
                    <tr>
                      <th>优先级</th>
                      <td><a-tag :color="priorityColors[selectedBug.priority]">{{ priorityLabels[selectedBug.priority] || selectedBug.priority || '-' }}</a-tag></td>
                      <th>状态</th>
                      <td><a-tag :color="statusColors[selectedBug.status]">{{ statusLabels[selectedBug.status] || selectedBug.status || '-' }}</a-tag></td>
                    </tr>
                    <tr v-if="selectedBug.closedAt">
                      <th>关闭时间</th>
                      <td>{{ formatDateTime(selectedBug.closedAt) }}</td>
                      <th>Bug编号</th>
                      <td>{{ selectedBug.bugNo ? '#' + String(selectedBug.bugNo).padStart(3, '0') : '-' }}</td>
                    </tr>
                  </tbody>
                </table>
                </section>
                <section class="detail-section">
                  <h3>问题描述</h3>
                <div class="detail-rich" v-html="bugDescriptionHtml"></div>
                </section>
                <section class="detail-section">
                  <h3>重现步骤</h3>
                <div class="detail-rich" v-html="bugReproduceStepsHtml" @click="handleRichImageClick"></div>
                </section>
                <section v-if="isResolvedBug(selectedBug)" class="detail-section">
                  <h3>解决方案</h3>
                  <table class="native-info-table">
                    <tbody>
                      <tr>
                        <th>方案</th>
                        <td>{{ resolveSolutionLabels[selectedBug.solution] || selectedBug.solution || '-' }}</td>
                        <th>解决日期</th>
                        <td>{{ selectedBug.resolvedDate || '-' }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-if="bugResolveRemark" class="detail-rich resolve-remark" v-html="bugResolveRemarkHtml" @click="handleRichImageClick"></div>
                </section>
              </a-card>

              <!-- 修复记录 -->
              <a-card v-if="selectedBug.fixAnalysis || selectedBug.fixDetail" class="detail-card" :bordered="false">
                <template #title><span class="detail-card__title">修复记录</span></template>
                <div v-if="selectedBug.fixAnalysis" class="fix-block">
                  <div class="fix-label">问题分析</div>
                  <p class="detail-text">{{ selectedBug.fixAnalysis }}</p>
                </div>
                <div v-if="selectedBug.fixDetail" class="fix-block">
                  <div class="fix-label">修复细节</div>
                  <p class="detail-text">{{ selectedBug.fixDetail }}</p>
                </div>
              </a-card>

              <!-- 评论 -->
              <a-card class="detail-card" :bordered="false">
                <template #title><span class="detail-card__title">评论</span></template>
                <a-spin :spinning="commentsLoading">
                  <div class="comment-list">
                    <div v-for="comment in comments" :key="comment.id" class="comment-item">
                      <div class="comment-item__meta">
                        <b>{{ comment.authorName || ('用户' + comment.userId) }}</b>
                        <small>{{ formatDateTime(comment.createdAt) }}</small>
                      </div>
                      <div class="comment-item__content" v-html="normalizeRichHtml(comment.content)" @click="handleRichImageClick"></div>
                    </div>
                    <a-empty v-if="!comments.length && !commentsLoading" description="暂无评论" class="comment-empty" />
                  </div>
                </a-spin>
                <template v-if="!isClosedBug(selectedBug)">
                  <div class="comment-rich-editor">
                    <Toolbar v-if="commentEditorRef" :editor="commentEditorRef" :default-config="toolbarConfig" mode="default" />
                    <Editor :key="commentEditorKey" v-model="commentContent" :default-config="commentEditorConfig" mode="default" @on-created="handleCommentEditorCreated" />
                  </div>
                  <div class="send-row"><a-button type="primary" :loading="commentLoading" @click="handleSendComment">发送</a-button></div>
                </template>
              </a-card>
            </div>

            <!-- Right: sidebar (always visible) -->
            <div class="detail-sidebar">
              <div v-if="isClosedBug(selectedBug)" class="closed-tip detail-closed-tip">
                <a-tag color="green" style="font-size:0.8125rem;padding:0.25rem 0.625rem">已关闭</a-tag>
                <p>该 Bug 已关闭，不可再进行操作。</p>
              </div>
              <a-card class="detail-card lifecycle-card" :bordered="false">
                <template #title><span class="detail-card__title">Bug的一生</span></template>
                <a-empty v-if="!selectedBug.logs?.length" description="暂无流转记录" style="padding: 1rem 0" />
                <a-timeline v-else class="lifecycle-timeline">
                  <a-timeline-item v-for="log in selectedBug.logs" :key="log.id">
                    <div class="timeline-action">{{ log.operatorName }} · {{ operationLabel(log.operationType) }}</div>
                    <div v-if="log.content" class="timeline-content">{{ log.content }}</div>
                    <div class="timeline-time">{{ formatDateTime(log.createdAt) }}</div>
                  </a-timeline-item>
                </a-timeline>
              </a-card>
            </div>
          </div>
          <div v-if="selectedBug && !isClosedBug(selectedBug) && (!isResolvedBug(selectedBug) || isBugCreator(selectedBug))" class="detail-floating-actions">
            <template v-if="!isResolvedBug(selectedBug)">
              <a-button type="primary" @click="handleEditFromDetail">编辑 Bug</a-button>
              <a-button @click="assignVisible = true">重新指派</a-button>
              <a-button type="primary" class="resolve-button" @click="openResolveModal">解决</a-button>
            </template>
            <a-button v-if="isBugCreator(selectedBug)" danger :loading="closeLoading" @click="handleCloseBug">关闭 Bug</a-button>
          </div>
        </a-spin>
      </div>
    </template>

    <a-modal v-model:open="assignVisible" title="更换Bug负责人" :confirm-loading="assignLoading" ok-text="确认" cancel-text="取消" @ok="handleAssign">
      <a-form :model="assignState" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <a-form-item label="指派给"><a-select v-model:value="assignState.assigneeId" :options="userOptions" placeholder="请选择负责人" show-search option-filter-prop="label" /></a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="assignState.reason" :rows="5" placeholder="请输入备注" /></a-form-item>
      </a-form>
    </a-modal>
    <a-modal v-model:open="resolveVisible" title="解决Bug" :width="760" :footer="null" destroy-on-close @after-close="resetResolveForm">
      <a-form ref="resolveFormRef" :model="resolveForm" :rules="resolveRules" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }" class="resolve-form">
        <a-form-item label="解决方案" name="solution">
          <a-select v-model:value="resolveForm.solution" :options="resolveSolutionOptions" placeholder="请选择解决方案" />
        </a-form-item>
        <a-form-item label="解决日期" name="resolvedDate">
          <a-date-picker v-model:value="resolveForm.resolvedDate" value-format="YYYY-MM-DD" style="width:100%" />
        </a-form-item>
        <a-form-item label="指派给">
          <a-select v-model:value="resolveForm.assigneeId" :options="userOptions" placeholder="选择指派人（可选）" allow-clear show-search option-filter-prop="label" />
        </a-form-item>
        <a-form-item label="备注">
          <div class="resolve-rich-editor">
            <Toolbar v-if="resolveEditorRef" :editor="resolveEditorRef" :default-config="toolbarConfig" mode="default" />
            <Editor :key="resolveEditorKey" v-model="resolveForm.remark" :default-config="resolveEditorConfig" mode="default" @on-created="handleResolveEditorCreated" />
          </div>
        </a-form-item>
      </a-form>
      <div class="resolve-actions">
        <a-button type="primary" :loading="resolveLoading" @click="handleResolveConfirm">确定</a-button>
        <a-button @click="resolveVisible = false">取消</a-button>
      </div>
    </a-modal>
    <a-image
      v-if="previewImage"
      :src="previewImage"
      :style="{ display: 'none' }"
      :preview="{
        visible: previewVisible,
        onVisibleChange: handlePreviewVisibleChange,
      }"
    />
  </div>
</template>

<script setup>
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getProjectBugs, getBugById, createBug, updateBug, closeBug, assignBug,
  addBugComment, listBugComments, getProjectList, getProjectTasks, getSystemUsers, resolveBug,
} from '@/api/managementProject'
import { formatDateTime } from '@/utils/dateTime'

const route = useRoute()
const router = useRouter()
const viewMode = computed(() => route.meta.bugView || 'list')

const statusLabels = { PENDING_FIX: '待修复', FIXING: '修复中', PENDING_VERIFY: '待验证', CLOSED: '已关闭' }
const statusColors = { PENDING_FIX: 'gold', FIXING: 'orange', PENDING_VERIFY: 'purple', CLOSED: 'green' }
const priorityLabels = { LOW: '轻微', MEDIUM: '一般', HIGH: '严重', URGENT: '致命' }
const priorityColors = { LOW: 'blue', MEDIUM: 'orange', HIGH: 'error', URGENT: 'red' }

const priorityOptions = [
  { label: '轻微', value: 'LOW' }, { label: '一般', value: 'MEDIUM' },
  { label: '严重', value: 'HIGH' }, { label: '致命', value: 'URGENT' },
]
const priorityFilterOptions = priorityOptions
const statusFilterOptions = [
  { label: '待修复', value: 'PENDING_FIX' },
  { label: '待验证', value: 'PENDING_VERIFY' }, { label: '已关闭', value: 'CLOSED' },
]
const groupOptions = [
  { label: '所属项目', value: 'projectName' },
  { label: '优先级', value: 'priority' },
  { label: '状态', value: 'status' },
  { label: '创建人', value: 'creatorName' },
  { label: '指定人', value: 'assigneeName' },
]

const projects = ref([])
const users = ref([])
const currentUserId = computed(() => {
  try { return JSON.parse(localStorage.getItem('userInfo') || '{}').userId || null } catch { return null }
})
const projectOptions = computed(() => projects.value.map(p => ({ label: p.name, value: p.id })))
const userOptions = computed(() => users.value.map(u => ({ label: u.realName, value: u.id })))
const bugFormUserOptions = computed(() => users.value
  .filter(user => String(user.id) !== String(currentUserId.value))
  .map(user => ({ label: user.realName, value: user.id })))

const bugs = ref([])
const total = ref(0)
const current = ref(1)
const pageSize = ref(10)
const listLoading = ref(false)
const displayMode = ref('list')
const groupField = ref('projectName')
const queryParams = reactive({ keyword: '', projectId: undefined, priority: undefined, status: undefined, creatorId: undefined, assigneeId: undefined })

const columns = [
  { title: '编号', dataIndex: 'bugNo', width: 80 },
  { title: 'Bug标题', dataIndex: 'title', width: 240 },
  { title: '所属项目', dataIndex: 'projectName', width: 210 },
  { title: '严重等级', dataIndex: 'priority', width: 110 },
  { title: '状态', dataIndex: 'status', width: 110 },
  { title: '指定人', dataIndex: 'assigneeName', width: 90 },
  { title: '创建人', dataIndex: 'creatorName', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 170 },
  { title: '操作', dataIndex: 'operation', width: 120, fixed: 'right' },
]

const groupedBugs = computed(() => {
  const result = {}
  for (const bug of bugs.value) {
    let key = bug[groupField.value] || '未分组'
    if (groupField.value === 'priority') key = priorityLabels[key] || key
    if (groupField.value === 'status') key = statusLabels[key] || key
    if (!result[key]) result[key] = []
    result[key].push(bug)
  }
  return result
})

const isClosedBug = bug => {
  if (!bug) return false
  return bug.status === 'CLOSED' || bug.status === '已关闭' || bug.statusCode === 'CLOSED'
}

const isResolvedBug = bug => bug?.status === 'PENDING_VERIFY' || bug?.status === '待验证' || bug?.statusCode === 'PENDING_VERIFY'
const isBugCreator = bug => Boolean(currentUserId.value) && String(bug?.creatorId) === String(currentUserId.value)

const OPERATION_LABELS = {
  CREATE: '创建', UPDATE: '更新', DELETE: '删除',
  ASSIGN: '指派', FIX: '修复', CLOSE: '关闭', REOPEN: '重开',
  COMMENT: '评论', EXPORT: '导出', UPDATE_STATUS: '更新状态',
}
const operationLabel = type => OPERATION_LABELS[type] || type || '操作'

const loadBugs = async () => {
  listLoading.value = true
  try {
    const res = await getProjectBugs({
      pageNo: current.value,
      pageSize: pageSize.value,
      keyword: queryParams.keyword || undefined,
      projectId: queryParams.projectId || undefined,
      priority: queryParams.priority || undefined,
      status: queryParams.status || undefined,
      creatorId: queryParams.creatorId || undefined,
      assigneeId: queryParams.assigneeId || undefined,
    })
    bugs.value = res.records || []
    total.value = res.total || 0
  } catch (e) {
    message.error(e.message || '加载失败')
  } finally {
    listLoading.value = false
  }
}

const handleSearch = () => { current.value = 1; loadBugs() }
const handleReset = () => {
  Object.assign(queryParams, { keyword: '', projectId: undefined, priority: undefined, status: undefined, creatorId: undefined, assigneeId: undefined })
  current.value = 1
  loadBugs()
}
const handleTableChange = ({ current: c, pageSize: ps }) => { current.value = c; pageSize.value = ps; loadBugs() }
const handleGroupPageChange = (page, size) => { current.value = page; pageSize.value = size; loadBugs() }

const selectedBug = ref(null)
const detailLoading = ref(false)
const comments = ref([])
const commentsLoading = ref(false)
const commentContent = ref('')
const commentLoading = ref(false)
const commentEditorRef = shallowRef()
const commentEditorKey = ref(0)
const previewImage = ref('')
const previewVisible = ref(false)
const richImageObjectUrls = new Set()
const ossHostPattern = /^https:\/\/company-project-oss\.oss-cn-shanghai\.aliyuncs\.com\/(.+)$/i
const normalizeRichHtml = html => {
  if (!html) return '<p>-</p>'
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return html

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  doc.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src')
    const privateOssMatch = src?.trim().match(ossHostPattern)
    if (privateOssMatch) {
      img.removeAttribute('src')
      img.setAttribute('data-rich-image-key', decodeURIComponent(privateOssMatch[1]))
    } else if (src) {
      img.setAttribute('src', src.trim())
    }
    img.setAttribute('referrerpolicy', 'no-referrer')
    img.setAttribute('loading', 'lazy')
    img.setAttribute('decoding', 'async')
    img.classList.add('rich-image')
  })
  return doc.body.firstElementChild?.innerHTML || '<p>-</p>'
}
const clearRichImageObjectUrls = () => {
  richImageObjectUrls.forEach(url => URL.revokeObjectURL(url))
  richImageObjectUrls.clear()
}
const hydratePrivateRichImages = async () => {
  await nextTick()
  clearRichImageObjectUrls()
  const images = document.querySelectorAll('.detail-rich img[data-rich-image-key], .comment-item__content img[data-rich-image-key]')
  await Promise.all(Array.from(images).map(async img => {
    const key = img.getAttribute('data-rich-image-key')
    if (!key) return
    try {
      const response = await fetch(`/api/files/rich-text-image?key=${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      })
      if (!response.ok) throw new Error('图片加载失败')
      const objectUrl = URL.createObjectURL(await response.blob())
      richImageObjectUrls.add(objectUrl)
      img.setAttribute('src', objectUrl)
      img.removeAttribute('data-rich-image-key')
    } catch {
      img.setAttribute('alt', '图片加载失败')
      img.classList.add('rich-image--failed')
    }
  }))
}
const bugDescriptionHtml = computed(() => normalizeRichHtml(selectedBug.value?.description))
const bugReproduceStepsHtml = computed(() => normalizeRichHtml(selectedBug.value?.reproduceSteps))
const bugResolveRemark = computed(() => selectedBug.value?.resolveRemark || selectedBug.value?.remark || selectedBug.value?.fixDetail || '')
const bugResolveRemarkHtml = computed(() => normalizeRichHtml(bugResolveRemark.value))
const handleRichImageClick = event => {
  const image = event.target?.closest?.('img')
  if (!image?.src || image.classList.contains('rich-image--failed')) return
  previewImage.value = image.src
  previewVisible.value = true
}
const handlePreviewVisibleChange = visible => {
  previewVisible.value = visible
}
const richTextImageUploadConf = {
  MENU_CONF: {
    uploadImage: {
      async customUpload(file, insertFn) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/files/upload-image', {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: fd,
        }).catch(() => null)
        if (!res || !res.ok) { message.error('图片上传失败'); return }
        const json = await res.json()
        if (json.errno === 0) insertFn(json.data.url, json.data.alt || '', json.data.href || '')
        else message.error('图片上传失败')
      },
    },
  },
}

const toolbarConfig = {
  toolbarKeys: [
    'headerSelect',
    'fontSize',
    '|',
    'bold',
    'italic',
    'underline',
    'through',
    'color',
    'bgColor',
    '|',
    'bulletedList',
    'numberedList',
    'justifyLeft',
    'justifyCenter',
    'justifyRight',
    '|',
    'uploadImage',
    'insertImage',
  ],
}
const commentEditorConfig = { placeholder: '请输入评论内容', scroll: true, ...richTextImageUploadConf }

const handleCommentEditorCreated = editor => { commentEditorRef.value = editor }
const resetCommentEditor = () => {
  commentEditorRef.value?.clear()
  commentContent.value = ''
  commentEditorRef.value = undefined
  commentEditorKey.value += 1
}

const loadComments = async (id) => {
  commentsLoading.value = true
  try {
    comments.value = await listBugComments(id)
  } catch {
    comments.value = []
  } finally {
    commentsLoading.value = false
  }
}

const handleSendComment = async () => {
  if (!commentEditorRef.value || commentEditorRef.value.isEmpty()) { message.warning('请输入评论内容'); return }
  commentLoading.value = true
  try {
    const comment = await addBugComment(selectedBug.value.id, { content: commentContent.value })
    comments.value.unshift(comment)
    resetCommentEditor()
    message.success('评论发送成功')
  } catch (e) {
    message.error(e.message || '发送失败')
  } finally {
    commentLoading.value = false
  }
}

const assignVisible = ref(false)
const assignLoading = ref(false)
const assignState = reactive({ assigneeId: undefined, reason: '' })

const handleAssign = async () => {
  if (!assignState.assigneeId) { message.warning('请选择负责人'); return }
  assignLoading.value = true
  try {
    selectedBug.value = await assignBug(selectedBug.value.id, { assigneeId: assignState.assigneeId, reason: assignState.reason })
    assignVisible.value = false
    assignState.assigneeId = undefined
    assignState.reason = ''
    message.success('指派成功')
  } catch (e) {
    message.error(e.message || '指派失败')
  } finally {
    assignLoading.value = false
  }
}

const closeLoading = ref(false)
const handleCloseBug = async () => {
  closeLoading.value = true
  try {
    selectedBug.value = await closeBug(selectedBug.value.id)
    message.success('Bug已关闭')
  } catch (e) {
    message.error(e.message || '操作失败')
  } finally {
    closeLoading.value = false
  }
}

const formRef = ref()
const editingId = ref(null)
const submitLoading = ref(false)
const editorRef = shallowRef()
const editorConfig = { placeholder: '请输入重现步骤', scroll: true, ...richTextImageUploadConf }

const createDefaultFormState = () => ({ title: '', projectId: undefined, taskId: undefined, assigneeId: undefined, priority: 'MEDIUM', description: '', reproduceSteps: '' })
const formState = reactive(createDefaultFormState())
const relatedTaskOptions = ref([])
const relatedTaskLoading = ref(false)
const formRules = {
  title: [{ required: true, message: '请输入Bug标题', trigger: 'blur' }],
  projectId: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  assigneeId: [{ required: true, message: '请选择负责人', trigger: 'change' }],
  priority: [{ required: true, message: '请选择严重等级', trigger: 'change' }],
  description: [{ required: true, message: '请输入问题描述', trigger: 'blur' }],
}

const handleEditorCreated = editor => { editorRef.value = editor }

const isTestingTask = task => {
  const roleName = task?.roleName || task?.role || ''
  return roleName.includes('测试') || /test/i.test(roleName)
}

const loadRelatedTasks = async projectId => {
  relatedTaskOptions.value = []
  if (!projectId) return
  relatedTaskLoading.value = true
  try {
    const result = await getProjectTasks({ projectId, pageNo: 1, pageSize: 200 })
    if (String(formState.projectId) === String(projectId)) {
      relatedTaskOptions.value = (result.records || [])
        .filter(isTestingTask)
        .map(task => ({ label: task.name, value: task.id }))
    }
  } catch (error) {
    message.error(error.message || '关联任务加载失败')
  } finally {
    relatedTaskLoading.value = false
  }
}

const resolveVisible = ref(false)
const resolveFormRef = ref()
const resolveEditorRef = shallowRef()
const resolveEditorKey = ref(0)
const createDefaultResolveForm = () => ({ solution: undefined, resolvedDate: dayjs().format('YYYY-MM-DD'), assigneeId: undefined, remark: '' })
const resolveForm = reactive(createDefaultResolveForm())
const resolveRules = {
  solution: [{ required: true, message: '请选择解决方案', trigger: 'change' }],
  resolvedDate: [{ required: true, message: '请选择解决日期', trigger: 'change' }],
}
const resolveSolutionOptions = [
  { label: '已解决', value: 'RESOLVED' },
  { label: '设计如此', value: 'BY_DESIGN' },
  { label: '重复bug', value: 'DUPLICATE' },
  { label: '外部原因', value: 'EXTERNAL_CAUSE' },
  { label: '代码bug', value: 'CODE_BUG' },
  { label: '无法重现', value: 'CANNOT_REPRODUCE' },
  { label: '延期处理', value: 'DEFERRED' },
  { label: '不予解决', value: 'WONT_FIX' },
]
const resolveSolutionLabels = Object.fromEntries(resolveSolutionOptions.map(item => [item.value, item.label]))
const resolveEditorConfig = { placeholder: '请输入备注信息...', scroll: true, ...richTextImageUploadConf }

const handleResolveEditorCreated = editor => { resolveEditorRef.value = editor }
const resetResolveForm = () => {
  Object.assign(resolveForm, createDefaultResolveForm())
  resolveEditorRef.value = undefined
  resolveEditorKey.value += 1
}
const openResolveModal = () => {
  resetResolveForm()
  resolveVisible.value = true
}
const resolveLoading = ref(false)
const handleResolveConfirm = async () => {
  await resolveFormRef.value?.validate()
  resolveLoading.value = true
  try {
    selectedBug.value = await resolveBug(selectedBug.value.id, {
      solution: resolveForm.solution,
      resolvedDate: resolveForm.resolvedDate,
      assigneeId: resolveForm.assigneeId || undefined,
      remark: resolveForm.remark || undefined,
    })
    resolveVisible.value = false
    message.success('Bug已解决，等待验证')
  } catch (e) {
    message.error(e.message || '操作失败')
  } finally {
    resolveLoading.value = false
  }
}

const handleProjectChange = projectId => {
  formState.taskId = undefined
  loadRelatedTasks(projectId)
}

const handleSubmit = async () => {
  if (submitLoading.value) return
  await formRef.value?.validate()
  if (formState.assigneeId && String(formState.assigneeId) === String(currentUserId.value)) {
    message.warning('Bug 不能指定给自己，请选择其他负责人')
    return
  }
  submitLoading.value = true
  try {
    const body = {
      title: formState.title,
      projectId: formState.projectId,
      taskId: formState.taskId || undefined,
      assigneeId: formState.assigneeId,
      priority: formState.priority,
      description: formState.description,
      reproduceSteps: formState.reproduceSteps || '<p><br></p>',
    }
    if (editingId.value) {
      await updateBug(editingId.value, body)
      message.success('Bug编辑成功')
    } else {
      await createBug(body)
      message.success('Bug新增成功')
    }
    handleBack()
  } catch (e) {
    message.error(e.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

const handleCreate = () => router.push({ name: 'BugCreate' })
const handleEdit = record => router.push({ name: 'BugEdit', params: { id: record.id } })
const handleDetail = record => router.push({ name: 'BugDetail', params: { id: record.id } })
const handleEditFromDetail = () => router.push({ name: 'BugEdit', params: { id: selectedBug.value.id } })
const handleBack = () => router.back()

const handleCloseBugFromList = async record => {
  try {
    const closed = await closeBug(record.id)
    Object.assign(record, closed || {}, { status: 'CLOSED' })
    message.success('Bug已关闭')
    loadBugs()
  } catch (e) {
    message.error(e.message || '关闭失败')
  }
}

const syncRouteState = async () => {
  if (viewMode.value === 'list') { loadBugs(); return }
  const id = route.params.id
  if (viewMode.value === 'create') {
    Object.assign(formState, createDefaultFormState())
    relatedTaskOptions.value = []
    editingId.value = null
    return
  }
  if (viewMode.value === 'edit') {
    editingId.value = id
    try {
      const bug = await getBugById(id)
      if (bug.status === 'CLOSED') {
        message.warning('已关闭的Bug不可编辑')
        router.replace({ name: 'BugDetail', params: { id } })
        return
      }
      formState.title = bug.title || ''
      formState.projectId = bug.projectId
      await loadRelatedTasks(bug.projectId)
      formState.taskId = bug.taskId || undefined
      formState.assigneeId = bug.assigneeId
      formState.priority = bug.priority || 'MEDIUM'
      formState.description = bug.description || ''
      formState.reproduceSteps = bug.reproduceSteps || ''
      editorRef.value?.setHtml(bug.reproduceSteps || '')
    } catch (e) {
      message.error('加载Bug失败')
      handleBack()
    }
    return
  }
  if (viewMode.value === 'detail') {
    resetCommentEditor()
    detailLoading.value = true
    selectedBug.value = null
    comments.value = []
    try {
      const [bug, cmts] = await Promise.all([getBugById(id), listBugComments(id)])
      selectedBug.value = bug
      comments.value = cmts
      void hydratePrivateRichImages()
    } catch (e) {
      message.error(e.message || '加载失败')
    } finally {
      detailLoading.value = false
    }
  }
}

watch(() => [route.name, route.params.id], syncRouteState, { immediate: true })

onBeforeUnmount(() => {
  editorRef.value?.destroy()
  commentEditorRef.value?.destroy()
  resolveEditorRef.value?.destroy()
  clearRichImageObjectUrls()
})

onMounted(async () => {
  const [projectRes, userRes] = await Promise.all([
    getProjectList({ projectType: 'MANAGEMENT', pageSize: 200 }).catch(() => ({ records: [] })),
    getSystemUsers({ pageSize: 200 }).catch(() => ({ records: [] })),
  ])
  projects.value = projectRes.records || []
  users.value = userRes.records || []
})
</script>

<style scoped>
.bug-page { height: 100%; width: min(1600px, 100%); margin: 0 auto; overflow-x: hidden; overflow-y: auto; color: #262626; }
.bug-page--list { display: flex; flex-direction: column; height: calc(100vh - 126px); min-height: 0; overflow: hidden; }
.bug-filter, .bug-list, .bug-form-card { border: 1px solid #edf0f3; box-shadow: 0 2px 8px rgb(0 0 0 / 3%); }
.bug-filter { flex: none; margin-bottom: 16px; }
.bug-filter :deep(.ant-card-body) { padding: 16px 18px 2px; }
.bug-filter__form.app-filter-form { display: grid; grid-template-columns: minmax(180px, 1.4fr) repeat(5, minmax(130px, 1fr)) max-content !important; column-gap: 16px !important; align-items: end; }
.bug-filter__form :deep(.ant-form-item) { margin: 0 0 14px; }
.bug-filter__form :deep(.ant-form-item-row) { width: 100%; flex-wrap: nowrap; }
.bug-filter__form :deep(.ant-form-item-control) { flex: 1; }
.bug-filter__form :deep(.ant-input), .bug-filter__form :deep(.ant-select) { width: 100%; }
.bug-filter__actions { grid-column: auto !important; justify-self: end; }
.bug-list__toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.bug-list__group { display: flex; align-items: center; gap: 12px; color: #666; }
.bug-list__group :deep(.ant-select) { width: 130px; }
.bug-list { flex: 1; min-height: 0; }
.bug-list :deep(.ant-card-body) { display: flex; flex-direction: column; height: 100%; min-height: 0; padding: 18px; overflow: hidden; }
.bug-list__toolbar { flex: none; }
.bug-list__table { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.bug-list__table :deep(.ant-spin-nested-loading) { flex: 1; min-height: 0; }
.bug-list__table :deep(.ant-pagination), .bug-list__pagination { flex: none; align-self: flex-end; margin: 12px 0 0; }
.bug-group-list { flex: 1; min-height: 0; overflow: auto; }
.bug-list :deep(.ant-table-cell) { white-space: nowrap; }
.bug-title-text { display: block; width: 100%; overflow: hidden; color: #1677ff; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.bug-no { color: #1677ff; font-size: 12px; font-weight: 600; font-family: monospace; }
.bug-group { margin-bottom: 24px; }
.bug-group__title { margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #333; }
.bug-form-card { width: min(1100px, 100%); min-height: 538px; margin: 0 auto; }
.bug-form-card :deep(.ant-card-body) { padding: 22px 30px 24px; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.panel-heading h2 { margin: 0; font-size: 18px; }
.bug-form-fields { max-width: 980px; }
.bug-form-fields :deep(.ant-form-item) { margin-bottom: 20px; }
.bug-form-fields :deep(.ant-form-item-label) { max-width: 150px; }
.bug-rich-editor { border: 1px solid #d9d9d9; border-radius: 4px; overflow: hidden; }
.bug-rich-editor :deep(.w-e-toolbar) { border-bottom: 1px solid #d9d9d9; }
.bug-rich-editor :deep(.w-e-text-container) { min-height: 260px; }
.bug-rich-editor :deep(.w-e-text-container img) { max-width: 100%; height: auto; }
.bug-form-card { padding-bottom: 96px; }

.form-actions {
  position: fixed;
  bottom: 20px;
  left: 50%;
  z-index: 30;
  display: flex;
  gap: 26px;
  align-items: center;
  justify-content: center;
  width: max-content;
  max-width: calc(100vw - 32px);
  padding: 10px 30px;
  background: rgba(0, 0, 0, 0.28);
  border-radius: 12px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.16);
  transform: translateX(-50%);
}
.form-actions .ant-btn {
  min-width: 80px;
  height: 30px;
  font-weight: 600;
  border-radius: 3px;
}
/* ── Detail page ── */
.detail-page { width: min(1600px, 100%); margin: 0 auto; padding-bottom: 96px; }

.detail-header {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 56px;
  padding: 0 4px 16px;
  border-bottom: 1px solid #edf0f3;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.detail-back { flex-shrink: 0; }

.detail-bug-no {
  flex-shrink: 0;
  padding: 2px 10px;
  color: #1677ff;
  font-size: 13px;
  font-weight: 700;
  font-family: monospace;
  background: #e6f4ff;
  border-radius: 5px;
}

.detail-title {
  flex: 1;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f1f1f;
  line-height: 1.35;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: start;
}

.detail-main { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

.detail-sidebar { display: flex; flex-direction: column; gap: 14px; min-width: 0; margin-right: 10px; }

.lifecycle-card :deep(.ant-card-body) { padding: 14px 16px; }

.lifecycle-timeline { margin-top: 4px; }
.lifecycle-timeline :deep(.ant-timeline-item-tail) { border-inline-start-color: #e0e7ef; }
.lifecycle-timeline :deep(.ant-timeline-item-head) { background: #1677ff; border-color: #1677ff; width: 9px; height: 9px; }
.lifecycle-timeline :deep(.ant-timeline-item-content) { inset-inline-start: 20px; margin-inline-start: 20px; }

.timeline-action { font-size: 13px; font-weight: 600; color: #1f2937; line-height: 1.4; }
.timeline-content { margin-top: 3px; font-size: 12px; color: #6b7280; line-height: 1.5; word-break: break-word; }
.timeline-time { margin-top: 2px; font-size: 11px; color: #bfbfbf; }

.detail-card {
  border: 1px solid #edf0f3 !important;
  box-shadow: 0 1px 4px rgb(0 0 0 / 4%);
}

.detail-card :deep(.ant-card-head) {
  min-height: 44px;
  padding: 0 18px;
  border-bottom: 1px solid #f2f4f6;
}

.detail-card :deep(.ant-card-body) { padding: 16px 18px; }

.detail-card__title { font-size: 14px; font-weight: 600; color: #1f1f1f; }

.bug-detail-overview :deep(.ant-card-body) {
  padding: 0;
}

.detail-section {
  padding: 16px 18px;
  border-bottom: 1px solid #f2f4f6;
}

.detail-section:last-child {
  border-bottom: 0;
}

.detail-section h3 {
  margin: 0 0 14px;
  color: #1f1f1f;
  font-size: 14px;
  font-weight: 600;
}

.native-info-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  color: #111827;
}

.native-info-table th,
.native-info-table td {
  height: 48px;
  padding: 12px 14px;
  font-size: 14px;
  text-align: left;
  border: 1px solid #e6ebf1;
  word-break: break-word;
}

.native-info-table th {
  width: 22%;
  color: #334155;
  font-weight: 700;
  background: #f3f6fa;
}

.native-info-table td {
  width: 28%;
  background: #fff;
  font-weight: 400;
}

.detail-text {
  margin: 0;
  color: #434343;
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-rich { color: #434343; font-size: 14px; line-height: 1.75; word-break: break-word; }
.resolve-remark { margin-top: 12px; }
.detail-rich :deep(p) { margin: 0 0 10px; }
.detail-rich :deep(img),
.detail-rich :deep(.rich-image) {
  display: block;
  max-width: min(100%, 960px);
  height: auto !important;
  margin: 10px 0;
  object-fit: contain;
  border: 1px solid #edf0f3;
  border-radius: 8px;
}
.detail-rich :deep(img),
.comment-item__content :deep(img) {
  cursor: zoom-in;
}
.detail-rich :deep(.rich-image--failed),
.comment-item__content :deep(.rich-image--failed) {
  min-width: 160px;
  min-height: 40px;
  padding: 10px;
  color: #ff4d4f;
  background: #fff2f0;
  border-color: #ffccc7;
}

.fix-block { margin-bottom: 16px; }
.fix-block:last-child { margin-bottom: 0; }
.fix-label {
  margin-bottom: 6px;
  color: #8c8c8c;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.comment-list { display: flex; flex-direction: column; gap: 1px; margin-bottom: 16px; }
.comment-item {
  padding: 12px 14px;
  background: #fafafa;
  border-radius: 6px;
}
.comment-item__meta { display: flex; gap: 10px; align-items: baseline; margin-bottom: 6px; }
.comment-item__meta b { font-size: 13px; color: #262626; }
.comment-item__meta small { color: #bfbfbf; font-size: 12px; }
.comment-item__content { color: #555; font-size: 13px; line-height: 1.65; }
.comment-item__content :deep(p) { margin: 0; }
.comment-item__content :deep(img),
.comment-item__content :deep(.rich-image) {
  display: block;
  max-width: min(100%, 720px);
  height: auto !important;
  margin: 8px 0;
  object-fit: contain;
  border: 1px solid #edf0f3;
  border-radius: 8px;
}
.comment-empty { padding: 16px 0; }

.comment-rich-editor {
  overflow: hidden;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}
.comment-rich-editor :deep(.w-e-toolbar) { border-bottom: 1px solid #d9d9d9; }
.comment-rich-editor :deep(.w-e-text-container) { min-height: 120px; }
.comment-rich-editor :deep(.w-e-text-container img) { max-width: 100%; height: auto; }

.send-row { display: flex; justify-content: flex-end; margin-top: 10px; }

.resolve-form { margin-top: 12px; }
.resolve-form :deep(.ant-form-item) { margin-bottom: 20px; }
.resolve-rich-editor { overflow: hidden; background: #fff; border: 1px solid #d9d9d9; border-radius: 4px; }
.resolve-rich-editor :deep(.w-e-toolbar) { border-bottom: 1px solid #d9d9d9; }
.resolve-rich-editor :deep(.w-e-text-container) { min-height: 220px; }
.resolve-rich-editor :deep(.w-e-text-container img) { max-width: 100%; height: auto; }
.resolve-actions { display: flex; justify-content: center; gap: 16px; margin-top: 28px; }
.resolve-actions :deep(.ant-btn) { min-width: 72px; }

.detail-floating-actions {
  position: fixed;
  bottom: 20px;
  left: 50%;
  z-index: 20;
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: center;
  width: max-content;
  max-width: calc(100vw - 32px);
  padding: 10px 30px;
  background: rgba(0, 0, 0, 0.28);
  border-radius: 12px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.16);
  transform: translateX(-50%);
}
.detail-floating-actions .ant-btn {
  min-width: 80px;
  height: 30px;
  font-weight: 600;
  border-radius: 3px;
}
.detail-floating-actions .resolve-button { background: #52c41a; border-color: #52c41a; }
.detail-floating-actions .resolve-button:hover { background: #73d13d; border-color: #73d13d; }

.closed-tip { text-align: center; }
.closed-tip p { margin: 10px 0 0; color: #8c8c8c; font-size: 13px; }
.detail-closed-tip { padding: 18px 0; }

@media (max-width: 1000px) {
  .detail-floating-actions,
  .form-actions {
    gap: 18px;
    padding: 10px 22px;
  }
}
:deep(.ant-modal-body) { padding-top: 10px; }
@media (max-width: 960px) {
  .bug-filter__form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bug-filter__actions { grid-column: 2; }
}
</style>
