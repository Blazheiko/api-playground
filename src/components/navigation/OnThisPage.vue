<script setup lang="ts">
import { ref, computed, watch, onMounted, unref } from 'vue'
import { useApiStore } from '@/stores/api-doc'
import type { ApiRoute } from '@/stores/api-doc'

const apiStore = useApiStore()

interface TocItem {
  id: string
  label: string
  level: number
  method?: string
  routeId?: number
  url?: string
}

const tocItems = ref<TocItem[]>([])
const activeId = ref<string>('')

// Используем готовую плоскую структуру из store
const currentRoutes = computed(() => {
  // Если есть выбранный маршрут (isSelected = true), показываем только его группу
  const selectedRoute = apiStore.filteredFlatRoutes.find((route) => route.isSelected)
  if (selectedRoute) {
    const groupKey = selectedRoute.fullUrl?.split('/').slice(0, -1).join('/') || 'root'

    // Фильтруем маршруты той же группы
    return apiStore.filteredFlatRoutes.filter((route) => {
      const routeGroupKey = route.fullUrl?.split('/').slice(0, -1).join('/') || 'root'
      return routeGroupKey === groupKey
    })
  }

  // Иначе показываем все отфильтрованные маршруты
  return apiStore.filteredFlatRoutes
})

// Computed для группировки маршрутов
const groupedRoutes = computed(() => {
  const groups: { [key: string]: ApiRoute[] } = {}

  currentRoutes.value.forEach((route) => {
    const groupKey = route.fullUrl?.split('/').slice(0, -1).join('/') || 'root'
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(route)
  })

  return groups
})

// Генерируем TOC на основе текущих маршрутов
const generateToc = () => {
  const items: TocItem[] = []

  // Создаем TOC элементы
  Object.entries(groupedRoutes.value).forEach(([groupPath, routes]) => {
    // Добавляем группу как заголовок первого уровня
    items.push({
      id: `group-${groupPath}`,
      label: groupPath === 'root' ? 'Root' : groupPath,
      level: 1,
    })

    // Добавляем маршруты как элементы второго уровня
    routes.forEach((route) => {
      if (route.id === undefined || route.id === null) {
        console.error('Route has invalid id:', route)
        return
      }

      const displayUrl = route.url.replace(groupPath, '') || '/'
      items.push({
        id: `route-${route.id}`,
        label: displayUrl,
        method: route.method,
        level: 2,
        routeId: route.id,
        url: route.fullUrl || route.url,
      })
    })
  })

  tocItems.value = items
}

// Скролл к элементу
const selectRoute = async (id: string) => {
  // Если это маршрут, находим его по ID и устанавливаем isSelected
  console.log('selectRoute', id)
  if (id.startsWith('route-')) {
    const routeId = Number(id.replace('route-', ''))

    if (isNaN(routeId)) {
      console.error('Invalid routeId extracted from id:', id)
      return
    }

    const route = apiStore.findRouteById(routeId)

    if (route) {
      // Используем метод store для установки выбранного маршрута
      apiStore.setSelectedRoute(routeId)

      activeId.value = ''
      await apiStore.scrollToRouteWithCollapse(routeId, id)
      return
    } else {
      console.error('Route not found for routeId:', routeId)
    }
  }

  // Для групп используем обычный скролл
  if (id.startsWith('group-')) {
    // Сбрасываем isSelected только для маршрутов в текущем контексте
    apiStore.clearSelectedRoutes(currentRoutes.value)

    activeId.value = id
  }

  const element = document.getElementById(id)
  if (element) {
    // Используем метод из store для консистентности
    apiStore.scrollToElement(id, 100)
  }
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

watch(
  [currentRoutes, groupedRoutes],
  () => {
    generateToc()
  },
  { immediate: true },
)

// Отслеживаем изменения isSelected для обновления подсветки
watch(
  () => currentRoutes.value.map((route) => route.isSelected),
  () => {
    // Принудительно обновляем подсветку при изменении isSelected
  },
  { immediate: true, deep: true },
)

onMounted(() => {
  generateToc()
})
</script>

<template>
  <aside
    class="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full flex flex-col"
  >
    <!-- Header -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
        Sections
      </h2>
    </div>

    <!-- Table of Contents -->
    <nav class="flex-1 overflow-y-auto p-4">
      <div v-if="tocItems.length === 0" class="text-sm text-gray-500 dark:text-gray-400">Empty</div>

      <ul v-else class="space-y-1">
        <li v-for="item in tocItems" :key="item.id">
          <button
            @click="selectRoute(item.id)"
            :class="[
              'w-full text-left px-3 py-1.5 rounded-md transition-colors text-sm',
              item.level === 1 ? 'font-medium' : 'text-xs font-mono',
              item.level === 2 ? 'ml-4' : '',
              // For routes check isSelected field, for groups - activeId
              (item.routeId &&
                currentRoutes.find((route) => route.id === item.routeId)?.isSelected) ||
              (item.level === 1 &&
                unref(activeId) === item.id &&
                !currentRoutes.some((route) => route.isSelected))
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
            ]"
          >
            <span v-if="item.method" :class="['mr-2 font-semibold', getMethodColor(item.method)]">
              {{ item.method }}
            </span>
            <span :class="item.level === 2 ? 'truncate block' : ''">
              {{ item.label }}
            </span>
          </button>
        </li>
      </ul>
    </nav>

    <!-- Additional Info -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div class="text-xs text-gray-500 dark:text-gray-400 space-y-2">
        <div class="flex items-center justify-between">
          <span>Total groups:</span>
          <span class="font-medium text-gray-900 dark:text-gray-100">
            {{ Object.keys(groupedRoutes).length }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span>Total routes:</span>
          <span class="font-medium text-gray-900 dark:text-gray-100">
            {{ currentRoutes.length }}
          </span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* Additional styles if needed */
</style>
