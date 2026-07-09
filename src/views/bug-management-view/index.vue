<template>
  <div class="bug-page">
    <template v-if="viewMode === 'list'">
      <a-card class="bug-filter" :bordered="false">
        <a-form :model="queryParams" class="bug-filter__form" layout="inline">
          <a-form-item label="搜索"><a-input v-model:value="queryParams.keyword" allow-clear /></a-form-item>
          <a-form-item label="所属项目"><a-select v-model:value="queryParams.project" :options="projectFilterOptions" /></a-form-item>
          <a-form-item label="严重等级"><a-select v-model:value="queryParams.severity" :options="severityFilterOptions" /></a-form-item>
          <a-form-item label="状态"><a-select v-model:value="queryParams.status" :options="statusFilterOptions" /></a-form-item>
          <a-form-item label="创建人"><a-select v-model:value="queryParams.creator" :options="personFilterOptions" /></a-form-item>
          <a-form-item label="指定人"><a-select v-model:value="queryParams.assignee" :options="personFilterOptions" /></a-form-item>
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

        <a-table
          row-key="id"
          :columns="columns"
          :data-source="filteredBugs"
          :pagination="pagination"
          :scroll="{ x: 1260 }"
          size="middle"
        >
          <template #bodyCell="{ column, record, text, index }">
            <template v-if="column.dataIndex === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.dataIndex === 'title'">
              <a-button type="link" class="bug-title-link" @click="handleDetail(record)">{{ text }}</a-button>
            </template>
            <template v-else-if="column.dataIndex === 'project'">
              <a class="bug-project-link" @click.prevent>{{ text }}</a>
            </template>
            <template v-else-if="column.dataIndex === 'severity'">
              <a-tag :color="severityColors[text]">{{ text }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'status'">
              <a-tag :color="statusColors[text]">{{ text }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'operation'">
              <a-space><a-button type="link" size="small" @click="handleDetail(record)">查看</a-button><a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button></a-space>
            </template>
          </template>
        </a-table>
      </a-card>
    </template>

    <a-card v-else-if="viewMode === 'create' || viewMode === 'edit'" class="bug-form-card" :bordered="false">
      <div class="panel-heading">
        <h2>{{ viewMode === 'create' ? '新增Bug' : '编辑Bug' }}</h2>
      </div>
      <a-form ref="formRef" :model="formState" :rules="formRules" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
        <div class="bug-form-fields">
            <a-form-item label="Bug标题" name="title"><a-input v-model:value="formState.title" placeholder="请输入Bug标题" /></a-form-item>
            <a-form-item label="所属项目" name="project"><a-select v-model:value="formState.project" :options="projectOptions" placeholder="请选择所属项目" /></a-form-item>
            <a-form-item label="关联任务"><a-select v-model:value="formState.task" :options="taskOptions" placeholder="请选择关联任务" allow-clear /></a-form-item>
            <a-form-item label="指派给" name="assignee"><a-select v-model:value="formState.assignee" :options="personOptions" placeholder="请选择指定人" /></a-form-item>
            <a-form-item label="严重等级" name="severity"><a-select v-model:value="formState.severity" :options="severityOptions" /></a-form-item>
            <a-form-item label="状态" name="status"><a-select v-model:value="formState.status" :options="statusOptions" /></a-form-item>
            <a-form-item label="附件"><a-upload :before-upload="handleBeforeUpload" :file-list="fileList"><a-button><PaperClipOutlined />选择文件</a-button></a-upload></a-form-item>
            <a-form-item label="问题描述" name="description"><a-textarea v-model:value="formState.description" :rows="6" placeholder="请输入问题描述" /></a-form-item>
            <a-form-item label="重现步骤" name="steps">
              <div class="bug-rich-editor">
                <Toolbar :editor="editorRef" :default-config="toolbarConfig" mode="default" />
                <Editor v-model="formState.steps" :default-config="editorConfig" mode="default" @on-created="handleEditorCreated" />
              </div>
            </a-form-item>
        </div>
      </a-form>
      <div class="form-actions"><a-button @click="handleBack">取消</a-button><a-button type="primary" :loading="submitLoading" @click="handleSubmit">确认</a-button></div>
    </a-card>

    <template v-else>
      <div class="detail-page">
        <a-button class="detail-back" @click="handleBack"><ArrowLeftOutlined />返回</a-button>
        <div class="detail-content">
        <section class="detail-section detail-basic">
          <h2>基本信息</h2>
          <a-descriptions bordered :column="2">
            <a-descriptions-item label="Bug编号">{{ selectedBug.code }}</a-descriptions-item>
            <a-descriptions-item label="标题">{{ selectedBug.title }}</a-descriptions-item>
            <a-descriptions-item label="所属项目">{{ selectedBug.project }}</a-descriptions-item>
            <a-descriptions-item label="严重等级"><a-tag :color="severityColors[selectedBug.severity]">{{ selectedBug.severity }}</a-tag></a-descriptions-item>
            <a-descriptions-item label="状态"><a-tag :color="statusColors[selectedBug.status]">{{ selectedBug.status }}</a-tag></a-descriptions-item>
            <a-descriptions-item label="指定人">{{ selectedBug.assignee }}</a-descriptions-item>
            <a-descriptions-item label="创建人">{{ selectedBug.creator }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{ selectedBug.createdAt }}</a-descriptions-item>
          </a-descriptions>
          <h3>问题描述</h3><p>{{ selectedBug.description }}</p>
          <h3>重现步骤</h3><div class="detail-steps" v-html="selectedBug.steps"></div>
        </section>

        <section class="detail-section">
          <h3>附件</h3>
          <div class="attachment-row"><span>错误截图.png (1.2MB)</span><a @click.prevent="handleDownload('错误截图.png')">下载</a></div>
          <div class="attachment-row"><span>控制台日志.txt (56KB)</span><a @click.prevent="handleDownload('控制台日志.txt')">下载</a></div>
          <h3>修复记录</h3>
          <a-timeline class="repair-timeline">
            <a-timeline-item color="blue">2026-06-10 14:30 — 李四 提交Bug</a-timeline-item>
            <a-timeline-item color="orange">张三 确认Bug并开始修复</a-timeline-item>
            <a-timeline-item color="orange">2026-06-11 14:30 — 张三 完成修复Bug</a-timeline-item>
            <a-timeline-item color="blue">2026-06-12 10:30 — 李四 确认Bug已修复并关闭Bug</a-timeline-item>
          </a-timeline>
          <h3>评论</h3>
          <div class="comment-list">
            <div v-for="comment in comments" :key="comment.id" class="comment-item"><b>{{ comment.author }}</b><small>{{ comment.time }}</small><div class="comment-item__content" v-html="comment.content"></div></div>
          </div>
          <div class="comment-rich-editor">
            <Toolbar :editor="commentEditorRef" :default-config="toolbarConfig" mode="default" />
            <Editor v-model="commentContent" :default-config="commentEditorConfig" mode="default" @on-created="handleCommentEditorCreated" />
          </div>
          <div class="send-row"><a-button type="primary" @click="handleSendComment">发送</a-button></div>
        </section>
          <div class="detail-actions"><a-button type="primary" @click="assignVisible = true">指派</a-button><a-button type="primary" @click="handleCloseBug">关闭</a-button></div>
        </div>
      </div>
    </template>

    <a-modal v-model:open="assignVisible" title="更换Bug指定人" :confirm-loading="assignLoading" ok-text="确认" cancel-text="取消" @ok="handleAssign">
      <a-form :model="assignState" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <a-form-item label="指派给"><a-select v-model:value="assignState.assignee" :options="personOptions" placeholder="请选择指定人" /></a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="assignState.remark" :rows="5" placeholder="请输入备注" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ArrowLeftOutlined, PaperClipOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const createBugs = () => [
  { id: 1, code: 'BUG-2026-00102', title: '用户登录页面异常报错', project: 'XX企业数字化管理系统', severity: '严重', status: '已提交', assignee: '张三', creator: '李四', createdAt: '2026-06-10', task: '登录模块开发', description: '在Chrome浏览器下登录页面出现500错误，其他浏览器正常', steps: '1. 打开登录页  2. 输入用户名密码  3. 点击登录按钮 → 控制台报错 500' },
  { id: 2, code: 'BUG-2026-00105', title: '数据显示错误-订单金额计算', project: 'YY电子商务平台建设', severity: '致命', status: '已确认', assignee: '王五', creator: '李四', createdAt: '2026-06-11', task: '订单结算开发', description: '订单金额在部分优惠场景下计算错误', steps: '1. 创建优惠订单  2. 进入结算页  3. 查看订单金额' },
  { id: 3, code: 'BUG-2026-00108', title: '报表导出功能失败', project: 'ZZ数据中台项目', severity: '一般', status: '已完成', assignee: '李四', creator: '张三', createdAt: '2026-06-12', task: '报表功能开发', description: '报表导出后文件无法打开', steps: '1. 进入报表页  2. 点击导出  3. 打开导出文件' },
  { id: 4, code: 'BUG-2026-00110', title: '页面加载速度过慢', project: 'YY电子商务平台建设', severity: '轻微', status: '已关闭', assignee: '赵六', creator: '王五', createdAt: '2026-06-13', task: '性能优化', description: '商品列表首次加载时间过长', steps: '1. 清空缓存  2. 打开商品列表  3. 记录加载时间' },
  { id: 5, code: 'BUG-2026-00112', title: '移动端按钮显示错位', project: 'XX企业数字化管理系统', severity: '一般', status: '已提交', assignee: '张三', creator: '王五', createdAt: '2026-06-14', task: '移动端适配', description: '移动端操作按钮显示错位', steps: '1. 使用移动端打开详情页  2. 查看底部操作按钮' },
  { id: 6, code: 'BUG-2026-00115', title: '搜索条件重置后未刷新', project: 'ZZ数据中台项目', severity: '轻微', status: '已确认', assignee: '李四', creator: '赵六', createdAt: '2026-06-15', task: '搜索功能开发', description: '重置搜索条件后列表未刷新', steps: '1. 输入查询条件  2. 点击查询  3. 点击重置' },
]

const bugs = ref(createBugs())
const route = useRoute()
const router = useRouter()
const viewMode = computed(() => route.meta.bugView || 'list')
const selectedBug = ref(null)
const editingId = ref(null)
const submitLoading = ref(false)
const assignVisible = ref(false)
const assignLoading = ref(false)
const formRef = ref()
const fileList = ref([])
const displayMode = ref('list')
const groupField = ref('project')
const commentContent = ref('')
const comments = ref([
  { id: 1, author: '李四', time: '2026-06-10 16:00', content: '请确认是否在Firefox下也有此问题？' },
  { id: 2, author: '张三', time: '2026-06-10 17:00', content: 'Firefox下正常，仅Chrome有此问题。已定位到是Chrome新版本的CORS策略变更导致，正在修复中。' },
])
const editorRef = shallowRef()
const commentEditorRef = shallowRef()
const toolbarConfig = {}
const editorConfig = { placeholder: '请输入重现步骤', scroll: true }
const commentEditorConfig = { placeholder: '请输入评论内容', scroll: true }

const handleEditorCreated = editor => {
  editorRef.value = editor
}

const handleCommentEditorCreated = editor => {
  commentEditorRef.value = editor
}

onBeforeUnmount(() => {
  editorRef.value?.destroy()
  commentEditorRef.value?.destroy()
})

const createDefaultFormState = () => ({ title: '', project: undefined, task: undefined, assignee: undefined, severity: '致命', status: '已提交', description: '', steps: '' })
const formState = reactive(createDefaultFormState())
const queryParams = reactive({ keyword: '', project: '全部', severity: '全部', status: '全部', creator: '全部', assignee: '全部' })
const appliedQuery = reactive({ ...queryParams })
const assignState = reactive({ assignee: undefined, remark: '' })

const toOptions = values => values.map(value => ({ label: value, value }))
const projectOptions = toOptions(['XX企业数字化管理系统', 'YY电子商务平台建设', 'ZZ数据中台项目'])
const taskOptions = toOptions(['登录模块开发', '订单结算开发', '报表功能开发', '性能优化', '移动端适配', '搜索功能开发'])
const personOptions = toOptions(['张三', '李四', '王五', '赵六'])
const severityOptions = toOptions(['致命', '严重', '一般', '轻微'])
const statusOptions = toOptions(['已提交', '已确认', '已完成', '已关闭'])
const projectFilterOptions = toOptions(['全部', ...projectOptions.map(item => item.value)])
const personFilterOptions = toOptions(['全部', ...personOptions.map(item => item.value)])
const severityFilterOptions = toOptions(['全部', ...severityOptions.map(item => item.value)])
const statusFilterOptions = toOptions(['全部', ...statusOptions.map(item => item.value)])
const groupOptions = [{ label: '所属项目', value: 'project' }, { label: '严重等级', value: 'severity' }, { label: '状态', value: 'status' }]
const severityColors = { 致命: 'red', 严重: 'error', 一般: 'orange', 轻微: 'blue' }
const statusColors = { 已提交: 'gold', 已确认: 'orange', 已完成: 'purple', 已关闭: 'green' }

const columns = [
  { title: '序号', dataIndex: 'index', width: 60, fixed: 'left' }, { title: 'Bug编号', dataIndex: 'code', width: 145 },
  { title: 'Bug标题', dataIndex: 'title', width: 240 }, { title: '所属项目', dataIndex: 'project', width: 210 },
  { title: '严重等级', dataIndex: 'severity', width: 110 }, { title: '状态', dataIndex: 'status', width: 110 },
  { title: '指定人', dataIndex: 'assignee', width: 90 }, { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 120 }, { title: '操作', dataIndex: 'operation', width: 120, fixed: 'right' },
]
const pagination = { defaultPageSize: 10, pageSizeOptions: ['10', '50', '100'], showSizeChanger: true, showTotal: total => `共 ${total} 条` }
const formRules = {
  title: [{ required: true, message: '请输入Bug标题', trigger: 'blur' }], project: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  assignee: [{ required: true, message: '请选择指定人', trigger: 'change' }], severity: [{ required: true, message: '请选择严重等级', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }], description: [{ required: true, message: '请输入问题描述', trigger: 'blur' }],
}

const filteredBugs = computed(() => bugs.value.filter(item => {
  const matchesKeyword = !appliedQuery.keyword || `${item.code}${item.title}`.toLowerCase().includes(appliedQuery.keyword.toLowerCase())
  return matchesKeyword && ['project', 'severity', 'status', 'creator', 'assignee'].every(key => appliedQuery[key] === '全部' || item[key] === appliedQuery[key])
}))

const syncRouteState = () => {
  if (viewMode.value === 'create') {
    Object.assign(formState, createDefaultFormState())
    editingId.value = null
    fileList.value = []
    return
  }

  const routeBug = bugs.value.find(item => item.id === Number(route.params.id))
  if (!routeBug) {
    return
  }

  if (viewMode.value === 'edit') {
    Object.assign(formState, routeBug)
    editingId.value = routeBug.id
    fileList.value = []
    return
  }

  if (viewMode.value === 'detail') {
    selectedBug.value = routeBug
  }
}

watch(() => [route.name, route.params.id], syncRouteState, { immediate: true })

const handleSearch = () => Object.assign(appliedQuery, queryParams)
const handleReset = () => { Object.assign(queryParams, { keyword: '', project: '全部', severity: '全部', status: '全部', creator: '全部', assignee: '全部' }); Object.assign(appliedQuery, queryParams) }
const handleCreate = () => router.push({ name: 'BugCreate' })
const handleEdit = record => router.push({ name: 'BugEdit', params: { id: record.id } })
const handleDetail = record => router.push({ name: 'BugDetail', params: { id: record.id } })
const handleBack = () => router.push({ name: 'BugList' })
const handleBeforeUpload = file => { fileList.value = [...fileList.value, file]; return false }
const handleSubmit = async () => {
  if (submitLoading.value) return
  await formRef.value?.validate()
  submitLoading.value = true
  try {
    if (editingId.value) {
      const index = bugs.value.findIndex(item => item.id === editingId.value)
      bugs.value[index] = { ...bugs.value[index], ...formState }
      message.success('Bug编辑成功')
    } else {
      const nextId = Math.max(...bugs.value.map(item => item.id)) + 1
      bugs.value.unshift({ ...formState, id: nextId, code: `BUG-2026-${String(115 + nextId).padStart(5, '0')}`, creator: '张三', createdAt: '2026-07-07' })
      message.success('Bug新增成功')
    }
    handleBack()
  } finally { submitLoading.value = false }
}
const handleAssign = async () => {
  if (!assignState.assignee) { message.warning('请选择指定人'); return }
  assignLoading.value = true
  try { selectedBug.value.assignee = assignState.assignee; assignVisible.value = false; assignState.remark = ''; message.success('指定人更换成功') } finally { assignLoading.value = false }
}
const handleCloseBug = () => { selectedBug.value.status = '已关闭'; message.success('Bug已关闭') }
const handleSendComment = () => {
  if (!commentEditorRef.value || commentEditorRef.value.isEmpty()) { message.warning('请输入评论内容'); return }
  comments.value.push({ id: Date.now(), author: '张三', time: '2026-07-07 10:00', content: commentContent.value.trim() }); commentContent.value = ''; message.success('评论发送成功')
}
const handleDownload = fileName => message.info(`${fileName} 为原型附件`)
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
.bug-project-link { color: #1677ff; }
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
.attachment-row { display: flex; gap: 36px; margin: 10px 0; }
.repair-timeline { margin: 8px 0 38px; }
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
