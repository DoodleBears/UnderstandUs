import { AudioDevice } from './types'

export class DeviceManager {
  private _devices: AudioDevice[] = []
  private _listeners: Set<(devices: AudioDevice[]) => void> = new Set()

  constructor() {
    this._setupDeviceChangeListener()
  }

  get devices(): AudioDevice[] {
    return [...this._devices]
  }

  async initialize(): Promise<void> {
    await this._updateDeviceList()
  }

  async getDefaultDevice(): Promise<AudioDevice | null> {
    const devices = await this._getAudioDevices()
    return (
      devices.find((device) => device.deviceId === 'default') ||
      devices[0] ||
      null
    )
  }

  subscribe(listener: (devices: AudioDevice[]) => void): () => void {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  private async _updateDeviceList(): Promise<void> {
    this._devices = await this._getAudioDevices()
    this._notifyListeners()
  }

  private async _getAudioDevices(): Promise<AudioDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices
        .filter((device) => device.kind === 'audioinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `麦克风 ${device.deviceId.slice(0, 8)}...`,
          kind: device.kind,
        }))
    } catch (error) {
      console.error('获取音频设备失败:', error)
      return []
    }
  }

  private _setupDeviceChangeListener(): void {
    navigator.mediaDevices.addEventListener('devicechange', async () => {
      await this._updateDeviceList()
    })
  }

  private _notifyListeners(): void {
    const devices = this.devices
    this._listeners.forEach((listener) => listener(devices))
  }

  async requestDevicePermission(deviceId: string): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: { exact: deviceId },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    }

    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (error) {
      console.error('获取设备权限失败:', error)
      throw error
    }
  }

  async validateDevice(deviceId: string): Promise<boolean> {
    try {
      const stream = await this.requestDevicePermission(deviceId)
      stream.getTracks().forEach((track) => track.stop())
      return true
    } catch {
      return false
    }
  }
}

// 创建全局设备管理器实例
export const deviceManager = new DeviceManager()
