<script setup lang="ts">
import { onMounted } from 'vue'
import { useApiStore } from '@/stores/api-doc'
import ApiHeader from '@/components/api/ApiHeader.vue'
import ApiGroup from '@/components/api/ApiGroup.vue'
import SiteNavigation from '@/components/navigation/SiteNavigation.vue'
import OnThisPage from '@/components/navigation/OnThisPage.vue'
import MobileNavigation from '@/components/navigation/MobileNavigation.vue'

const apiStore = useApiStore()

onMounted(async () => {
  if (apiStore.httpRouteGroups.length === 0) {
    await apiStore.fetchRoutes()
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
    <ApiHeader />
    <MobileNavigation />

    <div class="flex min-h-[calc(100vh-64px)]">
      <!-- Left Navigation Panel -->
      <div class="hidden xl:block">
        <SiteNavigation />
      </div>

      <!-- Main Content Area -->
      <main class="flex-1 overflow-y-auto">
        <div class="px-6 py-6 min-h-full">
          <!-- Loading State -->
          <div
            v-if="apiStore.isLoading"
            class="bg-white dark:bg-gray-800 rounded-lg p-8 text-center"
          >
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"
            ></div>
            <p class="text-gray-600 dark:text-gray-400">Loading API documentation...</p>
          </div>

          <!-- Error State -->
          <div
            v-else-if="apiStore.error"
            class="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center"
          >
            <div class="text-red-800 dark:text-red-200">
              <svg
                class="mx-auto h-12 w-12 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <h3 class="text-lg font-semibold mb-2">Error Loading Documentation</h3>
              <p class="text-sm">{{ apiStore.error }}</p>
              <button
                @click="apiStore.fetchRoutes()"
                class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>

          <!-- API Groups -->
          <div v-else-if="apiStore.filteredGroups.length > 0" class="space-y-6">
            <ApiGroup
              v-for="(group, index) in apiStore.filteredGroups"
              :key="index"
              :group="group"
            />
          </div>

          <!-- No Results -->
          <div v-else class="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
            <svg
              class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No routes found
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              {{
                apiStore.searchTerm
                  ? 'Try adjusting your search term'
                  : 'No routes available in this category'
              }}
            </p>
          </div>
        </div>
      </main>

      <!-- Right "On This Page" Panel -->
      <div class="hidden 2xl:block">
        <OnThisPage />
      </div>
    </div>
  </div>
</template>
