<template>
  <div class="module-view">
    <template v-if="isPersonalTasks || isTaskModule">
      <section v-if="personalMode === 'task-detail'" class="personal-page">
        <div class="detail-actions">
          <a-button class="back-button" @click="handleBackToTaskList">
            <template #icon><LeftOutlined /></template>
            返回
          </a-button>
          <a-tag color="blue">进行中</a-tag>
          <a-tag color="red">高</a-tag>
        </div>

        <a-card class="prototype-card task-info-card" :bordered="false">
          <a-descriptions :column="4" size="small">
            <a-descriptions-item label="任务名称">用户管理模块前端开发</a-descriptions-item>
            <a-descriptions-item label="所属项目">XX企业数字化管理系统</a-descriptions-item>
            <a-descriptions-item label="负责人">张三</a-descriptions-item>
            <a-descriptions-item label="角色">{{ currentTaskRole }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">2026-06-01</a-descriptions-item>
            <a-descriptions-item label="优先级"><a-tag color="orange">高</a-tag></a-descriptions-item>
            <a-descriptions-item label="状态"><a-tag color="blue">进行中</a-tag></a-descriptions-item>
            <a-descriptions-item label="计划开始日期">2026-06-15</a-descriptions-item>
            <a-descriptions-item label="计划结束日期">2026-06-15</a-descriptions-item>
            <a-descriptions-item label="实际开始日期">2026-06-15</a-descriptions-item>
            <a-descriptions-item label="实际结束日期">2026-06-15</a-descriptions-item>
            <a-descriptions-item label="任务描述" :span="3">完成用户管理模块的前端页面开发，包括用户列表、新增/编辑用户弹窗、角色分配等功能。需要与后端接口联调。</a-descriptions-item>
            <a-descriptions-item label="标签">前端　算法</a-descriptions-item>
          </a-descriptions>
        </a-card>

        <section class="task-detail-grid">
          <div>
            <a-card class="prototype-card attachment-card" :bordered="false">
              <template #title>
                <span class="section-title"><PaperClipOutlined /> 附件展示</span>
              </template>
              <template #extra>
                <a-button type="primary" size="small" @click="uploadOpen = true">上传文件</a-button>
              </template>
              <a-table :columns="attachmentColumns" :data-source="attachments" :pagination="false" size="small" row-key="name">
                <template #bodyCell="{ column, record, text }">
                  <template v-if="column.dataIndex === 'name'">
                    <span class="file-name"><FileTextOutlined />{{ text }}</span>
                  </template>
                  <template v-else-if="column.dataIndex === 'action'">
                    <a-space :size="6">
                      <a-button type="primary" size="small">下载</a-button>
                      <a-button danger size="small">删除</a-button>
                    </a-space>
                  </template>
                  <template v-else>{{ record[column.dataIndex] }}</template>
                </template>
              </a-table>
            </a-card>

            <a-card class="prototype-card log-card" :bordered="false">
              <template #title>
                <span class="section-title"><EditOutlined /> 操作日志</span>
              </template>
              <a-timeline>
                <a-timeline-item v-for="log in taskLogs" :key="log.time">
                  <span class="log-meta">{{ log.time }}　{{ log.user }}</span>
                  <p>{{ log.text }}</p>
                </a-timeline-item>
              </a-timeline>
            </a-card>
          </div>

          <a-card class="prototype-card related-bugs" :bordered="false">
            <template #title>
              <span class="section-title"><BugOutlined /> 关联Bug（5）</span>
            </template>
            <article v-for="bug in relatedBugs" :key="bug.code" class="bug-mini-card">
              <p class="bug-code"><BugOutlined /> {{ bug.code }}</p>
              <strong>{{ bug.title }}</strong>
              <div>
                <a-tag :color="bug.levelColor">{{ bug.level }}</a-tag>
                <a-tag :color="bug.statusColor">{{ bug.status }}</a-tag>
              </div>
            </article>
          </a-card>
        </section>
      </section>

      <section v-else class="personal-page">
        <a-card class="prototype-card filter-panel" :bordered="false">
          <a-form class="prototype-filter" layout="inline">
            <a-form-item label="任务名称"><a-input /></a-form-item>
            <a-form-item label="所属项目"><a-select value="全部" :options="selectOptions" /></a-form-item>
            <a-form-item label="负责人"><a-select value="全部" :options="selectOptions" /></a-form-item>
            <a-form-item label="优先级"><a-select value="全部" :options="selectOptions" /></a-form-item>
            <a-form-item label="状态"><a-select value="全部" :options="selectOptions" /></a-form-item>
            <a-form-item label="计划结束日期"><a-date-picker /></a-form-item>
            <a-form-item class="filter-buttons">
              <a-space>
                <a-button type="primary">查询</a-button>
                <a-button>重置</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </a-card>

        <a-card class="prototype-card list-card task-list-card" :bordered="false">
          <div class="list-toolbar">
            <span></span>
            <a-space>
              <span class="muted">分组条件：</span>
              <a-select class="group-select" value="所属项目" :options="projectGroupOptions" />
              <a-button type="link">列表</a-button>
              <a-button>分组</a-button>
            </a-space>
          </div>
          <div class="prototype-table-scroll">
            <table class="prototype-table task-prototype-table">
              <thead>
                <tr>
                  <th v-for="column in personalTaskColumns" :key="column.dataIndex" :style="{ width: `${column.width}px` }">{{ column.title }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in visibleTasks" :key="record.id">
                  <td>{{ record.index }}</td>
                  <td><button class="text-link" type="button" @click="handleTaskDetail">{{ record.name }}</button></td>
                  <td><button class="text-link" type="button">{{ record.project }}</button></td>
                  <td>{{ record.role }}</td>
                  <td>{{ record.tag }}</td>
                  <td>{{ record.owner }}</td>
                  <td><span class="tag-soft tag-priority">{{ record.priority }}</span></td>
                  <td><span class="tag-soft tag-processing">{{ record.status }}</span></td>
                  <td>{{ record.planStart }}</td>
                  <td>{{ record.actualStart }}</td>
                  <td>{{ record.planEnd }}</td>
                  <td>{{ record.actualEnd }}</td>
                  <td>{{ record.createdAt }}</td>
                  <td><button class="icon-link" type="button" title="编辑任务" @click="taskEditOpen = true"><EditOutlined /></button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="prototype-pagination">
            <span>共 6 条</span>
            <a-pagination size="small" :current="1" :total="30" :page-size="10" />
            <span>前往</span>
            <a-input value="1" size="small" />
            <span>页</span>
          </div>
        </a-card>
      </section>
    </template>

    <template v-else-if="isPersonalBugs">
      <section v-if="personalMode === 'bug-detail'" class="personal-page">
        <a-button class="back-button" @click="handleBackToBugList">
          <template #icon><LeftOutlined /></template>
          返回
        </a-button>
        <a-card class="prototype-card bug-detail-card" :bordered="false">
          <h2>基本信息</h2>
          <div class="bug-info-grid">
            <span>Bug编号</span><strong>BUG-2026-00102</strong>
            <span>标题</span><strong>用户登录页面异常报错</strong>
            <span>所属项目</span><strong>XX企业数字化管理系统</strong>
            <span>严重等级</span><strong><a-tag color="red">严重</a-tag></strong>
            <span>状态</span><strong><a-tag color="orange">已确认</a-tag></strong>
            <span>指定人</span><strong>张三</strong>
            <span>创建人</span><strong>李四</strong>
            <span>创建时间</span><strong>2026-06-10</strong>
          </div>
          <div class="bug-text-block">
            <h3>问题描述</h3>
            <p>在 Chrome 浏览器下登录页面出现 500 错误，其他浏览器正常。</p>
            <h3>重现步骤</h3>
            <p>1. 打开登录页　2. 输入用户名密码　3. 点击登录按钮　&gt; 控制台报错 500</p>
          </div>
        </a-card>
      </section>

      <section v-else class="personal-page">
        <a-card class="prototype-card filter-panel" :bordered="false">
          <a-form class="prototype-filter bug-filter" layout="inline">
            <a-form-item label="搜索"><a-input /></a-form-item>
            <a-form-item label="所属项目"><a-select value="全部" :options="selectOptions" /></a-form-item>
            <a-form-item label="严重等级"><a-select value="全部" :options="selectOptions" /></a-form-item>
            <a-form-item label="状态"><a-select value="全部" :options="selectOptions" /></a-form-item>
            <a-form-item label="创建人"><a-select value="全部" :options="selectOptions" /></a-form-item>
            <a-form-item label="指定人"><a-select value="全部" :options="selectOptions" /></a-form-item>
            <a-form-item class="filter-buttons">
              <a-space>
                <a-button type="primary">查询</a-button>
                <a-button>重置</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </a-card>

        <a-card class="prototype-card list-card bug-list-card" :bordered="false">
          <div class="list-toolbar">
            <a-button type="primary" @click="bugEditOpen = true">
              <template #icon><PlusOutlined /></template>
              新增Bug
            </a-button>
            <a-space>
              <span class="muted">分组条件：</span>
              <a-select class="group-select" value="所属项目" :options="projectGroupOptions" />
              <a-button type="link">列表</a-button>
              <a-button>分组</a-button>
            </a-space>
          </div>
          <a-table :columns="personalBugColumns" :data-source="personalBugs" :pagination="smallPagination" :scroll="{ x: 1320, y: 330 }" size="middle" row-key="id">
            <template #bodyCell="{ column, record, text }">
              <template v-if="column.dataIndex === 'title'">
                <a-button type="link" class="cell-link bug-title" @click="handleBugDetail">
                  <BugOutlined />{{ text }}
                </a-button>
              </template>
              <template v-else-if="column.dataIndex === 'level'">
                <a-tag :color="record.levelColor">{{ text }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'status'">
                <a-tag :color="record.statusColor">{{ text }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'operation'">
                <a-button type="link" size="small" @click="handleBugDetail">详情</a-button>
              </template>
              <template v-else>{{ text }}</template>
            </template>
          </a-table>
        </a-card>
      </section>
    </template>

    <template v-else-if="isPersonalDaily">
      <section class="personal-page daily-page">
        <div class="daily-header">
          <div class="prototype-heading prototype-heading--inline">
            <h1 class="prototype-title">日报</h1>
          </div>
          <a-space>
            <a-select class="daily-select" value="全部" :options="selectOptions" />
            <a-input-search class="daily-search" placeholder="请搜索或选择人员" />
            <a-button type="primary" @click="dailyEditOpen = true">
              <template #icon><PlusOutlined /></template>
              记录工作
            </a-button>
          </a-space>
        </div>
        <div class="date-toolbar">
          <a-button class="date-nav-button" @click="shiftDailyDate(-1)"><LeftOutlined /></a-button>
          <strong>{{ selectedDailyDateText }}</strong>
          <a-button class="date-nav-button" @click="shiftDailyDate(1)"><RightOutlined /></a-button>
          <a-button @click="backToToday">回到今天</a-button>
          <a-date-picker v-model:value="selectedDailyDate" :allow-clear="false" />
        </div>
        <section class="daily-workspace">
          <a-card class="week-card" :bordered="false">
            <div class="week-head">
              <a-button type="text" class="week-nav-button" @click="shiftDailyWeek(-1)"><LeftOutlined /></a-button>
              <div>
                <strong>{{ weekTitle }}</strong>
                <span>{{ weekRangeText }}</span>
              </div>
              <a-button type="text" class="week-nav-button" @click="shiftDailyWeek(1)"><RightOutlined /></a-button>
            </div>
            <button
              v-for="day in weekDays"
              :key="day.key"
              class="week-day"
              :class="{ active: day.active, today: day.today }"
              type="button"
              @click="selectDailyDate(day.date)"
            >
              <span>{{ day.week }}</span>
              <strong>{{ day.day }}</strong>
              <em>{{ day.dateText }}</em>
            </button>
          </a-card>
          <a-card class="daily-content-card" :bordered="false">
            <template v-if="dailyHasRecord">
              <div class="daily-record-head">
                <span>所属项目：国网XX项目</span>
                <span>提交人：张三</span>
              </div>
              <div class="daily-record-body">
                <label>工作内容：</label>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean euismod bibendum laoreet. Proin gravida dolor sit amet lacus accumsan et viverra justo commodo.</p>
              </div>
              <h3>已上传附件（2）</h3>
              <div class="daily-files">
                <article v-for="file in dailyFiles" :key="file.name" class="daily-file">
                  <span class="daily-file-icon" :class="file.type">
                    <component :is="file.icon" />
                  </span>
                  <div>
                    <strong>{{ file.name }}</strong>
                    <p>{{ file.size }}　{{ file.time }}　张三</p>
                    <a-space :size="6">
                      <a-tooltip title="预览">
                        <a-button class="file-action-button" type="text" size="small" aria-label="预览"><EyeOutlined /></a-button>
                      </a-tooltip>
                      <a-tooltip title="下载">
                        <a-button class="file-action-button" type="text" size="small" aria-label="下载"><DownloadOutlined /></a-button>
                      </a-tooltip>
                      <a-tooltip title="删除">
                        <a-button class="file-action-button danger" type="text" size="small" aria-label="删除"><DeleteOutlined /></a-button>
                      </a-tooltip>
                    </a-space>
                  </div>
                </article>
              </div>
              <span class="daily-time">{{ dailySubmitTime }}</span>
            </template>
            <a-empty v-else description="今天还没有工作记录" />
          </a-card>
        </section>
      </section>
    </template>

    <template v-else-if="isPersonalStatistics">
      <section class="personal-page statistics-page">
        <a-card class="prototype-card statistics-shell" :bordered="false">
          <div class="stats-title-row">
            <div class="prototype-heading prototype-heading--inline">
              <h1 class="prototype-title">我的统计</h1>
            </div>
            <a-select class="daily-select" value="今天" :options="todayOptions" />
          </div>
          <section class="stat-cards">
            <article v-for="card in statCards" :key="card.label" class="stat-card">
              <span class="stat-icon" :class="card.className"><component :is="card.icon" /></span>
              <div><span>{{ card.label }}</span><strong>{{ card.value }}</strong></div>
            </article>
          </section>
          <section class="stats-panels">
            <a-card class="chart-card" :bordered="false" title="任务完成趋势">
              <div ref="trendChartRef" class="echart trend-chart"></div>
            </a-card>
            <a-card class="chart-card" :bordered="false" title="工作分布">
              <div class="distribution">
                <div class="distribution-panel">
                  <h3>项目分布</h3>
                  <div ref="projectChartRef" class="echart donut-chart"></div>
                  <ul class="chart-legend">
                    <li><span class="legend-dot blue"></span>XX管理平台 <strong>60%</strong></li>
                    <li><span class="legend-dot cyan"></span>XX电商平台 <strong>30%</strong></li>
                    <li><span class="legend-dot gray"></span>其他项目 <strong>10%</strong></li>
                  </ul>
                </div>
                <div class="distribution-panel">
                  <h3>任务状态分布</h3>
                  <div ref="statusChartRef" class="echart donut-chart"></div>
                  <ul class="chart-legend">
                    <li><span class="legend-dot green"></span>已完成 <strong>60%</strong></li>
                    <li><span class="legend-dot blue"></span>进行中 <strong>25%</strong></li>
                    <li><span class="legend-dot red"></span>逾期 <strong>10%</strong></li>
                    <li><span class="legend-dot gray"></span>待开始 <strong>5%</strong></li>
                  </ul>
                </div>
              </div>
            </a-card>
          </section>
        </a-card>
      </section>
    </template>

    <template v-else>
      <section class="module-fallback">
        <a-breadcrumb class="module-view__breadcrumb">
          <a-breadcrumb-item>首页</a-breadcrumb-item>
          <a-breadcrumb-item v-if="route.meta.group !== route.meta.title">{{ route.meta.group }}</a-breadcrumb-item>
          <a-breadcrumb-item>{{ route.meta.title }}</a-breadcrumb-item>
        </a-breadcrumb>
        <h1>{{ route.meta.title }}</h1>
        <a-card class="prototype-card" :bordered="false">
          <a-result status="info" title="页面基础路由已初始化" sub-title="当前优先完成个人工作模块，其余模块保留通用静态页。">
            <template #extra>
              <a-button type="primary">返回首页</a-button>
            </template>
          </a-result>
        </a-card>
      </section>
    </template>

    <a-modal v-model:open="taskEditOpen" width="660px" title="编辑任务" centered>
      <template #footer>
        <a-space>
          <a-button @click="taskEditOpen = false">取消</a-button>
          <a-button type="primary" @click="taskEditOpen = false">确认</a-button>
        </a-space>
      </template>
      <a-form class="prototype-modal-form" layout="horizontal" :label-col="{ span: 5 }">
        <a-form-item label="任务名称"><a-input value="用户管理模块前端开发" /></a-form-item>
        <a-form-item label="负责人"><a-select value="张三" :options="userOptions" /></a-form-item>
        <a-form-item label="角色"><a-select :value="currentTaskRole" :options="roleOptions" /></a-form-item>
        <a-form-item label="标签"><a-input value="测试" /></a-form-item>
        <a-form-item label="状态"><a-select value="未开始" :options="statusOptions" /></a-form-item>
        <a-form-item label="优先级"><a-select value="紧急" :options="priorityOptions" /></a-form-item>
        <a-form-item label="计划开始时间"><a-date-picker /></a-form-item>
        <a-form-item label="实际开始时间"><a-date-picker /></a-form-item>
        <a-form-item label="任务描述"><a-textarea :rows="4" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="bugEditOpen" width="640px" title="新增Bug" centered>
      <template #footer>
        <a-space>
          <a-button @click="bugEditOpen = false">取消</a-button>
          <a-button type="primary" @click="bugEditOpen = false">确认</a-button>
        </a-space>
      </template>
      <a-form class="prototype-modal-form" layout="horizontal" :label-col="{ span: 5 }">
        <a-form-item label="Bug标题"><a-input value="用户登录页面异常报错" /></a-form-item>
        <a-form-item label="所属项目"><a-select value="XX企业数字化管理系统" :options="projectOptions" /></a-form-item>
        <a-form-item label="严重等级"><a-select value="严重" :options="bugLevelOptions" /></a-form-item>
        <a-form-item label="指定人"><a-select value="张三" :options="userOptions" /></a-form-item>
        <a-form-item label="问题描述"><a-textarea :rows="3" value="在Chrome浏览器下登录页面出现500错误。" /></a-form-item>
        <a-form-item label="重现步骤"><a-textarea :rows="3" value="打开登录页，输入用户名密码，点击登录按钮。" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="dailyEditOpen" width="720px" title="记录工作" centered>
      <template #footer>
        <a-space>
          <a-button @click="dailyEditOpen = false">取消</a-button>
          <a-button type="primary" @click="dailyEditOpen = false">确认</a-button>
        </a-space>
      </template>
      <p class="modal-note">功能说明：可上传文档、图片</p>
      <a-form class="prototype-modal-form daily-modal-form" layout="horizontal" :label-col="{ span: 4 }">
        <a-form-item label="工作内容">
          <div class="editor-box">
            <div class="editor-tools">
              <a-tooltip title="插入图片">
                <PictureOutlined />
              </a-tooltip>
              <a-tooltip title="插入链接">
                <LinkOutlined />
              </a-tooltip>
              <a-tooltip title="撤销">
                <UndoOutlined />
              </a-tooltip>
              <a-tooltip title="重做">
                <RedoOutlined />
              </a-tooltip>
              <a-upload
                class="daily-upload"
                :file-list="dailyUploadFiles"
                :before-upload="handleDailyBeforeUpload"
                :on-remove="handleDailyUploadRemove"
                :show-upload-list="false"
                accept=".doc,.docx,.pdf,.xls,.xlsx,.png,.jpg,.jpeg"
                multiple
              >
                <a-button type="primary" size="small">
                  <template #icon><UploadOutlined /></template>
                  上传
                </a-button>
              </a-upload>
            </div>
            <a-textarea :rows="7" />
            <div v-if="dailyUploadFiles.length" class="daily-upload-list">
              <article v-for="file in dailyUploadFiles" :key="file.uid" class="daily-upload-item">
                <span class="daily-upload-icon" :class="getDailyUploadType(file.name)">
                  <component :is="getDailyUploadIcon(file.name)" />
                </span>
                <div>
                  <strong>{{ file.name }}</strong>
                  <p>{{ formatFileSize(file.size) }}</p>
                </div>
                <a-tooltip title="移除">
                  <a-button class="file-action-button danger" type="text" size="small" aria-label="移除" @click="handleDailyUploadRemove(file)">
                    <DeleteOutlined />
                  </a-button>
                </a-tooltip>
              </article>
            </div>
          </div>
        </a-form-item>
        <a-form-item label="所属项目"><a-select :options="projectOptions" /></a-form-item>
        <a-form-item label="关联任务"><a-select :options="taskOptions" /></a-form-item>
        <p class="form-tip">功能说明:选择关联任务后,文件自动展示在任务详情附件下</p>
      </a-form>
    </a-modal>

    <a-modal v-model:open="uploadOpen" width="760px" title="上传文件" centered>
      <template #footer>
        <a-space>
          <a-button @click="uploadOpen = false">取消</a-button>
          <a-button type="primary" @click="uploadOpen = false">开始上传</a-button>
        </a-space>
      </template>
      <a-upload-dragger class="upload-dragger" :file-list="[]" name="file">
        <p class="upload-icon"><InboxOutlined /></p>
        <p>拖拽文件到此处，或点击选择文件</p>
        <p class="muted">支持：docx、xlsx、pdf、png、jpg、drawio，单个文件不超过 50MB</p>
      </a-upload-dragger>
      <h3>文件列表：</h3>
      <div class="upload-file-row" v-for="file in uploadFiles" :key="file.name">
        <FileTextOutlined />
        <strong>{{ file.name }}</strong>
        <span>{{ file.size }}</span>
        <a-progress :percent="file.percent" :show-info="false" />
        <a-button type="link">{{ file.percent === 100 ? '完成' : '取消' }}</a-button>
      </div>
      <a-form class="upload-meta-form" layout="inline">
        <a-form-item label="存储位置"><a-select value="默认" :options="storeOptions" /></a-form-item>
        <a-form-item label="文件分类"><a-select value="需求类" :options="categoryOptions" /></a-form-item>
        <a-form-item label="版本说明"><a-textarea placeholder="请输入版本更新说明..." :rows="3" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import {
  BugOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  InboxOutlined,
  LeftOutlined,
  LinkOutlined,
  PaperClipOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  RedoOutlined,
  RightOutlined,
  ScheduleOutlined,
  UndoOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const personalMode = ref('task-list')
const taskEditOpen = ref(false)
const bugEditOpen = ref(false)
const dailyEditOpen = ref(false)
const uploadOpen = ref(false)
const dailyHasRecord = ref(true)
const selectedDailyDate = ref(dayjs())
const dailyUploadFiles = ref([])
const trendChartRef = ref(null)
const projectChartRef = ref(null)
const statusChartRef = ref(null)
let trendChart
let projectChart
let statusChart

const isPersonalTasks = computed(() => route.name === 'PersonalTasks')
const isPersonalBugs = computed(() => route.name === 'PersonalBugs')
const isPersonalDaily = computed(() => route.name === 'PersonalDaily')
const isPersonalStatistics = computed(() => route.name === 'PersonalStatistics')
const taskModuleRouteNames = ['AllTasks', 'DevelopmentTasks', 'TestingTasks']
const isTaskModule = computed(() => taskModuleRouteNames.includes(route.name))
const currentTaskRole = computed(() => (route.name === 'TestingTasks' ? '测试' : '开发'))
const visibleTasks = computed(() => {
  if (route.name === 'TestingTasks') {
    return personalTasks.map(task => ({ ...task, role: '测试' }))
  }

  return personalTasks
})
const selectedDailyDateText = computed(() => selectedDailyDate.value.format('YYYY-MM-DD'))
const weekStart = computed(() => selectedDailyDate.value.subtract((selectedDailyDate.value.day() + 6) % 7, 'day'))
const weekEnd = computed(() => weekStart.value.add(6, 'day'))
const weekTitle = computed(() => {
  const currentWeekStart = dayjs().subtract((dayjs().day() + 6) % 7, 'day')
  return weekStart.value.isSame(currentWeekStart, 'day') ? '本周 0h' : `${weekStart.value.format('MM-DD')} 周 0h`
})
const weekRangeText = computed(() => `${weekStart.value.format('MM.DD')} - ${weekEnd.value.format('MM.DD')}`)
const weekDays = computed(() => {
  const weekLabels = ['一', '二', '三', '四', '五', '六', '日']

  return Array.from({ length: 7 }).map((_, index) => {
    const date = weekStart.value.add(index, 'day')

    return {
      date,
      key: date.format('YYYY-MM-DD'),
      week: weekLabels[index],
      day: date.format('DD'),
      dateText: date.format('MM-DD'),
      active: date.isSame(selectedDailyDate.value, 'day'),
      today: date.isSame(dayjs(), 'day'),
    }
  })
})
const dailySubmitTime = computed(() => `${selectedDailyDate.value.format('YYYY-MM-DD')} 18:00`)

watch(
  () => [route.name, route.query.detail],
  ([name, detail]) => {
    if ((name === 'PersonalTasks' || taskModuleRouteNames.includes(name)) && detail === 'task') {
      personalMode.value = 'task-detail'
    } else if (name === 'PersonalBugs' && detail === 'bug') {
      personalMode.value = 'bug-detail'
    } else {
      personalMode.value = name === 'PersonalBugs' ? 'bug-list' : 'task-list'
    }

    dailyHasRecord.value = true

    if (name === 'PersonalStatistics') {
      nextTick(renderStatisticsCharts)
    }
  },
  { immediate: true },
)

function disposeStatisticsCharts() {
  trendChart?.dispose()
  projectChart?.dispose()
  statusChart?.dispose()
  trendChart = undefined
  projectChart = undefined
  statusChart = undefined
}

function createDonutOption(data, colors) {
  return {
  color: colors,
  tooltip: { show: false },
  series: [
    {
      type: 'pie',
      radius: ['68%', '82%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      label: {
        show: true,
        position: 'center',
        formatter: '{d}%',
        color: '#111827',
        fontSize: 28,
        fontWeight: 700,
      },
      labelLine: { show: false },
      data,
    },
  ],
  }
}

function renderStatisticsCharts() {
  if (!trendChartRef.value || !projectChartRef.value || !statusChartRef.value) {
    return
  }

  disposeStatisticsCharts()

  trendChart = echarts.init(trendChartRef.value)
  projectChart = echarts.init(projectChartRef.value)
  statusChart = echarts.init(statusChartRef.value)

  trendChart.setOption({
    color: ['#2f80ed'],
    tooltip: {
      trigger: 'axis',
      formatter: params => {
        const item = params[0]
        return `${item.axisValue}<br/>完成数：${item.value}`
      },
    },
    grid: { top: 28, right: 24, bottom: 34, left: 42 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['06/01', '06/03', '06/05', '06/07', '06/09', '06/11', '06/13', '06/15', '06/17', '06/19', '06/21'],
      axisLine: { lineStyle: { color: '#d8dee8' } },
      axisLabel: { color: '#6b7280', fontSize: 12 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 5,
      splitLine: { lineStyle: { color: '#eef2f7' } },
      axisLabel: { color: '#6b7280', fontSize: 12 },
    },
    series: [
      {
        name: '完成数',
        type: 'line',
        smooth: false,
        symbol: 'circle',
        symbolSize: 8,
        data: [1, 2, 1, 3, 2, 3, 1, 2, 3, 2, 4],
        lineStyle: { width: 3, color: '#2f80ed' },
        itemStyle: { color: '#fff', borderColor: '#2f80ed', borderWidth: 3 },
        areaStyle: { color: 'rgba(47, 128, 237, 0.12)' },
        label: {
          show: true,
          formatter: ({ value }) => value,
          color: '#2f80ed',
          fontWeight: 700,
        },
      },
    ],
  })

  projectChart.setOption(createDonutOption(
    [
      { value: 60, name: 'XX管理平台' },
      { value: 30, name: 'XX电商平台' },
      { value: 10, name: '其他项目' },
    ],
    ['#1677ff', '#69b1ff', '#c8cfd9'],
  ))

  statusChart.setOption(createDonutOption(
    [
      { value: 60, name: '已完成' },
      { value: 25, name: '进行中' },
      { value: 10, name: '逾期' },
      { value: 5, name: '待开始' },
    ],
    ['#27c27a', '#1677ff', '#ff4d4f', '#c8cfd9'],
  ))
}

const handleChartResize = () => {
  trendChart?.resize()
  projectChart?.resize()
  statusChart?.resize()
}

window.addEventListener('resize', handleChartResize)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleChartResize)
  disposeStatisticsCharts()
})

const updateDetailQuery = detail => {
  router.replace({
    path: route.path,
    query: detail ? { ...route.query, detail } : Object.fromEntries(Object.entries(route.query).filter(([key]) => key !== 'detail')),
  })
}

const handleTaskDetail = () => {
  personalMode.value = 'task-detail'
  updateDetailQuery('task')
}

const handleBackToTaskList = () => {
  personalMode.value = 'task-list'
  updateDetailQuery()
}

const handleBugDetail = () => {
  personalMode.value = 'bug-detail'
  updateDetailQuery('bug')
}

const handleBackToBugList = () => {
  personalMode.value = 'bug-list'
  updateDetailQuery()
}

const selectDailyDate = date => {
  selectedDailyDate.value = date
}

const shiftDailyDate = amount => {
  selectedDailyDate.value = selectedDailyDate.value.add(amount, 'day')
}

const shiftDailyWeek = amount => {
  selectedDailyDate.value = selectedDailyDate.value.add(amount, 'week')
}

const backToToday = () => {
  selectedDailyDate.value = dayjs()
}

const getFileExtension = name => name.split('.').pop()?.toLowerCase() || ''

const getDailyUploadType = name => {
  const ext = getFileExtension(name)
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx'].includes(ext)) return 'docx'
  if (['png', 'jpg', 'jpeg'].includes(ext)) return 'image'
  if (['xls', 'xlsx'].includes(ext)) return 'excel'
  return 'file'
}

const getDailyUploadIcon = name => {
  const type = getDailyUploadType(name)
  if (type === 'pdf') return FilePdfOutlined
  if (type === 'docx') return FileWordOutlined
  if (type === 'image') return PictureOutlined
  return FileTextOutlined
}

const formatFileSize = size => {
  if (!size) return '0 KB'
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const handleDailyBeforeUpload = file => {
  dailyUploadFiles.value = [
    ...dailyUploadFiles.value,
    {
      uid: file.uid,
      name: file.name,
      size: file.size,
      status: 'done',
      originFileObj: file,
    },
  ]

  return false
}

const handleDailyUploadRemove = file => {
  dailyUploadFiles.value = dailyUploadFiles.value.filter(item => item.uid !== file.uid)
}

const selectOptions = [
  { label: '全部', value: '全部' },
  { label: '张三', value: '张三' },
  { label: '李四', value: '李四' },
]
const projectGroupOptions = [{ label: '所属项目', value: '所属项目' }]
const projectOptions = [
  { label: 'XX企业数字化管理系统', value: 'XX企业数字化管理系统' },
  { label: 'YY电子商务平台建设', value: 'YY电子商务平台建设' },
]
const userOptions = [{ label: '张三', value: '张三' }, { label: '李四', value: '李四' }]
const statusOptions = [{ label: '未开始', value: '未开始' }, { label: '进行中', value: '进行中' }, { label: '已完成', value: '已完成' }]
const roleOptions = [{ label: '开发', value: '开发' }, { label: '测试', value: '测试' }]
const priorityOptions = [{ label: '紧急', value: '紧急' }, { label: '高', value: '高' }, { label: '中', value: '中' }, { label: '低', value: '低' }]
const bugLevelOptions = [{ label: '严重', value: '严重' }, { label: '致命', value: '致命' }, { label: '一般', value: '一般' }]
const taskOptions = [{ label: '用户管理模块前端开发', value: '用户管理模块前端开发' }]
const todayOptions = [{ label: '今天', value: '今天' }, { label: '本周', value: '本周' }, { label: '本月', value: '本月' }]
const storeOptions = [{ label: '默认', value: '默认' }]
const categoryOptions = [{ label: '需求类', value: '需求类' }, { label: '设计类', value: '设计类' }]

const smallPagination = {
  current: 1,
  pageSize: 6,
  total: 6,
  showSizeChanger: false,
  showTotal: total => `共 ${total} 条`,
}

const personalTaskColumns = [
  { title: '序号', dataIndex: 'index', width: 70 },
  { title: '任务名称', dataIndex: 'name', width: 190 },
  { title: '所属项目', dataIndex: 'project', width: 210 },
  { title: '角色', dataIndex: 'role', width: 90 },
  { title: '标签', dataIndex: 'tag', width: 90 },
  { title: '负责人', dataIndex: 'owner', width: 90 },
  { title: '优先级', dataIndex: 'priority', width: 90 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '计划开始日期', dataIndex: 'planStart', width: 125 },
  { title: '实际开始日期', dataIndex: 'actualStart', width: 125 },
  { title: '计划完成日期', dataIndex: 'planEnd', width: 125 },
  { title: '实际完成日期', dataIndex: 'actualEnd', width: 125 },
  { title: '创建时间', dataIndex: 'createdAt', width: 120 },
  { title: '操作', dataIndex: 'operation', fixed: 'right', width: 80 },
]

const personalTasks = Array.from({ length: 6 }).map((_, index) => ({
  id: index + 1,
  index: 1,
  name: '用户管理模块前端开发',
  project: 'XX企业数字化管理系统',
  role: '开发',
  tag: '登录',
  owner: '张三',
  priority: '中',
  status: '进行中',
  planStart: '2026-06-15',
  actualStart: '2026-06-15',
  planEnd: '2026-06-15',
  actualEnd: '2026-06-01',
  createdAt: '2026-06-01',
}))

const personalBugColumns = [
  { title: '序号', dataIndex: 'index', width: 70 },
  { title: 'Bug编号', dataIndex: 'code', width: 130 },
  { title: 'Bug标题', dataIndex: 'title', width: 240 },
  { title: '所属项目', dataIndex: 'project', width: 220 },
  { title: '严重等级', dataIndex: 'level', width: 110 },
  { title: '状态', dataIndex: 'status', width: 110 },
  { title: '指定人', dataIndex: 'assignee', width: 100 },
  { title: '创建人', dataIndex: 'creator', width: 100 },
  { title: '创建日期', dataIndex: 'createdAt', width: 130 },
  { title: '操作', dataIndex: 'operation', fixed: 'right', width: 90 },
]

const personalBugs = [
  { id: 1, index: 1, code: 'BUG-2026-00102', title: '用户登录页面异常报错', project: 'XX企业数字化管理系统', level: '严重', levelColor: 'red', status: '已提交', statusColor: 'orange', assignee: '张三', creator: '李四', createdAt: '2026-06-10' },
  { id: 2, index: 2, code: 'BUG-2026-00105', title: '数据展示错误-订单金额计算', project: 'YY电子商务平台建设', level: '致命', levelColor: 'red', status: '已确认', statusColor: 'orange', assignee: '王五', creator: '李四', createdAt: '2026-06-11' },
  { id: 3, index: 3, code: 'BUG-2026-00108', title: '报表导出功能失败', project: 'ZZ数据中台项目', level: '一般', levelColor: 'orange', status: '已完成', statusColor: 'purple', assignee: '李四', creator: '张三', createdAt: '2026-06-12' },
  { id: 4, index: 4, code: 'BUG-2026-00110', title: '页面加载速度过慢', project: 'YY电子商务平台建设', level: '轻微', levelColor: 'blue', status: '已关闭', statusColor: 'green', assignee: '赵六', creator: '王五', createdAt: '2026-06-13' },
  { id: 5, index: 5, code: 'BUG-2026-00110', title: '页面加载速度过慢', project: 'YY电子商务平台建设', level: '轻微', levelColor: 'blue', status: '已关闭', statusColor: 'green', assignee: '赵六', creator: '王五', createdAt: '2026-06-13' },
]

const attachmentColumns = [
  { title: '文件名', dataIndex: 'name' },
  { title: '类型', dataIndex: 'type', width: 90 },
  { title: '大小', dataIndex: 'size', width: 90 },
  { title: '版本', dataIndex: 'version', width: 90 },
  { title: '上传人', dataIndex: 'user', width: 90 },
  { title: '上传时间', dataIndex: 'time', width: 120 },
  { title: '操作', dataIndex: 'action', width: 120 },
]

const attachments = [
  { name: '项目需求说明书V2.0.docx', type: 'DOCX', size: '2.3MB', version: 'V2.0', user: '张三', time: '06-20 10:30' },
  { name: '系统架构设计图.drawio', type: 'DRAWIO', size: '1.1MB', version: 'V1.0', user: '李四', time: '06-19 15:20' },
  { name: '接口文档V1.2.docx', type: 'DOCX', size: '856KB', version: 'V1.2', user: '王五', time: '06-18 09:15' },
  { name: '项目需求说明书V2.0.docx', type: 'DOCX', size: '2.3MB', version: 'V2.0', user: '张三', time: '06-20 10:30' },
  { name: '系统架构设计图.drawio', type: 'DRAWIO', size: '1.1MB', version: 'V1.0', user: '李四', time: '06-19 15:20' },
  { name: '接口文档V1.2.docx', type: 'DOCX', size: '856KB', version: 'V1.2', user: '王五', time: '06-18 09:15' },
]

const relatedBugs = [
  { code: 'BUG-2026-00102', title: '用户登录页面异常报错', level: '严重', status: '修复中', levelColor: 'red', statusColor: 'orange' },
  { code: 'BUG-2026-00112', title: '权限校验绕过漏洞', level: '致命', status: '已提交', levelColor: 'red', statusColor: 'blue' },
  { code: 'BUG-2026-00125', title: '文件上传大小限制不生效', level: '一般', status: '待验证', levelColor: 'orange', statusColor: 'purple' },
  { code: 'BUG-2026-00125', title: '文件上传大小限制不生效', level: '一般', status: '待验证', levelColor: 'orange', statusColor: 'purple' },
  { code: 'BUG-2026-00125', title: '文件上传大小限制不生效', level: '一般', status: '待验证', levelColor: 'orange', statusColor: 'purple' },
]

const taskLogs = [
  { time: '2026-06-11 14:30', user: '张三', text: '上传XX文档和图片' },
  { time: '2026-06-10 16:00', user: '张三', text: '完成新增/编辑用户弹窗组件开发，对接后端接口' },
  { time: '2026-06-09 09:30', user: '张三', text: '搭建页面基础框架，引入Ant Design组件库' },
  { time: '2026-06-01 10:00', user: '张三', text: '任务创建，开始需求分析' },
]

const dailyFiles = [
  { name: '银行流水.pdf', type: 'pdf', icon: FilePdfOutlined, size: '2.34 MB', time: '2024-05-16 14:32' },
  { name: '银行流水说明.docx', type: 'docx', icon: FileWordOutlined, size: '1.12 MB', time: '2024-05-16 14:28' },
]

const uploadFiles = [
  { name: '项目需求说明书V2.0.docx', size: '2.3MB', percent: 80 },
  { name: '系统架构图.drawio', size: '1.1MB', percent: 100 },
]

const statCards = [
  { label: '总任务', value: '12 个', icon: ScheduleOutlined, className: 'blue' },
  { label: '进行中', value: '3 个', icon: PlayCircleOutlined, className: 'green' },
  { label: '已完成', value: '8 个', icon: CheckCircleOutlined, className: 'cyan' },
  { label: '逾期', value: '1 个', icon: ExclamationCircleOutlined, className: 'red' },
  { label: '平均进度', value: '68%', icon: ScheduleOutlined, className: 'purple' },
]

const trendPoints = [
  { day: '06/01', value: 1, left: '6%', bottom: '20%' },
  { day: '06/05', value: 3, left: '24%', bottom: '58%' },
  { day: '06/09', value: 2, left: '42%', bottom: '42%' },
  { day: '06/13', value: 3, left: '58%', bottom: '60%' },
  { day: '06/17', value: 3, left: '75%', bottom: '60%' },
  { day: '06/21', value: 4, left: '92%', bottom: '74%' },
]
</script>

<style scoped>
.module-view {
  max-width: 100%;
  min-height: calc(100vh - 126px);
}

.personal-page,
.module-fallback {
  width: 100%;
  max-width: 1440px;
  min-width: 0;
  margin: 0 auto;
}

.personal-page {
  scrollbar-color: #b8b8b8 transparent;
  scrollbar-width: thin;
}

.statistics-page {
  max-width: 1280px;
}

.prototype-title {
  margin: 0 0 14px;
  color: #222;
  font-size: 24px;
  font-weight: 700;
}

.prototype-heading {
  margin-bottom: 14px;
}

.prototype-heading .prototype-title {
  margin: 6px 0 0;
}

.prototype-heading--inline {
  margin-bottom: 0;
}

.prototype-heading--inline .prototype-title {
  margin-top: 6px;
}

.prototype-card {
  border: 1px solid #ececec;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 3%);
}

.filter-panel {
  margin-bottom: 10px;
  overflow: hidden;
}

.filter-panel :deep(.ant-card-body) {
  padding: 18px 24px 22px;
}

.prototype-filter {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px 40px;
  align-items: end;
  width: 100%;
}

.prototype-filter :deep(.ant-form-item) {
  min-width: 0;
  margin: 0;
}

.prototype-filter :deep(.ant-form-item-row) {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  width: 100%;
}

.prototype-filter :deep(.ant-form-item-label) {
  min-width: 76px;
  padding: 0 10px 0 0;
  text-align: right;
}

.prototype-filter :deep(.ant-form-item-label > label) {
  height: 38px;
  color: #222;
  font-size: 14px;
}

.prototype-filter :deep(.ant-form-item-control) {
  min-width: 0;
}

.prototype-filter :deep(.ant-form-item-control-input-content) {
  min-width: 0;
}

.prototype-filter :deep(.ant-input),
.prototype-filter :deep(.ant-select),
.prototype-filter :deep(.ant-picker) {
  min-width: 0;
  width: 100%;
  height: 38px;
}

.prototype-filter :deep(.ant-select-selector) {
  min-height: 38px;
}

.filter-buttons {
  grid-column: 4;
  justify-self: end;
}

.filter-buttons :deep(.ant-form-item-row) {
  display: block;
}

.filter-buttons :deep(.ant-btn) {
  min-width: 72px;
  height: 36px;
}

.bug-filter {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.list-card {
  min-height: 420px;
}

.task-list-card :deep(.ant-card-body),
.bug-list-card :deep(.ant-card-body) {
  padding: 18px;
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.group-select {
  width: 126px;
}

.muted,
.modal-note,
.form-tip {
  color: #8c8c8c;
}

.cell-link {
  height: auto;
  padding: 0;
}

.prototype-table-scroll {
  width: 100%;
  min-height: 334px;
  overflow: auto;
  scrollbar-color: #9b9b9b #f1f1f1;
  scrollbar-width: thin;
}

.prototype-table {
  width: max-content;
  min-width: 1580px;
  border-collapse: collapse;
  background: #fff;
}

.prototype-table th,
.prototype-table td {
  height: 45px;
  padding: 0 14px;
  color: #111;
  font-size: 14px;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid #f0f0f0;
}

.prototype-table th {
  height: 46px;
  font-weight: 700;
  background: #fafafa;
}

.text-link,
.icon-link {
  padding: 0;
  color: #006eff;
  font: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.icon-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.tag-soft {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 20px;
  padding: 0 7px;
  color: #fff;
  font-size: 12px;
  border-radius: 4px;
}

.tag-priority {
  background: #f7c983;
}

.tag-processing {
  background: #168bff;
}

.prototype-pagination {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  height: 32px;
  padding-right: 10px;
  color: #333;
}

.prototype-pagination :deep(.ant-input) {
  width: 42px;
  text-align: center;
}

.bug-title {
  color: #1677ff;
}

.detail-actions {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 8px;
}

.back-button {
  width: 124px;
}

.task-info-card {
  margin-bottom: 12px;
}

.task-info-card :deep(.ant-descriptions-item-label) {
  color: #111;
  font-weight: 500;
}

.task-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 12px;
}

.attachment-card {
  min-height: 292px;
}

.log-card {
  margin-top: 12px;
  min-height: 334px;
}

.log-card :deep(.ant-card-body) {
  max-height: 318px;
  overflow: auto;
  scrollbar-color: #b8b8b8 transparent;
  scrollbar-width: thin;
}

.section-title {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 16px;
  font-weight: 700;
}

.file-name {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.related-bugs {
  min-height: 455px;
}

.related-bugs :deep(.ant-card-body) {
  overflow: auto;
  scrollbar-color: #b8b8b8 transparent;
  scrollbar-width: thin;
}

.bug-mini-card {
  padding: 12px;
  background: #f8f8f8;
  border-radius: 6px;
}

.bug-mini-card + .bug-mini-card {
  margin-top: 10px;
}

.bug-mini-card strong {
  display: block;
  margin-bottom: 8px;
  color: #222;
  font-weight: 500;
}

.bug-code {
  margin: 0 0 3px;
  color: #8c8c8c;
}

.log-meta {
  color: #8c8c8c;
  font-size: 12px;
}

.log-card p {
  margin: 6px 0 0;
}

.bug-detail-card {
  min-height: 460px;
  max-height: calc(100vh - 174px);
  padding: 8px 16px;
  overflow: auto;
  scrollbar-color: #b8b8b8 transparent;
  scrollbar-width: thin;
}

.bug-detail-card h2 {
  margin: 8px 0 26px;
  font-size: 16px;
}

.bug-info-grid {
  display: grid;
  grid-template-columns: 174px minmax(220px, 1fr) 174px minmax(220px, 1fr);
  overflow: hidden;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.bug-info-grid span,
.bug-info-grid strong {
  min-height: 44px;
  padding: 12px 20px;
  color: #111;
  font-size: 14px;
  font-weight: 400;
  border-right: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.bug-info-grid span {
  background: #fafafa;
}

.bug-info-grid strong:nth-child(4n) {
  border-right: 0;
}

.bug-info-grid span:nth-last-child(-n + 4),
.bug-info-grid strong:nth-last-child(-n + 4) {
  border-bottom: 0;
}

.bug-text-block {
  padding: 20px 10px;
  color: #444;
}

.bug-text-block h3 {
  margin: 0 0 28px;
  text-align: center;
  font-size: 16px;
  font-weight: 500;
}

.bug-text-block p {
  margin: 0 0 28px;
}

.daily-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.daily-header .prototype-title {
  margin: 0;
}

.daily-select {
  width: 124px;
}

.daily-search {
  width: 176px;
}

.date-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.date-toolbar strong {
  min-width: 126px;
  font-size: 20px;
  text-align: center;
}

.date-nav-button {
  width: 38px;
  padding: 0;
}

.daily-workspace {
  display: grid;
  grid-template-columns: 196px minmax(0, 1fr);
  gap: 14px;
}

.week-card {
  height: fit-content;
}

.week-head,
.week-day {
  display: flex;
  align-items: center;
  justify-content: center;
}

.week-head {
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #edf1f6;
}

.week-head div {
  min-width: 0;
  text-align: center;
}

.week-head strong,
.week-head span {
  display: block;
}

.week-head strong {
  color: #17233d;
  font-size: 15px;
}

.week-head span {
  margin-top: 2px;
  color: #8c8c8c;
  font-size: 12px;
}

.week-nav-button {
  width: 28px;
  height: 28px;
  padding: 0;
}

.week-day {
  justify-content: flex-start;
  gap: 10px;
  width: 100%;
  height: 40px;
  padding: 0 10px;
  color: #4b5563;
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.week-day + .week-day {
  margin-top: 4px;
}

.week-day:hover {
  background: #f3f8ff;
}

.week-day span {
  width: 20px;
  color: #8c8c8c;
}

.week-day strong {
  width: 28px;
  color: inherit;
  font-size: 16px;
}

.week-day em {
  margin-left: auto;
  color: #9ca3af;
  font-size: 12px;
  font-style: normal;
}

.week-day.active {
  background: #e6f4ff;
  color: #1677ff;
  font-weight: 600;
}

.week-day.today:not(.active) {
  color: #1677ff;
  background: #f5faff;
}

.daily-content-card {
  position: relative;
  min-height: 478px;
}

.daily-content-card :deep(.ant-empty) {
  margin-top: 140px;
}

.daily-record-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.daily-record-body {
  display: grid;
  grid-template-columns: 76px 1fr;
  margin-bottom: 18px;
}

.daily-record-body p {
  min-height: 82px;
  margin: 0;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.daily-files {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(254px, 300px));
  gap: 12px;
  max-width: 628px;
}

.daily-file {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 12px;
  align-items: start;
  padding: 14px 12px;
  background: #fff;
  border: 1px solid #e5eaf0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgb(15 35 55 / 4%);
}

.daily-file-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  color: #fff;
  font-size: 22px;
  border-radius: 8px;
}

.daily-file-icon.pdf {
  background: #ff4d4f;
}

.daily-file-icon.docx {
  background: #1677ff;
}

.daily-file strong {
  display: block;
  max-width: 198px;
  overflow: hidden;
  color: #17233d;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.daily-file p {
  margin: 6px 0;
  color: #8c8c8c;
  font-size: 12px;
}

.file-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: #1677ff;
}

.file-action-button.danger {
  color: #ff4d4f;
}

.daily-time {
  position: absolute;
  right: 22px;
  bottom: 18px;
}

.statistics-shell {
  min-height: 572px;
  padding: 18px 22px 22px;
  overflow: hidden;
  background: #fff;
  border-color: #e9eef5;
  border-radius: 8px;
}

.stats-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.stats-title-row h1 {
  margin: 0;
  font-size: 24px;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(5, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  gap: 16px;
  align-items: center;
  min-height: 94px;
  padding: 16px 18px;
  background: #fff;
  border: 1px solid #edf0f3;
  border-radius: 8px;
  box-shadow: 0 4px 14px rgb(15 35 55 / 4%);
}

.stat-card span:not(.stat-icon) {
  color: #6b7280;
}

.stat-card strong {
  display: block;
  margin-top: 6px;
  color: #111827;
  font-size: 28px;
}

.stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  color: #fff;
  font-size: 28px;
  border-radius: 50%;
}

.stat-icon.blue { background: #2f80ed; }
.stat-icon.green { background: #27c27a; }
.stat-icon.cyan { background: #1890ff; }
.stat-icon.red { background: #ff4d4f; }
.stat-icon.purple { background: #9254de; }

.stats-panels {
  display: grid;
  grid-template-columns: minmax(0, 1.06fr) minmax(0, 0.94fr);
  gap: 16px;
}

.chart-card {
  min-height: 330px;
  min-width: 0;
  border: 1px solid #edf0f3;
  border-radius: 8px;
  box-shadow: 0 4px 14px rgb(15 35 55 / 4%);
}

.chart-card :deep(.ant-card-head) {
  min-height: 52px;
  border-bottom: 0;
}

.chart-card :deep(.ant-card-head-title) {
  color: #17233d;
  font-size: 18px;
  font-weight: 700;
}

.chart-card :deep(.ant-card-body) {
  min-width: 0;
  padding: 14px 22px 22px;
  overflow: hidden;
}

.echart {
  width: 100%;
  min-width: 0;
}

.trend-chart {
  height: 286px;
}

.donut-chart {
  width: 136px;
  height: 136px;
}

.line-chart {
  position: relative;
  height: 206px;
  margin: 8px 18px 8px 26px;
  background:
    linear-gradient(#eef2f7 1px, transparent 1px) 0 0 / 100% 41px,
    linear-gradient(90deg, #eef2f7 1px, transparent 1px) 0 0 / 76px 100%,
    linear-gradient(180deg, rgb(22 119 255 / 10%), rgb(22 119 255 / 2%));
  border-left: 1px solid #d8dee8;
  border-bottom: 1px solid #d8dee8;
}

.line-chart::after {
  position: absolute;
  inset: 28px 18px 42px 24px;
  content: '';
  background:
    linear-gradient(145deg, transparent 0 8%, #3d8bfd 8.3% 8.8%, transparent 9.1% 17%, #3d8bfd 17.3% 17.8%, transparent 18.1% 30%, #3d8bfd 30.3% 30.8%, transparent 31.1% 44%, #3d8bfd 44.3% 44.8%, transparent 45.1% 58%, #3d8bfd 58.3% 58.8%, transparent 59.1% 72%, #3d8bfd 72.3% 72.8%, transparent 73.1% 86%, #3d8bfd 86.3% 86.8%, transparent 87.1%);
  opacity: 0.55;
  pointer-events: none;
}

.chart-tooltip {
  position: absolute;
  top: 16px;
  left: 50%;
  z-index: 1;
  display: grid;
  gap: 4px;
  min-width: 92px;
  padding: 10px 12px;
  color: #4b5563;
  background: #fff;
  border: 1px solid #e5eaf0;
  border-radius: 6px;
  box-shadow: 0 8px 20px rgb(15 35 55 / 8%);
}

.chart-tooltip strong {
  color: #17233d;
  font-weight: 600;
}

.trend-point {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: #1677ff;
  font-weight: 700;
  background: #fff;
  border: 2px solid #4c9aff;
  border-radius: 50%;
}

.axis-labels {
  display: flex;
  justify-content: space-between;
  margin: 0 18px;
  color: #6b7280;
}

.distribution {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  align-items: start;
  min-width: 0;
  text-align: center;
}

.distribution-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}

.distribution-panel h3 {
  width: 100%;
  margin: 0 0 14px;
  color: #394b59;
  font-size: 16px;
  font-weight: 700;
  text-align: left;
}

.chart-legend {
  display: grid;
  gap: 8px;
  width: min(100%, 168px);
  margin: 12px auto 0;
  padding: 0;
  color: #5f6673;
  list-style: none;
}

.chart-legend li {
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr) auto;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  text-align: left;
}

.chart-legend li > :nth-child(2) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-legend strong {
  color: #394b59;
  font-weight: 600;
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.legend-dot.blue { background: #1677ff; }
.legend-dot.cyan { background: #69b1ff; }
.legend-dot.green { background: #27c27a; }
.legend-dot.red { background: #ff4d4f; }
.legend-dot.gray { background: #c8cfd9; }

.project-ring :deep(.ant-progress-text),
.status-ring :deep(.ant-progress-text) {
  color: #17233d;
  font-weight: 700;
}

.modal-note {
  position: absolute;
  top: 20px;
  left: 164px;
}

.prototype-modal-form {
  margin-top: 8px;
}

.prototype-modal-form :deep(.ant-input),
.prototype-modal-form :deep(.ant-select) {
  width: 100%;
}

.editor-box {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
}

.editor-tools {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: flex-end;
  height: 36px;
  padding: 0 8px;
  border-bottom: 1px solid #edf0f3;
}

.editor-tools > .anticon {
  color: #4b5563;
}

.daily-upload {
  display: inline-flex;
}

.editor-box :deep(textarea.ant-input) {
  border: 0;
  box-shadow: none;
}

.daily-upload-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 8px;
  padding: 10px;
  border-top: 1px solid #edf0f3;
}

.daily-upload-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 28px;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  background: #f8fbff;
  border: 1px solid #e5edf7;
  border-radius: 6px;
}

.daily-upload-item strong {
  display: block;
  overflow: hidden;
  color: #17233d;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.daily-upload-item p {
  margin: 2px 0 0;
  color: #8c8c8c;
  font-size: 12px;
}

.daily-upload-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #fff;
  font-size: 18px;
  border-radius: 7px;
}

.daily-upload-icon.pdf {
  background: #ff4d4f;
}

.daily-upload-icon.docx {
  background: #1677ff;
}

.daily-upload-icon.image {
  background: #13c2c2;
}

.daily-upload-icon.excel {
  background: #22a06b;
}

.daily-upload-icon.file {
  background: #8c8c8c;
}

.form-tip {
  margin-left: 118px;
}

.upload-dragger {
  margin-bottom: 16px;
}

.upload-icon {
  color: #1677ff;
  font-size: 42px;
}

.upload-file-row {
  display: grid;
  grid-template-columns: 28px minmax(220px, 1fr) 80px 170px 60px;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}

.upload-meta-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 36px;
  margin-top: 20px;
}

.upload-meta-form :deep(.ant-form-item:last-child) {
  grid-column: 1 / -1;
}

.module-fallback h1 {
  margin: 0 0 18px;
  color: #1f1f1f;
  font-size: 24px;
  font-weight: 600;
}

@media (max-width: 1200px) {
  .prototype-filter,
  .bug-filter,
  .stat-cards,
  .stats-panels,
  .distribution,
  .task-detail-grid {
    grid-template-columns: 1fr;
  }

  .daily-workspace {
    grid-template-columns: 1fr;
  }
}

:global(.app-content__body::-webkit-scrollbar),
.personal-page::-webkit-scrollbar,
.prototype-table-scroll::-webkit-scrollbar,
.log-card :deep(.ant-card-body::-webkit-scrollbar),
.related-bugs :deep(.ant-card-body::-webkit-scrollbar),
.bug-detail-card::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

:global(.app-content__body::-webkit-scrollbar-track),
.personal-page::-webkit-scrollbar-track,
.prototype-table-scroll::-webkit-scrollbar-track,
.log-card :deep(.ant-card-body::-webkit-scrollbar-track),
.related-bugs :deep(.ant-card-body::-webkit-scrollbar-track),
.bug-detail-card::-webkit-scrollbar-track {
  background: transparent;
}

:global(.app-content__body::-webkit-scrollbar-thumb),
.personal-page::-webkit-scrollbar-thumb,
.prototype-table-scroll::-webkit-scrollbar-thumb,
.log-card :deep(.ant-card-body::-webkit-scrollbar-thumb),
.related-bugs :deep(.ant-card-body::-webkit-scrollbar-thumb),
.bug-detail-card::-webkit-scrollbar-thumb {
  background: #b8b8b8;
  border: 2px solid transparent;
  border-radius: 999px;
  background-clip: content-box;
}

:global(.app-content__body::-webkit-scrollbar-thumb:hover),
.personal-page::-webkit-scrollbar-thumb:hover,
.prototype-table-scroll::-webkit-scrollbar-thumb:hover,
.log-card :deep(.ant-card-body::-webkit-scrollbar-thumb:hover),
.related-bugs :deep(.ant-card-body::-webkit-scrollbar-thumb:hover),
.bug-detail-card::-webkit-scrollbar-thumb:hover {
  background: #8f8f8f;
  border: 2px solid transparent;
  background-clip: content-box;
}
</style>
