<template>
  <main class="login-page">
    <section class="login-brand-panel" aria-label="系统介绍">
      <div class="login-brand-panel__content">
        <span class="login-brand-panel__mark">P</span>
        <p class="login-brand-panel__eyebrow">PROJECT FLOW</p>
        <h1>项目与开发管理系统</h1>
        <p class="login-brand-panel__description">集中管理项目、任务与缺陷，让团队协作过程清晰可追踪。</p>
      </div>
      <p class="login-brand-panel__footer">项目全生命周期协同平台</p>
    </section>

    <section class="login-form-panel">
      <div class="login-form-card">
        <div class="login-form-card__heading">
          <h2>欢迎登录</h2>
          <p>请输入账号信息进入管理平台</p>
        </div>

        <a-form ref="formRef" :model="formState" :rules="formRules" layout="vertical" @finish="handleSubmit">
          <a-form-item label="账号" name="username">
            <a-input v-model:value="formState.username" size="large" placeholder="请输入登录账号" autocomplete="username">
              <template #prefix><UserOutlined /></template>
            </a-input>
          </a-form-item>

          <a-form-item label="密码" name="password">
            <a-input-password v-model:value="formState.password" size="large" placeholder="请输入登录密码" autocomplete="current-password">
              <template #prefix><LockOutlined /></template>
            </a-input-password>
          </a-form-item>

          <a-form-item class="login-form-card__options">
            <a-checkbox v-model:checked="formState.remember">记住账号</a-checkbox>
          </a-form-item>

          <a-button class="login-form-card__submit" type="primary" html-type="submit" size="large" :loading="submitLoading">
            登录
          </a-button>
        </a-form>

        <a-alert class="login-form-card__notice" type="info" show-icon message="登录成功后将进入项目与开发管理系统。" />
      </div>
    </section>
  </main>
</template>

<script setup>
import { LockOutlined, UserOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '@/api/auth'
import { useDictStore } from '@/store/dictStore'

const router = useRouter()
const dictStore = useDictStore()
const submitLoading = ref(false)
const formState = reactive({
  username: '',
  password: '',
  remember: false,
})

const formRules = {
  username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入登录密码', trigger: 'blur' }],
}

onMounted(() => {
  const rememberedUsername = localStorage.getItem('rememberedUsername')
  if (rememberedUsername) {
    formState.username = rememberedUsername
    formState.remember = true
  }
})

const handleSubmit = async () => {
  if (submitLoading.value) {
    return
  }

  submitLoading.value = true

  try {
    const user = await login({
      username: formState.username,
      password: formState.password,
    })

    localStorage.setItem('token', user.token)
    localStorage.setItem('userInfo', JSON.stringify({
      userId: user.userId,
      realName: user.realName,
    }))
    try {
      await dictStore.loadDicts()
    } catch (error) {
      message.error(error.message || '字典数据加载失败')
    }

    if (formState.remember) {
      localStorage.setItem('rememberedUsername', formState.username)
    } else {
      localStorage.removeItem('rememberedUsername')
    }

    message.success('登录成功')
    router.push('/')
  } catch (error) {
    message.error(error.message || '登录失败，请检查账号或密码')
  } finally {
    submitLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: grid;
  grid-template-columns: minmax(460px, 46%) 1fr;
  min-width: 960px;
  min-height: 100vh;
  background: #f5f7fa;
}

.login-brand-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 64px 72px 40px;
  color: #fff;
  background: #001529;
}

.login-brand-panel__content {
  max-width: 540px;
  margin: auto 0;
}

.login-brand-panel__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: 44px;
  font-size: 30px;
  font-weight: 700;
  background: #1677ff;
  border-radius: 12px;
  box-shadow: 0 14px 30px rgb(22 119 255 / 28%);
}

.login-brand-panel__eyebrow {
  margin-bottom: 12px;
  color: #69b1ff;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 3px;
}

.login-brand-panel h1 {
  margin: 0 0 24px;
  color: #fff;
  font-size: 36px;
  font-weight: 600;
  line-height: 1.35;
}

.login-brand-panel__description {
  max-width: 470px;
  margin: 0;
  color: rgb(255 255 255 / 66%);
  font-size: 16px;
  line-height: 1.9;
}

.login-brand-panel__footer {
  margin: 0;
  color: rgb(255 255 255 / 42%);
  font-size: 13px;
}

.login-form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.login-form-card {
  width: 420px;
  padding: 44px 46px;
  background: #fff;
  border: 1px solid #eef1f4;
  border-radius: 12px;
  box-shadow: 0 18px 48px rgb(15 35 55 / 9%);
}

.login-form-card__heading {
  margin-bottom: 34px;
}

.login-form-card__heading h2 {
  margin: 0 0 9px;
  color: #17233d;
  font-size: 28px;
  font-weight: 600;
}

.login-form-card__heading p {
  margin: 0;
  color: #8c8c8c;
}

.login-form-card :deep(.ant-form-item-label > label) {
  color: #394b59;
  font-weight: 500;
}

.login-form-card :deep(.ant-input-affix-wrapper) {
  min-height: 44px;
}

.login-form-card__options {
  margin-bottom: 22px;
}

.login-form-card__submit {
  width: 100%;
  height: 44px;
  font-weight: 500;
}

.login-form-card__notice {
  margin-top: 24px;
  font-size: 12px;
}

@media (max-width: 1100px) {
  .login-page {
    grid-template-columns: 42% 1fr;
  }

  .login-brand-panel {
    padding-inline: 48px;
  }
}
</style>
