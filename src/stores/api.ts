import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface RouteParameter {
  name: string
  type: string
  required: boolean
}

export interface ValidationField {
  type: string
  required: boolean
  description?: string
  example?: any
}

export interface ValidationSchema {
  [key: string]: ValidationField
}

export interface ResponseTypeField {
  type: string
  description?: string
  example?: any
  required?: boolean
  properties?: Record<string, ResponseTypeField>
}

export interface ResponseType {
  fields: Record<string, ResponseTypeField>
}

export interface RateLimit {
  windowMs: number
  maxRequests: number
}

export interface ApiRoute {
  url: string
  method: string
  description?: string
  handler: string | { name: string }
  validator?: string
  middleware?: string
  middlewares?: string[]
  rateLimit?: RateLimit
  requestBody?: {
    description?: string
    schema?: ValidationSchema
    example?: any
  }
  responseSchema?: {
    schema: Record<string, ResponseTypeField>
  }
}

export interface ApiGroup {
  prefix: string
  description: string
  middlewares?: string[]
  rateLimit?: RateLimit
  group: ApiRoute[]
}

export const useApiStore = defineStore('api', () => {
  // State
  const httpRouteGroups = ref<ApiGroup[]>([])
  const wsRouteGroups = ref<ApiGroup[]>([])
  const validationSchemas = ref<Record<string, ValidationSchema>>({})
  const responseTypes = ref<Record<string, ResponseType>>({})
  const handlerTypeMapping = ref<Record<string, string>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentRouteType = ref<'http' | 'ws'>('http')
  const searchTerm = ref('')

  // Computed
  const currentRouteGroups = computed(() => {
    return currentRouteType.value === 'http' ? httpRouteGroups.value : wsRouteGroups.value
  })

  const filteredGroups = computed(() => {
    if (!searchTerm.value) {
      return currentRouteGroups.value
    }

    const term = searchTerm.value.toLowerCase()

    return currentRouteGroups.value
      .map((group) => {
        const filteredRoutes = group.group.filter((route) => {
          const handlerName =
            typeof route.handler === 'string' ? route.handler : route.handler?.name || ''

          return (
            route.url.toLowerCase().includes(term) ||
            (route.description && route.description.toLowerCase().includes(term)) ||
            handlerName.toLowerCase().includes(term)
          )
        })

        return { ...group, group: filteredRoutes }
      })
      .filter((group) => group.group.length > 0)
  })

  // Actions
  async function fetchRoutes() {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch('/api/doc/routes')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      httpRouteGroups.value = data.httpRoutes || []
      wsRouteGroups.value = data.wsRoutes || []
      validationSchemas.value = data.validationSchemas || {}
      responseTypes.value = data.responseTypes || {}
      handlerTypeMapping.value = data.handlerTypeMapping || {}

      console.log('📘 API Documentation Loaded:', {
        httpRouteGroups: httpRouteGroups.value.length,
        wsRouteGroups: wsRouteGroups.value.length,
        responseTypes: Object.keys(responseTypes.value).length,
        handlerMappings: Object.keys(handlerTypeMapping.value).length,
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load API documentation'
      console.error('Error fetching route data:', err)
    } finally {
      isLoading.value = false
    }
  }

  function setRouteType(type: 'http' | 'ws') {
    currentRouteType.value = type
  }

  function setSearchTerm(term: string) {
    searchTerm.value = term
  }

  return {
    // State
    httpRouteGroups,
    wsRouteGroups,
    validationSchemas,
    responseTypes,
    handlerTypeMapping,
    isLoading,
    error,
    currentRouteType,
    searchTerm,
    // Computed
    currentRouteGroups,
    filteredGroups,
    // Actions
    fetchRoutes,
    setRouteType,
    setSearchTerm,
  }
})
