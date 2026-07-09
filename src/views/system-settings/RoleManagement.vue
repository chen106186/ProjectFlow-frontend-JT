<template>
  <section class="role-management">
    <div class="role-layout">
      <a-card class="prototype-card role-card" :bordered="false">
        <div class="role-card__header">
          <strong>角色列表</strong>
          <a-button type="primary" size="small" @click="handleAddRole">
            <template #icon><PlusOutlined /></template>
            新增
          </a-button>
        </div>
        <a-input v-model:value="keyword" class="role-search" placeholder="请输入角色名称" allow-clear>
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <div class="role-list">
          <article
            v-for="role in filteredRoles"
            :key="role.id"
            :class="['role-item', { 'role-item--active': role.id === currentRoleId }]"
            @click="handleSelectRole(role)"
          >
            <div class="role-item__content">
              <strong>{{ role.name }}</strong>
              <span>{{ role.description }}</span>
            </div>
            <a-button class="role-item__edit" type="text" size="small" @click.stop="handleEditRole(role)">
              <template #icon><EditOutlined /></template>
            </a-button>
          </article>
        </div>
      </a-card>

      <a-card class="prototype-card permission-card" :bordered="false">
        <div class="permission-title">
          <DownOutlined />
          <span>菜单权限</span>
        </div>
        <a-tree
          v-model:checkedKeys="checkedPermissionKeys"
          class="permission-tree"
          :tree-data="permissionTree"
          checkable
          default-expand-all
        />
      </a-card>
    </div>

    <a-modal
      v-model:open="roleModalOpen"
      :title="modalTitle"
      width="576px"
      ok-text="确认"
      cancel-text="取消"
      @ok="handleSaveRole"
      @cancel="handleCancel"
    >
      <a-form class="role-form" :label-col="{ span: 4 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="角色">
          <a-input v-model:value="roleForm.name" placeholder="请输入角色名称" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="roleForm.description" placeholder="请输入角色描述" :rows="4" />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup>
import { DownOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { computed, reactive, ref } from 'vue'

const permissionTree = [
  { title: '首页', key: 'home' },
  {
    title: '个人工作',
    key: 'personal',
    children: [
      { title: '我的任务', key: 'personal-tasks' },
      { title: '我的 Bug', key: 'personal-bugs' },
      { title: '我的需求', key: 'personal-demands' },
      { title: '我的日报', key: 'personal-daily' },
      { title: '我的统计', key: 'personal-statistics' },
    ],
  },
  {
    title: '项目清单',
    key: 'projects',
    children: [
      { title: '管理类项目', key: 'management-projects' },
      { title: '执行类项目', key: 'execution-projects' },
    ],
  },
  {
    title: '任务列表',
    key: 'tasks',
    children: [
      { title: '全部任务', key: 'all-tasks' },
      { title: '开发任务', key: 'development-tasks' },
      { title: '测试任务', key: 'testing-tasks' },
    ],
  },
  { title: '需求管理', key: 'demands' },
  { title: 'Bug 列表', key: 'bugs' },
  {
    title: '系统设置',
    key: 'settings',
    children: [
      { title: '用户管理', key: 'settings-users' },
      { title: '角色管理', key: 'settings-roles' },
      { title: '操作日志', key: 'settings-logs' },
    ],
  },
]

const defaultRoleForm = () => ({
  id: undefined,
  name: '',
  description: '',
})

const keyword = ref('')
const currentRoleId = ref(1)
const roleModalOpen = ref(false)
const modalMode = ref('create')
const roleForm = reactive(defaultRoleForm())
const checkedPermissionKeys = ref([
  'home',
  'personal',
  'personal-tasks',
  'personal-bugs',
  'projects',
  'management-projects',
  'execution-projects',
  'tasks',
  'all-tasks',
  'development-tasks',
  'testing-tasks',
])
const roles = ref([
  { id: 1, name: '总经办/超级管理员', description: '系统最高权限，拥有所有功能权限' },
  { id: 2, name: '项目经理', description: '负责项目管理和任务分配' },
  { id: 3, name: '开发负责人', description: '负责任务管理和任务分配' },
  { id: 4, name: 'UI设计师', description: '负责设计UI' },
  { id: 5, name: '开发工程师', description: '负责项目开发和Bug修复' },
  { id: 6, name: '测试工程师', description: '负责测试和Bug提交' },
  { id: 7, name: '人事', description: '负责人员管理' },
])

const filteredRoles = computed(() => {
  if (!keyword.value) {
    return roles.value
  }

  return roles.value.filter(role => role.name.includes(keyword.value))
})

const modalTitle = computed(() => (modalMode.value === 'create' ? '新增角色' : '编辑角色'))

const handleSelectRole = role => {
  currentRoleId.value = role.id
}

const handleAddRole = () => {
  modalMode.value = 'create'
  Object.assign(roleForm, defaultRoleForm())
  roleModalOpen.value = true
}

const handleEditRole = role => {
  modalMode.value = 'edit'
  Object.assign(roleForm, role)
  roleModalOpen.value = true
}

const handleCancel = () => {
  roleModalOpen.value = false
}

const handleSaveRole = () => {
  if (!roleForm.name) {
    return
  }

  if (modalMode.value === 'edit') {
    const target = roles.value.find(role => role.id === roleForm.id)
    if (target) {
      target.name = roleForm.name
      target.description = roleForm.description
    }
    roleModalOpen.value = false
    return
  }

  const newRole = {
    id: Date.now(),
    name: roleForm.name,
    description: roleForm.description,
  }
  roles.value = [newRole, ...roles.value]
  currentRoleId.value = newRole.id
  roleModalOpen.value = false
}
</script>

<style scoped>
.role-management {
  min-height: calc(100vh - 126px);
}

.role-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
}

.prototype-card {
  border: 1px solid #ececec;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 3%);
}

.role-card,
.permission-card {
  min-height: 532px;
}

.role-card :deep(.ant-card-body) {
  padding: 18px;
}

.permission-card :deep(.ant-card-body) {
  padding: 0 18px 18px;
}

.role-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.role-search {
  margin-bottom: 14px;
}

.role-list {
  height: 430px;
  overflow-y: auto;
  border-top: 1px solid #f0f0f0;
}

.role-item {
  position: relative;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 12px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f2f2f2;
}

.role-item--active {
  background: #e6f4ff;
  border-left: 2px solid #1677ff;
}

.role-item__content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.role-item__content strong {
  color: #1f1f1f;
  font-weight: 500;
}

.role-item--active .role-item__content strong {
  color: #1677ff;
}

.role-item__content span {
  color: #8c8c8c;
  font-size: 12px;
}

.role-item__edit {
  opacity: 0;
}

.role-item:hover .role-item__edit,
.role-item--active .role-item__edit {
  opacity: 1;
}

.permission-title {
  display: flex;
  gap: 10px;
  align-items: center;
  height: 56px;
  font-weight: 500;
  border-bottom: 1px solid #f0f0f0;
}

.permission-tree {
  height: 458px;
  padding-top: 12px;
  overflow-y: auto;
}

.permission-tree :deep(.ant-tree-treenode) {
  padding-bottom: 8px;
}

.role-form {
  padding-top: 34px;
}
</style>
