import React from 'react'
import { useAudio } from './useAudio'

export interface AudioStatusProps {
  className?: string
  showDeviceInfo?: boolean
  showMetrics?: boolean
}

export const AudioStatus: React.FC<AudioStatusProps> = ({
  className = '',
  showDeviceInfo = true,
  showMetrics = true,
}) => {
  const { state, devices, metrics } = useAudio()

  const currentDevice = devices.find((d) => d.deviceId === state.deviceId)

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* 连接状态 */}
      <div className="flex items-center gap-2">
        <div
          className={`h-3 w-3 rounded-full ${
            state.isEnabled
              ? state.isMuted
                ? 'bg-yellow-500'
                : 'bg-green-500'
              : 'bg-red-500'
          }`}
        />
        <span className="text-sm">
          {state.isEnabled ? (state.isMuted ? '已静音' : '正在采集') : '未启用'}
        </span>
      </div>

      {/* 设备信息 */}
      {showDeviceInfo && currentDevice && (
        <div className="text-sm text-gray-600">
          <div>当前设备: {currentDevice.label}</div>
          <div>设备ID: {currentDevice.deviceId}</div>
        </div>
      )}

      {/* 音频指标 */}
      {showMetrics && metrics && state.isEnabled && !state.isMuted && (
        <div className="space-y-1">
          <div className="text-sm text-gray-600">
            音量: {Math.round(metrics.volume * 100)}%
          </div>

          {/* 音量条 */}
          <div className="h-2 w-full rounded bg-gray-200">
            <div
              className={`h-full rounded transition-all ${
                metrics.clipping ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(metrics.volume * 100, 100)}%` }}
            />
          </div>

          {/* 状态指示器 */}
          <div className="flex gap-2 text-xs">
            <span
              className={
                metrics.isSpeaking ? 'text-green-500' : 'text-gray-500'
              }
            >
              {metrics.isSpeaking ? '正在说话' : '静音中'}
            </span>
            {metrics.clipping && <span className="text-red-500">音量过大</span>}
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {state.error && (
        <div className="text-sm text-red-500">错误: {state.error.message}</div>
      )}
    </div>
  )
}
