import React from 'react'
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
    switchDevice,
    setVolume,
  } = useAudio()

  if (!isReady) {
    return <div className={className}>正在初始化音频系统...</div>
  }

  if (error) {
    return (
      <div className={className}>
        <div className="text-red-500">音频系统错误: {error.message}</div>
        <button
          onClick={() => requestPermissions()}
          className="mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          重试
        </button>
      </div>
    )
  }

  if (!permissions.granted) {
    return (
      <div className={className}>
        <div>需要麦克风权限</div>
        <button
          onClick={() => requestPermissions()}
          className="mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          授权访问麦克风
        </button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* 麦克风控制 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => toggleMicrophone()}
          className={`rounded px-4 py-2 text-white ${
            state.isEnabled
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-gray-500 hover:bg-gray-600'
          }`}
        >
          {state.isEnabled ? '麦克风开启' : '麦克风关闭'}
        </button>

        {state.isEnabled && (
          <button
            onClick={() => toggleMute()}
            className={`rounded px-4 py-2 text-white ${
              state.isMuted
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {state.isMuted ? '取消静音' : '静音'}
          </button>
        )}
      </div>

      {/* 设备选择器 */}
      {showDeviceSelector && devices.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-sm">选择麦克风:</label>
          <select
            value={state.deviceId || ''}
            onChange={(e) => switchDevice(e.target.value)}
            className="rounded border px-2 py-1"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 音量控制 */}
      {showVolumeControl && state.isEnabled && (
        <div className="flex items-center gap-2">
          <label className="text-sm">音量:</label>
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
