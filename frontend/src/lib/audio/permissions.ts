import { AudioPermissionState } from './types'

export class PermissionManager {
  private _state: AudioPermissionState = {
    granted: false,
    denied: false,
    error: null,
  }

  private _listeners: Set<(state: AudioPermissionState) => void> = new Set()

  get state(): AudioPermissionState {
    return { ...this._state }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // 获取权限后立即停止所有轨道
      stream.getTracks().forEach((track) => track.stop())

      this._updateState({
        granted: true,
        denied: false,
        error: null,
      })

      return true
    } catch (error) {
      const isDenied =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' ||
          error.name === 'PermissionDeniedError')

      this._updateState({
        granted: false,
        denied: isDenied,
        error: error as Error,
      })

      return false
    }
  }

  async checkPermissions(): Promise<void> {
    try {
      const result = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      })

      this._updateState({
        granted: result.state === 'granted',
        denied: result.state === 'denied',
        error: null,
      })

      // 监听权限变化
      result.addEventListener('change', () => {
        this._updateState({
          granted: result.state === 'granted',
          denied: result.state === 'denied',
          error: null,
        })
      })
    } catch (error) {
      // 如果不支持权限查询，则尝试获取媒体设备
      await this.requestPermissions()
    }
  }

  subscribe(listener: (state: AudioPermissionState) => void): () => void {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  private _updateState(newState: AudioPermissionState): void {
    this._state = newState
    this._notifyListeners()
  }

  private _notifyListeners(): void {
    const state = this.state
    this._listeners.forEach((listener) => listener(state))
  }
}

// 创建全局权限管理器实例
export const permissionManager = new PermissionManager()
