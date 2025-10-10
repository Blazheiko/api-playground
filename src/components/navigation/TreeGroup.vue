<script setup lang="ts">
import { computed } from 'vue'
import type { ApiGroup, ApiRoute } from '@/stores/api-doc'
import { useApiStore } from '@/stores/api-doc'

interface Props {
  group: ApiGroup
  expandedGroups: Set<string>
  level: number
}

interface Emits {
  (e: 'toggle-group', groupPath: string): void
  (e: 'scroll-to-route', id: number): void
  (e: 'is-route-active', id: number): boolean
  (e: 'is-group-active', groupPath: string): boolean
  (e: 'get-method-color', method: string): string
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const apiStore = useApiStore()

const groupPath = computed(() => {
  return props.group.fullPrefix || props.group.prefix
})

const isExpanded = computed(() => {
  return props.expandedGroups.has(groupPath.value)
})

const toggleGroup = () => {
  emit('toggle-group', groupPath.value)
}

const getUrl = (urlInitial: string) => {
  let url = urlInitial
  url = url.replace(props.group.prefix, '') || '/'
  if (url.startsWith('//')) {
    url = url.slice(1)
  }
  return url
}

const scrollToRoute = (route: ApiRoute) => {
  // Находим маршрут с правильным ID по fullUrl и method
  const routeWithId = apiStore.findRouteById(route.id)
  if (routeWithId && routeWithId.id) {
    emit('scroll-to-route', routeWithId.id)
  } else {
    console.error(
      'Route not found with fullUrl:',
      route.fullUrl || route.url,
      'method:',
      route.method,
    )
  }
}

const isRouteActive = (route: ApiRoute) => {
  const routeWithId = apiStore.findRouteByFullUrl(route.fullUrl || route.url, route.method)
  return routeWithId ? emit('is-route-active', routeWithId.id) : false
}

const isGroupActive = () => {
  return emit('is-group-active', groupPath.value)
}

const getMethodColor = (method: string) => {
  return emit('get-method-color', method)
}

// Подсчитываем общее количество маршрутов в группе и всех вложенных группах
const totalRoutesCount = computed(() => {
  let count = 0

  function countRoutes(group: ApiGroup) {
    // Считаем маршруты в текущей группе
    count += group.group.filter((item) => !('group' in item)).length

    // Рекурсивно считаем маршруты во вложенных группах
    group.group.forEach((item) => {
      if ('group' in item) {
        countRoutes(item)
      }
    })
  }

  countRoutes(props.group)
  return count
})
</script>

<template>
  <div>
    <!-- Group Header -->
    <button
      @click="toggleGroup"
      :class="[
        'w-full flex items-center px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
        isGroupActive() ? 'bg-gray-50 dark:bg-gray-700' : '',
      ]"
      :style="{ paddingLeft: `${level * 16 + 16}px` }"
    >
      <svg
        :class="[
          'w-4 h-4 mr-2 text-gray-400 transition-transform flex-shrink-0',
          isExpanded ? 'rotate-90' : '',
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
      <span class="ml-auto text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
        {{ totalRoutesCount }}
      </span>
    </button>

    <!-- Group Content -->
    <div v-if="isExpanded" class="space-y-0.5">
      <!-- Routes in current group -->
      <template v-for="(item, index) in group.group" :key="index">
        <button
          v-if="item && !('group' in item)"
          @click="scrollToRoute(item as ApiRoute)"
          :class="[
            'w-full flex items-center px-4 py-1.5 text-left rounded-md transition-colors group',
            isRouteActive(item as ApiRoute)
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
          ]"
          :style="{ paddingLeft: `${(level + 1) * 16 + 16}px` }"
        >
          <span
            :class="[
              'text-xs font-semibold mr-2 uppercase flex-shrink-0',
              getMethodColor((item as ApiRoute).method),
            ]"
          >
            {{ (item as ApiRoute).method }}
          </span>
          <span class="text-xs truncate font-mono">
            {{ getUrl((item as ApiRoute).url) }}
          </span>
        </button>
      </template>

      <!-- Nested groups -->
      <template v-for="childGroup in group.group" :key="childGroup">
        <TreeGroup
          v-if="childGroup && 'group' in childGroup"
          :group="childGroup as ApiGroup"
          :expanded-groups="expandedGroups"
          :level="level + 1"
          @toggle-group="$emit('toggle-group', $event)"
          @scroll-to-route="$emit('scroll-to-route', $event)"
          @is-route-active="$emit('is-route-active', $event)"
          @is-group-active="$emit('is-group-active', $event)"
          @get-method-color="$emit('get-method-color', $event)"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Дополнительные стили при необходимости */
</style>
