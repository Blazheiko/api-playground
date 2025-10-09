<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useApiStore } from '@/stores/api-doc'
import TreeGroup from './TreeGroup.vue'

const apiStore = useApiStore()

const expandedGroups = ref<Set<string>>(new Set()) // Изменили на строки для поддержки вложенности

const currentGroups = computed(() => apiStore.filteredTreeGroups)

const toggleGroup = (groupPath: string) => {
  if (expandedGroups.value.has(groupPath)) {
    expandedGroups.value.delete(groupPath)
  } else {
    expandedGroups.value.add(groupPath)
  }
}

const scrollToRoute = async (id: number) => {
  // Находим маршрут в плоском списке для получения ID
  const route = apiStore.findRouteById(id)
  if (route) {
    apiStore.setSelectedRoute(route.id)
    await apiStore.scrollToRouteWithCollapse(route.id)
  }
}

const isRouteActive = (id: number) => {
  const route = apiStore.findRouteById(id)
  return route ? apiStore.isRouteSelected(route.id) : false
}

const isGroupActive = (groupPath: string) => {
  // Проверяем, есть ли активный маршрут в этой группе
  const selectedRoute = apiStore.selectedRoute
  return (selectedRoute && selectedRoute.fullUrl?.startsWith(groupPath)) || false
}

const getMethodColor = (method: string) => {
  const colors = {
    GET: 'text-green-600 dark:text-green-400',
    POST: 'text-blue-600 dark:text-blue-400',
    PUT: 'text-yellow-600 dark:text-yellow-400',
    PATCH: 'text-orange-600 dark:text-orange-400',
    DELETE: 'text-red-600 dark:text-red-400',
  }
  return colors[method as keyof typeof colors] || 'text-gray-600 dark:text-gray-400'
}

// Автоматически разворачиваем группу с выбранным маршрутом
watch(
  () => apiStore.selectedRoute,
  (newRoute) => {
    if (newRoute) {
      // Находим группу, содержащую выбранный маршрут
      const groupPath = newRoute.fullUrl?.split('/').slice(0, -1).join('/') || ''
      if (groupPath) {
        // Разворачиваем группу по префиксу
        expandedGroups.value.add(groupPath)
      }
    }
  },
  { immediate: true },
)
</script>

<template>
  <nav
    class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full overflow-y-auto"
  >
    <!-- Header -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <h2
        class="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-3"
      >
        API Routes
      </h2>

      <!-- Route Type Tabs -->
      <div class="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
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

    <!-- Navigation Tree -->
    <div class="py-2">
      <div v-if="currentGroups.length === 0" class="px-4 py-8 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">Нет доступных маршрутов</p>
      </div>

      <div v-else class="space-y-1">
        <TreeGroup
          v-for="group in currentGroups"
          :key="group.prefix"
          :group="group"
          :expanded-groups="expandedGroups"
          :level="0"
          @toggle-group="toggleGroup"
          @scroll-to-route="scrollToRoute"
          @is-route-active="isRouteActive"
          @is-group-active="isGroupActive"
          @get-method-color="getMethodColor"
        />
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* Дополнительные стили при необходимости */
</style>
