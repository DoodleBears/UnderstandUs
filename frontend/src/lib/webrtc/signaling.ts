import {
  SignalingConnection,
  SignalingConnectionOptions,
  SignalingConnectionState,
  SignalingMessage,
} from './types'

export class WebSocketSignaling implements SignalingConnection {
  private _ws: WebSocket | null = null
  private _state: SignalingConnectionState = 'disconnected'
  private _options: SignalingConnectionOptions
  private _reconnectAttempts = 0
  private _maxReconnectAttempts = 5
  private _reconnectTimeout = 1000 // 初始重连等待时间（毫秒）
  private _heartbeatInterval: NodeJS.Timeout | null = null

  constructor(options: SignalingConnectionOptions) {
    this._options = options
  }

  get state(): SignalingConnectionState {
    return this._state
  }

  private _startHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval)
    }
    this._heartbeatInterval = setInterval(() => {
      if (this._ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'heartbeat',
          data: {},
        })
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  private _stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval)
      this._heartbeatInterval = null
    }
  }

  async connect(): Promise<void> {
    if (this._ws) {
      return
    }

    return new Promise((resolve, reject) => {
      try {
        this._state = 'connecting'
        this._ws = new WebSocket(this._options.url)

        this._ws.onopen = () => {
          this._state = 'connected'
          this._reconnectAttempts = 0
          this._reconnectTimeout = 1000

          // 发送加入房间消息
          this.send({
            type: 'join_room',
            data: {
              roomId: this._options.roomId,
              userId: this._options.userId,
            },
          })

          // 启动心跳
          this._startHeartbeat()

          resolve()
        }

        this._ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as SignalingMessage
            this._options.onMessage?.(message)
          } catch (error) {
            console.error('解析信令消息失败:', error)
          }
        }

        this._ws.onerror = (error) => {
          this._state = 'error'
          this._options.onError?.(error as unknown as Error)
          this._attemptReconnect()
        }

        this._ws.onclose = () => {
          this._state = 'disconnected'
          this._stopHeartbeat()
          this._options.onClose?.()
          this._attemptReconnect()
        }
      } catch (error) {
        this._state = 'error'
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    if (!this._ws) {
      return
    }

    return new Promise((resolve) => {
      // 发送离开房间消息
      this.send({
        type: 'leave_room',
        data: {
          roomId: this._options.roomId,
          userId: this._options.userId,
        },
      })

      this._stopHeartbeat()
      this._ws?.close()
      this._ws = null
      this._state = 'disconnected'
      resolve()
    })
  }

  async send(message: SignalingMessage): Promise<void> {
    if (!this._ws || this._state !== 'connected') {
      throw new Error('WebSocket 未连接')
    }

    return new Promise((resolve, reject) => {
      try {
        this._ws?.send(JSON.stringify(message))
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  private async _attemptReconnect(): Promise<void> {
    if (
      this._reconnectAttempts < this._maxReconnectAttempts &&
      this._state !== 'connecting'
    ) {
      this._reconnectAttempts++
      console.log(
        `尝试重连 (${this._reconnectAttempts}/${this._maxReconnectAttempts})...`
      )

      await new Promise((resolve) =>
        setTimeout(resolve, this._reconnectTimeout)
      )
      this._reconnectTimeout *= 2 // 指数退避

      try {
        await this.connect()
      } catch (error) {
        console.error('重连失败:', error)
      }
    } else if (this._reconnectAttempts >= this._maxReconnectAttempts) {
      console.error('达到最大重连次数')
      this._state = 'error'
      this._options.onError?.(new Error('重连失败'))
    }
  }
}
