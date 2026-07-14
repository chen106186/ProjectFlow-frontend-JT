const taskColumns = [
  { title: '任务编号', dataIndex: 'code', width: 118 },
  { title: '任务名称', dataIndex: 'name', minWidth: 220 },
  { title: '所属项目', dataIndex: 'project', width: 180 },
  { title: '负责人', dataIndex: 'owner', width: 100 },
  { title: '优先级', dataIndex: 'priority', width: 96 },
  { title: '状态', dataIndex: 'status', width: 110 },
  { title: '截止日期', dataIndex: 'deadline', width: 128 },
  { title: '进度', dataIndex: 'progress', width: 130 },
]

const bugColumns = [
  { title: 'Bug 编号', dataIndex: 'code', width: 118 },
  { title: 'Bug 标题', dataIndex: 'name', minWidth: 240 },
  { title: '关联项目', dataIndex: 'project', width: 180 },
  { title: '严重程度', dataIndex: 'severity', width: 106 },
  { title: '指派给', dataIndex: 'owner', width: 100 },
  { title: '状态', dataIndex: 'status', width: 110 },
  { title: '创建时间', dataIndex: 'createdAt', width: 170 },
]

const projectColumns = [
  { title: '项目编号', dataIndex: 'code', width: 118 },
  { title: '项目名称', dataIndex: 'name', minWidth: 230 },
  { title: '项目经理', dataIndex: 'manager', width: 106 },
  { title: '项目类型', dataIndex: 'type', width: 112 },
  { title: '当前阶段', dataIndex: 'stage', width: 128 },
  { title: '项目状态', dataIndex: 'status', width: 110 },
  { title: '计划周期', dataIndex: 'period', width: 198 },
  { title: '完成度', dataIndex: 'progress', width: 130 },
]

const taskRows = [
  { key: 'T-240701', code: 'T-240701', name: '项目首页数据看板静态联调', project: '项目管理与开发系统', owner: '张明', priority: '高', status: '进行中', deadline: '2026-07-10', progress: 65 },
  { key: 'T-240702', code: 'T-240702', name: '任务列表筛选条件补充', project: '项目管理与开发系统', owner: '李娜', priority: '中', status: '待处理', deadline: '2026-07-12', progress: 20 },
  { key: 'T-240703', code: 'T-240703', name: '日报汇总页面原型还原', project: '团队协同平台', owner: '王强', priority: '中', status: '已完成', deadline: '2026-07-05', progress: 100 },
  { key: 'T-240704', code: 'T-240704', name: '测试任务缺陷回归记录', project: '质量管理平台', owner: '赵倩', priority: '低', status: '待验收', deadline: '2026-07-15', progress: 82 },
]

const bugRows = [
  { key: 'B-240601', code: 'B-240601', name: '侧边菜单切换后选中态未同步', project: '项目管理与开发系统', severity: '一般', owner: '张明', status: '处理中', createdAt: '2026-07-03 09:18:26' },
  { key: 'B-240602', code: 'B-240602', name: '任务截止日期为空时展示异常', project: '团队协同平台', severity: '严重', owner: '李娜', status: '待修复', createdAt: '2026-07-04 14:32:09' },
  { key: 'B-240603', code: 'B-240603', name: '日报提交按钮重复点击未限制', project: '质量管理平台', severity: '提示', owner: '赵倩', status: '已关闭', createdAt: '2026-07-01 18:05:43' },
]

const projectRows = [
  { key: 'P-2401', code: 'P-2401', name: '项目管理与开发系统', manager: '陈晨', type: '管理类', stage: '原型确认', status: '进行中', period: '2026-06-20 至 2026-08-15', progress: 46 },
  { key: 'P-2402', code: 'P-2402', name: '团队协同平台', manager: '刘洋', type: '执行类', stage: '开发阶段', status: '进行中', period: '2026-07-01 至 2026-09-30', progress: 34 },
  { key: 'P-2403', code: 'P-2403', name: '质量管理平台', manager: '孙敏', type: '执行类', stage: '测试阶段', status: '待验收', period: '2026-05-10 至 2026-07-25', progress: 88 },
]

const statusColorMap = {
  待处理: 'default',
  进行中: 'processing',
  已完成: 'success',
  待验收: 'warning',
  处理中: 'processing',
  待修复: 'error',
  已关闭: 'success',
}

const priorityColorMap = {
  高: 'red',
  中: 'orange',
  低: 'blue',
  严重: 'red',
  一般: 'orange',
  提示: 'blue',
}

const baseFilters = [
  { key: 'keyword', label: '关键字', type: 'input', placeholder: '请输入编号/名称' },
  { key: 'status', label: '状态', type: 'select', placeholder: '全部状态', options: ['待处理', '进行中', '待验收', '已完成'] },
  { key: 'date', label: '日期范围', type: 'range' },
]

export const moduleConfigs = {
  PersonalTasks: {
    subtitle: '汇总当前登录人负责、参与和待验收的任务。',
    actions: ['新建任务', '导出任务'],
    metrics: [
      { label: '待处理', value: 8 },
      { label: '进行中', value: 12 },
      { label: '今日到期', value: 3 },
      { label: '已完成', value: 24 },
    ],
    filters: baseFilters,
    columns: taskColumns,
    rows: taskRows.filter(row => row.owner !== '王强'),
    tableTitle: '我的任务清单',
  },
  PersonalBugs: {
    subtitle: '跟踪指派给我的缺陷、待修复项和回归结果。',
    actions: ['新建 Bug', '批量关闭'],
    metrics: [
      { label: '待修复', value: 5 },
      { label: '处理中', value: 7 },
      { label: '待回归', value: 2 },
      { label: '已关闭', value: 18 },
    ],
    filters: [
      { key: 'keyword', label: '关键字', type: 'input', placeholder: '请输入 Bug 编号/标题' },
      { key: 'severity', label: '严重程度', type: 'select', placeholder: '全部程度', options: ['严重', '一般', '提示'] },
      { key: 'status', label: '状态', type: 'select', placeholder: '全部状态', options: ['待修复', '处理中', '已关闭'] },
    ],
    columns: bugColumns,
    rows: bugRows,
    tableTitle: '我的 Bug 清单',
  },
  PersonalDaily: {
    subtitle: '记录每日工作内容、风险问题和明日计划。',
    actions: ['填写日报', '导出日报'],
    type: 'daily',
    metrics: [
      { label: '本周已提交', value: 4 },
      { label: '待补交', value: 1 },
      { label: '项目事项', value: 16 },
      { label: '风险问题', value: 2 },
    ],
  },
  PersonalStatistics: {
    subtitle: '查看个人任务、Bug 和日报的周期统计。',
    actions: ['切换周期', '导出统计'],
    type: 'statistics',
    metrics: [
      { label: '任务完成率', value: '82%' },
      { label: 'Bug 关闭率', value: '76%' },
      { label: '平均延期', value: '0.8天' },
      { label: '日报提交率', value: '96%' },
    ],
  },
  ManagementProjects: {
    subtitle: '维护管理类项目台账，跟踪项目阶段、负责人和周期。',
    actions: ['新建项目', '项目导入'],
    metrics: [
      { label: '项目总数', value: 14 },
      { label: '进行中', value: 9 },
      { label: '待验收', value: 3 },
      { label: '已完成', value: 21 },
    ],
    filters: [
      { key: 'keyword', label: '项目名称', type: 'input', placeholder: '请输入项目名称/编号' },
      { key: 'stage', label: '项目阶段', type: 'select', placeholder: '全部阶段', options: ['需求阶段', '原型确认', '开发阶段', '测试阶段', '验收阶段'] },
      { key: 'date', label: '计划周期', type: 'range' },
    ],
    columns: projectColumns,
    rows: projectRows.filter(row => row.type === '管理类'),
    tableTitle: '管理类项目列表',
  },
  ExecutionProjects: {
    subtitle: '查看执行类项目进度、计划周期和验收状态。',
    actions: ['新建项目', '导出项目'],
    metrics: [
      { label: '执行项目', value: 18 },
      { label: '开发中', value: 8 },
      { label: '测试中', value: 5 },
      { label: '风险预警', value: 2 },
    ],
    filters: [
      { key: 'keyword', label: '项目名称', type: 'input', placeholder: '请输入项目名称/编号' },
      { key: 'status', label: '项目状态', type: 'select', placeholder: '全部状态', options: ['进行中', '待验收', '已完成'] },
      { key: 'date', label: '计划周期', type: 'range' },
    ],
    columns: projectColumns,
    rows: projectRows.filter(row => row.type === '执行类'),
    tableTitle: '执行类项目列表',
  },
  AllTasks: {
    subtitle: '统一查看所有项目任务，支持按状态、负责人和周期筛选。',
    actions: ['新建任务', '任务导入'],
    metrics: [
      { label: '全部任务', value: 68 },
      { label: '待处理', value: 15 },
      { label: '进行中', value: 27 },
      { label: '已逾期', value: 4 },
    ],
    filters: baseFilters,
    columns: taskColumns,
    rows: taskRows,
    tableTitle: '全部任务列表',
  },
  DevelopmentTasks: {
    subtitle: '聚焦开发阶段任务，跟踪开发负责人、进度和交付日期。',
    actions: ['新建开发任务', '分配任务'],
    metrics: [
      { label: '开发任务', value: 31 },
      { label: '待开发', value: 9 },
      { label: '开发中', value: 15 },
      { label: '待联调', value: 7 },
    ],
    filters: baseFilters,
    columns: taskColumns,
    rows: taskRows.slice(0, 3),
    tableTitle: '开发任务列表',
  },
  TestingTasks: {
    subtitle: '管理测试计划、测试执行和验收回归任务。',
    actions: ['新建测试任务', '生成报告'],
    metrics: [
      { label: '测试任务', value: 22 },
      { label: '待测试', value: 6 },
      { label: '执行中', value: 10 },
      { label: '已通过', value: 12 },
    ],
    filters: baseFilters,
    columns: taskColumns,
    rows: taskRows.slice(1),
    tableTitle: '测试任务列表',
  },
  BugList: {
    subtitle: '集中管理缺陷生命周期，从创建、分配、修复到关闭。',
    actions: ['新建 Bug', '导出 Bug'],
    metrics: [
      { label: '全部 Bug', value: 42 },
      { label: '待修复', value: 11 },
      { label: '处理中', value: 16 },
      { label: '已关闭', value: 29 },
    ],
    filters: [
      { key: 'keyword', label: '关键字', type: 'input', placeholder: '请输入 Bug 编号/标题' },
      { key: 'severity', label: '严重程度', type: 'select', placeholder: '全部程度', options: ['严重', '一般', '提示'] },
      { key: 'status', label: '状态', type: 'select', placeholder: '全部状态', options: ['待修复', '处理中', '已关闭'] },
    ],
    columns: bugColumns,
    rows: bugRows,
    tableTitle: 'Bug 列表',
  },
}

export const getStatusColor = value => statusColorMap[value] || 'default'

export const getPriorityColor = value => priorityColorMap[value] || 'default'
