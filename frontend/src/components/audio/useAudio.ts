import { useCallback, useEffect, useState } from 'react'
import { AudioMetrics } from '../../lib/audio/types'
import { useAudio as useAudioContext } from './AudioProvider'

export const useAudio = () => {
  const context = useAudioContext()
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [metrics, setMetrics] = useState<AudioMetrics | null>(null)

  // 初始化
  useEffect(() => {
    const initialize = async () => {
      try {
        await context.actions.initialize()
        setIsReady(true)
        setError(null)
      } catch (err) {
        setError(err as Error)
        setIsReady(false)
      }
    }

    initialize()
  }, [])

  // 请求权限
  const requestPermissions = useCallback(async () => {
    try {
      await context.actions.requestPermissions()
      setError(null)
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [context.actions])

  // 切换麦克风
  const toggleMicrophone = useCallback(async () => {
    try {
      await context.actions.toggleEnable()
      setError(null)
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [context.actions])

  // 切换静音
  const toggleMute = useCallback(async () => {
    try {
      await context.actions.toggleMute()
      setError(null)
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [context.actions])

  // 切换设备
  const setMicrophoneDevice = useCallback(
    async (deviceId: string) => {
      try {
        await context.actions.setMicrophoneDevice(deviceId)
        setError(null)
      } catch (err) {
        setError(err as Error)
        throw err
      }
    },
    [context.actions]
  )

  // 设置扬声器
  const setSpeakerDevice = useCallback(
    async (deviceId: string) => {
      try {
        await context.actions.setSpeakerDevice(deviceId)
        setError(null)
      } catch (err) {
        setError(err as Error)
        throw err
      }
    },
    [context.actions]
  )

  // 设置音量
  const setVolume = useCallback(
    (volume: number) => {
      try {
        context.actions.setVolume(volume)
        setError(null)
      } catch (err) {
        setError(err as Error)
        throw err
      }
    },
    [context.actions]
  )

  // 清理
  useEffect(() => {
    return () => {
      context.actions.cleanup()
    }
  }, [])

  return {
    // 状态
    isReady,
    error,
    metrics,
    state: context.state,
    devices: context.devices,
    permissions: context.permissions,

    // 操作方法
    requestPermissions,
    toggleMicrophone,
    toggleMute,
    setMicrophoneDevice,
    setSpeakerDevice,
    setVolume,

    // 原始上下文（用于高级用例）
    context,
  }
}
