export interface AudioDevice {
  deviceId: string
  label: string
  kind: MediaDeviceKind
}

export interface AudioState {
  isEnabled: boolean
  isMuted: boolean
  deviceId: string | null
  speakerDeviceId: string | null
  stream: MediaStream | null
  error: Error | null
  volume: number
  isProcessing: boolean
}

export interface AudioPermissionState {
  granted: boolean
  denied: boolean
  error: Error | null
}

export type AudioStateChangeCallback = (state: AudioState) => void

export interface AudioContextValue {
  state: AudioState
  devices: AudioDevice[]
  permissions: AudioPermissionState
  actions: {
    initialize: () => Promise<void>
    toggleMute: () => Promise<void>
    toggleEnable: () => Promise<void>
    setMicrophoneDevice: (deviceId: string) => Promise<void>
    setSpeakerDevice: (deviceId: string) => Promise<void>
    setVolume: (volume: number) => void
    requestPermissions: () => Promise<void>
    cleanup: () => void
  }
}

export interface AudioProcessorOptions {
  sampleRate?: number
  channelCount?: number
  autoGainControl?: boolean
  echoCancellation?: boolean
  noiseSuppression?: boolean
}

export interface AudioMetrics {
  timestamp: number
  volume: number
  isSpeaking: boolean
  clipping: boolean
}

export type AudioProcessCallback = (metrics: AudioMetrics) => void
