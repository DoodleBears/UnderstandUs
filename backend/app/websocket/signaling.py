from typing import Dict, Optional

from aiortc import RTCIceCandidate, RTCPeerConnection, RTCSessionDescription
from fastapi import WebSocket


class SignalingConnection:
    def __init__(self, websocket: WebSocket, room_id: str, user_id: str):
        self.websocket = websocket
        self.room_id = room_id
        self.user_id = user_id
        self.peer_connection: Optional[RTCPeerConnection] = None
        
    async def close(self):
        if self.peer_connection:
            await self.peer_connection.close()
            self.peer_connection = None

class SignalingHandler:
    def __init__(self):
        self.connections: Dict[str, SignalingConnection] = {}
        
    def _create_peer_connection(self, connection: SignalingConnection) -> RTCPeerConnection:
        pc = RTCPeerConnection({
            "iceServers": [
                {"urls": ["stun:stun.l.google.com:19302"]}
            ]
        })
        
        @pc.on("icecandidate")
        async def on_ice_candidate(event):
            if event.candidate:
                await connection.websocket.send_json({
                    "type": "ice-candidate",
                    "data": {
                        "candidate": event.candidate.candidate,
                        "sdpMid": event.candidate.sdpMid,
                        "sdpMLineIndex": event.candidate.sdpMLineIndex,
                    }
                })
                
        @pc.on("track")
        async def on_track(track):
            if track.kind == "audio":
                # 广播给房间内其他参与者
                for other_conn in self.get_room_connections(connection.room_id):
                    if other_conn.user_id != connection.user_id:
                        pc = other_conn.peer_connection
                        if pc:
                            pc.addTrack(track)
        
        return pc
    
    def get_room_connections(self, room_id: str) -> list[SignalingConnection]:
        return [conn for conn in self.connections.values() if conn.room_id == room_id]
    
    async def handle_offer(self, connection: SignalingConnection, offer_data: dict):
        if not connection.peer_connection:
            connection.peer_connection = self._create_peer_connection(connection)
            
        offer = RTCSessionDescription(sdp=offer_data["sdp"], type=offer_data["type"])
        await connection.peer_connection.setRemoteDescription(offer)
        
        answer = await connection.peer_connection.createAnswer()
        await connection.peer_connection.setLocalDescription(answer)
        
        await connection.websocket.send_json({
            "type": "answer",
            "data": {
                "sdp": connection.peer_connection.localDescription.sdp,
                "type": connection.peer_connection.localDescription.type
            }
        })
    
    async def handle_answer(self, connection: SignalingConnection, answer_data: dict):
        if connection.peer_connection:
            answer = RTCSessionDescription(sdp=answer_data["sdp"], type=answer_data["type"])
            await connection.peer_connection.setRemoteDescription(answer)
    
    async def handle_ice_candidate(self, connection: SignalingConnection, candidate_data: dict):
        if connection.peer_connection:
            # Parse ICE candidate string
            candidate_str = candidate_data["candidate"]
            parts = candidate_str.split()
            foundation = parts[0].split(":")[1]
            component = int(parts[1])
            protocol = parts[2]
            priority = int(parts[3])
            ip = parts[4]
            port = int(parts[5])
            type = parts[7]

            candidate = RTCIceCandidate(
                foundation=foundation,
                component=component,
                protocol=protocol,
                priority=priority,
                ip=ip,
                port=port,
                type=type,
                sdpMid=candidate_data["sdpMid"],
                sdpMLineIndex=candidate_data["sdpMLineIndex"]
            )
            await connection.peer_connection.addIceCandidate(candidate)
    
    async def handle_connection(self, websocket: WebSocket, room_id: str, user_id: str):
        connection = SignalingConnection(websocket, room_id, user_id)
        self.connections[user_id] = connection
        
        try:
            while True:
                message = await websocket.receive_json()
                msg_type = message.get("type")
                
                if msg_type == "offer":
                    await self.handle_offer(connection, message["data"])
                elif msg_type == "answer":
                    await self.handle_answer(connection, message["data"])
                elif msg_type == "ice-candidate":
                    await self.handle_ice_candidate(connection, message["data"])
                    
        except Exception as e:
            print(f"WebRTC error: {e}")
        finally:
            await self.handle_disconnect(user_id)
    
    async def handle_disconnect(self, user_id: str):
        if user_id in self.connections:
            connection = self.connections[user_id]
            await connection.close()
            del self.connections[user_id]

signaling_handler = SignalingHandler() 