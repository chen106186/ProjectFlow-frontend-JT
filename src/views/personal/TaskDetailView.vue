<template>
  <section class="task-detail-page">
    <div class="detail-actions">
      <a-button class="back-button" @click="handleBack">
        <template #icon><LeftOutlined /></template>
        返回
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <a-card class="detail-card task-summary-card" :bordered="false">
        <table class="native-info-table">
          <tbody>
            <tr>
              <th>任务名称</th>
              <td>{{ taskDetail?.name || '-' }}</td>
              <th>所属项目</th>
              <td>{{ getProjectName(taskDetail) }}</td>
              <th>负责人</th>
              <td>{{ getUserName(taskDetail) }}</td>
            </tr>
            <tr>
              <th>角色</th>
              <td>{{ taskDetail?.roleName || '-' }}</td>
              <th>创建时间</th>
              <td>{{ getDateValue(taskDetail?.createdAt || taskDetail?.createTime || taskDetail?.createdTime) }}</td>
              <th>优先级</th>
              <td><a-tag :color="getPriorityColor(taskDetail?.priority)">{{ getDictLabel('taskPriority', taskDetail?.priority) || '-' }}</a-tag></td>
            </tr>
            <tr>
              <th>状态</th>
              <td><a-tag :color="getStatusColor(taskDetail?.status)">{{ getDictLabel('taskStatus', taskDetail?.status) || '-' }}</a-tag></td>
              <th>计划开始日期</th>
              <td>{{ getDateValue(taskDetail?.plannedStartDate) }}</td>
              <th>计划结束日期</th>
              <td>{{ getDateValue(taskDetail?.plannedEndDate) }}</td>
            </tr>
            <tr>
              <th>实际开始日期</th>
              <td>{{ getDateValue(taskDetail?.actualStartDate) }}</td>
              <th>实际结束日期</th>
              <td>{{ getDateValue(taskDetail?.actualEndDate) }}</td>
              <th>标签</th>
              <td>{{ taskDetail?.tags || '-' }}</td>
            </tr>
            <tr>
              <th>任务描述</th>
              <td colspan="5">{{ taskDetail?.description || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </a-card>

      <a-card v-if="releaseExecution" class="detail-card release-execution-card" :bordered="false" title="上线执行档案">
        <template #extra><a-space><a-button v-if="releaseExecution.canManage && ['PLANNED', 'READY'].includes(releaseExecution.releaseStatus)" @click="openReleasePlan">调整上线计划</a-button><a-button type="link" @click="router.push({ name: 'IterationDetail', params: { id: releaseExecution.releaseId } })">查看版本迭代档案</a-button></a-space></template>
        <a-descriptions :column="{ xs: 1, md: 2 }" bordered size="small">
          <a-descriptions-item label="交付版本">{{ releaseExecution.releaseName }}</a-descriptions-item>
          <a-descriptions-item label="发布环境">{{ releaseExecution.environment }}</a-descriptions-item>
          <a-descriptions-item label="计划上线">{{ formatDateTime(releaseExecution.windowStart) }} — {{ formatDateTime(releaseExecution.windowEnd) }}</a-descriptions-item>
          <a-descriptions-item label="上线负责人">{{ releaseMemberName(releaseExecution.leadId) }}</a-descriptions-item>
          <a-descriptions-item label="执行人员">{{ releaseNames(releaseExecution.operatorIds) }}</a-descriptions-item>
          <a-descriptions-item label="验证人员">{{ releaseMemberName(releaseExecution.verifierId) }}</a-descriptions-item>
          <a-descriptions-item label="值守人员">{{ releaseNames(releaseExecution.supportIds) }}</a-descriptions-item>
          <a-descriptions-item label="会议计划">{{ formatDateTime(releaseExecution.meetingPlannedAt) }}</a-descriptions-item>
        </a-descriptions>
        <div class="release-steps">
          <a-tag :color="releaseExecution.meetings?.[0]?.conclusion === 'APPROVED' && meetingConfirmed(releaseExecution.meetings[0]) && releaseExecution.meetings[0].planRevision === releaseExecution.planRevision ? 'green' : 'orange'">上线会议：{{ meetingLabels[releaseExecution.meetings?.[0]?.conclusion] || '未完成' }}</a-tag>
          <a-tag :color="releaseStage('PRE_RELEASE')?.status === 'COMPLETED' ? 'green' : 'orange'">上线前评估：{{ releaseStage('PRE_RELEASE')?.status === 'COMPLETED' ? '已完成' : '待完成' }}</a-tag>
          <a-tag :color="executionWorkflow?.application?.status === 'APPROVED' ? 'green' : 'orange'">上线申请：{{ applicationLabels[executionWorkflow?.application?.status] || '未填写' }}</a-tag>
          <a-tag :color="releaseExecution.releaseStatus === 'RELEASED' ? 'green' : 'blue'">版本：{{ releaseExecution.releaseStatus === 'RELEASED' ? '已发布' : '待发布' }}</a-tag>
          <a-tag :color="releaseExecution.report?.status === 'VERIFIED' ? 'green' : releaseExecution.report?.status === 'REJECTED' ? 'red' : 'orange'">上线报告：{{ releaseExecution.report?.status === 'VERIFIED' ? '已验证' : releaseExecution.report?.status === 'REJECTED' ? '已驳回' : releaseExecution.report ? '待验证' : '待提交' }}</a-tag>
          <a-tag :color="releaseStage('POST_RELEASE')?.status === 'COMPLETED' ? 'green' : 'orange'">上线后跟进：{{ releaseStage('POST_RELEASE')?.status === 'COMPLETED' ? '已完成' : '待完成' }}</a-tag>
        </div>
        <p class="muted">阶段评估、申请审批、附件凭证和上线后复盘在版本迭代档案中统一留存。</p>
        <a-collapse v-if="executionWorkflow?.release?.requirements?.length || executionWorkflow?.release?.tasks?.length" style="margin-top:12px">
          <a-collapse-panel key="scope" header="查看本次版本的需求与交付任务">
            <div v-for="item in executionWorkflow.release.requirements || []" :key="`requirement-${item.id}`">
              <a-button type="link" @click="router.push({ name: 'PersonalRequirementDetail', params: { id: item.id } })">需求 #{{ item.requirementNo || item.id }} {{ item.title }}</a-button>
            </div>
            <div v-for="item in executionWorkflow.release.tasks || []" :key="`task-${item.id}`">
              <a-button type="link" @click="router.push({ name: 'AllTaskDetail', params: { id: item.id } })">任务 #{{ item.id }} {{ item.name }}</a-button>
            </div>
          </a-collapse-panel>
        </a-collapse>
        <a-divider orientation="left">上线会议纪要</a-divider>
        <a-alert v-if="releaseExecution.meetings?.[0]?.conclusion === 'CONDITIONAL'" type="warning" show-icon message="会议结论为有条件同意。行动项完成后请再次召开确认会议，记录“同意上线”的结论。" />
        <a-alert v-if="releaseExecution.meetings?.length && releaseExecution.meetings[0].planRevision !== releaseExecution.planRevision" type="warning" show-icon message="上线计划已调整，原会议纪要保留存档；请基于当前计划重新召开确认会议。" />
        <a-empty v-if="!releaseExecution.meetings?.length" description="尚无会议纪要" />
        <a-collapse v-else>
          <a-collapse-panel v-for="item in releaseExecution.meetings" :key="item.id" :header="`${formatDateTime(item.heldAt)} · ${meetingLabels[item.conclusion] || item.conclusion}`">
            <p><b>主持人：</b>{{ releaseMemberName(item.chairId) }}　<b>参会人：</b>{{ releaseNames(item.attendeeIds) }}</p>
            <p><b>议题：</b>{{ item.agenda }}</p><p><b>决定：</b>{{ item.decisions }}</p>
            <p><b>风险：</b>{{ item.risks || '无' }}</p><p><b>行动项：</b>{{ item.actionItems || '无' }}</p>
            <p><b>参会确认：</b>{{ item.confirmedIds?.length || 0 }}/{{ item.attendeeIds?.length || 0 }}</p>
            <a-button v-if="item.attendeeIds?.includes(releaseExecution.currentUserId) && !item.confirmedIds?.includes(releaseExecution.currentUserId)" :loading="releaseSaving" @click="confirmMeeting(item.id)">确认纪要内容</a-button>
            <p class="muted">{{ releaseMemberName(item.recordedBy) }} · {{ formatDateTime(item.recordedAt) }}</p>
          </a-collapse-panel>
        </a-collapse>
        <a-form v-if="releaseExecution.canManage && !['RELEASED', 'CANCELLED'].includes(releaseExecution.releaseStatus)" layout="vertical" class="release-form">
          <a-form-item label="实际会议时间" required><a-date-picker v-model:value="meetingForm.heldAt" show-time value-format="YYYY-MM-DDTHH:mm:ss" style="width:100%" /></a-form-item>
          <a-form-item label="主持人" required><a-select v-model:value="meetingForm.chairId" show-search option-filter-prop="label" :options="releaseMemberOptions" /></a-form-item>
          <a-form-item label="参会人" required><a-select v-model:value="meetingForm.attendeeIds" mode="multiple" show-search option-filter-prop="label" :options="releaseMemberOptions" /></a-form-item>
          <a-form-item label="会议结论" required><a-select v-model:value="meetingForm.conclusion" :options="Object.entries(meetingLabels).map(([value,label]) => ({ value,label }))" /></a-form-item>
          <a-form-item label="会议议题" required><a-textarea v-model:value="meetingForm.agenda" :rows="2" /></a-form-item>
          <a-form-item label="会议决定" required><a-textarea v-model:value="meetingForm.decisions" :rows="2" /></a-form-item>
          <a-form-item label="风险"><a-textarea v-model:value="meetingForm.risks" :rows="2" /></a-form-item>
          <a-form-item label="行动项、负责人及期限"><a-textarea v-model:value="meetingForm.actionItems" :rows="2" /></a-form-item>
          <a-button :loading="releaseSaving" @click="saveMeeting">提交会议纪要</a-button>
        </a-form>
        <a-divider orientation="left">上线报告单</a-divider>
        <template v-if="releaseExecution.report">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="实际时间">{{ formatDateTime(releaseExecution.report.actualStart) }} — {{ formatDateTime(releaseExecution.report.actualEnd) }}</a-descriptions-item>
            <a-descriptions-item label="发布包 / 代码版本">{{ releaseExecution.report.packageRef }}</a-descriptions-item>
            <a-descriptions-item label="执行步骤">{{ releaseExecution.report.executionSteps }}</a-descriptions-item>
            <a-descriptions-item label="冒烟验证">{{ releaseExecution.report.smokeResult }} · {{ releaseMemberName(releaseExecution.report.verifierId) }}</a-descriptions-item>
            <a-descriptions-item label="监控观察">{{ releaseExecution.report.monitoringResult }}</a-descriptions-item>
            <a-descriptions-item label="异常处理">{{ releaseExecution.report.incidentNotes || '无' }}</a-descriptions-item>
            <a-descriptions-item label="结果">{{ reportLabels[releaseExecution.report.outcome] || releaseExecution.report.outcome }} · {{ releaseExecution.report.rolledBack ? '已回滚' : '未回滚' }}</a-descriptions-item>
            <a-descriptions-item label="遗留问题">{{ releaseExecution.report.residualIssues || '无' }}</a-descriptions-item>
          </a-descriptions>
          <p class="muted">提交人：{{ releaseMemberName(releaseExecution.report.submittedBy) }} · {{ formatDateTime(releaseExecution.report.submittedAt) }}</p>
          <template v-if="releaseExecution.report.status === 'SUBMITTED' && String(releaseExecution.report.verifierId) === String(releaseExecution.currentUserId)">
            <a-input v-model:value="reportVerificationNote" :maxlength="2000" placeholder="填写验证依据和结论" style="max-width:520px; margin-right:8px" />
            <a-button type="primary" :loading="releaseSaving" @click="confirmReport('APPROVED')">验证通过</a-button>
            <a-button danger :loading="releaseSaving" @click="confirmReport('REJECTED')">驳回报告</a-button>
          </template>
          <a-alert v-if="releaseExecution.report.status === 'REJECTED'" type="error" show-icon :message="`报告已驳回：${releaseExecution.report.verificationNote}`" />
          <p v-if="releaseExecution.report.status === 'VERIFIED'" class="muted">验证人：{{ releaseMemberName(releaseExecution.report.verifiedBy) }} · {{ releaseExecution.report.verificationNote }} · {{ formatDateTime(releaseExecution.report.verifiedAt) }}</p>
          <a-button v-if="releaseExecution.canManage && releaseExecution.report.status === 'VERIFIED' && taskDetail?.status !== 'COMPLETED'" type="primary" :loading="releaseSaving" @click="completeReleaseTask">完成上线执行任务</a-button>
        </template>
        <a-alert v-if="!releaseExecution.report && releaseExecution.releaseStatus !== 'RELEASED'" type="info" show-icon message="版本发布后填写实际上线报告；上线申请和审批请在版本迭代档案中办理。" />
        <a-form v-if="releaseExecution.canManage && releaseExecution.releaseStatus === 'RELEASED' && (!releaseExecution.report || releaseExecution.report.status === 'REJECTED')" layout="vertical" class="release-form">
          <a-form-item label="实际开始" required><a-date-picker v-model:value="reportForm.actualStart" show-time value-format="YYYY-MM-DDTHH:mm:ss" style="width:100%" /></a-form-item>
          <a-form-item label="实际结束" required><a-date-picker v-model:value="reportForm.actualEnd" show-time value-format="YYYY-MM-DDTHH:mm:ss" style="width:100%" /></a-form-item>
          <a-form-item label="发布包 / 代码版本" required><a-input v-model:value="reportForm.packageRef" /></a-form-item>
          <a-form-item label="上线结果" required><a-select v-model:value="reportForm.outcome" :options="Object.entries(reportLabels).map(([value,label]) => ({ value,label }))" /></a-form-item>
          <a-form-item label="验证人员" required><a-select v-model:value="reportForm.verifierId" show-search option-filter-prop="label" :options="releaseMemberOptions" /></a-form-item>
          <a-form-item label="执行步骤与结果" required><a-textarea v-model:value="reportForm.executionSteps" :rows="3" /></a-form-item>
          <a-form-item label="冒烟验证结果" required><a-textarea v-model:value="reportForm.smokeResult" :rows="2" /></a-form-item>
          <a-form-item label="监控观察" required><a-textarea v-model:value="reportForm.monitoringResult" :rows="2" /></a-form-item>
          <a-form-item label="异常及处理"><a-textarea v-model:value="reportForm.incidentNotes" :rows="2" /></a-form-item>
          <a-form-item label="遗留问题和负责人"><a-textarea v-model:value="reportForm.residualIssues" :rows="2" /></a-form-item>
          <a-button type="primary" :loading="releaseSaving" @click="saveReport">{{ releaseExecution.report ? '修改并重提报告' : '提交上线报告单' }}</a-button>
        </a-form>
      </a-card>

      <div class="detail-content-grid">
        <main class="detail-main">
          <a-card class="detail-card" :bordered="false" title="阻塞情况">
            <a-tag :color="blocker.reason ? 'red' : 'green'">{{ blocker.reason ? '处理中' : '无阻塞' }}</a-tag>
            <p v-if="blocker.reason" style="white-space: pre-wrap; margin-top: 10px">{{ blocker.reason }}</p>
            <div v-if="blocker.canEdit" style="display: flex; gap: 10px; margin-top: 12px">
              <a-input v-model:value="blockerReason" :maxlength="2000" placeholder="填写阻塞原因；清空后保存可解除阻塞" />
              <a-button :loading="blockerSaving" @click="saveBlocker">保存</a-button>
            </div>
          </a-card>
          <WorkDiscussion v-if="taskDetail" type="tasks" :id="taskDetail.id" />
          <a-card class="detail-card attachment-card" :bordered="false">
            <template #title>
              <span class="section-title"><FileTextOutlined /> 附件展示</span>
            </template>
            <template #extra>
              <a-button type="primary" @click="uploadOpen = true">上传文件</a-button>
            </template>

            <a-table
              :columns="attachmentColumns"
              :data-source="attachments"
              :pagination="false"
              row-key="id"
              size="middle"
              :locale="{ emptyText: '暂无附件' }"
            >
              <template #bodyCell="{ column, record, text }">
                <template v-if="column.dataIndex === 'name'">
                  <span class="file-name"><FileOutlined />{{ text }}</span>
                </template>
                <template v-else-if="column.dataIndex === 'operation'">
                  <a-space :size="4">
                    <a-button type="link" @click="handleDownloadAttachment(record)">下载</a-button>
                    <a-popconfirm title="确认删除该附件?" ok-text="删除" cancel-text="取消" @confirm="handleDeleteAttachment(record)">
                      <a-button type="link" danger>删除</a-button>
                    </a-popconfirm>
                  </a-space>
                </template>
                <template v-else>{{ record[column.dataIndex] || '-' }}</template>
              </template>
            </a-table>
          </a-card>

          <a-card class="detail-card log-card" :bordered="false">
            <template #title>
              <span class="section-title"><EditOutlined /> 操作日志</span>
            </template>

            <a-empty v-if="!operationLogs.length" description="暂无操作日志" />
            <a-timeline v-else>
              <a-timeline-item v-for="log in operationLogs" :key="log.id">
                <span class="log-meta">{{ formatDateTime(log.time || log.createdAt || log.createTime) }}　{{ log.userName || log.operatorName || log.user || '-' }}</span>
                <p>{{ log.content || log.detail || log.text || '-' }}</p>
              </a-timeline-item>
            </a-timeline>
          </a-card>
        </main>

        <aside class="related-bugs-card">
          <a-card class="detail-card" :bordered="false" title="关联需求">
            <a-empty v-if="!relatedRequirements.length" description="暂无关联需求" />
            <div v-for="item in relatedRequirements" :key="item.id" style="margin-bottom: 10px">
              <a-button type="link" @click="router.push({ name: 'PersonalRequirementDetail', params: { id: item.id } })">#{{ item.requirementNo }} {{ item.title }}</a-button>
              <a-tag :color="item.acceptanceResult === 'PASSED' ? 'green' : 'orange'">{{ item.acceptanceResult === 'PASSED' ? '已验收' : '待验收' }}</a-tag>
            </div>
          </a-card>
          <a-card class="detail-card" :bordered="false">
            <template #title>
              <span class="section-title"><BugOutlined /> 关联Bug ({{ relatedBugs.length }})</span>
            </template>

            <a-empty v-if="!relatedBugs.length" description="暂无关联Bug" />
            <article v-for="bug in relatedBugs" v-else :key="bug.id || bug.bugNo || bug.code" class="bug-card" @click="handleBugClick(bug)">
              <p><BugOutlined /> {{ formatBugNo(bug) }}</p>
              <strong>{{ bug.title || bug.name || '-' }}</strong>
              <div>
                <a-tag :color="getBugLevelColor(bug.priority || bug.severity)">{{ getDictLabel('bugPriority', bug.priority || bug.severity) || bug.priority || bug.severity || '-' }}</a-tag>
                <a-tag :color="getBugStatusColor(bug.status)">{{ getDictLabel('bugStatus', bug.status) || bug.status || '-' }}</a-tag>
              </div>
            </article>
          </a-card>
        </aside>
      </div>
    </a-spin>

    <a-modal v-model:open="releasePlanOpen" width="42rem" title="调整上线计划" :confirm-loading="releaseSaving" @ok="saveReleasePlan">
      <a-alert type="warning" show-icon message="调整后原会议结论失效，参会人需重新确认；审批中的申请须先撤回。" style="margin-bottom:16px" />
      <a-form layout="vertical" class="release-form">
        <a-form-item label="发布环境" required><a-input v-model:value="planForm.environment" /></a-form-item>
        <a-form-item label="会议计划时间"><a-date-picker v-model:value="planForm.meetingPlannedAt" show-time value-format="YYYY-MM-DDTHH:mm:ss" style="width:100%" /></a-form-item>
        <a-form-item label="上线开始" required><a-date-picker v-model:value="planForm.windowStart" show-time value-format="YYYY-MM-DDTHH:mm:ss" style="width:100%" /></a-form-item>
        <a-form-item label="上线结束" required><a-date-picker v-model:value="planForm.windowEnd" show-time value-format="YYYY-MM-DDTHH:mm:ss" style="width:100%" /></a-form-item>
        <a-form-item label="上线负责人" required><a-select v-model:value="planForm.leadId" show-search option-filter-prop="label" :options="releaseMemberOptions" /></a-form-item>
        <a-form-item label="执行人员" required><a-select v-model:value="planForm.operatorIds" mode="multiple" show-search option-filter-prop="label" :options="releaseMemberOptions" /></a-form-item>
        <a-form-item label="验证人员"><a-select v-model:value="planForm.verifierId" show-search option-filter-prop="label" allow-clear :options="releaseMemberOptions" /></a-form-item>
        <a-form-item label="值守人员"><a-select v-model:value="planForm.supportIds" mode="multiple" show-search option-filter-prop="label" :options="releaseMemberOptions" /></a-form-item>
      </a-form>
    </a-modal>
    <a-modal v-model:open="uploadOpen" width="40rem" title="上传文件" centered>
      <template #footer>
        <a-space>
          <a-button @click="uploadOpen = false">取消</a-button>
          <a-button type="primary" :loading="uploadLoading" @click="handleStartUpload">开始上传</a-button>
        </a-space>
      </template>
      <a-upload-dragger class="upload-dragger" :file-list="uploadFiles" name="file" :before-upload="handleBeforeUpload" @remove="handleRemoveUploadFile">
        <p class="upload-icon"><InboxOutlined /></p>
        <p>拖拽文件到此处，或点击选择文件</p>
        <p class="muted">支持：docx、xlsx、pdf、png、jpg、drawio，单个文件不超过 50MB</p>
      </a-upload-dragger>
    </a-modal>
  </section>
</template>

<script setup>
import { BugOutlined, EditOutlined, FileOutlined, FileTextOutlined, InboxOutlined, LeftOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { deleteProjectFile, downloadProjectFile, getProjectBugs, getProjectFiles, getTaskById, updateTask, uploadProjectFile } from '@/api/managementProject'
import { addReleaseMeeting, confirmReleaseMeeting, getIterationWorkflow, getReleaseExecution, getTaskBlocker, getTaskRequirements, setTaskBlocker, submitReleaseReport, updateReleasePlan, verifyReleaseReport } from '@/api/workhub'
import { getAllUsers } from '@/api/system'
import WorkDiscussion from '@/components/WorkDiscussion.vue'
import { useDictStore } from '@/store/dictStore'
import { formatDateTime } from '@/utils/dateTime'

const route = useRoute()
const router = useRouter()
const dictStore = useDictStore()

const loading = ref(false)
const taskDetail = ref(null)
const releaseExecution = ref(null)
const executionWorkflow = ref(null)
const releaseMembers = ref([])
const releaseSaving = ref(false)
const releasePlanOpen = ref(false)
const planForm = ref({})
const reportVerificationNote = ref('')
const meetingLabels = { APPROVED: '同意上线', CONDITIONAL: '有条件同意', DEFERRED: '暂缓上线' }
const applicationLabels = { DRAFT: '草稿', SUBMITTED: '审批中', APPROVED: '已批准', REJECTED: '已驳回', WITHDRAWN: '已撤回' }
const reportLabels = { SUCCESS: '上线成功', ISSUES: '带遗留问题上线', ROLLED_BACK: '已回滚' }
const meetingForm = ref({ heldAt: undefined, chairId: undefined, attendeeIds: [], agenda: '', decisions: '', risks: '', actionItems: '', conclusion: undefined })
const reportForm = ref({ actualStart: undefined, actualEnd: undefined, packageRef: '', executionSteps: '', smokeResult: '', monitoringResult: '', incidentNotes: '', outcome: undefined, residualIssues: '', verifierId: undefined })
const releaseMemberOptions = computed(() => releaseMembers.value.map(item => ({ value: item.id, label: item.realName || item.name || `用户 ${item.id}` })))
const releaseMemberName = id => releaseMemberOptions.value.find(item => String(item.value) === String(id))?.label || (id ? `用户 ${id}` : '-')
const releaseNames = ids => (ids || []).map(releaseMemberName).join('、') || '-'
const meetingConfirmed = meeting => meeting?.attendeeIds?.length && meeting.attendeeIds.every(id => meeting.confirmedIds?.includes(id))
const releaseStage = code => executionWorkflow.value?.stages?.find(stage => stage.stageCode === code)
const openReleasePlan = () => {
  const { environment, windowStart, windowEnd, leadId, operatorIds, verifierId, supportIds, meetingPlannedAt } = releaseExecution.value
  planForm.value = { environment, windowStart, windowEnd, leadId, operatorIds: [...(operatorIds || [])], verifierId, supportIds: [...(supportIds || [])], meetingPlannedAt }
  releasePlanOpen.value = true
}
const saveReleasePlan = async () => {
  const form = planForm.value
  if (!form.environment?.trim() || !form.windowStart || !form.windowEnd || !form.leadId || !form.operatorIds?.length) {
    message.warning('请完整填写环境、上线时间和执行人员'); return
  }
  releaseSaving.value = true
  try {
    releaseExecution.value = await updateReleasePlan(route.params.id, form)
    releasePlanOpen.value = false
    message.success('上线计划已调整并留痕')
  } catch (error) { message.error(error.message || '上线计划保存失败') }
  finally { releaseSaving.value = false }
}
const blocker = ref({})
const relatedRequirements = ref([])
const blockerReason = ref('')
const blockerSaving = ref(false)
const attachmentRows = ref([])
const relatedBugRows = ref([])
const uploadOpen = ref(false)
const uploadLoading = ref(false)
const uploadFiles = ref([])
let taskDetailRequest = 0

const attachmentColumns = [
  { title: '文件名', dataIndex: 'name', width: 230 },
  { title: '类型', dataIndex: 'type', width: 100 },
  { title: '大小', dataIndex: 'size', width: 100 },
  { title: '版本', dataIndex: 'version', width: 100 },
  { title: '上传人', dataIndex: 'uploaderName', width: 120 },
  { title: '上传时间', dataIndex: 'uploadTime', width: 130 },
  { title: '操作', dataIndex: 'operation', width: 110 },
]

const attachments = computed(() =>
  attachmentRows.value.map(item => ({
    id: item.id,
    name: item.originalName || '-',
    type: getFileType(item),
    size: formatFileSize(item.fileSize),
    version: item.versionNo || '-',
    uploaderName: item.uploaderId ? `用户 ${item.uploaderId}` : '-',
    uploadTime: formatShortDateTime(item.uploadedAt),
  }))
)

const operationLogs = computed(() => Array.isArray(taskDetail.value?.logs) ? taskDetail.value.logs : [])
const relatedBugs = computed(() => relatedBugRows.value)

const getDictLabel = (type, value) => {
  if (!value) {
    return ''
  }

  return dictStore.getDictLabel(type, value)
}

const getDateValue = value => {
  if (!value) {
    return '-'
  }

  return String(value).replace('T', ' ').slice(0, 10)
}

const formatShortDateTime = value => {
  if (!value) {
    return '-'
  }

  const text = String(value).replace('T', ' ')
  return text.length > 10 ? text.slice(5, 16) : text
}

const getFileType = file => {
  const fileName = file?.originalName || ''
  const extension = fileName.includes('.') ? fileName.split('.').pop() : ''
  return extension ? extension.toUpperCase() : (file?.contentType || '-')
}

const formatFileSize = size => {
  const value = Number(size)
  if (!Number.isFinite(value)) {
    return '-'
  }
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)}MB`
  }
  return `${Math.ceil(value / 1024)}KB`
}

const getProjectName = task => task?.projectName || task?.project?.name || task?.projectTitle || task?.projectId || '-'
const getUserName = task => task?.assigneeName || task?.assignee?.realName || task?.ownerName || task?.assigneeId || '-'

const getStatusColor = status => {
  const map = { NOT_STARTED: 'default', IN_PROGRESS: 'blue', DUE_SOON: 'orange', OVERDUE: 'red', COMPLETED: 'green', PAUSED: 'purple' }
  return map[status] || 'default'
}

const getPriorityColor = priority => {
  const map = { URGENT: 'red', HIGH: 'orange', MEDIUM: 'blue', LOW: 'default' }
  return map[priority] || 'default'
}

const getBugLevelColor = level => {
  const map = { FATAL: 'red', CRITICAL: 'red', SERIOUS: 'red', HIGH: 'red', MEDIUM: 'orange', LOW: 'blue', NORMAL: 'orange' }
  return map[level] || 'orange'
}

const getBugStatusColor = status => {
  const map = { SUBMITTED: 'blue', CONFIRMED: 'orange', FIXING: 'orange', PENDING_VERIFY: 'purple', CLOSED: 'green', RESOLVED: 'green' }
  return map[status] || 'blue'
}

const formatBugNo = bug => {
  if (bug?.bugNo) return `#${String(bug.bugNo).padStart(3, '0')}`
  if (bug?.code) return bug.code
  return bug?.id ? `BUG-${bug.id}` : '-'
}

const fetchTaskDetail = async () => {
  const taskId = route.params.id
  const requestId = ++taskDetailRequest
  loading.value = true
  taskDetail.value = null
  releaseExecution.value = null
  executionWorkflow.value = null
  uploadOpen.value = false
  uploadFiles.value = []
  attachmentRows.value = []
  relatedBugRows.value = []

  try {
    await dictStore.loadDicts()
    const [detail, files, bugs, blockerInfo, requirements] = await Promise.all([
      getTaskById(taskId),
      getProjectFiles({ businessType: 'TASK', businessId: taskId }),
      fetchAllTaskBugs(taskId),
      getTaskBlocker(taskId),
      getTaskRequirements(taskId),
    ])
    if (requestId !== taskDetailRequest) return
    taskDetail.value = detail
    if (detail?.workType === 'RELEASE_EXECUTION') {
      const execution = await getReleaseExecution(taskId)
      const [users, versionWorkflow] = await Promise.all([getAllUsers({ enabled: true }), getIterationWorkflow(execution.releaseId)])
      if (requestId !== taskDetailRequest) return
      releaseExecution.value = execution
      executionWorkflow.value = versionWorkflow
      releaseMembers.value = Array.isArray(users) ? users : []
      meetingForm.value.chairId = execution.leadId
      meetingForm.value.attendeeIds = [...new Set([execution.leadId, ...(execution.operatorIds || [])].filter(Boolean))]
      reportForm.value.verifierId = execution.verifierId
      if (execution.report?.status === 'REJECTED') {
        const { actualStart, actualEnd, packageRef, executionSteps, smokeResult, monitoringResult, incidentNotes, outcome, residualIssues, verifierId } = execution.report
        reportForm.value = { actualStart, actualEnd, packageRef, executionSteps, smokeResult, monitoringResult, incidentNotes, outcome, residualIssues, verifierId }
      }
    }
    attachmentRows.value = Array.isArray(files) ? files : []
    relatedBugRows.value = bugs
    blocker.value = blockerInfo || {}
    blockerReason.value = blockerInfo?.reason || ''
    relatedRequirements.value = requirements || []
  } catch (error) {
    if (requestId === taskDetailRequest) message.error(error.message || '任务详情加载失败')
  } finally {
    if (requestId === taskDetailRequest) loading.value = false
  }
}

const saveMeeting = async () => {
  const form = meetingForm.value
  if (!form.heldAt || !form.chairId || !form.attendeeIds.length || !form.agenda.trim() || !form.decisions.trim() || !form.conclusion) {
    message.warning('请完整填写会议时间、人员、议题、决定和结论'); return
  }
  releaseSaving.value = true
  try {
    releaseExecution.value = await addReleaseMeeting(route.params.id, form)
    meetingForm.value = { heldAt: undefined, chairId: releaseExecution.value.leadId, attendeeIds: [], agenda: '', decisions: '', risks: '', actionItems: '', conclusion: undefined }
    message.success('会议纪要已留痕')
  } catch (error) { message.error(error.message || '会议纪要提交失败') }
  finally { releaseSaving.value = false }
}

const confirmMeeting = async meetingId => {
  releaseSaving.value = true
  try { releaseExecution.value = await confirmReleaseMeeting(route.params.id, meetingId); message.success('纪要已确认') }
  catch (error) { message.error(error.message || '会议确认失败') }
  finally { releaseSaving.value = false }
}

const saveReport = async () => {
  const form = reportForm.value
  if (!form.actualStart || !form.actualEnd || !form.packageRef.trim() || !form.executionSteps.trim() || !form.smokeResult.trim()
    || !form.monitoringResult.trim() || !form.verifierId || !form.outcome) { message.warning('请完整填写上线执行和验证结果'); return }
  releaseSaving.value = true
  try {
    releaseExecution.value = await submitReleaseReport(route.params.id, { ...form, rolledBack: form.outcome === 'ROLLED_BACK' })
    message.success('上线报告已提交；现在可以完成上线执行任务')
  } catch (error) { message.error(error.message || '上线报告提交失败') }
  finally { releaseSaving.value = false }
}

const confirmReport = async decision => {
  if (!reportVerificationNote.value.trim()) { message.warning('请填写验证依据'); return }
  releaseSaving.value = true
  try {
    releaseExecution.value = await verifyReleaseReport(route.params.id, decision, reportVerificationNote.value.trim())
    reportVerificationNote.value = ''
    message.success(decision === 'APPROVED' ? '上线报告已验证' : '报告已驳回，请执行人修改后重提')
  } catch (error) { message.error(error.message || '报告验证失败') }
  finally { releaseSaving.value = false }
}

const completeReleaseTask = async () => {
  releaseSaving.value = true
  try {
    const start = String(releaseExecution.value.report.actualStart).slice(0, 10)
    const end = String(releaseExecution.value.report.actualEnd).slice(0, 10)
    await updateTask(route.params.id, { actualStartDate: start, actualEndDate: end })
    taskDetail.value = await getTaskById(route.params.id)
    message.success('上线执行任务已完成')
  } catch (error) { message.error(error.message || '任务完成失败') }
  finally { releaseSaving.value = false }
}

const saveBlocker = async () => {
  blockerSaving.value = true
  try {
    blocker.value = await setTaskBlocker(route.params.id, blockerReason.value)
    blockerReason.value = blocker.value.reason || ''
    message.success('阻塞情况已更新')
  } catch (error) {
    message.error(error.message || '阻塞情况保存失败')
  } finally {
    blockerSaving.value = false
  }
}

const fetchAllTaskBugs = async taskId => {
  const pageSize = 200
  const first = await getProjectBugs({ taskId, pageNo: 1, pageSize })
  const records = [...(first.records || [])]
  const total = Number(first.total || records.length)
  const pages = Math.ceil(total / pageSize)
  for (let pageNo = 2; pageNo <= pages; pageNo += 1) {
    const next = await getProjectBugs({ taskId, pageNo, pageSize })
    records.push(...(next.records || []))
  }
  return records
}

const handleBack = () => router.back()
const handleBugClick = bug => router.push({ name: 'BugDetail', params: { id: bug.id } })

const handleBeforeUpload = file => {
  if (file.size > 50 * 1024 * 1024) {
    message.warning('单个文件不能超过50MB')
    return false
  }
  uploadFiles.value.push({
    uid: file.uid,
    name: file.name,
    status: 'done',
    originFile: file,
  })
  return false
}

const handleRemoveUploadFile = file => {
  uploadFiles.value = uploadFiles.value.filter(item => item.uid !== file.uid)
}

const refreshAttachments = async () => {
  const files = await getProjectFiles({ businessType: 'TASK', businessId: route.params.id })
  attachmentRows.value = Array.isArray(files) ? files : []
}

const handleStartUpload = async () => {
  if (!uploadFiles.value.length) {
    message.warning('请选择需要上传的文件')
    return
  }

  uploadLoading.value = true
  try {
    for (const uploadFile of uploadFiles.value) {
      const data = new FormData()
      data.append('businessType', 'TASK')
      data.append('businessId', route.params.id)
      data.append('storageLocation', 'BUSINESS')
      data.append('file', uploadFile.originFile)
      await uploadProjectFile(data)
    }
    message.success('文件上传成功')
    uploadOpen.value = false
    uploadFiles.value = []
    await refreshAttachments()
  } catch (error) {
    message.error(error.message || '文件上传失败')
  } finally {
    uploadLoading.value = false
  }
}

const handleDownloadAttachment = async record => {
  try {
    const result = await downloadProjectFile(record.id)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(result.blob)
    link.download = result.fileName
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (error) {
    message.error(error.message || '附件下载失败')
  }
}

const handleDeleteAttachment = async record => {
  try {
    await deleteProjectFile(record.id)
    attachmentRows.value = attachmentRows.value.filter(item => item.id !== record.id)
    message.success('附件删除成功')
  } catch (error) {
    message.error(error.message || '附件删除失败')
  }
}

watch(() => route.params.id, fetchTaskDetail, { immediate: true })
</script>

<style scoped>
.release-execution-card { margin-bottom: 16px; }
.release-steps { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.release-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; margin-top: 16px; }
.release-form > .ant-form-item:nth-of-type(n + 5) { grid-column: 1 / -1; }
.release-form > .ant-btn { justify-self: start; }
@media (max-width: 720px) { .release-form { grid-template-columns: 1fr; } .release-form > .ant-form-item { grid-column: 1; } }
.task-detail-page {
  min-height: 100%;
}

.detail-actions {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 8px;
}

.back-button {
  width: 124px;
}

.detail-card {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  box-shadow: none;
}

.detail-card :deep(.ant-card-body) {
  padding: 14px 18px;
}

.task-summary-card {
  margin-bottom: 12px;
}

.native-info-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  color: #111827;
}

.native-info-table th,
.native-info-table td {
  height: 34px;
  padding: 8px 11px;
  font-size: 14px;
  text-align: left;
  border: 1px solid #edf0f3;
  word-break: break-word;
}

.native-info-table th {
  width: 10%;
  color: #111827;
  font-weight: 500;
  background: #fafafa;
}

.native-info-table td {
  width: 20%;
  background: #fff;
}

.detail-content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 12px;
  align-items: start;
}

.detail-main {
  min-width: 0;
}

.attachment-card {
  margin-bottom: 12px;
}

.attachment-card :deep(.ant-card-head),
.log-card :deep(.ant-card-head),
.related-bugs-card :deep(.ant-card-head) {
  min-height: 36px;
  padding: 0 16px;
  border-bottom: 0;
}

.attachment-card :deep(.ant-card-head-title),
.log-card :deep(.ant-card-head-title),
.related-bugs-card :deep(.ant-card-head-title) {
  padding: 8px 0;
}

.attachment-card :deep(.ant-card-extra) {
  padding: 6px 0;
}

.attachment-card :deep(.ant-btn-primary) {
  height: 30px;
}

.section-title {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: #111827;
  font-size: 16px;
  font-weight: 700;
}

.file-name {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.log-card {
  min-height: 334px;
}

.log-card :deep(.ant-card-body) {
  max-height: 336px;
  overflow-x: hidden;
  overflow-y: auto;
}

.log-meta {
  color: #8c8c8c;
  font-size: 13px;
}

.log-card p {
  margin: 6px 0 0;
  color: #111827;
}

.related-bugs-card {
  min-width: 0;
}

.related-bugs-card .detail-card {
  min-height: 456px;
}

.related-bugs-card :deep(.ant-card-body) {
  max-height: 520px;
  overflow: auto;
}

.upload-dragger {
  margin-bottom: 12px;
}

.upload-icon {
  color: #1677ff;
  font-size: 42px;
}

.bug-card {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.bug-card:hover {
  background: #f0f0f0;
}

.bug-card + .bug-card {
  margin-top: 10px;
}

.bug-card p {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin: 0 0 4px;
  color: #8c8c8c;
}

.bug-card strong {
  display: block;
  margin-bottom: 8px;
  color: #111827;
  font-weight: 500;
}

</style>
