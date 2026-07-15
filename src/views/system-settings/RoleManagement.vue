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
        <a-spin :spinning="roleLoading">
          <div class="role-list">
            <article
              v-for="role in filteredRoles"
              :key="role.id"
              :class="['role-item', { 'role-item--active': role.id === currentRoleId }]"
              @click="handleSelectRole(role)"
            >
              <div class="role-item__content">
                <strong>{{ role.name }}</strong>
                <span>{{ role.code }}</span>
              </div>
              <a-space class="role-item__actions" :size="2">
                <a-button type="text" size="small" @click.stop="handleEditRole(role)">
                  <template #icon><EditOutlined /></template>
                </a-button>
                <a-popconfirm title="确定删除该角色吗？" ok-text="删除" cancel-text="取消" @confirm="handleDeleteRole(role)">
                  <a-button type="text" size="small" danger @click.stop>
                    <template #icon><DeleteOutlined /></template>
                  </a-button>
                </a-popconfirm>
              </a-space>
            </article>
          </div>
        </a-spin>
      </a-card>

      <a-card class="prototype-card permission-card" :bordered="false">
        <div class="permission-title">
          <span><DownOutlined /> 菜单权限</span>
          <a-button type="primary" size="small" :loading="permissionSaving" :disabled="!currentRoleId" @click="handleSavePermissions">保存权限</a-button>
        </div>
        <a-spin :spinning="menuLoading || permissionLoading">
          <a-tree
            v-model:checkedKeys="checkedPermissionKeys"
            class="permission-tree"
            :tree-data="permissionTree"
            checkable
            default-expand-all
          />
        </a-spin>
      </a-card>
    </div>

    <a-modal
      v-model:open="roleModalOpen"
      :title="modalTitle"
      width="36rem"
      :confirm-loading="submitLoading"
      ok-text="确认"
      cancel-text="取消"
      @ok="handleSaveRole"
      @cancel="handleCancel"
    >
      <a-form ref="formRef" class="role-form" :model="roleForm" :rules="formRules" :label-col="{ span: 4 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="编码" name="code">
          <a-input v-model:value="roleForm.code" placeholder="请输入角色编码" />
        </a-form-item>
        <a-form-item label="角色" name="name">
          <a-input v-model:value="roleForm.name" placeholder="请输入角色名称" />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup>
import { DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  assignSystemRoleMenus,
  createSystemRole,
  deleteSystemRole,
  getSystemMenus,
  getSystemRoleMenus,
  getSystemRoles,
  updateSystemRole,
} from '@/api/systemSettings'

const defaultRoleForm = () => ({
  id: undefined,
  code: '',
  name: '',
})

const keyword = ref('')
const currentRoleId = ref()
const roleModalOpen = ref(false)
const modalMode = ref('create')
const roleLoading = ref(false)
const menuLoading = ref(false)
const permissionLoading = ref(false)
const permissionSaving = ref(false)
const submitLoading = ref(false)
const formRef = ref()
const roleForm = reactive(defaultRoleForm())
const checkedPermissionKeys = ref([])
const roles = ref([])
const menus = ref([])

const formRules = {
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
}

const filteredRoles = computed(() => roles.value)

const modalTitle = computed(() => (modalMode.value === 'create' ? '新增角色' : '编辑角色'))
const permissionTree = computed(() => buildMenuTree(menus.value))

onMounted(async () => {
  await Promise.all([fetchRoles(), fetchMenus()])
  if (roles.value.length) {
    await handleSelectRole(roles.value[0])
  }
})

watch(keyword, async () => {
  const currentId = currentRoleId.value
  await fetchRoles()
  if (!roles.value.length) {
    currentRoleId.value = undefined
    checkedPermissionKeys.value = []
    return
  }
  const matched = currentId ? roles.value.find(role => role.id === currentId) : undefined
  await handleSelectRole(matched || roles.value[0])
})

const buildMenuTree = items => {
  const nodeMap = new Map()
  const roots = []

  items.forEach(item => {
    nodeMap.set(item.id, { title: item.name, key: item.id, children: [] })
  })

  items.forEach(item => {
    const node = nodeMap.get(item.id)
    if (item.parentId && nodeMap.has(item.parentId)) {
      nodeMap.get(item.parentId).children.push(node)
      return
    }
    roots.push(node)
  })

  return roots
}

const fetchRoles = async () => {
  roleLoading.value = true

  try {
    roles.value = await getSystemRoles({ keyword: keyword.value || undefined })
  } finally {
    roleLoading.value = false
  }
}

const fetchMenus = async () => {
  menuLoading.value = true

  try {
    menus.value = await getSystemMenus()
  } catch (error) {
    message.error(error.message || '菜单加载失败')
  } finally {
    menuLoading.value = false
  }
}

const fetchRoleMenus = async roleId => {
  permissionLoading.value = true

  try {
    checkedPermissionKeys.value = await getSystemRoleMenus(roleId)
  } catch (error) {
    message.error(error.message || '权限加载失败')
    checkedPermissionKeys.value = []
  } finally {
    permissionLoading.value = false
  }
}

const handleSelectRole = async role => {
  currentRoleId.value = role.id
  await fetchRoleMenus(role.id)
}

const handleAddRole = () => {
  modalMode.value = 'create'
  Object.assign(roleForm, defaultRoleForm())
  formRef.value?.clearValidate()
  roleModalOpen.value = true
}

const handleEditRole = role => {
  modalMode.value = 'edit'
  Object.assign(roleForm, role)
  formRef.value?.clearValidate()
  roleModalOpen.value = true
}

const handleCancel = () => {
  roleModalOpen.value = false
}

const handleSaveRole = async () => {
  if (submitLoading.value) {
    return
  }

  try {
    await formRef.value?.validate()
    submitLoading.value = true

    if (modalMode.value === 'edit') {
      await updateSystemRole(roleForm.id, {
        code: roleForm.code,
        name: roleForm.name,
      })
      message.success('编辑成功')
    } else {
      const role = await createSystemRole({
        code: roleForm.code,
        name: roleForm.name,
      })
      currentRoleId.value = role.id
      message.success('新增成功')
    }

    roleModalOpen.value = false
    await fetchRoles()
  } catch (error) {
    message.error(error.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

const handleDeleteRole = async role => {
  try {
    const deletedCurrent = role.id === currentRoleId.value
    await deleteSystemRole(role.id)
    message.success('角色删除成功')
    await fetchRoles()

    if (!roles.value.length) {
      currentRoleId.value = undefined
      checkedPermissionKeys.value = []
      return
    }

    if (deletedCurrent) {
      await handleSelectRole(roles.value[0])
    }
  } catch (error) {
    message.error(error.message || '删除失败')
  }
}

const handleSavePermissions = async () => {
  if (!currentRoleId.value) {
    return
  }

  permissionSaving.value = true

  try {
    const savedIds = await assignSystemRoleMenus(currentRoleId.value, checkedPermissionKeys.value)
    if (Array.isArray(savedIds)) {
      checkedPermissionKeys.value = savedIds
    }
    message.success('权限已保存')
  } catch (error) {
    message.error(error.message || '保存失败')
  } finally {
    permissionSaving.value = false
  }
}
</script>

<style scoped>
.role-management {
  width: min(1600px, 100%);
  margin: 0 auto;
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

.role-item__actions {
  opacity: 0;
}

.role-item:hover .role-item__actions,
.role-item--active .role-item__actions {
  opacity: 1;
}

.permission-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  font-weight: 500;
  border-bottom: 1px solid #f0f0f0;
}

.permission-title span {
  display: inline-flex;
  gap: 10px;
  align-items: center;
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
