<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSession } from '../services/session'

const route = useRoute()
const router = useRouter()
const session = useSession()

const loading = ref(false)
const errorMessage = ref('')
const form = reactive({ username: '', password: '' })

async function submit() {
  errorMessage.value = ''
  loading.value = true
  try {
    await session.signIn({ username: form.username, password: form.password })
    await router.replace(String(route.query.redirect || '/'))
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败'
  } finally {
    loading.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && form.username && form.password) submit()
}
</script>

<template>
  <section class="auth-page" @keydown="onKeydown">
    <div class="auth-card">
      <div class="auth-brand">
        <strong>同住工具箱</strong>
      </div>

      <div class="auth-form">
        <el-input
          v-model="form.username"
          placeholder="用户名"
          size="large"
          :prefix-icon="UserIcon"
          autofocus
        />
        <el-input
          v-model="form.password"
          type="password"
          show-password
          placeholder="密码"
          size="large"
          :prefix-icon="LockIcon"
        />
        <Transition name="auth-error">
          <el-alert
            v-if="errorMessage"
            :title="errorMessage"
            type="error"
            :closable="false"
            show-icon
          />
        </Transition>
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          :disabled="!form.username || !form.password"
          @click="submit"
        >
          登录
        </el-button>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { Lock as LockIcon, User as UserIcon } from '@element-plus/icons-vue'
export default { components: { LockIcon, UserIcon } }
</script>

<style scoped>
.auth-page {
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 380px;
  padding: 36px 32px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(36, 30, 26, 0.07);
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow);
  animation: auth-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes auth-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
}

.auth-brand {
  text-align: center;
  margin-bottom: 32px;
}

.auth-brand strong {
  font-size: 1.4rem;
  letter-spacing: -0.02em;
}

.auth-form {
  display: grid;
  gap: 14px;
}

.auth-form .el-button {
  margin-top: 4px;
}

.auth-error-enter-active {
  transition: all 0.3s ease;
}

.auth-error-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 480px) {
  .auth-card {
    padding: 28px 22px;
    border-radius: 20px;
  }
}
</style>
