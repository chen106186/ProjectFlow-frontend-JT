export const OPERATION_MODULES = {
  MANAGEMENT_PROJECT: 'MANAGEMENT_PROJECT',
  EXECUTION_PROJECT: 'EXECUTION_PROJECT',
  TASK: 'TASK',
}

export const OPERATION_ACTIONS = {
  QUERY: 'QUERY',
  DETAIL: 'DETAIL',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
}

// 操作日志由后端服务端自动记录，前端无需主动上报
export async function recordOperationLog(_payload) {}
