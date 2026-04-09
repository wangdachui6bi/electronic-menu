<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { UploadUserFile } from 'element-plus'
import { Check, Delete, Download, Plus, Share, Star } from '@element-plus/icons-vue'
import {
  addAssetComment,
  createAlbum,
  deleteAsset,
  fetchGalleryBootstrap,
  toggleFavorite,
  updateAlbum,
  updateAlbumMembers,
  uploadAssets,
} from '../api/gallery'
import { useSession } from '../services/session'
import type { GalleryAsset, GalleryBootstrap, SharedAlbum } from '../types/app'
import { formatDateTime, formatFileSize } from '../utils/format'
import { extractMediaMeta } from '../utils/media'

const EMPTY_GALLERY: GalleryBootstrap = {
  serverTime: '',
  albums: [],
  assets: [],
  comments: [],
  storage: {
    provider: 'local',
    configured: false,
    directUploadReady: false,
    note: '',
  },
  users: [],
}

const session = useSession()
const gallery = ref<GalleryBootstrap>(EMPTY_GALLERY)
const loading = ref(true)
const busy = ref(false)
const search = ref('')
const activeAlbumId = ref('')
const selectedAssetId = ref('')
const uploadDrawerVisible = ref(false)
const albumDialogVisible = ref(false)
const shareDialogVisible = ref(false)
const viewerVisible = ref(false)
const uploadFiles = ref<UploadUserFile[]>([])
const commentDraft = ref('')
const message = ref('同步中')
const albumDraft = reactive({
  id: '',
  name: '',
  description: '',
  visibility: 'private' as 'private' | 'shared',
})
const shareDraft = ref<Array<{ userId: string; role: 'editor' | 'viewer' }>>([])

const activeAlbum = computed(() => gallery.value.albums.find((item) => item.id === activeAlbumId.value) || null)
const selectedAsset = computed(() => gallery.value.assets.find((item) => item.id === selectedAssetId.value) || null)
const albumAssets = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return gallery.value.assets.filter((asset) => {
    if (activeAlbumId.value && asset.albumId !== activeAlbumId.value) {
      return false
    }
    if (!keyword) {
      return true
    }
    return `${asset.originalName} ${asset.caption} ${asset.albumName}`.toLowerCase().includes(keyword)
  })
})
const selectedComments = computed(() =>
  selectedAsset.value ? gallery.value.comments.filter((item) => item.assetId === selectedAsset.value?.id) : [],
)
const canEditAlbum = computed(() => ['owner', 'editor'].includes(activeAlbum.value?.currentRole || ''))
const canManageAlbum = computed(() => activeAlbum.value?.currentRole === 'owner')

async function loadGallery() {
  loading.value = true
  try {
    gallery.value = await fetchGalleryBootstrap()
    message.value = gallery.value.storage.note || '已同步'
    if (!activeAlbumId.value && gallery.value.albums[0]) {
      activeAlbumId.value = gallery.value.albums[0].id
    }
    if (!selectedAssetId.value && gallery.value.assets[0]) {
      selectedAssetId.value = gallery.value.assets[0].id
    }
  } finally {
    loading.value = false
  }
}

async function mutate(task: () => Promise<GalleryBootstrap>, successText: string) {
  busy.value = true
  try {
    gallery.value = await task()
    message.value = successText
    if (!activeAlbumId.value && gallery.value.albums[0]) {
      activeAlbumId.value = gallery.value.albums[0].id
    }
    return true
  } catch (error) {
    message.value = error instanceof Error ? error.message : '操作失败'
    return false
  } finally {
    busy.value = false
  }
}

function openCreateAlbum() {
  albumDraft.id = ''
  albumDraft.name = ''
  albumDraft.description = ''
  albumDraft.visibility = 'private'
  albumDialogVisible.value = true
}

function openEditAlbum(album: SharedAlbum) {
  albumDraft.id = album.id
  albumDraft.name = album.name
  albumDraft.description = album.description
  albumDraft.visibility = album.visibility
  albumDialogVisible.value = true
}

async function saveAlbum() {
  if (!albumDraft.name.trim()) {
    message.value = '相册名不能为空'
    return
  }

  const payload = {
    actor: session.state.user?.displayName || '未登录',
    name: albumDraft.name.trim(),
    description: albumDraft.description.trim(),
    visibility: albumDraft.visibility,
  }

  const ok = await mutate(
    () =>
      albumDraft.id
        ? updateAlbum(albumDraft.id, payload)
        : createAlbum(payload),
    albumDraft.id ? '相册已更新' : '相册已创建',
  )

  if (ok) {
    albumDialogVisible.value = false
  }
}

function openShareDialog() {
  if (!activeAlbum.value) {
    return
  }
  shareDraft.value = activeAlbum.value.members.map((item) => ({
    userId: item.userId,
    role: item.role,
  }))
  shareDialogVisible.value = true
}

function addMemberSlot() {
  const candidate = gallery.value.users.find(
    (user) => user.id !== session.state.user?.id && !shareDraft.value.some((item) => item.userId === user.id),
  )
  if (!candidate) {
    return
  }
  shareDraft.value.push({
    userId: candidate.id,
    role: 'viewer',
  })
}

async function saveShareMembers() {
  if (!activeAlbum.value) {
    return
  }
  const normalized = shareDraft.value.filter((item, index, list) => item.userId && list.findIndex((row) => row.userId === item.userId) === index)
  const ok = await mutate(() => updateAlbumMembers(activeAlbum.value!.id, normalized), '共享成员已更新')
  if (ok) {
    shareDialogVisible.value = false
  }
}

async function submitUpload() {
  if (!activeAlbum.value) {
    message.value = '先选一个相册'
    return
  }
  const files = uploadFiles.value.flatMap((item) => (item.raw ? [item.raw as File] : []))
  if (!files.length) {
    message.value = '先选择图片或视频'
    return
  }

  busy.value = true
  try {
    const items = await Promise.all(files.map((file) => extractMediaMeta(file)))
    gallery.value = await uploadAssets({
      actor: session.state.user?.displayName || '未登录',
      albumId: activeAlbum.value.id,
      files,
      items,
    })
    message.value = `已上传 ${files.length} 个文件`
    uploadFiles.value = []
    uploadDrawerVisible.value = false
  } catch (error) {
    message.value = error instanceof Error ? error.message : '上传失败'
  } finally {
    busy.value = false
  }
}

async function toggleAssetFavorite(asset: GalleryAsset) {
  await mutate(() => toggleFavorite(asset.id, session.state.user?.displayName || '未登录', !asset.isFavorite), '精选状态已更新')
}

async function removeAsset(asset: GalleryAsset) {
  if (!window.confirm(`确定删除「${asset.originalName}」吗？`)) {
    return
  }
  const ok = await mutate(() => deleteAsset(asset.id, session.state.user?.displayName || '未登录'), '文件已删除')
  if (ok) {
    viewerVisible.value = false
  }
}

async function sendComment() {
  if (!selectedAsset.value || !commentDraft.value.trim()) {
    return
  }

  const ok = await mutate(
    () =>
      addAssetComment({
        actor: session.state.user?.displayName || '未登录',
        assetId: selectedAsset.value!.id,
        content: commentDraft.value.trim(),
      }),
    '评论已发送',
  )

  if (ok) {
    commentDraft.value = ''
  }
}

function openViewer(asset: GalleryAsset) {
  selectedAssetId.value = asset.id
  viewerVisible.value = true
}

onMounted(() => {
  void loadGallery()
})
</script>

<template>
  <div class="album-page-simple">
    <section class="album-toolbar">
      <div class="album-toolbar__title">
        <p class="menu-section__eyebrow">Albums</p>
        <h2>{{ activeAlbum?.name || '相册' }}</h2>
        <p class="page-lead">
          {{ activeAlbum?.visibility === 'shared' ? '共享相册：只对成员开放。' : '私人相册：仅本人可见。' }}
        </p>
      </div>
      <div class="album-toolbar__actions">
        <el-input v-model="search" clearable placeholder="搜索文件名或描述" />
        <el-tag round>{{ message }}</el-tag>
        <el-button type="primary" plain @click="openCreateAlbum">
          <el-icon><Plus /></el-icon>
          新建相册
        </el-button>
      </div>
    </section>

    <section class="album-layout-simple">
      <aside class="album-surface">
        <div class="album-surface__head">
          <h3>我的相册</h3>
          <el-tag :type="gallery.storage.provider === 'cos' ? 'success' : 'info'" round>
            {{ gallery.storage.provider === 'cos' ? 'COS' : '本地模式' }}
          </el-tag>
        </div>
        <div class="album-list-simple">
          <button
            v-for="album in gallery.albums"
            :key="album.id"
            type="button"
            class="album-row"
            :class="{ 'album-row--active': activeAlbumId === album.id }"
            @click="activeAlbumId = album.id"
          >
            <div>
              <strong>{{ album.name }}</strong>
              <p>{{ album.visibility === 'shared' ? '共享' : '私有' }} · {{ album.assetCount }} 个文件</p>
            </div>
            <el-tag size="small" round>{{ album.currentRole }}</el-tag>
          </button>
        </div>
      </aside>

      <article class="album-surface">
        <div class="album-surface__head">
          <div>
            <h3>内容</h3>
            <p class="page-lead">{{ activeAlbum?.description || '当前相册没有说明。' }}</p>
          </div>
          <div class="album-head-actions">
            <el-button v-if="canEditAlbum" type="primary" plain @click="uploadDrawerVisible = true">上传</el-button>
            <el-button v-if="canManageAlbum" plain @click="openEditAlbum(activeAlbum!)">编辑</el-button>
            <el-button v-if="canManageAlbum && activeAlbum?.visibility === 'shared'" plain @click="openShareDialog">
              <el-icon><Share /></el-icon>
              成员
            </el-button>
          </div>
        </div>

        <div class="asset-grid-simple" v-loading="loading">
          <button
            v-for="asset in albumAssets"
            :key="asset.id"
            type="button"
            class="asset-tile"
            @click="openViewer(asset)"
          >
            <img v-if="asset.mediaType === 'image'" :src="asset.previewUrl" :alt="asset.originalName" />
            <video v-else :src="asset.previewUrl" muted playsinline preload="metadata" />
            <div class="asset-tile__meta">
              <strong>{{ asset.originalName }}</strong>
              <span>{{ formatFileSize(asset.sizeBytes) }}</span>
            </div>
          </button>
        </div>
      </article>
    </section>

    <el-drawer v-model="uploadDrawerVisible" title="上传到相册" size="min(560px, 92vw)">
      <div class="stack">
        <p class="page-lead">会保留原始图片和视频文件，不做压缩。</p>
        <el-upload
          v-model:file-list="uploadFiles"
          drag
          multiple
          :auto-upload="false"
          accept="image/*,video/*"
        >
          <div class="upload-tip">
            <strong>拖拽或点击选择文件</strong>
            <span>支持图片和视频，上传后可在线预览和下载。</span>
          </div>
        </el-upload>
        <el-button type="primary" :loading="busy" @click="submitUpload">开始上传</el-button>
      </div>
    </el-drawer>

    <el-dialog v-model="albumDialogVisible" :title="albumDraft.id ? '编辑相册' : '新建相册'" width="min(560px, 92vw)">
      <div class="stack">
        <el-input v-model="albumDraft.name" placeholder="相册名" />
        <el-input v-model="albumDraft.description" type="textarea" :rows="4" resize="none" placeholder="一句说明" />
        <el-radio-group v-model="albumDraft.visibility">
          <el-radio label="private">私有相册</el-radio>
          <el-radio label="shared">共享相册</el-radio>
        </el-radio-group>
      </div>
      <template #footer>
        <el-button @click="albumDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="busy" @click="saveAlbum">
          <el-icon><Check /></el-icon>
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="shareDialogVisible" title="共享成员" width="min(700px, 94vw)">
      <div class="stack">
        <el-alert title="共享相册只对这里列出的成员可见。" type="info" :closable="false" />
        <div v-for="(member, index) in shareDraft" :key="`${member.userId}-${index}`" class="share-row">
          <el-select v-model="member.userId" placeholder="选择用户">
            <el-option
              v-for="user in gallery.users.filter((item) => item.id !== session.state.user?.id)"
              :key="user.id"
              :label="`${user.displayName} (@${user.username})`"
              :value="user.id"
            />
          </el-select>
          <el-select v-model="member.role">
            <el-option label="可编辑" value="editor" />
            <el-option label="仅查看" value="viewer" />
          </el-select>
          <el-button text @click="shareDraft.splice(index, 1)">移除</el-button>
        </div>
        <el-button plain @click="addMemberSlot">添加成员</el-button>
      </div>
      <template #footer>
        <el-button @click="shareDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="busy" @click="saveShareMembers">保存共享成员</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="viewerVisible" width="min(1180px, 96vw)">
      <div v-if="selectedAsset" class="viewer-simple">
        <div class="viewer-simple__media">
          <img v-if="selectedAsset.mediaType === 'image'" :src="selectedAsset.previewUrl" :alt="selectedAsset.originalName" />
          <video v-else :src="selectedAsset.previewUrl" controls playsinline preload="metadata" />
        </div>
        <div class="viewer-simple__side">
          <div class="viewer-simple__head">
            <div>
              <p class="menu-section__eyebrow">{{ activeAlbum?.visibility === 'shared' ? 'Shared' : 'Private' }}</p>
              <h3>{{ selectedAsset.originalName }}</h3>
            </div>
            <div class="viewer-actions">
              <el-button plain @click="toggleAssetFavorite(selectedAsset)">
                <el-icon><Star /></el-icon>
              </el-button>
              <a :href="selectedAsset.downloadUrl" target="_blank" rel="noreferrer">
                <el-button plain>
                  <el-icon><Download /></el-icon>
                </el-button>
              </a>
              <el-button v-if="canEditAlbum" plain @click="removeAsset(selectedAsset)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="viewer-meta">
            <span>{{ formatDateTime(selectedAsset.createdAt) }}</span>
            <span>{{ formatFileSize(selectedAsset.sizeBytes) }}</span>
            <span>{{ selectedAsset.width && selectedAsset.height ? `${selectedAsset.width} × ${selectedAsset.height}` : '原文件' }}</span>
          </div>
          <div class="comment-box">
            <div v-for="comment in selectedComments" :key="comment.id" class="comment-line">
              <strong>{{ comment.author }}</strong>
              <span>{{ comment.content }}</span>
            </div>
            <div class="comment-input">
              <el-input v-model="commentDraft" placeholder="补一句评论" />
              <el-button plain @click="sendComment">发送</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.album-page-simple,
.album-layout-simple,
.album-surface,
.album-list-simple,
.asset-grid-simple,
.stack {
  display: grid;
  gap: 16px;
}

.album-toolbar,
.album-surface,
.album-row,
.asset-tile {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(36, 30, 26, 0.08);
}

.album-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
}

.album-toolbar__actions,
.album-surface__head,
.album-head-actions,
.share-row,
.comment-input,
.viewer-simple__head,
.viewer-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.album-layout-simple {
  grid-template-columns: 320px minmax(0, 1fr);
}

.album-surface {
  padding: 18px;
}

.album-surface__head {
  justify-content: space-between;
}

.album-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  padding: 14px;
  cursor: pointer;
}

.album-row--active {
  border-color: rgba(181, 91, 55, 0.4);
  background: rgba(255, 247, 240, 0.9);
}

.album-row p,
.asset-tile__meta span,
.viewer-meta {
  color: var(--muted);
}

.asset-grid-simple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.asset-tile {
  overflow: hidden;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.asset-tile img,
.asset-tile video {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  display: block;
}

.asset-tile__meta {
  display: grid;
  gap: 4px;
  padding: 12px;
}

.upload-tip {
  display: grid;
  gap: 4px;
}

.viewer-simple {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) 360px;
  gap: 18px;
}

.viewer-simple__media {
  overflow: hidden;
  border-radius: 22px;
  background: rgba(16, 16, 16, 0.92);
}

.viewer-simple__media img,
.viewer-simple__media video {
  width: 100%;
  max-height: 78vh;
  object-fit: contain;
}

.viewer-simple__side,
.comment-box {
  display: grid;
  gap: 12px;
}

.viewer-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  font-size: 0.88rem;
}

.comment-line {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(247, 242, 236, 0.9);
}

@media (max-width: 1180px) {
  .album-layout-simple,
  .viewer-simple {
    grid-template-columns: 1fr;
  }

  .asset-grid-simple {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .album-toolbar,
  .album-toolbar__actions,
  .album-surface__head,
  .album-head-actions,
  .share-row,
  .comment-input,
  .viewer-simple__head,
  .viewer-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .asset-grid-simple {
    grid-template-columns: 1fr;
  }
}
</style>
