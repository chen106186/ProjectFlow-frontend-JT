<template>
  <a-config-provider :locale="zhCN" :theme="themeConfig">
    <router-view />
  </a-config-provider>
</template>

<script setup>
import zhCN from 'ant-design-vue/es/locale/zh_CN'

const themeConfig = {
  token: {
    colorPrimary: '#007aff',
    colorInfo: '#007aff',
    colorSuccess: '#34c759',
    colorWarning: '#ff9f0a',
    colorError: '#ff3b30',
    colorText: '#1d1d1f',
    colorTextSecondary: '#6e6e73',
    colorBorder: 'rgba(60, 60, 67, 0.16)',
    colorBgLayout: '#f5f5f7',
    colorBgContainer: 'rgba(255, 255, 255, 0.82)',
    borderRadius: 14,
    borderRadiusLG: 18,
    borderRadiusSM: 10,
    boxShadow: '0 18px 45px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 10px 30px rgba(0, 0, 0, 0.06)',
    fontFamily: "'SF Pro Text', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif",
  },
  components: {
    Button: {
      borderRadius: 12,
      controlHeight: 38,
      fontWeight: 600,
      primaryShadow: '0 10px 24px rgba(0, 122, 255, 0.24)',
    },
    Card: {
      borderRadiusLG: 20,
      paddingLG: 22,
      headerBg: 'transparent',
    },
    Input: {
      borderRadius: 12,
      activeShadow: '0 0 0 4px rgba(0, 122, 255, 0.12)',
    },
    Select: {
      borderRadius: 12,
      optionSelectedBg: 'rgba(0, 122, 255, 0.10)',
    },
    Table: {
      headerBg: 'rgba(248, 248, 250, 0.9)',
      headerColor: '#1d1d1f',
      rowHoverBg: 'rgba(0, 122, 255, 0.045)',
    },
    Modal: {
      borderRadiusLG: 22,
    },
  },
}
</script>
