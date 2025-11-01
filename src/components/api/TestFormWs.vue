<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import type { ApiRoute } from '@/stores/api-doc'
import { validateJSON } from '@/utils/api-helpers'
import baseApi from '@/utils/base-api'
import { useWebSocket } from '@/composables/useWebSocket'
import { useApiSettingsStore } from '@/stores/api-settings'

interface Props {
  route: ApiRoute
  groupPrefix: string
}

const props = defineProps<Props>()

const apiSettingsStore = useApiSettingsStore()
const {
  connect,
  // disconnect,
  isConnected,
  isConnecting,
  error: wsError,
  statusColor,
  statusText,
  connectionStatus,
} = useWebSocket()

// Форма данных
const wsUrl = ref('')
const body = ref('{\n  "message": "Hello WebSocket!"\n}')
const bodyError = ref<string>('')
const isLoading = ref(false)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const testResult = ref<any>(null)

// Инициализация URL WebSocket на основе настроек API
onMounted(() => {
  const settings = apiSettingsStore.settings
  if (settings.baseUrl) {
    // Преобразуем HTTP URL в WebSocket URL
    const wsBaseUrl = settings.baseUrl
      .replace(/^https?:\/\//, 'ws://')
      .replace(/^http:\/\//, 'ws://')
    wsUrl.value = wsBaseUrl
  }
})

// Очистка при размонтировании
// onUnmounted(() => {
//   disconnect()
// })

const validateBody = () => {
  const result = validateJSON(body.value)
  bodyError.value = result.error || ''
  return result
}

const connectWebSocket = async () => {
  if (!wsUrl.value) {
    testResult.value = {
      success: false,
      error: true,
      message: 'WebSocket URL is required',
    }
    return
  }

  try {
    await connect(wsUrl.value)

    // // Устанавливаем WebSocket клиент в base-api
    // const wsInstance = getInstance()
    // if (wsInstance) {
    //   baseApi.setWebSocketClient(wsInstance)
    // }

    testResult.value = {
      success: true,
      message: 'WebSocket connected successfully',
      url: wsUrl.value,
      status: 'Connected',
    }
  } catch (error) {
    testResult.value = {
      success: false,
      error: true,
      message: 'Failed to connect to WebSocket',
      details: error instanceof Error ? error.message : 'Unknown error',
      url: wsUrl.value,
    }
  }
}

// const disconnectWebSocket = () => {
//   disconnect()
//   // baseApi.setWebSocketClient(null)
//   testResult.value = {
//     success: true,
//     message: 'WebSocket disconnected',
//     status: 'Disconnected',
//   }
// }

const sendWebSocketMessage = async () => {
  const bodyValidation = validateBody()

  if (!bodyValidation.isValid) {
    return
  }

  if (!isConnected.value) {
    testResult.value = {
      success: false,
      error: true,
      message: 'WebSocket is not connected. Please connect first.',
    }
    return
  }

  isLoading.value = true
  testResult.value = null

  try {
    const startTime = Date.now()

    // Используем base-api для отправки WebSocket сообщения
    const response = await baseApi.ws(
      props.route.url,
      bodyValidation.data as Record<string, unknown>,
    )

    const endTime = Date.now()
    const responseTime = endTime - startTime

    testResult.value = {
      success: true,
      status: response?.status || 200,
      statusText: 'WebSocket Response',
      data: response,
      responseTime,
      url: props.route.url,
      method: 'WebSocket',
      requestBody: bodyValidation.data,
      wsUrl: wsUrl.value,
    }
  } catch (error) {
    const endTime = Date.now()
    const responseTime = endTime - Date.now()

    testResult.value = {
      success: false,
      status: 0,
      statusText: 'WebSocket Error',
      data: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      error: true,
      url: props.route.url,
      method: 'WebSocket',
      requestBody: bodyValidation.data,
      wsUrl: wsUrl.value,
    }
  } finally {
    isLoading.value = false

    if (testResult.value) {
      await scrollToResponse()
    }
  }
}

const scrollToResponse = async () => {
  await nextTick()

  setTimeout(() => {
    // Сначала пытаемся найти блок Response Body, если он есть
    const responseBodyElement = document.getElementById('ws-response-body')
    const responseElement = document.getElementById('ws-response-section')

    const targetElement = responseBodyElement || responseElement

    if (targetElement) {
      // Используем getBoundingClientRect для более точного позиционирования
      const rect = targetElement.getBoundingClientRect()
      const mainContent = document.querySelector('main')

      if (mainContent) {
        // Вычисляем позицию для скролла так, чтобы элемент был в верхней части видимой области
        const scrollTop = mainContent.scrollTop + rect.top - 120 // 120px отступ сверху

        mainContent.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: 'smooth',
        })
      } else {
        // Fallback к стандартному scrollIntoView
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        })
      }
    }
  }, 150)
}

const clearResult = () => {
  testResult.value = null
}

const responseBodyDisplay = computed(() => {
  const data = testResult.value?.data
  if (data === undefined) return ''
  return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
})
</script>

<template>
  <div id="ws-test-form" class="test-form-section flex-1">
    <div class="border-t dark:border-gray-600 pt-3 mt-3">
      <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
        <svg
          :class="[
            'h-5 w-5 transition-colors duration-200',
            {
              'text-green-600 dark:text-green-400': connectionStatus === 'connected',
              'text-yellow-600 dark:text-yellow-400': connectionStatus === 'connecting',
              'text-red-600 dark:text-red-400': connectionStatus === 'error',
              'text-gray-600 dark:text-gray-400': connectionStatus === 'disconnected',
            },
          ]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
          ></path>
        </svg>
        WebSocket Testing
      </h5>

      <!-- WebSocket Connection Section -->
      <div class="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-600">
        <div class="flex items-center justify-between mb-3">
          <h6 class="font-medium text-gray-700 dark:text-gray-300">WebSocket Connection</h6>
          <div class="flex items-center gap-2">
            <div :class="['w-2 h-2 rounded-full', statusColor]"></div>
            <span :class="['text-sm font-medium', statusColor]">{{ statusText }}</span>
          </div>
        </div>

        <div class="space-y-3">
          <!-- WebSocket URL -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              WebSocket URL
            </label>
            <input
              type="text"
              v-model="wsUrl"
              placeholder="ws://localhost:8080"
              :disabled="isConnected || isConnecting"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-50"
            />
          </div>

          <!-- Connection Buttons -->
          <div class="flex gap-2">
            <button
              type="button"
              @click="connectWebSocket"
              :disabled="isConnected || isConnecting || !wsUrl"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <svg
                v-if="isConnecting"
                class="h-4 w-4 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                ></path>
              </svg>
              <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                ></path>
              </svg>
              {{ isConnecting ? 'Connecting...' : 'Connect' }}
            </button>
            <!-- <button
              type="button"
              @click="disconnectWebSocket"
              :disabled="!isConnected"
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-200 focus:ring-2 focus:ring-red-500 focus:outline-none flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
              Disconnect
            </button> -->
          </div>

          <!-- Connection Error -->
          <div
            v-if="wsError"
            class="p-2 bg-red-50 dark:bg-red-900 rounded border border-red-200 dark:border-red-800"
          >
            <p class="text-red-700 dark:text-red-300 text-sm">{{ wsError }}</p>
          </div>
        </div>
      </div>

      <!-- Message Testing Form -->
      <form class="space-y-3" @submit.prevent="sendWebSocketMessage">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Route: <code class="text-blue-600 dark:text-blue-400">{{ route.url }}</code>
          </label>
        </div>

        <!-- Message Body -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Message Body (JSON format)
          </label>
          <textarea
            v-model="body"
            @input="validateBody"
            rows="6"
            placeholder='{"key": "value"}'
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
            :class="{ 'json-invalid': bodyError, 'json-valid': !bodyError && body }"
          ></textarea>
          <div v-if="bodyError" class="json-error-message">JSON Error: {{ bodyError }}</div>
        </div>

        <!-- Send Button -->
        <div class="flex gap-3">
          <button
            type="submit"
            :disabled="isLoading || !isConnected"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-200 focus:ring-2 focus:ring-green-500 focus:outline-none flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              ></path>
            </svg>
            {{ isLoading ? 'Sending...' : 'Send Message' }}
          </button>
          <button
            type="button"
            @click="clearResult"
            class="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors duration-200 text-sm flex items-center justify-center whitespace-nowrap"
          >
            Clear Result
          </button>
        </div>
      </form>

      <!-- Response Section -->
      <div id="ws-response-section" v-if="testResult" class="test-result-section mt-4">
        <div class="border-t dark:border-gray-600 pt-3">
          <h6 class="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <svg
              class="h-4 w-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
            WebSocket Response
          </h6>

          <!-- Error Display -->
          <div
            v-if="testResult.error"
            class="p-4 bg-red-50 dark:bg-red-900 rounded-lg border border-red-200 dark:border-red-800"
          >
            <div class="flex items-center gap-2 mb-2">
              <svg
                class="h-5 w-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <h6 class="font-semibold text-red-800 dark:text-red-200">Error</h6>
            </div>
            <p class="text-red-700 dark:text-red-300 text-sm mb-2">{{ testResult.message }}</p>
            <p v-if="testResult.details" class="text-red-600 dark:text-red-400 text-xs font-mono">
              {{ testResult.details }}
            </p>
            <p v-if="testResult.url" class="text-gray-600 dark:text-gray-400 text-xs mt-2">
              {{ testResult.method }} {{ testResult.url }}
            </p>
            <p v-if="testResult.wsUrl" class="text-gray-600 dark:text-gray-400 text-xs">
              WebSocket: {{ testResult.wsUrl }}
            </p>
          </div>

          <!-- Success Response Display -->
          <div v-else class="space-y-4">
            <!-- Status Info -->
            <div
              :class="[
                'flex flex-wrap items-center gap-4 p-3 rounded-lg border',
                testResult.success
                  ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800',
              ]"
            >
              <div class="flex items-center gap-2">
                <svg
                  :class="['h-5 w-5', testResult.success ? 'text-green-600' : 'text-red-600']"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    v-if="testResult.success"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                  <path
                    v-else
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span
                  :class="[
                    'font-semibold',
                    testResult.success
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200',
                  ]"
                >
                  {{ testResult.status }} {{ testResult.statusText }}
                </span>
              </div>
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ testResult.responseTime }}ms • {{ testResult.method }} {{ testResult.url }}
              </span>
              <span v-if="testResult.wsUrl" class="text-xs text-gray-500 dark:text-gray-400">
                via {{ testResult.wsUrl }}
              </span>
            </div>

            <!-- Request Details -->
            <details class="bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-600">
              <summary
                class="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Request Details
              </summary>
              <div class="px-3 pb-3 space-y-2">
                <div v-if="testResult.requestBody">
                  <h6 class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Message Body
                  </h6>
                  <pre
                    class="text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"
                  ><code>{{ JSON.stringify(testResult.requestBody, null, 2) }}</code></pre>
                </div>
              </div>
            </details>

            <!-- Response Body -->
            <div id="ws-response-body" v-if="testResult.data !== undefined">
              <h6
                class="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"
              >
                Response Body
              </h6>
              <pre
                class="text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-3 rounded border dark:border-gray-600 overflow-x-auto max-h-80 overflow-y-auto"
              ><code>{{ responseBodyDisplay }}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-invalid {
  @apply border-red-500 bg-red-50 dark:bg-red-900;
}

.json-valid {
  @apply border-green-500 bg-green-50 dark:bg-green-900;
}

.json-error-message {
  @apply text-red-600 dark:text-red-400 text-xs mt-1;
}
</style>
