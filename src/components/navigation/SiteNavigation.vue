<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useApiStore, type ApiGroup, type ApiRoute } from '@/stores/api-doc'
import TreeGroup from './TreeGroup.vue'

const apiStore = useApiStore()

const expandedGroups = ref<Set<string>>(new Set()) // Changed to strings to support nesting

const currentGroups = computed(() => apiStore.filteredTreeGroups)

const toggleGroup = (groupPath: string) => {
  if (expandedGroups.value.has(groupPath)) {
    expandedGroups.value.delete(groupPath)
  } else {
    expandedGroups.value.add(groupPath)
  }
}

const scrollToRoute = async (id: number) => {
  // Find route in flat list to get ID
  const route = apiStore.findRouteById(id)
  if (route) {
    apiStore.setSelectedRoute(route.id)
    await apiStore.scrollToRouteWithCollapse(route.id)
  }
}

// Automatically expand group with selected route
watch(
  () => apiStore.selectedRouteId,
  (selectedRouteId) => {
    if (selectedRouteId) {
      // Find all groups that contain the selected route
      function findGroupsWithRoute(groups: ApiGroup[], routeId: number, parentPath = ''): string[] {
        const foundPaths: string[] = []

        for (const group of groups) {
          const currentPath = parentPath ? `${parentPath}/${group.prefix}` : group.prefix

          // Check if route exists in this group (recursively)
          function hasRouteInGroup(groupItems: (ApiRoute | ApiGroup)[]): boolean {
            for (const item of groupItems) {
              if ('group' in item) {
                if (hasRouteInGroup(item.group)) return true
              } else {
                if (item.id === routeId) return true
              }
            }
            return false
          }

          if (hasRouteInGroup(group.group)) {
            foundPaths.push(currentPath)
            // Also search in nested groups
            const nestedPaths = findGroupsWithRoute(
              group.group.filter((item): item is ApiGroup => 'group' in item),
              routeId,
              currentPath,
            )
            foundPaths.push(...nestedPaths)
          }
        }

        return foundPaths
      }

      const groupPaths = findGroupsWithRoute(currentGroups.value, selectedRouteId)
      console.log('Auto-expanding groups (ID-based):', {
        selectedRouteId,
        foundGroupPaths: groupPaths,
        expandedGroups: Array.from(expandedGroups.value),
      })

      groupPaths.forEach((path) => {
        expandedGroups.value.add(path)
      })

      console.log('Groups expanded, new expandedGroups:', Array.from(expandedGroups.value))
    }
  },
  { immediate: true },
)
</script>

<template>
  <nav
    class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col"
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
    <div class="flex-1 overflow-y-auto py-2">
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
        />
      </div>
    </div>
  </nav>
</template>

<style scoped></style>
