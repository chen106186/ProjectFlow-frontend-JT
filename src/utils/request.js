const buildUrl = (url, params) => {
  const searchParams = new URLSearchParams()

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value)
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `${url}?${queryString}` : url
}

export const request = async (url, options = {}) => {
  const { params, body, headers, ...fetchOptions } = options
  const isFormData = body instanceof FormData
  const response = await fetch(buildUrl(url, params), {
    ...fetchOptions,
    headers: {
      ...(isFormData ? {} : body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  })
  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('application/json')) {
    throw new Error(`接口返回格式异常，请确认后端服务已启动：${url}`)
  }

  const result = await response.json()

  if (!response.ok || result.code !== 0) {
    throw new Error(result.message || '请求失败')
  }

  return result.data
}

export const download = async (url) => {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('文件下载失败')
  }

  const disposition = response.headers.get('content-disposition') || ''
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1]
  return {
    blob: await response.blob(),
    fileName: encodedName ? decodeURIComponent(encodedName) : 'download',
  }
}
