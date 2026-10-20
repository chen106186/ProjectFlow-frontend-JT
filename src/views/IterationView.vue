<template>
  <section class="iteration-page">
    <a-spin :spinning="loading">
      <a-card :bordered="false" class="iteration-header">
        <a-button type="link" @click="router.push({ name: 'WorkHub', query: { projectId: release.projectId, tab: 'releases' } })">← 返回项目工作台</a-button>
        <div class="iteration-heading">
          <div><h2>{{ release.name || '版本迭代档案' }}</h2><p>计划上线 {{ release.targetDate || '-' }} · 所有阶段、决定与凭证持续留痕</p></div>
          <a-space><a-tag :color="release.ready ? 'green' : 'orange'">{{ release.ready ? '交付检查通过' : '交付检查待处理' }}</a-tag><a-tag>{{ releaseStatus[release.status] || release.status }}</a-tag></a-space>
        </div>
        <a-alert v-if="release.openBugCount || release.invalidLinkedTaskCount" type="warning" show-icon
          :message="`未关闭 Bug ${release.openBugCount || 0} 个，异常关联任务 ${release.invalidLinkedTaskCount || 0} 个`" />
      </a-card>

      <a-card :bordered="false" title="本期交付范围">
        <div class="iteration-scope">
          <div><strong>纳入需求（{{ release.requirements?.length || 0 }}）</strong>
            <p v-for="item in release.requirements || []" :key="item.id">
              <a-button type="link" @click="router.push({ name: 'PersonalRequirementDetail', params: { id: item.id } })">#{{ item.requirementNo }} {{ item.title }}</a-button>
              <a-tag :color="item.acceptanceResult === 'PASSED' ? 'green' : 'orange'">{{ item.acceptanceResult === 'PASSED' ? '已验收' : '待验收' }}</a-tag>
            </p><a-empty v-if="!release.requirements?.length" description="本期未纳入需求" :image-style="{ height: '32px' }" />
          </div>
          <div><strong>关联任务（{{ release.tasks?.length || 0 }}）</strong>
            <p v-for="item in release.tasks || []" :key="item.id">
              <a-button type="link" @click="router.push({ name: 'AllTaskDetail', params: { id: item.id } })">{{ item.name }}</a-button>
              <a-tag :color="item.status === 'COMPLETED' && !item.blockerReason ? 'green' : 'orange'">{{ item.status }}</a-tag>
            </p><a-empty v-if="!release.tasks?.length" description="本期未纳入任务" :image-style="{ height: '32px' }" />
          </div>
        </div>
      </a-card>

      <div class="iteration-layout">
        <a-card :bordered="false" title="迭代阶段" class="iteration-sidebar">
          <button v-for="stage in stages" :key="stage.stageCode" class="iteration-step"
            :class="{ selected: selectedCode === stage.stageCode }" @click="selectStage(stage.stageCode)">
            <span class="iteration-step__number">{{ stage.step }}</span>
            <span><strong>{{ stage.label }}</strong><small>{{ stage.ownerId ? memberName(stage.ownerId) : '待指定负责人' }}</small></span>
            <a-tag :color="stageColor(stage.status)">{{ stageStatus[stage.status] }}</a-tag>
          </button>
        </a-card>

        <div class="iteration-main">
          <a-card :bordered="false" :title="`${selectedStage?.step || ''}. ${selectedStage?.label || '阶段记录'}`">
            <p class="iteration-tip">{{ stageGuidance[selectedCode] }}</p>
            <a-form layout="vertical" class="iteration-form">
              <a-form-item label="责任人"><a-select v-model:value="stageForm.ownerId" show-search allow-clear option-filter-prop="label" :options="memberOptions" :disabled="!canManage" placeholder="指定本阶段负责人" /></a-form-item>
              <a-form-item label="阶段状态"><a-select v-model:value="stageForm.status" :options="stageStatusOptions" :disabled="!canEditStage" /></a-form-item>
              <a-form-item label="计划开始"><a-date-picker v-model:value="stageForm.plannedStart" value-format="YYYY-MM-DD" :disabled="!canManage" style="width: 100%" /></a-form-item>
              <a-form-item label="计划结束"><a-date-picker v-model:value="stageForm.plannedEnd" value-format="YYYY-MM-DD" :disabled="!canManage" style="width: 100%" /></a-form-item>
              <a-form-item label="实际开始"><a-date-picker v-model:value="stageForm.actualStart" value-format="YYYY-MM-DD" :disabled="!canEditStage" style="width: 100%" /></a-form-item>
              <a-form-item label="实际结束"><a-date-picker v-model:value="stageForm.actualEnd" value-format="YYYY-MM-DD" :disabled="!canEditStage" style="width: 100%" /></a-form-item>
              <a-form-item label="阶段结论" class="iteration-form__wide"><a-textarea v-model:value="stageForm.conclusion" :rows="3" :maxlength="4000" :disabled="!canEditStage" placeholder="写清评审决定、完成情况、未解决问题和责任归属" /></a-form-item>
            </a-form>
            <a-button v-if="canEditStage" type="primary" :loading="savingStage" @click="saveStage">保存阶段记录</a-button>
            <a-alert v-if="selectedStage?.status === 'COMPLETED'" type="success" show-icon
              :message="`由 ${memberName(selectedStage.completedBy)} 于 ${formatDateTime(selectedStage.completedAt)} 完成`" style="margin-top: 12px" />
          </a-card>

          <a-card :bordered="false" title="过程记录与凭证" class="iteration-record-card">
            <p class="iteration-tip">评审纪要、设计稿、测试报告、风险和决策按时间追加，已记录内容不可覆盖。</p>
            <a-form layout="vertical" class="iteration-form">
              <a-form-item label="记录类型"><a-select v-model:value="recordForm.recordType" :options="recordTypeOptions" /></a-form-item>
              <a-form-item label="标题"><a-input v-model:value="recordForm.title" :maxlength="160" placeholder="例如：需求评审结论" /></a-form-item>
              <a-form-item label="详细内容" class="iteration-form__wide"><a-textarea v-model:value="recordForm.content" :rows="3" :maxlength="4000" placeholder="记录讨论、问题、决定、结果或后续行动" /></a-form-item>
              <a-form-item label="凭证链接" class="iteration-form__wide"><a-input v-model:value="recordForm.evidenceUrl" :maxlength="1000" placeholder="可填写评审文档、设计稿、测试报告或上线文件的 http(s) 链接" /></a-form-item>
            </a-form>
            <a-button :loading="savingRecord" @click="saveRecord">追加记录</a-button>
            <a-timeline class="iteration-history">
              <a-timeline-item v-for="item in selectedRecords" :key="item.id">
                <strong>{{ item.title }}</strong> <a-tag>{{ recordTypeLabels[item.recordType] || item.recordType }}</a-tag>
                <small>{{ item.actorName || memberName(item.actorId) }} · {{ formatDateTime(item.createdAt) }}</small>
                <p>{{ item.content }}</p>
                <a v-if="item.evidenceUrl" :href="item.evidenceUrl" target="_blank" rel="noopener noreferrer">查看凭证</a>
                <details v-if="item.beforeJson || item.afterJson"><summary>查看变更前后内容</summary><pre>变更前：{{ item.beforeJson || '-' }}\n变更后：{{ item.afterJson || '-' }}</pre></details>
              </a-timeline-item>
            </a-timeline>
            <a-empty v-if="!selectedRecords.length" description="本阶段暂无过程记录" />
          </a-card>
        </div>
      </div>

      <a-card :bordered="false" title="上线申请单" class="iteration-application">
        <div class="iteration-application__status">
          <a-tag :color="applicationColor[application.status] || 'default'">{{ applicationStatus[application.status] || '未填写' }}</a-tag>
          <span v-if="application.applicantId">申请人：{{ memberName(application.applicantId) }}</span>
          <span v-if="application.approverId">审批人：{{ memberName(application.approverId) }}</span>
          <span v-if="application.decisionNote">审批意见：{{ application.decisionNote }}</span>
        </div>
        <a-form layout="vertical" class="iteration-form">
          <a-form-item label="发布环境"><a-input v-model:value="applicationForm.environment" :disabled="!canEditApplication" placeholder="例如：生产环境" /></a-form-item>
          <a-form-item label="审批人"><a-select v-model:value="applicationForm.approverId" show-search option-filter-prop="label" :options="memberOptions" :disabled="!canEditApplication" placeholder="选择项目成员审批" /></a-form-item>
          <a-form-item label="上线窗口开始"><a-date-picker v-model:value="applicationForm.windowStart" show-time value-format="YYYY-MM-DDTHH:mm:ss" :disabled="!canEditApplication" style="width: 100%" /></a-form-item>
          <a-form-item label="上线窗口结束"><a-date-picker v-model:value="applicationForm.windowEnd" show-time value-format="YYYY-MM-DDTHH:mm:ss" :disabled="!canEditApplication" style="width: 100%" /></a-form-item>
          <a-form-item label="变更内容与上线范围" class="iteration-form__wide"><a-textarea v-model:value="applicationForm.changeSummary" :rows="3" :disabled="!canEditApplication" /></a-form-item>
          <a-form-item label="影响范围与客户影响" class="iteration-form__wide"><a-textarea v-model:value="applicationForm.impactScope" :rows="3" :disabled="!canEditApplication" /></a-form-item>
          <a-form-item label="回滚方案" class="iteration-form__wide"><a-textarea v-model:value="applicationForm.rollbackPlan" :rows="3" :disabled="!canEditApplication" /></a-form-item>
          <a-form-item label="监控与告警准备" class="iteration-form__wide"><a-textarea v-model:value="applicationForm.monitoringPlan" :rows="3" :disabled="!canEditApplication" /></a-form-item>
          <a-form-item label="值守与客服准备" class="iteration-form__wide"><a-textarea v-model:value="applicationForm.supportPlan" :rows="3" :disabled="!canEditApplication" /></a-form-item>
        </a-form>
        <a-space v-if="canEditApplication"><a-button :loading="savingApplication" @click="saveApplication">保存申请草稿</a-button>
          <a-button v-if="application.status === 'DRAFT' || application.status === 'REJECTED'" type="primary" :disabled="release.status !== 'READY'" :loading="submitting" @click="submitApplication">提交审批</a-button></a-space>
        <p v-if="canEditApplication && release.status !== 'READY'" class="iteration-tip">先完成交付检查并将版本标记为已就绪，才能提交上线申请。</p>
        <div v-if="canApprove" class="iteration-decision">
          <a-textarea v-model:value="decisionNote" :rows="2" :maxlength="2000" placeholder="填写审批依据或驳回原因" />
          <a-space><a-button type="primary" :loading="deciding" @click="decide('APPROVED')">批准上线</a-button>
            <a-button danger :loading="deciding" @click="decide('REJECTED')">驳回申请</a-button></a-space>
        </div>
        <div v-if="canWithdraw" class="iteration-decision">
          <a-textarea v-model:value="withdrawalReason" :rows="2" :maxlength="2000" placeholder="填写撤回原因，撤回后可修改阶段及申请单" />
          <a-button :loading="withdrawing" @click="withdrawApplication">撤回申请</a-button>
        </div>
        <div v-if="canManage && release.status !== 'RELEASED'" class="iteration-launch">
          <a-button v-if="release.status !== 'READY'" :disabled="!release.ready" :loading="launching" @click="changeReleaseStatus('READY')">标记版本就绪</a-button>
          <template v-else><a-input v-model:value="releaseNote" :maxlength="4000" placeholder="填写实际发布结论、上线结果和执行依据" style="max-width: 520px" />
            <a-button type="primary" :disabled="application.status !== 'APPROVED'" :loading="launching" @click="changeReleaseStatus('RELEASED')">确认上线发布</a-button></template>
        </div>
      </a-card>
    </a-spin>
  </section>
</template>

<script setup>
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addIterationRecord, decideReleaseApplication, getIterationWorkflow, saveReleaseApplication,
  submitReleaseApplication, updateIterationStage, updateRelease, withdrawReleaseApplication } from '@/api/workhub'
import { getStoredProfile } from '@/utils/authScope'
import { formatDateTime } from '@/utils/dateTime'

const route = useRoute()
const router = useRouter()
const profile = getStoredProfile()
const workflow = ref({ release: {}, stages: [], application: {}, records: [], members: [], canManage: false })
const loading = ref(false)
const savingStage = ref(false)
const savingRecord = ref(false)
const savingApplication = ref(false)
const submitting = ref(false)
const deciding = ref(false)
const withdrawing = ref(false)
const launching = ref(false)
const selectedCode = ref('REQUIREMENT_SUBMISSION')
const stageForm = reactive({ ownerId: undefined, plannedStart: undefined, plannedEnd: undefined, actualStart: undefined, actualEnd: undefined, status: 'NOT_STARTED', conclusion: '' })
const recordForm = reactive({ recordType: 'NOTE', title: '', content: '', evidenceUrl: '' })
const applicationForm = reactive({ environment: '', windowStart: undefined, windowEnd: undefined, changeSummary: '', impactScope: '', rollbackPlan: '', monitoringPlan: '', supportPlan: '', approverId: undefined })
const decisionNote = ref('')
const withdrawalReason = ref('')
const releaseNote = ref('')
const release = computed(() => workflow.value.release || {})
const stages = computed(() => workflow.value.stages || [])
const application = computed(() => workflow.value.application || {})
const canManage = computed(() => !!workflow.value.canManage)
const selectedStage = computed(() => stages.value.find(item => item.stageCode === selectedCode.value))
const memberOptions = computed(() => (workflow.value.members || []).map(item => ({ value: item.id, label: item.name || `用户 ${item.id}` })))
const selectedRecords = computed(() => (workflow.value.records || []).filter(item => item.stageCode === selectedCode.value))
const canEditStage = computed(() => selectedCode.value !== 'PRODUCTION_RELEASE'
  && (selectedCode.value !== 'POST_RELEASE' || release.value.status === 'RELEASED')
  && (selectedCode.value === 'POST_RELEASE' || release.value.status !== 'RELEASED')
  && (canManage.value || String(selectedStage.value?.ownerId) === String(profile.id))
  && (selectedCode.value === 'POST_RELEASE' || !['SUBMITTED', 'APPROVED'].includes(application.value.status)))
const canEditApplication = computed(() => canManage.value && release.value.status !== 'RELEASED'
  && !['SUBMITTED', 'APPROVED'].includes(application.value.status))
const canApprove = computed(() => application.value.status === 'SUBMITTED'
  && String(application.value.approverId) === String(profile.id))
const canWithdraw = computed(() => canManage.value && release.value.status !== 'RELEASED'
  && ['SUBMITTED', 'APPROVED'].includes(application.value.status))
const stageStatus = { NOT_STARTED: '未开始', IN_PROGRESS: '进行中', COMPLETED: '已完成' }
const stageStatusOptions = Object.entries(stageStatus).map(([value, label]) => ({ value, label }))
const releaseStatus = { PLANNED: '计划中', READY: '已就绪', RELEASED: '已发布', CANCELLED: '已取消' }
const applicationStatus = { DRAFT: '草稿', SUBMITTED: '审批中', APPROVED: '已批准', REJECTED: '已驳回', WITHDRAWN: '已撤回' }
const applicationColor = { DRAFT: 'default', SUBMITTED: 'blue', APPROVED: 'green', REJECTED: 'red', WITHDRAWN: 'orange' }
const recordTypeLabels = { NOTE: '过程说明', DECISION: '决定', RISK: '风险', DOCUMENT: '文档凭证', TEST_REPORT: '测试报告', DEFECT: '缺陷', FOLLOW_UP: '上线跟进', STAGE_CHANGE: '阶段变更', APPLICATION_CHANGE: '申请变更', RELEASE_CHANGE: '版本变更' }
const recordTypeOptions = Object.entries(recordTypeLabels).filter(([value]) => !value.endsWith('_CHANGE')).map(([value, label]) => ({ value, label }))
const stageGuidance = {
  REQUIREMENT_SUBMISSION: '记录业务目标、需求文档、范围、优先级及提出人。',
  REQUIREMENT_REVIEW: '记录产品、开发、测试共同评审的方案、工作量与排期结论。',
  UI_DESIGN: '记录设计稿、交互说明与设计评审意见。',
  DEVELOPMENT: '记录开发起止、实现方案、自测及联调情况。',
  TEST_HANDOFF: '记录测试环境、账号、接口文档、测试数据与交付范围。',
  TEST_VERIFICATION: '记录测试计划、报告、缺陷修复、回归与遗留问题。',
  PRODUCT_ACCEPTANCE: '记录产品验收结果、体验问题与需求完成情况。',
  PRE_RELEASE: '记录功能检查、风险评估、监控告警、回滚与值守准备。',
  PRODUCTION_RELEASE: '上线申请批准后，由版本发布动作自动记录执行人和时间。',
  POST_RELEASE: '记录线上监控、用户反馈、故障处理与次日复盘结果。',
}
const stageColor = status => ({ COMPLETED: 'green', IN_PROGRESS: 'blue' }[status] || 'default')
const memberName = id => memberOptions.value.find(item => String(item.value) === String(id))?.label || (id ? `用户 ${id}` : '-')

const syncStageForm = () => {
  const stage = selectedStage.value || {}
  Object.assign(stageForm, { ownerId: stage.ownerId || undefined, plannedStart: stage.plannedStart || undefined,
    plannedEnd: stage.plannedEnd || undefined, actualStart: stage.actualStart || undefined,
    actualEnd: stage.actualEnd || undefined, status: stage.status || 'NOT_STARTED', conclusion: stage.conclusion || '' })
}
const syncApplicationForm = () => {
  const value = application.value
  for (const key of Object.keys(applicationForm)) applicationForm[key] = value[key]
    || (['approverId', 'windowStart', 'windowEnd'].includes(key) ? undefined : '')
}
const applyWorkflow = value => {
  workflow.value = value || workflow.value
  syncStageForm()
  syncApplicationForm()
  releaseNote.value = release.value.acceptanceNote || ''
}
const load = async () => {
  loading.value = true
  try { applyWorkflow(await getIterationWorkflow(route.params.id)) }
  catch (error) { message.error(error.message || '迭代档案加载失败') }
  finally { loading.value = false }
}
watch(() => route.params.id, load, { immediate: true })
const selectStage = code => { selectedCode.value = code; syncStageForm() }
const saveStage = async () => {
  if (stageForm.status === 'COMPLETED' && (!stageForm.ownerId || !stageForm.actualEnd || !stageForm.conclusion.trim())) {
    message.warning('完成阶段需填写负责人、实际完成日期和结论'); return
  }
  savingStage.value = true
  try { applyWorkflow(await updateIterationStage(route.params.id, selectedCode.value, { ...stageForm })); message.success('阶段记录已保存') }
  catch (error) { message.error(error.message || '阶段保存失败') }
  finally { savingStage.value = false }
}
const saveRecord = async () => {
  if (!recordForm.title.trim() || !recordForm.content.trim()) { message.warning('请填写记录标题和内容'); return }
  savingRecord.value = true
  try {
    applyWorkflow(await addIterationRecord(route.params.id, { stageCode: selectedCode.value, ...recordForm }))
    Object.assign(recordForm, { recordType: 'NOTE', title: '', content: '', evidenceUrl: '' })
    message.success('过程记录已追加')
  } catch (error) { message.error(error.message || '记录保存失败') }
  finally { savingRecord.value = false }
}
const saveApplication = async () => {
  if (Object.values(applicationForm).some(value => !value)) { message.warning('请完整填写上线申请单'); return }
  savingApplication.value = true
  try { applyWorkflow(await saveReleaseApplication(route.params.id, { ...applicationForm })); message.success('申请草稿已保存') }
  catch (error) { message.error(error.message || '申请保存失败') }
  finally { savingApplication.value = false }
}
const submitApplication = async () => {
  submitting.value = true
  try { applyWorkflow(await submitReleaseApplication(route.params.id)); message.success('上线申请已提交审批') }
  catch (error) { message.error(error.message || '提交失败') }
  finally { submitting.value = false }
}
const decide = async decision => {
  if (!decisionNote.value.trim()) { message.warning('请填写审批依据或驳回原因'); return }
  deciding.value = true
  try { applyWorkflow(await decideReleaseApplication(route.params.id, { decision, note: decisionNote.value.trim() })); decisionNote.value = ''; message.success('审批结论已记录') }
  catch (error) { message.error(error.message || '审批失败') }
  finally { deciding.value = false }
}
const withdrawApplication = async () => {
  if (!withdrawalReason.value.trim()) { message.warning('请填写撤回原因'); return }
  withdrawing.value = true
  try {
    applyWorkflow(await withdrawReleaseApplication(route.params.id, { reason: withdrawalReason.value.trim() }))
    withdrawalReason.value = ''
    message.success('申请已撤回，可修改后重新提交')
  } catch (error) { message.error(error.message || '撤回失败') }
  finally { withdrawing.value = false }
}
const changeReleaseStatus = async status => {
  if (status === 'RELEASED' && !releaseNote.value.trim()) { message.warning('请填写实际发布结论'); return }
  launching.value = true
  try {
    const item = release.value
    await updateRelease(item.id, { projectId: item.projectId, name: item.name, targetDate: item.targetDate,
      status, acceptanceNote: status === 'RELEASED' ? releaseNote.value.trim() : item.acceptanceNote || '',
      requirementIds: item.selectedRequirementIds || [], taskIds: item.selectedTaskIds || [] })
    await load()
    message.success(status === 'RELEASED' ? '上线发布已留痕' : '版本已标记就绪')
  } catch (error) { message.error(error.message || '版本状态更新失败') }
  finally { launching.value = false }
}
</script>

<style scoped>
.iteration-page { padding: 20px; display: grid; gap: 16px; }
.iteration-header h2 { margin: 8px 0 4px; }
.iteration-header p, .iteration-tip { color: #667085; }
.iteration-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 12px; }
.iteration-layout { display: grid; grid-template-columns: 290px minmax(0, 1fr); gap: 16px; align-items: start; }
.iteration-scope { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.iteration-scope p { margin: 4px 0; }
.iteration-sidebar, .iteration-main { min-width: 0; }
.iteration-main { display: grid; gap: 16px; }
.iteration-step { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px; margin-bottom: 6px; text-align: left; border: 1px solid #e8edf4; border-radius: 8px; background: #fff; cursor: pointer; }
.iteration-step.selected { border-color: #1677ff; background: #f0f7ff; }
.iteration-step__number { width: 24px; height: 24px; border-radius: 50%; color: #fff; background: #1677ff; display: grid; place-items: center; flex: none; }
.iteration-step span:nth-child(2) { flex: 1; min-width: 0; }
.iteration-step strong, .iteration-step small { display: block; }
.iteration-step small { color: #98a2b3; font-size: 11px; }
.iteration-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
.iteration-form__wide { grid-column: 1 / -1; }
.iteration-history { margin-top: 24px; }
.iteration-history small { display: block; color: #98a2b3; }
.iteration-history p { white-space: pre-wrap; margin: 8px 0; }
.iteration-history pre { white-space: pre-wrap; word-break: break-word; font-size: 12px; }
.iteration-application__status, .iteration-decision, .iteration-launch { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 16px; }
.iteration-decision, .iteration-launch { margin-top: 18px; }
@media (max-width: 900px) { .iteration-layout, .iteration-scope { grid-template-columns: 1fr; } .iteration-form { grid-template-columns: 1fr; } .iteration-heading { flex-direction: column; align-items: start; } }
</style>
