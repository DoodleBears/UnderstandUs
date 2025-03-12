import {
  PeerConnection,
  PeerConnectionOptions,
  RTCConfiguration,
  SignalingConnection,
} from './types'

const DEFAULT_RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
}

export class WebRTCManager {
  private _peers: Map<string, PeerConnection> = new Map()
  private _localStream: MediaStream | null = null
  private _signaling: SignalingConnection
  private _options: PeerConnectionOptions

  constructor(
    signaling: SignalingConnection,
    options: PeerConnectionOptions = {}
  ) {
    console.log('初始化 WebRTCManager', { options })
    this._signaling = signaling
    this._options = {
      configuration: {
        ...DEFAULT_RTC_CONFIGURATION,
        ...options.configuration,
      },
      dataChannelOptions: {
        ordered: true,
        ...options.dataChannelOptions,
      },
    }
  }

  setLocalStream(stream: MediaStream): void {
    this._localStream = stream
    // 将本地流添加到所有现有连接
    for (const peer of this._peers.values()) {
      this._addLocalStreamToPeer(peer)
    }
  }

  async createPeerConnection(peerId: string): Promise<PeerConnection> {
    console.log('开始创建对等连接', {
      peerId,
      config: this._options.configuration,
    })
    if (this._peers.has(peerId)) {
      console.error(`与对等端 ${peerId} 的连接已存在`)
      throw new Error(`与对等端 ${peerId} 的连接已存在`)
    }

    console.log(`创建与用户 ${peerId} 的新对等连接`)
    const connection = new RTCPeerConnection(this._options.configuration)
    const peer: PeerConnection = {
      id: peerId,
      connection,
      stream: null,
      dataChannel: null,
    }

    // 创建数据通道
    console.log(`为用户 ${peerId} 创建数据通道`)
    peer.dataChannel = connection.createDataChannel(
      'data',
      this._options.dataChannelOptions
    )
    this._setupDataChannel(peer.dataChannel)

    // 设置事件处理器
    this._setupPeerConnectionHandlers(peer)

    // 添加本地流
    if (this._localStream) {
      console.log(`向用户 ${peerId} 的连接添加本地流`)
      this._addLocalStreamToPeer(peer)
    }

    this._peers.set(peerId, peer)
    return peer
  }

  async createOffer(peerId: string): Promise<void> {
    const peer = this._peers.get(peerId)
    if (!peer) {
      throw new Error(`未找到对等端 ${peerId} 的连接`)
    }

    try {
      console.log(`为用户 ${peerId} 创建offer`)
      const offer = await peer.connection.createOffer()
      console.log(`设置本地描述符`)
      await peer.connection.setLocalDescription(offer)

      // 发送 offer 到信令服务器
      console.log(`发送offer到用户 ${peerId}`)
      await this._signaling.send({
        type: 'offer',
        data: {
          peerId,
          sdp: offer.sdp,
        },
      })
    } catch (error) {
      console.error(`创建offer失败:`, error)
      throw error
    }
  }

  async handleOffer(peerId: string, sdp: string): Promise<void> {
    console.log(`处理来自用户 ${peerId} 的offer`)
    let peer = this._peers.get(peerId)
    if (!peer) {
      console.log(`为用户 ${peerId} 创建新的对等连接`)
      peer = await this.createPeerConnection(peerId)
    }

    try {
      console.log(`设置远程描述符`)
      await peer.connection.setRemoteDescription(
        new RTCSessionDescription({ type: 'offer', sdp })
      )
      console.log(`创建answer`)
      const answer = await peer.connection.createAnswer()
      console.log(`设置本地描述符`)
      await peer.connection.setLocalDescription(answer)

      // 发送 answer 到信令服务器
      console.log(`发送answer到用户 ${peerId}`)
      await this._signaling.send({
        type: 'answer',
        data: {
          peerId,
          sdp: answer.sdp,
        },
      })
    } catch (error) {
      console.error(`处理offer失败:`, error)
      throw error
    }
  }

  async handleAnswer(peerId: string, sdp: string): Promise<void> {
    const peer = this._peers.get(peerId)
    if (!peer) {
      throw new Error(`未找到对等端 ${peerId} 的连接`)
    }

    try {
      await peer.connection.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp })
      )
    } catch (error) {
      console.error('处理 answer 失败:', error)
      throw error
    }
  }

  async handleIceCandidate(
    peerId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const peer = this._peers.get(peerId)
    if (!peer) {
      throw new Error(`未找到对等端 ${peerId} 的连接`)
    }

    try {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error('处理 ICE candidate 失败:', error)
      throw error
    }
  }

  closePeerConnection(peerId: string): void {
    const peer = this._peers.get(peerId)
    if (peer) {
      if (peer.dataChannel) {
        peer.dataChannel.close()
      }
      peer.connection.close()
      this._peers.delete(peerId)
    }
  }

  closeAllConnections(): void {
    for (const peerId of this._peers.keys()) {
      this.closePeerConnection(peerId)
    }
  }

  private _setupPeerConnectionHandlers(peer: PeerConnection): void {
    peer.connection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`发现新的ICE候选者:`, event.candidate)
        // 发送 ICE candidate 到信令服务器
        this._signaling
          .send({
            type: 'ice_candidate',
            data: {
              peerId: peer.id,
              candidate: event.candidate.toJSON(),
            },
          })
          .catch((error) => {
            console.error(`发送ICE候选者失败:`, error)
          })
      }
    }

    peer.connection.ontrack = (event) => {
      console.log(`收到新的媒体轨道:`, event.track.kind)
      // 检查轨道是否来自本地流
      const isLocalTrack = this._localStream
        ?.getTracks()
        .some((localTrack) => event.track.id === localTrack.id)

      // 只处理远程用户的音频流
      if (!isLocalTrack) {
        console.log(`处理远程用户的音频流`)
        peer.stream = event.streams[0]
        // 创建新的音频元素来播放远程音频
        const audioElement = new Audio()
        audioElement.srcObject = event.streams[0]
        audioElement.autoplay = true
        audioElement.volume = 1.0

        // 添加错误处理
        audioElement.onerror = (error) => {
          console.error('音频播放错误:', error)
        }
      }
    }

    peer.connection.ondatachannel = (event) => {
      console.log(`收到新的数据通道`)
      peer.dataChannel = event.channel
      this._setupDataChannel(peer.dataChannel)
    }

    peer.connection.onconnectionstatechange = () => {
      const state = peer.connection.connectionState
      console.log(`连接状态变更 (${peer.id}):`, state)

      // 处理连接状态变化
      if (state === 'failed' || state === 'closed') {
        console.log(`连接失败或关闭，清理连接`)
        this.closePeerConnection(peer.id)
      } else if (state === 'connected') {
        console.log(`与用户 ${peer.id} 的连接已成功建立`)
      }
    }

    peer.connection.oniceconnectionstatechange = () => {
      const state = peer.connection.iceConnectionState
      console.log(`ICE 连接状态变更 (${peer.id}):`, state)

      // 处理 ICE 连接状态变化
      if (state === 'failed') {
        console.log(`ICE连接失败，尝试重新协商`)
        this.createOffer(peer.id).catch((error) => {
          console.error('重新协商连接失败:', error)
        })
      }
    }
  }

  private _setupDataChannel(dataChannel: RTCDataChannel): void {
    dataChannel.onopen = () => {
      console.log('数据通道已打开')
    }

    dataChannel.onclose = () => {
      console.log('数据通道已关闭')
    }

    dataChannel.onerror = (error) => {
      console.error('数据通道错误:', error)
    }

    dataChannel.onmessage = (event) => {
      console.log('收到数据:', event.data)
    }
  }

  private _addLocalStreamToPeer(peer: PeerConnection): void {
    if (this._localStream) {
      this._localStream.getTracks().forEach((track) => {
        peer.connection.addTrack(track, this._localStream!)
      })
    }
  }

  getPeers(): Map<string, PeerConnection> {
    return this._peers
  }

  sendMessage(peerId: string, message: any): void {
    const peer = this._peers.get(peerId)
    if (peer?.dataChannel?.readyState === 'open') {
      peer.dataChannel.send(JSON.stringify(message))
    }
  }
}
