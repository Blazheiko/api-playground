import WebsocketBase from '@/utils/websocket-base'
import { useEventBus } from '@/utils/event-bus'

interface HttpResponse {
  [key: string]: unknown
}

interface ApiResponse<T> {
  data: T | null
  error: { message: string; code: number } | null
  status?: number
  statusText?: string
  headers?: Record<string, string>
}

interface ApiMethods {
  http: <T = HttpResponse>(
    method: string,
    route: string,
    body?: Record<string, unknown>,
    customHeaders?: Record<string, string>,
  ) => Promise<ApiResponse<T>>
  ws: <T = HttpResponse>(route: string, body?: Record<string, unknown>) => Promise<T | null>
  setWebSocketClient: (client: WebsocketBase | null) => void
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | string

interface RequestInit {
  method: HttpMethod
  headers: Record<string, string>
  body?: string
}
const BASE_URL = 'http://127.0.0.1:8088'
let webSocketClient: WebsocketBase | null = null
const eventBus = useEventBus()

const api: ApiMethods = {
  http: async <T = HttpResponse>(
    method: HttpMethod,
    route: string,
    body: Record<string, unknown> = {},
    customHeaders: Record<string, string> = {},
  ): Promise<ApiResponse<T>> => {
    // const BASE_URL = baseUrl
    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders,
      },
    }

    if (method.toLowerCase() !== 'get' && method.toLowerCase() !== 'delete') {
      init.body = JSON.stringify(body)
    }

    try {
      let url = route
      if (route.startsWith('http')) {
        url = route
      } else if (route.startsWith('/')) {
        url = `${BASE_URL}/${route.slice(1)}`
      } else {
        url = `${BASE_URL}/${route}`
      }
      const response = await fetch(url, init)

      if (!response.ok && response.status === 422) {
        console.log('!response.ok && response.status === 422')
        const errorData = await response.json()
        console.log({ errorData })
        return {
          data: errorData,
          error: { code: 422, message: String(errorData.message || 'Validation Error') },
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        }
      }

      if (!response.ok) {
        console.log('!response.ok')
        if (response.status === 401) {
          eventBus.emit('unauthorized')
          return {
            data: null,
            error: { code: 401, message: 'Unauthorized' },
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
          }
        }
        return {
          data: null,
          error: {
            code: response.status,
            message: `HTTP error! status: ${response.status}`,
          },
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        }
      }

      const data = await response.json()
      console.log({ data })
      return {
        data: data as T,
        error: null,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      }
    } catch (error: unknown) {
      console.error('Network error:', error)
      return {
        data: null,
        error: {
          code: 0,
          message:
            error instanceof Error ? error.message : 'Network error. Please try again later.',
        },
      }
    }
  },

  setWebSocketClient: (client: WebsocketBase | null) => {
    webSocketClient = client
  },

  ws: async <T = HttpResponse>(
    route: string,
    body: Record<string, unknown> = {},
  ): Promise<T | null> => {
    if (!webSocketClient) return null

    try {
      // console.log('webSocketClient')
      // console.log(webSocketClient)
      const result = await webSocketClient.api(route, body)
      console.log({ result })
      return result as unknown as T
    } catch (e) {
      console.error(e)
      return null
    }
  },
}

export default api
