import dayjs from 'dayjs'

export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

export const formatDateTime = value => {
  if (!value) return '-'

  const normalized = typeof value === 'string' ? value.replace('T', ' ') : value
  const date = dayjs(normalized)

  if (date.isValid()) {
    return date.format(DATE_TIME_FORMAT)
  }

  const text = String(value).replace('T', ' ')
  return text.length >= 19 ? text.slice(0, 19) : text
}
