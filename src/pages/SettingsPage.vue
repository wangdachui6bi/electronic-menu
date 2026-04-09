<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchUsers, updateMenuPermissions } from '../api/auth'
import { useSession } from '../services/session'
import type { AuthUser, MenuPermissions } from '../types/app'

const session = useSession()
const loading = ref(true)
const users = ref<AuthUser[]>([])
const savingUserId = ref('')

const permissionLabels: Array<{ key: keyof MenuPermissions; label: string }> = [
  { key: 'menuView', label: '浏览菜单' },
  { key: 'submitRequest', label: '点单' },
  { key: 'comment', label: '评论' },
  { key: 'manageDishes', label: '维护菜品' },
  { key: 'manageRequests', label: '修改状态' },
  { key: 'managePermissions', label: '管理权限' },
]

const canManage = computed(() => Boolean(session.state.user?.isOwner || session.state.user?.menuPermissions.managePermissions))

async function loadUsers() {
  loading.value = true
  try {
    users.value = (await fetchUsers()).items
  } finally {
    loading.value = false
  }
}

async function togglePermission(user: AuthUser, permissionKey: keyof MenuPermissions, checked: boolean | string | number) {
  const nextPermissions = {
    ...user.menuPermissions,
    [permissionKey]: Boolean(checked),
  }

  savingUserId.value = user.id
  try {
    users.value = (await updateMenuPermissions(user.id, nextPermissions)).items
  } finally {
    savingUserId.value = ''
  }
}

onMounted(() => {
  void loadUsers()
})
</script>

<template>
  <div class="settings-page" v-loading="loading">
    <section v-if="canManage" class="settings-users">
      <article v-for="user in users" :key="user.id" class="settings-user">
        <div class="settings-user__head">
          <div>
            <strong>{{ user.displayName }}</strong>
            <span>@{{ user.username }}</span>
          </div>
          <el-tag :type="user.isOwner ? 'warning' : 'info'" round size="small">
            {{ user.isOwner ? 'Owner' : 'Member' }}
          </el-tag>
        </div>

        <div class="settings-permissions">
          <label v-for="permission in permissionLabels" :key="permission.key" class="settings-permission">
            <span>{{ permission.label }}</span>
            <el-switch
              :disabled="user.isOwner"
              :loading="savingUserId === user.id"
              :model-value="user.menuPermissions[permission.key]"
              @change="togglePermission(user, permission.key, $event)"
            />
          </label>
        </div>
      </article>
    </section>

    <el-empty v-else description="无权限" />
  </div>
</template>

<style scoped>
.settings-page,
.settings-users {
  display: grid;
  gap: 14px;
}

.settings-user {
  display: grid;
  gap: 16px;
  padding: 20px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(36, 30, 26, 0.07);
}

.settings-user__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.settings-user__head strong {
  display: block;
  font-size: 0.95rem;
}

.settings-user__head span {
  color: var(--muted);
  font-size: 0.82rem;
}

.settings-permissions {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}

.settings-permission {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(247, 242, 236, 0.9);
  font-size: 0.88rem;
}

@media (max-width: 640px) {
  .settings-permissions {
    grid-template-columns: 1fr;
  }

  .settings-user {
    padding: 16px;
  }
}
</style>
