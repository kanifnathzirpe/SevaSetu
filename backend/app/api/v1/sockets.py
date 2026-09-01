import socketio
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=settings.cors_origins_list,
    logger=True,
    engineio_logger=True
)

# Keep track of participants per room to enforce 2-user limit
# Map room_id -> list of sids
rooms = {}

@sio.on('connect')
async def connect(sid, environ):
    print(f"\n========== [Socket.IO] CONNECT ==========")
    print(f"-> SID: {sid}")
    print(f"=========================================\n")
    logger.info(f"Socket connected: {sid}")

@sio.on('disconnect')
async def disconnect(sid):
    print(f"\n======== [Socket.IO] DISCONNECT =========")
    print(f"-> SID: {sid}")
    for room_id, participants in list(rooms.items()):
        if sid in participants:
            participants.remove(sid)
            print(f"-> Removed {sid} from room {room_id}")
            await sio.emit('peer_disconnected', room=room_id, skip_sid=sid)
            if not participants:
                del rooms[room_id]
                print(f"-> Room {room_id} deleted (empty)")
    print(f"=========================================\n")
    logger.info(f"Socket disconnected: {sid}")

@sio.on('join_room')
async def on_join_room(sid, data):
    print(f"\n======== [Socket.IO] JOIN ROOM =========")
    print(f"-> SID: {sid}")
    print(f"-> Data: {data}")
    
    room_id = data.get('room_id')
    user_name = data.get('name', 'Participant')
    
    if not room_id:
        print("-> ERROR: room_id is required")
        return {'error': 'room_id is required'}
        
    if room_id not in rooms:
        rooms[room_id] = []
        
    if sid not in rooms[room_id]:
        rooms[room_id].append(sid)
        
    await sio.enter_room(sid, room_id)
    print(f"-> {user_name} ({sid}) added to room {room_id}. Total participants: {len(rooms[room_id])}")
    
    # Notify others in the room
    print(f"-> Emitting 'user_joined' to room {room_id}, skipping {sid}")
    await sio.emit('user_joined', {'id': sid, 'name': user_name}, room=room_id, skip_sid=sid)
    
    print(f"=========================================\n")
    return {'success': True, 'sid': sid, 'participants': len(rooms[room_id])}

@sio.on('offer')
async def on_offer(sid, data):
    print(f"\n========== [Socket.IO] OFFER ==========")
    print(f"-> SID: {sid}")
    room_id = data.get('room_id')
    print(f"-> Forwarding offer to room {room_id}")
    await sio.emit('offer', data, room=room_id, skip_sid=sid)
    print(f"=========================================\n")

@sio.on('answer')
async def on_answer(sid, data):
    print(f"\n========= [Socket.IO] ANSWER =========")
    print(f"-> SID: {sid}")
    room_id = data.get('room_id')
    print(f"-> Forwarding answer to room {room_id}")
    await sio.emit('answer', data, room=room_id, skip_sid=sid)
    print(f"=========================================\n")

@sio.on('ice_candidate')
async def on_ice_candidate(sid, data):
    print(f"\n====== [Socket.IO] ICE CANDIDATE ======")
    print(f"-> SID: {sid}")
    room_id = data.get('room_id')
    print(f"-> Forwarding ice_candidate to room {room_id}")
    await sio.emit('ice_candidate', data, room=room_id, skip_sid=sid)
    print(f"=========================================\n")

@sio.on('chat_message')
async def on_chat_message(sid, data):
    print(f"\n======= [Socket.IO] CHAT MESSAGE =======")
    print(f"-> SID: {sid}")
    room_id = data.get('room_id')
    print(f"-> Forwarding chat_message to room {room_id}")
    await sio.emit('chat_message', data, room=room_id, skip_sid=sid)
    print(f"=========================================\n")
