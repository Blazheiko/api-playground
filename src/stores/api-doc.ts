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
  example?: unknown
}

export interface ValidationSchema {
  [key: string]: ValidationField
}

export interface ResponseTypeField {
  type: string
  description?: string
  example?: unknown
  required?: boolean
  properties?: Record<string, ResponseTypeField>
}

export interface ResponseType {
  name?: string
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
  handler: string | { name: string } | null
  validator?: string
  middleware?: string
  middlewares?: string[]
  rateLimit?: RateLimit
  groupRateLimit?: RateLimit
  requestBody?: {
    description?: string
    schema?: ValidationSchema
    example?: unknown
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
  const pathPrefix = ref<string>('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentRouteType = ref<'http' | 'ws'>('http')
  const searchTerm = ref('')
  const expandedRoute = ref<string | null>(null) // Format: "groupIndex-routeIndex"
  const activeRoute = ref<{ groupIndex: number; routeIndex: number } | null>(null)
  const selectedUrl = ref<string>('')
  const selectedMethod = ref<string>('')
  const selectedGroupIndex = ref<number | null>(null)

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

  const selectedGroupRoutes = computed(() => {
    if (selectedGroupIndex.value === null) {
      return []
    }

    const selectedGroup = currentRouteGroups.value[selectedGroupIndex.value]
    return selectedGroup ? [selectedGroup] : []
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
      console.log('data', data)

      httpRouteGroups.value = data.httpRoutes || []
      wsRouteGroups.value = data.wsRoutes || []
      validationSchemas.value = data.validationSchemas || {}
      responseTypes.value = data.responseTypes || {}
      handlerTypeMapping.value = data.handlerTypeMapping || {}
      pathPrefix.value = data.pathPrefix || ''

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

  function setExpandedRoute(groupIndex: number, routeIndex: number) {
    expandedRoute.value = `${groupIndex}-${routeIndex}`
  }

  function collapseAllRoutes() {
    expandedRoute.value = null
  }

  function isRouteExpanded(groupIndex: number, routeIndex: number): boolean {
    return expandedRoute.value === `${groupIndex}-${routeIndex}`
  }

  function setActiveRoute(groupIndex: number, routeIndex: number) {
    activeRoute.value = { groupIndex, routeIndex }
  }

  function clearActiveRoute() {
    activeRoute.value = null
  }

  function isRouteActive(groupIndex: number, routeIndex: number): boolean {
    return (
      activeRoute.value?.groupIndex === groupIndex && activeRoute.value?.routeIndex === routeIndex
    )
  }

  function setSelectedRoute(url: string, method: string) {
    selectedUrl.value = url
    selectedMethod.value = method
    // Автоматически определяем и устанавливаем группу
    selectedGroupIndex.value = findGroupIndexByRoute(url, method)
  }

  function clearSelectedRoute() {
    selectedUrl.value = ''
    selectedMethod.value = ''
    selectedGroupIndex.value = null
  }

  function isRouteSelected(url: string, method: string): boolean {
    return selectedUrl.value === url && selectedMethod.value === method
  }

  function findGroupIndexByRoute(url: string, method: string): number | null {
    for (let groupIndex = 0; groupIndex < currentRouteGroups.value.length; groupIndex++) {
      const group = currentRouteGroups.value[groupIndex]
      if (group && group.group) {
        const routeExists = group.group.some(
          (route) => route.url === url && route.method === method,
        )
        if (routeExists) {
          return groupIndex
        }
      }
    }
    return null
  }

  // Оставляем старые методы для обратной совместимости, но помечаем как deprecated
  function setSelectedUrl(url: string) {
    selectedUrl.value = url
    selectedMethod.value = ''
  }

  function clearSelectedUrl() {
    selectedUrl.value = ''
    selectedMethod.value = ''
  }

  async function scrollToRouteWithCollapse(
    groupIndex: number,
    routeIndex: number,
    elementId?: string,
  ) {
    // Устанавливаем активный маршрут
    setActiveRoute(groupIndex, routeIndex)

    // Сначала сворачиваем все открытые маршруты
    collapseAllRoutes()

    // Ждем следующий тик для обновления DOM
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Затем разворачиваем нужный маршрут
    setExpandedRoute(groupIndex, routeIndex)

    // Ждем еще один тик для полного обновления DOM
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Теперь выполняем скролл к элементу
    const targetElementId = elementId || `route-${groupIndex}-${routeIndex}`
    scrollToElement(targetElementId)
  }

  function scrollToElement(elementId: string, offset: number = 100) {
    const element = document.getElementById(elementId)
    if (element) {
      const mainContent = document.querySelector('main')
      if (mainContent) {
        const elementTop = element.offsetTop
        mainContent.scrollTo({
          top: elementTop - offset,
          behavior: 'smooth',
        })
      } else {
        // Fallback для случаев, когда main не найден
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return {
    // State
    httpRouteGroups,
    wsRouteGroups,
    validationSchemas,
    responseTypes,
    handlerTypeMapping,
    pathPrefix,
    isLoading,
    error,
    currentRouteType,
    searchTerm,
    expandedRoute,
    activeRoute,
    selectedUrl,
    selectedMethod,
    selectedGroupIndex,
    // Computed
    currentRouteGroups,
    filteredGroups,
    selectedGroupRoutes,
    // Actions
    fetchRoutes,
    setRouteType,
    setSearchTerm,
    setExpandedRoute,
    collapseAllRoutes,
    isRouteExpanded,
    setActiveRoute,
    clearActiveRoute,
    isRouteActive,
    setSelectedRoute,
    clearSelectedRoute,
    setSelectedUrl,
    clearSelectedUrl,
    isRouteSelected,
    findGroupIndexByRoute,
    scrollToRouteWithCollapse,
    scrollToElement,
  }
})
