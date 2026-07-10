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
              <template v-else-if="column.dataIndex === 'id'"><span class="bug-id">{{ text }}</span></template>
              <template v-else-if="column.dataIndex === 'title'">
                <a-button type="link" class="bug-title-link" @click="handleDetail(record)">{{ text }}</a-button>
              </template>
              <template v-else-if="column.dataIndex === 'priority'">
                <a-tag :color="priorityColors[text]">{{ priorityLabels[text] || text }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'status'">
                <a-tag :color="statusColors[text]">{{ statusLabels[text] || text }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'createdAt'">{{ text ? text.slice(0, 10) : '-' }}</template>
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
                <template v-if="column.dataIndex === 'id'"><span class="bug-id">{{ text }}</span></template>
                <template v-else-if="column.dataIndex === 'title'">
                  <a-button type="link" class="bug-title-link" @click="handleDetail(record)">{{ text }}</a-button>
                </template>
                <template v-else-if="column.dataIndex === 'priority'">
                  <a-tag :color="priorityColors[text]">{{ priorityLabels[text] || text }}</a-tag>
                </template>
                <template v-else-if="column.dataIndex === 'status'">
                  <a-tag :color="statusColors[text]">{{ statusLabels[text] || text }}</a-tag>
                </template>
                <template v-else-if="column.dataIndex === 'createdAt'">{{ text ? text.slice(0, 10) : '-' }}</template>
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
          <a-form-item label="问题描述" name="description"><a-textarea v-model:value="formState.description" :rows="6" placeholder="请输入问题描述" /></a-form-item>
          <a-form-item label="重现步骤">
            <div class="bug-rich-editor">
              <Toolbar :editor="editorRef" :default-config="toolbarConfig" mode="default" />
              <Editor v-model="formState.reproduceSteps" :default-config="editorConfig" mode="default" @on-created="handleEditorCreated" />
            </div>
          </a-form-item>
        </div>
      </a-form>
      <div class="form-actions"><a-button @click="handleBack">取消</a-button><a-button type="primary" :loading="submitLoading" @click="handleSubmit">确认</a-button></div>
    </a-card>

    <template v-else>
      <div class="detail-page">
        <a-button class="detail-back" @click="handleBack"><ArrowLeftOutlined />返回</a-button>
        <a-spin :spinning="detailLoading">
          <div v-if="selectedBug" class="detail-content">
            <section class="detail-section detail-basic">
              <h2>基本信息</h2>
              <a-descriptions bordered :column="2">
                <a-descriptions-item label="Bug ID">{{ selectedBug.id }}</a-descriptions-item>
                <a-descriptions-item label="标题">{{ selectedBug.title }}</a-descriptions-item>
                <a-descriptions-item label="所属项目">{{ selectedBug.projectName || '-' }}</a-descriptions-item>
                <a-descriptions-item label="优先级">
                  <a-tag :color="priorityColors[selectedBug.priority]">{{ priorityLabels[selectedBug.priority] || selectedBug.priority }}</a-tag>
                </a-descriptions-item>
                <a-descriptions-item label="状态">
                  <a-tag :color="statusColors[selectedBug.status]">{{ statusLabels[selectedBug.status] || selectedBug.status }}</a-tag>
                </a-descriptions-item>
                <a-descriptions-item label="负责人">{{ selectedBug.assigneeName || '-' }}</a-descriptions-item>
                <a-descriptions-item label="创建人">{{ selectedBug.creatorName || '-' }}</a-descriptions-item>
                <a-descriptions-item label="创建时间">{{ selectedBug.createdAt ? selectedBug.createdAt.slice(0, 10) : '-' }}</a-descriptions-item>
              </a-descriptions>
              <h3>问题描述</h3><p>{{ selectedBug.description }}</p>
              <h3>重现步骤</h3><div class="detail-steps" v-html="selectedBug.reproduceSteps"></div>
              <template v-if="selectedBug.fixAnalysis || selectedBug.fixDetail">
                <h3>修复记录</h3>
                <div v-if="selectedBug.fixAnalysis"><b>问题分析：</b><p>{{ selectedBug.fixAnalysis }}</p></div>
                <div v-if="selectedBug.fixDetail"><b>修复细节：</b><p>{{ selectedBug.fixDetail }}</p></div>
              </template>
            </section>

            <section class="detail-section">
              <h3>评论</h3>
              <a-spin :spinning="commentsLoading">
                <div class="comment-list">
                  <div v-for="comment in comments" :key="comment.id" class="comment-item">
                    <b>{{ comment.authorName || ('用户' + comment.userId) }}</b>
                    <small>{{ comment.createdAt ? String(comment.createdAt).slice(0, 16).replace('T', ' ') : '' }}</small>
                    <div class="comment-item__content" v-html="comment.content"></div>
                  </div>
                  <div v-if="!comments.length" style="padding: 12px; color: #999; text-align: center;">暂无评论</div>
                </div>
              </a-spin>
              <template v-if="!isClosedBug(selectedBug)">
                <div class="comment-rich-editor">
                  <Toolbar :editor="commentEditorRef" :default-config="toolbarConfig" mode="default" />
                  <Editor v-model="commentContent" :default-config="commentEditorConfig" mode="default" @on-created="handleCommentEditorCreated" />
                </div>
                <div class="send-row"><a-button type="primary" :loading="commentLoading" @click="handleSendComment">发送</a-button></div>
              </template>
            </section>

            <div v-if="!isClosedBug(selectedBug)" class="detail-actions">
              <a-button type="primary" @click="handleEditFromDetail">编辑</a-button>
              <a-button @click="assignVisible = true">指派</a-button>
              <a-button danger :loading="closeLoading" @click="handleCloseBug">关闭Bug</a-button>
            </div>
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
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getProjectBugs, getBugById, createBug, updateBug, deleteBug, closeBug, assignBug,
  addBugComment, listBugComments, getProjectList, getSystemUsers,
} from '@/api/managementProject'

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
  { title: '序号', dataIndex: 'index', width: 60, fixed: 'left' },
  { title: 'Bug ID', dataIndex: 'id', width: 100 },
  { title: 'Bug标题', dataIndex: 'title', width: 240 },
  { title: '所属项目', dataIndex: 'projectName', width: 210 },
  { title: '优先级', dataIndex: 'priority', width: 110 },
  { title: '状态', dataIndex: 'status', width: 110 },
  { title: '负责人', dataIndex: 'assigneeName', width: 90 },
  { title: '创建人', dataIndex: 'creatorName', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 120 },
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
      page: current.value, pageSize: pageSize.value,
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
const toolbarConfig = {}
const commentEditorConfig = { placeholder: '请输入评论内容', scroll: true }

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
const editorConfig = { placeholder: '请输入重现步骤', scroll: true }

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
  const id = Number(route.params.id)
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
})

onMounted(async () => {
  const [projectRes, userRes] = await Promise.all([
    getProjectList({ projectType: 'EXECUTION', pageSize: 500 }).catch(() => ({ records: [] })),
    getSystemUsers({ pageSize: 500 }).catch(() => ({ records: [] })),
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
.bug-id { color: #888; font-size: 13px; }
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
.detail-page { width: min(1100px, 100%); margin: 0 auto; }
.detail-back { margin: 0 0 14px 4px; }
.detail-content { background: #fff; }
.detail-section { padding: 18px 28px 28px; border-bottom: 14px solid #f2f3f5; }
.detail-section h2 { margin: 0 0 22px; font-size: 18px; }
.detail-section h3 { margin: 22px 0 18px; text-align: center; font-size: 16px; font-weight: 500; }
.detail-basic > p { min-height: 34px; margin: 0 10px; color: #555; white-space: pre-line; }
.detail-steps { max-width: 760px; }
.comment-list { max-height: 150px; overflow-y: auto; border: 1px solid #f0f0f0; }
.comment-item { padding: 12px; background: #fafafa; border-bottom: 1px solid #fff; }
.comment-item small { margin-left: 12px; color: #999; }
.comment-item__content { margin-top: 5px; color: #555; }
.comment-item__content :deep(p) { margin: 0; }
.comment-rich-editor { margin-top: 18px; overflow: hidden; background: #fff; border: 1px solid #d9d9d9; border-radius: 4px; }
.comment-rich-editor :deep(.w-e-toolbar) { border-bottom: 1px solid #d9d9d9; }
.comment-rich-editor :deep(.w-e-text-container) { min-height: 180px; }
.comment-rich-editor :deep(.w-e-text-container img), .comment-item__content :deep(img) { max-width: 100%; height: auto; }
.send-row { display: flex; justify-content: flex-end; margin-top: 12px; }
.detail-actions { display: flex; justify-content: center; gap: 28px; padding: 16px; background: #f5f5f5; }
.detail-actions .ant-btn { min-width: 84px; }
:deep(.ant-modal-body) { padding-top: 10px; }
@media (max-width: 1200px) {
  .bug-filter__form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
