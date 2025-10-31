<script setup lang="ts">
import { computed } from 'vue'
import type { ApiGroup, ApiRoute } from '@/stores/api-doc'
import { formatRateLimit } from '@/utils/api-helpers'
import ApiRouteComponent from './ApiRoute.vue'
import { useApiStore } from '@/stores/api-doc'

interface Props {
  group: ApiGroup
}

const props = defineProps<Props>()

const groupRateLimit = computed(() => formatRateLimit(props.group.rateLimit))

const routes = computed(() => props.group.group.filter((item) => !('group' in item)) as ApiRoute[])

const apiStore = useApiStore()
</script>

<template>
  <div
    :id="`group-${group.prefix}`"
    class="group-item bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden fade-in scroll-mt-24"
  >
    <div
      class="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-gray-700 dark:to-gray-600 px-4 sm:px-6 py-4 border-b dark:border-gray-600"
    >
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex-1 min-w-0">
          <h3 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white break-words">
            {{ group.description || `Group ${group.prefix}` }}
          </h3>
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
            <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span class="font-medium whitespace-nowrap">Global Prefix:</span>
              <code
                class="bg-white dark:bg-gray-800 px-2 py-1 rounded text-primary-700 dark:text-primary-400 break-all shadow-sm"
              >
                /{{ apiStore.pathPrefix }}
              </code>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span class="font-medium whitespace-nowrap">Group Prefix:</span>
              <code
                class="bg-white dark:bg-gray-800 px-2 py-1 rounded text-primary-700 dark:text-primary-400 break-all shadow-sm"
              >
                /{{ group.prefix }}
              </code>
            </div>
            <div
              v-if="group.middlewares"
              class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
            >
              <span class="font-medium whitespace-nowrap">Middlewares:</span>
              <code
                class="bg-white dark:bg-gray-800 px-2 py-1 rounded text-orange-700 dark:text-orange-400 break-all flex-1 min-w-0 shadow-sm"
              >
                {{ group.middlewares.join(', ') }}
              </code>
            </div>
            <div
              v-if="groupRateLimit"
              class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
            >
              <span class="font-medium whitespace-nowrap">Rate Limit:</span>
              <span
                class="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs font-mono whitespace-nowrap shadow-sm"
              >
                {{ groupRateLimit.formatted }}
              </span>
            </div>
          </div>
        </div>
        <div class="text-center sm:text-right flex-shrink-0 self-start sm:self-center">
          <div
            class="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400 drop-shadow-sm"
          >
            {{ routes.length }}
          </div>
          <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 drop-shadow-sm">
            endpoints
          </div>
        </div>
      </div>
    </div>

    <div class="p-6">
      <div class="space-y-4">
        <ApiRouteComponent
          v-for="route in routes"
          :key="route.id"
          :id="`route-${route.id}`"
          :route="route"
          :group-prefix="group.prefix"
        />
      </div>
    </div>
  </div>
</template>
