<template>
  <section class="profile-page">
    <a-card class="profile-card" :bordered="false">
      <div class="profile-header">
        <a-avatar :size="72"><UserOutlined /></a-avatar>
        <div>
          <h2>{{ profile.realName || profile.username || '-' }}</h2>
          <p>{{ profile.positionName || profile.position || profile.roleName || '-' }}</p>
        </div>
      </div>

      <dl class="profile-info">
        <div v-for="item in profileItems" :key="item.label">
          <dt>{{ item.label }}：</dt>
          <dd>{{ item.value || '-' }}</dd>
        </div>
      </dl>
    </a-card>
  </section>
</template>

<script setup>
import { UserOutlined } from '@ant-design/icons-vue'
import { computed } from 'vue'

const readJson = key => {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}')
  } catch {
    return {}
  }
}

const profile = computed(() => ({
  ...readJson('userInfo'),
  ...readJson('authProfile'),
}))

const maskPhone = phone => {
  if (!phone) {
    return ''
  }

  const text = String(phone)
  return text.length >= 7 ? `${text.slice(0, 3)}****${text.slice(-4)}` : text
}

const profileItems = computed(() => [
  { label: '姓名', value: profile.value.realName || profile.value.name },
  { label: '工号', value: profile.value.jobNo || profile.value.employeeNo || profile.value.employeeNumber || profile.value.workNo },
  { label: '部门', value: profile.value.departmentName || profile.value.department },
  { label: '岗位', value: profile.value.positionName || profile.value.position || profile.value.postName },
  { label: '邮箱', value: profile.value.email },
  { label: '手机', value: maskPhone(profile.value.phone || profile.value.mobile) },
  { label: '入职日期', value: profile.value.entryDate || profile.value.hireDate },
])
</script>

<style scoped>
.profile-page {
  display: flex;
  justify-content: center;
  min-height: 100%;
  padding-top: 24px;
}

.profile-card {
  width: min(720px, 100%);
  height: fit-content;
  border: 1px solid var(--app-border);
  border-radius: 8px;
}

.profile-card :deep(.ant-card-body) {
  padding: 34px 44px 42px;
}

.profile-header {
  display: flex;
  gap: 18px;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 24px;
  border-bottom: 1px solid #edf0f3;
}

.profile-header h2 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 24px;
  font-weight: 700;
}

.profile-header p {
  margin: 0;
  color: #6b7280;
}

.profile-info {
  display: grid;
  gap: 18px;
  margin: 0;
}

.profile-info div {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  align-items: center;
  min-height: 24px;
}

.profile-info dt {
  color: #667085;
  font-weight: 500;
}

.profile-info dd {
  margin: 0;
  color: #1f2937;
  font-weight: 600;
}
</style>
