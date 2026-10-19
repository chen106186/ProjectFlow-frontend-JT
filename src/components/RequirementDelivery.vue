<template>
  <a-card :bordered="false" title="需求交付与验收">
    <a-spin :spinning="loading">
      <div class="delivery-progress">
        <a-tag color="blue">关联任务 {{ delivery.tasks?.length || 0 }}</a-tag>
        <a-tag color="green">已完成 {{ delivery.completedCount || 0 }}</a-tag>
        <a-tag :color="acceptanceColor">验收：{{ acceptanceLabel }}</a-tag>
      </div>
      <div v-if="canLink" class="delivery-link-editor">
        <a-select v-model:value="taskIds" mode="multiple" show-search option-filter-prop="label" :options="taskOptions"
          placeholder="选择同项目任务" style="flex: 1; min-width: 260px" />
        <a-button :loading="savingLinks" @click="saveLinks">保存关联</a-button>
      </div>
      <a-table :data-source="delivery.tasks || []" :columns="columns" row-key="id" size="small" :pagination="false">
        <template #bodyCell="{ column, record }">
          <a-button v-if="column.dataIndex === 'name'" type="link" @click="router.push({ name: 'AllTaskDetail', params: { id: record.id } })">{{ record.name }}</a-button>
          <a-tag v-else-if="column.dataIndex === 'status'" :color="record.status === 'COMPLETED' ? 'green' : 'orange'">{{ record.status }}</a-tag>
          <span v-else-if="column.dataIndex === 'blockerReason'">{{ record.blockerReason || '-' }}</span>
        </template>
      </a-table>
      <p v-if="delivery.acceptance?.conclusion" class="delivery-conclusion">验收意见：{{ delivery.acceptance.conclusion }}</p>
      <div v-if="canAccept && requirement.status === 'ACCEPTED'" class="delivery-acceptance">
        <a-select v-model:value="result" :options="resultOptions" style="width: 140px" />
        <a-input v-model:value="conclusion" :maxlength="2000" placeholder="填写验收依据或未通过原因" style="flex: 1" />
        <a-button type="primary" :loading="savingAcceptance" @click="saveAcceptance">提交验收</a-button>
      </div>
    </a-spin>
  </a-card>
</template>

<script setup>
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getProjectList, getProjectTasks } from '@/api/managementProject'
import { acceptRequirement, getRequirementDelivery, setRequirementTasks } from '@/api/workhub'
import { deliveryProjectIds } from '@/utils/deliveryProjects'
import { fetchAllPages } from '@/utils/pagination'

const props = defineProps({
  requirement: { type: Object, required: true },
  canLink: { type: Boolean, default: false },
  canAccept: { type: Boolean, default: false },
})
const router = useRouter()
const delivery = ref({ tasks: [], acceptance: { result: 'PENDING' } })
const taskOptions = ref([])
const taskIds = ref([])
const result = ref('PENDING')
const conclusion = ref('')
const loading = ref(false)
const savingLinks = ref(false)
const savingAcceptance = ref(false)
const columns = [
  { title: '关联任务', dataIndex: 'name' },
  { title: '状态', dataIndex: 'status', width: 130 },
  { title: '未关闭 Bug', dataIndex: 'openBugCount', width: 120 },
  { title: '阻塞原因', dataIndex: 'blockerReason' },
]
const resultOptions = [
  { label: '待验收', value: 'PENDING' }, { label: '验收通过', value: 'PASSED' }, { label: '验收未通过', value: 'FAILED' },
]
const acceptanceLabel = computed(() => resultOptions.find(option => option.value === delivery.value.acceptance?.result)?.label || '待验收')
const acceptanceColor = computed(() => ({ PASSED: 'green', FAILED: 'red' }[delivery.value.acceptance?.result] || 'orange'))

const syncDelivery = value => {
  delivery.value = value || { tasks: [], acceptance: { result: 'PENDING' } }
  taskIds.value = (delivery.value.tasks || []).map(task => task.id)
  result.value = delivery.value.acceptance?.result || 'PENDING'
  conclusion.value = delivery.value.acceptance?.conclusion || ''
}

watch(() => [props.requirement.id, props.requirement.projectId], async ([id, projectId]) => {
  if (!id || !projectId) return
  loading.value = true
  try {
    const [data, projects] = await Promise.all([
      getRequirementDelivery(id),
      props.canLink ? fetchAllPages(getProjectList) : Promise.resolve([]),
    ])
    const taskPages = props.canLink
      ? await Promise.all(deliveryProjectIds(projects, projectId).map(scopeId => fetchAllPages(getProjectTasks, { projectId: scopeId })))
      : []
    const tasks = taskPages.flat()
    syncDelivery(data)
    taskOptions.value = tasks.map(task => ({ value: task.id, label: `${task.projectName || task.projectId} · ${task.name} · ${task.status}` }))
  } catch (error) {
    message.error(error.message || '交付信息加载失败')
  } finally {
    loading.value = false
  }
}, { immediate: true })

const saveLinks = async () => {
  savingLinks.value = true
  try {
    syncDelivery(await setRequirementTasks(props.requirement.id, taskIds.value))
    message.success('关联任务已保存；范围变化时原验收结论会重置')
  } catch (error) {
    message.error(error.message || '关联任务保存失败')
  } finally {
    savingLinks.value = false
  }
}

const saveAcceptance = async () => {
  savingAcceptance.value = true
  try {
    syncDelivery(await acceptRequirement(props.requirement.id, { result: result.value, conclusion: conclusion.value }))
    message.success('验收结论已保存')
  } catch (error) {
    message.error(error.message || '验收失败')
  } finally {
    savingAcceptance.value = false
  }
}
</script>

<style scoped>
.delivery-progress, .delivery-link-editor, .delivery-acceptance { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 14px; }
.delivery-conclusion { margin: 14px 0; white-space: pre-wrap; }
.delivery-acceptance { margin-top: 16px; }
</style>
