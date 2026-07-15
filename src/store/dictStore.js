import { computed, readonly, reactive } from 'vue'
import { getDicts } from '@/api/managementProject'

const state = reactive({
  loaded: false,
  loading: false,
  groups: {},
})
let loadingPromise = null

const requirementStatusItems = [
  { label: '待评审', value: 'PENDING_REVIEW', sortOrder: 1 },
  { label: '已采纳', value: 'ACCEPTED', sortOrder: 2 },
  { label: '未采纳', value: 'REJECTED', sortOrder: 3 },
  { label: '已搁置', value: 'SHELVED', sortOrder: 4 },
]

const normalizeDictGroups = groups => {
  return groups.reduce((result, group) => {
    const items = group.type === 'requirementStatus'
      ? requirementStatusItems
      : group.items

    result[group.type] = {
      name: group.name,
      items: [...items].sort((prev, next) => prev.sortOrder - next.sortOrder),
    }

    return result
  }, {})
}

export const useDictStore = () => {
  const loadDicts = async () => {
    if (state.loaded) {
      return
    }

    if (loadingPromise) {
      return loadingPromise
    }

    state.loading = true
    loadingPromise = getDicts()
      .then(groups => {
        state.groups = normalizeDictGroups(groups)
        state.loaded = true
      })
      .finally(() => {
        state.loading = false
        loadingPromise = null
      })

    return loadingPromise
  }

  const getDictItems = type => state.groups[type]?.items || []

  const getDictLabel = (type, value) => {
    return getDictItems(type).find(item => item.value === value)?.label || value
  }

  return {
    state: readonly(state),
    dictGroups: computed(() => state.groups),
    loadDicts,
    getDictItems,
    getDictLabel,
  }
}
