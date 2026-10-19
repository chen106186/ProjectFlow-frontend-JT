import assert from 'node:assert/strict'
import test from 'node:test'
import { canEditRequirement, canReviewRequirement, canViewAllStatistics, getStoredProfile, isAdminProfile } from '../src/utils/authScope.js'
import { getNoticeRoute } from '../src/utils/noticeNavigation.js'
import { fetchAllPages } from '../src/utils/pagination.js'
import { buildBugFilters } from '../src/utils/exportFilters.js'
import { deliveryProjectIds } from '../src/utils/deliveryProjects.js'

test('requirement creator edits while the assigned reviewer reviews', () => {
  const requirement = { createdBy: 11, reviewerId: 22 }
  assert.equal(canEditRequirement(requirement, { id: '11' }), true)
  assert.equal(canReviewRequirement(requirement, { id: '11' }), false)
  assert.equal(canReviewRequirement(requirement, { id: '22' }), true)
  assert.equal(canEditRequirement(requirement, { id: '22' }), false)
  assert.equal(canReviewRequirement(requirement, { id: 33 }), false)
  assert.equal(canReviewRequirement({ createdBy: 11 }, { id: 11 }), true)
})

test('administrator access comes from assigned roles instead of account name', () => {
  assert.equal(isAdminProfile({ username: 'admin', roles: [] }), false)
  assert.equal(isAdminProfile({ roles: [{ name: '管理员', code: 'USER' }] }), false)
  assert.equal(canViewAllStatistics({ permissions: ['system:user:update'], roles: [] }), false)
  assert.equal(canViewAllStatistics({ permissions: ['data:view:all'], roles: [] }), true)
  const administrator = { id: 33, roles: [{ code: 'ADMIN' }] }
  assert.equal(canEditRequirement({ createdBy: 11 }, administrator), true)
  assert.equal(canReviewRequirement({ createdBy: 11, reviewerId: 22 }, administrator), true)
})

test('stored identity supports userId and prefers the server profile', () => {
  let values = { userInfo: JSON.stringify({ userId: 11 }) }
  globalThis.localStorage = { getItem: key => values[key] ?? null }
  assert.equal(getStoredProfile().id, 11)
  values.authProfile = JSON.stringify({ id: 22, roles: [{ code: 'USER' }] })
  assert.equal(getStoredProfile().id, 22)
  values = { userInfo: JSON.stringify({ id: 33 }) }
  assert.equal(getStoredProfile().id, 33)
  delete globalThis.localStorage
})

test('requirement and task notices open their matching detail routes', () => {
  assert.deepEqual(getNoticeRoute({ businessType: 'Requirement', businessId: 42 }), {
    name: 'PersonalRequirementDetail', params: { id: '42' },
  })
  assert.deepEqual(getNoticeRoute({ businessType: 'Task', businessId: 7 }), {
    name: 'PersonalTaskDetail', params: { id: '7' },
  })
  assert.equal(getNoticeRoute({ businessType: 'SYSTEM' }), null)
})

test('personnel selection loads beyond 200 records using valid page sizes', async () => {
  const users = Array.from({ length: 450 }, (_, id) => ({ id }))
  const calls = []
  const result = await fetchAllPages(async params => {
    calls.push(params)
    const start = (params.pageNo - 1) * params.pageSize
    return { records: users.slice(start, start + params.pageSize), total: users.length }
  }, { enabled: true, pageSize: 500 })
  assert.deepEqual(result, users)
  assert.deepEqual(calls.map(call => call.pageNo), [1, 2, 3])
  assert.ok(calls.every(call => call.pageSize === 200 && call.enabled === true))
})

test('personnel pagination finishes on an exact boundary and propagates failures', async () => {
  let calls = 0
  const result = await fetchAllPages(async () => {
    calls += 1
    return { records: Array.from({ length: 200 }, (_, id) => ({ id })), total: 200 }
  })
  assert.equal(result.length, 200)
  assert.equal(calls, 1)
  await assert.rejects(fetchAllPages(async () => { throw new Error('没有权限') }), /没有权限/)
})

test('bug list and export share the created-date range filter', () => {
  assert.deepEqual(buildBugFilters({ status: 'PENDING_FIX', createdAtRange: ['2026-10-01', '2026-10-31'] }), {
    status: 'PENDING_FIX', createdFrom: '2026-10-01', createdTo: '2026-10-31',
  })
  assert.deepEqual(buildBugFilters({ createdAtRange: [] }), {})
})

test('delivery scope includes related management and execution projects only', () => {
  const projects = [
    { id: 100 }, { id: 200, managementProjectId: 100 },
    { id: 201, managementProjectId: 100 }, { id: 300 },
  ]
  assert.deepEqual(deliveryProjectIds(projects, 100), [100, 200, 201])
  assert.deepEqual(deliveryProjectIds(projects, 200), [200, 100])
  assert.deepEqual(deliveryProjectIds(projects, 300), [300])
})
