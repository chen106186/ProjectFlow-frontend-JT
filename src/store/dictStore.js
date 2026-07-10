import { computed, readonly, reactive } from 'vue'
import { getDicts } from '@/api/managementProject'

const state = reactive({
  loaded: false,
  loading: false,
  groups: {},
})
let loadingPromise = null

const normalizeDictGroups = groups => {
  return groups.reduce((result, group) => {
    result[group.type] = {
      name: group.name,
      items: [...group.items].sort((prev, next) => prev.sortOrder - next.sortOrder),
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
