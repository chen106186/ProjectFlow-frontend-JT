import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import 'dayjs/locale/zh-cn'

import App from './App.vue'
import router from './router'
import 'normalize.css'
import './styles/ant.scss'
import './styles/main.css'
import './styles/frappe-gantt.css'
import './styles/base.css'
import './utils/rem'
import px2rem from './utils/px2rem'



createApp(App).use(Antd).use(router).use(px2rem).mount('#app')
