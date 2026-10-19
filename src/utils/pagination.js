export const fetchAllPages = async (fetchPage, params = {}) => {
  const pageSize = 200
  const records = []
  for (let pageNo = 1; ; pageNo += 1) {
    const result = await fetchPage({ ...params, pageNo, pageSize })
    const page = result?.records || []
    records.push(...page)
    if (page.length < pageSize || records.length >= Number(result?.total ?? records.length)) return records
  }
}
