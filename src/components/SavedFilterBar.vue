<template>
  <div class="saved-filter-bar">
    <a-select v-model:value="selectedId" allow-clear placeholder="我的常用筛选" style="min-width: 180px" :options="views.map(view => ({ value: view.id, label: view.name }))" @change="applySelected" />
    <a-input v-if="naming" v-model:value="name" :maxlength="80" placeholder="输入视图名称" style="width: 160px" @pressEnter="save" />
    <a-button :loading="saving" @click="naming ? save() : naming = true">{{ naming ? '确认保存' : '保存当前筛选' }}</a-button>
    <a-popconfirm v-if="selectedId" title="删除这个常用筛选？" @confirm="remove"><a-button type="link" danger>删除</a-button></a-popconfirm>
  </div>
</template>

<script setup>
import { message } from 'ant-design-vue'
import { ref, watch } from 'vue'
import { deleteWorkView, listSavedViews, saveWorkView } from '@/api/workhub'

const props = defineProps({ scope: { type: String, required: true }, filters: { type: Object, required: true } })
const emit = defineEmits(['apply'])
const views = ref([])
const selectedId = ref()
const naming = ref(false)
const name = ref('')
const saving = ref(false)

const load = async () => {
  try { views.value = await listSavedViews(props.scope) || [] }
  catch (error) { message.error(error.message || '常用筛选加载失败') }
}
watch(() => props.scope, load, { immediate: true })

const applySelected = id => {
  const view = views.value.find(item => item.id === id)
  if (!view) return
  try { emit('apply', JSON.parse(view.filtersJson)) }
  catch { message.error('已保存的筛选条件损坏') }
}
const save = async () => {
  if (!name.value.trim()) { message.warning('请输入视图名称'); return }
  saving.value = true
  try {
    views.value = await saveWorkView({ name: name.value.trim(), scope: props.scope, filters: props.filters })
    naming.value = false
    name.value = ''
    message.success('常用筛选已保存')
  } catch (error) {
    message.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}
const remove = async () => {
  try {
    await deleteWorkView(selectedId.value)
    selectedId.value = undefined
    await load()
    message.success('视图已删除')
  } catch (error) { message.error(error.message || '删除失败') }
}
</script>

<style scoped>
.saved-filter-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
</style>
