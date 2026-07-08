# Design QA

- Source visual truth: `E:/01-项目/01-2026年项目/10-公司内部管理系统/原型图/0710开发原型图/首页/首页-任务日历.png`
- Implementation screenshot: `.codex-tools/task-calendar-1366x741.png`
- Viewport: 1366 x 741
- State: 首页点击“查看完整日历”后的弹窗打开状态
- Full-view comparison evidence: 原型图与 `.codex-tools/task-calendar-1366x741.png`
- Focused region comparison: 日历网格、右侧任务卡片、弹窗边界与顶部/侧栏关系

## Findings

- [已修复 P1] 首轮弹窗覆盖顶部栏和左侧导航。
  - 修复：提高弹窗定位样式优先级，将范围限制为 `top: 68px; left: 212px` 的主内容区域。
- [已修复 P2] 首轮日历以周一为首日，与原型“日—六”不一致。
  - 修复：设置 Day.js 中文区域的 `weekStart: 0`。
- 字体与层级：沿用项目微软雅黑/苹方字体体系，弹窗标题、月份、任务标题和辅助信息层级与原型一致。
- 间距与布局：使用左侧月历、右侧当日任务面板双栏结构，任务卡片保持紧凑密度。
- 色彩与视觉变量：紧急、逾期、即将到期、进行中、未开始、已完成使用原型对应语义色。
- 图像与图标：页面无业务图片资产，交互图标全部复用 Ant Design Icons。
- 文案与内容：按原型复现 2026 年 6 月任务、状态图例和 6 月 16 日任务列表。

## Interaction Checks

- [x] 首页“查看完整日历”可打开弹窗
- [x] 月份切换、今天、关闭按钮和任务卡片已渲染为可交互控件
- [x] 日期选择会联动右侧任务列表
- [x] 无数据日期展示空状态
- [ ] 修复后的最终截图复核因浏览器连接连续超时未完成

## Patches Made

- 新增 `TaskCalendarModal.vue` 独立组件。
- 首页接入弹窗打开状态。
- 实现月切换、今天、日期联动和关闭交互。
- 修复弹窗主内容区定位和星期起始日。

final result: blocked

---

# 执行类项目页面 Design QA

- Source visual truth: `E:/01-项目/01-2026年项目/10-公司内部管理系统/原型图-0710/项目清单/执行类项目/项目清单执行类项目.png`
- Implementation screenshot: 未生成
- Viewport: 1366 x 678（原型图尺寸）
- State: 执行类项目列表默认状态
- Full-view comparison evidence: 已打开原型图；本地实现截图因开发服务器启动权限未获批准而缺失
- Focused region comparison evidence: 无法完成同视口筛选区、工具栏及表格区域对比

## Findings

- [P1] 缺少实现截图，无法确认筛选区、表格密度、间距与原型的视觉一致性。
  - Blocker: 本地前端开发服务器启动权限未获批准。
  - Required follow-up: 用户手动启动前端服务后，按 1366 x 678 视口捕获 `/projects/execution` 并进行对比。
- 字体与排版：代码沿用项目及 Ant Design Vue 现有字体层级，尚未完成渲染核对。
- 间距与布局：实现为顶部筛选卡片和下方列表卡片，尚未完成同视口核对。
- 色彩与视觉变量：沿用项目蓝色主操作和语义状态色，尚未完成截图采样核对。
- 图像与资产：该页面无业务图片，操作图标复用 Ant Design Icons。
- 文案与内容：筛选项、列表字段和操作文案已按原型实现。

## Patches Made

- 新增执行类项目独立页面及路由。
- 接入项目、任务数、Bug 数、用户和字典接口。
- 实现查询、重置、分页、列表/分组、新建、编辑、详情和删除交互。

final result: blocked
