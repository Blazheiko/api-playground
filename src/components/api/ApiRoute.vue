<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import type { ApiRoute } from '@/stores/api-doc'
import { useApiStore } from '@/stores/api-doc'
import {
  getMethodClass,
  getTypeClass,
  extractParameters,
  formatRateLimit,
} from '@/utils/apiHelpers'
import TestForm from './TestForm.vue'

interface Props {
  route: ApiRoute
  groupPrefix: string
}

const props = defineProps<Props>()

const router = useRouter()
const apiStore = useApiStore()

const isExpanded = computed(() => apiStore.isRouteExpanded(props.route.id))
const showTestForm = ref(false)
const testFormRef = ref<InstanceType<typeof TestForm> | null>(null)

const isWebSocket = computed(() => apiStore.currentRouteType === 'ws')

const fullUrl = computed(() => {
  if (isWebSocket.value) {
    return props.route.url || ''
  }

  // Используем уже вычисленный fullUrl из store, если он есть
  if (props.route.fullUrl) {
    return props.route.fullUrl
  }

  // Fallback к старой логике
  const url = props.route.url || ''
  const cleanUrl = url.startsWith('/') ? url : `/${url}`
  return `/${apiStore.pathPrefix}${cleanUrl}`
})

const parameters = computed(() => extractParameters(props.route.url || ''))

const methodDisplay = computed(() =>
  isWebSocket.value ? 'WS' : (props.route.method || 'UNKNOWN').toUpperCase(),
)
const methodClass = computed(() =>
  isWebSocket.value ? 'method-ws' : getMethodClass(props.route.method),
)

const responseTypeInfo = computed(() => {
  if (!props.route.typeResponse) {
    return null
  }

  const typeData = apiStore.responseTypes[props.route.typeResponse]

  if (typeData) {
    return {
      name: typeData.name,
      module: typeData.module,
      fields: typeData.fields, // TypeScript code as string
      hasFields: typeData.fields && Object.keys(typeData.fields).length > 0,
    }
  }

  return null
})

const validationSchema = computed(() => {
  if (props.route.validator && apiStore.validationSchemas[props.route.validator]) {
    return apiStore.validationSchemas[props.route.validator]
  }
  return null
})

const routeRateLimit = computed(() => {
  // Priority: route.rateLimit > route.groupRateLimit
  const rateLimit = props.route.rateLimit || props.route.groupRateLimit
  return formatRateLimit(rateLimit)
})

const toggleExpanded = () => {
  if (props.route.id === undefined || props.route.id === null) {
    console.error('Route ID is undefined or null:', props.route)
    return
  }

  // Set selectedRoute when clicking on route
  apiStore.setSelectedRoute(props.route.id)
  apiStore.setActiveRoute(props.route.id)

  if (isExpanded.value) {
    apiStore.collapseAllRoutes()
  } else {
    apiStore.setExpandedRoute(props.route.id)
  }
}

const toggleTestForm = async () => {
  const wasExpanded = isExpanded.value
  showTestForm.value = !showTestForm.value

  if (showTestForm.value) {
    // If route is not expanded, expand it first
    if (!wasExpanded) {
      apiStore.setExpandedRoute(props.route.id)
      // Wait for DOM update after expanding route
      await nextTick()
    }

    // Wait another tick for complete form rendering
    await nextTick()

    // Small delay to complete animations and ensure proper layout
    setTimeout(() => {
      scrollToTestForm()
    }, 150)
  }
}

const scrollToTestForm = () => {
  // Сначала пробуем найти форму по ID
  const testFormElement = document.getElementById('test-form')
  const element = testFormElement || (testFormRef.value && testFormRef.value.$el)

  if (element) {
    // Используем простой scrollIntoView с настройками
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    })

    // Дополнительно корректируем позицию с учетом offset
    setTimeout(() => {
      const mainContent = document.querySelector('main')
      if (mainContent) {
        const currentScrollTop = mainContent.scrollTop
        mainContent.scrollTo({
          top: Math.max(0, currentScrollTop - 80),
          behavior: 'smooth',
        })
      }
    }, 100)
  }
}

const goToRoute = () => {
  if (props.route.id === undefined || props.route.id === null) {
    console.error('Cannot navigate to route: Route ID is undefined or null:', props.route)
    return
  }

  // Set selectedRoute before navigating to detail page
  apiStore.setSelectedRoute(props.route.id)
  apiStore.setActiveRoute(props.route.id)

  router.push({
    name: 'route-detail',
    params: {
      routeId: props.route.id.toString(),
    },
  })
}
</script>

<template>
  <div
    :id="`route-${route.id}`"
    :class="[
      'route-item border rounded-lg transition-shadow duration-200 fade-in scroll-mt-24',
      'bg-white dark:bg-gray-800 dark:border-gray-700',
      'flex flex-col', // Добавляем flex для лучшего управления высотой
    ]"
    :data-method="isWebSocket ? 'ws' : route.method"
  >
    <!-- Collapsed Header -->
    <div
      :class="[
        'route-collapsed p-4 cursor-pointer transition-colors duration-200',
        'hover:bg-gray-50 dark:hover:bg-gray-700',
      ]"
      @click="toggleExpanded"
    >
      <div class="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-0 lg:justify-between">
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div class="flex items-center gap-3 flex-wrap">
            <span
              :class="[
                'px-3 py-1 text-xs font-semibold rounded-full border flex-shrink-0',
                methodClass,
              ]"
            >
              {{ methodDisplay }}
            </span>
            <code
              class="text-sm font-mono text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded break-all cursor-pointer hover:underline"
              @click.stop="goToRoute"
            >
              {{ fullUrl }}
            </code>
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-gray-600 dark:text-gray-300 text-sm break-words">
              {{ route.description || 'No description available' }}
            </span>
          </div>
        </div>
        <div class="flex items-center justify-between lg:justify-end gap-2 flex-shrink-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span
              v-if="route.validator"
              class="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full whitespace-nowrap"
            >
              Validated
            </span>
            <span
              v-if="route.middleware"
              class="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full whitespace-nowrap"
            >
              Middleware
            </span>
            <span
              v-if="routeRateLimit"
              class="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full whitespace-nowrap"
            >
              {{ routeRateLimit.formatted }}
            </span>
            <button
              v-if="!isWebSocket"
              @click.stop="toggleTestForm"
              class="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors duration-200 whitespace-nowrap focus:ring-2 focus:ring-green-300 focus:outline-none"
            >
              Test
            </button>
          </div>
          <svg
            :class="[
              'expand-icon h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform duration-200',
              { 'rotated rotate-180': isExpanded },
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            ></path>
          </svg>
        </div>
      </div>
    </div>

    <!-- Expanded Details -->
    <div v-show="isExpanded" class="route-details expanded px-4 pb-4 flex-1">
      <div class="flex flex-col lg:grid lg:grid-cols-5 gap-6">
        <div class="space-y-4 lg:col-span-2">
          <div>
            <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Details</h5>
            <div class="space-y-1 text-sm">
              <div v-if="route.middleware" class="break-words">
                <span class="font-medium text-gray-700 dark:text-gray-300">Middleware:</span>
                <code class="text-orange-600 dark:text-orange-400 break-all">{{
                  route.middleware
                }}</code>
              </div>
              <div v-if="route.middlewares" class="break-words">
                <span class="font-medium text-gray-700 dark:text-gray-300">Middlewares:</span>
                <code class="text-orange-600 dark:text-orange-400 break-all">{{
                  route.middlewares.join(', ')
                }}</code>
              </div>
              <div v-if="routeRateLimit" class="break-words">
                <span class="font-medium text-gray-700 dark:text-gray-300">Rate Limit:</span>
                <span
                  class="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs font-mono"
                >
                  {{ routeRateLimit.formatted }}
                </span>
                <span class="text-gray-500 dark:text-gray-400 text-xs">
                  {{ props.route.rateLimit ? '(overrides group limit)' : '(inherited from group)' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Validation Schema -->
          <div v-if="validationSchema">
            <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Request Body</h5>
            <div class="space-y-2 overflow-x-auto">
              <div
                v-for="(fieldInfo, fieldName) in validationSchema"
                :key="fieldName"
                class="border-l-2 border-gray-200 dark:border-gray-600 pl-3 py-2"
              >
                <div class="flex flex-wrap items-center gap-2 text-sm mb-1">
                  <span
                    :class="[
                      'px-2 py-1 rounded text-xs font-mono font-semibold break-all',
                      getTypeClass(fieldInfo.type),
                    ]"
                  >
                    {{ fieldName }}
                  </span>
                  <span
                    class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                  >
                    {{ fieldInfo.type }}
                  </span>
                  <span
                    :class="[
                      'text-xs whitespace-nowrap',
                      fieldInfo.required
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-gray-400 dark:text-gray-500',
                    ]"
                  >
                    {{ fieldInfo.required ? 'required' : 'optional' }}
                  </span>
                </div>
                <div
                  v-if="fieldInfo.description"
                  class="text-gray-600 dark:text-gray-400 text-xs break-words mt-1"
                >
                  {{ fieldInfo.description }}
                </div>
              </div>
            </div>
          </div>

          <!-- Parameters -->
          <div v-if="parameters.length > 0">
            <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Parameters</h5>
            <div class="space-y-2">
              <div
                v-for="param in parameters"
                :key="param.name"
                class="flex flex-wrap items-center gap-2 text-sm"
              >
                <span
                  class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-mono break-all"
                >
                  {{ param.name }}
                </span>
                <span class="text-gray-500 dark:text-gray-400">{{ param.type }}</span>
                <span
                  :class="[
                    'text-xs whitespace-nowrap',
                    param.required
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-gray-400 dark:text-gray-500',
                  ]"
                >
                  {{ param.required ? 'required' : 'optional' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4 lg:col-span-3">
          <!-- Request Body -->
          <!-- <div v-if="route.requestBody">
            <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Request Body</h5>
            <p
              v-if="route.requestBody.description"
              class="text-sm text-gray-600 dark:text-gray-400 mb-2"
            >
              {{ route.requestBody.description }}
            </p>
            <div v-if="route.requestBody.schema" class="space-y-2 overflow-x-auto">
              <div
                v-for="(fieldInfo, fieldName) in route.requestBody.schema"
                :key="fieldName"
                class="border-l-2 border-gray-200 dark:border-gray-600 pl-3 py-2"
              >
                <div class="flex flex-wrap items-center gap-2 text-sm mb-1">
                  <span
                    :class="[
                      'px-2 py-1 rounded text-xs font-mono font-semibold break-all',
                      getTypeClass(fieldInfo.type),
                    ]"
                  >
                    {{ fieldName }}
                  </span>
                  <span
                    class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                  >
                    {{ fieldInfo.type }}
                  </span>
                  <span
                    :class="[
                      'text-xs whitespace-nowrap',
                      fieldInfo.required
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-gray-400 dark:text-gray-500',
                    ]"
                  >
                    {{ fieldInfo.required ? 'required' : 'optional' }}
                  </span>
                </div>
                <div
                  v-if="fieldInfo.description"
                  class="text-gray-600 dark:text-gray-400 text-xs break-words mt-1"
                >
                  {{ fieldInfo.description }}
                </div>
              </div>
            </div>
            <div v-if="route.requestBody.example" class="mt-2">
              <h6 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Example</h6>
              <pre
                class="text-xs bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"
              ><code>{{ JSON.stringify(route.requestBody.example, null, 2) }}</code></pre>
            </div>
          </div> -->

          <!-- Response Format -->
          <div>
            <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Response Format</h5>

            <!-- Response Type Section -->
            <div v-if="responseTypeInfo && responseTypeInfo.hasFields" class="space-y-4">
              <div class="response-type-section">
                <div class="flex items-center gap-2 mb-3">
                  <span class="response-type-badge">{{ responseTypeInfo.name }}</span>
                  <span class="text-sm text-gray-700 dark:text-gray-200 font-semibold">
                    Response Type
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    ({{ responseTypeInfo.module }})
                  </span>
                </div>

                <!-- TypeScript Code Display -->
                <div
                  class="bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-600 overflow-hidden"
                >
                  <div class="px-3 py-2 bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
                    <span class="text-xs font-medium text-gray-600 dark:text-gray-400"
                      >TypeScript Interface</span
                    >
                  </div>
                  <pre
                    class="p-4 text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto"
                  ><code>{{ responseTypeInfo.fields }}</code></pre>
                </div>
              </div>

              <!-- Success/Error Responses -->
              <!-- <div
                class="p-3 bg-green-50 dark:bg-green-900 dark:bg-opacity-10 rounded-lg border border-green-200 dark:border-green-800"
              >
                <h6 class="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                  Example Success Response Format
                </h6>
                <pre
                  class="text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-3 rounded-md border dark:border-gray-600 overflow-x-auto"
                ><code>{{ JSON.stringify({ status: 200, data: 'Success' }, null, 2) }}</code></pre>
              </div> -->

              <div
                class="p-3 bg-red-50 dark:bg-red-900 dark:bg-opacity-10 rounded-lg border border-red-200 dark:border-red-800"
              >
                <h6 class="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                  Example Error Response Format
                </h6>
                <pre
                  class="text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-3 rounded-md border dark:border-gray-600 overflow-x-auto"
                ><code>{{ JSON.stringify({ status: "unauthorized", message: 'Session expired or not found' }, null, 2) }}</code></pre>
              </div>
            </div>

            <!-- Fallback Response Format -->
            <div v-else class="space-y-4">
              <div v-if="responseTypeInfo" class="response-type-section">
                <div class="flex items-center gap-2 mb-4">
                  <span class="response-type-badge">{{ responseTypeInfo.name }}</span>
                  <span class="text-sm text-gray-700 dark:text-gray-200 font-semibold">
                    Response Type
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    ({{ responseTypeInfo.module }})
                  </span>
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-300 italic">
                  Type defined but no field details available
                </div>
              </div>

              <div
                class="p-3 bg-green-50 dark:bg-green-900 dark:bg-opacity-10 rounded-lg border border-green-200 dark:border-green-800"
              >
                <h6 class="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                  Success Response
                </h6>
                <pre
                  class="text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-3 rounded-md border dark:border-gray-600 overflow-x-auto"
                ><code>{{ JSON.stringify({ status: 200, data: 'Success' }, null, 2) }}</code></pre>
              </div>

              <div
                class="p-3 bg-red-50 dark:bg-red-900 dark:bg-opacity-10 rounded-lg border border-red-200 dark:border-red-800"
              >
                <h6 class="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                  Error Response
                </h6>
                <pre
                  class="text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-3 rounded-md border dark:border-gray-600 overflow-x-auto"
                ><code>{{ JSON.stringify({ status: 400, message: 'Error' }, null, 2) }}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Duplicate Test Button -->
      <div class="flex justify-center mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          v-if="!isWebSocket"
          @click="toggleTestForm"
          class="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-green-300 focus:outline-none flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          Test API
        </button>
      </div>

      <!-- Test Form Section -->
      <TestForm
        v-if="showTestForm && !isWebSocket"
        ref="testFormRef"
        :route="route"
        :group-prefix="groupPrefix"
      />
    </div>
  </div>
</template>
