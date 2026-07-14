<template>
  <div class="bug-page">
    <template v-if="viewMode === 'list'">
      <a-card class="bug-filter" :bordered="false">
        <a-form :model="queryParams" class="bug-filter__form" layout="inline">
          <a-form-item label="搜索"><a-input v-model:value="queryParams.keyword" allow-clear /></a-form-item>
          <a-form-item label="所属项目"><a-select v-model:value="queryParams.projectId" :options="projectOptions" placeholder="全部" allow-clear /></a-form-item>
          <a-form-item label="优先级"><a-select v-model:value="queryParams.priority" :options="priorityFilterOptions" placeholder="全部" allow-clear /></a-form-item>
          <a-form-item label="状态"><a-select v-model:value="queryParams.status" :options="statusFilterOptions" placeholder="全部" allow-clear /></a-form-item>
          <a-form-item class="bug-filter__actions">
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
            row-key="id"
            :columns="columns"
            :data-source="bugs"
            :pagination="{ current, pageSize, total, showSizeChanger: true, showTotal: t => `共 ${t} 条`, pageSizeOptions: ['10', '50', '100'] }"
            :loading="listLoading"
            :scroll="{ x: 1260 }"
            size="middle"
            @change="handleTableChange"
          >
            <template #bodyCell="{ column, record, text, index }">
              <template v-if="column.dataIndex === 'index'">{{ (current - 1) * pageSize + index + 1 }}</template>
              <template v-else-if="column.dataIndex === 'bugNo'"><span class="bug-no">{{ text ? '#' + String(text).padStart(3, '0') : '-' }}</span></template>
              <template v-else-if="column.dataIndex === 'title'">
                <a-button type="link" class="bug-title-link" @click="handleDetail(record)">{{ text }}</a-button>
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
                  <a-button v-if="!isClosedBug(record)" type="link" size="small" danger @click="handleDeleteBug(record)">删除</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </template>

        <template v-else>
          <div v-for="(group, key) in groupedBugs" :key="key" class="bug-group">
            <h4 class="bug-group__title">{{ key || '未分组' }} ({{ group.length }})</h4>
            <a-table
              row-key="id"
              :columns="columns.filter(c => c.dataIndex !== 'index')"
              :data-source="group"
              :pagination="false"
              :scroll="{ x: 1200 }"
              size="middle"
            >
              <template #bodyCell="{ column, record, text }">
                <template v-if="column.dataIndex === 'bugNo'"><span class="bug-no">{{ text ? '#' + String(text).padStart(3, '0') : '-' }}</span></template>
                <template v-else-if="column.dataIndex === 'title'">
                  <a-button type="link" class="bug-title-link" @click="handleDetail(record)">{{ text }}</a-button>
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
                    <a-button v-if="!isClosedBug(record)" type="link" size="small" danger @click="handleDeleteBug(record)">删除</a-button>
                  </a-space>
                </template>
              </template>
            </a-table>
          </div>
          <a-empty v-if="!bugs.length" />
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
          <a-form-item label="所属项目" name="projectId"><a-select v-model:value="formState.projectId" :options="projectOptions" placeholder="请选择所属项目" /></a-form-item>
          <a-form-item label="指派给" name="assigneeId"><a-select v-model:value="formState.assigneeId" :options="bugFormUserOptions" placeholder="请选择负责人" show-search option-filter-prop="label" /></a-form-item>
          <a-form-item label="优先级" name="priority"><a-select v-model:value="formState.priority" :options="priorityOptions" /></a-form-item>
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
      <div class="form-actions"><a-button @click="handleBack">取消</a-button><a-button type="primary" :loading="submitLoading" @click="handleSubmit">确认</a-button></div>
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
              <div class="detail-header__tags">
                <a-tag :color="priorityColors[selectedBug.priority]">{{ priorityLabels[selectedBug.priority] || selectedBug.priority }}</a-tag>
                <a-tag :color="statusColors[selectedBug.status]">{{ statusLabels[selectedBug.status] || selectedBug.status }}</a-tag>
              </div>
            </template>
          </div>

          <div v-if="selectedBug" class="detail-body">
            <!-- Left: main content -->
            <div class="detail-main">
              <!-- 基本信息 -->
              <a-card class="detail-card" :bordered="false">
                <template #title><span class="detail-card__title">基本信息</span></template>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">所属项目</span>
                    <span class="info-value">{{ selectedBug.projectName || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">负责人</span>
                    <span class="info-value">{{ selectedBug.assigneeName || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">创建人</span>
                    <span class="info-value">{{ selectedBug.creatorName || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">创建时间</span>
                    <span class="info-value">{{ formatDateTime(selectedBug.createdAt) }}</span>
                  </div>
                  <div v-if="selectedBug.closedAt" class="info-item">
                    <span class="info-label">关闭时间</span>
                    <span class="info-value">{{ formatDateTime(selectedBug.closedAt) }}</span>
                  </div>
                </div>
              </a-card>

              <!-- 问题描述 -->
              <a-card class="detail-card" :bordered="false">
                <template #title><span class="detail-card__title">问题描述</span></template>
                <div class="detail-rich" v-html="bugDescriptionHtml"></div>
              </a-card>

              <!-- 重现步骤 -->
              <a-card class="detail-card" :bordered="false">
                <template #title><span class="detail-card__title">重现步骤</span></template>
                <div class="detail-rich" v-html="bugReproduceStepsHtml"></div>
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
                      <div class="comment-item__content" v-html="normalizeRichHtml(comment.content)"></div>
                    </div>
                    <a-empty v-if="!comments.length && !commentsLoading" description="暂无评论" class="comment-empty" />
                  </div>
                </a-spin>
                <template v-if="!isClosedBug(selectedBug)">
                  <div class="comment-rich-editor">
                    <Toolbar v-if="commentEditorRef" :editor="commentEditorRef" :default-config="toolbarConfig" mode="default" />
                    <Editor v-model="commentContent" :default-config="commentEditorConfig" mode="default" @on-created="handleCommentEditorCreated" />
                  </div>
                  <div class="send-row"><a-button type="primary" :loading="commentLoading" @click="handleSendComment">发送</a-button></div>
                </template>
              </a-card>
            </div>

            <!-- Right: sidebar -->
            <aside class="detail-sidebar">
              <a-card class="detail-card" :bordered="false">
                <template #title><span class="detail-card__title">操作</span></template>
                <div v-if="!isClosedBug(selectedBug)" class="action-list">
                  <a-button block type="primary" @click="handleEditFromDetail">编辑 Bug</a-button>
                  <a-button block @click="assignVisible = true">重新指派</a-button>
                  <a-button block danger :loading="closeLoading" @click="handleCloseBug">关闭 Bug</a-button>
                </div>
                <div v-else class="closed-tip">
                  <a-tag color="green" style="font-size:13px;padding:4px 10px">已关闭</a-tag>
                  <p>该 Bug 已关闭，不可再进行操作。</p>
                </div>
              </a-card>
            </aside>
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
  </div>
</template>

<script setup>
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getProjectBugs, getBugById, createBug, updateBug, deleteBug, closeBug, assignBug,
  addBugComment, listBugComments, getProjectList, getSystemUsers,
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
  { label: '待修复', value: 'PENDING_FIX' }, { label: '修复中', value: 'FIXING' },
  { label: '待验证', value: 'PENDING_VERIFY' }, { label: '已关闭', value: 'CLOSED' },
]
const groupOptions = [
  { label: '所属项目', value: 'projectName' }, { label: '优先级', value: 'priority' }, { label: '状态', value: 'status' },
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
const queryParams = reactive({ keyword: '', projectId: undefined, priority: undefined, status: undefined })

const columns = [
  { title: '编号', dataIndex: 'bugNo', width: 80 },
  { title: 'Bug标题', dataIndex: 'title', width: 240 },
  { title: '所属项目', dataIndex: 'projectName', width: 210 },
  { title: '优先级', dataIndex: 'priority', width: 110 },
  { title: '状态', dataIndex: 'status', width: 110 },
  { title: '负责人', dataIndex: 'assigneeName', width: 90 },
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
  Object.assign(queryParams, { keyword: '', projectId: undefined, priority: undefined, status: undefined })
  current.value = 1
  loadBugs()
}
const handleTableChange = ({ current: c, pageSize: ps }) => { current.value = c; pageSize.value = ps; loadBugs() }

const selectedBug = ref(null)
const detailLoading = ref(false)
const comments = ref([])
const commentsLoading = ref(false)
const commentContent = ref('')
const commentLoading = ref(false)
const commentEditorRef = shallowRef()
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

const toolbarConfig = {}
const commentEditorConfig = { placeholder: '请输入评论内容', scroll: true, ...richTextImageUploadConf }

const handleCommentEditorCreated = editor => { commentEditorRef.value = editor }

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
    commentEditorRef.value.clear()
    commentContent.value = ''
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

const createDefaultFormState = () => ({ title: '', projectId: undefined, assigneeId: undefined, priority: 'MEDIUM', description: '', reproduceSteps: '' })
const formState = reactive(createDefaultFormState())
const formRules = {
  title: [{ required: true, message: '请输入Bug标题', trigger: 'blur' }],
  projectId: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  assigneeId: [{ required: true, message: '请选择负责人', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  description: [{ required: true, message: '请输入问题描述', trigger: 'blur' }],
}

const handleEditorCreated = editor => { editorRef.value = editor }

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
const handleBack = () => router.push({ name: 'BugList' })

const handleDeleteBug = async record => {
  try {
    await deleteBug(record.id)
    message.success('删除成功')
    loadBugs()
  } catch (e) {
    message.error(e.message || '删除失败')
  }
}

const syncRouteState = async () => {
  if (viewMode.value === 'list') { loadBugs(); return }
  const id = route.params.id
  if (viewMode.value === 'create') {
    Object.assign(formState, createDefaultFormState())
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
  clearRichImageObjectUrls()
})

onMounted(async () => {
  const [projectRes, userRes] = await Promise.all([
    getProjectList({ projectType: 'EXECUTION', pageSize: 200 }).catch(() => ({ records: [] })),
    getSystemUsers({ pageSize: 200 }).catch(() => ({ records: [] })),
  ])
  projects.value = projectRes.records || []
  users.value = userRes.records || []
})
</script>

<style scoped>
.bug-page { height: 100%; min-width: 0; overflow-x: hidden; overflow-y: auto; color: #262626; }
.bug-filter, .bug-list, .bug-form-card { border: 1px solid #edf0f3; box-shadow: 0 2px 8px rgb(0 0 0 / 3%); }
.bug-filter { margin-bottom: 16px; }
.bug-filter :deep(.ant-card-body) { padding: 16px 18px 2px; }
.bug-filter__form { display: grid; grid-template-columns: 1.5fr repeat(3, 1fr); column-gap: 26px; }
.bug-filter__form :deep(.ant-form-item) { margin: 0 0 14px; }
.bug-filter__form :deep(.ant-form-item-row) { width: 100%; flex-wrap: nowrap; }
.bug-filter__form :deep(.ant-form-item-control) { flex: 1; }
.bug-filter__form :deep(.ant-input), .bug-filter__form :deep(.ant-select) { width: 100%; }
.bug-filter__actions { justify-self: end; }
.bug-list__toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.bug-list__group { display: flex; align-items: center; gap: 12px; color: #666; }
.bug-list__group :deep(.ant-select) { width: 130px; }
.bug-list :deep(.ant-card-body) { padding: 18px; }
.bug-list :deep(.ant-table-cell) { white-space: nowrap; }
.bug-title-link { height: auto; padding: 0; }
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
.form-actions { display: flex; justify-content: flex-end; gap: 20px; margin-top: 18px; }
.form-actions .ant-btn { width: 120px; }
/* ── Detail page ── */
.detail-page { width: 100%; }

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

.detail-header__tags { display: flex; gap: 6px; flex-shrink: 0; }

.detail-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 18px;
  align-items: start;
}

.detail-main { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

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

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.info-item {
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 9px 12px;
  border-bottom: 1px solid #f5f6f8;
  border-right: 1px solid #f5f6f8;
}

.info-item:nth-child(even) { border-right: none; }
.info-item:nth-last-child(-n+2) { border-bottom: none; }

.info-label {
  flex-shrink: 0;
  width: 70px;
  color: #8c8c8c;
  font-size: 13px;
}

.info-value { color: #262626; font-size: 13px; }

.detail-text {
  margin: 0;
  color: #434343;
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-rich { color: #434343; font-size: 14px; line-height: 1.75; word-break: break-word; }
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

.detail-sidebar { position: sticky; top: 16px; display: flex; flex-direction: column; gap: 14px; }

.action-list { display: flex; flex-direction: column; gap: 10px; }

.closed-tip { text-align: center; }
.closed-tip p { margin: 10px 0 0; color: #8c8c8c; font-size: 13px; }

@media (max-width: 1000px) {
  .detail-body { grid-template-columns: 1fr; }
  .detail-sidebar { position: static; }
}
:deep(.ant-modal-body) { padding-top: 10px; }
@media (max-width: 1200px) {
  .bug-filter__form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
