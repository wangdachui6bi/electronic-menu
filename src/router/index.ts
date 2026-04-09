import { createRouter, createWebHistory } from 'vue-router'
import { useSession } from '../services/session'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/auth',
      name: 'auth',
      component: () => import('../pages/AuthPage.vue'),
      meta: { title: '登录' },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../pages/HomePage.vue'),
      meta: { title: '工作台', requiresAuth: true },
    },
    {
      path: '/menu',
      name: 'menu',
      component: () => import('../pages/MenuPage.vue'),
      meta: { title: '菜单', requiresAuth: true },
    },
    {
      path: '/album',
      name: 'album',
      component: () => import('../pages/AlbumPage.vue'),
      meta: { title: '相册', requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../pages/SettingsPage.vue'),
      meta: { title: '权限管理', requiresAuth: true },
    },
  ],
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  },
})

router.afterEach((to) => {
  document.title = `${String(to.meta.title || '同住工具箱')} · 同住工具箱`
})

router.beforeEach(async (to) => {
  const session = useSession()

  if (!session.state.bootstrapped) {
    await session.hydrate()
  }

  if (to.meta.requiresAuth && !session.state.user) {
    return { path: '/auth', query: { redirect: to.fullPath } }
  }

  if (to.path === '/auth' && session.state.user) {
    return '/'
  }

  return true
})

export default router
