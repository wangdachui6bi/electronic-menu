<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchGalleryBootstrap } from '../api/gallery'
import { fetchBootstrap as fetchMenuBootstrap } from '../api/menu'
import { useSession } from '../services/session'

const session = useSession()
const loading = ref(true)
const metrics = ref({
  menuDishes: 0,
  pendingRequests: 0,
  albums: 0,
  assets: 0,
})

async function loadOverview() {
  loading.value = true
  try {
    const [menu, gallery] = await Promise.all([fetchMenuBootstrap(), fetchGalleryBootstrap()])
    metrics.value = {
      menuDishes: menu.dishes.length,
      pendingRequests: menu.requests.filter((item) => item.status === 'pending').length,
      albums: gallery.albums.length,
      assets: gallery.assets.length,
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadOverview()
})
</script>

<template>
  <div class="dashboard-page">
    <section class="dashboard-greeting">
      <h2>{{ session.state.user?.displayName }}</h2>
      <el-tag :type="session.state.user?.isOwner ? 'warning' : 'info'" round size="small">
        {{ session.state.user?.isOwner ? 'Owner' : 'Member' }}
      </el-tag>
    </section>

    <section class="dashboard-grid" v-loading="loading">
      <RouterLink to="/menu" class="dashboard-card">
        <div class="dashboard-card__head">
          <h3>菜单</h3>
        </div>
        <div class="dashboard-card__metrics">
          <div>
            <strong>{{ metrics.pendingRequests }}</strong>
            <span>待安排</span>
          </div>
          <div>
            <strong>{{ metrics.menuDishes }}</strong>
            <span>菜品</span>
          </div>
        </div>
      </RouterLink>

      <RouterLink to="/album" class="dashboard-card">
        <div class="dashboard-card__head">
          <h3>相册</h3>
        </div>
        <div class="dashboard-card__metrics">
          <div>
            <strong>{{ metrics.albums }}</strong>
            <span>相册</span>
          </div>
          <div>
            <strong>{{ metrics.assets }}</strong>
            <span>文件</span>
          </div>
        </div>
      </RouterLink>

      <RouterLink
        v-if="session.state.user?.isOwner || session.state.user?.menuPermissions.managePermissions"
        to="/settings"
        class="dashboard-card dashboard-card--compact"
      >
        <h3>权限管理</h3>
        <span class="dashboard-card__arrow">→</span>
      </RouterLink>
    </section>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 20px;
}

.dashboard-greeting {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dashboard-greeting h2 {
  margin: 0;
  font-size: 1.4rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.dashboard-card {
  display: grid;
  gap: 16px;
  padding: 20px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(36, 30, 26, 0.07);
  transition: background 0.2s, transform 0.15s;
  cursor: pointer;
}

.dashboard-card:hover {
  background: rgba(255, 255, 255, 0.88);
  transform: translateY(-1px);
}

.dashboard-card h3 {
  margin: 0;
  font-size: 1rem;
}

.dashboard-card__metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.dashboard-card__metrics div {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(247, 242, 236, 0.9);
}

.dashboard-card__metrics strong {
  font-size: 1.6rem;
}

.dashboard-card__metrics span {
  color: var(--muted);
  font-size: 0.85rem;
}

.dashboard-card--compact {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
}

.dashboard-card__arrow {
  color: var(--muted);
  font-size: 1.2rem;
  transition: transform 0.2s;
}

.dashboard-card--compact:hover .dashboard-card__arrow {
  transform: translateX(4px);
}

@media (max-width: 640px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-greeting h2 {
    font-size: 1.2rem;
  }
}
</style>
