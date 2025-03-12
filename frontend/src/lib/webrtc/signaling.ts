import { io, Socket } from 'socket.io-client'
import {
  SignalingConnection,
  SignalingConnectionOptions,
  SignalingConnectionState,
  SignalingMessage,
} from './types'

export class SocketIOSignaling implements SignalingConnection {
  private _socket: Socket | null = null
  private _state: SignalingConnectionState = 'disconnected'
  private _options: SignalingConnectionOptions

  constructor(options: SignalingConnectionOptions) {
    this._options = options
  }

  get state(): SignalingConnectionState {
    return this._state
  }

  async connect(): Promise<void> {
    if (this._socket) {
      return
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('开始建立信令连接')
        this._state = 'connecting'
        this._socket = io(process.env.NEXT_PUBLIC_WS_URL || '', {
          transports: ['websocket', 'polling'],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          path: '/socket.io',
          timeout: 20000,
          forceNew: false,
        })

        // 添加连接事件监听
        this._socket.on('connect_error', (error) => {
          console.error('连接错误详情:', error)
          this._state = 'error'
          this._options.onError?.(error)
        })

        this._socket.on('connect_timeout', (timeout) => {
          console.error('连接超时:', timeout)
          this._state = 'error'
          this._options.onError?.(new Error('Connection timeout'))
        })

        this._socket.on('connect', () => {
          console.log('Socket.IO连接已建立，socket id:', this._socket?.id)
          this._state = 'connected'
          resolve()
        })

        this._socket.on('disconnect', (reason) => {
          console.log('Socket.IO连接已断开，原因:', reason)
          this._state = 'disconnected'
          this._options.onClose?.()
        })

        this._socket.on('error', (error) => {
          console.error('Socket.IO错误:', error)
          this._state = 'error'
          this._options.onError?.(error)
        })

        // 处理所有信令消息
        const messageTypes = [
          'offer',
          'answer',
          'ice_candidate',
          'user_joined',
          'user_left',
          'room_update',
        ] as const
        messageTypes.forEach((type) => {
          this._socket?.on(type, (data) => {
            console.log(`收到${type}消息:`, data)
            this._options.onMessage?.({
              type,
              data,
            })
          })
        })
      } catch (error) {
        console.error('建立信令连接失败:', error)
        this._state = 'error'
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    if (!this._socket) {
      return
    }

    return new Promise((resolve) => {
      // 发送离开房间消息
      this._socket?.emit('leave_room', {
        room_id: this._options.roomId,
        user_id: this._options.userId,
      })

      this._socket?.disconnect()
      this._socket = null
      this._state = 'disconnected'
      resolve()
    })
  }

  async send(message: SignalingMessage): Promise<void> {
    if (!this._socket || this._state !== 'connected') {
      throw new Error('Socket.IO not connected')
    }

    return new Promise((resolve, reject) => {
      try {
        this._socket?.emit(message.type, {
          ...message.data,
          room_id: this._options.roomId,
          from_user_id: this._options.userId,
          target_user_id: message.data.peerId,
        })
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }
}
