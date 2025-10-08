<script setup lang="ts">
import { ref, computed, watch, onMounted, unref } from 'vue'
import { useApiStore } from '@/stores/api-doc'

const apiStore = useApiStore()

interface TocItem {
  id: string
  label: string
  level: number
  method?: string
  groupIndex?: number
  routeIndex?: number
  url?: string
}

const tocItems = ref<TocItem[]>([])
const activeId = ref<string>('')

const currentGroups = computed(() => {
  // If there's a selected route, show only its group
  if (apiStore.selectedUrl && apiStore.selectedMethod) {
    return apiStore.selectedGroupRoutes
  }
  // Otherwise show all filtered groups
  return apiStore.filteredGroups
})

// Generate table of contents based on visible groups
const generateToc = () => {
  const items: TocItem[] = []

  currentGroups.value.forEach((group) => {
    // Determine the real group index
    const realGroupIndex =
      apiStore.selectedGroupIndex !== null
        ? apiStore.selectedGroupIndex
        : apiStore.filteredGroups.findIndex((g) => g.prefix === group.prefix)

    // Add group as first level header
    items.push({
      id: `group-${realGroupIndex}`,
      label: group.prefix,
      level: 1,
      groupIndex: realGroupIndex,
    })

    // Add routes as second level headers
    group.group.forEach((route, routeIndex) => {
      items.push({
        id: `route-${realGroupIndex}-${routeIndex}`,
        label: route.url.replace(group.prefix, '') || '/',
        method: route.method,
        level: 2,
        groupIndex: realGroupIndex,
        routeIndex,
        url: route.url,
      })
    })
  })

  tocItems.value = items
}

// Scroll to element
const scrollToElement = async (id: string) => {
  // If it's a route, use store function for correct scrolling
  if (id.startsWith('route-')) {
    const parts = id.split('-')
    const groupIndex = Number(parts[1])
    const routeIndex = Number(parts[2])
    if (
      !isNaN(groupIndex) &&
      !isNaN(routeIndex) &&
      groupIndex !== undefined &&
      routeIndex !== undefined
    ) {
      // Find corresponding route and set selectedRoute
      const tocItem = tocItems.value.find((item) => item.id === id)
      if (tocItem && tocItem.url && tocItem.method) {
        apiStore.setSelectedRoute(tocItem.url, tocItem.method)
      }

      // Clear activeId as we now use centralized state
      activeId.value = ''
      await apiStore.scrollToRouteWithCollapse(groupIndex, routeIndex, id)
      return
    }
  }

  // For groups use regular scroll
  if (id.startsWith('group-')) {
    const parts = id.split('-')
    const groupIndex = Number(parts[1])
    if (!isNaN(groupIndex) && groupIndex !== undefined) {
      // Clear selectedRoute and active route, set activeId for group
      apiStore.clearSelectedRoute()
      apiStore.clearActiveRoute()
      activeId.value = id
    }
  }

  const element = document.getElementById(id)
  if (element) {
    // Use simple scrollIntoView with settings
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    })

    // Additionally adjust position with offset
    setTimeout(() => {
      const mainContent = document.querySelector('main')
      if (mainContent) {
        const currentScrollTop = mainContent.scrollTop
        mainContent.scrollTo({
          top: Math.max(0, currentScrollTop - 100),
          behavior: 'smooth',
        })
      }
    }, 100)
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
  currentGroups,
  () => {
    generateToc()
  },
  { immediate: true },
)

// Track selectedRoute changes for highlighting updates
watch(
  () => apiStore.selectedUrl,
  () => {
    // Force highlight update when selectedRoute changes
    // This is especially important on route detail page
  },
  { immediate: true },
)

onMounted(() => {
  generateToc()
})
</script>

<template>
  <aside
    class="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full overflow-y-auto"
  >
    <!-- Header -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
        Sections
      </h2>
    </div>

    <!-- Table of Contents -->
    <nav class="p-4">
      <div v-if="tocItems.length === 0" class="text-sm text-gray-500 dark:text-gray-400">Empty</div>

      <ul v-else class="space-y-1">
        <li v-for="item in tocItems" :key="item.id">
          <button
            @click="scrollToElement(item.id)"
            :class="[
              'w-full text-left px-3 py-1.5 rounded-md transition-colors text-sm',
              item.level === 1 ? 'font-medium' : 'text-xs font-mono',
              item.level === 2 ? 'ml-4' : '',
              // For routes check selectedRoute (URL + method), for groups - activeId
              (item.url && item.method && apiStore.isRouteSelected(item.url, item.method)) ||
              (item.level === 1 && unref(activeId) === item.id && !unref(apiStore.selectedUrl))
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
    <div class="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div class="text-xs text-gray-500 dark:text-gray-400 space-y-2">
        <div class="flex items-center justify-between">
          <span>Total groups:</span>
          <span class="font-medium text-gray-900 dark:text-gray-100">
            {{ currentGroups.length }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span>Total routes:</span>
          <span class="font-medium text-gray-900 dark:text-gray-100">
            {{ currentGroups.reduce((sum, group) => sum + group.group.length, 0) }}
          </span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* Additional styles if needed */
</style>
