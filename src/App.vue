<template>
  <a-config-provider :locale="zhCN" :theme="themeConfig">
    <router-view />
  </a-config-provider>
</template>

<script setup>
import zhCN from 'ant-design-vue/es/locale/zh_CN'

const themeConfig = {
  token: {
    colorPrimary: '#1677ff',
    colorBgLayout: '#f3f6f9',
    borderRadius: 6,
    fontFamily: "'Microsoft YaHei', 'PingFang SC', Arial, sans-serif",
  },
}
</script>
