import { message } from 'ant-design-vue'
import { ref } from 'vue'
import { downloadGet } from '@/utils/request'

export const useExport = () => {
  const exporting = ref(false)
  const exportRows = async (resource, params, filename = `${resource}.xlsx`) => {
    if (exporting.value) return
    exporting.value = true
    try {
      await downloadGet(`/api/exports/${resource}`, filename, { params })
    } catch (error) {
      message.error(error.message || '导出失败')
    } finally {
      exporting.value = false
    }
  }
  return { exporting, exportRows }
}
