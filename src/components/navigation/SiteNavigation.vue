<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useApiStore } from '@/stores/api-doc'

const apiStore = useApiStore()

const expandedGroups = ref<Set<number>>(new Set())

const currentGroups = computed(() => apiStore.filteredGroups)

const toggleGroup = (index: number) => {
  if (expandedGroups.value.has(index)) {
    expandedGroups.value.delete(index)
  } else {
    expandedGroups.value.add(index)
  }
}

const scrollToRoute = async (groupIndex: number, routeIndex: number) => {
  // Находим URL и метод маршрута и устанавливаем selectedRoute
  const group = currentGroups.value[groupIndex]
  const route = group?.group[routeIndex]
  if (route) {
    apiStore.setSelectedRoute(route.url, route.method)
  }

  // Используем новую функцию из store для корректного скролла
  await apiStore.scrollToRouteWithCollapse(groupIndex, routeIndex)
}

const isRouteActive = (groupIndex: number, routeIndex: number) => {
  const group = currentGroups.value[groupIndex]
  const route = group?.group[routeIndex]
  return route ? apiStore.isRouteSelected(route.url, route.method) : false
}

const isGroupActive = (groupIndex: number) => {
  return (
    apiStore.activeRoute?.groupIndex === groupIndex && apiStore.activeRoute?.routeIndex === null
  )
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
  () => apiStore.selectedUrl,
  (newUrl) => {
    if (newUrl) {
      // Находим группу, содержащую выбранный маршрут
      const groupIndex = currentGroups.value.findIndex((group) =>
        group.group.some(
          (route) => route.url === newUrl && route.method === apiStore.selectedMethod,
        ),
      )
      if (groupIndex !== -1) {
        expandedGroups.value.add(groupIndex)
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
        <div v-for="(group, groupIndex) in currentGroups" :key="groupIndex">
          <!-- Group Header -->
          <button
            @click="toggleGroup(groupIndex)"
            :class="[
              'w-full flex items-center px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
              isGroupActive(groupIndex) ? 'bg-gray-50 dark:bg-gray-700' : '',
            ]"
          >
            <svg
              :class="[
                'w-4 h-4 mr-2 text-gray-400 transition-transform',
                expandedGroups.has(groupIndex) ? 'rotate-90' : '',
              ]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {{ group.prefix }}
            </span>
            <span class="ml-auto text-xs text-gray-500 dark:text-gray-400">
              {{ group.group.length }}
            </span>
          </button>

          <!-- Group Routes -->
          <div v-if="expandedGroups.has(groupIndex)" class="ml-6 space-y-0.5">
            <button
              v-for="(route, routeIndex) in group.group"
              :key="routeIndex"
              @click="scrollToRoute(groupIndex, routeIndex)"
              :class="[
                'w-full flex items-center px-4 py-1.5 text-left rounded-md transition-colors group',
                isRouteActive(groupIndex, routeIndex)
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
              ]"
            >
              <span :class="['text-xs font-semibold mr-2 uppercase', getMethodColor(route.method)]">
                {{ route.method }}
              </span>
              <span class="text-xs truncate font-mono">
                {{ route.url.replace(group.prefix, '') || '/' }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* Дополнительные стили при необходимости */
</style>
