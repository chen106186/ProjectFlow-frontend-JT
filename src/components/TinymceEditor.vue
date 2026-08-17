<template>
  <div class="tinymce-editor">
    <Editor
      ref="vueEditorRef"
      :model-value="modelValue"
      :disabled="disabled"
      :init="editorConfig"
      @update:model-value="value => emit('update:modelValue', value)"
    />
  </div>
</template>

<script setup>
import Editor from '@tinymce/tinymce-vue'
import { message } from 'ant-design-vue'
import 'tinymce/tinymce'
import 'tinymce/icons/default/icons'
import 'tinymce/models/dom/model'
import 'tinymce/themes/silver/theme'
import 'tinymce/plugins/image/plugin'
import 'tinymce/plugins/lists/plugin'
import 'tinymce/skins/ui/oxide/skin.min.css'
import 'tinymce/skins/ui/oxide/content.min.css'
import { onBeforeUnmount, ref } from 'vue'

import { request } from '@/utils/request'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  height: {
    type: Number,
    default: 300,
  },
  placeholder: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])
const vueEditorRef = ref()
const previewImageSources = new Map()
const previewImageRequests = new Map()
const ossHostPattern = /^https:\/\/company-project-oss\.oss-cn-shanghai\.aliyuncs\.com\/(.+)$/i
const inlineImagePattern = /^(?:https?:\/\/[^/]+)?\/api\/files\/[^/?#]+\/inline(?:[?#].*)?$/i
let editorInstance

const uploadImage = async file => {
  const data = new FormData()
  data.append('file', file)
  const response = await request('/api/files/upload-image', {
    method: 'POST',
    body: data,
  })

  if (response?.errno !== 0 || !response.data?.url) {
    throw new Error(response?.message || '图片上传失败')
  }

  return response.data.url
}

const getImageRequestUrl = sourceUrl => {
  const value = sourceUrl?.trim()
  if (!value) return null

  const privateOssMatch = value.match(ossHostPattern)
  if (privateOssMatch) {
    return `/api/files/rich-text-image?key=${encodeURIComponent(decodeURIComponent(privateOssMatch[1]))}`
  }

  return inlineImagePattern.test(value) ? value : null
}

const createImagePreview = (sourceUrl, requestUrl) => {
  const cachedRequest = previewImageRequests.get(sourceUrl)
  if (cachedRequest) return cachedRequest

  const previewRequest = request(requestUrl, { responseType: 'blob' })
    .then(response => {
      const previewUrl = URL.createObjectURL(response.data)
      previewImageSources.set(previewUrl, sourceUrl)
      return previewUrl
    })
    .catch(error => {
      previewImageRequests.delete(sourceUrl)
      throw error
    })

  previewImageRequests.set(sourceUrl, previewRequest)
  return previewRequest
}

const uploadImagePreview = async file => {
  const sourceUrl = await uploadImage(file)
  return createImagePreview(sourceUrl, sourceUrl)
}

const handleImageUpload = blobInfo =>
  uploadImagePreview(blobInfo.blob())
    .catch(error => Promise.reject(error.message || '图片上传失败'))

const handleImagePicker = (callback, _value, meta) => {
  if (meta.filetype !== 'image') return

  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return

    try {
      const previewUrl = await uploadImagePreview(file)
      callback(previewUrl, { alt: file.name, title: file.name })
    } catch (error) {
      message.error(error.message || '图片上传失败')
    }
  }
  input.click()
}

const getEditor = () => editorInstance || vueEditorRef.value?.getEditor()

const clear = () => {
  const editor = getEditor()
  if (editor) {
    editor.setContent('')
  }
  emit('update:modelValue', '')
}

const setHtml = html => {
  const content = html || ''
  getEditor()?.setContent(content)
  emit('update:modelValue', content)
}

const isEmpty = () => {
  const editor = getEditor()
  if (!editor) {
    const container = document.createElement('div')
    container.innerHTML = props.modelValue || ''
    return !container.textContent?.trim() && !container.querySelector('img, video, audio, iframe, table, hr')
  }

  const text = editor.getContent({ format: 'text' }).trim()
  const media = editor.getBody()?.querySelector('img, video, audio, iframe, table, hr')
  return !text && !media
}

const hydrateEditorImages = editor => {
  const images = editor.getBody()?.querySelectorAll('img') || []
  Array.from(images).forEach(img => {
    const sourceUrl = img.getAttribute('src')
    const requestUrl = getImageRequestUrl(sourceUrl)
    if (!requestUrl) return

    createImagePreview(sourceUrl, requestUrl)
      .then(previewUrl => {
        if (!img.isConnected) return
        img.setAttribute('src', previewUrl)
        img.setAttribute('data-mce-src', previewUrl)
      })
      .catch(() => {
        img.setAttribute('alt', '图片加载失败')
      })
  })
}

const restoreImageSources = content => {
  let restoredContent = content
  previewImageSources.forEach((sourceUrl, previewUrl) => {
    restoredContent = restoredContent?.split(previewUrl).join(sourceUrl)
  })
  return restoredContent
}

const clearImagePreviews = () => {
  previewImageSources.forEach((_sourceUrl, previewUrl) => URL.revokeObjectURL(previewUrl))
  previewImageSources.clear()
  previewImageRequests.clear()
}

const updatePlaceholder = editor => {
  const body = editor.getBody()
  if (!body) return

  const hasText = editor.getContent({ format: 'text' }).trim()
  const hasMedia = body.querySelector('img, video, audio, iframe, table, hr')
  body.setAttribute('data-placeholder', props.placeholder)
  body.classList.toggle('tinymce-placeholder-visible', !hasText && !hasMedia)
}

const editorConfig = {
  height: props.height,
  menubar: false,
  statusbar: false,
  branding: false,
  resize: false,
  skin: false,
  content_css: false,
  plugins: 'image lists',
  toolbar: 'blocks fontsize | bold italic underline strikethrough | forecolor backcolor | bullist numlist | alignleft aligncenter alignright | image',
  automatic_uploads: true,
  paste_data_images: true,
  file_picker_types: 'image',
  images_upload_handler: handleImageUpload,
  file_picker_callback: handleImagePicker,
  content_style: 'body { position: relative; font-family: Arial, "Microsoft YaHei", sans-serif; font-size: 14px; } body.tinymce-placeholder-visible::before { position: absolute; color: #bfbfbf; content: attr(data-placeholder); pointer-events: none; } img { max-width: 100%; height: auto; }',
  setup(editor) {
    editorInstance = editor
    editor.on('init SetContent', () => {
      updatePlaceholder(editor)
      hydrateEditorImages(editor)
    })
    editor.on('change input undo redo', () => updatePlaceholder(editor))
    editor.on('GetContent', event => {
      event.content = restoreImageSources(event.content)
    })
  },
}

onBeforeUnmount(clearImagePreviews)

defineExpose({
  clear,
  isEmpty,
  setHtml,
})
</script>

<style scoped>
.tinymce-editor {
  width: 100%;
}

.tinymce-editor :deep(.tox-tinymce) {
  border-color: #d9d9d9;
  border-radius: 8px;
}
</style>
