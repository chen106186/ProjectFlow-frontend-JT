<template>
  <section class="user-management">
    <a-card class="prototype-card filter-panel" :bordered="false">
      <a-form class="user-filter" layout="inline">
        <a-form-item label="搜索">
          <a-input v-model:value="queryParams.keyword" class="filter-input" placeholder="请输入账号/姓名" allow-clear />
        </a-form-item>
        <a-form-item label="所属部门">
          <a-select v-model:value="queryParams.departmentId" class="filter-select" :options="departmentOptions" allow-clear placeholder="全部" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="queryParams.enabled" class="filter-select" :options="statusOptions" allow-clear placeholder="全部" />
        </a-form-item>
        <a-form-item class="filter-actions">
          <a-space>
            <a-button type="primary" @click="handleSearch">查询</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <div class="content-grid">
      <a-card class="prototype-card org-card" :bordered="false">
        <a-tree
          v-model:selectedKeys="selectedDepartmentKeys"
          :tree-data="departmentTree"
          default-expand-all
          block-node
          @select="handleDepartmentSelect"
        />
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
          :loading="loading"
          :pagination="pagination"
          :scroll="{ x: 1000 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'enabled'">
              <a-switch :checked="record.enabled" size="small" @change="checked => handleStatusChange(record, checked)" />
              <span :class="['status-text', { 'status-text--disabled': !record.enabled }]">{{ record.enabled ? '启用' : '停用' }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'roleNames'">
              <a-space wrap :size="4">
                <a-tag v-for="name in record.roleNames" :key="name" color="blue">{{ name }}</a-tag>
                <span v-if="!record.roleNames?.length" class="muted">-</span>
              </a-space>
            </template>
            <template v-else-if="column.dataIndex === 'operation'">
              <a-space :size="2">
                <a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
                <a-button type="link" size="small" @click="handleAssignRole(record)">分配角色</a-button>
                <a-button type="link" size="small" @click="handleResetPwd(record)">重置密码</a-button>
              </a-space>
            </template>
            <template v-else>{{ record[column.dataIndex] }}</template>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- 新增 / 编辑用户 -->
    <a-modal
      v-model:open="userModalOpen"
      :title="modalMode === 'create' ? '新增用户' : '编辑用户'"
      width="640px"
      :confirm-loading="submitLoading"
      ok-text="确认"
      cancel-text="取消"
      @ok="handleSubmit"
      @cancel="userModalOpen = false"
    >
      <a-form ref="formRef" class="user-form" :model="formState" :rules="formRules" :label-col="{ span: 5 }" :wrapper-col="{ span: 17 }">
        <a-form-item v-if="modalMode === 'create'" label="登录账号" name="username">
          <a-input v-model:value="formState.username" placeholder="请输入登录账号" />
        </a-form-item>
        <a-form-item label="姓名" name="realName">
          <a-input v-model:value="formState.realName" placeholder="请输入姓名" />
        </a-form-item>
        <a-form-item label="所属部门" name="departmentId">
          <a-select v-model:value="formState.departmentId" placeholder="请选择所属部门" :options="departmentOptionsWithoutAll" />
        </a-form-item>
        <a-form-item v-if="modalMode === 'create'" label="角色" name="roleId">
          <a-select v-model:value="formState.roleId" placeholder="请选择角色" :options="roleOptions" allow-clear />
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

    <!-- 分配角色 -->
    <a-modal
      v-model:open="roleModalOpen"
      title="分配角色"
      width="480px"
      :confirm-loading="roleSubmitLoading"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleRoleAssignSubmit"
      @cancel="roleModalOpen = false"
    >
      <div class="role-assign-tip">为用户 <strong>{{ assigningUserName }}</strong> 分配角色：</div>
      <a-checkbox-group v-model:value="selectedRoleIds" class="role-checkbox-group">
        <a-checkbox v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</a-checkbox>
      </a-checkbox-group>
    </a-modal>

    <!-- 重置密码 -->
    <a-modal
      v-model:open="pwdModalOpen"
      title="重置密码"
      width="400px"
      :confirm-loading="pwdSubmitLoading"
      ok-text="确认重置"
      cancel-text="取消"
      @ok="handlePwdSubmit"
      @cancel="pwdModalOpen = false"
    >
      <a-form class="user-form" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="用户">{{ pwdUserName }}</a-form-item>
        <a-form-item label="新密码">
          <a-input-password v-model:value="newPassword" placeholder="请输入新密码" allow-clear />
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
  assignSystemUserRoles,
  createSystemUser,
  getSystemDepartments,
  getSystemRoles,
  getSystemUsers,
  resetSystemUserPassword,
  updateSystemUser,
  updateSystemUserEnabled,
} from '@/api/systemSettings'

const columns = [
  { title: '序号', dataIndex: 'index', width: 72 },
  { title: '登录账号', dataIndex: 'username', width: 140 },
  { title: '姓名', dataIndex: 'realName', width: 120 },
  { title: '所属部门', dataIndex: 'departmentName', width: 160 },
  { title: '角色', dataIndex: 'roleNames', width: 220 },
  { title: '账号状态', dataIndex: 'enabled', width: 110 },
  { title: '操作', dataIndex: 'operation', fixed: 'right', width: 200 },
]

const statusOptions = [
  { label: '启用', value: true },
  { label: '停用', value: false },
]

const createDefaultFormState = () => ({
  username: '',
  realName: '',
  departmentId: undefined,
  roleId: undefined,
  phone: '',
  email: '',
  password: '',
  enabled: true,
})

const queryParams = reactive({
  keyword: '',
  departmentId: undefined,
  enabled: undefined,
})

const formRef = ref()
const userModalOpen = ref(false)
const modalMode = ref('create')
const editingUserId = ref(null)
const loading = ref(false)
const submitLoading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const selectedDepartmentKeys = ref([])
const formState = reactive(createDefaultFormState())
const users = ref([])
const departments = ref([])
const roles = ref([])

const roleModalOpen = ref(false)
const roleSubmitLoading = ref(false)
const assigningUserId = ref(null)
const assigningUserName = ref('')
const selectedRoleIds = ref([])

const pwdModalOpen = ref(false)
const pwdSubmitLoading = ref(false)
const pwdUserId = ref(null)
const pwdUserName = ref('')
const newPassword = ref('')

const formRules = computed(() => ({
  username: modalMode.value === 'create' ? [{ required: true, message: '请输入登录账号', trigger: 'blur' }] : [],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: modalMode.value === 'create' ? [{ required: true, message: '请输入初始密码', trigger: 'blur' }] : [],
}))

const departmentMap = computed(() =>
  departments.value.reduce((map, item) => { map[item.id] = item.name; return map }, {}),
)

const departmentOptions = computed(() => departments.value.map(item => ({ label: item.name, value: item.id })))
const departmentOptionsWithoutAll = computed(() => departmentOptions.value)
const roleOptions = computed(() => roles.value.map(item => ({ label: item.name, value: item.id })))
const departmentTree = computed(() => buildDepartmentTree(departments.value))

const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: false,
  showTotal: value => `共 ${value} 条`,
  onChange: handlePageChange,
}))

onMounted(async () => {
  await Promise.all([fetchDepartments(), fetchRoles()])
  await fetchUsers()
})

const buildDepartmentTree = items => {
  const nodeMap = new Map()
  const roots = []
  items.forEach(item => { nodeMap.set(item.id, { title: item.name, key: item.id, children: [] }) })
  items.forEach(item => {
    const node = nodeMap.get(item.id)
    if (item.parentId && nodeMap.has(item.parentId)) {
      nodeMap.get(item.parentId).children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

const fetchDepartments = async () => { departments.value = await getSystemDepartments() }
const fetchRoles = async () => { roles.value = await getSystemRoles() }

const fetchUsers = async () => {
  loading.value = true
  try {
    const result = await getSystemUsers({
      keyword: queryParams.keyword || undefined,
      departmentId: queryParams.departmentId,
      enabled: queryParams.enabled,
      pageNo: currentPage.value,
      pageSize: pageSize.value,
    })
    total.value = result.total || 0
    users.value = result.records.map((item, index) => ({
      ...item,
      index: (currentPage.value - 1) * pageSize.value + index + 1,
      departmentName: departmentMap.value[item.departmentId] || '-',
    }))
  } finally {
    loading.value = false
  }
}

const handleDepartmentSelect = keys => {
  const selectedKey = keys[0]
  selectedDepartmentKeys.value = selectedKey ? [selectedKey] : []
  queryParams.departmentId = selectedKey
  currentPage.value = 1
  fetchUsers()
}

const handleSearch = () => { currentPage.value = 1; fetchUsers() }
const handlePageChange = page => { currentPage.value = page; fetchUsers() }

const handleStatusChange = async (record, checked) => {
  try {
    await updateSystemUserEnabled(record.id, checked)
    message.success('状态已更新')
    fetchUsers()
  } catch (error) {
    message.error(error.message || '操作失败')
  }
}

const handleReset = () => {
  queryParams.keyword = ''
  queryParams.departmentId = undefined
  queryParams.enabled = undefined
  selectedDepartmentKeys.value = []
  currentPage.value = 1
  fetchUsers()
}

const handleAdd = () => {
  modalMode.value = 'create'
  editingUserId.value = null
  Object.assign(formState, createDefaultFormState())
  formRef.value?.clearValidate()
  userModalOpen.value = true
}

const handleEdit = record => {
  modalMode.value = 'edit'
  editingUserId.value = record.id
  Object.assign(formState, {
    username: record.username,
    realName: record.realName,
    departmentId: record.departmentId,
    phone: record.phone || '',
    email: record.email || '',
    password: '',
    enabled: record.enabled,
    roleId: undefined,
  })
  formRef.value?.clearValidate()
  userModalOpen.value = true
}

const handleSubmit = async () => {
  if (submitLoading.value) return
  try {
    await formRef.value?.validate()
    submitLoading.value = true
    if (modalMode.value === 'edit') {
      await updateSystemUser(editingUserId.value, {
        realName: formState.realName,
        departmentId: formState.departmentId,
        phone: formState.phone || undefined,
        email: formState.email || undefined,
        enabled: formState.enabled,
      })
      message.success('编辑成功')
    } else {
      await createSystemUser({
        username: formState.username,
        realName: formState.realName,
        departmentId: formState.departmentId,
        phone: formState.phone,
        email: formState.email,
        password: formState.password,
        enabled: formState.enabled,
        roleIds: formState.roleId ? [formState.roleId] : [],
      })
      message.success('新增成功')
    }
    userModalOpen.value = false
    fetchUsers()
  } catch (error) {
    if (error?.errorFields) return
    message.error(error.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

const handleAssignRole = record => {
  assigningUserId.value = record.id
  assigningUserName.value = record.realName || record.username
  selectedRoleIds.value = [...(record.roleIds || [])]
  roleModalOpen.value = true
}

const handleRoleAssignSubmit = async () => {
  roleSubmitLoading.value = true
  try {
    await assignSystemUserRoles(assigningUserId.value, selectedRoleIds.value)
    message.success('角色分配成功')
    roleModalOpen.value = false
    fetchUsers()
  } catch (error) {
    message.error(error.message || '操作失败')
  } finally {
    roleSubmitLoading.value = false
  }
}

const handleResetPwd = record => {
  pwdUserId.value = record.id
  pwdUserName.value = record.realName || record.username
  newPassword.value = ''
  pwdModalOpen.value = true
}

const handlePwdSubmit = async () => {
  if (!newPassword.value) { message.warning('请输入新密码'); return }
  pwdSubmitLoading.value = true
  try {
    await resetSystemUserPassword(pwdUserId.value, newPassword.value)
    message.success('密码已重置')
    pwdModalOpen.value = false
  } catch (error) {
    message.error(error.message || '操作失败')
  } finally {
    pwdSubmitLoading.value = false
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

.muted {
  color: #bfbfbf;
}

.user-form {
  padding-top: 10px;
}

.role-assign-tip {
  margin-bottom: 16px;
  color: #595959;
}

.role-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
