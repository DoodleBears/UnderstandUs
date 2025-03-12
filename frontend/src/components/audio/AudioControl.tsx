import { Button } from '@/components/ui/button'
import useRTCStore from '@/store/useRTCStore'
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

  const { setLocalStream } = useRTCStore()

  const [availableDevices, setAvailableDevices] = useState<{
    audioInputs: MediaDeviceInfo[]
    audioOutputs: MediaDeviceInfo[]
  }>({
    audioInputs: [],
    audioOutputs: [],
  })

  // Handle audio stream for WebRTC
  useEffect(() => {
    if (isReady && state.stream) {
      setLocalStream(state.stream)
    }
  }, [isReady, state.stream, setLocalStream])

  // Get available audio devices
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
        console.error('Failed to get device list:', err)
      }
    }

    navigator.mediaDevices.addEventListener('devicechange', getDevices)
    getDevices()

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices)
    }
  }, [])

  if (!isReady) {
    return <div className={className}>Initializing audio system...</div>
  }

  if (error) {
    return (
      <div className={className}>
        <div className="text-red-500">Audio system error: {error.message}</div>
        <Button onClick={() => requestPermissions()} variant="destructive">
          Retry
        </Button>
      </div>
    )
  }

  if (!permissions.granted) {
    return (
      <div className={className}>
        <div>Microphone permission required</div>
        <Button onClick={() => requestPermissions()} variant="default">
          Grant Microphone Access
        </Button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Microphone control */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => toggleMicrophone()}
          variant={state.isEnabled ? 'default' : 'secondary'}
        >
          {state.isEnabled ? 'Microphone On' : 'Microphone Off'}
        </Button>

        {state.isEnabled && (
          <Button
            onClick={() => toggleMute()}
            variant={state.isMuted ? 'destructive' : 'default'}
          >
            {state.isMuted ? 'Unmute' : 'Mute'}
          </Button>
        )}
      </div>

      {/* Device selector */}
      {showDeviceSelector && (
        <div className="flex flex-col gap-2">
          {availableDevices.audioInputs.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm">Select Microphone:</label>
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
                    {device.label ||
                      `Microphone ${device.deviceId.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {availableDevices.audioOutputs.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm">Select Speaker:</label>
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
                        // Set audio output device
                        const audioElements = document.querySelectorAll('audio')
                        audioElements.forEach((audio) => {
                          ;(audio as any)
                            .setSinkId(deviceId)
                            .catch((err: Error) => {
                              console.error('Failed to switch speaker:', err)
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
                    {device.label ||
                      `Speaker ${device.deviceId.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Volume control */}
      {showVolumeControl && state.isEnabled && (
        <div className="flex items-center gap-2">
          <label className="text-sm">Input Volume:</label>
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

      {/* Audio indicator */}
      {state.isEnabled && !state.isMuted && (
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded-full bg-green-500" />
          <span className="text-sm">Capturing Audio</span>
        </div>
      )}
    </div>
  )
}
