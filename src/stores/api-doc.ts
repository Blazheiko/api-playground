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

export interface ResponseType {
  name: string
  module: string
  fields: string //Record<string, ResponseTypeField>
}

export interface RateLimit {
  windowMs: number
  maxRequests: number
}

export interface ApiRoute {
  id: number
  url: string
  method: string
  description?: string
  handler: string | { name: string } | null
  validator?: string
  middleware?: string
  middlewares?: string[]
  rateLimit?: RateLimit
  groupRateLimit?: RateLimit
  typeResponse?: string
  requestBody?: {
    description?: string
    schema?: ValidationSchema
    example?: unknown
  }
  responseSchema?: {
    schema: string //Record<string, ResponseTypeField>
  }
  fullUrl?: string // Полный URL с учетом всех префиксов
  isSelected: boolean
}

export interface ApiGroup {
  prefix: string
  description: string
  middlewares?: string[]
  rateLimit?: RateLimit
  group: (ApiRoute | ApiGroup)[] // Поддержка вложенных групп
  fullPrefix?: string // Полный префикс с учетом родительских групп
}

// Интерфейс для отфильтрованных групп (только маршруты, без вложенных групп)
export interface FilteredApiGroup {
  prefix: string
  description: string
  middlewares?: string[]
  rateLimit?: RateLimit
  group: ApiRoute[] // Только маршруты, без групп
  fullPrefix?: string
}

// Интерфейс для плоской группы (только маршруты, без вложенных групп)
export interface FlatApiGroup {
  prefix: string
  fullPrefix: string
  description: string
  group: ApiRoute[] // Только маршруты, без групп
}

export const useApiStore = defineStore('api', () => {
  // State
  const httpRouteGroups = ref<ApiGroup[]>([])
  const wsRouteGroups = ref<ApiGroup[]>([])
  const flatHttpRoute = ref<ApiRoute[]>([])
  const flatWsRoute = ref<ApiRoute[]>([])
  const validationSchemas = ref<Record<string, ValidationSchema>>({})
  const responseTypes = ref<Record<string, ResponseType>>({})
  const pathPrefix = ref<string>('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentRouteType = ref<'http' | 'ws'>('http')
  const searchTerm = ref('')
  const expandedRoute = ref<number | null>(null) // ID маршрута
  const activeRoute = ref<number | null>(null) // ID маршрута
  const selectedRouteId = ref<number | null>(null) // ID выбранного маршрута

  // Вспомогательные функции для обработки вложенных групп
  function normalizePrefix(parentPrefix: string): string {
    if (!parentPrefix) return ''
    let normalizedPrefix = parentPrefix
    if (parentPrefix.endsWith('/')) {
      normalizedPrefix = parentPrefix.slice(0, -1)
    }
    if (parentPrefix.startsWith('/')) {
      normalizedPrefix = parentPrefix.slice(1)
    }

    return normalizedPrefix
  }

  let currentId = 0
  function getNextId(): number {
    return ++currentId
  }
  const groupsHttp = ref<ApiGroup[]>([])
  const groupsWs = ref<ApiGroup[]>([])

  function createGroupRoute(groups: ApiGroup[], group: ApiGroup, parentPrefix: string = '') {
    // console.log('createGroupRoute', group)
    const normalizedParentPrefix = parentPrefix ? normalizePrefix(parentPrefix) : ''
    const groupRoutes = groupRouteHandler(
      groups,
      group.group,
      `${normalizedParentPrefix}/${normalizePrefix(group.prefix)}`,
    )
    const groupItem = {
      ...group,
      group: groupRoutes,
    }
    groups.push(groupItem)
  }

  function groupRouteHandler(
    groups: ApiGroup[],
    groupRoutes: (ApiRoute | ApiGroup)[],
    parentPrefix: string = '',
  ): ApiRoute[] {
    const routes: ApiRoute[] = []
    const normalizedParentPrefix = parentPrefix ? normalizePrefix(parentPrefix) : ''
    if (!Array.isArray(groupRoutes)) throw new Error('groupRoutes is not an array')

    for (const item of groupRoutes) {
      if ('group' in item && item.group && Array.isArray(item.group)) {
        createGroupRoute(groups, item, `${normalizedParentPrefix}/${normalizePrefix(item.prefix)}`)
        // Рекурсивно обрабатываем вложенные группы
        // routes.push(
        //   ...groupRouteHandler([item], `${parentPrefix}/${normalizePrefix(group.prefix)}`),
        // )
      } else {
        const route = item as ApiRoute
        const id = getNextId()
        route.id = id

        routes.push({
          ...route,
          // id,
          requestBody: route.validator
            ? {
                schema: validationSchemas.value[route.validator] || {},
              }
            : undefined,
          responseSchema: {
            schema: route.typeResponse ? responseTypes.value[route.typeResponse]?.fields || '' : '',
          },
          fullUrl: `${normalizedParentPrefix}/${normalizePrefix(route.url)}`.replace(/\/+/g, '/'),
          isSelected: false,
        })
      }
    }

    return routes
  }

  // Computed
  const currentRouteGroups = computed(() => {
    return currentRouteType.value === 'http' ? httpRouteGroups.value : wsRouteGroups.value
  })

  // Computed для центральной части - использует линейную структуру групп от groupRouteHandler
  const centralGroups = computed(() => {
    const currentGroups = currentRouteType.value === 'http' ? groupsHttp.value : groupsWs.value

    if (!searchTerm.value) {
      return currentGroups
    }

    // Фильтруем группы по поисковому запросу
    const term = searchTerm.value.toLowerCase()
    return currentGroups
      .map((group) => {
        const filteredRoutes = group.group.filter((item) => {
          // Проверяем, что это маршрут, а не группа
          if ('group' in item) return false

          const route = item as ApiRoute
          const handlerName =
            typeof route.handler === 'string' ? route.handler : route.handler?.name || ''
          return (
            route.url.toLowerCase().includes(term) ||
            (route.description && route.description.toLowerCase().includes(term)) ||
            handlerName.toLowerCase().includes(term) ||
            (route.fullUrl && route.fullUrl.toLowerCase().includes(term))
          )
        })

        return {
          ...group,
          group: filteredRoutes as ApiRoute[],
        }
      })
      .filter((group) => group.group.length > 0)
  })

  // Computed для фильтрации групп с учетом поиска (для совместимости)
  const filteredGroups = computed(() => {
    // Используем плоские маршруты с правильными ID для создания групп
    const currentFlatRoutes =
      currentRouteType.value === 'http' ? flatHttpRoute.value : flatWsRoute.value

    // Фильтруем плоские маршруты
    let routesToShow = currentFlatRoutes
    if (searchTerm.value) {
      const term = searchTerm.value.toLowerCase()
      routesToShow = currentFlatRoutes.filter((route) => {
        const handlerName =
          typeof route.handler === 'string' ? route.handler : route.handler?.name || ''

        return (
          route.url.toLowerCase().includes(term) ||
          (route.description && route.description.toLowerCase().includes(term)) ||
          handlerName.toLowerCase().includes(term) ||
          (route.fullUrl && route.fullUrl.toLowerCase().includes(term))
        )
      })
    }

    // Группируем отфильтрованные маршруты обратно в структуру групп
    const groupsMap: { [key: string]: ApiRoute[] } = {}

    routesToShow.forEach((route) => {
      // Извлекаем префикс группы из fullUrl
      const urlParts = route.fullUrl?.split('/').filter((part) => part) || []
      const groupPrefix = urlParts.length > 1 ? urlParts[urlParts.length - 2] || 'root' : 'root'

      if (!groupsMap[groupPrefix]) {
        groupsMap[groupPrefix] = []
      }
      groupsMap[groupPrefix].push(route)
    })

    // Создаем структуру групп из отфильтрованных маршрутов
    const groups: FilteredApiGroup[] = []

    Object.entries(groupsMap).forEach(([prefix, routes]) => {
      // Находим оригинальную группу для получения метаданных
      const originalGroup = findOriginalGroup(prefix, currentRouteGroups.value)

      const group: FilteredApiGroup = {
        prefix: prefix,
        description: originalGroup?.description || `Group ${prefix}`,
        middlewares: originalGroup?.middlewares,
        rateLimit: originalGroup?.rateLimit,
        group: routes,
        fullPrefix: originalGroup?.fullPrefix || prefix,
      }

      groups.push(group)
    })

    return groups
  })

  // Вспомогательная функция для поиска оригинальной группы
  function findOriginalGroup(prefix: string, groups: ApiGroup[]): ApiGroup | null {
    for (const group of groups) {
      if (group.prefix === prefix) {
        return group
      }
      // Рекурсивный поиск во вложенных группах
      for (const item of group.group) {
        if ('group' in item) {
          const found = findOriginalGroup(prefix, [item])
          if (found) return found
        }
      }
    }
    return null
  }

  // Computed для древовидной структуры (для SiteNavigation)
  const filteredTreeGroups = computed(() => {
    if (!searchTerm.value) {
      return currentRouteGroups.value
    }

    const term = searchTerm.value.toLowerCase()

    function filterTreeGroups(groups: ApiGroup[]): ApiGroup[] {
      return groups
        .map((group) => {
          const filteredRoutes = group.group.filter((item) => {
            if ('group' in item) return true // Группы всегда показываем

            const route = item as ApiRoute
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
    }

    return filterTreeGroups(currentRouteGroups.value)
  })

  // Computed для плоского списка маршрутов (для OnThisPage)
  const filteredFlatRoutes = computed(() => {
    if (!searchTerm.value) {
      return currentRouteType.value === 'http' ? flatHttpRoute.value : flatWsRoute.value
    }

    const term = searchTerm.value.toLowerCase()
    const currentFlatRoutes =
      currentRouteType.value === 'http' ? flatHttpRoute.value : flatWsRoute.value

    return currentFlatRoutes.filter((route) => {
      const handlerName =
        typeof route.handler === 'string' ? route.handler : route.handler?.name || ''

      return (
        route.url.toLowerCase().includes(term) ||
        (route.description && route.description.toLowerCase().includes(term)) ||
        handlerName.toLowerCase().includes(term) ||
        (route.fullUrl && route.fullUrl.toLowerCase().includes(term))
      )
    })
  })

  // Группировка плоских маршрутов по группам для OnThisPage
  const groupedFlatRoutes = computed(() => {
    const groups: { [key: string]: ApiRoute[] } = {}

    // Группируем маршруты по их полному пути группы
    filteredFlatRoutes.value.forEach((route) => {
      const groupKey = route.fullUrl?.split('/').slice(0, -1).join('/') || 'root'
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(route)
    })

    // Создаем плоскую структуру групп
    const flatGroups: FlatApiGroup[] = []

    Object.entries(groups).forEach(([groupPath, routes]) => {
      const flatGroup: FlatApiGroup = {
        prefix: groupPath,
        fullPrefix: groupPath,
        description: `Group: ${groupPath}`,
        group: routes,
      }
      flatGroups.push(flatGroup)
    })

    return flatGroups
  })

  // Computed для получения выбранного маршрута
  const selectedRoute = computed(() => {
    if (selectedRouteId.value === null) {
      return null
    }
    return findRouteById(selectedRouteId.value)
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
      pathPrefix.value = data.pathPrefix || ''

      // Обрабатываем группы для создания плоской структуры
      groupsHttp.value = []
      groupsWs.value = []
      groupRouteHandler(groupsHttp.value, httpRouteGroups.value, pathPrefix.value)
      flatHttpRoute.value = groupsHttp.value.flatMap(
        (group) => group.group.filter((item) => !('group' in item)) as ApiRoute[],
      )
      groupRouteHandler(groupsWs.value, wsRouteGroups.value, pathPrefix.value)
      flatWsRoute.value = groupsWs.value.flatMap(
        (group) => group.group.filter((item) => !('group' in item)) as ApiRoute[],
      )

      console.log('📊 Linear groups structure (for central display):')
      console.log('  HTTP groups:', groupsHttp.value.length)
      console.log('  WS groups:', groupsWs.value.length)

      if (groupsHttp.value.length > 0) {
        const firstGroup = groupsHttp.value[0]
        console.log('  Sample HTTP group:', {
          prefix: firstGroup?.prefix,
          description: firstGroup?.description,
          routesCount: firstGroup?.group.filter((item) => !('group' in item)).length || 0,
        })
      }

      console.log('📊 Flat routes (for navigation):')
      console.log('  HTTP routes:', flatHttpRoute.value.length)
      console.log('  WS routes:', flatWsRoute.value.length)

      console.log('📘 API Documentation Loaded:', {
        httpRouteGroups: httpRouteGroups.value.length,
        wsRouteGroups: wsRouteGroups.value.length,
        flatHttpRoutes: flatHttpRoute.value.length,
        flatWsRoutes: flatWsRoute.value.length,
        responseTypes: Object.keys(responseTypes.value).length,
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

  function setExpandedRoute(routeId: number) {
    expandedRoute.value = routeId
  }

  function collapseAllRoutes() {
    expandedRoute.value = null
  }

  function isRouteExpanded(routeId: number): boolean {
    return expandedRoute.value === routeId
  }

  function setActiveRoute(routeId: number) {
    activeRoute.value = routeId
  }

  function clearActiveRoute() {
    activeRoute.value = null
  }

  function isRouteActive(routeId: number): boolean {
    return activeRoute.value === routeId
  }

  function clearSelectedRoutes(routes: ApiRoute[]) {
    routes.forEach((route) => (route.isSelected = false))
  }

  function setSelectedRoute(routeId: number) {
    if (routeId === undefined || routeId === null || isNaN(routeId) || routeId <= 0) {
      console.error('Invalid routeId provided to setSelectedRoute:', routeId)
      return
    }

    clearSelectedRoutes(currentRouteType.value === 'http' ? flatHttpRoute.value : flatWsRoute.value)
    selectedRouteId.value = routeId
    const route = findRouteById(routeId)
    if (route) {
      route.isSelected = true
    } else {
      console.error('Route not found for routeId:', routeId)
    }
  }

  function clearSelectedRoute() {
    selectedRouteId.value = null
  }

  function isRouteSelected(routeId: number): boolean {
    return selectedRouteId.value === routeId
  }

  function findRouteById(routeId: number): ApiRoute | null {
    const currentFlatRoutes =
      currentRouteType.value === 'http' ? flatHttpRoute.value : flatWsRoute.value
    return currentFlatRoutes.find((route) => route.id === routeId) || null
  }

  function findRouteByFullUrl(fullUrl: string, method: string): ApiRoute | null {
    const currentFlatRoutes =
      currentRouteType.value === 'http' ? flatHttpRoute.value : flatWsRoute.value
    return (
      currentFlatRoutes.find((route) => route.fullUrl === fullUrl && route.method === method) ||
      null
    )
  }

  async function scrollToRouteWithCollapse(routeId: number, elementId?: string) {
    // Устанавливаем активный маршрут
    setActiveRoute(routeId)

    // Сначала сворачиваем все открытые маршруты
    collapseAllRoutes()

    // Ждем следующий тик для обновления DOM
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Затем разворачиваем нужный маршрут
    setExpandedRoute(routeId)

    // Ждем еще один тик для полного обновления DOM
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Теперь выполняем скролл к элементу
    const targetElementId = elementId || `route-${routeId}`
    scrollToElement(targetElementId)
  }

  function scrollToElement(elementId: string, offset: number = 100) {
    const element = document.getElementById(elementId)
    if (element) {
      // Сначала пробуем простой scrollIntoView с настройками
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
            top: Math.max(0, currentScrollTop - offset),
            behavior: 'smooth',
          })
        }
      }, 100)
    }
  }

  return {
    // State
    httpRouteGroups,
    wsRouteGroups,
    flatHttpRoute,
    flatWsRoute,
    validationSchemas,
    responseTypes,
    pathPrefix,
    isLoading,
    error,
    currentRouteType,
    searchTerm,
    expandedRoute,
    activeRoute,
    selectedRouteId,
    // Computed
    currentRouteGroups,
    centralGroups,
    filteredGroups,
    filteredTreeGroups,
    filteredFlatRoutes,
    groupedFlatRoutes,
    selectedRoute,
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
    clearSelectedRoutes,
    isRouteSelected,
    findRouteById,
    findRouteByFullUrl,
    scrollToRouteWithCollapse,
    scrollToElement,
  }
})
