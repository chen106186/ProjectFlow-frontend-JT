<template>
  <section class="user-management">
    <a-card class="prototype-card filter-panel" :bordered="false">
      <a-form class="user-filter" layout="inline">
        <a-form-item label="搜索">
          <a-input v-model:value="queryParams.keyword" class="filter-input" placeholder="请输入姓名/账号" allow-clear />
        </a-form-item>
        <a-form-item label="所属部门">
          <a-select v-model:value="queryParams.departmentId" class="filter-select" :options="departmentFilterOptions" />
        </a-form-item>
        <a-form-item label="角色">
          <a-select v-model:value="queryParams.roleId" class="filter-select" :options="roleFilterOptions" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="queryParams.enabled" class="filter-select" :options="statusOptions" />
        </a-form-item>
        <a-form-item class="filter-actions">
          <a-space>
            <a-button type="primary" :loading="tableLoading" @click="handleSearch">查询</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <div class="content-grid">
      <a-card class="prototype-card org-card" :bordered="false">
        <a-spin :spinning="deptLoading">
          <a-tree
            v-model:selectedKeys="selectedDepartmentKeys"
            :tree-data="departmentTree"
            default-expand-all
            block-node
            @select="handleDepartmentSelect"
          />
        </a-spin>
      </a-card>

      <a-card class="prototype-card list-card" :bordered="false">
        <div class="list-toolbar">
          <a-button type="primary" @click="handleAdd">
            <template #icon><PlusOutlined /></template>
            新增用户
          </a-button>
        </div>

        <a-table
          row-key="id"
          :columns="columns"
          :data-source="users"
          :loading="tableLoading"
          :pagination="pagination"
          :scroll="{ x: 940 }"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'roleNames'">
              <a-tag v-for="name in record.roleNames" :key="name" color="blue">{{ name }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'enabled'">
              <a-switch
                :checked="record.enabled"
                size="small"
                :loading="record._switching"
                @change="checked => handleStatusChange(record, checked)"
              />
              <span :class="['status-text', { 'status-text--disabled': !record.enabled }]">
                {{ record.enabled ? '启用' : '停用' }}
              </span>
            </template>
            <template v-else-if="column.dataIndex === 'email'">
              <a class="email-link">{{ record.email }}</a>
            </template>
            <template v-else-if="column.dataIndex === 'actions'">
              <a-space>
                <a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
                <a-button type="link" size="small" @click="handleResetPassword(record)">重置密码</a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- 新增/编辑用户弹窗 -->
    <a-modal
      v-model:open="userModalOpen"
      :title="modalMode === 'create' ? '新增用户' : '编辑用户'"
      width="640px"
      :confirm-loading="submitLoading"
      ok-text="确认"
      cancel-text="取消"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form ref="formRef" class="user-form" :model="formState" :rules="formRules" :label-col="{ span: 5 }" :wrapper-col="{ span: 17 }">
        <a-form-item label="姓名" name="realName">
          <a-input v-model:value="formState.realName" placeholder="请输入姓名" />
        </a-form-item>
        <a-form-item label="登录账号" name="username">
          <a-input v-model:value="formState.username" placeholder="请输入登录账号" :disabled="modalMode === 'edit'" />
        </a-form-item>
        <a-form-item label="所属部门" name="departmentId">
          <a-select v-model:value="formState.departmentId" placeholder="请选择所属部门" :options="departmentSelectOptions" />
        </a-form-item>
        <a-form-item label="角色" name="roleIds">
          <a-select
            v-model:value="formState.roleIds"
            mode="multiple"
            placeholder="请选择角色"
            :options="roleSelectOptions"
          />
        </a-form-item>
        <a-form-item label="手机号" name="phone">
          <a-input v-model:value="formState.phone" placeholder="请输入手机号" />
        </a-form-item>
        <a-form-item label="邮箱" name="email">
          <a-input v-model:value="formState.email" placeholder="请输入邮箱" />
        </a-form-item>
        <a-form-item v-if="modalMode === 'create'" label="初始密码" name="password">
          <a-input-password v-model:value="formState.password" placeholder="请输入初始密码" />
        </a-form-item>
        <a-form-item label="账号状态" name="enabled">
          <a-switch v-model:checked="formState.enabled" checked-children="启用" un-checked-children="停用" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 重置密码弹窗 -->
    <a-modal
      v-model:open="resetPwdModalOpen"
      title="重置密码"
      width="400px"
      :confirm-loading="resetPwdLoading"
      ok-text="确认"
      cancel-text="取消"
      @ok="handleConfirmResetPassword"
      @cancel="resetPwdModalOpen = false"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }" style="padding-top: 16px">
        <a-form-item label="新密码">
          <a-input-password v-model:value="newPassword" placeholder="请输入新密码" />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup>
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  assignUserRoles,
  createUser,
  getDepartments,
  getRoleList,
  getUserList,
  resetUserPassword,
  updateUser,
  updateUserEnabled,
} from '@/api/system'

const columns = [
  { title: '序号', key: 'index', width: 72, customRender: ({ index }) => index + 1 },
  { title: '姓名', dataIndex: 'realName', key: 'realName', width: 100 },
  { title: '登录账号', dataIndex: 'username', key: 'username', width: 120 },
  { title: '所属部门', dataIndex: 'departmentName', key: 'departmentName', width: 160 },
  { title: '角色', dataIndex: 'roleNames', key: 'roleNames', width: 180 },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 110 },
  { title: '手机号', dataIndex: 'phone', key: 'phone', width: 140 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 200 },
  { title: '操作', dataIndex: 'actions', key: 'actions', width: 150, fixed: 'right' },
]

const statusOptions = [
  { label: '全部', value: null },
  { label: '启用', value: true },
  { label: '停用', value: false },
]

// 数据
const users = ref([])
const departments = ref([])
const roles = ref([])
const tableLoading = ref(false)
const deptLoading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const selectedDepartmentKeys = ref([])
const queryParams = reactive({ keyword: '', departmentId: null, roleId: null, enabled: null })

// 部门树
const buildTree = (list, parentId = null) =>
  list
    .filter(d => (parentId === null ? !d.parentId || d.parentId === 0 : d.parentId === parentId))
    .map(d => {
      const children = buildTree(list, d.id)
      return { title: d.name, key: d.id, ...(children.length ? { children } : {}) }
    })

const departmentTree = computed(() => [{ title: '全部', key: null, children: buildTree(departments.value) }])

const departmentFilterOptions = computed(() => [
  { label: '全部', value: null },
  ...departments.value.map(d => ({ label: d.name, value: d.id })),
])

const departmentSelectOptions = computed(() =>
  departments.value.map(d => ({ label: d.name, value: d.id }))
)

const roleFilterOptions = computed(() => [
  { label: '全部', value: null },
  ...roles.value.map(r => ({ label: r.name, value: r.id })),
])

const roleSelectOptions = computed(() =>
  roles.value.map(r => ({ label: r.name, value: r.id }))
)

const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: t => `共 ${t} 条`,
}))

// 加载
const loadDepartments = async () => {
  deptLoading.value = true
  try {
    departments.value = await getDepartments()
  } catch {
    message.error('加载部门失败')
  } finally {
    deptLoading.value = false
  }
}

const loadRoles = async () => {
  try {
    roles.value = await getRoleList()
  } catch {
    message.error('加载角色失败')
  }
}

const loadUsers = async () => {
  tableLoading.value = true
  try {
    const params = {
      pageNo: currentPage.value,
      pageSize: pageSize.value,
    }
    if (queryParams.keyword) params.keyword = queryParams.keyword
    if (queryParams.departmentId != null) params.departmentId = queryParams.departmentId
    if (queryParams.roleId != null) params.roleId = queryParams.roleId
    if (queryParams.enabled != null) params.enabled = queryParams.enabled

    const result = await getUserList(params)
    users.value = result.records
    total.value = result.total
  } catch (e) {
    message.error(e.message || '加载用户列表失败')
  } finally {
    tableLoading.value = false
  }
}

onMounted(() => {
  loadDepartments()
  loadRoles()
  loadUsers()
})

// 查询
const handleSearch = () => {
  currentPage.value = 1
  loadUsers()
}

const handleReset = () => {
  queryParams.keyword = ''
  queryParams.departmentId = null
  queryParams.roleId = null
  queryParams.enabled = null
  selectedDepartmentKeys.value = []
  currentPage.value = 1
  loadUsers()
}

const handleTableChange = ({ current, pageSize: size }) => {
  currentPage.value = current
  pageSize.value = size
  loadUsers()
}

const handleDepartmentSelect = keys => {
  const key = keys[0] ?? null
  selectedDepartmentKeys.value = key !== null ? [key] : []
  queryParams.departmentId = key
  currentPage.value = 1
  loadUsers()
}

// 启用/禁用
const handleStatusChange = async (record, checked) => {
  record._switching = true
  try {
    await updateUserEnabled(record.id, checked)
    record.enabled = checked
    message.success(checked ? '已启用' : '已停用')
  } catch (e) {
    message.error(e.message || '操作失败')
  } finally {
    record._switching = false
  }
}

// 表单
const formRef = ref()
const userModalOpen = ref(false)
const submitLoading = ref(false)
const modalMode = ref('create')
const editingUserId = ref(null)
const formState = reactive({
  realName: '',
  username: '',
  departmentId: undefined,
  roleIds: [],
  phone: '',
  email: '',
  password: '',
  enabled: true,
})

const formRules = {
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入初始密码', trigger: 'blur' }],
}

const resetForm = () => {
  Object.assign(formState, {
    realName: '',
    username: '',
    departmentId: undefined,
    roleIds: [],
    phone: '',
    email: '',
    password: '',
    enabled: true,
  })
  formRef.value?.clearValidate()
}

const handleAdd = () => {
  modalMode.value = 'create'
  editingUserId.value = null
  resetForm()
  userModalOpen.value = true
}

const handleEdit = record => {
  modalMode.value = 'edit'
  editingUserId.value = record.id
  Object.assign(formState, {
    realName: record.realName,
    username: record.username,
    departmentId: record.departmentId || undefined,
    roleIds: record.roleIds || [],
    phone: record.phone || '',
    email: record.email || '',
    password: '',
    enabled: record.enabled,
  })
  formRef.value?.clearValidate()
  userModalOpen.value = true
}

const handleCancel = () => {
  userModalOpen.value = false
}

const handleSubmit = async () => {
  if (submitLoading.value) return
  try {
    await formRef.value?.validate()
    submitLoading.value = true

    if (modalMode.value === 'create') {
      await createUser({
        realName: formState.realName,
        username: formState.username,
        password: formState.password,
        departmentId: formState.departmentId,
        roleIds: formState.roleIds,
        phone: formState.phone,
        email: formState.email,
        enabled: formState.enabled,
      })
      message.success('用户创建成功')
    } else {
      await updateUser(editingUserId.value, {
        realName: formState.realName,
        departmentId: formState.departmentId,
        phone: formState.phone,
        email: formState.email,
        enabled: formState.enabled,
      })
      if (formState.roleIds.length >= 0) {
        await assignUserRoles(editingUserId.value, formState.roleIds)
      }
      message.success('用户更新成功')
    }

    userModalOpen.value = false
    loadUsers()
  } catch (e) {
    if (e?.errorFields) return
    message.error(e.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

// 重置密码
const resetPwdModalOpen = ref(false)
const resetPwdLoading = ref(false)
const newPassword = ref('')
const resetPwdTargetId = ref(null)

const handleResetPassword = record => {
  resetPwdTargetId.value = record.id
  newPassword.value = ''
  resetPwdModalOpen.value = true
}

const handleConfirmResetPassword = async () => {
  if (!newPassword.value) {
    message.warning('请输入新密码')
    return
  }
  resetPwdLoading.value = true
  try {
    await resetUserPassword(resetPwdTargetId.value, newPassword.value)
    message.success('密码重置成功')
    resetPwdModalOpen.value = false
  } catch (e) {
    message.error(e.message || '重置失败')
  } finally {
    resetPwdLoading.value = false
  }
}
</script>

<style scoped>
.user-management {
  min-height: calc(100vh - 126px);
}

.prototype-card {
  border: 1px solid #ececec;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 3%);
}

.filter-panel {
  margin-bottom: 16px;
}

.user-filter {
  row-gap: 14px;
}

.filter-input {
  width: 218px;
}

.filter-select {
  width: 150px;
}

.filter-actions {
  margin-left: auto;
}

.content-grid {
  display: grid;
  grid-template-columns: 208px minmax(0, 1fr);
  gap: 20px;
}

.org-card {
  min-height: 406px;
}

.org-card :deep(.ant-card-body) {
  padding: 12px 8px;
}

.list-card {
  min-width: 0;
  min-height: 406px;
}

.list-card :deep(.ant-card-body) {
  padding: 18px 28px;
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.status-text {
  margin-left: 6px;
  color: #52c41a;
}

.status-text--disabled {
  color: #8c8c8c;
}

.email-link {
  color: #1677ff;
}

.user-form {
  padding-top: 10px;
}
</style>
