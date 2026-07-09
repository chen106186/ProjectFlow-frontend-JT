<template>
  <section class="user-management">
    <a-card class="prototype-card filter-panel" :bordered="false">
      <a-form class="user-filter" layout="inline">
        <a-form-item label="搜索">
          <a-input v-model:value="queryParams.keyword" class="filter-input" placeholder="请输入姓名/手机号/邮箱" allow-clear />
        </a-form-item>
        <a-form-item label="所属部门">
          <a-select v-model:value="queryParams.department" class="filter-select" :options="departmentOptions" />
        </a-form-item>
        <a-form-item label="角色">
          <a-select v-model:value="queryParams.role" class="filter-select" :options="roleOptions" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="queryParams.status" class="filter-select" :options="statusOptions" />
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
          :data-source="filteredUsers"
          :pagination="pagination"
          :scroll="{ x: 940 }"
        >
          <template #bodyCell="{ column, record, text }">
            <template v-if="column.dataIndex === 'role'">
              <a-tag color="blue">{{ text }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'status'">
              <a-switch :checked="record.status === '启用'" size="small" @change="checked => handleStatusChange(record, checked)" />
              <span class="status-text">{{ record.status }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'email'">
              <a class="email-link">{{ text }}</a>
            </template>
            <template v-else>
              {{ text }}
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <a-modal
      v-model:open="userModalOpen"
      title="新增用户"
      width="640px"
      :confirm-loading="submitLoading"
      ok-text="确认"
      cancel-text="取消"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form ref="formRef" class="user-form" :model="formState" :rules="formRules" :label-col="{ span: 5 }" :wrapper-col="{ span: 17 }">
        <a-form-item label="姓名" name="name">
          <a-input v-model:value="formState.name" placeholder="请输入姓名" />
        </a-form-item>
        <a-form-item label="所属部门" name="department">
          <a-select v-model:value="formState.department" placeholder="请选择所属部门" :options="departmentOptionsWithoutAll" />
        </a-form-item>
        <a-form-item label="角色" name="role">
          <a-select v-model:value="formState.role" placeholder="请选择角色" :options="roleOptionsWithoutAll" />
        </a-form-item>
        <a-form-item label="手机号" name="phone">
          <a-input v-model:value="formState.phone" placeholder="请输入手机号" />
        </a-form-item>
        <a-form-item label="邮箱" name="email">
          <a-input v-model:value="formState.email" placeholder="请输入邮箱" />
        </a-form-item>
        <a-form-item label="初始密码" name="password">
          <a-input-password v-model:value="formState.password" placeholder="请输入初始密码" />
        </a-form-item>
        <a-form-item label="账号状态" name="status">
          <a-switch v-model:checked="formState.status" checked-children="启用" un-checked-children="停用" />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup>
import { PlusOutlined } from '@ant-design/icons-vue'
import { computed, reactive, ref } from 'vue'

const columns = [
  { title: '序号', dataIndex: 'index', key: 'index', width: 72 },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
  { title: '所属部门', dataIndex: 'department', key: 'department', width: 180 },
  { title: '角色', dataIndex: 'role', key: 'role', width: 120 },
  { title: '账号状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '手机号', dataIndex: 'phone', key: 'phone', width: 140 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 210 },
]

const departmentOptions = [
  { label: '全部', value: '全部' },
  { label: '总经办', value: '总经办' },
  { label: '技术部/前端组', value: '技术部/前端组' },
  { label: '技术部/后端组', value: '技术部/后端组' },
  { label: '技术部/测试组', value: '技术部/测试组' },
  { label: '市场部', value: '市场部' },
]

const roleOptions = [
  { label: '全部', value: '全部' },
  { label: '开发工程师', value: '开发工程师' },
  { label: '测试工程师', value: '测试工程师' },
  { label: '项目经理', value: '项目经理' },
  { label: '商务人员', value: '商务人员' },
]

const statusOptions = [
  { label: '全部', value: '全部' },
  { label: '启用', value: '启用' },
  { label: '停用', value: '停用' },
]

const departmentOptionsWithoutAll = departmentOptions.filter(item => item.value !== '全部')
const roleOptionsWithoutAll = roleOptions.filter(item => item.value !== '全部')

const departmentTree = [
  {
    title: 'XX科技有限公司',
    key: '全部',
    children: [
      { title: '总经办', key: '总经办' },
      { title: '市场部', key: '市场部' },
      {
        title: '技术部',
        key: '技术部',
        children: [
          { title: '前端组', key: '技术部/前端组' },
          { title: '后端组', key: '技术部/后端组' },
          { title: '测试组', key: '技术部/测试组' },
        ],
      },
    ],
  },
]

const createDefaultFormState = () => ({
  name: '',
  department: undefined,
  role: undefined,
  phone: '',
  email: '',
  password: '',
  status: true,
})

const queryParams = reactive({
  keyword: '',
  department: '全部',
  role: '全部',
  status: '启用',
})
const formRef = ref()
const userModalOpen = ref(false)
const submitLoading = ref(false)
const currentPage = ref(1)
const selectedDepartmentKeys = ref(['全部'])
const formState = reactive(createDefaultFormState())
const users = ref([
  { id: 1, index: 1, name: '张三', department: '技术部/前端组', role: '开发工程师', status: '启用', phone: '13800000001', email: 'zhangsan@example.com' },
  { id: 2, index: 2, name: '李四', department: '技术部/后端组', role: '开发工程师', status: '启用', phone: '13800000002', email: 'lisi@example.com' },
  { id: 3, index: 3, name: '王五', department: '技术部/测试组', role: '测试工程师', status: '启用', phone: '13800000003', email: 'wangwu@example.com' },
  { id: 4, index: 4, name: '赵六', department: '技术部', role: '项目经理', status: '启用', phone: '13800000004', email: 'zhaoliu@example.com' },
  { id: 5, index: 5, name: '孙七', department: '市场部', role: '商务人员', status: '启用', phone: '13800000005', email: 'sunqi@example.com' },
])

const formRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  department: [{ required: true, message: '请选择所属部门', trigger: 'change' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }],
  password: [{ required: true, message: '请输入初始密码', trigger: 'blur' }],
}

const filteredUsers = computed(() => {
  return users.value.filter(user => {
    const keywordMatched = !queryParams.keyword || [user.name, user.phone, user.email].some(value => value.includes(queryParams.keyword))
    const departmentMatched = queryParams.department === '全部' || user.department === queryParams.department
    const roleMatched = queryParams.role === '全部' || user.role === queryParams.role
    const statusMatched = queryParams.status === '全部' || user.status === queryParams.status

    return keywordMatched && departmentMatched && roleMatched && statusMatched
  })
})

const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: 10,
  total: filteredUsers.value.length,
  showSizeChanger: false,
  showTotal: total => `共 ${total} 条`,
  onChange: handlePageChange,
}))

const handleDepartmentSelect = keys => {
  const selectedKey = keys[0] || '全部'
  selectedDepartmentKeys.value = [selectedKey]
  queryParams.department = selectedKey === '技术部' ? '全部' : selectedKey
  currentPage.value = 1
}

const handleSearch = () => {
  currentPage.value = 1
}

const handlePageChange = page => {
  currentPage.value = page
}

const handleStatusChange = (record, checked) => {
  record.status = checked ? '启用' : '停用'
}

const handleReset = () => {
  queryParams.keyword = ''
  queryParams.department = '全部'
  queryParams.role = '全部'
  queryParams.status = '启用'
  selectedDepartmentKeys.value = ['全部']
  currentPage.value = 1
}

const handleAdd = () => {
  Object.assign(formState, createDefaultFormState())
  formRef.value?.clearValidate()
  userModalOpen.value = true
}

const handleCancel = () => {
  userModalOpen.value = false
}

const handleSubmit = async () => {
  if (submitLoading.value) {
    return
  }

  try {
    await formRef.value?.validate()
    submitLoading.value = true
    users.value = [
      ...users.value,
      {
        id: Date.now(),
        index: users.value.length + 1,
        name: formState.name,
        department: formState.department,
        role: formState.role,
        status: formState.status ? '启用' : '停用',
        phone: formState.phone,
        email: formState.email,
      },
    ]
    userModalOpen.value = false
  } finally {
    submitLoading.value = false
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

.email-link {
  color: #1677ff;
}

.user-form {
  padding-top: 10px;
}
</style>



