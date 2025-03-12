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
    if (this._peers.has(peerId)) {
      throw new Error(`与对等端 ${peerId} 的连接已存在`)
    }

    const connection = new RTCPeerConnection(this._options.configuration)
    const peer: PeerConnection = {
      id: peerId,
      connection,
      stream: null,
      dataChannel: null,
    }

    // 创建数据通道
    peer.dataChannel = connection.createDataChannel(
      'data',
      this._options.dataChannelOptions
    )
    this._setupDataChannel(peer.dataChannel)

    // 设置事件处理器
    this._setupPeerConnectionHandlers(peer)

    // 添加本地流
    if (this._localStream) {
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
      const offer = await peer.connection.createOffer()
      await peer.connection.setLocalDescription(offer)

      // 发送 offer 到信令服务器
      await this._signaling.send({
        type: 'offer',
        data: {
          peerId,
          sdp: offer.sdp,
        },
      })
    } catch (error) {
      console.error('创建 offer 失败:', error)
      throw error
    }
  }

  async handleOffer(peerId: string, sdp: string): Promise<void> {
    let peer = this._peers.get(peerId)
    if (!peer) {
      peer = await this.createPeerConnection(peerId)
    }

    try {
      await peer.connection.setRemoteDescription(
        new RTCSessionDescription({ type: 'offer', sdp })
      )
      const answer = await peer.connection.createAnswer()
      await peer.connection.setLocalDescription(answer)

      // 发送 answer 到信令服务器
      await this._signaling.send({
        type: 'answer',
        data: {
          peerId,
          sdp: answer.sdp,
        },
      })
    } catch (error) {
      console.error('处理 offer 失败:', error)
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
        // 发送 ICE candidate 到信令服务器
        this._signaling.send({
          type: 'ice_candidate',
          data: {
            peerId: peer.id,
            candidate: event.candidate.toJSON(),
          },
        })
      }
    }

    peer.connection.ontrack = (event) => {
      // 检查轨道是否来自本地流
      const isLocalTrack = this._localStream
        ?.getTracks()
        .some((localTrack) => event.track.id === localTrack.id)

      // 只处理远程用户的音频流
      if (!isLocalTrack) {
        peer.stream = event.streams[0]
        // 创建新的音频元素来播放远程音频
        const audioElement = new Audio()
        audioElement.srcObject = event.streams[0]
        audioElement.autoplay = true
        // 可选：添加其他音频设置
        audioElement.volume = 1.0
      }
    }

    peer.connection.ondatachannel = (event) => {
      peer.dataChannel = event.channel
      this._setupDataChannel(peer.dataChannel)
    }

    peer.connection.onconnectionstatechange = () => {
      console.log(`连接状态变更 (${peer.id}):`, peer.connection.connectionState)
    }

    peer.connection.oniceconnectionstatechange = () => {
      console.log(
        `ICE 连接状态变更 (${peer.id}):`,
        peer.connection.iceConnectionState
      )
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
