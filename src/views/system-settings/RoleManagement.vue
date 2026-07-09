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
        <a-spin :spinning="rolesLoading">
          <div class="role-list">
            <article
              v-for="role in filteredRoles"
              :key="role.id"
              :class="['role-item', { 'role-item--active': role.id === currentRoleId }]"
              @click="handleSelectRole(role)"
            >
              <div class="role-item__content">
                <strong>{{ role.name }}</strong>
                <span>{{ role.description || '暂无描述' }}</span>
              </div>
              <a-space>
                <a-button class="role-item__edit" type="text" size="small" @click.stop="handleEditRole(role)">
                  <template #icon><EditOutlined /></template>
                </a-button>
                <a-popconfirm
                  title="确认删除该角色？"
                  ok-text="删除"
                  cancel-text="取消"
                  ok-type="danger"
                  @confirm="handleDeleteRole(role)"
                  @click.stop
                >
                  <a-button class="role-item__edit" type="text" size="small" danger @click.stop>
                    <template #icon><DeleteOutlined /></template>
                  </a-button>
                </a-popconfirm>
              </a-space>
            </article>
          </div>
        </a-spin>
      </a-card>

      <a-card class="prototype-card permission-card" :bordered="false">
        <div class="permission-header">
          <div class="permission-title">
            <DownOutlined />
            <span>菜单权限</span>
          </div>
          <a-button
            v-if="currentRoleId"
            type="primary"
            size="small"
            :loading="savingMenus"
            @click="handleSaveMenus"
          >
            保存权限
          </a-button>
        </div>
        <a-spin :spinning="menusLoading">
          <a-tree
            v-model:checkedKeys="checkedPermissionKeys"
            class="permission-tree"
            :tree-data="menuTree"
            checkable
            default-expand-all
          />
        </a-spin>
        <a-empty v-if="!currentRoleId && !menusLoading" description="请先选择角色" style="margin-top: 60px" />
      </a-card>
    </div>

    <a-modal
      v-model:open="roleModalOpen"
      :title="modalMode === 'create' ? '新增角色' : '编辑角色'"
      width="576px"
      :confirm-loading="roleSubmitLoading"
      ok-text="确认"
      cancel-text="取消"
      @ok="handleSaveRole"
      @cancel="handleCancel"
    >
      <a-form class="role-form" :label-col="{ span: 4 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="编码">
          <a-input v-model:value="roleForm.code" placeholder="请输入角色编码，如 admin" :disabled="modalMode === 'edit'" />
        </a-form-item>
        <a-form-item label="角色名">
          <a-input v-model:value="roleForm.name" placeholder="请输入角色名称" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="roleForm.description" placeholder="请输入角色描述" :rows="4" />
        </a-form-item>
        <a-form-item label="状态">
          <a-switch v-model:checked="roleForm.enabled" checked-children="启用" un-checked-children="停用" />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup>
import { DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  assignRoleMenus,
  createRole,
  deleteRole,
  getMenuList,
  getRoleList,
  getRoleMenuIds,
  updateRole,
} from '@/api/system'

// 角色
const keyword = ref('')
const roles = ref([])
const rolesLoading = ref(false)
const currentRoleId = ref(null)

const filteredRoles = computed(() => {
  if (!keyword.value) return roles.value
  return roles.value.filter(r => r.name.includes(keyword.value))
})

const loadRoles = async () => {
  rolesLoading.value = true
  try {
    roles.value = await getRoleList()
    if (roles.value.length && !currentRoleId.value) {
      handleSelectRole(roles.value[0])
    }
  } catch (e) {
    message.error(e.message || '加载角色列表失败')
  } finally {
    rolesLoading.value = false
  }
}

// 菜单
const allMenus = ref([])
const checkedPermissionKeys = ref([])
const menusLoading = ref(false)
const savingMenus = ref(false)

const buildMenuTree = (list, parentId = null) =>
  list
    .filter(m => (parentId === null ? !m.parentId || m.parentId === 0 : m.parentId === parentId))
    .map(m => {
      const children = buildMenuTree(list, m.id)
      return {
        title: m.name,
        key: m.id,
        ...(children.length ? { children } : {}),
      }
    })

const menuTree = computed(() => buildMenuTree(allMenus.value))

const loadMenus = async () => {
  try {
    allMenus.value = await getMenuList()
  } catch (e) {
    message.error(e.message || '加载菜单失败')
  }
}

const loadRoleMenus = async roleId => {
  menusLoading.value = true
  try {
    checkedPermissionKeys.value = await getRoleMenuIds(roleId)
  } catch (e) {
    message.error(e.message || '加载角色权限失败')
  } finally {
    menusLoading.value = false
  }
}

const handleSelectRole = role => {
  currentRoleId.value = role.id
  loadRoleMenus(role.id)
}

const handleSaveMenus = async () => {
  savingMenus.value = true
  try {
    await assignRoleMenus(currentRoleId.value, checkedPermissionKeys.value)
    message.success('权限保存成功')
  } catch (e) {
    message.error(e.message || '保存失败')
  } finally {
    savingMenus.value = false
  }
}

onMounted(() => {
  loadMenus()
  loadRoles()
})

// 角色 CRUD
const roleModalOpen = ref(false)
const roleSubmitLoading = ref(false)
const modalMode = ref('create')
const editingRoleId = ref(null)
const roleForm = reactive({ code: '', name: '', description: '', enabled: true })

const defaultRoleForm = () => ({ code: '', name: '', description: '', enabled: true })

const handleAddRole = () => {
  modalMode.value = 'create'
  editingRoleId.value = null
  Object.assign(roleForm, defaultRoleForm())
  roleModalOpen.value = true
}

const handleEditRole = role => {
  modalMode.value = 'edit'
  editingRoleId.value = role.id
  Object.assign(roleForm, {
    code: role.code || '',
    name: role.name,
    description: role.description || '',
    enabled: role.enabled !== false,
  })
  roleModalOpen.value = true
}

const handleCancel = () => {
  roleModalOpen.value = false
}

const handleSaveRole = async () => {
  if (!roleForm.name) {
    message.warning('请输入角色名称')
    return
  }
  if (modalMode.value === 'create' && !roleForm.code) {
    message.warning('请输入角色编码')
    return
  }
  roleSubmitLoading.value = true
  try {
    if (modalMode.value === 'create') {
      const created = await createRole({
        code: roleForm.code,
        name: roleForm.name,
        description: roleForm.description,
        enabled: roleForm.enabled,
      })
      roles.value = [created, ...roles.value]
      message.success('角色创建成功')
    } else {
      const updated = await updateRole(editingRoleId.value, {
        name: roleForm.name,
        description: roleForm.description,
        enabled: roleForm.enabled,
      })
      const idx = roles.value.findIndex(r => r.id === editingRoleId.value)
      if (idx !== -1) roles.value[idx] = updated
      message.success('角色更新成功')
    }
    roleModalOpen.value = false
  } catch (e) {
    message.error(e.message || '操作失败')
  } finally {
    roleSubmitLoading.value = false
  }
}

const handleDeleteRole = async role => {
  try {
    await deleteRole(role.id)
    roles.value = roles.value.filter(r => r.id !== role.id)
    if (currentRoleId.value === role.id) {
      currentRoleId.value = null
      checkedPermissionKeys.value = []
    }
    message.success('角色已删除')
  } catch (e) {
    message.error(e.message || '删除失败')
  }
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

.permission-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  border-bottom: 1px solid #f0f0f0;
}

.permission-title {
  display: flex;
  gap: 10px;
  align-items: center;
  font-weight: 500;
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
