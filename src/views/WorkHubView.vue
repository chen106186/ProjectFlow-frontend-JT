<template>
  <section class="workhub-page">
    <a-card :bordered="false">
      <div class="workhub-heading">
        <div><h2>项目工作台</h2><p>交付范围、当前阻塞和最近动态集中查看</p></div>
        <div class="workhub-project-control">
          <span>当前项目</span>
          <a-select v-model:value="projectId" show-search option-filter-prop="label" :options="projectOptions"
            placeholder="选择项目" class="workhub-project-select" @change="changeProject">
            <template #option="option"><div class="workhub-option"><span>{{ option.label }}</span><small>{{ option.description }}</small></div></template>
          </a-select>
        </div>
      </div>
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="overview" tab="项目概览">
          <a-empty v-if="!projectId" description="请选择项目" />
          <a-spin v-else :spinning="loading">
            <div class="workhub-stats">
              <div v-for="stat in stats" :key="stat.key" class="workhub-stat"><small>{{ stat.label }}</small><strong>{{ overview.counts?.[stat.key] || 0 }}</strong></div>
            </div>
            <a-alert v-if="overview.counts?.blockedTasks || overview.counts?.openBugs" type="warning" show-icon
              :message="`当前有 ${overview.counts?.blockedTasks || 0} 个阻塞任务、${overview.counts?.openBugs || 0} 个未关闭 Bug`" style="margin-bottom: 18px" />
            <div class="workhub-grid">
              <a-card title="最近需求" size="small"><template #extra><a-button type="link" @click="openList('requirements')">查看全部</a-button></template>
                <a-list :data-source="(overview.requirements || []).slice(0, 5)" size="small">
                  <template #renderItem="{ item }"><a-list-item><a-button type="link" @click="openItem('REQUIREMENT', item.id)">#{{ item.requirementNo }} {{ item.title }}</a-button><a-tag>{{ item.status }}</a-tag></a-list-item></template>
                </a-list>
              </a-card>
              <a-card title="最近任务" size="small"><template #extra><a-button type="link" @click="openList('tasks')">查看全部</a-button></template>
                <a-list :data-source="(overview.tasks || []).slice(0, 5)" size="small">
                  <template #renderItem="{ item }"><a-list-item><a-button type="link" @click="openItem('TASK', item.id)">{{ item.name }}</a-button><a-tag :color="item.blockerReason ? 'red' : 'default'">{{ item.blockerReason ? '阻塞' : item.status }}</a-tag></a-list-item></template>
                </a-list>
              </a-card>
              <a-card title="最近 Bug" size="small" class="workhub-panel"><template #extra><a-button type="link" @click="openList('bugs')">查看全部</a-button></template>
                <a-list :data-source="overview.bugs || []" size="small" class="workhub-recent-list">
                  <template #renderItem="{ item }"><a-list-item>
                    <button class="workhub-item-link" type="button" :title="item.title" @click="openItem('BUG', item.id)"><span class="workhub-item-no">#{{ item.bugNo }}</span><span class="workhub-item-title">{{ item.title }}</span></button>
                    <a-tag :color="bugStatusColors[item.status] || 'default'" class="workhub-status">{{ bugStatusLabels[item.status] || item.status }}</a-tag>
                  </a-list-item></template>
                </a-list>
                <a-pagination v-if="bugTotal > pageSize" class="workhub-panel-pagination" size="small" :current="bugPage" :page-size="pageSize" :total="bugTotal" :show-size-changer="false" @change="changeBugPage" />
              </a-card>
              <a-card title="附件与动态" size="small" class="workhub-panel">
                <div class="workhub-file-summary"><span>关联项目附件 <strong>{{ overview.counts?.files || 0 }}</strong> 个</span><a-button type="link" @click="openProject">打开项目</a-button></div>
                <a-tabs v-model:activeKey="infoTab" size="small">
                  <a-tab-pane key="files" tab="附件">
                    <a-empty v-if="!overview.files?.length" description="暂无附件" :image-style="{ height: '44px' }" />
                    <div v-for="file in overview.files || []" :key="file.id" class="workhub-file">
                      <button type="button" :title="file.originalName" @click="downloadFile(file)">{{ file.originalName }}</button>
                      <small>{{ formatDateTime(file.uploadedAt) }}</small>
                    </div>
                    <a-pagination v-if="fileTotal > pageSize" class="workhub-panel-pagination" size="small" :current="filePage" :page-size="pageSize" :total="fileTotal" :show-size-changer="false" @change="changeFilePage" />
                  </a-tab-pane>
                  <a-tab-pane key="activity" tab="动态">
                    <a-empty v-if="!overview.activity?.length" description="暂无动态" :image-style="{ height: '44px' }" />
                    <div v-for="entry in overview.activity || []" :key="entry.id" class="workhub-activity">
                      <span class="workhub-activity__dot"></span>
                      <div><span class="workhub-activity__operator">{{ entry.operatorName || '系统' }}</span><span class="workhub-activity__text" :title="entry.content">{{ entry.content }}</span><small>{{ formatDateTime(entry.createdAt) }}</small></div>
                    </div>
                    <a-pagination v-if="activityTotal > pageSize" class="workhub-panel-pagination" size="small" :current="activityPage" :page-size="pageSize" :total="activityTotal" :show-size-changer="false" @change="changeActivityPage" />
                  </a-tab-pane>
                </a-tabs>
              </a-card>
            </div>
          </a-spin>
        </a-tab-pane>
        <a-tab-pane key="releases" tab="交付版本">
          <a-empty v-if="!projectId" description="请选择项目" />
          <template v-else>
            <div class="workhub-toolbar"><p>版本就绪条件：纳入的需求验收通过、任务完成、无任务阻塞和未关闭的关联 Bug。</p>
              <a-button v-if="canManageProject" type="primary" @click="openRelease()">新建交付版本</a-button></div>
            <a-table :data-source="overview.releases || []" :columns="releaseColumns" row-key="id" :pagination="false">
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'status'"><a-tag :color="record.status === 'RELEASED' ? 'green' : record.ready ? 'blue' : 'orange'">{{ releaseStatus[record.status] || record.status }}</a-tag></template>
                <template v-else-if="column.dataIndex === 'scope'">{{ record.requirements?.length || 0 }} 项需求 / {{ record.tasks?.length || 0 }} 项任务</template>
                <template v-else-if="column.dataIndex === 'ready'"><a-tag :color="record.ready ? 'green' : 'red'">{{ record.ready ? '可交付' : '待处理' }}</a-tag>未关闭 Bug {{ record.openBugCount || 0 }}<span v-if="record.invalidLinkedTaskCount"> · 异常关联任务 {{ record.invalidLinkedTaskCount }}</span></template>
                <template v-else-if="column.dataIndex === 'operation'"><a-space>
                  <a-button type="link" @click="router.push({ name: 'IterationDetail', params: { id: record.id } })">迭代档案</a-button>
                  <a-button v-if="canManageRelease(record) && record.status !== 'RELEASED'" type="link" @click="openRelease(record)">编辑范围</a-button>
                </a-space></template>
              </template>
              <template #expandedRowRender="{ record }">
                <div class="release-checklist">
                  <strong>需求验收清单</strong>
                  <a-empty v-if="!record.requirements?.length" description="未纳入需求" :image-style="{ height: '32px' }" />
                  <p v-for="item in record.requirements || []" :key="`requirement-${item.id}`">
                    {{ item.title }} <a-tag :color="item.status === 'ACCEPTED' && item.acceptanceResult === 'PASSED' ? 'green' : 'red'">{{ item.acceptanceResult }}</a-tag>
                  </p>
                  <strong>任务完成清单</strong>
                  <a-empty v-if="!record.tasks?.length" description="未纳入任务" :image-style="{ height: '32px' }" />
                  <p v-for="item in record.tasks || []" :key="`task-${item.id}`">
                    {{ item.name }} <a-tag :color="item.status === 'COMPLETED' && !item.blockerReason ? 'green' : 'red'">{{ item.blockerReason ? '阻塞' : item.status }}</a-tag>
                  </p>
                  <p v-if="record.invalidLinkedTaskCount">有 {{ record.invalidLinkedTaskCount }} 个关联任务未完成、已删除或不存在，需到需求页调整关联。</p>
                  <p>未关闭的关联 Bug：{{ record.openBugCount || 0 }}</p>
                  <p v-if="record.acceptanceNote">发布验收说明：{{ record.acceptanceNote }}</p>
                </div>
              </template>
            </a-table>
          </template>
        </a-tab-pane>
        <a-tab-pane key="all" :tab="allTitle">
          <a-table :data-source="allRows" :columns="allColumns" row-key="id" :loading="allLoading" :pagination="{ pageSize: 20 }">
            <template #bodyCell="{ column, record }">
              <a-button v-if="column.dataIndex === 'title'" type="link" @click="openItem(allType, record.id)">{{ record.title || record.name }}</a-button>
              <a-tag v-else-if="column.dataIndex === 'status'" :color="allType === 'BUG' ? bugStatusColors[record.status] : 'default'">{{ allType === 'BUG' ? (bugStatusLabels[record.status] || record.status) : record.status }}</a-tag>
            </template>
          </a-table>
        </a-tab-pane>
        <a-tab-pane key="search" tab="快速查找">
          <div class="workhub-search"><a-input v-model:value="searchText" allow-clear placeholder="输入需求、任务、Bug 的标题或编号" @press-enter="search" /><a-button type="primary" :loading="searching" @click="search">搜索</a-button></div>
          <a-table :data-source="searchResults" :columns="searchColumns" row-key="key" :loading="searching" :pagination="{ pageSize: 20 }">
            <template #bodyCell="{ column, record }">
              <a-button v-if="column.dataIndex === 'title'" type="link" @click="openItem(record.type, record.id)">{{ record.title }}</a-button>
              <span v-else-if="column.dataIndex === 'type'">{{ { REQUIREMENT: '需求', TASK: '任务', BUG: 'Bug' }[record.type] }}</span>
              <a-tag v-else-if="column.dataIndex === 'status'" :color="record.type === 'BUG' ? bugStatusColors[record.status] : 'default'">{{ record.type === 'BUG' ? (bugStatusLabels[record.status] || record.status) : record.status }}</a-tag>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <a-modal v-model:open="releaseVisible" :title="releaseForm.id ? '编辑交付版本' : '新建交付版本'" width="680px" :confirm-loading="releaseSaving" @ok="saveRelease">
      <a-form layout="vertical">
        <a-form-item label="版本名称" required><a-input v-model:value="releaseForm.name" :maxlength="160" placeholder="例如 2026 年 11 月交付" /></a-form-item>
        <a-form-item label="计划交付日期" required><a-date-picker v-model:value="releaseForm.targetDate" value-format="YYYY-MM-DD" style="width: 100%" /></a-form-item>
        <a-form-item label="纳入需求"><a-select v-model:value="releaseForm.requirementIds" mode="multiple" show-search option-filter-prop="label" :options="requirementOptions" placeholder="选择本次交付的需求" /></a-form-item>
        <a-form-item label="纳入任务"><a-select v-model:value="releaseForm.taskIds" mode="multiple" show-search option-filter-prop="label" :options="taskOptions" placeholder="选择本次交付的任务" /></a-form-item>
        <a-form-item label="状态"><a-select v-model:value="releaseForm.status" :options="availableReleaseStatuses" /></a-form-item>
        <a-form-item label="发布验收说明"><a-textarea v-model:value="releaseForm.acceptanceNote" :rows="3" :maxlength="4000" placeholder="发布时必填：记录验收依据、上线范围和处理人" /></a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup>
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadProjectFile, getProjectBugs, getProjectList, getProjectTasks } from '@/api/managementProject'
import { listRequirements } from '@/api/requirements'
import { createRelease, getProjectOverview, searchWork, updateRelease } from '@/api/workhub'
import { getStoredProfile, isAdminProfile } from '@/utils/authScope'
import { formatDateTime } from '@/utils/dateTime'
import { fetchAllPages } from '@/utils/pagination'
import { deliveryProjectIds } from '@/utils/deliveryProjects'
import { workhubProjectOptions, workhubRootProjectId } from '@/utils/workhubProjects'

const route = useRoute()
const router = useRouter()
const profile = getStoredProfile()
const projects = ref([])
const projectId = ref(route.query.projectId ? String(route.query.projectId) : undefined)
const activeTab = ref(route.query.tab === 'releases' ? 'releases' : 'overview')
const overview = ref({ counts: {}, requirements: [], tasks: [], bugs: [], files: [], releases: [], activity: [] })
const bugTotal = computed(() => Number(overview.value.counts?.bugs) || 0)
const fileTotal = computed(() => Number(overview.value.counts?.files) || 0)
const activityTotal = computed(() => Number(overview.value.activityTotal) || 0)
const loading = ref(false)
let latestLoad = 0
const pageSize = 8
const bugPage = ref(1)
const filePage = ref(1)
const activityPage = ref(1)
const infoTab = ref('activity')
const searchText = ref('')
const searchResults = ref([])
const searching = ref(false)
const allRows = ref([])
const allLoading = ref(false)
const allKind = ref('tasks')
const allType = computed(() => ({ requirements: 'REQUIREMENT', tasks: 'TASK', bugs: 'BUG' }[allKind.value]))
const allTitle = computed(() => ({ requirements: '全部需求', tasks: '全部任务', bugs: '全部 Bug' }[allKind.value]))
const allColumns = computed(() => [
  { title: '标题', dataIndex: 'title' }, { title: '状态', dataIndex: 'status', width: 130 },
  { title: '优先级', dataIndex: 'priority', width: 100 }, { title: '项目', dataIndex: 'projectName', width: 180 },
])
const releaseVisible = ref(false)
const releaseSaving = ref(false)
const requirementOptions = ref([])
const taskOptions = ref([])
const releaseForm = reactive({ id: null, projectId: undefined, name: '', targetDate: undefined, status: 'PLANNED', acceptanceNote: '', requirementIds: [], taskIds: [] })
const projectOptions = computed(() => workhubProjectOptions(projects.value))
const selectedProject = computed(() => projects.value.find(project => String(project.id) === String(projectId.value)))
const canManage = project => {
  if (!project || !profile.id) return false
  return isAdminProfile(profile) || String(project.managerId) === String(profile.id)
    || String(project.createdBy) === String(profile.id)
    || String(project.coManagerIds || '').split(',').map(value => value.trim()).includes(String(profile.id))
}
const canManageProject = computed(() => canManage(selectedProject.value))
const canManageRelease = release => canManage(projects.value.find(project => String(project.id) === String(release.projectId)))
const stats = [
  { key: 'requirements', label: '需求' }, { key: 'tasks', label: '任务' }, { key: 'bugs', label: 'Bug' },
  { key: 'blockedTasks', label: '阻塞任务' }, { key: 'overdueTasks', label: '逾期任务' }, { key: 'files', label: '项目附件' },
]
const releaseStatus = { PLANNED: '计划中', READY: '已就绪', RELEASED: '已发布', CANCELLED: '已取消' }
const bugStatusLabels = { PENDING_FIX: '待修复', FIXING: '修复中', PENDING_VERIFY: '待验证', CLOSED: '已关闭' }
const bugStatusColors = { PENDING_FIX: 'gold', FIXING: 'orange', PENDING_VERIFY: 'purple', CLOSED: 'green' }
const releaseStatusOptions = Object.entries(releaseStatus).map(([value, label]) => ({ value, label }))
const availableReleaseStatuses = computed(() => releaseStatusOptions.filter(option =>
  option.value !== 'RELEASED' || (releaseForm.id && overview.value.releases?.some(item => item.id === releaseForm.id && item.status === 'READY'))))
const releaseColumns = [
  { title: '版本', dataIndex: 'name' }, { title: '计划交付', dataIndex: 'targetDate', width: 120 },
  { title: '范围', dataIndex: 'scope', width: 180 }, { title: '就绪检查', dataIndex: 'ready', width: 190 },
  { title: '状态', dataIndex: 'status', width: 120 }, { title: '操作', dataIndex: 'operation', width: 200 },
]
const searchColumns = [
  { title: '类型', dataIndex: 'type', width: 100 }, { title: '编号', dataIndex: 'number', width: 110 },
  { title: '标题', dataIndex: 'title' }, { title: '状态', dataIndex: 'status', width: 130 },
]

const load = async () => {
  if (!projectId.value) return
  const requestId = ++latestLoad
  loading.value = true
  try {
    const result = await getProjectOverview(projectId.value, { bugPage: bugPage.value, filePage: filePage.value, activityPage: activityPage.value })
    if (requestId === latestLoad) overview.value = result
  } catch (error) { if (requestId === latestLoad) message.error(error.message || '项目工作台加载失败') }
  finally { if (requestId === latestLoad) loading.value = false }
}
fetchAllPages(getProjectList).then(items => {
  projects.value = items
  if (projectId.value) {
    const rootId = workhubRootProjectId(items, projectId.value)
    if (rootId !== projectId.value) {
      projectId.value = rootId
      router.replace({ name: 'WorkHub', query: { ...route.query, projectId: rootId } })
    }
    load()
  }
})
  .catch(error => message.error(error.message || '项目列表加载失败'))
const changeProject = id => {
  activeTab.value = 'overview'
  allRows.value = []
  bugPage.value = 1
  filePage.value = 1
  activityPage.value = 1
  router.replace({ name: 'WorkHub', query: { projectId: id } })
  load()
}
watch(() => route.query.projectId, value => {
  const next = value ? workhubRootProjectId(projects.value, value) : undefined
  if (next !== projectId.value) { projectId.value = next; bugPage.value = 1; filePage.value = 1; activityPage.value = 1; load() }
})
const changeBugPage = page => { bugPage.value = page; load() }
const changeFilePage = page => { filePage.value = page; load() }
const changeActivityPage = page => { activityPage.value = page; load() }
const downloadFile = async file => {
  try {
    const result = await downloadProjectFile(file.id)
    const url = URL.createObjectURL(result.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.fileName || file.originalName
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) { message.error(error.message || '附件下载失败') }
}
const openItem = (type, id) => router.push({ name: { REQUIREMENT: 'PersonalRequirementDetail', TASK: 'AllTaskDetail', BUG: 'BugDetail' }[type], params: { id } })
const openList = async kind => {
  allKind.value = kind
  activeTab.value = 'all'
  allLoading.value = true
  allRows.value = []
  const fetcher = { requirements: listRequirements, tasks: getProjectTasks, bugs: getProjectBugs }[kind]
  try {
    const ids = deliveryProjectIds(projects.value, projectId.value)
    const pages = await Promise.all(ids.map(id => fetchAllPages(fetcher, { projectId: id })))
    allRows.value = pages.flat()
  } catch (error) { message.error(error.message || '完整列表加载失败') }
  finally { allLoading.value = false }
}
const openProject = () => router.push({ name: selectedProject.value?.projectType === 'EXECUTION' ? 'ExecutionProjectDetail' : 'ManagementProjectDetail', params: { id: projectId.value } })
const search = async () => {
  if (!searchText.value.trim()) { searchResults.value = []; return }
  searching.value = true
  try { searchResults.value = (await searchWork(searchText.value.trim())).map(item => ({ ...item, key: `${item.type}-${item.id}` })) }
  catch (error) { message.error(error.message || '搜索失败') }
  finally { searching.value = false }
}
const loadReleaseOptions = async () => {
  const ids = deliveryProjectIds(projects.value, projectId.value)
  const [requirements, tasks] = await Promise.all([
    Promise.all(ids.map(id => fetchAllPages(listRequirements, { projectId: id }))),
    Promise.all(ids.map(id => fetchAllPages(getProjectTasks, { projectId: id }))),
  ])
  requirementOptions.value = requirements.flat().map(item => ({ value: item.id, label: `${item.projectName || item.projectId} · ${item.requirementNo || item.id} · ${item.title}` }))
  taskOptions.value = tasks.flat().map(item => ({ value: item.id, label: `${item.projectName || item.projectId} · ${item.name}` }))
}
const openRelease = async record => {
  try { await loadReleaseOptions() }
  catch (error) { message.error(error.message || '交付范围加载失败'); return }
  Object.assign(releaseForm, {
    id: record?.id || null, projectId: record?.projectId || projectId.value, name: record?.name || '', targetDate: record?.targetDate || undefined,
    status: record?.status || 'PLANNED', acceptanceNote: record?.acceptanceNote || '',
    requirementIds: record?.selectedRequirementIds || [], taskIds: record?.selectedTaskIds || [],
  })
  releaseVisible.value = true
}
const saveRelease = async () => {
  if (!releaseForm.name.trim() || !releaseForm.targetDate) { message.warning('请填写版本名称和计划交付日期'); return }
  if (!releaseForm.requirementIds.length && !releaseForm.taskIds.length) { message.warning('请选择至少一项需求或任务'); return }
  releaseSaving.value = true
  try {
    const body = { projectId: releaseForm.projectId, name: releaseForm.name.trim(), targetDate: releaseForm.targetDate,
      status: releaseForm.status, acceptanceNote: releaseForm.acceptanceNote,
      requirementIds: releaseForm.requirementIds, taskIds: releaseForm.taskIds }
    if (releaseForm.id) await updateRelease(releaseForm.id, body)
    else await createRelease(body)
    releaseVisible.value = false
    await load()
    message.success('交付版本已保存')
  } catch (error) { message.error(error.message || '交付版本保存失败') }
  finally { releaseSaving.value = false }
}
</script>

<style scoped>
.workhub-page { padding: 20px; }
.workhub-heading, .workhub-toolbar { display: flex; justify-content: space-between; gap: 20px; align-items: center; flex-wrap: wrap; }
.workhub-project-control { display: flex; align-items: center; gap: 12px; min-width: min(100%, 380px); }
.workhub-project-control > span { flex: none; color: #667085; font-size: 13px; }
.workhub-project-select { flex: 1; min-width: 0; }
.workhub-project-select :deep(.ant-select-selector) { min-height: 38px; align-items: center; }
.workhub-project-select :deep(.ant-select-selection-item) { font-weight: 600; }
.workhub-option { display: flex; justify-content: space-between; gap: 12px; }
.workhub-option small { color: #98a2b3; }
.workhub-heading h2 { margin: 0; }
.workhub-heading p, .workhub-toolbar p { color: #7d8795; margin: 4px 0 0; }
.workhub-stats { display: grid; grid-template-columns: repeat(6, minmax(110px, 1fr)); gap: 12px; margin: 12px 0 18px; }
.workhub-stat { border: 1px solid #edf0f4; border-radius: 8px; padding: 14px; }
.workhub-stat small { display: block; color: #7d8795; }
.workhub-stat strong { font-size: 25px; }
.workhub-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.workhub-grid :deep(.ant-list-item) { min-width: 0; }
.workhub-grid :deep(.ant-list-item .ant-btn) { max-width: 80%; overflow: hidden; text-overflow: ellipsis; text-align: left; }
.workhub-panel { min-width: 0; }
.workhub-recent-list :deep(.ant-list-item) { display: flex; gap: 12px; min-height: 52px; }
.workhub-item-link { display: flex; align-items: center; min-width: 0; flex: 1; gap: 9px; padding: 0; border: 0; background: transparent; color: #263445; cursor: pointer; text-align: left; }
.workhub-item-link:hover .workhub-item-title { color: #1677ff; }
.workhub-item-no { flex: none; color: #7a8ba2; font-size: 12px; }
.workhub-item-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color .2s; }
.workhub-status { flex: none; margin: 0; }
.workhub-panel-pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
.workhub-file-summary { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-bottom: 8px; margin-bottom: 4px; border-bottom: 1px solid #eef1f4; color: #667085; }
.workhub-file-summary strong { color: #263445; }
.workhub-file { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; padding: 11px 0; border-bottom: 1px solid #f1f3f6; }
.workhub-file button { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; padding: 0; border: 0; background: transparent; color: #344054; cursor: pointer; text-align: left; }
.workhub-file button:hover { color: #1677ff; }
.workhub-file small { flex: none; color: #98a2b3; }
.workhub-activity { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f3f6; }
.workhub-activity__dot { width: 7px; height: 7px; flex: none; margin-top: 8px; border-radius: 50%; background: #b8c8dc; }
.workhub-activity > div { display: flex; flex-wrap: wrap; gap: 4px 8px; min-width: 0; }
.workhub-activity__operator { flex: none; font-weight: 600; color: #344054; }
.workhub-activity__text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #475467; }
.workhub-activity small { width: 100%; color: #98a2b3; }
.workhub-search { display: flex; width: min(100%, 760px); gap: 12px; margin: 12px 0 18px; }
.workhub-search :deep(.ant-input) { flex: 1; min-width: 0; }
.workhub-search > .ant-btn { flex: none; min-width: 82px; }
.release-checklist { padding: 4px 12px; }
.release-checklist strong { display: block; margin: 8px 0; }
.release-checklist p { margin: 6px 0; }
@media (max-width: 1050px) { .workhub-stats { grid-template-columns: repeat(3, 1fr); } .workhub-grid { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .workhub-page { padding: 12px; } .workhub-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .workhub-project-control { width: 100%; } }
</style>
