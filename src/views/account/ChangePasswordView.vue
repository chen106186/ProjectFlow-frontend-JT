<template>
  <section class="change-password-page">
    <a-card class="password-card" :bordered="false">
      <div class="password-card__header">
        <span class="password-icon"><LockOutlined /></span>
        <div>
          <h2>修改密码</h2>
          <p>建议使用包含字母、数字和符号的密码，提高账号安全性。</p>
        </div>
      </div>

      <a-form ref="formRef" class="password-form" :model="formState" :rules="formRules" layout="vertical">
        <a-form-item label="原密码" name="oldPassword">
          <a-input-password v-model:value="formState.oldPassword" placeholder="请输入原密码" />
        </a-form-item>
        <a-form-item label="新密码" name="newPassword">
          <a-input-password v-model:value="formState.newPassword" placeholder="请输入新密码" />
        </a-form-item>
        <a-form-item label="确认新密码" name="confirmPassword">
          <a-input-password v-model:value="formState.confirmPassword" placeholder="请再次输入新密码" />
        </a-form-item>

        <div class="password-tips">
          <p>密码规则</p>
          <ul>
            <li>长度不少于 8 位</li>
            <li>不能与原密码一致</li>
            <li>两次输入的新密码必须一致</li>
          </ul>
        </div>

        <a-form-item class="password-actions">
          <a-space>
            <a-button @click="handleReset">重置</a-button>
            <a-button type="primary" @click="handleSubmit">保存</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </section>
</template>

<script setup>
import { LockOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { reactive, ref } from 'vue'
import { changePassword } from '@/api/auth'

const formRef = ref()
const formState = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const validateConfirmPassword = async (_rule, value) => {
  if (!value) {
    return Promise.reject(new Error('请确认新密码'))
  }

  if (value !== formState.newPassword) {
    return Promise.reject(new Error('两次输入的新密码不一致'))
  }

  return Promise.resolve()
}

const validateNewPassword = async (_rule, value) => {
  if (!value) {
    return Promise.reject(new Error('请输入新密码'))
  }

  if (value.length < 8) {
    return Promise.reject(new Error('新密码长度不能少于 8 位'))
  }

  if (value === formState.oldPassword) {
    return Promise.reject(new Error('新密码不能与原密码一致'))
  }

  return Promise.resolve()
}

const formRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [{ validator: validateNewPassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }],
}

const handleReset = () => {
  Object.assign(formState, {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  formRef.value?.clearValidate()
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  try {
    await changePassword({ oldPassword: formState.oldPassword, newPassword: formState.newPassword })
    message.success('密码修改成功，请重新登录')
    handleReset()
  } catch (e) {
    message.error(e?.message || '密码修改失败')
  }
}
</script>

<style scoped>
.change-password-page {
  display: flex;
  justify-content: center;
  min-height: 100%;
  padding-top: 24px;
}

.password-card {
  width: min(620px, 100%);
  height: fit-content;
  border: 1px solid var(--app-border);
  border-radius: 18px;
}

.password-card :deep(.ant-card-body) {
  padding: 34px 42px 36px;
}

.password-card__header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 28px;
}

.password-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: #1677ff;
  font-size: 24px;
  background: #e6f4ff;
  border-radius: 14px;
}

.password-card__header h2 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 24px;
  font-weight: 700;
}

.password-card__header p {
  margin: 0;
  color: #6b7280;
}

.password-form :deep(.ant-input-password) {
  height: 42px;
}

.password-tips {
  margin: 4px 0 24px;
  padding: 14px 16px;
  color: #667085;
  background: #f8fbff;
  border: 1px solid #e6f0ff;
  border-radius: 12px;
}

.password-tips p {
  margin: 0 0 8px;
  color: #1f2937;
  font-weight: 600;
}

.password-tips ul {
  margin: 0;
  padding-left: 18px;
}

.password-actions {
  margin-bottom: 0;
  text-align: right;
}

.password-actions :deep(.ant-btn) {
  min-width: 96px;
  height: 38px;
}
</style>
