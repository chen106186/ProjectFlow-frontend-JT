<template>
  <div :class="['bug-page', { 'bug-page--list': viewMode === 'list' }]">
    <template v-if="viewMode === 'list'">
      <a-card class="bug-filter app-filter-card" :bordered="false">
        <a-form :model="queryParams" class="bug-filter__form app-filter-form" layout="inline">
          <a-form-item label="搜索"><a-input v-model:value="queryParams.keyword" allow-clear placeholder="请输入关键字"  /></a-form-item>
          <a-form-item label="所属项目" class="bug-filter__field--project"><a-select v-model:value="queryParams.projectId" :options="projectOptions" placeholder="全部" allow-clear show-search option-filter-prop="label" @change="handleSearch" /></a-form-item>
          <a-form-item label="严重等级"><a-select v-model:value="queryParams.priority" :options="priorityFilterOptions" placeholder="全部" allow-clear show-search option-filter-prop="label" @change="handleSearch" /></a-form-item>
          <a-form-item label="状态"><a-select v-model:value="queryParams.status" :options="statusFilterOptions" placeholder="全部" allow-clear show-search option-filter-prop="label" @change="handleSearch" /></a-form-item>
          <a-form-item label="创建人" class="bug-filter__field--creator"><a-select v-model:value="queryParams.creatorId" :options="userOptions" placeholder="全部" allow-clear show-search option-filter-prop="label" @change="handleSearch" /></a-form-item>
          <a-form-item label="指定人" class="bug-filter__field--assignee"><a-select v-model:value="queryParams.assigneeId" :options="userOptions" placeholder="全部" allow-clear show-search option-filter-prop="label" @change="handleSearch" /></a-form-item>
          <a-form-item label="创建时间" class="bug-filter__field--date"><a-range-picker v-model:value="queryParams.createdAtRange" value-format="YYYY-MM-DD" allow-clear @change="handleSearch" /></a-form-item>
          <a-form-item class="bug-filter__actions app-filter-actions">
            <a-space><a-button type="primary" @click="handleSearch">查询</a-button><a-button @click="handleReset">重置</a-button></a-space>
          </a-form-item>
        </a-form>
      </a-card>

      <a-card class="bug-list" :bordered="false">
        <div class="bug-list__toolbar">
          <a-space>
            <a-button type="primary" @click="handleCreate"><PlusOutlined />新增Bug</a-button>
            <a-button :loading="exporting" @click="exportRows('bugs', buildBugFilters(queryParams), 'bugs.xlsx')">导出 Bug</a-button>
          </a-space>
          <div class="bug-list__group">
            <template v-if="displayMode === 'group'">
              <span>分组条件：</span>
              <a-select v-model:value="groupField" :options="groupOptions" />
            </template>
            <a-radio-group v-model:value="displayMode" button-style="solid">
              <a-radio-button value="list">列表</a-radio-button>
              <a-radio-button value="group">分组</a-radio-button>
            </a-radio-group>
          </div>
        </div>

        <template v-if="displayMode === 'list'">
          <a-table
            class="bug-list__table"
            row-key="id"
            :columns="columns"
            :data-source="bugs"
            :pagination="false"
            :loading="listLoading"
            :scroll="{ x: 900, y: '100%' }"
            size="middle"
            table-layout="fixed"
          >
            <template #bodyCell="{ column, record, text, index }">
              <template v-if="column.dataIndex === 'index'">{{ (current - 1) * pageSize + index + 1 }}</template>
              <template v-else-if="column.dataIndex === 'bugNo'"><span class="bug-no">{{ text ? '#' + String(text).padStart(3, '0') : '-' }}</span></template>
              <template v-else-if="column.dataIndex === 'title'">
                <a-tooltip :title="text">
                  <span class="bug-title-text" @click="handleDetail(record)">{{ text }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'priority'">
                <a-tag :color="priorityColors[text]">{{ priorityLabels[text] || text }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'status'">
                <a-tag :color="statusColors[text]">{{ statusLabels[text] || text }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'solution'">
                <a-tag v-if="record.solution" :color="solutionTagColor(record.solution)">{{ resolveSolutionLabels[record.solution] || record.solution }}</a-tag>
                <span v-else>-</span>
              </template>
              <template v-else-if="column.dataIndex === 'createdAt'">{{ formatDateTime(text) }}</template>
              <template v-else-if="column.dataIndex === 'resolvedDate'">{{ text || '-' }}</template>
              <template v-else-if="column.dataIndex === 'operation'">
                <a-space>
                  <a-tooltip title="详情">
                    <a-button type="link" size="small" class="bug-operation-button" aria-label="详情" @click="handleDetail(record)"><EyeOutlined /></a-button>
                  </a-tooltip>
                  <a-tooltip v-if="!isClosedBug(record) && isBugCreator(record)" title="编辑">
                    <a-button type="link" size="small" class="bug-operation-button" aria-label="编辑" @click="handleEdit(record)"><EditOutlined /></a-button>
                  </a-tooltip>
                  <a-tooltip v-if="!isClosedBug(record) && isBugCreator(record)" title="关闭">
                    <a-button type="link" size="small" class="bug-operation-button" aria-label="关闭" danger @click="handleCloseBugFromList(record)"><CloseCircleOutlined /></a-button>
                  </a-tooltip>
                  <a-tooltip v-else-if="isBugCreator(record)" title="重新打开">
                    <a-button type="link" size="small" class="bug-operation-button" aria-label="重新打开" @click="handleReopenBug(record)"><RedoOutlined /></a-button>
                  </a-tooltip>
                </a-space>
              </template>
            </template>
          </a-table>
        </template>

        <template v-else>
          <div class="bug-group-list">
            <div v-for="(group, key) in groupedBugs" :key="key" class="bug-group">
              <header class="bug-group__header">
                <button type="button" @click="handleToggleGroup(key)">
                  <RightOutlined v-if="isGroupCollapsed(key)" />
                  <DownOutlined v-else />
                  {{ key || '未分组' }}
                </button>
                <a-tag>{{ group.length }}</a-tag>
              </header>
              <a-table
                v-if="!isGroupCollapsed(key)"
                row-key="id"
                :columns="columns.filter(c => c.dataIndex !== 'index')"
                :data-source="group"
                :pagination="false"
                :scroll="{ x: 900 }"
                size="middle"
                table-layout="fixed"
              >
                <template #bodyCell="{ column, record, text }">
                  <template v-if="column.dataIndex === 'bugNo'"><span class="bug-no">{{ text ? '#' + String(text).padStart(3, '0') : '-' }}</span></template>
                  <template v-else-if="column.dataIndex === 'title'">
                    <a-tooltip :title="text">
                      <span class="bug-title-text" @click="handleDetail(record)">{{ text }}</span>
                    </a-tooltip>
                  </template>
                  <template v-else-if="column.dataIndex === 'priority'">
                    <a-tag :color="priorityColors[text]">{{ priorityLabels[text] || text }}</a-tag>
                  </template>
                  <template v-else-if="column.dataIndex === 'status'">
                    <a-tag :color="statusColors[text]">{{ statusLabels[text] || text }}</a-tag>
                  </template>
                  <template v-else-if="column.dataIndex === 'solution'">
                    <a-tag v-if="record.solution" :color="solutionTagColor(record.solution)">{{ resolveSolutionLabels[record.solution] || record.solution }}</a-tag>
                    <span v-else>-</span>
                  </template>
                  <template v-else-if="column.dataIndex === 'createdAt'">{{ formatDateTime(text) }}</template>
                  <template v-else-if="column.dataIndex === 'resolvedDate'">{{ text || '-' }}</template>
                  <template v-else-if="column.dataIndex === 'operation'">
                    <a-space>
                      <a-tooltip title="详情">
                        <a-button type="link" size="small" class="bug-operation-button" aria-label="详情" @click="handleDetail(record)"><EyeOutlined /></a-button>
                      </a-tooltip>
                      <a-tooltip v-if="!isClosedBug(record) && isBugCreator(record)" title="编辑">
                        <a-button type="link" size="small" class="bug-operation-button" aria-label="编辑" @click="handleEdit(record)"><EditOutlined /></a-button>
                      </a-tooltip>
                      <a-tooltip v-if="!isClosedBug(record) && isBugCreator(record)" title="关闭">
                        <a-button type="link" size="small" class="bug-operation-button" aria-label="关闭" danger @click="handleCloseBugFromList(record)"><CloseCircleOutlined /></a-button>
                      </a-tooltip>
                      <a-tooltip v-else-if="isBugCreator(record)" title="重新打开">
                        <a-button type="link" size="small" class="bug-operation-button" aria-label="重新打开" @click="handleReopenBug(record)"><RedoOutlined /></a-button>
                      </a-tooltip>
                    </a-space>
                  </template>
                  <template v-else>{{ text || '-' }}</template>
                </template>
              </a-table>
            </div>
            <a-empty v-if="!bugs.length" />
          </div>
        </template>
        <a-pagination
          class="bug-list__pagination"
          :current="current"
          :page-size="pageSize"
          :total="total"
          :page-size-options="['10', '50', '100']"
          :show-total="t => `共 ${t} 条`"
          show-size-changer
          @change="handleGroupPageChange"
        />
      </a-card>
    </template>

    <a-card v-else-if="viewMode === 'create' || viewMode === 'edit'" class="bug-form-card" :bordered="false">
      <div class="panel-heading">
        <h2>{{ viewMode === 'create' ? '新增Bug' : '编辑Bug' }}</h2>
      </div>
      <a-form ref="formRef" :model="formState" :rules="formRules" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
        <div class="bug-form-fields">
          <a-form-item label="Bug标题" name="title"><a-input v-model:value="formState.title" placeholder="请输入Bug标题" /></a-form-item>
          <a-form-item label="所属项目" name="projectId"><a-select v-model:value="formState.projectId" :options="projectOptions" placeholder="请选择所属项目" @change="handleProjectChange" /></a-form-item>
          <a-form-item label="关联任务">
            <a-select v-model:value="formState.relatedTaskIds" mode="multiple" :options="relatedTaskOptions" placeholder="请选择关联任务（可多选，非必填）" allow-clear show-search option-filter-prop="label" :loading="relatedTaskLoading" :disabled="!formState.projectId" />
          </a-form-item>
          <a-form-item label="指派给" name="assigneeId"><a-select v-model:value="formState.assigneeId" :options="bugFormUserOptions" placeholder="请选择负责人" show-search option-filter-prop="label" /></a-form-item>
          <a-form-item label="严重等级" name="priority"><a-select v-model:value="formState.priority" :options="priorityOptions" /></a-form-item>
          <a-form-item label="问题描述" name="description">
            <a-textarea v-model:value="formState.description" :rows="8" placeholder="请输入问题描述" />
          </a-form-item>
          <a-form-item label="重现步骤">
            <div class="bug-rich-editor">
              <TinymceEditor ref="editorRef" v-model="formState.reproduceSteps" :height="310" placeholder="请输入重现步骤" />
            </div>
          </a-form-item>
          <a-form-item label="操作录屏">
            <div class="recording-picker">
              <a-upload accept=".mp4,.webm,.mov" :before-upload="handleRecordingBeforeUpload" :show-upload-list="false">
                <a-button>选择录屏</a-button>
              </a-upload>
              <span v-if="recordingFile" class="recording-picker__selected">{{ recordingFile.name }} <a-button type="link" size="small" @click="clearRecordingFile">移除</a-button></span>
              <small>支持 MP4、WebM、MOV，单个文件不超过 100MB；保存 Bug 后自动上传。</small>
              <div v-if="editingId && recordingFiles.length" class="recording-existing">已上传 {{ recordingFiles.length }} 个录屏，可在详情页查看。</div>
            </div>
          </a-form-item>
        </div>
      </a-form>
      <div class="form-actions">
        <a-button type="primary" :loading="submitLoading" @click="handleSubmit"><CheckOutlined />确认</a-button>
        <a-button @click="handleBack"><CloseOutlined />取消</a-button>
      </div>
    </a-card>

    <template v-else>
      <div class="detail-page">
        <a-spin :spinning="detailLoading">
          <!-- Header -->
          <div class="detail-header">
            <a-button class="detail-back" @click="handleBack"><ArrowLeftOutlined />返回</a-button>
            <template v-if="selectedBug">
              <span class="detail-bug-no">{{ selectedBug.bugNo ? '#' + String(selectedBug.bugNo).padStart(3, '0') : '' }}</span>
              <h1 class="detail-title">{{ selectedBug.title }}</h1>
            </template>
          </div>

          <div v-if="selectedBug" class="detail-body">
            <!-- Left: main content -->
            <div class="detail-main">
              <a-card class="detail-card bug-detail-overview" :bordered="false">
                <template #title><span class="detail-card__title">Bug详情</span></template>
                <section class="detail-section">
                  <h3>基本信息</h3>
                <table class="native-info-table">
                  <tbody>
                    <tr>
                      <th>所属项目</th>
                      <td>{{ selectedBug.projectName || '-' }}</td>
                      <th>负责人</th>
                      <td>{{ selectedBug.assigneeName || '-' }}</td>
                    </tr>
                    <tr>
                      <th>创建人</th>
                      <td>{{ selectedBug.creatorName || '-' }}</td>
                      <th>创建时间</th>
                      <td>{{ formatDateTime(selectedBug.createdAt) }}</td>
                    </tr>
                    <tr>
                      <th>优先级</th>
                      <td><a-tag :color="priorityColors[selectedBug.priority]">{{ priorityLabels[selectedBug.priority] || selectedBug.priority || '-' }}</a-tag></td>
                      <th>状态</th>
                      <td><a-tag :color="statusColors[selectedBug.status]">{{ statusLabels[selectedBug.status] || selectedBug.status || '-' }}</a-tag></td>
                    </tr>
                    <tr>
                      <th>关联任务</th>
                      <td colspan="3">
                        <a-space v-if="selectedBug.relatedTasks?.length" wrap>
                          <a-tag v-for="task in selectedBug.relatedTasks" :key="task.id" color="blue">
                            {{ task.name || `任务 ${task.id}` }}
                          </a-tag>
                        </a-space>
                        <span v-else>-</span>
                      </td>
                    </tr>
                    <tr v-if="selectedBug.closedAt">
                      <th>关闭时间</th>
                      <td>{{ formatDateTime(selectedBug.closedAt) }}</td>
                      <th>Bug编号</th>
                      <td>{{ selectedBug.bugNo ? '#' + String(selectedBug.bugNo).padStart(3, '0') : '-' }}</td>
                    </tr>
                  </tbody>
                </table>
                </section>
                <section class="detail-section">
                  <h3>问题描述</h3>
                <div class="detail-rich" v-html="bugDescriptionHtml"></div>
                </section>
                <section class="detail-section">
                  <h3>重现步骤</h3>
                <div class="detail-rich detail-rich--reproduce" v-html="bugReproduceStepsHtml" @click="handleRichImageClick"></div>
                </section>
                <section class="detail-section">
                  <h3>操作录屏</h3>
                  <a-spin :spinning="recordingsLoading">
                    <div v-if="recordingFiles.length" class="recording-list">
                      <div v-for="file in recordingFiles" :key="file.id" class="recording-item">
                        <span class="recording-item__name" :title="file.originalName">{{ file.originalName }}</span>
                        <a-space>
                          <a-button v-if="isPlayableRecording(file)" type="link" size="small" @click="handlePreviewRecording(file)">播放</a-button>
                          <a-button type="link" size="small" @click="handleDownloadRecording(file)">下载</a-button>
                          <a-popconfirm v-if="canDeleteRecording(file)" title="删除这段录屏？" @confirm="handleDeleteRecording(file)">
                            <a-button type="link" size="small" danger>删除</a-button>
                          </a-popconfirm>
                        </a-space>
                      </div>
                    </div>
                    <a-empty v-else-if="!recordingsLoading" description="暂无录屏" />
                  </a-spin>
                  <div v-if="!isClosedBug(selectedBug)" class="recording-detail-upload">
                    <a-upload accept=".mp4,.webm,.mov" :before-upload="handleRecordingBeforeUpload" :show-upload-list="false"><a-button>选择录屏</a-button></a-upload>
                    <span v-if="recordingFile">{{ recordingFile.name }} <a-button type="link" size="small" @click="clearRecordingFile">移除</a-button></span>
                    <a-button v-if="recordingFile" type="primary" :loading="recordingUploading" @click="handleUploadRecording">上传录屏</a-button>
                  </div>
                </section>
                <section v-if="isResolvedBug(selectedBug)" class="detail-section">
                  <h3>解决方案</h3>
                  <table class="native-info-table">
                    <tbody>
                      <tr>
                        <th>方案</th>
                        <td>{{ resolveSolutionLabels[selectedBug.solution] || selectedBug.solution || '-' }}</td>
                        <th>解决日期</th>
                        <td>{{ selectedBug.resolvedDate || '-' }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-if="bugResolveRemark" class="detail-rich resolve-remark" v-html="bugResolveRemarkHtml" @click="handleRichImageClick"></div>
                </section>
              </a-card>

              <!-- 修复记录 -->
              <a-card v-if="selectedBug.fixAnalysis || selectedBug.fixDetail" class="detail-card" :bordered="false">
                <template #title><span class="detail-card__title">修复记录</span></template>
                <div v-if="selectedBug.fixAnalysis" class="fix-block">
                  <div class="fix-label">问题分析</div>
                  <p class="detail-text">{{ selectedBug.fixAnalysis }}</p>
                </div>
                <div v-if="selectedBug.fixDetail" class="fix-block">
                  <div class="fix-label">修复细节</div>
                  <p class="detail-text">{{ selectedBug.fixDetail }}</p>
                </div>
              </a-card>

              <!-- 评论 -->
              <a-card class="detail-card" :bordered="false">
                <template #title><span class="detail-card__title">评论</span></template>
                <a-spin :spinning="commentsLoading">
                  <div class="comment-list">
                    <div v-for="comment in comments" :key="comment.id" class="comment-item">
                      <div class="comment-item__meta">
                        <b>{{ comment.authorName || ('用户' + comment.userId) }}</b>
                        <small>{{ formatDateTime(comment.createdAt) }}</small>
                      </div>
                      <div class="comment-item__content" v-html="normalizeRichHtml(comment.content)" @click="handleRichImageClick"></div>
                    </div>
                    <a-empty v-if="!comments.length && !commentsLoading" description="暂无评论" class="comment-empty" />
                  </div>
                </a-spin>
                <template v-if="!isClosedBug(selectedBug)">
                  <div class="comment-rich-editor">
                    <TinymceEditor :key="commentEditorKey" ref="commentEditorRef" v-model="commentContent" :height="200" placeholder="请输入评论内容" />
                  </div>
                  <div class="send-row"><a-button type="primary" :loading="commentLoading" @click="handleSendComment">发送</a-button></div>
                </template>
              </a-card>
            </div>

            <!-- Right: sidebar (always visible) -->
            <div class="detail-sidebar">
              <a-card class="detail-card lifecycle-card" :bordered="false">
                <template #title><span class="detail-card__title">Bug的一生</span></template>
                <template v-if="isClosedBug(selectedBug)" #extra>
                  <a-tag color="green" class="lifecycle-status-tag">已关闭</a-tag>
                </template>
                <div v-if="isClosedBug(selectedBug)" class="closed-summary">
                  <CheckCircleFilled class="closed-summary__icon" />
                  <div>
                    <strong>流程已结束</strong>
                    <p>该 Bug 已关闭，不可再进行操作。</p>
                  </div>
                </div>
                <a-empty v-if="!selectedBug.logs?.length" description="暂无流转记录" style="padding: 1rem 0" />
                <a-timeline v-else class="lifecycle-timeline">
                  <a-timeline-item v-for="log in selectedBug.logs" :key="log.id">
                    <div class="timeline-action">{{ log.operatorName }} · {{ operationLabel(log.operationType) }}</div>
                    <div v-if="log.content" class="timeline-content">{{ timelineContent(log.content) }}</div>
                    <div class="timeline-time">{{ formatDateTime(log.createdAt) }}</div>
                  </a-timeline-item>
                </a-timeline>
              </a-card>
            </div>
          </div>
          <div v-if="selectedBug && (isClosedBug(selectedBug) ? isBugCreator(selectedBug) : (!isResolvedBug(selectedBug) || isBugCreator(selectedBug)))" class="detail-floating-actions">
            <a-button v-if="isClosedBug(selectedBug)" type="primary" @click="handleReopenBug(selectedBug)"><RedoOutlined />重新打开</a-button>
            <template v-else>
              <template v-if="!isResolvedBug(selectedBug)">
                <a-button v-if="isBugCreator(selectedBug)" type="primary" @click="handleEditFromDetail">编辑 Bug</a-button>
                <a-button @click="assignVisible = true">重新指派</a-button>
                <a-button type="primary" class="resolve-button" @click="openResolveModal">解决</a-button>
              </template>
              <a-button v-if="isBugCreator(selectedBug)" danger :loading="closeLoading" @click="handleCloseBug">关闭 Bug</a-button>
            </template>
          </div>
        </a-spin>
      </div>
    </template>

    <a-modal v-model:open="assignVisible" title="更换Bug负责人" :confirm-loading="assignLoading" ok-text="确认" cancel-text="取消" @ok="handleAssign">
      <a-form :model="assignState" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <a-form-item label="指派给"><a-select v-model:value="assignState.assigneeId" :options="userOptions" placeholder="请选择负责人" show-search option-filter-prop="label" /></a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="assignState.reason" :rows="5" placeholder="请输入备注" /></a-form-item>
      </a-form>
    </a-modal>
    <a-modal v-model:open="resolveVisible" title="解决Bug" :width="760" :footer="null" destroy-on-close @after-close="resetResolveForm">
      <a-form ref="resolveFormRef" :model="resolveForm" :rules="resolveRules" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }" class="resolve-form">
        <a-form-item label="解决方案" name="solution">
          <a-select v-model:value="resolveForm.solution" :options="resolveSolutionOptions" placeholder="请选择解决方案" />
        </a-form-item>
        <a-form-item label="解决日期" name="resolvedDate">
          <a-date-picker v-model:value="resolveForm.resolvedDate" value-format="YYYY-MM-DD" style="width:100%" />
        </a-form-item>
        <a-form-item label="指派给">
          <a-select v-model:value="resolveForm.assigneeId" :options="userOptions" placeholder="选择指派人（可选）" allow-clear show-search option-filter-prop="label" />
        </a-form-item>
        <a-form-item label="备注">
          <div class="resolve-rich-editor">
            <TinymceEditor :key="resolveEditorKey" ref="resolveEditorRef" v-model="resolveForm.remark" :height="280" placeholder="请输入备注信息..." />
          </div>
        </a-form-item>
      </a-form>
      <div class="resolve-actions">
        <a-button type="primary" :loading="resolveLoading" @click="handleResolveConfirm">确定</a-button>
        <a-button @click="resolveVisible = false">取消</a-button>
      </div>
    </a-modal>
    <a-image
      v-if="previewImage"
      :src="previewImage"
      :style="{ display: 'none' }"
      :preview="{
        visible: previewVisible,
        onVisibleChange: handlePreviewVisibleChange,
      }"
    />
    <a-modal v-model:open="recordingPreviewVisible" :title="recordingPreviewName" :footer="null" :width="860" @after-close="clearRecordingPreview">
      <a-spin :spinning="recordingPreviewLoading">
        <video v-if="recordingPreviewUrl" :src="recordingPreviewUrl" controls playsinline class="recording-preview" />
      </a-spin>
    </a-modal>
  </div>
</template>

<script setup>
import { ArrowLeftOutlined, CheckCircleFilled, CheckOutlined, CloseCircleOutlined, CloseOutlined, DownOutlined, EditOutlined, EyeOutlined, PlusOutlined, RedoOutlined, RightOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getProjectBugs, getBugById, createBug, updateBug, closeBug, reopenBug, assignBug,
  addBugComment, listBugComments, getBugProjectOptions, getProjectTasks, resolveBug,
  getProjectFiles, uploadProjectFile, downloadProjectFile, deleteProjectFile,
} from '@/api/managementProject'
import TinymceEditor from '@/components/TinymceEditor.vue'
import { formatDateTime } from '@/utils/dateTime'
import { request } from '@/utils/request'
import { useExport } from '@/composables/useExport'
import { getAllUsers } from '@/api/system'
import { buildBugFilters } from '@/utils/exportFilters'

const route = useRoute()
const { exporting, exportRows } = useExport()
const router = useRouter()
const viewMode = computed(() => route.meta.bugView || 'list')

const statusLabels = { PENDING_FIX: '待修复', FIXING: '修复中', PENDING_VERIFY: '待验证', CLOSED: '已关闭' }
const statusColors = { PENDING_FIX: 'gold', FIXING: 'orange', PENDING_VERIFY: 'purple', CLOSED: 'green' }
const priorityLabels = { LOW: '轻微', MEDIUM: '一般', HIGH: '严重', URGENT: '致命' }
const priorityColors = { LOW: 'blue', MEDIUM: 'orange', HIGH: 'error', URGENT: 'red' }

const priorityOptions = [
  { label: '轻微', value: 'LOW' }, { label: '一般', value: 'MEDIUM' },
  { label: '严重', value: 'HIGH' }, { label: '致命', value: 'URGENT' },
]
const priorityFilterOptions = priorityOptions
const statusFilterOptions = [
  { label: '待修复', value: 'PENDING_FIX' },
  { label: '待验证', value: 'PENDING_VERIFY' }, { label: '已关闭', value: 'CLOSED' },
]
const groupOptions = [
  { label: '所属项目', value: 'projectName' },
  { label: '优先级', value: 'priority' },
  { label: '状态', value: 'status' },
  { label: '创建人', value: 'creatorName' },
  { label: '指定人', value: 'assigneeName' },
]

const projects = ref([])
const users = ref([])
const currentUserId = computed(() => {
  try { return JSON.parse(localStorage.getItem('userInfo') || '{}').userId || null } catch { return null }
})
const projectOptions = computed(() => projects.value.map(p => ({ label: p.name, value: p.id })))
const userOptions = computed(() => users.value.map(u => ({ label: u.realName, value: u.id })))
const bugFormUserOptions = computed(() => users.value.map(user => ({ label: user.realName, value: user.id })))

const bugs = ref([])
const total = ref(0)
const current = ref(1)
const pageSize = ref(10)
const listLoading = ref(false)
const displayMode = ref('list')
const groupField = ref('projectName')
const collapsedGroups = ref([])
const queryParams = reactive({ keyword: '', projectId: route.query.projectId ? Number(route.query.projectId) : undefined, priority: undefined, status: undefined, creatorId: undefined, assigneeId: undefined, createdAtRange: [] })

const columns = [
  { title: '编号', dataIndex: 'bugNo', width: 65 },
  { title: 'Bug标题', dataIndex: 'title', width: 260, ellipsis: true },
  { title: '所属项目', dataIndex: 'projectName', width: 100, ellipsis: true },
  { title: '严重等级', dataIndex: 'priority', width: 75 },
  { title: '状态', dataIndex: 'status', width: 75 },
  { title: '解决方案', dataIndex: 'solution', width: 95 },
  { title: '创建人', dataIndex: 'creatorName', width: 75, responsive: ['xxl'] },
  { title: '指定人', dataIndex: 'assigneeName', width: 75, responsive: ['xxl'] },
  { title: '创建时间', dataIndex: 'createdAt', width: 145 },
  { title: '解决日期', dataIndex: 'resolvedDate', width: 105, responsive: ['xxl'] },
  { title: '操作', dataIndex: 'operation', width: 80 },
]

const groupedBugs = computed(() => {
  const result = {}
  for (const bug of bugs.value) {
    let key = bug[groupField.value] || '未分组'
    if (groupField.value === 'priority') key = priorityLabels[key] || key
    if (groupField.value === 'status') key = statusLabels[key] || key
    if (!result[key]) result[key] = []
    result[key].push(bug)
  }
  return result
})

const isGroupCollapsed = value => collapsedGroups.value.includes(value)
const handleToggleGroup = value => {
  collapsedGroups.value = isGroupCollapsed(value)
    ? collapsedGroups.value.filter(item => item !== value)
    : [...collapsedGroups.value, value]
}

watch(groupField, () => { collapsedGroups.value = [] })

const isClosedBug = bug => {
  if (!bug) return false
  return bug.status === 'CLOSED' || bug.status === '已关闭' || bug.statusCode === 'CLOSED'
}

const isResolvedBug = bug => bug?.status === 'PENDING_VERIFY' || bug?.status === '待验证' || bug?.statusCode === 'PENDING_VERIFY'
const isBugCreator = bug => Boolean(currentUserId.value) && String(bug?.creatorId) === String(currentUserId.value)

const OPERATION_LABELS = {
  CREATE: '创建', UPDATE: '更新', DELETE: '删除',
  ASSIGN: '指派', FIX: '修复', CLOSE: '关闭', REOPEN: '重开',
  COMMENT: '评论', EXPORT: '导出', UPDATE_STATUS: '更新状态',
}
const operationLabel = type => OPERATION_LABELS[type] || type || '操作'
const timelineContent = content => {
  if (/<img\b|&lt;img\b/i.test(content)) return '🖼️'
  const text = String(content)
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text
}

const loadBugs = async () => {
  listLoading.value = true
  try {
    const res = await getProjectBugs({
      pageNo: current.value,
      pageSize: pageSize.value,
      ...buildBugFilters(queryParams),
    })
    bugs.value = res.records || []
    total.value = res.total || 0
  } catch (e) {
    message.error(e.message || '加载失败')
  } finally {
    listLoading.value = false
  }
}

const handleSearch = () => { current.value = 1; loadBugs() }
const handleReset = () => {
  Object.assign(queryParams, { keyword: '', projectId: undefined, priority: undefined, status: undefined, creatorId: undefined, assigneeId: undefined, createdAtRange: [] })
  current.value = 1
  loadBugs()
}
const handleGroupPageChange = (page, size) => { current.value = page; pageSize.value = size; loadBugs() }

const selectedBug = ref(null)
const detailLoading = ref(false)
const comments = ref([])
const commentsLoading = ref(false)
const commentContent = ref('')
const commentLoading = ref(false)
const commentEditorRef = shallowRef()
const commentEditorKey = ref(0)
const previewImage = ref('')
const previewVisible = ref(false)
const richImageObjectUrls = new Set()
const ossHostPattern = /^https:\/\/company-project-oss\.oss-cn-shanghai\.aliyuncs\.com\/(.+)$/i
const inlineImagePattern = /^(?:https?:\/\/[^/]+)?\/api\/files\/[^/?#]+\/inline(?:[?#].*)?$/i
const normalizeRichHtml = html => {
  if (!html) return '<p>-</p>'
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return html

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  doc.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src')
    const privateOssMatch = src?.trim().match(ossHostPattern)
    if (privateOssMatch) {
      img.removeAttribute('src')
      img.setAttribute('data-rich-image-key', decodeURIComponent(privateOssMatch[1]))
    } else if (src?.trim().match(inlineImagePattern)) {
      img.setAttribute('src', src.trim())
    } else if (src) {
      img.setAttribute('src', src.trim())
    }
    img.setAttribute('referrerpolicy', 'no-referrer')
    img.removeAttribute('loading')
    img.setAttribute('decoding', 'async')
    img.classList.add('rich-image')
  })
  return doc.body.firstElementChild?.innerHTML || '<p>-</p>'
}
const clearRichImageObjectUrls = () => {
  richImageObjectUrls.forEach(url => URL.revokeObjectURL(url))
  richImageObjectUrls.clear()
}
const hydrateRichImages = async () => {
  await nextTick()
  clearRichImageObjectUrls()
  const images = document.querySelectorAll(
    '.detail-rich img[data-rich-image-key], .detail-rich img[data-rich-image-url], .comment-item__content img[data-rich-image-key], .comment-item__content img[data-rich-image-url]'
  )
  await Promise.all(Array.from(images).map(async img => {
    const key = img.getAttribute('data-rich-image-key')
    const imageUrl = img.getAttribute('data-rich-image-url')
    if (!key && !imageUrl) return
    try {
      const response = await request(key ? `/api/files/rich-text-image?key=${encodeURIComponent(key)}` : imageUrl, {
        responseType: 'blob',
      })
      const objectUrl = URL.createObjectURL(response.data)
      richImageObjectUrls.add(objectUrl)
      img.setAttribute('src', objectUrl)
    } catch {
      img.setAttribute('alt', '图片加载失败')
      img.classList.add('rich-image--failed')
    }
  }))
}
const bugDescriptionHtml = computed(() => normalizeRichHtml(selectedBug.value?.description))
const bugReproduceStepsHtml = computed(() => normalizeRichHtml(selectedBug.value?.reproduceSteps))
const bugResolveRemark = computed(() => selectedBug.value?.resolveRemark || selectedBug.value?.remark || selectedBug.value?.fixDetail || '')
const bugResolveRemarkHtml = computed(() => normalizeRichHtml(bugResolveRemark.value))
const handleRichImageClick = event => {
  const image = event.target?.closest?.('img')
  if (!image?.src || image.classList.contains('rich-image--failed')) return
  previewImage.value = image.src
  previewVisible.value = true
}
const handlePreviewVisibleChange = visible => {
  previewVisible.value = visible
}

const resetCommentEditor = () => {
  commentEditorRef.value?.clear()
  commentContent.value = ''
  commentEditorRef.value = undefined
  commentEditorKey.value += 1
}

const loadComments = async (id) => {
  commentsLoading.value = true
  try {
    comments.value = await listBugComments(id)
  } catch {
    comments.value = []
  } finally {
    commentsLoading.value = false
  }
}

const handleSendComment = async () => {
  if (!commentEditorRef.value || commentEditorRef.value.isEmpty()) { message.warning('请输入评论内容'); return }
  commentLoading.value = true
  try {
    const comment = await addBugComment(selectedBug.value.id, { content: commentContent.value })
    comments.value.unshift(comment)
    void hydrateRichImages()
    resetCommentEditor()
    message.success('评论发送成功')
  } catch (e) {
    message.error(e.message || '发送失败')
  } finally {
    commentLoading.value = false
  }
}

const assignVisible = ref(false)
const assignLoading = ref(false)
const assignState = reactive({ assigneeId: undefined, reason: '' })

const handleAssign = async () => {
  if (!assignState.assigneeId) { message.warning('请选择负责人'); return }
  assignLoading.value = true
  try {
    selectedBug.value = await assignBug(selectedBug.value.id, { assigneeId: assignState.assigneeId, reason: assignState.reason })
    assignVisible.value = false
    assignState.assigneeId = undefined
    assignState.reason = ''
    message.success('指派成功')
  } catch (e) {
    message.error(e.message || '指派失败')
  } finally {
    assignLoading.value = false
  }
}

const closeLoading = ref(false)
const handleCloseBug = async () => {
  closeLoading.value = true
  try {
    selectedBug.value = await closeBug(selectedBug.value.id)
    message.success('Bug已关闭')
  } catch (e) {
    message.error(e.message || '操作失败')
  } finally {
    closeLoading.value = false
  }
}

const formRef = ref()
const editingId = ref(null)
const editingBug = ref(null)
const submitLoading = ref(false)
const editorRef = shallowRef()
const recordingFile = shallowRef(null)
const recordingPendingBugId = ref(null)
const recordingFiles = ref([])
const recordingsLoading = ref(false)
const recordingUploading = ref(false)
const recordingPreviewVisible = ref(false)
const recordingPreviewLoading = ref(false)
const recordingPreviewUrl = ref('')
const recordingPreviewName = ref('')
const recordingExtensions = ['mp4', 'webm', 'mov']
const maxRecordingSize = 100 * 1024 * 1024

const clearRecordingFile = () => { recordingFile.value = null; recordingPendingBugId.value = null }
const handleRecordingBeforeUpload = file => {
  const extension = file.name?.split('.').pop()?.toLowerCase()
  if (!recordingExtensions.includes(extension)) {
    message.error('仅支持 MP4、WebM、MOV 录屏')
    return false
  }
  if (file.size > maxRecordingSize) {
    message.error('录屏不能超过 100MB')
    return false
  }
  recordingFile.value = file
  return false
}
const loadRecordings = async bugId => {
  recordingsLoading.value = true
  try {
    recordingFiles.value = await getProjectFiles({ businessType: 'BUG', businessId: bugId, fileCategory: 'SCREEN_RECORDING' })
  } catch (error) {
    recordingFiles.value = []
    message.error(error.message || '录屏列表加载失败')
  } finally {
    recordingsLoading.value = false
  }
}
const uploadRecording = async bugId => {
  if (!recordingFile.value) return true
  recordingUploading.value = true
  try {
    const data = new FormData()
    data.append('businessType', 'BUG')
    data.append('businessId', String(bugId))
    data.append('fileCategory', 'SCREEN_RECORDING')
    data.append('file', recordingFile.value)
    await uploadProjectFile(data, { timeout: 300000 })
    clearRecordingFile()
    await loadRecordings(bugId)
    return true
  } catch (error) {
    recordingPendingBugId.value = String(bugId)
    message.error(error.message || '录屏上传失败')
    return false
  } finally {
    recordingUploading.value = false
  }
}
const handleUploadRecording = async () => {
  if (!selectedBug.value || !recordingFile.value) return
  if (await uploadRecording(selectedBug.value.id)) message.success('录屏上传成功')
}
const isPlayableRecording = file => ['video/mp4', 'video/webm'].includes(file.contentType)
const clearRecordingPreview = () => {
  if (recordingPreviewUrl.value) URL.revokeObjectURL(recordingPreviewUrl.value)
  recordingPreviewUrl.value = ''
  recordingPreviewName.value = ''
}
const handlePreviewRecording = async file => {
  clearRecordingPreview()
  recordingPreviewVisible.value = true
  recordingPreviewName.value = file.originalName
  recordingPreviewLoading.value = true
  try {
    const response = await request(`/api/files/${file.id}/inline`, { responseType: 'blob', timeout: 300000 })
    recordingPreviewUrl.value = URL.createObjectURL(response.data)
  } catch (error) {
    recordingPreviewVisible.value = false
    message.error(error.message || '录屏播放失败')
  } finally {
    recordingPreviewLoading.value = false
  }
}
const handleDownloadRecording = async file => {
  try {
    const result = await downloadProjectFile(file.id, { timeout: 300000 })
    const url = URL.createObjectURL(result.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.fileName || file.originalName
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    message.error(error.message || '录屏下载失败')
  }
}
const canDeleteRecording = file => !isClosedBug(selectedBug.value)
  && currentUserId.value != null && String(file.uploaderId) === String(currentUserId.value)
const handleDeleteRecording = async file => {
  try {
    await deleteProjectFile(file.id)
    recordingFiles.value = recordingFiles.value.filter(item => item.id !== file.id)
    message.success('录屏已删除')
  } catch (error) {
    message.error(error.message || '删除录屏失败')
  }
}

const createDefaultFormState = () => ({ title: '', projectId: undefined, relatedTaskIds: [], assigneeId: undefined, priority: 'MEDIUM', description: '', reproduceSteps: '' })
const formState = reactive(createDefaultFormState())
const relatedTaskOptions = ref([])
const relatedTaskLoading = ref(false)
const formRules = {
  title: [{ required: true, message: '请输入Bug标题', trigger: 'blur' }],
  projectId: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  assigneeId: [{ required: true, message: '请选择负责人', trigger: 'change' }],
  priority: [{ required: true, message: '请选择严重等级', trigger: 'change' }],
  description: [{ required: true, message: '请输入问题描述', trigger: 'blur' }],
}

const fetchAllProjectTasks = async projectId => {
  const pageSize = 200
  const first = await getProjectTasks({ projectId, pageNo: 1, pageSize })
  const records = [...(first.records || [])]
  const total = Number(first.total || records.length)
  const pages = Math.ceil(total / pageSize)
  for (let pageNo = 2; pageNo <= pages; pageNo += 1) {
    const next = await getProjectTasks({ projectId, pageNo, pageSize })
    records.push(...(next.records || []))
  }
  return records
}

const loadRelatedTasks = async projectId => {
  relatedTaskOptions.value = []
  if (!projectId) return
  relatedTaskLoading.value = true
  try {
    const tasks = await fetchAllProjectTasks(projectId)
    if (String(formState.projectId) === String(projectId)) {
      relatedTaskOptions.value = tasks
        .map(task => ({ label: task.name, value: task.id }))
    }
  } catch (error) {
    // 任何员工都能提交 Bug；无项目任务权限时保持关联任务为空即可。
    relatedTaskOptions.value = []
  } finally {
    relatedTaskLoading.value = false
  }
}

const resolveVisible = ref(false)
const resolveFormRef = ref()
const resolveEditorRef = shallowRef()
const resolveEditorKey = ref(0)
const createDefaultResolveForm = () => ({ solution: undefined, resolvedDate: dayjs().format('YYYY-MM-DD'), assigneeId: undefined, remark: '' })
const resolveForm = reactive(createDefaultResolveForm())
const resolveRules = {
  solution: [{ required: true, message: '请选择解决方案', trigger: 'change' }],
  resolvedDate: [{ required: true, message: '请选择解决日期', trigger: 'change' }],
}
const resolveSolutionOptions = [
  { label: '已解决', value: 'RESOLVED' },
  { label: '设计如此', value: 'BY_DESIGN' },
  { label: '重复bug', value: 'DUPLICATE' },
  { label: '外部原因', value: 'EXTERNAL_CAUSE' },
  { label: '代码bug', value: 'CODE_BUG' },
  { label: '无法重现', value: 'CANNOT_REPRODUCE' },
  { label: '延期处理', value: 'DEFERRED' },
  { label: '不予解决', value: 'WONT_FIX' },
]
const resolveSolutionLabels = Object.fromEntries(resolveSolutionOptions.map(item => [item.value, item.label]))
const solutionTagColor = solution => ({ RESOLVED: 'blue', DEFERRED: 'orange', WONT_FIX: 'default' })[solution] || 'geekblue'

const resetResolveForm = () => {
  Object.assign(resolveForm, createDefaultResolveForm())
  resolveEditorRef.value = undefined
  resolveEditorKey.value += 1
}
const openResolveModal = () => {
  resetResolveForm()
  resolveVisible.value = true
}
const resolveLoading = ref(false)
const handleResolveConfirm = async () => {
  await resolveFormRef.value?.validate()
  resolveLoading.value = true
  try {
    selectedBug.value = await resolveBug(selectedBug.value.id, {
      solution: resolveForm.solution,
      resolvedDate: resolveForm.resolvedDate,
      assigneeId: resolveForm.assigneeId || undefined,
      remark: resolveForm.remark || undefined,
    })
    resolveVisible.value = false
    message.success('Bug已解决，等待验证')
  } catch (e) {
    message.error(e.message || '操作失败')
  } finally {
    resolveLoading.value = false
  }
}

const handleProjectChange = projectId => {
  formState.relatedTaskIds = []
  loadRelatedTasks(projectId)
}

const handleSubmit = async () => {
  if (submitLoading.value) return
  if (viewMode.value === 'edit' && (!isBugCreator(editingBug.value) || isClosedBug(editingBug.value))) {
    message.warning('仅提出人可以编辑未关闭的Bug')
    return
  }
  await formRef.value?.validate()
  if (formState.assigneeId && String(formState.assigneeId) === String(currentUserId.value)) {
    message.warning('Bug 不能指定给自己，请选择其他负责人')
    return
  }
  submitLoading.value = true
  try {
    const body = {
      title: formState.title,
      projectId: formState.projectId,
      taskId: formState.relatedTaskIds[0] || undefined,
      relatedTaskIds: formState.relatedTaskIds,
      assigneeId: formState.assigneeId,
      priority: formState.priority,
      description: formState.description,
      reproduceSteps: formState.reproduceSteps || '<p><br></p>',
    }
    const saved = editingId.value ? await updateBug(editingId.value, body) : await createBug(body)
    const bugId = saved?.id || editingId.value
    const recordingSaved = await uploadRecording(bugId)
    message[recordingSaved ? 'success' : 'warning'](recordingSaved
      ? (editingId.value ? 'Bug编辑成功' : 'Bug新增成功')
      : 'Bug已保存，但录屏上传失败，请在详情页重试')
    router.replace({ name: 'BugDetail', params: { id: String(bugId) } })
  } catch (e) {
    message.error(e.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

const handleCreate = () => router.push({ name: 'BugCreate' })
const handleEdit = record => {
  if (!isBugCreator(record) || isClosedBug(record)) return
  router.push({ name: 'BugEdit', params: { id: record.id } })
}
const handleDetail = record => router.push({ name: 'BugDetail', params: { id: record.id } })
const handleEditFromDetail = () => handleEdit(selectedBug.value)
const handleBack = () => router.back()
const handleReopenBug = async record => {
  const bug = record || selectedBug.value
  if (!bug) return
  try {
    await reopenBug(bug.id)
    message.success('Bug已重新打开')
    loadBugs()
    if (selectedBug.value?.id === bug.id) selectedBug.value = await getBugById(bug.id)
  } catch (e) {
    message.error(e.message || '重新打开失败')
  }
}

const handleCloseBugFromList = async record => {
  if (isClosedBug(record) || !isBugCreator(record)) return
  try {
    const closed = await closeBug(record.id)
    Object.assign(record, closed || {}, { status: 'CLOSED' })
    message.success('Bug已关闭')
    loadBugs()
  } catch (e) {
    message.error(e.message || '关闭失败')
  }
}

const syncRouteState = async () => {
  if (viewMode.value === 'list') { clearRecordingFile(); loadBugs(); return }
  const id = route.params.id
  if (viewMode.value === 'create') {
    Object.assign(formState, createDefaultFormState())
    relatedTaskOptions.value = []
    recordingFiles.value = []
    clearRecordingFile()
    editingId.value = null
    editingBug.value = null
    return
  }
  if (viewMode.value === 'edit') {
    editingId.value = id
    editingBug.value = null
    clearRecordingFile()
    try {
      const bug = await getBugById(id)
      if (isClosedBug(bug) || !isBugCreator(bug)) {
        message.warning(isClosedBug(bug) ? '已关闭的Bug不可编辑' : '仅提出人可以编辑Bug')
        router.replace({ name: 'BugDetail', params: { id } })
        return
      }
      editingBug.value = bug
      formState.title = bug.title || ''
      formState.projectId = bug.projectId
      await loadRelatedTasks(bug.projectId)
      formState.relatedTaskIds = Array.isArray(bug.relatedTaskIds) ? bug.relatedTaskIds : (bug.taskId ? [bug.taskId] : [])
      formState.assigneeId = bug.assigneeId
      formState.priority = bug.priority || 'MEDIUM'
      formState.description = bug.description || ''
      formState.reproduceSteps = bug.reproduceSteps || ''
      editorRef.value?.setHtml(bug.reproduceSteps || '')
      await loadRecordings(id)
    } catch (e) {
      message.error('加载Bug失败')
      handleBack()
    }
    return
  }
  if (viewMode.value === 'detail') {
    if (recordingPendingBugId.value !== String(id)) clearRecordingFile()
    resetCommentEditor()
    detailLoading.value = true
    selectedBug.value = null
    comments.value = []
    try {
      const [bug, cmts] = await Promise.all([getBugById(id), listBugComments(id)])
      selectedBug.value = bug
      comments.value = cmts
      await loadRecordings(id)
      void hydrateRichImages()
    } catch (e) {
      message.error(e.message || '加载失败')
    } finally {
      detailLoading.value = false
    }
  }
}

watch(() => [route.name, route.params.id], syncRouteState, { immediate: true })

onBeforeUnmount(() => {
  clearRichImageObjectUrls()
  clearRecordingPreview()
})

onMounted(async () => {
  const [projectRes, userRes] = await Promise.all([
    getBugProjectOptions().catch(() => []),
    getAllUsers({ enabled: true }).catch(() => []),
  ])
  projects.value = projectRes || []
  users.value = userRes || []
})
</script>

<style scoped>
.bug-page { height: 100%; width: min(var(--app-content-max-width), 100%); margin: 0 auto; overflow-x: hidden; overflow-y: auto; color: #262626; }
.bug-page--list { display: flex; flex: 1; flex-direction: column; height: auto; min-height: 0; overflow: clip; }
.bug-filter, .bug-list, .bug-form-card { border: 1px solid #edf0f3; box-shadow: 0 2px 8px rgb(0 0 0 / 3%); }
.bug-filter { flex: none; margin-bottom: 16px; }
.bug-filter :deep(.ant-card-body) { padding: 16px 18px 2px; }
.bug-filter__form.app-filter-form { display: grid; grid-template-columns: minmax(220px, 1.4fr) 280px minmax(160px, 1fr) minmax(150px, 1fr); column-gap: 16px !important; align-items: end; }
.bug-filter__form :deep(.ant-form-item) { margin: 0 0 14px; }
.bug-filter__form :deep(.ant-form-item-row) { width: 100%; flex-wrap: nowrap; }
.bug-filter__form :deep(.ant-form-item-control) { flex: 1; }
.bug-filter__form :deep(.ant-input), .bug-filter__form :deep(.ant-select), .bug-filter__form :deep(.ant-picker) { width: 100%; }
.bug-filter__field--creator { grid-row: 2; grid-column: 1; }
.bug-filter__field--assignee { grid-row: 2; grid-column: 2; }
.bug-filter__field--date { grid-row: 2; grid-column: 3; }
.bug-filter__actions { grid-row: 2; grid-column: 4 !important; justify-self: end; }
.bug-list__toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.bug-list__group { display: flex; align-items: center; gap: 12px; color: #666; }
.bug-list__group :deep(.ant-select) { width: 130px; }
.bug-list { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.bug-list :deep(.ant-card-body) { display: flex; flex-direction: column; height: 100%; min-height: 0; padding: 18px 18px 10px; overflow: hidden; }
.bug-list__toolbar { flex: none; }
.bug-list__table { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.bug-list__table :deep(.ant-spin-nested-loading) { flex: 1; min-height: 0; }
.bug-list__table :deep(.ant-spin-container),
.bug-list__table :deep(.ant-table),
.bug-list__table :deep(.ant-table-container) { display: flex; flex: 1; flex-direction: column; min-height: 0; }
.bug-list__table :deep(.ant-table-header) { flex: none; }
.bug-list__table :deep(.ant-table-body) { flex: 1; min-height: 0; max-height: none !important; overflow-y: auto !important; }
.bug-list__pagination { flex: none; align-self: flex-end; height: 32px; margin: 10px 0 0; }
.bug-group-list { flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; }
.bug-list :deep(.ant-table-cell) { white-space: nowrap; }
.bug-title-text { display: block; width: 100%; overflow: hidden; color: #1677ff; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.bug-no { color: #1677ff; font-size: 12px; font-weight: 600; font-family: monospace; }
.recording-picker { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
.recording-picker small, .recording-existing { width: 100%; color: #8c8c8c; }
.recording-picker__selected { min-width: 0; overflow-wrap: anywhere; }
.recording-list { display: grid; gap: 8px; }
.recording-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; background: #fafafa; border: 1px solid #edf0f3; border-radius: 6px; }
.recording-item__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recording-detail-upload { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 12px; }
.recording-preview { display: block; width: 100%; max-height: 70vh; background: #000; }
.bug-operation-button { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border-radius: 6px; }
.bug-operation-button :deep(svg) { width: 15px; height: 15px; }
.bug-group { margin-bottom: 24px; }
.bug-group__header { display: flex; align-items: center; justify-content: space-between; height: 40px; padding: 0 14px; background: #fafafa; border-block: 1px solid #edf0f3; }
.bug-group__header button { display: inline-flex; align-items: center; gap: 8px; padding: 0; font-weight: 600; background: transparent; border: 0; cursor: pointer; }
.bug-group-list :deep(.ant-table-thead > tr > th) { position: sticky; top: 0; z-index: 2; }
.bug-form-card { width: min(1100px, 100%); min-height: 538px; margin: 0 auto; }
.bug-form-card :deep(.ant-card-body) { padding: 22px 30px 24px; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.panel-heading h2 { margin: 0; font-size: 18px; }
.bug-form-fields { max-width: 980px; }
.bug-form-fields :deep(.ant-form-item) { margin-bottom: 20px; }
.bug-form-fields :deep(.ant-form-item-label) { max-width: 150px; }
.bug-rich-editor { overflow: hidden; border-radius: 8px; }
.bug-form-card { padding-bottom: 96px; }

.form-actions {
  position: fixed;
  bottom: 20px;
  left: 50%;
  z-index: 30;
  display: flex;
  gap: 26px;
  align-items: center;
  justify-content: center;
  width: max-content;
  max-width: calc(100vw - 32px);
  padding: 10px 30px;
  background: rgba(0, 0, 0, 0.28);
  border-radius: 8px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.16);
  transform: translateX(-50%);
}
.form-actions .ant-btn {
  min-width: 80px;
  height: 30px;
  font-weight: 600;
  border-radius: 3px;
}
/* ── Detail page ── */
.detail-page { width: min(var(--app-content-max-width), 100%); margin: 0 auto; padding-bottom: 96px; }

.detail-header {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 56px;
  padding: 0 4px 16px;
  border-bottom: 1px solid #edf0f3;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.detail-back { flex-shrink: 0; }

.detail-bug-no {
  flex-shrink: 0;
  padding: 2px 10px;
  color: #1677ff;
  font-size: 13px;
  font-weight: 700;
  font-family: monospace;
  background: #e6f4ff;
  border-radius: 5px;
}

.detail-title {
  flex: 1;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f1f1f;
  line-height: 1.35;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: start;
}

.detail-main { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

.detail-sidebar { min-width: 0; margin-right: 10px; }

.detail-card.lifecycle-card :deep(.ant-card-body) { margin: 0; padding: 14px 16px 6px; }
.lifecycle-card :deep(.ant-card-extra) { padding: 0; }

.lifecycle-status-tag { margin-inline-end: 0; font-weight: 500; }

.closed-summary {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 18px;
  padding: 12px;
  color: #389e0d;
  background: #f6ffed;
  border: 1px solid #d9f7be;
  border-radius: 8px;
}

.closed-summary__icon { flex: none; margin-top: 2px; font-size: 16px; }
.closed-summary strong { display: block; color: #237804; font-size: 13px; line-height: 1.5; }
.closed-summary p { margin: 2px 0 0; color: #6b7280; font-size: 12px; line-height: 1.5; }

.lifecycle-timeline { margin-top: 4px; }
.lifecycle-timeline :deep(.ant-timeline-item-tail) { border-inline-start-color: #e0e7ef; }
.lifecycle-timeline :deep(.ant-timeline-item-head) { background: #1677ff; border-color: #1677ff; width: 9px; height: 9px; }
.lifecycle-timeline :deep(.ant-timeline-item-content) { inset-inline-start: 20px; margin-inline-start: 20px; padding-inline-end: 5px; }

.timeline-action { font-size: 13px; font-weight: 600; color: #1f2937; line-height: 1.4; }
.timeline-content { margin-top: 3px; font-size: 12px; color: #6b7280; line-height: 1.5; word-break: break-word; }
.timeline-time { margin-top: 2px; font-size: 11px; color: #bfbfbf; }

.detail-card {
  border: 1px solid #edf0f3 !important;
  box-shadow: 0 1px 4px rgb(0 0 0 / 4%);
}

.detail-card :deep(.ant-card-head) {
  min-height: 44px;
  padding: 0 18px;
  border-bottom: 1px solid #f2f4f6;
}

.detail-card :deep(.ant-card-body) { margin: 16px 18px; }

.detail-card__title { font-size: 14px; font-weight: 600; color: #1f1f1f; }

.bug-detail-overview :deep(.ant-card-body) {
  padding: 0;
}

.detail-section {
  padding: 16px 18px;
  border-bottom: 1px solid #f2f4f6;
}

.detail-section:last-child {
  border-bottom: 0;
}

.detail-section h3 {
  margin: 0 0 14px;
  color: #1f1f1f;
  font-size: 14px;
  font-weight: 600;
}

.native-info-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  color: #111827;
}

.native-info-table th,
.native-info-table td {
  height: 48px;
  padding: 12px 14px;
  font-size: 14px;
  text-align: left;
  border: 1px solid #e6ebf1;
  word-break: break-word;
}

.native-info-table th {
  width: 22%;
  color: #334155;
  font-weight: 700;
  background: #f3f6fa;
}

.native-info-table td {
  width: 28%;
  background: #fff;
  font-weight: 400;
}

.detail-text {
  margin: 0;
  color: #434343;
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-rich { color: #434343; font-size: 14px; line-height: 1.75; word-break: break-word; }
.resolve-remark { margin-top: 12px; }
.detail-rich :deep(p) { margin: 0 0 10px; }
.detail-rich :deep(img),
.detail-rich :deep(.rich-image) {
  display: block;
  max-width: min(100%, 960px);
  height: auto !important;
  margin: 10px 0;
  object-fit: contain;
  border: 1px solid #edf0f3;
  border-radius: 8px;
}
.detail-rich :deep(img),
.comment-item__content :deep(img) {
  cursor: zoom-in;
}
.detail-rich :deep(.rich-image--failed),
.comment-item__content :deep(.rich-image--failed) {
  min-width: 160px;
  min-height: 40px;
  padding: 10px;
  color: #ff4d4f;
  background: #fff2f0;
  border-color: #ffccc7;
}

.fix-block { margin-bottom: 16px; }
.fix-block:last-child { margin-bottom: 0; }
.fix-label {
  margin-bottom: 6px;
  color: #8c8c8c;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.comment-list { display: flex; flex-direction: column; gap: 1px; margin-bottom: 16px; }
.comment-item {
  padding: 12px 14px;
  background: #fafafa;
  border-radius: 8px;
}
.comment-item__meta { display: flex; gap: 10px; align-items: baseline; margin-bottom: 6px; }
.comment-item__meta b { font-size: 13px; color: #262626; }
.comment-item__meta small { color: #bfbfbf; font-size: 12px; }
.comment-item__content { color: #555; font-size: 13px; line-height: 1.65; }
.comment-item__content :deep(p) { margin: 0; }
.comment-item__content :deep(img:not(.rich-image--failed)) {
  display: block;
  width: min(480px, 100%);
  height: min(320px, 66.67vw) !important;
  margin: 8px 0;
  object-fit: contain;
  background: #fafafa;
  border: 1px solid #edf0f3;
  border-radius: 8px;
}
.comment-empty { padding: 16px 0; }

.comment-rich-editor {
  overflow: hidden;
  background: #fff;
  border-radius: 8px;
}
.detail-rich--reproduce :deep(img),
.detail-rich--reproduce :deep(.rich-image) {
  width: min(480px, 100%);
  height: min(320px, 66.67vw) !important;
  object-fit: contain;
  background: #fafafa;
}

.send-row { display: flex; justify-content: flex-end; margin-top: 10px; }

.resolve-form { margin-top: 12px; }
.resolve-form :deep(.ant-form-item) { margin-bottom: 20px; }
.resolve-rich-editor { overflow: hidden; background: #fff; border-radius: 8px; }
.resolve-actions { display: flex; justify-content: center; gap: 16px; margin-top: 28px; }
.resolve-actions :deep(.ant-btn) { min-width: 72px; }

.detail-floating-actions {
  position: fixed;
  bottom: 20px;
  left: 50%;
  z-index: 20;
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: center;
  width: max-content;
  max-width: calc(100vw - 32px);
  padding: 10px 30px;
  background: rgba(0, 0, 0, 0.28);
  border-radius: 8px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.16);
  transform: translateX(-50%);
}
.detail-floating-actions .ant-btn {
  min-width: 80px;
  height: 30px;
  font-weight: 600;
  border-radius: 3px;
}
.detail-floating-actions .resolve-button { background: #52c41a; border-color: #52c41a; }
.detail-floating-actions .resolve-button:hover { background: #73d13d; border-color: #73d13d; }

@media (max-width: 1000px) {
  .detail-floating-actions,
  .form-actions {
    gap: 18px;
    padding: 10px 22px;
  }
}
:deep(.ant-modal-body) { padding-top: 10px; }
@media (max-width: 1440px) {
  .bug-filter__form.app-filter-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bug-filter__field--creator,
  .bug-filter__field--assignee,
  .bug-filter__field--date { grid-row: auto; grid-column: auto; }
  .bug-filter__actions { grid-row: auto; grid-column: 2; }
}
@media (max-width: 680px) {
  .bug-filter__form.app-filter-form { grid-template-columns: minmax(0, 1fr); }
  .bug-filter__actions { grid-column: 1; justify-self: start; }
  .bug-list__toolbar { align-items: flex-start; flex-wrap: wrap; gap: 12px; }
}
</style>
