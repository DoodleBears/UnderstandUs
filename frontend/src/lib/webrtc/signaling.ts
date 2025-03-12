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
        this._state = 'connecting'
        this._socket = io(this._options.url, {
          transports: ['websocket'],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        })

        this._socket.on('connect', () => {
          this._state = 'connected'

          // 发送加入房间消息
          this._socket?.emit('join_room', {
            room_id: this._options.roomId,
            user_id: this._options.userId,
          })

          resolve()
        })

        this._socket.on('disconnect', () => {
          this._state = 'disconnected'
          this._options.onClose?.()
        })

        this._socket.on('connect_error', (error) => {
          this._state = 'error'
          this._options.onError?.(error)
        })

        this._socket.on('error', (error) => {
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
            this._options.onMessage?.({
              type,
              data,
            })
          })
        })
      } catch (error) {
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
          user_id: this._options.userId,
        })
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }
}
