<template>
  <div :class="['module-view', { 'module-view--fixed-list': ((isPersonalTasks || isTaskModule) && personalMode !== 'task-detail') || isPersonalBugs }]">
    <template v-if="isPersonalTasks || isTaskModule">
      <section v-if="personalMode === 'task-detail'" class="personal-page">
        <div class="detail-actions">
          <a-button class="back-button" @click="handleBackToTaskList">
            <template #icon><LeftOutlined /></template>
            返回
          </a-button>
        </div>

        <a-card class="prototype-card task-info-card" :bordered="false">
          <a-spin :spinning="taskDetailLoading">
            <table v-if="selectedTaskDetail" class="native-info-table">
              <tbody>
                <tr>
                  <th>任务名称</th>
                  <td>{{ selectedTaskDetail.name || '-' }}</td>
                  <th>所属项目</th>
                  <td>{{ selectedTaskDetail.projectName || getTaskProjectName(selectedTaskDetail.projectId) }}</td>
                  <th>负责人</th>
                  <td>{{ selectedTaskDetail.assigneeName || getTaskUserName(selectedTaskDetail.assigneeId) }}</td>
                </tr>
                <tr>
                  <th>角色</th>
                  <td>{{ selectedTaskDetail.roleName || '-' }}</td>
                  <th>优先级</th>
                  <td><a-tag :color="getTaskPriorityColor(selectedTaskDetail.priority)">{{ getTaskLabel('taskPriority', selectedTaskDetail.priority) || selectedTaskDetail.priority || '-' }}</a-tag></td>
                  <th>状态</th>
                  <td><a-tag :color="getTaskStatusColor(selectedTaskDetail.status)">{{ getTaskLabel('taskStatus', selectedTaskDetail.status) || selectedTaskDetail.status || '-' }}</a-tag></td>
                </tr>
                <tr>
                  <th>计划开始日期</th>
                  <td>{{ selectedTaskDetail.plannedStartDate || '-' }}</td>
                  <th>计划结束日期</th>
                  <td>{{ selectedTaskDetail.plannedEndDate || '-' }}</td>
                  <th>实际开始日期</th>
                  <td>{{ selectedTaskDetail.actualStartDate || '-' }}</td>
                </tr>
                <tr>
                  <th>实际结束日期</th>
                  <td>{{ selectedTaskDetail.actualEndDate || '-' }}</td>
                  <th>标签</th>
                  <td colspan="3">{{ selectedTaskDetail.tags || '-' }}</td>
                </tr>
                <tr>
                  <th>任务描述</th>
                  <td colspan="5">{{ selectedTaskDetail.description || '-' }}</td>
                </tr>
              </tbody>
            </table>
            <a-empty v-else-if="!taskDetailLoading" description="暂无任务数据" />
          </a-spin>
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
              <a-table :columns="attachmentColumns" :data-source="attachments" :pagination="false" size="small" row-key="id" :locale="{ emptyText: '暂无附件' }">
                <template #bodyCell="{ column, record, text }">
                  <template v-if="column.dataIndex === 'name'">
                    <span class="file-name"><FileTextOutlined />{{ text }}</span>
                  </template>
                  <template v-else-if="column.dataIndex === 'action'">
                    <a-space :size="6">
                      <a-button type="primary" size="small" @click="handleDownloadTaskAttachment(record)">下载</a-button>
                      <a-popconfirm title="确认删除该附件?" ok-text="删除" cancel-text="取消" @confirm="handleDeleteTaskAttachment(record)">
                        <a-button danger size="small">删除</a-button>
                      </a-popconfirm>
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
              <a-empty v-if="!taskLogs.length" description="暂无操作日志" />
              <a-timeline v-else>
                <a-timeline-item v-for="log in taskLogs" :key="log.id">
                  <span class="log-meta">{{ formatDateTime(log.createdAt) }}　{{ log.operatorName || '-' }}</span>
                  <p>{{ log.content || '-' }}</p>
                </a-timeline-item>
              </a-timeline>
            </a-card>
          </div>

          <a-card class="prototype-card related-bugs" :bordered="false">
            <template #title>
              <span class="section-title"><BugOutlined /> 关联Bug（{{ relatedBugs.length }}）</span>
            </template>
            <a-empty v-if="!relatedBugs.length" description="暂无关联Bug" />
            <article v-for="bug in relatedBugs" v-else :key="bug.id || bug.bugNo" class="bug-mini-card">
              <p class="bug-code"><BugOutlined /> {{ formatBugNo(bug) }}</p>
              <strong>{{ bug.title || '-' }}</strong>
              <div>
                <a-tag :color="getBugPriorityColor(bug.priority)">{{ getBugPriorityLabel(bug.priority) }}</a-tag>
                <a-tag :color="getBugStatusColor(bug.status)">{{ getBugStatusLabel(bug.status) }}</a-tag>
              </div>
            </article>
          </a-card>
        </section>
      </section>

      <section v-else class="personal-page task-list-page">
        <a-card class="prototype-card filter-panel app-filter-card" :bordered="false">
          <a-form class="prototype-filter app-filter-form" layout="inline">
            <a-form-item label="任务名称"><a-input v-model:value="taskFilter.keyword" placeholder="请输入任务名称" /></a-form-item>
            <a-form-item label="所属项目"><a-select v-model:value="taskFilter.projectId" allow-clear placeholder="全部" :options="taskFilterProjectOptions" /></a-form-item>
            <a-form-item v-if="!isPersonalTasks" label="负责人"><a-select v-model:value="taskFilter.assigneeId" allow-clear placeholder="全部" :options="taskUserOptions" /></a-form-item>
            <a-form-item label="优先级"><a-select v-model:value="taskFilter.priority" allow-clear placeholder="全部" :options="taskPrioritySelectOptions" /></a-form-item>
            <a-form-item label="状态"><a-select v-model:value="taskFilter.status" allow-clear placeholder="全部" :options="taskStatusSelectOptions" /></a-form-item>
            <a-form-item class="task-end-date-filter" label="计划结束日期"><a-date-picker v-model:value="taskFilter.plannedEndDate" /></a-form-item>
            <a-form-item class="filter-buttons app-filter-actions">
              <a-space>
                <a-button type="primary" @click="handleTaskSearch">查询</a-button>
                <a-button @click="handleTaskReset">重置</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </a-card>

        <a-card class="prototype-card list-card task-list-card" :bordered="false">
          <div class="list-toolbar">
            <a-space v-if="isTaskModule">
              <a-button type="primary" @click="openTaskModal('create')">
                <template #icon><PlusOutlined /></template>
                新建任务
              </a-button>
              <a-button v-if="route.name === 'AllTasks'" @click="router.push({ name: 'TaskBatchCreate' })">批量创建任务</a-button>
            </a-space>
            <span v-else></span>
            <div class="task-list__display">
              <template v-if="taskDisplayMode === 'group'">
                <span>分组条件：</span>
                <a-select v-model:value="taskGroupField" :options="taskGroupOptions" />
              </template>
              <a-radio-group v-model:value="taskDisplayMode" button-style="solid">
                <a-radio-button value="list">列表</a-radio-button>
                <a-radio-button value="group">分组</a-radio-button>
              </a-radio-group>
            </div>
          </div>
          <div v-if="taskDisplayMode === 'list'" class="prototype-table-scroll">
            <table class="prototype-table task-prototype-table">
              <colgroup>
                <col v-for="column in taskTableColumns" :key="column.dataIndex" :style="{ width: $px2rem(column.width) }" />
              </colgroup>
              <thead>
                <tr>
                  <th v-for="column in taskTableColumns" :key="column.dataIndex" :style="{ width: $px2rem(column.width) }">{{ column.title }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(record, index) in pagedVisibleTasks" :key="record.id">
                  <td>{{ (taskCurrentPage - 1) * taskPageSize + index + 1 }}</td>
                  <td><button class="text-link" type="button" @click="handleTaskDetail(record)">{{ record.name }}</button></td>
                  <td><button class="text-link" type="button">{{ record.project }}</button></td>
                  <td>{{ record.role }}</td>
                  <td>{{ record.tag }}</td>
                  <td>{{ record.owner }}</td>
                  <td><a-tag :color="getTaskPriorityColor(record.priorityCode)">{{ record.priority }}</a-tag></td>
                  <td><a-tag :color="getTaskStatusColor(record.statusCode)">{{ record.status }}</a-tag></td>
                  <td>{{ record.planStart }}</td>
                  <td v-if="isTaskModule">{{ record.planEnd }}</td>
                  <td>{{ record.actualStart }}</td>
                  <td v-if="!isTaskModule">{{ record.planEnd }}</td>
                  <td>{{ record.actualEnd }}</td>
                  <td v-if="isTaskModule">{{ record.createdAt }}</td>
                  <td>
                    <a-space :size="4">
                      <button class="icon-link" type="button" title="编辑任务" @click="openTaskModal('edit', record)"><EditOutlined /></button>
                      <a-popconfirm v-if="!isPersonalTasks" title="确认删除该任务?" ok-text="删除" cancel-text="取消" @confirm="handleDeleteTask(record)">
                        <button class="icon-link danger" type="button" title="删除任务"><DeleteOutlined /></button>
                      </a-popconfirm>
                    </a-space>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="task-group-list">
            <section v-for="group in groupedTasks" :key="group.value" class="task-group">
              <header class="task-group__header">
                <button type="button" @click="handleToggleTaskGroup(group.value)">
                  <RightOutlined v-if="isTaskGroupCollapsed(group.value)" />
                  <DownOutlined v-else />
                  {{ group.label }}
                </button>
                <a-tag>{{ group.rows.length }}</a-tag>
              </header>
              <div v-if="!isTaskGroupCollapsed(group.value)" class="prototype-table-scroll">
                <table class="prototype-table task-prototype-table">
                  <colgroup>
                    <col v-for="column in taskTableColumns" :key="column.dataIndex" :style="{ width: $px2rem(column.width) }" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th v-for="column in taskTableColumns" :key="column.dataIndex" :style="{ width: $px2rem(column.width) }">{{ column.title }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="record in group.rows" :key="record.id">
                      <td>{{ record.index }}</td>
                      <td><button class="text-link" type="button" @click="handleTaskDetail(record)">{{ record.name }}</button></td>
                      <td><button class="text-link" type="button">{{ record.project }}</button></td>
                      <td>{{ record.role }}</td>
                      <td>{{ record.tag }}</td>
                      <td>{{ record.owner }}</td>
                      <td><a-tag :color="getTaskPriorityColor(record.priorityCode)">{{ record.priority }}</a-tag></td>
                      <td><a-tag :color="getTaskStatusColor(record.statusCode)">{{ record.status }}</a-tag></td>
                      <td>{{ record.planStart }}</td>
                      <td v-if="isTaskModule">{{ record.planEnd }}</td>
                      <td>{{ record.actualStart }}</td>
                      <td v-if="!isTaskModule">{{ record.planEnd }}</td>
                      <td>{{ record.actualEnd }}</td>
                      <td v-if="isTaskModule">{{ record.createdAt }}</td>
                      <td>
                        <a-space :size="4">
                          <button class="icon-link" type="button" title="编辑任务" @click="openTaskModal('edit', record)"><EditOutlined /></button>
                          <a-popconfirm v-if="!isPersonalTasks" title="确认删除该任务?" ok-text="删除" cancel-text="取消" @confirm="handleDeleteTask(record)">
                            <button class="icon-link danger" type="button" title="删除任务"><DeleteOutlined /></button>
                          </a-popconfirm>
                        </a-space>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <div class="prototype-pagination">
            <a-pagination
              v-model:current="taskCurrentPage"
              v-model:page-size="taskPageSize"
              :total="visibleTasks.length"
              :page-size-options="['10', '50', '100']"
              show-size-changer
              :show-total="total => `共 ${total} 条`"
              @change="handleTaskPageChange"
            />
          </div>
        </a-card>
      </section>
    </template>

    <template v-else-if="isPersonalBugs">
      <section class="personal-page personal-bug-page">
        <a-card class="prototype-card filter-panel app-filter-card" :bordered="false">
          <a-form class="prototype-filter bug-filter app-filter-form" layout="inline">
            <a-form-item label="搜索"><a-input v-model:value="bugFilter.keyword" placeholder="请输入关键字" allow-clear /></a-form-item>
            <a-form-item label="所属项目">
              <a-select v-model:value="bugFilter.projectId" placeholder="全部" allow-clear :options="bugProjects.map(p => ({ label: p.name, value: p.id }))" style="width:10rem" @change="handleBugSearch" />
            </a-form-item>
            <a-form-item label="严重等级">
              <a-select v-model:value="bugFilter.priority" placeholder="全部" allow-clear
                :options="Object.entries(BUG_PRIORITY_LABELS).map(([value, label]) => ({ label, value }))"
                style="width:7.5rem" @change="handleBugSearch" />
            </a-form-item>
            <a-form-item label="状态">
              <a-select v-model:value="bugFilter.status" placeholder="全部" allow-clear
                :options="Object.entries(BUG_STATUS_LABELS).filter(([value]) => value !== 'FIXING').map(([value, label]) => ({ label, value }))"
                style="width:7.5rem" @change="handleBugSearch" />
            </a-form-item>
            <a-form-item label="创建人">
              <a-select v-model:value="bugFilter.creatorId" placeholder="全部" allow-clear :options="bugUserOptions" show-search option-filter-prop="label" @change="handleBugSearch" />
            </a-form-item>
            <a-form-item class="filter-buttons app-filter-actions">
              <a-space>
                <a-button type="primary" @click="handleBugSearch">查询</a-button>
                <a-button @click="handleBugReset">重置</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </a-card>

        <a-card class="prototype-card list-card bug-list-card" :bordered="false">
          <div class="list-toolbar">
            <a-button type="primary" @click="handleCreateBug">
              <template #icon><PlusOutlined /></template>
              新增Bug
            </a-button>
            <div class="bug-list__display">
              <template v-if="bugDisplayMode === 'group'">
                <span>分组条件：</span>
                <a-select v-model:value="bugGroupField" :options="bugGroupOptions" />
              </template>
              <a-radio-group v-model:value="bugDisplayMode" button-style="solid">
                <a-radio-button value="list">列表</a-radio-button>
                <a-radio-button value="group">分组</a-radio-button>
              </a-radio-group>
            </div>
          </div>
          <div v-if="bugDisplayMode === 'list'" class="personal-bug-list-view">
            <a-table class="personal-bug-table" :columns="personalBugColumns" :data-source="pagedVisibleBugs" :pagination="false" :scroll="{ x: 1240, y: '100%' }" size="middle" row-key="id" table-layout="fixed">
              <template #bodyCell="{ column, record, text }">
                <template v-if="column.dataIndex === 'code'">
                  <span class="bug-no">{{ text && text !== '-' ? '#' + String(text).padStart(3, '0') : '-' }}</span>
                </template>
                <template v-else-if="column.dataIndex === 'title'">
                  <a-tooltip :title="text">
                    <span class="bug-title-text" @click="handleBugDetail(record)">{{ text }}</span>
                  </a-tooltip>
                </template>
                <template v-else-if="column.dataIndex === 'level'">
                  <a-tag :color="record.levelColor">{{ text }}</a-tag>
                </template>
                <template v-else-if="column.dataIndex === 'status'">
                  <a-tag :color="record.statusColor">{{ text }}</a-tag>
                </template>
                <template v-else-if="column.dataIndex === 'operation'">
                  <a-space :size="4">
                    <a-tooltip v-if="canAssignPersonalBug(record)" title="快速指派">
                      <a-button type="link" size="small" class="bug-operation-button" aria-label="快速指派" @click="openQuickAssign(record)"><UserSwitchOutlined /></a-button>
                    </a-tooltip>
                    <a-tooltip v-if="!isClosedPersonalBug(record) && isPersonalBugCreator(record)" title="关闭">
                      <a-button type="link" size="small" class="bug-operation-button" aria-label="关闭" danger :loading="personalBugActionId === record.id + '_close'" @click="handleClosePersonalBug(record)"><CloseCircleOutlined /></a-button>
                    </a-tooltip>
                  </a-space>
                </template>
                <template v-else>{{ text }}</template>
              </template>
            </a-table>
          </div>
          <div v-else class="personal-bug-group-view">
            <div class="personal-bug-group-list">
              <section v-for="group in groupedBugs" :key="group.value" class="personal-bug-group">
              <header class="personal-bug-group__header">
                <button type="button" @click="handleToggleBugGroup(group.value)">
                  <RightOutlined v-if="isBugGroupCollapsed(group.value)" />
                  <DownOutlined v-else />
                  {{ group.label }}
                </button>
                <a-tag>{{ group.rows.length }}</a-tag>
              </header>
              <a-table v-if="!isBugGroupCollapsed(group.value)" :columns="personalBugColumns" :data-source="group.rows" :pagination="false" :scroll="{ x: 1240 }" size="middle" row-key="id" table-layout="fixed">
                <template #bodyCell="{ column, record, text }">
                  <template v-if="column.dataIndex === 'code'">
                    <span class="bug-no">{{ text && text !== '-' ? '#' + String(text).padStart(3, '0') : '-' }}</span>
                  </template>
                  <template v-else-if="column.dataIndex === 'title'">
                    <a-tooltip :title="text">
                      <span class="bug-title-text" @click="handleBugDetail(record)">{{ text }}</span>
                    </a-tooltip>
                  </template>
                  <template v-else-if="column.dataIndex === 'level'">
                    <a-tag :color="record.levelColor">{{ text }}</a-tag>
                  </template>
                  <template v-else-if="column.dataIndex === 'status'">
                    <a-tag :color="record.statusColor">{{ text }}</a-tag>
                  </template>
                  <template v-else-if="column.dataIndex === 'operation'">
                    <a-space :size="4">
                      <a-tooltip v-if="canAssignPersonalBug(record)" title="快速指派">
                        <a-button type="link" size="small" class="bug-operation-button" aria-label="快速指派" @click="openQuickAssign(record)"><UserSwitchOutlined /></a-button>
                      </a-tooltip>
                      <a-tooltip v-if="!isClosedPersonalBug(record) && isPersonalBugCreator(record)" title="关闭">
                        <a-button type="link" size="small" class="bug-operation-button" aria-label="关闭" danger :loading="personalBugActionId === record.id + '_close'" @click="handleClosePersonalBug(record)"><CloseCircleOutlined /></a-button>
                      </a-tooltip>
                    </a-space>
                  </template>
                  <template v-else>{{ text }}</template>
                </template>
              </a-table>
              </section>
              <a-empty v-if="!groupedBugs.length" />
            </div>
          </div>
          <a-pagination
            class="personal-bug-pagination"
            v-model:current="bugCurrentPage"
            v-model:page-size="bugPageSize"
            :total="visibleBugs.length"
            :page-size-options="['10', '50', '100']"
            :show-total="total => `共 ${total} 条`"
            show-size-changer
            @change="handlePersonalBugPageChange"
          />
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
            <!-- <a-select class="daily-select" value="全部" :options="selectOptions" />
            <a-input-search class="daily-search" placeholder="请搜索或选择人员" /> -->
            <a-button type="primary" @click="openDailyModal">
              <template #icon><PlusOutlined /></template>
              新建日报
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
            <a-spin :spinning="dailyLoading">
              <template v-if="dailyHasRecord">
                <!-- <div class="daily-record-head">
                  <span>所属项目：{{ dailyProjectText }}</span>
                  <span>提交人：{{ dailyReporterText }}</span>
                </div> -->
                <div class="daily-record-body">
                  <label>工作内容：</label>
                  <p>{{ dailyContentText }}</p>
                </div>
                <!-- <h3>已上传附件（{{ dailyFiles.length }}）</h3>
                <div v-if="dailyFiles.length" class="daily-files">
                  <article v-for="file in dailyFiles" :key="file.id || file.name" class="daily-file">
                    <span class="daily-file-icon" :class="file.type">
                      <component :is="file.icon" />
                    </span>
                    <div>
                      <strong>{{ file.name }}</strong>
                      <p>{{ file.size }}　{{ file.time }}　{{ file.user }}</p>
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
                <a-empty v-else class="daily-file-empty" description="暂无附件" /> -->
                <span class="daily-time">{{ dailySubmitTime }}</span>
              </template>
              <a-empty v-else :description="dailyError || `${selectedDailyDateText} 没有工作记录`" />
            </a-spin>
          </a-card>
        </section>
      </section>
    </template>

    <template v-else-if="isPersonalStatistics">
      <section class="personal-page statistics-page">
        <a-card class="prototype-card statistics-shell" :bordered="false">
          <a-spin :spinning="statsLoading">
          <div class="stats-title-row">
            <div class="prototype-heading prototype-heading--inline">
              <h1 class="prototype-title">{{ isGmOffice ? '全员统计' : '我的统计' }}</h1>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <a-select
                v-if="isGmOffice"
                v-model:value="statsTargetUserId"
                placeholder="查看全员"
                allow-clear
                style="width: 140px;"
                :options="statsUserOptions"
                @change="loadMyStatistics"
              />
              <a-select class="daily-select" v-model:value="statsPeriod" :options="STATS_PERIOD_OPTIONS" />
            </div>
          </div>
          <section class="stat-cards">
            <article v-for="card in statCards" :key="card.label" class="stat-card">
              <span class="stat-icon" :class="card.className"><svg class="stat-icon__svg" viewBox="0 0 48 48" aria-hidden="true"><path v-for="path in card.paths" :key="path" :d="path" /></svg></span>
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
                    <li v-if="!projectLegendItems.length" class="muted">暂无数据</li>
                    <li v-for="item in projectLegendItems" :key="item.name">
                      <span class="legend-dot" :style="{ background: item.color }"></span>{{ item.name }} <strong>{{ item.pct }}</strong>
                    </li>
                  </ul>
                </div>
                <div class="distribution-panel">
                  <h3>任务状态分布</h3>
                  <div ref="statusChartRef" class="echart donut-chart"></div>
                  <ul class="chart-legend">
                    <li v-if="!statusLegendItems.length" class="muted">暂无数据</li>
                    <li v-for="item in statusLegendItems" :key="item.name">
                      <span class="legend-dot" :style="{ background: item.color }"></span>{{ item.name }} <strong>{{ item.pct }}</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </a-card>
          </section>
          </a-spin>
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

    <a-modal v-model:open="taskEditOpen" width="41.25rem" :title="taskModalTitle" centered>
      <template #footer>
        <a-space>
          <a-button @click="taskEditOpen = false">取消</a-button>
          <a-button type="primary" :loading="taskSubmitLoading" @click="handleTaskSubmit">确认</a-button>
        </a-space>
      </template>
      <a-form class="prototype-modal-form" layout="horizontal" :label-col="{ span: 5 }">
        <template v-if="!isPersonalTasks">
          <a-form-item label="所属项目" required><a-select v-model:value="taskFormState.projectId" :options="taskFormProjectOptions" placeholder="请选择所属项目" /></a-form-item>
          <a-form-item label="任务名称" required><a-input v-model:value="taskFormState.name" placeholder="请输入任务名称" /></a-form-item>
          <a-form-item label="负责人" required><a-select v-model:value="taskFormState.assigneeId" :options="taskUserOptions" placeholder="请选择负责人" /></a-form-item>
          <a-form-item label="角色"><a-select v-model:value="taskFormState.roleName" :options="roleOptions" allow-clear placeholder="请选择角色" /></a-form-item>
          <a-form-item label="标签"><a-input v-model:value="taskFormState.tags" placeholder="多个标签用逗号分隔" /></a-form-item>
          <a-form-item v-if="editingTaskId" label="状态"><a-select v-model:value="taskFormState.status" :options="taskStatusSelectOptions" placeholder="请选择状态" /></a-form-item>
          <a-form-item label="优先级" required><a-select v-model:value="taskFormState.priority" :options="taskPrioritySelectOptions" placeholder="请选择优先级" /></a-form-item>
          <a-form-item label="计划开始时间"><a-date-picker v-model:value="taskFormState.plannedStartDate" style="width:100%" /></a-form-item>
          <a-form-item label="计划结束时间"><a-date-picker v-model:value="taskFormState.plannedEndDate" style="width:100%" /></a-form-item>
          <a-form-item label="任务描述"><a-textarea v-model:value="taskFormState.description" :rows="4" placeholder="请输入任务描述" /></a-form-item>
        </template>
        <template v-if="isPersonalTasks && editingTaskId">
          <a-form-item label="实际开始时间"><a-date-picker v-model:value="taskFormState.actualStartDate" style="width:100%" /></a-form-item>
          <a-form-item label="实际完成时间"><a-date-picker v-model:value="taskFormState.actualEndDate" style="width:100%" /></a-form-item>
          <a-form-item label="备注"><a-textarea v-model:value="taskFormState.remark" :rows="3" placeholder="请输入备注" /></a-form-item>
        </template>
      </a-form>
    </a-modal>

    <a-modal v-model:open="bugAssignOpen" width="32rem" title="快速指派" :confirm-loading="bugAssignLoading" ok-text="确认" cancel-text="取消" centered @ok="handleQuickAssign">
      <a-form class="prototype-modal-form" layout="horizontal" :label-col="{ span: 5 }">
        <a-form-item label="指派给" required>
          <a-select v-model:value="bugAssignForm.assigneeId" :options="bugUserOptions" placeholder="请选择负责人" show-search option-filter-prop="label" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="bugAssignForm.reason" :rows="4" placeholder="请输入备注" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="bugEditOpen" width="40rem" title="编辑Bug" centered>
      <template #footer>
        <a-space>
          <a-button @click="bugEditOpen = false">取消</a-button>
          <a-button type="primary" :loading="bugSubmitLoading" @click="handleBugSubmit">确认</a-button>
        </a-space>
      </template>
      <a-form class="prototype-modal-form" layout="horizontal" :label-col="{ span: 5 }">
        <a-form-item label="Bug标题"><a-input v-model:value="bugForm.title" placeholder="请输入Bug标题" /></a-form-item>
        <a-form-item label="所属项目"><a-select v-model:value="bugForm.projectId" allow-clear placeholder="请选择项目" :options="bugProjects.map(p => ({ label: p.name, value: p.id }))" /></a-form-item>
        <a-form-item label="严重等级">
          <a-select v-model:value="bugForm.priority" allow-clear placeholder="请选择"
            :options="[{ label: '紧急', value: 'URGENT' }, { label: '高', value: 'HIGH' }, { label: '中', value: 'MEDIUM' }, { label: '低', value: 'LOW' }]" />
        </a-form-item>
        <a-form-item label="指定人"><a-select v-model:value="bugForm.assigneeId" allow-clear placeholder="请选择负责人" :options="bugUsers.map(u => ({ label: u.realName, value: u.id }))" /></a-form-item>
        <a-form-item label="问题描述"><a-textarea v-model:value="bugForm.description" :rows="3" placeholder="请描述问题现象" /></a-form-item>
        <a-form-item label="重现步骤"><a-textarea v-model:value="bugForm.reproduceSteps" :rows="3" placeholder="请描述复现步骤" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="bugFixOpen" width="37.5rem" title="填写修复详情" centered>
      <template #footer>
        <a-space>
          <a-button @click="bugFixOpen = false">取消</a-button>
          <a-button type="primary" :loading="bugFixLoading" @click="handleFixSubmit">提交（变更为待验证）</a-button>
        </a-space>
      </template>
      <a-form class="prototype-modal-form" layout="horizontal" :label-col="{ span: 5 }">
        <a-form-item label="问题分析"><a-textarea v-model:value="bugFixForm.fixAnalysis" :rows="4" placeholder="请分析问题根因" /></a-form-item>
        <a-form-item label="修复细节"><a-textarea v-model:value="bugFixForm.fixDetail" :rows="4" placeholder="请描述修复方案和改动点" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="dailyEditOpen" width="45rem" title="新建日报" centered>
      <template #footer>
        <a-space>
          <a-button @click="dailyEditOpen = false">取消</a-button>
          <a-button type="primary" :loading="dailySubmitLoading" @click="handleCreateDailyReport">确认</a-button>
        </a-space>
      </template>
      <a-form class="prototype-modal-form daily-modal-form" layout="horizontal" :label-col="{ span: 4 }">
        <a-form-item label="日报日期">
          <a-date-picker v-model:value="dailyForm.reportDate" :allow-clear="false" :disabled-date="disabledDailyDate" />
        </a-form-item>
        <a-form-item label="工作内容">
          <a-textarea v-model:value="dailyForm.content" :rows="8" placeholder="请输入工作内容" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="uploadOpen" width="47.5rem" title="上传文件" centered>
      <template #footer>
        <a-space>
          <a-button @click="uploadOpen = false">取消</a-button>
          <a-button type="primary" :loading="taskUploadLoading" @click="handleStartTaskUpload">开始上传</a-button>
        </a-space>
      </template>
      <a-upload-dragger class="upload-dragger" :file-list="uploadFiles" name="file" :before-upload="handleTaskBeforeUpload" @remove="handleRemoveTaskUploadFile">
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
    </a-modal>
  </div>
</template>

<script setup>
import {
  BugOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  InboxOutlined,
  LeftOutlined,
  PaperClipOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  RightOutlined,
  ScheduleOutlined,
  ToolOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createDailyReport, fetchDailyReports } from '@/api/dailyReports'
import {
  assignBug,
  closeBug,
  createTask,
  deleteBug,
  deleteProjectFile,
  deleteTask,
  downloadProjectFile,
  fixBug,
  getDicts,
  getMyStatistics,
  getMyBugs,
  getProjectBugs,
  getProjectFiles,
  getProjectList,
  getProjectTasks,
  getSystemUsers,
  getTaskById,
  updateBug,
  updateTask,
  uploadProjectFile,
} from '@/api/managementProject'
import { formatDateTime } from '@/utils/dateTime'
import { OPERATION_ACTIONS, OPERATION_MODULES, recordOperationLog } from '@/utils/operationLog'
import { canViewAllStatistics } from '@/utils/authScope'

const route = useRoute()
const router = useRouter()
const personalMode = ref('task-list')
const taskEditOpen = ref(false)
const taskModalMode = ref('edit')
const bugEditOpen = ref(false)
const bugForm = ref({ projectId: undefined, title: '', priority: undefined, assigneeId: undefined, description: '', reproduceSteps: '' })
const bugEditingId = ref(null)
const bugSubmitLoading = ref(false)
const bugFixOpen = ref(false)
const bugFixBugId = ref(null)
const bugFixForm = ref({ fixAnalysis: '', fixDetail: '' })
const bugFixLoading = ref(false)
const bugVerifyLoading = ref(false)
const bugAssignOpen = ref(false)
const bugAssignLoading = ref(false)
const assigningBug = ref(null)
const bugAssignForm = ref({ assigneeId: undefined, reason: '' })
const personalBugActionId = ref('')

const currentUserId = computed(() => {
  try { return JSON.parse(localStorage.getItem('userInfo') || '{}').userId || null } catch { return null }
})

const isClosedPersonalBug = bug => bug?.statusCode === 'CLOSED'
const isPersonalBugCreator = bug => Boolean(currentUserId.value) && String(bug?.creatorId) === String(currentUserId.value)
const isPersonalBugAssignee = bug => Boolean(currentUserId.value) && String(bug?.assigneeId) === String(currentUserId.value)
const canAssignPersonalBug = bug => !isClosedPersonalBug(bug) && (isPersonalBugCreator(bug) || isPersonalBugAssignee(bug))

const dailyEditOpen = ref(false)
const uploadOpen = ref(false)
const dailyHasRecord = ref(true)
const selectedDailyDate = ref(dayjs())
const dailyLoading = ref(false)
const dailyError = ref('')
const dailyReports = ref([])
const dailySubmitLoading = ref(false)
const taskApiRows = ref([])
const taskUsers = ref([])
const taskProjects = ref([])
const taskDictLabels = ref({ taskPriority: {}, taskStatus: {} })
const taskPaginationTotal = ref(0)
const taskSubmitLoading = ref(false)
const taskDetailLoading = ref(false)
const selectedTaskDetail = ref(null)
const taskAttachmentRows = ref([])
const taskRelatedBugRows = ref([])
const taskUploadLoading = ref(false)
const editingTaskId = ref(null)
const taskDisplayMode = ref('list')
const taskGroupField = ref('project')
const collapsedTaskGroups = ref([])
const taskCurrentPage = ref(1)
const taskPageSize = ref(10)
const bugApiRows = ref([])
const bugUsers = ref([])
const bugProjects = ref([])
const bugDisplayMode = ref('list')
const bugGroupField = ref('project')
const collapsedBugGroups = ref([])
const bugCurrentPage = ref(1)
const bugPageSize = ref(10)
const bugFilter = ref({
  keyword: '',
  projectId: undefined,
  priority: undefined,
  status: undefined,
  creatorId: undefined,
  assigneeId: undefined,
})
const taskFilter = ref({
  keyword: '',
  projectId: undefined,
  assigneeId: undefined,
  priority: undefined,
  status: undefined,
  plannedEndDate: undefined,
})
const taskFormState = ref({
  projectId: undefined,
  name: '',
  roleName: undefined,
  priority: undefined,
  assigneeId: undefined,
  status: undefined,
  plannedStartDate: undefined,
  plannedEndDate: undefined,
  actualStartDate: undefined,
  actualEndDate: undefined,
  description: '',
  tags: '',
  remark: '',
})
const dailyForm = ref({
  reportDate: dayjs(),
  content: '',
})
const uploadFiles = ref([])
const statsPeriod = ref('week')
const statsData = ref(null)
const statsLoading = ref(false)
const statsTargetUserId = ref(null)
const statsUserOptions = ref([])
const isGmOffice = ref(false)
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
const taskModalTitle = computed(() => {
  if (taskModalMode.value === 'create') return '新建任务'
  if (isPersonalTasks.value) return '更新进度'
  return '编辑任务'
})
const taskGroupOptions = [
  { label: '所属项目', value: 'project' },
  { label: '负责人', value: 'owner' },
  { label: '角色', value: 'role' },
  { label: '优先级', value: 'priority' },
  { label: '状态', value: 'status' },
]
const taskGroupLabelMap = { project: '所属项目', owner: '负责人', role: '角色', priority: '优先级', status: '状态' }
const visibleTasks = computed(() => {
  if (route.name === 'TestingTasks') {
    return taskApiRows.value.filter(task => task.role === '测试')
  }
  if (route.name === 'DevelopmentTasks') {
    return taskApiRows.value.filter(task => task.role !== '测试')
  }
  return taskApiRows.value
})
const pagedVisibleTasks = computed(() => {
  const start = (taskCurrentPage.value - 1) * taskPageSize.value
  return visibleTasks.value.slice(start, start + taskPageSize.value)
})
const groupedTasks = computed(() => {
  const groups = new Map()
  pagedVisibleTasks.value.forEach(task => {
    const value = task[taskGroupField.value] || '未设置'
    if (!groups.has(value)) groups.set(value, [])
    groups.get(value).push(task)
  })
  return Array.from(groups, ([value, rows]) => ({ value, label: `${taskGroupLabelMap[taskGroupField.value]}：${value}`, rows }))
})
const isManagementProject = project => (project?.projectType || project?.type) === 'MANAGEMENT'
const taskFilterProjectOptions = computed(() =>
  taskProjects.value.map(p => ({ label: p.name, value: p.id }))
)
const taskFormProjectOptions = computed(() =>
  taskProjects.value.map(p => ({ label: p.name, value: p.id }))
)
const taskUserOptions = computed(() =>
  taskUsers.value.map(u => ({ label: u.realName, value: u.id }))
)
const taskPrioritySelectOptions = computed(() =>
  Object.entries(taskDictLabels.value.taskPriority).map(([value, label]) => ({ label, value }))
)
const taskStatusSelectOptions = computed(() =>
  Object.entries(taskDictLabels.value.taskStatus).map(([value, label]) => ({ label, value }))
)
const visibleBugs = computed(() => bugApiRows.value)
const bugUserOptions = computed(() => bugUsers.value.map(user => ({ label: user.realName, value: user.id })))
const pagedVisibleBugs = computed(() => {
  const start = (bugCurrentPage.value - 1) * bugPageSize.value
  return visibleBugs.value.slice(start, start + bugPageSize.value)
})
const bugGroupOptions = [
  { label: '所属项目', value: 'project' },
  { label: '优先级', value: 'level' },
  { label: '状态', value: 'status' },
]
const groupedBugs = computed(() => {
  const groups = new Map()
  pagedVisibleBugs.value.forEach(bug => {
    const value = bug[bugGroupField.value] || '未分组'
    if (!groups.has(value)) groups.set(value, [])
    groups.get(value).push(bug)
  })
  return Array.from(groups, ([value, rows]) => ({ value, label: value, rows }))
})
const selectedDailyDateText = computed(() => selectedDailyDate.value.format('YYYY-MM-DD'))
const currentDailyReport = computed(() => dailyReports.value[0])
const dailyProjectText = computed(() => {
  const report = currentDailyReport.value
  return report?.projectName || report?.project?.name || (report?.projectId ? `项目ID：${report.projectId}` : '-')
})
const dailyReporterText = computed(() => {
  const report = currentDailyReport.value
  return report?.reporterName || report?.reporter?.name || report?.createdByName || report?.creatorName || (report?.reporterId ? `用户ID：${report.reporterId}` : '-')
})
const dailyContentText = computed(() => currentDailyReport.value?.content || '')
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
const dailySubmitTime = computed(() => {
  const report = currentDailyReport.value
  return formatDateTime(report?.updatedAt || report?.createdAt || `${selectedDailyDate.value.format('YYYY-MM-DD')} 18:00:00`)
})

watch(
  () => [route.name, route.query.detail, route.query.taskId],
  async ([name, detail, taskId]) => {
    if ((name === 'PersonalTasks' || taskModuleRouteNames.includes(name)) && detail === 'task') {
      personalMode.value = 'task-detail'
      if (taskId && (!selectedTaskDetail.value || String(selectedTaskDetail.value.id) !== String(taskId))) {
        await loadTaskDetailData(taskId)
      }
    } else {
      personalMode.value = name === 'PersonalBugs' ? 'bug-list' : 'task-list'
    }

    if (name === 'PersonalStatistics') {
      const profile = JSON.parse(localStorage.getItem('authProfile') || '{}')
      isGmOffice.value = canViewAllStatistics(profile)
      if (isGmOffice.value && statsUserOptions.value.length === 0) {
        try {
          const { getUserList } = await import('@/api/system')
          const result = await getUserList({ pageSize: 500, enabled: true })
          const records = result?.records || result || []
          statsUserOptions.value = records.map(u => ({ value: u.id, label: u.realName || u.username }))
        } catch { /* ignore */ }
      }
      loadMyStatistics()
    }
  },
  { immediate: true },
)

watch(
  () => route.name,
  name => {
    if (name === 'PersonalTasks' || taskModuleRouteNames.includes(name)) {
      taskCurrentPage.value = 1
      fetchTaskModuleData()
    }
    if (name === 'PersonalBugs') {
      fetchBugModuleData()
    }
  },
  { immediate: true },
)

watch([taskGroupField, () => route.name], () => {
  collapsedTaskGroups.value = []
})

watch(bugGroupField, () => {
  collapsedBugGroups.value = []
})

function getTaskLabel(type, value) {
  return taskDictLabels.value[type]?.[value] || value || '-'
}

function getTaskUserName(userId) {
  return taskUsers.value.find(item => item.id === userId)?.realName || (userId ? `用户 ${userId}` : '-')
}

function getTaskProjectName(projectId) {
  return taskProjects.value.find(item => String(item.id) === String(projectId))?.name || '-'
}

function getTaskRoleName(task) {
  const roleName = task.roleName || ''
  if (roleName.includes('测试') || /test/i.test(roleName)) return '测试'
  if (roleName.includes('开发') || /dev/i.test(roleName)) return '开发'
  return route.name === 'TestingTasks' ? '测试' : '开发'
}

function getTaskProgress(status) {
  if (status === 'COMPLETED') return 100
  if (status === 'IN_PROGRESS') return 60
  if (status === 'DUE_SOON') return 80
  if (status === 'OVERDUE') return 70
  return 0
}

async function fetchTaskModuleData() {
  try {
    const [dicts, users, projects] = await Promise.all([
      getDicts(),
      getSystemUsers({ pageNo: 1, pageSize: 200, enabled: true }),
      getProjectList({ pageNo: 1, pageSize: 200, projectType: 'EXECUTION' }),
    ])
    taskUsers.value = users.records || []
    taskProjects.value = projects.records || []
    taskDictLabels.value = {
      taskPriority: Object.fromEntries((dicts.find(item => item.type === 'taskPriority')?.items || []).map(item => [item.value, item.label])),
      taskStatus: Object.fromEntries((dicts.find(item => item.type === 'taskStatus')?.items || []).map(item => [item.value, item.label])),
    }
    await loadTasks()
  } catch (error) {
    taskApiRows.value = []
    message.error(error.message)
  }
}

function resolveTaskStatusCode(task) {
  if (!task) return 'NOT_STARTED'
  if (task.status === 'PAUSED') return 'PAUSED'
  if (task.actualEndDate) return 'COMPLETED'

  const today = dayjs().startOf('day')
  const planEnd = task.plannedEndDate ? dayjs(task.plannedEndDate).startOf('day') : null
  if (planEnd?.isValid()) {
    if (today.isAfter(planEnd)) return 'OVERDUE'
    if (planEnd.diff(today, 'day') <= 3) return 'DUE_SOON'
  }

  const planStart = task.plannedStartDate ? dayjs(task.plannedStartDate).startOf('day') : null
  if (task.actualStartDate || (planStart?.isValid() && !today.isBefore(planStart))) return 'IN_PROGRESS'
  return 'NOT_STARTED'
}

async function loadTasks() {
  try {
    const profile = JSON.parse(window.localStorage.getItem('authProfile') || '{}')
    const f = taskFilter.value
    const result = await getProjectTasks({
      pageNo: 1,
      pageSize: 200,
      keyword: f.keyword || undefined,
      projectId: f.projectId || undefined,
      assigneeId: route.name === 'PersonalTasks' ? profile.id : (f.assigneeId || undefined),
      priority: f.priority || undefined,
      status: f.status || undefined,
      plannedEndDate: f.plannedEndDate ? f.plannedEndDate.format('YYYY-MM-DD') : undefined,
    })
    taskPaginationTotal.value = result.total || 0
    taskApiRows.value = (result.records || []).map((task, index) => {
      const statusCode = resolveTaskStatusCode(task)
      return ({
      id: task.id,
      index: index + 1,
      name: task.name,
      project: task.projectName || getTaskProjectName(task.projectId),
      projectId: task.projectId,
      role: getTaskRoleName(task),
      roleName: task.roleName || '',
      tag: task.tags || '-',
      owner: getTaskUserName(task.assigneeId),
      assigneeId: task.assigneeId,
      priority: getTaskLabel('taskPriority', task.priority),
      priorityCode: task.priority,
      status: getTaskLabel('taskStatus', statusCode),
      statusCode,
      planStart: task.plannedStartDate ? String(task.plannedStartDate) : '-',
      actualStart: task.actualStartDate ? String(task.actualStartDate) : '-',
      planEnd: task.plannedEndDate ? String(task.plannedEndDate) : '-',
      actualEnd: task.actualEndDate ? String(task.actualEndDate) : '-',
      createdAt: formatDateTime(task.createdAt || task.createTime || task.createdTime || task.createAt),
      description: task.description || '',
      tags: task.tags || '',
      remark: task.remark || '',
    })
    })
    const lastPage = Math.max(1, Math.ceil(visibleTasks.value.length / taskPageSize.value))
    taskCurrentPage.value = Math.min(taskCurrentPage.value, lastPage)
  } catch (error) {
    taskApiRows.value = []
    message.error(error.message)
  }
}

const BUG_STATUS_LABELS = { PENDING_FIX: '待修复', FIXING: '修复中', PENDING_VERIFY: '待验证', CLOSED: '已关闭' }
const BUG_STATUS_COLORS = { PENDING_FIX: 'orange', FIXING: 'blue', PENDING_VERIFY: 'purple', CLOSED: 'green' }
const BUG_PRIORITY_LABELS = { LOW: '轻微', MEDIUM: '一般', HIGH: '严重', URGENT: '致命' }
const BUG_PRIORITY_COLORS = { LOW: 'blue', MEDIUM: 'orange', HIGH: 'error', URGENT: 'red' }

function getBugStatusLabel(status) { return BUG_STATUS_LABELS[status] || status || '-' }
function getBugStatusColor(status) { return BUG_STATUS_COLORS[status] || 'default' }
function getBugPriorityLabel(priority) { return BUG_PRIORITY_LABELS[priority] || priority || '-' }
function getBugPriorityColor(priority) { return BUG_PRIORITY_COLORS[priority] || 'default' }
function formatBugNo(bug) {
  if (bug?.bugNo) return `#${String(bug.bugNo).padStart(3, '0')}`
  if (bug?.code) return bug.code
  return bug?.id ? `BUG-${bug.id}` : '-'
}
function getBugUserName(userId) { return bugUsers.value.find(u => u.id === userId)?.realName || '-' }
function getBugProjectName(projectId) { return bugProjects.value.find(p => p.id === projectId)?.name || '-' }

async function fetchBugModuleData() {
  try {
    const [dicts, users, projects] = await Promise.all([
      getDicts(),
      getSystemUsers({ pageNo: 1, pageSize: 200, enabled: true }),
      getProjectList({ pageNo: 1, pageSize: 200, projectType: 'MANAGEMENT' }),
    ])
    bugUsers.value = users.records || []
    bugProjects.value = projects.records || []
    // reuse taskPriority dict for bug priority labels
    const priorityItems = dicts.find(item => item.type === 'taskPriority')?.items || []
    if (priorityItems.length && !Object.keys(taskDictLabels.value.taskPriority).length) {
      taskDictLabels.value = {
        ...taskDictLabels.value,
        taskPriority: Object.fromEntries(priorityItems.map(item => [item.value, item.label])),
      }
    }
    await loadMyBugs()
  } catch (error) {
    bugApiRows.value = []
    message.error(error.message)
  }
}

async function loadMyBugs() {
  try {
    const f = bugFilter.value
    const result = await getMyBugs({
      keyword: f.keyword || undefined,
      projectId: f.projectId || undefined,
      priority: f.priority || undefined,
      status: f.status || undefined,
      creatorId: f.creatorId || undefined,
    })
    const bugs = Array.isArray(result) ? result : (result.records || [])
    bugApiRows.value = bugs.map((bug, index) => ({
      id: bug.id,
      index: index + 1,
      code: bug.bugNo ? String(bug.bugNo) : '-',
      title: bug.title,
      project: getBugProjectName(bug.projectId),
      projectId: bug.projectId,
      level: getBugPriorityLabel(bug.priority),
      levelColor: getBugPriorityColor(bug.priority),
      priorityCode: bug.priority,
      status: getBugStatusLabel(bug.status),
      statusColor: getBugStatusColor(bug.status),
      statusCode: bug.status,
      assignee: getBugUserName(bug.assigneeId),
      assigneeId: bug.assigneeId,
      creator: getBugUserName(bug.creatorId),
      creatorId: bug.creatorId,
      description: bug.description || '',
      reproduceSteps: bug.reproduceSteps || '',
      fixAnalysis: bug.fixAnalysis || '',
      fixDetail: bug.fixDetail || '',
      closedAt: bug.closedAt || null,
      createdAt: formatDateTime(bug.createdAt),
    }))
  } catch (error) {
    bugApiRows.value = []
    message.error(error.message)
  }
}

function disposeStatisticsCharts() {
  trendChart?.dispose()
  projectChart?.dispose()
  statusChart?.dispose()
  trendChart = undefined
  projectChart = undefined
  statusChart = undefined
}

function createDonutOption(data, colors, centerText) {
  return {
    color: colors,
    tooltip: { show: false },
    graphic: centerText != null ? [{
      type: 'text',
      left: 'center',
      top: 'middle',
      style: { text: centerText, textAlign: 'center', fill: '#111827', fontSize: 28, fontWeight: 700 },
    }] : [],
    series: [{
      type: 'pie',
      radius: ['68%', '82%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      label: { show: false },
      labelLine: { show: false },
      data,
    }],
  }
}

async function loadMyStatistics() {
  statsLoading.value = true
  try {
    statsData.value = await getMyStatistics(statsPeriod.value, statsTargetUserId.value)
    await nextTick()
    renderStatisticsCharts()
  } catch (error) {
    message.error(error.message || '统计数据加载失败')
  } finally {
    statsLoading.value = false
  }
}

function renderStatisticsCharts() {
  if (!trendChartRef.value || !projectChartRef.value || !statusChartRef.value) {
    return
  }

  const stats = statsData.value
  disposeStatisticsCharts()

  trendChart = echarts.init(trendChartRef.value)
  projectChart = echarts.init(projectChartRef.value)
  statusChart = echarts.init(statusChartRef.value)

  // 任务完成趋势
  const trendPoints = stats?.completionTrend || []
  const trendDates = trendPoints.map(p => dayjs(p.date).format('MM/DD'))
  const trendValues = trendPoints.map(p => p.count)
  const yMax = Math.max(...trendValues, 0) + 2

  trendChart.setOption({
    color: ['#2f80ed'],
    tooltip: {
      trigger: 'axis',
      formatter: params => `${params[0].axisValue}<br/>完成数：${params[0].value}`,
    },
    grid: { top: 28, right: 24, bottom: 34, left: 42 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendDates.length ? trendDates : ['暂无数据'],
      axisLine: { lineStyle: { color: '#d8dee8' } },
      axisLabel: { color: '#6b7280', fontSize: 12 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: yMax,
      interval: 1,
      splitLine: { lineStyle: { color: '#eef2f7' } },
      axisLabel: { color: '#6b7280', fontSize: 12 },
    },
    series: [{
      name: '完成数',
      type: 'line',
      smooth: false,
      symbol: 'circle',
      symbolSize: 8,
      data: trendValues,
      lineStyle: { width: 3, color: '#2f80ed' },
      itemStyle: { color: '#fff', borderColor: '#2f80ed', borderWidth: 3 },
      areaStyle: { color: 'rgba(47, 128, 237, 0.12)' },
      label: { show: true, formatter: ({ value }) => value || '', color: '#2f80ed', fontWeight: 700 },
    }],
  })

  // 项目分布
  const projectDist = stats?.projectDistribution || {}
  const projectData = Object.entries(projectDist).map(([name, value], i) => ({
    value: Number(value),
    name,
    itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
  }))
  projectChart.setOption(createDonutOption(
    projectData.length ? projectData : [{ value: 1, name: '暂无数据', itemStyle: { color: '#e8e8e8' } }],
    CHART_COLORS,
    projectData.length ? `${projectData.length} 个` : '-',
  ))

  // 任务状态分布
  const statusDist = stats?.taskStatusDistribution || {}
  const statusData = Object.entries(statusDist).map(([code, value]) => ({
    value: Number(value),
    name: STATUS_LABEL_MAP[code] || code,
    itemStyle: { color: STATUS_COLOR_MAP[code] || '#c8cfd9' },
  }))
  const statusTotal = statusData.reduce((s, d) => s + d.value, 0)
  statusChart.setOption(createDonutOption(
    statusData.length ? statusData : [{ value: 1, name: '暂无数据', itemStyle: { color: '#e8e8e8' } }],
    Object.values(STATUS_COLOR_MAP),
    statusData.length ? `${statusTotal} 个` : '-',
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

const updateDetailQuery = (detail, taskId) => {
  router.replace({
    path: route.path,
    query: detail
      ? { ...route.query, detail, ...(taskId ? { taskId } : {}) }
      : Object.fromEntries(Object.entries(route.query).filter(([key]) => key !== 'detail' && key !== 'taskId')),
  })
}

async function loadTaskDetailData(taskId) {
  selectedTaskDetail.value = null
  taskAttachmentRows.value = []
  taskRelatedBugRows.value = []
  taskDetailLoading.value = true
  try {
    const [detail, files, bugs] = await Promise.all([
      getTaskById(taskId),
      getProjectFiles({ businessType: 'TASK', businessId: taskId }),
      fetchAllTaskBugs(taskId),
    ])
    selectedTaskDetail.value = { ...detail, status: resolveTaskStatusCode(detail) }
    taskAttachmentRows.value = Array.isArray(files) ? files : []
    taskRelatedBugRows.value = bugs
  } catch (error) {
    message.error(error.message || '任务详情加载失败')
  } finally {
    taskDetailLoading.value = false
  }
}

async function fetchAllTaskBugs(taskId) {
  const pageSize = 200
  const first = await getProjectBugs({ taskId, pageNo: 1, pageSize })
  const records = [...(first.records || [])]
  const total = Number(first.total || records.length)
  const pages = Math.ceil(total / pageSize)
  for (let pageNo = 2; pageNo <= pages; pageNo += 1) {
    const next = await getProjectBugs({ taskId, pageNo, pageSize })
    records.push(...(next.records || []))
  }
  return records
}

const handleTaskDetail = async record => {
  if (route.name === 'PersonalTasks') {
    router.push(`/personal/tasks/${record.id}`)
    return
  }

  personalMode.value = 'task-detail'
  updateDetailQuery('task', record.id)
  await loadTaskDetailData(record.id)
  if (selectedTaskDetail.value) {
    void recordOperationLog({
      module: OPERATION_MODULES.TASK,
      action: OPERATION_ACTIONS.DETAIL,
      bizType: 'TASK',
      bizId: record.id,
      bizName: record.name,
      detail: `查看任务详情：${record.name}`,
      routeName: route.name,
    })
  }
}

const handleTaskBeforeUpload = file => {
  if (file.size > 50 * 1024 * 1024) {
    message.warning('单个文件不能超过50MB')
    return false
  }
  uploadFiles.value.push({
    uid: file.uid,
    name: file.name,
    size: formatFileSize(file.size),
    percent: 0,
    status: 'done',
    originFile: file,
  })
  return false
}

const handleRemoveTaskUploadFile = file => {
  uploadFiles.value = uploadFiles.value.filter(item => item.uid !== file.uid)
}

const handleStartTaskUpload = async () => {
  if (!selectedTaskDetail.value?.id) {
    message.warning('请先选择任务')
    return
  }
  if (!uploadFiles.value.length) {
    message.warning('请选择需要上传的文件')
    return
  }

  taskUploadLoading.value = true
  try {
    for (const uploadFile of uploadFiles.value) {
      const data = new FormData()
      data.append('businessType', 'TASK')
      data.append('businessId', selectedTaskDetail.value.id)
      data.append('storageLocation', 'BUSINESS')
      data.append('file', uploadFile.originFile)
      await uploadProjectFile(data)
      uploadFile.percent = 100
    }
    message.success('文件上传成功')
    uploadOpen.value = false
    uploadFiles.value = []
    const files = await getProjectFiles({ businessType: 'TASK', businessId: selectedTaskDetail.value.id })
    taskAttachmentRows.value = Array.isArray(files) ? files : []
  } catch (error) {
    message.error(error.message || '文件上传失败')
  } finally {
    taskUploadLoading.value = false
  }
}

const handleDownloadTaskAttachment = async record => {
  try {
    const result = await downloadProjectFile(record.id)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(result.blob)
    link.download = result.fileName
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (error) {
    message.error(error.message || '附件下载失败')
  }
}

const handleDeleteTaskAttachment = async record => {
  try {
    await deleteProjectFile(record.id)
    taskAttachmentRows.value = taskAttachmentRows.value.filter(item => item.id !== record.id)
    message.success('附件删除成功')
  } catch (error) {
    message.error(error.message || '附件删除失败')
  }
}

function getTaskStatusColor(status) {
  const map = { NOT_STARTED: 'default', IN_PROGRESS: 'blue', DUE_SOON: 'orange', OVERDUE: 'red', COMPLETED: 'green', PAUSED: 'purple' }
  return map[status] || 'default'
}

function getTaskPriorityColor(priority) {
  const map = { URGENT: 'red', HIGH: 'orange', MEDIUM: 'blue', LOW: 'default' }
  return map[priority] || 'default'
}

const openTaskModal = (mode, record) => {
  taskModalMode.value = mode
  if (mode === 'create') {
    editingTaskId.value = null
    taskFormState.value = {
      projectId: undefined,
      name: '',
      roleName: route.name === 'TestingTasks' ? '测试' : (route.name === 'DevelopmentTasks' ? '开发' : undefined),
      priority: undefined,
      assigneeId: undefined,
      status: undefined,
      plannedStartDate: undefined,
      plannedEndDate: undefined,
      description: '',
      tags: '',
    }
  } else {
    editingTaskId.value = record.id
    taskFormState.value = {
      projectId: record.projectId,
      name: record.name,
      roleName: record.roleName || undefined,
      priority: record.priorityCode || undefined,
      assigneeId: record.assigneeId || undefined,
      status: record.statusCode || undefined,
      plannedStartDate: record.planStart !== '-' ? dayjs(record.planStart) : undefined,
      plannedEndDate: record.planEnd !== '-' ? dayjs(record.planEnd) : undefined,
      actualStartDate: record.actualStart !== '-' ? dayjs(record.actualStart) : undefined,
      actualEndDate: record.actualEnd !== '-' ? dayjs(record.actualEnd) : undefined,
      description: record.description || '',
      tags: record.tags || '',
      remark: record.remark || '',
    }
  }
  taskEditOpen.value = true
}

const handleTaskSearch = () => {
  taskCurrentPage.value = 1
  loadTasks()
  void recordOperationLog({
    module: OPERATION_MODULES.TASK,
    action: OPERATION_ACTIONS.QUERY,
    bizType: 'TASK',
    bizName: route.meta?.title || '任务列表',
    detail: {
      keyword: taskFilter.value.keyword,
      projectId: taskFilter.value.projectId,
      assigneeId: taskFilter.value.assigneeId,
      priority: taskFilter.value.priority,
      status: taskFilter.value.status,
    },
    routeName: route.name,
  })
}

const handleTaskReset = () => {
  taskFilter.value = {
    keyword: '',
    projectId: undefined,
    assigneeId: undefined,
    priority: undefined,
    status: undefined,
    plannedEndDate: undefined,
  }
  taskCurrentPage.value = 1
  loadTasks()
}

const handleTaskPageChange = (current, pageSize) => {
  taskCurrentPage.value = current
  taskPageSize.value = pageSize
}

const isTaskGroupCollapsed = value => collapsedTaskGroups.value.includes(value)
const handleToggleTaskGroup = value => {
  collapsedTaskGroups.value = isTaskGroupCollapsed(value)
    ? collapsedTaskGroups.value.filter(item => item !== value)
    : [...collapsedTaskGroups.value, value]
}

const isBugGroupCollapsed = value => collapsedBugGroups.value.includes(value)
const handleToggleBugGroup = value => {
  collapsedBugGroups.value = isBugGroupCollapsed(value)
    ? collapsedBugGroups.value.filter(item => item !== value)
    : [...collapsedBugGroups.value, value]
}

const handleTaskSubmit = async () => {
  const fs = taskFormState.value

  taskSubmitLoading.value = true
  try {
    let body
    if (isPersonalTasks.value && editingTaskId.value) {
      body = {
        actualStartDate: fs.actualStartDate ? fs.actualStartDate.format('YYYY-MM-DD') : undefined,
        actualEndDate: fs.actualEndDate ? fs.actualEndDate.format('YYYY-MM-DD') : undefined,
        remark: fs.remark || undefined,
      }
    } else {
      if (!fs.name) { message.warning('请输入任务名称'); taskSubmitLoading.value = false; return }
      if (!fs.projectId) { message.warning('请选择所属项目'); taskSubmitLoading.value = false; return }
      if (!fs.assigneeId) { message.warning('请选择负责人'); taskSubmitLoading.value = false; return }
      if (!fs.priority) { message.warning('请选择优先级'); taskSubmitLoading.value = false; return }
      body = {
        projectId: fs.projectId,
        name: fs.name,
        roleName: fs.roleName || undefined,
        priority: fs.priority,
        assigneeId: fs.assigneeId,
        status: fs.status || undefined,
        plannedStartDate: fs.plannedStartDate ? fs.plannedStartDate.format('YYYY-MM-DD') : undefined,
        plannedEndDate: fs.plannedEndDate ? fs.plannedEndDate.format('YYYY-MM-DD') : undefined,
        actualStartDate: fs.actualStartDate ? fs.actualStartDate.format('YYYY-MM-DD') : undefined,
        actualEndDate: fs.actualEndDate ? fs.actualEndDate.format('YYYY-MM-DD') : undefined,
        description: fs.description || undefined,
        tags: fs.tags || undefined,
      }
    }
    if (editingTaskId.value) {
      await updateTask(editingTaskId.value, body)
      void recordOperationLog({
        module: OPERATION_MODULES.TASK,
        action: OPERATION_ACTIONS.UPDATE,
        bizType: 'TASK',
        bizId: editingTaskId.value,
        bizName: fs.name || selectedTaskDetail.value?.name,
        detail: `编辑任务：${fs.name || selectedTaskDetail.value?.name || editingTaskId.value}`,
        routeName: route.name,
      })
      message.success('任务更新成功')
    } else {
      const savedTask = await createTask(body)
      void recordOperationLog({
        module: OPERATION_MODULES.TASK,
        action: OPERATION_ACTIONS.CREATE,
        bizType: 'TASK',
        bizId: savedTask?.id,
        bizName: fs.name,
        detail: `新建任务：${fs.name}`,
        routeName: route.name,
      })
      message.success('任务创建成功')
    }
    taskEditOpen.value = false
    await loadTasks()
  } catch (error) {
    message.error(error.message || (editingTaskId.value ? '任务更新失败' : '任务创建失败'))
  } finally {
    taskSubmitLoading.value = false
  }
}

const handleDeleteTask = async record => {
  try {
    await deleteTask(record.id)
    void recordOperationLog({
      module: OPERATION_MODULES.TASK,
      action: OPERATION_ACTIONS.DELETE,
      bizType: 'TASK',
      bizId: record.id,
      bizName: record.name,
      detail: `删除任务：${record.name}`,
      routeName: route.name,
    })
    message.success('任务删除成功')
    await loadTasks()
  } catch (error) {
    message.error(error.message || '任务删除失败')
  }
}

const handleBackToTaskList = () => {
  personalMode.value = 'task-list'
  updateDetailQuery()
}

const handleBugDetail = record => {
  router.push({ name: 'BugDetail', params: { id: record.id } })
}

const handleCreateBug = () => {
  router.push({ name: 'BugCreate' })
}

const openQuickAssign = record => {
  if (!canAssignPersonalBug(record)) return
  assigningBug.value = record
  bugAssignForm.value = { assigneeId: record.assigneeId || undefined, reason: '' }
  bugAssignOpen.value = true
}

const handleQuickAssign = async () => {
  if (!bugAssignForm.value.assigneeId) {
    message.warning('请选择负责人')
    return
  }
  if (!assigningBug.value || !canAssignPersonalBug(assigningBug.value)) return

  bugAssignLoading.value = true
  try {
    await assignBug(assigningBug.value.id, {
      assigneeId: bugAssignForm.value.assigneeId,
      reason: bugAssignForm.value.reason,
    })
    message.success('指派成功')
    bugAssignOpen.value = false
    assigningBug.value = null
    bugAssignForm.value = { assigneeId: undefined, reason: '' }
    await loadMyBugs()
  } catch (error) {
    message.error(error.message || '指派失败')
  } finally {
    bugAssignLoading.value = false
  }
}

const handleClosePersonalBug = async record => {
  if (isClosedPersonalBug(record) || !isPersonalBugCreator(record)) return

  personalBugActionId.value = record.id + '_close'
  try {
    await closeBug(record.id)
    message.success('Bug已关闭')
    await loadMyBugs()
  } catch (error) {
    message.error(error.message || '关闭失败')
  } finally {
    personalBugActionId.value = ''
  }
}

const handleOpenBugEditModal = record => {
  bugEditingId.value = record.id
  bugForm.value = {
    projectId: record.projectId,
    title: record.title,
    priority: record.priorityCode || undefined,
    assigneeId: record.assigneeId || undefined,
    description: record.description || '',
    reproduceSteps: record.reproduceSteps || '',
  }
  bugEditOpen.value = true
}

const handleBugSubmit = async () => {
  const f = bugForm.value
  if (!f.title) { message.warning('请输入Bug标题'); return }
  bugSubmitLoading.value = true
  try {
    const body = {
      projectId: f.projectId || undefined,
      title: f.title,
      priority: f.priority || undefined,
      assigneeId: f.assigneeId || undefined,
      description: f.description || undefined,
      reproduceSteps: f.reproduceSteps || undefined,
    }
    await updateBug(bugEditingId.value, body)
    message.success('Bug更新成功')
    bugEditOpen.value = false
    await loadMyBugs()
  } catch (error) {
    message.error(error.message || 'Bug更新失败')
  } finally {
    bugSubmitLoading.value = false
  }
}

const handleDeleteBug = async record => {
  try {
    await deleteBug(record.id)
    message.success('Bug已删除')
    await loadMyBugs()
  } catch (error) {
    message.error(error.message || '删除失败')
  }
}

const handleVerifyBug = async record => {
  bugVerifyLoading.value = true
  try {
    await closeBug(record.id)
    message.success('验证通过，Bug已关闭')
    await loadMyBugs()
  } catch (error) {
    message.error(error.message || '操作失败')
  } finally {
    bugVerifyLoading.value = false
  }
}

const handleOpenFixModal = record => {
  bugFixBugId.value = record.id
  bugFixForm.value = { fixAnalysis: record.fixAnalysis || '', fixDetail: record.fixDetail || '' }
  bugFixOpen.value = true
}

const handleFixSubmit = async () => {
  bugFixLoading.value = true
  try {
    await fixBug(bugFixBugId.value, bugFixForm.value)
    message.success('修复详情已提交，Bug状态变为待验证')
    bugFixOpen.value = false
    await loadMyBugs()
  } catch (error) {
    message.error(error.message || '提交失败')
  } finally {
    bugFixLoading.value = false
  }
}

const handleBugSearch = () => {
  bugCurrentPage.value = 1
  loadMyBugs()
}

const handleBugReset = () => {
  bugFilter.value = { keyword: '', projectId: undefined, priority: undefined, status: undefined, creatorId: undefined, assigneeId: undefined }
  bugCurrentPage.value = 1
  loadMyBugs()
}

const handlePersonalBugPageChange = (page, pageSize) => {
  bugCurrentPage.value = page
  bugPageSize.value = pageSize
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

const normalizeDailyFile = file => {
  const name = file.name || file.fileName || file.originalName || file.url || '未命名附件'
  return {
    id: file.id || file.fileId || name,
    name,
    type: getDailyUploadType(name),
    icon: getDailyUploadIcon(name),
    size: file.sizeText || file.fileSizeText || formatFileSize(file.size || file.fileSize),
    time: file.uploadTime || file.createdAt || file.updatedAt || '-',
    user: file.uploaderName || file.createdByName || file.user || '-',
    url: file.url || file.fileUrl || file.downloadUrl,
  }
}

const getDailyReportFiles = report => report?.files || report?.attachments || report?.documents || report?.fileList || []

const dailyFiles = computed(() => getDailyReportFiles(currentDailyReport.value).map(normalizeDailyFile))

const formatFileSize = size => {
  if (!size) return '0 KB'
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const disabledDailyDate = date => {
  const today = dayjs().startOf('day')
  const yesterday = today.subtract(1, 'day')
  return date.isBefore(yesterday) || date.isAfter(today)
}

const openDailyModal = () => {
  const today = dayjs().startOf('day')
  const yesterday = today.subtract(1, 'day')
  const selected = selectedDailyDate.value?.startOf('day')
  const defaultDate = selected && (selected.isSame(today) || selected.isSame(yesterday)) ? selected : today
  dailyForm.value = {
    reportDate: defaultDate,
    content: '',
  }
  dailyEditOpen.value = true
}

const loadDailyReports = async () => {
  if (!isPersonalDaily.value) return

  dailyLoading.value = true
  dailyError.value = ''

  try {
    const result = await fetchDailyReports({
      pageNo: 1,
      pageSize: 200,
      dateFrom: selectedDailyDateText.value,
      dateTo: selectedDailyDateText.value,
    })
    const records = Array.isArray(result?.records) ? result.records : Array.isArray(result) ? result : []
    dailyReports.value = records
    dailyHasRecord.value = records.length > 0
  } catch (error) {
    dailyReports.value = []
    dailyHasRecord.value = false
    dailyError.value = error.message || '日报加载失败'
  } finally {
    dailyLoading.value = false
  }
}

const handleCreateDailyReport = async () => {
  if (dailySubmitLoading.value) return

  const content = dailyForm.value.content.trim()
  if (!content) {
    message.warning('请输入工作内容')
    return
  }

  dailySubmitLoading.value = true
  try {
    await createDailyReport({
      reportDate: dailyForm.value.reportDate.format('YYYY-MM-DD'),
      content,
    })
    dailyEditOpen.value = false
    selectedDailyDate.value = dailyForm.value.reportDate
    await loadDailyReports()
    message.success('日报新建成功')
  } catch (error) {
    message.error(error.message || '日报新建失败')
  } finally {
    dailySubmitLoading.value = false
  }
}

watch(
  () => [route.name, selectedDailyDateText.value],
  loadDailyReports,
  { immediate: true },
)

watch(statsPeriod, () => {
  if (isPersonalStatistics.value) loadMyStatistics()
})

const selectOptions = [
  { label: '全部', value: '全部' },
  { label: '张三', value: '张三' },
  { label: '李四', value: '李四' },
]
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
  { title: '操作', dataIndex: 'operation', fixed: 'right', width: 100 },
]

const taskModuleColumns = [
  { title: '序号', dataIndex: 'index', width: 70 },
  { title: '任务名称', dataIndex: 'name', width: 190 },
  { title: '所属项目', dataIndex: 'project', width: 210 },
  { title: '角色', dataIndex: 'role', width: 90 },
  { title: '标签', dataIndex: 'tag', width: 100 },
  { title: '负责人', dataIndex: 'owner', width: 100 },
  { title: '优先级', dataIndex: 'priority', width: 90 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '计划开始日期', dataIndex: 'planStart', width: 130 },
  { title: '计划结束日期', dataIndex: 'planEnd', width: 130 },
  { title: '实际开始日期', dataIndex: 'actualStart', width: 130 },
  { title: '实际完成日期', dataIndex: 'actualEnd', width: 130 },
  { title: '创建时间', dataIndex: 'createdAt', width: 170 },
  { title: '操作', dataIndex: 'operation', fixed: 'right', width: 100 },
]
const taskTableColumns = computed(() => isTaskModule.value ? taskModuleColumns : personalTaskColumns)

const personalBugColumns = [
  { title: '编号', dataIndex: 'code', width: 80 },
  { title: 'Bug标题', dataIndex: 'title', width: 240 },
  { title: '所属项目', dataIndex: 'project', width: 220 },
  { title: '严重等级', dataIndex: 'level', width: 110 },
  { title: '状态', dataIndex: 'status', width: 110 },
  { title: '创建人', dataIndex: 'creator', width: 100 },
  { title: '指定人', dataIndex: 'assignee', width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', width: 170 },
  { title: '操作', dataIndex: 'operation', fixed: 'right', width: 90 },
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

const getTaskFileType = file => {
  const fileName = file?.originalName || ''
  const extension = fileName.includes('.') ? fileName.split('.').pop() : ''
  return extension ? extension.toUpperCase() : (file?.contentType || '-')
}

const getCurrentUserName = () => {
  const profile = JSON.parse(window.localStorage.getItem('authProfile') || '{}')
  return profile.realName || profile.name || profile.username || profile.nickname || ''
}

const getTaskUploaderName = file => {
  if (file.uploaderName) return file.uploaderName
  const matchedUser = taskUsers.value.find(item => String(item.id) === String(file.uploaderId))
  if (matchedUser?.realName) return matchedUser.realName
  const profile = JSON.parse(window.localStorage.getItem('authProfile') || '{}')
  const profileId = profile.id ?? profile.userId
  if (file.uploaderId && String(file.uploaderId) === String(profileId)) return getCurrentUserName() || '-'
  return file.uploaderId ? `用户 ${file.uploaderId}` : '-'
}

const attachments = computed(() =>
  taskAttachmentRows.value.map(file => ({
    id: file.id,
    name: file.originalName || '-',
    type: getTaskFileType(file),
    size: formatFileSize(file.fileSize),
    version: file.versionNo || '-',
    user: getTaskUploaderName(file),
    time: formatDateTime(file.uploadedAt),
  }))
)

const relatedBugs = computed(() => taskRelatedBugRows.value)
const taskLogs = computed(() => Array.isArray(selectedTaskDetail.value?.logs) ? selectedTaskDetail.value.logs : [])

const STATS_PERIOD_OPTIONS = [
  { label: '今天', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '全年', value: 'year' },
]

const CHART_COLORS = ['#1677ff', '#69b1ff', '#27c27a', '#ff7a45', '#9254de', '#c8cfd9']
const STATUS_LABEL_MAP = { COMPLETED: '已完成', IN_PROGRESS: '进行中', DUE_SOON: '即将到期', OVERDUE: '已逾期', NOT_STARTED: '未开始', PAUSED: '已暂停', OVERDUE_COMPLETED: '逾期完成', OVERDUE_START: '启动逾期', CANCELLED: '已取消' }
const STATUS_COLOR_MAP = { COMPLETED: '#27c27a', IN_PROGRESS: '#1677ff', DUE_SOON: '#ff7a45', OVERDUE: '#ff4d4f', NOT_STARTED: '#c8cfd9', PAUSED: '#9254de', OVERDUE_COMPLETED: '#fa8c16', OVERDUE_START: '#d48806', CANCELLED: '#8c8c8c' }

const statCards = computed(() => {
  const s = statsData.value
  return [
    { label: '总任务', value: s ? String(s.myTaskTotal) + ' 个' : '-', className: 'blue', paths: ['M13 9h16l6 6v24H13z', 'M29 9v7h6', 'M18 22h12M18 29h12M18 36h8'] },
    { label: '已完成', value: s ? String(s.myTaskCompleted) + ' 个' : '-', className: 'cyan', paths: ['M24 7a17 17 0 1 0 0 34a17 17 0 0 0 0-34z', 'M16 24l5 5 11-12'] },
    { label: '逾期', value: s ? String(s.myTaskOverdue) + ' 个' : '-', className: 'red', paths: ['M24 7a17 17 0 1 0 0 34a17 17 0 0 0 0-34z', 'M24 14v12', 'M24 33h.01'] },
    { label: '我的 Bug', value: s ? String(s.myBugTotal) + ' 个' : '-', className: 'orange', paths: ['M17 19h14v13a7 7 0 0 1-14 0z', 'M20 19l-4-5M28 19l4-5', 'M14 25H9M39 25h-5M14 32H9M39 32h-5', 'M21 27h.01M27 27h.01'] },
    { label: '未关闭 Bug', value: s ? String(s.myBugOpen) + ' 个' : '-', className: 'purple', paths: ['M17 19h14v13a7 7 0 0 1-14 0z', 'M20 19l-4-5M28 19l4-5', 'M14 25H9M39 25h-5M14 32H9M39 32h-5', 'M24 24v8M24 36h.01'] },
  ]
})

const projectLegendItems = computed(() => {
  const dist = statsData.value?.projectDistribution || {}
  const total = Object.values(dist).reduce((s, v) => s + Number(v), 0)
  return Object.entries(dist).map(([name, value], i) => ({
    name,
    color: CHART_COLORS[i % CHART_COLORS.length],
    pct: total ? Math.round(Number(value) / total * 100) + '%' : '0%',
  }))
})

const statusLegendItems = computed(() => {
  const dist = statsData.value?.taskStatusDistribution || {}
  const total = Object.values(dist).reduce((s, v) => s + Number(v), 0)
  return Object.entries(dist).map(([code, value]) => ({
    name: STATUS_LABEL_MAP[code] || code,
    color: STATUS_COLOR_MAP[code] || '#c8cfd9',
    pct: total ? Math.round(Number(value) / total * 100) + '%' : '0%',
  }))
})

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

.module-view--fixed-list {
  height: 100%;
  min-height: 0;
  overflow: clip;
}

.personal-page,
.module-fallback {
  width: 100%;
  min-width: 0;
  margin: 0 auto;
}

.personal-page {
  width: min(1600px, 100%);
  margin: 0 auto;
  scrollbar-color: #b8b8b8 transparent;
  scrollbar-width: thin;
}

.task-list-page,
.personal-bug-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: clip;
}

.task-list-page .filter-panel,
.personal-bug-page .filter-panel { flex: none; }

.statistics-page {

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
  border-radius: 8px;
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

.prototype-filter .task-end-date-filter :deep(.ant-form-item-label) {
  flex: 0 0 112px !important;
  width: 112px !important;
  min-width: 112px;
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

.prototype-filter.bug-filter {
  grid-template-columns: minmax(180px, 1.2fr) minmax(180px, 1fr) repeat(3, minmax(140px, 0.8fr)) max-content !important;
  column-gap: 28px !important;
  row-gap: 0 !important;
}

.prototype-filter.bug-filter .filter-buttons {
  grid-column: auto;
}

.list-card {
  min-height: 420px;
}

.task-list-card,
.bug-list-card {
  flex: 1;
  min-height: 0;
}

.task-list-card :deep(.ant-card-body),
.bug-list-card :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 18px 18px 10px;
  overflow: hidden;
}

.task-list-card .list-toolbar,
.bug-list-card .list-toolbar {
  flex: none;
}

.personal-bug-list-view,
.personal-bug-table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.personal-bug-table :deep(.ant-spin-nested-loading) {
  flex: 1;
  min-height: 0;
}

.personal-bug-table :deep(.ant-spin-container),
.personal-bug-table :deep(.ant-table),
.personal-bug-table :deep(.ant-table-container) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.personal-bug-table :deep(.ant-table-header) {
  flex: none;
}

.personal-bug-table :deep(.ant-table-body) {
  flex: 1;
  min-height: 0;
  max-height: none !important;
  overflow-y: auto !important;
}

.personal-bug-pagination {
  flex: none;
  align-self: flex-end;
  height: 32px;
  margin: 10px 0 0;
}

.bug-operation-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
}

.bug-operation-button :deep(svg) {
  width: 15px;
  height: 15px;
}

.personal-bug-group-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.personal-bug-group-list {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.personal-bug-group-list :deep(.ant-table-thead > tr > th) {
  position: sticky;
  top: 0;
  z-index: 2;
}

.personal-bug-group + .personal-bug-group { margin-top: 24px; }

.personal-bug-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 14px;
  background: #fafafa;
  border-block: 1px solid #edf0f3;
}

.personal-bug-group__header button {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 0;
  font-weight: 600;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.bug-no {
  color: #1677ff;
  font-size: 12px;
  font-weight: 600;
  font-family: monospace;
}

.bug-title-text {
  display: block;
  width: 100%;
  overflow: hidden;
  color: #1677ff;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.task-list__display {
  display: flex;
  gap: 12px;
  align-items: center;
  color: #666;
}

.task-list__display :deep(.ant-select) {
  width: 130px;
}

.bug-list__display { display: flex; align-items: center; gap: 12px; color: #666; }
.bug-list__display :deep(.ant-select) { width: 130px; }

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

.task-list-card .prototype-table-scroll {
  flex: 1;
  min-height: 0;
}

.task-group-list {
  flex: 1;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.task-group + .task-group {
  margin-top: 8px;
}

.task-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 14px;
  font-weight: 600;
  background: #fafafa;
  border-top: 1px solid #edf0f3;
  border-bottom: 1px solid #edf0f3;
}

.task-group__header button {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 0;
  font-weight: 600;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.task-group .prototype-table-scroll {
  min-height: auto;
  overflow: visible;
}

.prototype-table {
  width: 100%;
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
  position: sticky;
  top: 0;
  z-index: 2;
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

.icon-link.danger {
  color: #ff4d4f;
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
  flex: none;
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  height: 32px;
  margin-top: 10px;
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

.native-info-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  color: #111827;
}

.native-info-table th,
.native-info-table td {
  height: 34px;
  padding: 8px 11px;
  font-size: 14px;
  text-align: left;
  border: 1px solid #edf0f3;
  word-break: break-word;
}

.native-info-table th {
  width: 10%;
  color: #111827;
  font-weight: 500;
  background: #fafafa;
}

.native-info-table td {
  width: 20%;
  background: #fff;
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
  border-radius: 8px;
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
  border-radius: 8px;
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
  border-radius: 50%;
}

.stat-icon__svg {
  width: 30px;
  height: 30px;
}

.stat-icon__svg path {
  fill: none;
  stroke: currentcolor;
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.stat-icon.blue { background: linear-gradient(135deg, #5aa7ff, #1677ff); }
.stat-icon.green { background: linear-gradient(135deg, #5ee6a8, #27c27a); }
.stat-icon.cyan { background: linear-gradient(135deg, #66d9ff, #1890ff); }
.stat-icon.red { background: linear-gradient(135deg, #ff8f85, #ff4d4f); }
.stat-icon.orange { background: linear-gradient(135deg, #ffbd66, #fa8c16); }
.stat-icon.purple { background: linear-gradient(135deg, #b68cff, #9254de); }

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
  border-radius: 8px;
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
  justify-items: center; /* 水平居中 */
  align-items: center;   /* 垂直居中 */
  gap: 8px;
  width: min(100%, 168px);
  margin: 12px auto 0;
  padding: 0;
  color: #5f6673;
  list-style: none;

  .muted {
   grid-template-columns: 1fr 0;

  }
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
  border-radius: 8px;
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
  border-radius: 8px;
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
.related-bugs :deep(.ant-card-body::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:global(.app-content__body::-webkit-scrollbar-track),
.personal-page::-webkit-scrollbar-track,
.prototype-table-scroll::-webkit-scrollbar-track,
.log-card :deep(.ant-card-body::-webkit-scrollbar-track),
.related-bugs :deep(.ant-card-body::-webkit-scrollbar-track) {
  background: transparent;
}

:global(.app-content__body::-webkit-scrollbar-thumb),
.personal-page::-webkit-scrollbar-thumb,
.prototype-table-scroll::-webkit-scrollbar-thumb,
.log-card :deep(.ant-card-body::-webkit-scrollbar-thumb),
.related-bugs :deep(.ant-card-body::-webkit-scrollbar-thumb) {
  background: #b8b8b8;
  border: 2px solid transparent;
  border-radius: 999px;
  background-clip: content-box;
}

:global(.app-content__body::-webkit-scrollbar-thumb:hover),
.personal-page::-webkit-scrollbar-thumb:hover,
.prototype-table-scroll::-webkit-scrollbar-thumb:hover,
.log-card :deep(.ant-card-body::-webkit-scrollbar-thumb:hover),
.related-bugs :deep(.ant-card-body::-webkit-scrollbar-thumb:hover) {
  background: #8f8f8f;
  border: 2px solid transparent;
  background-clip: content-box;
}
</style>
