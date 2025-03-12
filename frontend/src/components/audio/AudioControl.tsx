import { Button } from '@/components/ui/button'
import React, { useEffect, useState } from 'react'
import { useAudio } from './useAudio'

export interface AudioControlProps {
  className?: string
  showDeviceSelector?: boolean
  showVolumeControl?: boolean
}

export const AudioControl: React.FC<AudioControlProps> = ({
  className = '',
  showDeviceSelector = true,
  showVolumeControl = true,
}) => {
  const {
    isReady,
    error,
    state,
    devices,
    permissions,
    requestPermissions,
    toggleMicrophone,
    toggleMute,
    setMicrophoneDevice,
    setSpeakerDevice,
    setVolume,
  } = useAudio()

  const [availableDevices, setAvailableDevices] = useState<{
    audioInputs: MediaDeviceInfo[]
    audioOutputs: MediaDeviceInfo[]
  }>({
    audioInputs: [],
    audioOutputs: [],
  })

  // 获取可用的音频设备
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = devices.filter(
          (device) => device.kind === 'audioinput'
        )
        const audioOutputs = devices.filter(
          (device) => device.kind === 'audiooutput'
        )
        setAvailableDevices({ audioInputs, audioOutputs })
      } catch (err) {
        console.error('获取设备列表失败:', err)
      }
    }

    // 监听设备变化
    navigator.mediaDevices.addEventListener('devicechange', getDevices)
    getDevices()

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices)
    }
  }, [])

  if (!isReady) {
    return <div className={className}>正在初始化音频系统...</div>
  }

  if (error) {
    return (
      <div className={className}>
        <div className="text-red-500">音频系统错误: {error.message}</div>
        <Button onClick={() => requestPermissions()} variant="destructive">
          重试
        </Button>
      </div>
    )
  }

  if (!permissions.granted) {
    return (
      <div className={className}>
        <div>需要麦克风权限</div>
        <Button onClick={() => requestPermissions()} variant="default">
          授权访问麦克风
        </Button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* 麦克风控制 */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => toggleMicrophone()}
          variant={state.isEnabled ? 'default' : 'secondary'}
        >
          {state.isEnabled ? '麦克风开启' : '麦克风关闭'}
        </Button>

        {state.isEnabled && (
          <Button
            onClick={() => toggleMute()}
            variant={state.isMuted ? 'destructive' : 'default'}
          >
            {state.isMuted ? '取消静音' : '静音'}
          </Button>
        )}
      </div>

      {/* 设备选择器 */}
      {showDeviceSelector && (
        <div className="flex flex-col gap-2">
          {availableDevices.audioInputs.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm">选择麦克风:</label>
              <select
                value={state.deviceId || ''}
                onChange={(e) => {
                  const deviceId = e.target.value
                  if (deviceId) {
                    setMicrophoneDevice(deviceId)
                  }
                }}
                className="rounded border px-2 py-1"
              >
                {availableDevices.audioInputs.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `麦克风 ${device.deviceId.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {availableDevices.audioOutputs.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm">选择扬声器:</label>
              <select
                value={state.speakerDeviceId || ''}
                onChange={(e) => {
                  const deviceId = e.target.value
                  if (deviceId) {
                    setSpeakerDevice(deviceId).then(() => {
                      if (
                        typeof HTMLMediaElement.prototype.setSinkId ===
                        'function'
                      ) {
                        // 设置音频输出设备
                        const audioElements = document.querySelectorAll('audio')
                        audioElements.forEach((audio) => {
                          ;(audio as any)
                            .setSinkId(deviceId)
                            .catch((err: Error) => {
                              console.error('切换扬声器失败:', err)
                            })
                        })
                      }
                    })
                  }
                }}
                className="rounded border px-2 py-1"
              >
                {availableDevices.audioOutputs.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `扬声器 ${device.deviceId.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* 音量控制 */}
      {showVolumeControl && state.isEnabled && (
        <div className="flex items-center gap-2">
          <label className="text-sm">输入音量:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={state.volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-32"
          />
          <span className="text-sm">{Math.round(state.volume * 100)}%</span>
        </div>
      )}

      {/* 音频指示器 */}
      {state.isEnabled && !state.isMuted && (
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded-full bg-green-500" />
          <span className="text-sm">正在采集音频</span>
        </div>
      )}
    </div>
  )
}
