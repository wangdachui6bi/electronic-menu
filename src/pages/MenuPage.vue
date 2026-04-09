<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type { UploadFile } from 'element-plus'
import { Check, Delete, Edit, Plus, Search } from '@element-plus/icons-vue'
import {
  addComment,
  createDish,
  createRequest,
  deleteDish,
  deleteRequest,
  fetchBootstrap,
  importDishes,
  subscribeMenuRefresh,
  updateDish,
  updateRequestStatus,
} from '../api/menu'
import { useSession } from '../services/session'
import type { MenuBootstrap, MenuDish, MenuRequest } from '../types/app'
import { formatDateTime, parseImportText, parseTagInput } from '../utils/format'
import { readFileAsDataUrl } from '../utils/media'

type DishDraft = {
  id?: string
  name: string
  category: string
  description: string
  tags: string
  imageData: string
  sourceType: string
}

const EMPTY_BOARD: MenuBootstrap = {
  serverTime: '',
  dishes: [],
  requests: [],
  comments: [],
  events: [],
  recommendations: [],
}

const session = useSession()
const board = ref<MenuBootstrap>(EMPTY_BOARD)
const loading = ref(true)
const busy = ref(false)
const search = ref('')
const selectedDishId = ref('')
const requestText = ref('')
const requestNote = ref('')
const importText = ref('')
const message = ref('同步中')
const dishDialogVisible = ref(false)
const commentDrafts = reactive<Record<string, string>>({})
const dishDraft = reactive<DishDraft>({
  name: '',
  category: '',
  description: '',
  tags: '',
  imageData: '',
  sourceType: 'custom',
})

let unsubscribe: (() => void) | null = null

const permissions = computed(() => session.state.user?.menuPermissions)
const filteredDishes = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return board.value.dishes.filter((dish) => {
    if (!keyword) {
      return true
    }
    return `${dish.name} ${dish.category} ${dish.description} ${dish.tags.join(' ')}`.toLowerCase().includes(keyword)
  })
})
const selectedDish = computed(() => board.value.dishes.find((item) => item.id === selectedDishId.value) || null)
const sortedRequests = computed(() =>
  [...board.value.requests].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
)

function actor() {
  return session.state.user?.displayName || '未登录'
}

function commentsFor(targetType: 'dish' | 'request', targetId: string) {
  return board.value.comments
    .filter((item) => item.targetType === targetType && item.targetId === targetId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

function resetDishDraft(dish?: MenuDish) {
  dishDraft.id = dish?.id
  dishDraft.name = dish?.name || ''
  dishDraft.category = dish?.category || ''
  dishDraft.description = dish?.description || ''
  dishDraft.tags = dish?.tags.join(' / ') || ''
  dishDraft.imageData = dish?.imageData || ''
  dishDraft.sourceType = dish?.sourceType || 'custom'
}

async function loadBoard(silent = false) {
  if (!silent) {
    loading.value = true
  }

  try {
    board.value = await fetchBootstrap()
    message.value = '已同步'
    if (!selectedDishId.value && board.value.dishes[0]) {
      selectedDishId.value = board.value.dishes[0].id
    }
  } finally {
    loading.value = false
  }
}

async function mutate(task: () => Promise<MenuBootstrap>, successText: string) {
  busy.value = true
  try {
    board.value = await task()
    message.value = successText
    return true
  } catch (error) {
    message.value = error instanceof Error ? error.message : '操作失败'
    return false
  } finally {
    busy.value = false
  }
}

async function submitRequest() {
  if (!requestText.value.trim()) {
    message.value = '先写要吃什么'
    return
  }

  const ok = await mutate(
    () =>
      createRequest({
        actor: actor(),
        dishName: requestText.value.trim(),
        note: requestNote.value.trim(),
      }),
    '点单已发送',
  )

  if (ok) {
    requestText.value = ''
    requestNote.value = ''
  }
}

async function quickOrder(dish: MenuDish) {
  await mutate(
    () =>
      createRequest({
        actor: actor(),
        dishId: dish.id,
        note: requestNote.value.trim(),
      }),
    `已添加「${dish.name}」`,
  )
}

async function saveDish() {
  const payload = {
    actor: actor(),
    name: dishDraft.name.trim(),
    category: dishDraft.category.trim(),
    description: dishDraft.description.trim(),
    tags: parseTagInput(dishDraft.tags),
    imageData: dishDraft.imageData || undefined,
    sourceType: dishDraft.sourceType || 'custom',
  }

  if (!payload.name) {
    message.value = '菜名不能为空'
    return
  }

  const ok = await mutate(
    () => (dishDraft.id ? updateDish(dishDraft.id, payload) : createDish(payload)),
    dishDraft.id ? '菜品已更新' : '菜品已创建',
  )

  if (ok) {
    dishDialogVisible.value = false
    resetDishDraft()
  }
}

async function removeDishAction(dish: MenuDish) {
  if (!window.confirm(`确定删除「${dish.name}」吗？`)) {
    return
  }

  const ok = await mutate(() => deleteDish(dish.id, actor()), '菜品已删除')
  if (ok && selectedDishId.value === dish.id) {
    selectedDishId.value = board.value.dishes[0]?.id || ''
  }
}

async function removeRequestAction(item: MenuRequest) {
  if (!window.confirm(`确定删除「${item.dishName}」吗？`)) {
    return
  }
  await mutate(() => deleteRequest(item.id, actor()), '点单已删除')
}

async function updateRequest(item: MenuRequest, status: string | number | boolean) {
  await mutate(
    () =>
      updateRequestStatus(item.id, {
        actor: actor(),
        status: String(status),
        note: item.note,
      }),
    '状态已更新',
  )
}

async function sendComment(targetType: 'dish' | 'request', targetId: string) {
  const key = `${targetType}:${targetId}`
  const content = String(commentDrafts[key] || '').trim()
  if (!content) {
    return
  }

  const ok = await mutate(
    () =>
      addComment({
        actor: actor(),
        targetType,
        targetId,
        content,
      }),
    '评论已发送',
  )

  if (ok) {
    commentDrafts[key] = ''
  }
}

async function importDishList() {
  const items = parseImportText(importText.value)
  if (!items.length) {
    message.value = '一行一个，支持 分类/菜名'
    return
  }
  const ok = await mutate(
    () =>
      importDishes({
        actor: actor(),
        items,
      }),
    `已导入 ${items.length} 条`,
  )
  if (ok) {
    importText.value = ''
  }
}

async function onDishFileChange(file: UploadFile) {
  if (!file.raw) {
    return
  }
  dishDraft.imageData = await readFileAsDataUrl(file.raw)
}

onMounted(async () => {
  await loadBoard()
  unsubscribe = subscribeMenuRefresh(() => {
    void loadBoard(true)
    message.value = '收到新变更'
  })
})

onBeforeUnmount(() => {
  unsubscribe?.()
})
</script>

<template>
  <div class="menu-page-simple">
    <section class="menu-toolbar">
      <div class="menu-toolbar__left">
        <div class="menu-toolbar__stat">
          <strong>{{ board.requests.filter((item) => item.status === 'pending').length }}</strong>
          <span>待处理</span>
        </div>
        <div class="menu-toolbar__stat">
          <strong>{{ board.dishes.length }}</strong>
          <span>菜品</span>
        </div>
      </div>
      <div class="menu-toolbar__right">
        <el-input v-model="search" clearable placeholder="搜索菜名、标签、描述">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-tag round>{{ message }}</el-tag>
      </div>
    </section>

    <section class="menu-layout">
      <article class="menu-surface">
        <div class="menu-surface__head">
          <div>
            <p class="menu-section__eyebrow">Requests</p>
            <h2>点单</h2>
          </div>
        </div>

        <div v-if="permissions?.submitRequest" class="request-compose">
          <el-input v-model="requestText" placeholder="今晚想吃什么" />
          <el-input v-model="requestNote" placeholder="备注口味或份量" />
          <el-button type="primary" :loading="busy" @click="submitRequest">发送点单</el-button>
        </div>
        <el-alert
          v-else
          title="当前账号没有点单权限"
          type="info"
          :closable="false"
        />

        <div class="request-list">
          <article v-for="item in sortedRequests" :key="item.id" class="request-item">
            <div class="request-item__head">
              <div>
                <strong>{{ item.dishName }}</strong>
                <p>{{ item.requestedBy }} · {{ formatDateTime(item.updatedAt) }}</p>
              </div>
              <el-tag round>{{ item.status }}</el-tag>
            </div>
            <p v-if="item.note" class="request-item__note">{{ item.note }}</p>
            <div class="request-item__controls">
              <el-select
                v-if="permissions?.manageRequests"
                :model-value="item.status"
                size="small"
                @change="updateRequest(item, $event)"
              >
                <el-option label="待安排" value="pending" />
                <el-option label="准备做" value="accepted" />
                <el-option label="正在做" value="cooking" />
                <el-option label="已吃上" value="done" />
                <el-option label="先不做" value="declined" />
              </el-select>
              <el-button v-if="permissions?.manageRequests" text @click="removeRequestAction(item)">删除</el-button>
            </div>
            <div class="comment-box">
              <div v-for="comment in commentsFor('request', item.id)" :key="comment.id" class="comment-line">
                <strong>{{ comment.author }}</strong>
                <span>{{ comment.content }}</span>
              </div>
              <div v-if="permissions?.comment" class="comment-input">
                <el-input
                  :model-value="commentDrafts[`request:${item.id}`] || ''"
                  placeholder="补一句评论"
                  @update:model-value="commentDrafts[`request:${item.id}`] = String($event)"
                />
                <el-button plain @click="sendComment('request', item.id)">发送</el-button>
              </div>
            </div>
          </article>
        </div>
      </article>

      <article class="menu-surface">
        <div class="menu-surface__head">
          <div>
            <p class="menu-section__eyebrow">Dishes</p>
            <h2>菜品库</h2>
          </div>
          <el-button v-if="permissions?.manageDishes" type="primary" plain @click="resetDishDraft(); dishDialogVisible = true">
            <el-icon><Plus /></el-icon>
            新增
          </el-button>
        </div>

        <div class="dish-grid-simple" v-loading="loading">
          <button
            v-for="dish in filteredDishes"
            :key="dish.id"
            type="button"
            class="dish-chip"
            :class="{ 'dish-chip--active': selectedDishId === dish.id }"
            @click="selectedDishId = dish.id"
          >
            <strong>{{ dish.name }}</strong>
            <span>{{ dish.category || '未分类' }}</span>
          </button>
        </div>

        <div v-if="selectedDish" class="dish-detail-simple">
          <div class="dish-detail-simple__head">
            <div>
              <h3>{{ selectedDish.name }}</h3>
              <p>{{ selectedDish.category || '未分类' }} · {{ formatDateTime(selectedDish.updatedAt) }}</p>
            </div>
            <div class="dish-detail-simple__actions">
              <el-button v-if="permissions?.submitRequest" type="primary" plain @click="quickOrder(selectedDish)">点这道</el-button>
              <el-button
                v-if="permissions?.manageDishes"
                plain
                @click="resetDishDraft(selectedDish); dishDialogVisible = true"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button v-if="permissions?.manageDishes" plain @click="removeDishAction(selectedDish)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
          <p class="dish-detail-simple__body">{{ selectedDish.description || '还没有备注。' }}</p>
          <div class="dish-detail-simple__tags">
            <el-tag v-for="tag in selectedDish.tags" :key="tag" round>{{ tag }}</el-tag>
          </div>
          <div class="comment-box">
            <div v-for="comment in commentsFor('dish', selectedDish.id)" :key="comment.id" class="comment-line">
              <strong>{{ comment.author }}</strong>
              <span>{{ comment.content }}</span>
            </div>
            <div v-if="permissions?.comment" class="comment-input">
              <el-input
                :model-value="commentDrafts[`dish:${selectedDish.id}`] || ''"
                placeholder="给这道菜补一句"
                @update:model-value="commentDrafts[`dish:${selectedDish.id}`] = String($event)"
              />
              <el-button plain @click="sendComment('dish', selectedDish.id)">发送</el-button>
            </div>
          </div>
        </div>
      </article>

      <article v-if="permissions?.manageDishes" class="menu-surface">
        <div class="menu-surface__head">
          <div>
            <p class="menu-section__eyebrow">Batch</p>
            <h2>批量导入</h2>
          </div>
        </div>
        <el-input
          v-model="importText"
          type="textarea"
          :rows="10"
          resize="none"
          placeholder="快手/番茄炒蛋"
        />
        <el-button type="primary" :loading="busy" @click="importDishList">导入菜名</el-button>
      </article>
    </section>

    <el-dialog v-model="dishDialogVisible" :title="dishDraft.id ? '编辑菜品' : '新增菜品'" width="min(720px, 92vw)">
      <div class="dish-dialog">
        <div class="dish-dialog__grid">
          <el-input v-model="dishDraft.name" placeholder="菜名" />
          <el-input v-model="dishDraft.category" placeholder="分类" />
        </div>
        <el-input v-model="dishDraft.tags" placeholder="标签，用空格、斜杠或逗号分隔" />
        <el-input v-model="dishDraft.description" type="textarea" :rows="7" resize="none" placeholder="做法或备注" />
        <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" @change="onDishFileChange">
          <el-button plain>上传图片</el-button>
        </el-upload>
        <img v-if="dishDraft.imageData" :src="dishDraft.imageData" alt="预览" class="dish-dialog__preview" />
      </div>
      <template #footer>
        <el-button @click="dishDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="busy" @click="saveDish">
          <el-icon><Check /></el-icon>
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.menu-page-simple,
.menu-layout,
.menu-surface,
.request-list,
.comment-box {
  display: grid;
  gap: 16px;
}

.menu-toolbar,
.menu-surface,
.dish-chip,
.request-item {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(36, 30, 26, 0.08);
}

.menu-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
}

.menu-toolbar__left,
.menu-toolbar__right,
.menu-toolbar__stat,
.menu-surface__head,
.request-item__head,
.request-item__controls,
.dish-detail-simple__head,
.dish-detail-simple__actions,
.comment-input {
  display: flex;
  gap: 12px;
  align-items: center;
}

.menu-toolbar__stat {
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.menu-toolbar__stat strong {
  font-size: 1.7rem;
}

.menu-toolbar__stat span,
.request-item__head p,
.request-item__note,
.dish-detail-simple__body {
  color: var(--muted);
}

.menu-layout {
  grid-template-columns: 0.95fr 1.1fr 0.75fr;
}

.menu-surface {
  padding: 18px;
}

.menu-surface__head {
  justify-content: space-between;
}

.menu-surface__head h2,
.dish-detail-simple__head h3 {
  margin: 0;
}

.request-compose,
.dish-detail-simple,
.dish-dialog {
  display: grid;
  gap: 12px;
}

.request-item {
  padding: 14px;
}

.dish-grid-simple {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.dish-chip {
  display: grid;
  gap: 4px;
  text-align: left;
  padding: 14px;
  cursor: pointer;
}

.dish-chip--active {
  border-color: rgba(181, 91, 55, 0.4);
  background: rgba(255, 247, 240, 0.9);
}

.dish-chip span {
  color: var(--muted);
}

.dish-detail-simple__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.comment-line {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(247, 242, 236, 0.9);
}

.dish-dialog__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.dish-dialog__preview {
  width: 100%;
  max-height: 260px;
  object-fit: cover;
  border-radius: 16px;
}

@media (max-width: 1200px) {
  .menu-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .menu-toolbar,
  .menu-toolbar__right,
  .menu-surface__head,
  .dish-detail-simple__head,
  .dish-detail-simple__actions,
  .comment-input {
    flex-direction: column;
    align-items: stretch;
  }

  .dish-grid-simple,
  .dish-dialog__grid {
    grid-template-columns: 1fr;
  }
}
</style>
