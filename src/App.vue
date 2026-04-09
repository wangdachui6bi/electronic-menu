<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { Camera, Dish, House, Setting, SwitchButton } from '@element-plus/icons-vue'
import { useSession } from './services/session'

const route = useRoute()
const router = useRouter()
const session = useSession()

const navItems = computed(() => {
  const user = session.state.user
  if (!user) return []

  return [
    { path: '/', label: '工作台', icon: House, visible: true },
    { path: '/menu', label: '菜单', icon: Dish, visible: user.menuPermissions.menuView },
    { path: '/album', label: '相册', icon: Camera, visible: true },
    { path: '/settings', label: '权限', icon: Setting, visible: user.isOwner || user.menuPermissions.managePermissions },
  ].filter((item) => item.visible)
})

const heading = computed(() => String(route.meta.title || '同住工具箱'))

async function handleLogout() {
  await session.signOut()
  await router.replace('/auth')
}

onMounted(async () => {
  if (!session.state.bootstrapped) {
    await session.hydrate()
  }
})
</script>

<template>
  <template v-if="session.state.user">
    <div class="app-frame">
      <!-- Desktop sidebar -->
      <aside class="app-rail">
        <RouterLink to="/" class="app-brand">
          <strong>同住工具箱</strong>
        </RouterLink>

        <nav class="app-nav" aria-label="主导航">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="app-nav__item"
            :class="{ 'app-nav__item--active': route.path === item.path }"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>

        <div class="app-rail__footer">
          <div class="app-user">
            <strong>{{ session.state.user.displayName }}</strong>
            <span>@{{ session.state.user.username }}</span>
          </div>
          <button class="logout-btn" @click="handleLogout">
            <el-icon><SwitchButton /></el-icon>
            退出
          </button>
        </div>
      </aside>

      <!-- Mobile header -->
      <header class="app-mobile-header">
        <strong class="app-mobile-brand">同住工具箱</strong>
        <button class="logout-btn" @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
        </button>
      </header>

      <div class="app-workspace">
        <header class="workspace-topbar">
          <h1>{{ heading }}</h1>
        </header>

        <main class="workspace-main">
          <RouterView />
        </main>
      </div>

      <!-- Mobile bottom tab bar -->
      <nav class="app-tabbar" aria-label="底部导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="app-tabbar__item"
          :class="{ 'app-tabbar__item--active': route.path === item.path }"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </div>
  </template>

  <main v-else class="auth-main">
    <RouterView />
  </main>
</template>
