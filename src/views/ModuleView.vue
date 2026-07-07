<template>
  <div class="module-view">
    <a-breadcrumb class="module-view__breadcrumb">
      <a-breadcrumb-item>首页</a-breadcrumb-item>
      <a-breadcrumb-item v-if="route.meta.group !== route.meta.title">{{ route.meta.group }}</a-breadcrumb-item>
      <a-breadcrumb-item>{{ route.meta.title }}</a-breadcrumb-item>
    </a-breadcrumb>

    <h1>{{ route.meta.title }}</h1>

    <a-card :bordered="false">
      <a-result status="info" title="页面基础路由已初始化" sub-title="后端接口契约尚未提供，当前未实现业务数据与操作。">
        <template #extra>
          <a-button type="primary" @click="handleBackHome">返回首页</a-button>
        </template>
      </a-result>
    </a-card>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const handleBackHome = () => {
  router.push('/')
}
</script>

<style scoped>
.module-view {
  min-width: 0;
}

.module-view__breadcrumb {
  margin-bottom: 12px;
}

.module-view h1 {
  margin: 0 0 18px;
  color: #1f1f1f;
  font-size: 24px;
  font-weight: 600;
}

.module-view :deep(.ant-card) {
  min-height: 460px;
  border: 1px solid #eef1f4;
}
</style>
