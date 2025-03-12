import { deviceManager } from './devices'
import {
  AudioMetrics,
  AudioProcessCallback,
  AudioProcessorOptions,
} from './types'

export class AudioCapture {
  private _stream: MediaStream | null = null
  private _audioContext: AudioContext | null = null
  private _sourceNode: MediaStreamAudioSourceNode | null = null
  private _analyserNode: AnalyserNode | null = null
  private _processorNode: AudioWorkletNode | null = null
  private _gainNode: GainNode | null = null
  private _isProcessing = false
  private _volume = 1.0
  private _options: Required<AudioProcessorOptions>
  private _callbacks: Set<AudioProcessCallback> = new Set()

  constructor(options: AudioProcessorOptions = {}) {
    this._options = {
      sampleRate: options.sampleRate || 48000,
      channelCount: options.channelCount || 1,
      autoGainControl: options.autoGainControl ?? true,
      echoCancellation: options.echoCancellation ?? true,
      noiseSuppression: options.noiseSuppression ?? true,
    }
  }

  async start(deviceId: string): Promise<void> {
    try {
      await this.stop()

      // 获取音频流
      this._stream = await deviceManager.requestDevicePermission(deviceId)

      // 创建音频上下文
      this._audioContext = new AudioContext({
        sampleRate: this._options.sampleRate,
        latencyHint: 'interactive',
      })

      // 创建音频节点
      this._sourceNode = this._audioContext.createMediaStreamSource(
        this._stream
      )
      this._analyserNode = this._audioContext.createAnalyser()
      this._gainNode = this._audioContext.createGain()

      // 配置分析器节点
      this._analyserNode.fftSize = 2048
      this._analyserNode.smoothingTimeConstant = 0.8

      // 设置音量
      this._gainNode.gain.value = this._volume

      // 连接节点
      this._sourceNode.connect(this._analyserNode).connect(this._gainNode)

      // 开始处理
      this._isProcessing = true
      this._processAudio()
    } catch (error) {
      console.error('启动音频采集失败:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    this._isProcessing = false

    // 停止所有轨道
    if (this._stream) {
      this._stream.getTracks().forEach((track) => track.stop())
      this._stream = null
    }

    // 断开并清理节点
    if (this._sourceNode) {
      this._sourceNode.disconnect()
      this._sourceNode = null
    }

    if (this._analyserNode) {
      this._analyserNode.disconnect()
      this._analyserNode = null
    }

    if (this._gainNode) {
      this._gainNode.disconnect()
      this._gainNode = null
    }

    if (this._processorNode) {
      this._processorNode.disconnect()
      this._processorNode = null
    }

    // 关闭音频上下文
    if (this._audioContext) {
      await this._audioContext.close()
      this._audioContext = null
    }
  }

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume))
    if (this._gainNode) {
      this._gainNode.gain.value = this._volume
    }
  }

  subscribe(callback: AudioProcessCallback): () => void {
    this._callbacks.add(callback)
    return () => this._callbacks.delete(callback)
  }

  private _processAudio(): void {
    if (!this._isProcessing || !this._analyserNode) return

    const dataArray = new Uint8Array(this._analyserNode.frequencyBinCount)
    this._analyserNode.getByteFrequencyData(dataArray)

    // 计算音量
    const average =
      dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length
    const normalizedVolume = average / 255

    // 检测是否正在说话
    const isSpeaking = normalizedVolume > 0.1

    // 检测是否削波
    const isClipping = normalizedVolume > 0.9

    const metrics: AudioMetrics = {
      timestamp: Date.now(),
      volume: normalizedVolume,
      isSpeaking,
      clipping: isClipping,
    }

    // 通知所有回调
    this._callbacks.forEach((callback) => callback(metrics))

    // 继续处理
    if (this._isProcessing) {
      requestAnimationFrame(() => this._processAudio())
    }
  }

  get isProcessing(): boolean {
    return this._isProcessing
  }

  get currentStream(): MediaStream | null {
    return this._stream
  }
}

// 创建全局音频采集实例
export const audioCapture = new AudioCapture()
