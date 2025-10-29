<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useApiSettingsStore } from '@/stores/api-settings'
import { checkServerHealth } from '@/utils/base-api'

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const apiSettingsStore = useApiSettingsStore()

// Локальные состояния для формы
const localBaseUrl = ref(apiSettingsStore.baseUrl)
const localHeaders = ref<Array<{ key: string; value: string }>>([])
const serverStatus = ref<'checking' | 'online' | 'offline' | null>(null)

// Преобразование объекта заголовков в массив для удобства редактирования
const convertHeadersToArray = () => {
  localHeaders.value = Object.entries(apiSettingsStore.globalHeaders).map(([key, value]) => ({
    key,
    value,
  }))

  // Добавляем пустую строку для нового заголовка
  if (
    localHeaders.value.length === 0 ||
    localHeaders.value[localHeaders.value.length - 1]?.key !== ''
  ) {
    localHeaders.value.push({ key: '', value: '' })
  }
}

// Следим за изменениями в store
watch(() => apiSettingsStore.globalHeaders, convertHeadersToArray, { immediate: true })
watch(
  () => apiSettingsStore.baseUrl,
  (newUrl) => {
    localBaseUrl.value = newUrl
  },
  { immediate: true },
)

// Следим за открытием модального окна
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      localBaseUrl.value = apiSettingsStore.baseUrl
      convertHeadersToArray()
    }
  },
)

const isValidUrl = computed(() => {
  try {
    new URL(localBaseUrl.value)
    return true
  } catch {
    return localBaseUrl.value.startsWith('http://') || localBaseUrl.value.startsWith('https://')
  }
})

const addHeaderRow = () => {
  localHeaders.value.push({ key: '', value: '' })
}

const removeHeaderRow = (index: number) => {
  localHeaders.value.splice(index, 1)
  if (localHeaders.value.length === 0) {
    addHeaderRow()
  }
}

const handleHeaderKeyChange = (index: number, newKey: string) => {
  if (localHeaders.value[index]) {
    localHeaders.value[index].key = newKey
  }

  // Добавляем новую пустую строку, если последняя строка заполнена
  const lastIndex = localHeaders.value.length - 1
  if (index === lastIndex && newKey !== '' && localHeaders.value[lastIndex]?.value !== '') {
    addHeaderRow()
  }
}

const handleHeaderValueChange = (index: number, newValue: string) => {
  if (localHeaders.value[index]) {
    localHeaders.value[index].value = newValue
  }

  // Добавляем новую пустую строку, если последняя строка заполнена
  const lastIndex = localHeaders.value.length - 1
  if (index === lastIndex && newValue !== '' && localHeaders.value[lastIndex]?.key !== '') {
    addHeaderRow()
  }
}

const saveSettings = () => {
  // Сохраняем базовый URL
  apiSettingsStore.setBaseUrl(localBaseUrl.value)

  // Преобразуем массив заголовков обратно в объект
  const headersObject: Record<string, string> = {}
  localHeaders.value.forEach(({ key, value }) => {
    if (key.trim() && value.trim()) {
      headersObject[key.trim()] = value.trim()
    }
  })

  apiSettingsStore.setGlobalHeaders(headersObject)
  emit('close')
}

const resetToDefaults = () => {
  apiSettingsStore.resetToDefaults()
  localBaseUrl.value = apiSettingsStore.baseUrl
  convertHeadersToArray()
}

const closeModal = () => {
  emit('close')
}

const checkServer = async () => {
  if (!localBaseUrl.value) return

  serverStatus.value = 'checking'
  try {
    const isOnline = await checkServerHealth(localBaseUrl.value)
    serverStatus.value = isOnline ? 'online' : 'offline'
  } catch {
    serverStatus.value = 'offline'
  }
}

const getServerStatusColor = () => {
  switch (serverStatus.value) {
    case 'checking':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'online':
      return 'text-green-600 dark:text-green-400'
    case 'offline':
      return 'text-red-600 dark:text-red-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

const getServerStatusText = () => {
  switch (serverStatus.value) {
    case 'checking':
      return 'Checking...'
    case 'online':
      return 'Server is online'
    case 'offline':
      return 'Server is offline'
    default:
      return 'Click to check'
  }
}
</script>

<template>
  <!-- Backdrop -->
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    @click="closeModal"
  >
    <!-- Modal -->
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      @click.stop
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
      >
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">API Settings</h2>
        <button
          @click="closeModal"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
        <!-- Base URL Section -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Base URL
          </label>
          <input
            v-model="localBaseUrl"
            type="text"
            placeholder="http://127.0.0.1:8088"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            :class="{ 'border-red-500 dark:border-red-500': !isValidUrl }"
          />
          <p v-if="!isValidUrl" class="mt-1 text-sm text-red-600 dark:text-red-400">
            Please enter a valid URL
          </p>

          <!-- Server Status Check -->
          <div class="mt-3 flex items-center justify-between">
            <button
              @click="checkServer"
              :disabled="!isValidUrl || serverStatus === 'checking'"
              class="flex items-center space-x-2 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                v-if="serverStatus === 'checking'"
                class="animate-spin h-4 w-4 text-yellow-600 dark:text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <svg
                v-else
                class="h-4 w-4 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span>Test Connection</span>
            </button>

            <span :class="getServerStatusColor()" class="text-sm font-medium">
              {{ getServerStatusText() }}
            </span>
          </div>
        </div>

        <!-- Global Headers Section -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Global Headers
            </label>
            <div class="flex items-center space-x-2">
              <label class="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  :checked="apiSettingsStore.enableGlobalHeaders"
                  @change="
                    apiSettingsStore.setEnableGlobalHeaders(
                      ($event.target as HTMLInputElement).checked,
                    )
                  "
                  class="sr-only"
                />
                <div class="relative">
                  <div
                    class="block bg-gray-300 dark:bg-gray-600 w-10 h-6 rounded-full transition-colors"
                    :class="{ 'bg-primary-600': apiSettingsStore.enableGlobalHeaders }"
                  ></div>
                  <div
                    class="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform"
                    :class="{ 'transform translate-x-4': apiSettingsStore.enableGlobalHeaders }"
                  ></div>
                </div>
                <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {{ apiSettingsStore.enableGlobalHeaders ? 'Enabled' : 'Disabled' }}
                </span>
              </label>
              <button
                @click="addHeaderRow"
                :disabled="!apiSettingsStore.enableGlobalHeaders"
                class="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                + Add Header
              </button>
            </div>
          </div>

          <div class="space-y-2" :class="{ 'opacity-50': !apiSettingsStore.enableGlobalHeaders }">
            <div
              v-for="(header, index) in localHeaders"
              :key="index"
              class="flex items-center space-x-2"
            >
              <input
                :value="header.key"
                @input="handleHeaderKeyChange(index, ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="Header Name"
                :disabled="!apiSettingsStore.enableGlobalHeaders"
                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
              <input
                :value="header.value"
                @input="handleHeaderValueChange(index, ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="Header Value"
                :disabled="!apiSettingsStore.enableGlobalHeaders"
                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
              <button
                v-if="localHeaders.length > 1"
                @click="removeHeaderRow(index)"
                class="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                title="Remove Header"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Current Settings Preview -->
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Current Settings:
          </h3>
          <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <div><strong>URL:</strong> {{ apiSettingsStore.baseUrl }}</div>
            <div>
              <strong>Global Headers:</strong>
              <span
                :class="
                  apiSettingsStore.enableGlobalHeaders
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                "
              >
                {{ apiSettingsStore.enableGlobalHeaders ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div
              v-if="
                apiSettingsStore.enableGlobalHeaders &&
                Object.keys(apiSettingsStore.globalHeaders).length > 0
              "
            >
              <strong>Active Headers:</strong>
              <ul class="ml-4 mt-1">
                <li v-for="(value, key) in apiSettingsStore.globalHeaders" :key="key">
                  {{ key }}: {{ value }}
                </li>
              </ul>
            </div>
            <div v-else-if="apiSettingsStore.enableGlobalHeaders">
              <strong>Active Headers:</strong> none configured
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700"
      >
        <button
          @click="resetToDefaults"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md transition-colors"
        >
          Reset
        </button>

        <div class="flex space-x-3">
          <button
            @click="closeModal"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            @click="saveSettings"
            :disabled="!isValidUrl"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
