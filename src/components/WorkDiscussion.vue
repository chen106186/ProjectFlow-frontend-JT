<template>
  <a-card :bordered="false" title="讨论与提及">
    <a-spin :spinning="loading">
      <a-empty v-if="!loading && !comments.length" description="暂无评论" />
      <div v-for="item in comments" :key="item.id" class="work-comment">
        <div class="work-comment__meta">{{ item.authorName || `用户 ${item.authorId}` }} · {{ formatDateTime(item.createdAt) }}</div>
        <p>{{ item.content }}</p>
      </div>
    </a-spin>
    <a-textarea v-model:value="content" :rows="3" :maxlength="4000" show-count placeholder="补充进展、问题或处理依据" />
    <div class="work-comment__actions">
      <a-select v-model:value="mentionedUserIds" mode="multiple" allow-clear show-search option-filter-prop="label"
        :options="mentionOptions" placeholder="@ 提及项目成员并通知" style="min-width: 260px; flex: 1" />
      <a-button type="primary" :loading="sending" :disabled="!content.trim()" @click="submit">发表评论</a-button>
    </div>
  </a-card>
</template>

<script setup>
import { message } from 'ant-design-vue'
import { ref, watch } from 'vue'
import { addWorkComment, getMentionCandidates, listWorkComments } from '@/api/workhub'
import { formatDateTime } from '@/utils/dateTime'

const props = defineProps({ type: { type: String, required: true }, id: { type: [String, Number], required: true } })
const comments = ref([])
const mentionOptions = ref([])
const content = ref('')
const mentionedUserIds = ref([])
const loading = ref(false)
const sending = ref(false)

watch(() => [props.type, props.id], async ([type, id]) => {
  comments.value = []
  mentionOptions.value = []
  content.value = ''
  mentionedUserIds.value = []
  if (!id) return
  loading.value = true
  try {
    const [items, users] = await Promise.all([listWorkComments(type, id), getMentionCandidates(type, id)])
    comments.value = items || []
    mentionOptions.value = (users || []).map(user => ({ value: user.id, label: user.name || `用户 ${user.id}` }))
  } catch (error) {
    message.error(error.message || '评论加载失败')
  } finally {
    loading.value = false
  }
}, { immediate: true })

const submit = async () => {
  if (!content.value.trim()) return
  sending.value = true
  try {
    comments.value = await addWorkComment(props.type, props.id, {
      content: content.value.trim(), mentionedUserIds: mentionedUserIds.value,
    })
    content.value = ''
    mentionedUserIds.value = []
    message.success('评论已发送')
  } catch (error) {
    message.error(error.message || '评论发送失败')
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.work-comment { padding: 12px 0; border-bottom: 1px solid #edf0f4; }
.work-comment:last-of-type { margin-bottom: 14px; }
.work-comment__meta { color: #7d8795; font-size: 12px; margin-bottom: 6px; }
.work-comment p { white-space: pre-wrap; margin: 0; }
.work-comment__actions { display: flex; gap: 12px; align-items: center; margin-top: 12px; }
</style>
