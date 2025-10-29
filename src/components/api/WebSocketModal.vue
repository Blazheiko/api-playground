<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWebSocket } from '@/composables/useWebSocket'

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const {
  connect,
  disconnect,
  ping,
  isConnected,
  isConnecting,
  error,
  url,
  connectionStatus,
  statusColor,
  statusText,
  lastMessage,
} = useWebSocket()

const wsUrl = ref('ws://localhost:8080')
const isLoading = ref(false)

// Сохраняем URL в localStorage
watch(
  wsUrl,
  (newUrl) => {
    localStorage.setItem('websocket-url', newUrl)
  },
  { immediate: false },
)

// Загружаем URL из localStorage при открытии модалки
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      const savedUrl = localStorage.getItem('websocket-url')
      if (savedUrl) {
        wsUrl.value = savedUrl
      }
    }
  },
)

const handleConnect = async () => {
  if (!wsUrl.value.trim()) {
    return
  }

  try {
    isLoading.value = true
    await connect(wsUrl.value.trim())
  } catch (error) {
    console.error('Connection failed:', error)
  } finally {
    isLoading.value = false
  }
}

const handleDisconnect = () => {
  disconnect()
}

const handlePing = () => {
  ping()
}

const handleClose = () => {
  emit('close')
}

const handleBackdropClick = (event: Event) => {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click="handleBackdropClick"
  >
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all"
      @click.stop
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">WebSocket Connection</h3>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Connection Status -->
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
          <div class="flex items-center space-x-2">
            <div class="flex items-center space-x-1">
              <div
                class="w-2 h-2 rounded-full"
                :class="{
                  'bg-green-500': connectionStatus === 'connected',
                  'bg-yellow-500': connectionStatus === 'connecting',
                  'bg-red-500': connectionStatus === 'error',
                  'bg-gray-400': connectionStatus === 'disconnected',
                }"
              ></div>
              <span class="text-sm font-medium" :class="statusColor">
                {{ statusText }}
              </span>
            </div>
          </div>
        </div>

        <!-- Current URL Display -->
        <div v-if="url" class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p class="text-sm text-blue-700 dark:text-blue-300">
            <span class="font-medium">Current URL:</span> {{ url }}
          </p>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p class="text-sm text-red-700 dark:text-red-300">
            <span class="font-medium">Error:</span> {{ error }}
          </p>
        </div>

        <!-- URL Input -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            WebSocket URL
          </label>
          <input
            v-model="wsUrl"
            type="text"
            placeholder="ws://localhost:8080"
            :disabled="isConnected || isLoading"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        <!-- Last Message -->
        <div v-if="lastMessage" class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Last Message
          </label>
          <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <pre class="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{
              JSON.stringify(lastMessage, null, 2)
            }}</pre>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 space-x-3"
      >
        <!-- Connection Controls -->
        <div class="flex space-x-2">
          <button
            v-if="!isConnected"
            @click="handleConnect"
            :disabled="!wsUrl.trim() || isLoading"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors focus:ring-2 focus:ring-green-500 focus:outline-none"
          >
            <span v-if="isLoading || isConnecting">Connecting...</span>
            <span v-else>Connect</span>
          </button>

          <button
            v-if="isConnected"
            @click="handleDisconnect"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none"
          >
            Disconnect
          </button>

          <button
            v-if="isConnected"
            @click="handlePing"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            Ping
          </button>
        </div>

        <!-- Close Button -->
        <button
          @click="handleClose"
          class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors focus:ring-2 focus:ring-gray-500 focus:outline-none"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
