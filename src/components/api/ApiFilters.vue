<script setup lang="ts">
import { useApiStore } from '@/stores/api'

const apiStore = useApiStore()

const emit = defineEmits<{
  expandAll: []
  collapseAll: []
}>()

const filterByType = (type: 'http' | 'ws') => {
  apiStore.setRouteType(type)
}
</script>

<template>
  <div class="mb-6">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
      <div class="flex flex-wrap gap-2">
        <button
          @click="filterByType('http')"
          :class="[
            'filter-btn px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200',
            apiStore.currentRouteType === 'http'
              ? 'active bg-primary-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700',
          ]"
        >
          HTTP Routes
        </button>
        <button
          @click="filterByType('ws')"
          :class="[
            'filter-btn px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200',
            apiStore.currentRouteType === 'ws'
              ? 'active bg-primary-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700',
          ]"
        >
          WS Routes
        </button>
      </div>
      <div class="flex gap-2 sm:ml-auto">
        <button
          @click="emit('expandAll')"
          class="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-green-500 hover:bg-green-600 text-white transition-colors duration-200 whitespace-nowrap"
        >
          Expand All
        </button>
        <button
          @click="emit('collapseAll')"
          class="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-gray-500 hover:bg-gray-600 text-white transition-colors duration-200 whitespace-nowrap"
        >
          Collapse All
        </button>
      </div>
    </div>
  </div>
</template>

