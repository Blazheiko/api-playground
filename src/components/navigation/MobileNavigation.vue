<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useApiStore } from '@/stores/api-doc'
import type { ApiGroup } from '@/stores/api-doc'
import MobileGroupItem from './MobileGroupItem.vue'

const apiStore = useApiStore()

const isOpen = ref(false)
const expandedGroups = ref<Set<string>>(new Set()) // Изменили на строки для поддержки вложенности

const currentGroups = computed(() => apiStore.filteredTreeGroups) // Используем древовидную структуру

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const closeMenu = () => {
  isOpen.value = false
}

const toggleGroup = (groupPath: string) => {
  if (expandedGroups.value.has(groupPath)) {
    expandedGroups.value.delete(groupPath)
  } else {
    expandedGroups.value.add(groupPath)
  }
}

const scrollToRoute = async (routeId: number) => {
  const route = apiStore.findRouteById(routeId)
  if (route) {
    apiStore.setSelectedRoute(routeId)
    await apiStore.scrollToRouteWithCollapse(routeId)
  }
  closeMenu()
}

// Вспомогательные функции для древовидной структуры
const getGroupPath = (group: ApiGroup) => {
  return group.fullPrefix || group.prefix
}

// Автоматически разворачиваем группу с выбранным маршрутом
watch(
  () => apiStore.selectedRoute,
  (newRoute) => {
    if (newRoute) {
      // Находим группу, содержащую выбранный маршрут
      const groupPath = newRoute.fullUrl?.split('/').slice(0, -1).join('/') || ''
      if (groupPath) {
        expandedGroups.value.add(groupPath)
      }
    }
  },
  { immediate: true },
)
</script>

<template>
  <!-- Mobile Menu Button -->
  <button
    @click="toggleMenu"
    class="xl:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
  >
    <svg
      class="w-6 h-6 text-gray-600 dark:text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  </button>

  <!-- Mobile Menu Overlay -->
  <div
    v-if="isOpen"
    class="xl:hidden fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
    @click="closeMenu"
  ></div>

  <!-- Mobile Menu Panel -->
  <div
    :class="[
      'xl:hidden fixed top-0 left-0 z-50 w-80 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out',
      isOpen ? 'translate-x-0' : '-translate-x-full',
    ]"
  >
    <!-- Header -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
          API Routes
        </h2>
        <button
          @click="closeMenu"
          class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg
            class="w-5 h-5 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Route Type Tabs -->
      <div class="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mt-3">
        <button
          @click="apiStore.setRouteType('http')"
          :class="[
            'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
            apiStore.currentRouteType === 'http'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
          ]"
        >
          HTTP
        </button>
        <button
          @click="apiStore.setRouteType('ws')"
          :class="[
            'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
            apiStore.currentRouteType === 'ws'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
          ]"
        >
          WebSocket
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto py-2">
      <div v-if="currentGroups.length === 0" class="px-4 py-8 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">Нет доступных маршрутов</p>
      </div>

      <div v-else class="space-y-1">
        <!-- Рекурсивный компонент для групп -->
        <template v-for="group in currentGroups" :key="getGroupPath(group)">
          <MobileGroupItem
            :group="group"
            :level="0"
            :expanded-groups="expandedGroups"
            @toggle-group="toggleGroup"
            @scroll-to-route="scrollToRoute"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Дополнительные стили при необходимости */
</style>
