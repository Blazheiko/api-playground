<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ApiRoute } from '@/stores/api'
import { useApiStore } from '@/stores/api'
import { getDefaultRequestBody, validateJSON } from '@/utils/apiHelpers'
import { extractParameters } from '@/utils/apiHelpers'

interface Props {
  route: ApiRoute
  groupPrefix: string
}

const props = defineProps<Props>()

const apiStore = useApiStore()

const parameters = computed(() => extractParameters(props.route.url))
const isBodyMethod = computed(() =>
  ['POST', 'PUT', 'PATCH'].includes(props.route.method.toUpperCase()),
)

const requestCount = ref(1)
const headers = ref('{\n  "Content-Type": "application/json"\n}')
const body = ref(getDefaultRequestBody(props.route.validator || '', apiStore.validationSchemas))
const paramValues = ref<Record<string, string>>({})

const headersError = ref<string>('')
const bodyError = ref<string>('')
const isLoading = ref(false)
const testResult = ref<any>(null)

const validateHeaders = () => {
  const result = validateJSON(headers.value)
  headersError.value = result.error || ''
  return result
}

const validateBody = () => {
  const result = validateJSON(body.value)
  bodyError.value = result.error || ''
  return result
}

const buildUrl = () => {
  let url = props.route.url
  Object.entries(paramValues.value).forEach(([key, value]) => {
    if (value) {
      url = url.replace(`:${key}`, value)
    }
  })
  return url
}

const sendRequest = async () => {
  // Validate JSON
  const headersValidation = validateHeaders()
  const bodyValidation = isBodyMethod.value ? validateBody() : { isValid: true }

  if (!headersValidation.isValid || !bodyValidation.isValid) {
    return
  }

  isLoading.value = true
  testResult.value = null

  const finalUrl = buildUrl()
  const requestHeaders = headersValidation.data || { 'Content-Type': 'application/json' }
  const requestBody = bodyValidation.data

  try {
    const overallStartTime = Date.now()
    const results = []
    const responseTimes = []

    for (let i = 0; i < requestCount.value; i++) {
      const startTime = Date.now()

      try {
        const fetchOptions: RequestInit = {
          method: props.route.method.toUpperCase(),
          headers: requestHeaders,
        }

        if (requestBody !== null && isBodyMethod.value) {
          fetchOptions.body = JSON.stringify(requestBody)
        }

        const response = await fetch(finalUrl, fetchOptions)
        const endTime = Date.now()
        const responseTime = endTime - startTime
        responseTimes.push(responseTime)

        let responseData
        const contentType = response.headers.get('content-type')

        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json()
        } else {
          responseData = await response.text()
        }

        results.push({
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
          responseTime,
          requestNumber: i + 1,
        })
      } catch (requestError) {
        const endTime = Date.now()
        const responseTime = endTime - startTime
        responseTimes.push(responseTime)

        results.push({
          success: false,
          status: 0,
          statusText: 'Network Error',
          headers: {},
          data: requestError instanceof Error ? requestError.message : 'Unknown error',
          responseTime,
          requestNumber: i + 1,
          error: true,
        })
      }
    }

    const overallEndTime = Date.now()
    const totalTime = overallEndTime - overallStartTime

    const successfulRequests = results.filter((r) => r.success).length
    const failedRequests = results.length - successfulRequests
    const avgResponseTime =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    const minResponseTime = Math.min(...responseTimes)
    const maxResponseTime = Math.max(...responseTimes)

    if (requestCount.value === 1) {
      const singleResult = results[0]
      testResult.value = {
        success: singleResult.success,
        status: singleResult.status,
        statusText: singleResult.statusText,
        headers: singleResult.headers,
        data: singleResult.data,
        responseTime: singleResult.responseTime,
        url: finalUrl,
        method: props.route.method.toUpperCase(),
        requestHeaders,
        requestBody,
      }
    } else {
      testResult.value = {
        success: successfulRequests > 0,
        firstResult: results[0],
        statistics: {
          totalRequests: requestCount.value,
          successfulRequests,
          failedRequests,
          totalTime,
          avgResponseTime: Math.round(avgResponseTime),
          minResponseTime,
          maxResponseTime,
        },
        url: finalUrl,
        method: props.route.method.toUpperCase(),
        requestHeaders,
        requestBody,
        allResults: results,
      }
    }
  } catch (error) {
    testResult.value = {
      error: true,
      message: 'Network error or request failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      url: finalUrl,
      method: props.route.method.toUpperCase(),
    }
  } finally {
    isLoading.value = false
  }
}

const clearResult = () => {
  testResult.value = null
}
</script>

<template>
  <div class="test-form-section">
    <div class="border-t dark:border-gray-600 pt-6 mt-6">
      <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        API Testing
      </h5>

      <form class="space-y-4" @submit.prevent="sendRequest">
        <!-- URL Parameters -->
        <div v-if="parameters.length > 0">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >URL Parameters</label
          >
          <div class="space-y-2">
            <div v-for="param in parameters" :key="param.name" class="flex items-center gap-2">
              <label class="min-w-[80px] text-sm text-gray-600 dark:text-gray-400"
                >{{ param.name }}:</label
              >
              <input
                type="text"
                v-model="paramValues[param.name]"
                :placeholder="`Enter ${param.name}`"
                :required="param.required"
                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
        </div>

        <!-- Request Headers -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >Headers (JSON format)</label
          >
          <textarea
            v-model="headers"
            @input="validateHeaders"
            rows="3"
            placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
            :class="{ 'json-invalid': headersError, 'json-valid': !headersError && headers }"
          ></textarea>
          <div v-if="headersError" class="json-error-message">JSON Error: {{ headersError }}</div>
        </div>

        <!-- Request Body (for POST/PUT/PATCH) -->
        <div v-if="isBodyMethod">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >Request Body (JSON format)</label
          >
          <textarea
            v-model="body"
            @input="validateBody"
            rows="6"
            placeholder='{"key": "value"}'
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
            :class="{ 'json-invalid': bodyError, 'json-valid': !bodyError && body }"
          ></textarea>
          <div v-if="bodyError" class="json-error-message">JSON Error: {{ bodyError }}</div>
        </div>

        <!-- Request Count and Buttons -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div class="flex flex-col flex-1 sm:flex-initial">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >Requests count</label
            >
            <input
              type="number"
              v-model.number="requestCount"
              min="1"
              max="1000"
              class="form-element-height w-full sm:w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-center"
            />
          </div>
          <button
            type="submit"
            :disabled="isLoading"
            class="form-element-height px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-200 focus:ring-2 focus:ring-green-500 focus:outline-none flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              ></path>
            </svg>
            {{ isLoading ? 'Sending...' : 'Send Request' }}
          </button>
          <button
            type="button"
            @click="clearResult"
            class="form-element-height px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors duration-200 text-sm flex items-center justify-center whitespace-nowrap"
          >
            Clear Result
          </button>
        </div>
      </form>

      <!-- Response Section -->
      <div v-if="testResult" class="test-result-section mt-6">
        <div class="border-t dark:border-gray-600 pt-4">
          <h6 class="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <svg
              class="h-4 w-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
            Response
          </h6>

          <!-- Error Display -->
          <div
            v-if="testResult.error"
            class="p-4 bg-red-50 dark:bg-red-900 rounded-lg border border-red-200 dark:border-red-800"
          >
            <div class="flex items-center gap-2 mb-2">
              <svg
                class="h-5 w-5 text-red-600"
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
              <h6 class="font-semibold text-red-800 dark:text-red-200">Error</h6>
            </div>
            <p class="text-red-700 dark:text-red-300 text-sm mb-2">{{ testResult.message }}</p>
            <p v-if="testResult.details" class="text-red-600 dark:text-red-400 text-xs font-mono">
              {{ testResult.details }}
            </p>
            <p v-if="testResult.url" class="text-gray-600 dark:text-gray-400 text-xs mt-2">
              {{ testResult.method }} {{ testResult.url }}
            </p>
          </div>

          <!-- Success Display -->
          <div v-else class="space-y-4">
            <!-- Statistics (for multiple requests) -->
            <div
              v-if="testResult.statistics"
              class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 rounded-lg border border-blue-200 dark:border-blue-800"
            >
              <h6
                class="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  ></path>
                </svg>
                Load Test Results
              </h6>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div class="text-center">
                  <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {{ testResult.statistics.totalRequests }}
                  </div>
                  <div class="text-gray-600 dark:text-gray-400">Total Requests</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                    {{ testResult.statistics.successfulRequests }}
                  </div>
                  <div class="text-gray-600 dark:text-gray-400">Successful</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-red-600 dark:text-red-400">
                    {{ testResult.statistics.failedRequests }}
                  </div>
                  <div class="text-gray-600 dark:text-gray-400">Failed</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {{ testResult.statistics.totalTime }}ms
                  </div>
                  <div class="text-gray-600 dark:text-gray-400">Total Time</div>
                </div>
              </div>
              <div
                class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-blue-200 dark:border-blue-700 text-sm"
              >
                <div class="text-center">
                  <div class="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    {{ testResult.statistics.avgResponseTime }}ms
                  </div>
                  <div class="text-gray-600 dark:text-gray-400">Average Response Time</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-semibold text-green-600 dark:text-green-400">
                    {{ testResult.statistics.minResponseTime }}ms
                  </div>
                  <div class="text-gray-600 dark:text-gray-400">Min Response Time</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-semibold text-red-600 dark:text-red-400">
                    {{ testResult.statistics.maxResponseTime }}ms
                  </div>
                  <div class="text-gray-600 dark:text-gray-400">Max Response Time</div>
                </div>
              </div>
            </div>

            <!-- Status Info -->
            <div
              :class="[
                'flex flex-wrap items-center gap-4 p-3 rounded-lg border',
                testResult.success
                  ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800',
              ]"
            >
              <div class="flex items-center gap-2">
                <svg
                  :class="['h-5 w-5', testResult.success ? 'text-green-600' : 'text-red-600']"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    v-if="testResult.success"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                  <path
                    v-else
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span
                  :class="[
                    'font-semibold',
                    testResult.success
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200',
                  ]"
                >
                  {{ testResult.firstResult?.status || testResult.status }}
                  {{ testResult.firstResult?.statusText || testResult.statusText }}
                </span>
                <span
                  v-if="testResult.statistics"
                  class="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded ml-2"
                >
                  First Request
                </span>
              </div>
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ testResult.firstResult?.responseTime || testResult.responseTime }}ms •
                {{ testResult.method }} {{ testResult.url }}
              </span>
            </div>

            <!-- Request Details -->
            <details class="bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-600">
              <summary
                class="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Request Details
              </summary>
              <div class="px-3 pb-3 space-y-2">
                <div>
                  <h6 class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Request Headers
                  </h6>
                  <pre
                    class="text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"
                  ><code>{{ JSON.stringify(testResult.requestHeaders, null, 2) }}</code></pre>
                </div>
                <div v-if="testResult.requestBody">
                  <h6 class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Request Body
                  </h6>
                  <pre
                    class="text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"
                  ><code>{{ JSON.stringify(testResult.requestBody, null, 2) }}</code></pre>
                </div>
              </div>
            </details>

            <!-- Response Headers -->
            <details class="bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-600">
              <summary
                class="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Response Headers{{ testResult.statistics ? ' (First Request)' : '' }}
              </summary>
              <div class="px-3 pb-3">
                <pre
                  class="text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"
                ><code>{{ JSON.stringify(testResult.firstResult?.headers || testResult.headers, null, 2) }}</code></pre>
              </div>
            </details>

            <!-- Response Body -->
            <div>
              <h6
                class="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"
              >
                Response Body{{ testResult.statistics ? ' (First Request)' : '' }}
                <span
                  v-if="testResult.statistics"
                  class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                >
                  Showing 1 of {{ testResult.statistics.totalRequests }}
                </span>
              </h6>
              <pre
                class="text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-3 rounded border dark:border-gray-600 overflow-x-auto max-h-96 overflow-y-auto"
              ><code>{{ typeof (testResult.firstResult?.data || testResult.data) === 'string'
                  ? (testResult.firstResult?.data || testResult.data)
                  : JSON.stringify(testResult.firstResult?.data || testResult.data, null, 2) }}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

