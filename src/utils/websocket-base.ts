interface WebsocketConnection {
  ws: WebSocket | null
  closeInitiated?: boolean
  timerPing?: number
}

interface ApiResolveItem {
  resolve: (data: WebsocketMessage) => void
  reject: (error?: ApiError) => void
  timeout: number
}

export interface WebsocketPayload {
  [key: string]: unknown
}

export interface WebsocketMessage {
  event: string
  status: number
  payload: WebsocketPayload
  timestamp?: number
}

interface ApiError {
  status?: number
  message?: string
  messages?: string[]
}

interface SendPayload {
  event: string
  timestamp?: number
  payload: Record<string, unknown>
}

enum ConnectionStatus {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

interface WebsocketCallbacks {
  onReauthorize?: () => Promise<void>
  onBroadcast?: (message: WebsocketMessage) => void
  onOpen?: () => void
  onClose?: (event: CloseEvent) => void
  onError?: (error: Event) => void
}

// interface ServiceError {
//     code: number
//     message: string
// }

interface WebsocketConfig {
  reconnectDelay?: number
  maxReconnectAttempts?: number
  pingInterval?: number
  timeout?: number
  authToken?: string
  callbacks?: WebsocketCallbacks
}

class WebsocketBase {
  private reconnectDelay: number
  private maxReconnectAttempts: number
  private reconnectAttempts: number
  private pingInterval: number
  private timeout: number
  private authToken?: string
  private callbacks?: WebsocketCallbacks
  private wsConnection: WebsocketConnection
  private apiResolve: Record<string, ApiResolveItem>
  private connectionEstablished: boolean
  private timerClose?: number
  private messageQueue: SendPayload[] = []
  private isDestroyed: boolean = false
  private timerReconnect?: number
  private timeoutApi: number = 20000

  constructor(url: string, options: WebsocketConfig = {}) {
    this.reconnectDelay = options.reconnectDelay || 5000
    this.maxReconnectAttempts = options.maxReconnectAttempts || 500
    this.reconnectAttempts = 0
    this.pingInterval = options.pingInterval || 10000
    this.timeout = options.timeout || 20000
    this.authToken = options.authToken
    this.callbacks = options.callbacks
    this.timeoutApi = options.timeout || 20000
    this.wsConnection = {
      ws: null,
      closeInitiated: false,
      timerPing: undefined,
    }
    this.apiResolve = {}
    this.connectionEstablished = false
    this.initConnect(url)
  }

  isConnected(): boolean {
    return (
      Boolean(this.wsConnection.ws) && this.wsConnection.ws?.readyState === ConnectionStatus.OPEN
    )
  }

  private initConnect(url: string): void {
    if (this.isDestroyed) {
      console.warn('WebSocket instance has been destroyed, cannot reconnect')
      return
    }

    console.log(`Connecting to WebSocket server: ${url}`)
    this.wsConnection.ws = new WebSocket(url)
    // this.wsConnection.ws = ws
    this.wsConnection.closeInitiated = false

    this.wsConnection.ws.onopen = (): void => {
      console.log(`Open to WebSocket server: ${url}`)
      this.reconnectAttempts = 0

      // if (this.authToken) {
      //     this.send({ event: 'auth', payload: { token: this.authToken } })
      // }

      this.wsConnection.timerPing = window.setTimeout(() => {
        this.pingServer()
      }, this.pingInterval)

      this.processMessageQueue()

      // Вызываем callback при открытии соединения
      if (this.callbacks?.onOpen) {
        this.callbacks.onOpen()
      }
    }

    this.wsConnection.ws.onmessage = (message: MessageEvent): void => {
      try {
        console.log('onmessage: ', message.data)
        const data: WebsocketMessage = JSON.parse(message.data as string)
        if (!this.validateMessage(data)) {
          console.error('Invalid message format:', data)
          return
        }

        if (data.event === 'service:error') {
          this.handleServiceError(data)
        } else if (data.event.startsWith('broadcast:')) {
          this.handleBroadcast(data)
        } else if (data.event.startsWith('service:')) {
          this.service(data)
        } else if (data.event.startsWith('api/')) {
          this.messageHandler(data)
        }
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    }

    this.wsConnection.ws.onerror = (err: Event): void => {
      console.error('WebSocket error:', err)

      // Вызываем callback при ошибке
      if (this.callbacks?.onError) {
        this.callbacks.onError(err)
      }

      this.handleReconnect(url)
    }

    this.wsConnection.ws.onclose = (event: CloseEvent): void => {
      // Вызываем callback при закрытии соединения
      if (this.callbacks?.onClose) {
        this.callbacks.onClose(event)
      }

      if (!this.wsConnection.closeInitiated) {
        console.warn(`Connection closed: ${event.code} - ${event.reason}`)
        this.handleReconnect(url)
      } else {
        this.wsConnection.closeInitiated = false
      }
    }
  }

  private validateMessage(message: WebsocketMessage): boolean {
    return Boolean(
      message &&
        typeof message.event === 'string' &&
        (!message.payload || typeof message.payload === 'object'),
    )
  }

  private handleReconnect(url: string): void {
    if (this.isDestroyed) {
      return
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 15000)
      console.warn(
        `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      )

      this.timerReconnect = window.setTimeout(() => {
        if (!this.isDestroyed) {
          this.wsConnection.closeInitiated = true
          if (this.wsConnection.ws) {
            this.wsConnection.ws.close()
            this.wsConnection.ws.onclose = null
            this.wsConnection.ws.onerror = null
            this.wsConnection.ws.onmessage = null
            this.wsConnection.ws.onopen = null
            this.wsConnection.ws = null
          }
          this.initConnect(url)
        }
      }, delay)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.send(message)
      }
    }
  }

  /**
   * Unsubscribe the stream
   */
  disconnect(): void {
    if (!this.isConnected()) console.warn('No connection to close.')
    else {
      this.wsConnection.closeInitiated = true
      if (this.wsConnection.ws) {
        this.wsConnection.ws.close()
      }
      if (this.wsConnection.timerPing) {
        window.clearInterval(this.wsConnection.timerPing)
      }
      console.log('Disconnected with Binance Websocket Server')
    }
  }

  /**
   * Send Ping message to the Websocket Server
   */
  pingServer(): void {
    if (this.isDestroyed) {
      return
    }

    if (!this.isConnected()) {
      console.warn('Ping only can be sent when connection is ready.')
      return
    }
    console.log('Ping server')
    this.send({ event: 'service:ping', payload: {} })
  }

  send(payload: SendPayload): void {
    if (this.isDestroyed) {
      return
    }

    if (!this.isConnected()) {
      console.warn('Connection not ready, adding to queue')
      this.messageQueue.push(payload)
      return
    }

    if (this.timerClose) {
      window.clearTimeout(this.timerClose)
    }

    this.timerClose = window.setTimeout(() => {
      this.disconnect()
    }, this.timeout)

    if (this.wsConnection.ws) {
      try {
        if (this.wsConnection.timerPing) window.clearTimeout(this.wsConnection.timerPing)
        this.wsConnection.ws.send(JSON.stringify(payload))
        this.wsConnection.timerPing = window.setTimeout(() => {
          this.pingServer()
        }, this.pingInterval)
      } catch (error) {
        console.error('Error sending message:', error)
        this.messageQueue.push(payload)
      }
    }
  }

  async api(route: string, payload: Record<string, unknown> = {}): Promise<WebsocketMessage> {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now()
      const key = `${timestamp}_${route}`
      if (this.apiResolve[key]) {
        reject({ code: 409, message: 'Request already in progress' })
        return
      }
      // if(route.startsWith('/')) {
      //   route = route.substring(1)
      // }


      this.send({
        event: route as string,
        timestamp,
        payload,
      })
      this.apiResolve[key] = {
        resolve,
        reject,
        timeout: window.setTimeout(() => {
          console.error('timeout', route)
          reject({ code: 408, message: 'Timeout' })
        }, this.timeoutApi),
      }
    })
  }

  private service(data: WebsocketMessage): void {
    const serviceHandlers: Record<string, (payload: WebsocketPayload) => void | boolean> = {
      pong: () => {
        if (this.timerClose) window.clearTimeout(this.timerClose)
      },
      connection_established: (payload: WebsocketPayload) => {
        this.connectionEstablished = true
        console.log('connection_established', payload)
        // return this.connectionEstablished
      },
    }

    if (data && data.event) {
      const arr = data.event.split(':') as string[]
      if (arr.length < 2) return
      const handlerName = arr[1]
      const handler = serviceHandlers[handlerName as string]
      if (handler) handler(data.payload)
    }
  }

  private messageHandler(data: WebsocketMessage): void {
    console.log('message handler')
    // const arr = data.event.split(':')
    // if (arr.length < 2) return
    // const route = arr[1]
    const route = data.event
    const key = `${data.timestamp}_${route}`
    const cb = this.apiResolve[key]
    if (!cb) return
    window.clearTimeout(cb.timeout)
    delete this.apiResolve[key]
    if (data.status === 200 && cb.resolve) cb.resolve(data)
    else if (cb.reject)
      cb.reject({
        status: data?.status,
        message: data?.payload?.message as string | undefined,
        messages: data?.payload?.messages as string[] | undefined,
      })
  }

  private async handleReauthorize(): Promise<void> {
    try {
      this.destroy()
      if (this.callbacks?.onReauthorize) {
        console.error('handleReauthorize callback')
        await this.callbacks.onReauthorize()
      }
    } catch (error) {
      console.error('Reauthorization failed:', error)
    }
  }

  private handleServiceError(data: WebsocketMessage): void {
    if (data.status === 4001) {
      console.warn('Token expired or invalid:', data.payload.message)
      this.handleReauthorize()
    }
  }

  private handleBroadcast(message: WebsocketMessage): void {
    console.log('handleBroadcast')
    if (this.callbacks?.onBroadcast) {
      this.callbacks.onBroadcast(message)
    }
  }

  /**
   * Полностью уничтожает экземпляр WebSocket соединения
   * Закрывает соединение, очищает таймеры и освобождает ресурсы
   */
  destroy(): void {
    if (this.isDestroyed) {
      return
    }

    this.isDestroyed = true

    // Закрываем соединение
    if (this.wsConnection.ws) {
      this.wsConnection.closeInitiated = true
      this.wsConnection.ws.close()
      this.wsConnection.ws.onclose = null
      this.wsConnection.ws.onerror = null
      this.wsConnection.ws.onmessage = null
      this.wsConnection.ws.onopen = null
    }

    if (this.timerReconnect) {
      window.clearTimeout(this.timerReconnect)
      this.timerReconnect = undefined
    }

    // Очищаем таймеры
    if (this.wsConnection?.timerPing) {
      window.clearInterval(this.wsConnection.timerPing)
      this.wsConnection.timerPing = undefined
    }

    if (this.timerClose) {
      window.clearTimeout(this.timerClose)
      this.timerClose = undefined
    }

    // Очищаем очередь сообщений
    this.messageQueue = []

    // Очищаем обработчики API
    Object.values(this.apiResolve).forEach((item) => {
      if (item.timeout) {
        window.clearTimeout(item.timeout)
      }
    })
    this.apiResolve = {}

    // Сбрасываем состояние
    this.connectionEstablished = false
    this.wsConnection = {
      ws: null,
      closeInitiated: false,
      timerPing: undefined,
    }
  }
}

export default WebsocketBase
