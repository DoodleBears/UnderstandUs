import React, { createContext, useContext, useEffect, useState } from 'react'
import { audioCapture } from '../../lib/audio/capture'
import { deviceManager } from '../../lib/audio/devices'
import { permissionManager } from '../../lib/audio/permissions'
import {
  AudioContextValue,
  AudioDevice,
  AudioPermissionState,
  AudioState,
} from '../../lib/audio/types'

const initialAudioState: AudioState = {
  isEnabled: false,
  isMuted: false,
  deviceId: null,
  speakerDeviceId: null,
  stream: null,
  error: null,
  volume: 1.0,
  isProcessing: false,
}

const AudioContext = createContext<AudioContextValue | null>(null)

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AudioState>(initialAudioState)
  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [permissions, setPermissions] = useState<AudioPermissionState>({
    granted: false,
    denied: false,
    error: null,
  })

  // 初始化
  useEffect(() => {
    const init = async () => {
      try {
        await deviceManager.initialize()
        setDevices(deviceManager.devices)

        // 检查权限
        await permissionManager.checkPermissions()
        setPermissions(permissionManager.state)

        // 如果有权限且有默认设备，自动启用
        if (permissionManager.state.granted) {
          const defaultDevice = await deviceManager.getDefaultDevice()
          if (defaultDevice) {
            await enableAudio(defaultDevice.deviceId)
          }
        }
      } catch (error) {
        setState((prev) => ({ ...prev, error: error as Error }))
      }
    }

    init()

    // 订阅设备变更
    const deviceUnsubscribe = deviceManager.subscribe(setDevices)

    // 订阅权限变更
    const permissionUnsubscribe = permissionManager.subscribe(setPermissions)

    // 订阅音频指标
    const metricsUnsubscribe = audioCapture.subscribe((metrics) => {
      setState((prev) => ({
        ...prev,
        isProcessing: audioCapture.isProcessing,
        volume: metrics.volume,
      }))
    })

    return () => {
      deviceUnsubscribe()
      permissionUnsubscribe()
      metricsUnsubscribe()
      audioCapture.stop()
    }
  }, [])

  // 启用音频
  const enableAudio = async (deviceId: string) => {
    try {
      await audioCapture.start(deviceId)
      setState((prev) => ({
        ...prev,
        isEnabled: true,
        deviceId,
        stream: audioCapture.currentStream,
        error: null,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isEnabled: false,
        error: error as Error,
      }))
    }
  }

  // 禁用音频
  const disableAudio = async () => {
    await audioCapture.stop()
    setState((prev) => ({
      ...prev,
      isEnabled: false,
      stream: null,
    }))
  }

  const contextValue: AudioContextValue = {
    state,
    devices,
    permissions,
    actions: {
      initialize: async () => {
        await permissionManager.checkPermissions()
        await deviceManager.initialize()
      },
      toggleMute: async () => {
        if (state.stream) {
          const isMuted = !state.isMuted
          state.stream.getAudioTracks().forEach((track) => {
            track.enabled = !isMuted
          })
          setState((prev) => ({ ...prev, isMuted }))
        }
      },
      toggleEnable: async () => {
        if (state.isEnabled) {
          await disableAudio()
        } else if (state.deviceId) {
          await enableAudio(state.deviceId)
        }
      },
      setMicrophoneDevice: async (deviceId: string) => {
        if (state.isEnabled) {
          await disableAudio()
        }
        await enableAudio(deviceId)
      },
      setSpeakerDevice: async (deviceId: string) => {
        setState((prev) => ({ ...prev, speakerDeviceId: deviceId }))
      },
      setVolume: (volume: number) => {
        audioCapture.setVolume(volume)
        setState((prev) => ({ ...prev, volume }))
      },
      requestPermissions: async () => {
        await permissionManager.requestPermissions()
      },
      cleanup: () => {
        audioCapture.stop()
      },
    },
  }

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  )
}

export const useAudio = () => {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}
