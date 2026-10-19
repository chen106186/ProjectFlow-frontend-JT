<template>
  <main class="login-page">
    <section class="login-brand-panel" aria-label="系统介绍">
      <div class="login-brand-panel__content">
        <img class="login-brand-panel__logo" :src="loginLogo" alt="" />
        <div class="login-brand-panel__copy">
          <p class="login-brand-panel__eyebrow">PROJECT FLOW</p>
          <h1>项目与开发管理系统</h1>
        </div>
      </div>
    </section>

    <section class="login-form-panel">
      <div class="login-form-card">
        <div class="login-form-card__heading">
          <h2>欢迎登录</h2>
        </div>

        <a-form ref="formRef" :model="formState" :rules="formRules" @finish="handleSubmit">
          <a-form-item name="username">
            <a-input v-model:value="formState.username" size="large" placeholder="账号" autocomplete="username">
              <template #prefix><UserOutlined /></template>
            </a-input>
          </a-form-item>

          <a-form-item name="password">
            <a-input-password v-model:value="formState.password" size="large" placeholder="密码" autocomplete="current-password">
              <template #prefix><LockOutlined /></template>
            </a-input-password>
          </a-form-item>

          <a-form-item class="login-form-card__options">
            <a-checkbox v-model:checked="formState.remember">记住我</a-checkbox>
          </a-form-item>

          <a-button class="login-form-card__submit" type="primary" html-type="submit" size="large" :loading="submitLoading">
            登录
          </a-button>
        </a-form>
      </div>
    </section>
  </main>
</template>

<script setup>
import { LockOutlined, UserOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '@/api/auth'
import loginLogo from '@/assets/images/login-logo.png'
import { useDictStore } from '@/store/dictStore'

const router = useRouter()
const route = useRoute()
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
  const rememberMe = localStorage.getItem('rememberMe') === 'true'
  if (rememberMe && rememberedUsername) {
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
      rememberMe: formState.remember,
    })

    localStorage.setItem('token', user.token)
    localStorage.setItem('userInfo', JSON.stringify({
      userId: user.userId,
      id: user.userId,
      realName: user.realName,
    }))
    try {
      await dictStore.loadDicts()
    } catch (error) {
      message.error(error.message || '字典数据加载失败')
    }

    if (formState.remember) {
      localStorage.setItem('rememberMe', 'true')
      localStorage.setItem('rememberedUsername', formState.username)
    } else {
      localStorage.removeItem('rememberMe')
      localStorage.removeItem('rememberedUsername')
    }

    message.success('登录成功')
    router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
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
  grid-template-columns: minmax(560px, 58%) minmax(420px, 42%);
  height: 100vh;
  min-height: 100vh;
  overflow: auto;
  background:
    radial-gradient(circle at 14% 12%, rgb(0 122 255 / 18%), transparent 30rem),
    radial-gradient(circle at 78% 10%, rgb(175 82 222 / 14%), transparent 32rem),
    radial-gradient(circle at 60% 88%, rgb(52 199 89 / 12%), transparent 26rem),
    linear-gradient(135deg, #fbfbfd 0%, #f5f5f7 48%, #f2f2f7 100%);
}

.login-brand-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 7vw;
}

.login-brand-panel__content {
  width: min(100%, 600px);
}

.login-brand-panel__logo {
  display: block;
  width: min(100%, 510px);
  margin: 0 auto -28px;
  filter: drop-shadow(0 24px 48px rgb(0 0 0 / 10%));
  mix-blend-mode: normal;
}

.login-brand-panel__copy {
  padding-left: 5%;
}

.login-brand-panel__eyebrow {
  margin: 0 0 18px;
  color: #007aff;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 6px;
}

.login-brand-panel h1 {
  margin: 0;
  color: #1d1d1f;
  font-size: 48px;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.28;
}

.login-form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 9vw 48px 48px;
}

.login-form-card {
  width: min(100%, 440px);
  padding: 72px 48px 76px;
  background: rgb(255 255 255 / 78%);
  border: 1px solid rgb(255 255 255 / 78%);
  border-radius: 28px;
  box-shadow: 0 30px 90px rgb(0 0 0 / 12%), inset 0 1px 0 rgb(255 255 255 / 72%);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
}

.login-form-card__heading {
  position: relative;
  margin-bottom: 48px;
  text-align: center;
}

.login-form-card__heading h2 {
  margin: 0;
  color: #1d1d1f;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.login-form-card__heading::after {
  position: absolute;
  bottom: -20px;
  left: 50%;
  width: 46px;
  height: 5px;
  background: linear-gradient(90deg, #007aff, #34c759);
  border-radius: 999px;
  content: '';
  transform: translateX(-50%);
}

.login-form-card :deep(.ant-form-item) {
  margin-bottom: 26px;
}

.login-form-card :deep(.ant-input-affix-wrapper) {
  min-height: 58px;
  padding-inline: 18px;
  border-color: rgb(60 60 67 / 16%);
  border-radius: 16px;
  background: rgb(255 255 255 / 72%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 72%);
}

.login-form-card :deep(.ant-input-affix-wrapper-focused) {
  border-color: #007aff;
  box-shadow: 0 0 0 4px rgb(0 122 255 / 12%);
}

.login-form-card :deep(.ant-input-prefix),
.login-form-card :deep(.ant-input-password-icon) {
  color: #86868b;
  font-size: 19px;
}

.login-form-card :deep(.ant-input) {
  font-size: 16px;
}

.login-form-card__options {
  margin: 4px 0 32px !important;
}

.login-form-card :deep(.ant-checkbox-wrapper) {
  color: #6e6e73;
  font-size: 16px;
}

.login-form-card__submit {
  width: 100%;
  height: 58px;
  border-radius: 16px;
  font-size: 20px;
  font-weight: 700;
  box-shadow: 0 16px 30px rgb(0 122 255 / 26%);
}

@media (max-width: 1100px) {
  .login-page {
    grid-template-columns: minmax(420px, 50%) minmax(400px, 50%);
  }

  .login-brand-panel {
    padding-inline: 40px;
  }

  .login-form-panel {
    padding: 40px;
  }
}

@media (max-width: 760px) {
  .login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .login-brand-panel {
    display: none;
  }

  .login-form-panel {
    width: 100%;
    padding: 0;
  }

  .login-form-card {
    width: 100%;
    padding: 52px 30px;
  }
}
</style>
