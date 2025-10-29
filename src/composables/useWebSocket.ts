import { ref, computed, readonly } from 'vue'
import WebsocketBase, { type WebsocketMessage } from '@/utils/websocket-base'

interface WebSocketState {
  url: string
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastMessage: WebsocketMessage | null
}

const wsInstance = ref<WebsocketBase | null>(null)
const wsState = ref<WebSocketState>({
  url: '',
  isConnected: false,
  isConnecting: false,
  error: null,
  lastMessage: null,
})

export const useWebSocket = () => {
  const connect = async (url: string) => {
    if (wsInstance.value) {
      disconnect()
    }

    try {
      wsState.value.isConnecting = true
      wsState.value.error = null
      wsState.value.url = url

      wsInstance.value = new WebsocketBase(url, {
        callbacks: {
          onOpen: () => {
            console.log('WebSocket connection opened')
            wsState.value.isConnected = true
            wsState.value.isConnecting = false
            wsState.value.error = null
          },
          onClose: (event) => {
            console.log('WebSocket connection closed:', event.code, event.reason)
            wsState.value.isConnected = false
            wsState.value.isConnecting = false
            if (!wsState.value.error) {
              // Только устанавливаем ошибку если её ещё нет (чтобы не перезаписать ошибку подключения)
              wsState.value.error =
                event.code !== 1000
                  ? `Connection closed: ${event.reason || 'Unknown reason'}`
                  : null
            }
          },
          onError: (error) => {
            console.error('WebSocket connection error:', error)
            wsState.value.isConnected = false
            wsState.value.isConnecting = false
            wsState.value.error = 'Connection error occurred'
          },
          onBroadcast: (message) => {
            wsState.value.lastMessage = message
            console.log('WebSocket broadcast received:', message)
          },
          onReauthorize: async () => {
            console.log('WebSocket reauthorization required')
            wsState.value.error = 'Authorization required'
          },
        },
      })

      // Ждем установки соединения (состояние управляется через callbacks)
      // Просто ждем некоторое время для инициализации
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 100)
      })
    } catch (error) {
      wsState.value.error = error instanceof Error ? error.message : 'Connection failed'
      wsState.value.isConnecting = false
      wsState.value.isConnected = false
      console.error('WebSocket connection error:', error)
      throw error
    }
  }

  const disconnect = () => {
    if (wsInstance.value) {
      wsInstance.value.destroy()
      wsInstance.value = null
    }

    wsState.value.isConnected = false
    wsState.value.isConnecting = false
    wsState.value.error = null
    wsState.value.url = ''
    wsState.value.lastMessage = null
  }

  const sendMessage = async (event: string, payload: Record<string, unknown> = {}) => {
    if (!wsInstance.value || !wsState.value.isConnected) {
      throw new Error('WebSocket is not connected')
    }

    try {
      const response = await wsInstance.value.api(event, payload)
      return response
    } catch (error) {
      console.error('Error sending WebSocket message:', error)
      throw error
    }
  }

  const ping = () => {
    if (wsInstance.value && wsState.value.isConnected) {
      wsInstance.value.pingServer()
    }
  }

  // Computed properties
  const connectionStatus = computed(() => {
    if (wsState.value.isConnecting) return 'connecting'
    if (wsState.value.isConnected) return 'connected'
    if (wsState.value.error) return 'error'
    return 'disconnected'
  })

  const statusColor = computed(() => {
    switch (connectionStatus.value) {
      case 'connected':
        return 'text-green-500'
      case 'connecting':
        return 'text-yellow-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  })

  const statusText = computed(() => {
    switch (connectionStatus.value) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return 'Error'
      default:
        return 'Disconnected'
    }
  })

  return {
    // State
    wsState: readonly(wsState),

    // Computed
    connectionStatus,
    statusColor,
    statusText,

    // Methods
    connect,
    disconnect,
    sendMessage,
    ping,

    // Getters
    isConnected: computed(() => wsState.value.isConnected),
    isConnecting: computed(() => wsState.value.isConnecting),
    error: computed(() => wsState.value.error),
    url: computed(() => wsState.value.url),
    lastMessage: computed(() => wsState.value.lastMessage),
  }
}
