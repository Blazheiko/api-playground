<script setup lang="ts">
import { ref } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useApiStore } from '@/stores/api-doc'
import { useWebSocket } from '@/composables/useWebSocket'
import ApiSettingsModal from '@/components/api/ApiSettingsModal.vue'
import WebSocketModal from '@/components/api/WebSocketModal.vue'

const { isDark, toggleTheme } = useTheme()
const apiStore = useApiStore()
const { connectionStatus } = useWebSocket()

const isSettingsModalOpen = ref(false)
const isWebSocketModalOpen = ref(false)

const handleSearch = (event: Event) => {
  const target = event.target as HTMLInputElement
  apiStore.setSearchTerm(target.value)
}

const openSettingsModal = () => {
  isSettingsModalOpen.value = true
}

const closeSettingsModal = () => {
  isSettingsModalOpen.value = false
}

const openWebSocketModal = () => {
  isWebSocketModalOpen.value = true
}

const closeWebSocketModal = () => {
  isWebSocketModalOpen.value = false
}
</script>

<template>
  <header
    class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300"
  >
    <div class="w-full px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between py-4">
        <!-- Left: Title and Description -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-3">
            <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              API Documentation
            </h1>
            <span class="hidden sm:block text-gray-400 dark:text-gray-500">|</span>
            <p class="hidden sm:block text-gray-600 dark:text-gray-300 text-sm">
              Comprehensive guide to all available endpoints
            </p>
          </div>
        </div>

        <!-- Right: Search, Settings and Theme Toggle -->
        <div class="flex items-center space-x-3">
          <!-- Search Input -->
          <div class="relative">
            <input
              type="text"
              :value="apiStore.searchTerm"
              @input="handleSearch"
              placeholder="Search endpoints..."
              class="w-48 sm:w-64 px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
            />
            <svg
              class="absolute right-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
          </div>

          <!-- Settings Button -->
          <button
            @click="openSettingsModal"
            class="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 focus:ring-2 focus:ring-primary-500 focus:outline-none flex-shrink-0"
            title="API Settings"
          >
            <svg
              class="h-5 w-5 text-gray-700 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              ></path>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              ></path>
            </svg>
          </button>

          <!-- WebSocket Button -->
          <button
            @click="openWebSocketModal"
            :class="[
              'p-2 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-primary-500 focus:outline-none flex-shrink-0',
              {
                'bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700':
                  connectionStatus === 'connected',
                'bg-yellow-100 dark:bg-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-700':
                  connectionStatus === 'connecting',
                'bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700':
                  connectionStatus === 'error',
                'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600':
                  connectionStatus === 'disconnected',
              },
            ]"
            :title="`WebSocket Connection (${connectionStatus})`"
          >
            <svg
              :class="[
                'h-5 w-5 transition-colors duration-200',
                {
                  'text-green-700 dark:text-green-300': connectionStatus === 'connected',
                  'text-yellow-700 dark:text-yellow-300': connectionStatus === 'connecting',
                  'text-red-700 dark:text-red-300': connectionStatus === 'error',
                  'text-gray-700 dark:text-gray-300': connectionStatus === 'disconnected',
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
          </button>

          <!-- Theme Toggle Button -->
          <button
            @click="toggleTheme"
            class="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 focus:ring-2 focus:ring-primary-500 focus:outline-none flex-shrink-0"
            title="Toggle theme"
          >
            <!-- Sun icon (visible in dark mode) -->
            <svg
              v-if="isDark"
              class="h-5 w-5 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              ></path>
            </svg>
            <!-- Moon icon (visible in light mode) -->
            <svg
              v-else
              class="h-5 w-5 text-gray-700 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <ApiSettingsModal :is-open="isSettingsModalOpen" @close="closeSettingsModal" />

    <!-- WebSocket Modal -->
    <WebSocketModal :is-open="isWebSocketModalOpen" @close="closeWebSocketModal" />
  </header>
</template>
