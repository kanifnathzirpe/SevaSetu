from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Appointment, Doctor, Notification, Patient, User, VideoSession
from app.schemas import MessageResponse, VideoSessionCreate, VideoSessionOut

router = APIRouter(prefix="/video", tags=["video"])

ICE_SERVERS = [
    {"urls": "stun:stun.l.google.com:19302"},
    {"urls": "stun:global.stun.twilio.com:3478"},
]


def _serialize(db: Session, session: VideoSession) -> VideoSessionOut:
    doctor_user = db.get(User, session.doctor_user_id)
    patient_user = db.get(User, session.patient_user_id)
    data = VideoSessionOut.model_validate(session)
    data.doctor_name = doctor_user.full_name if doctor_user else ""
    data.patient_name = patient_user.full_name if patient_user else ""
    data.ice_servers = ICE_SERVERS
    return data


@router.post("/sessions", response_model=VideoSessionOut, status_code=201)
def create_session(
    payload: VideoSessionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VideoSessionOut:
    appt = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user),
        )
        .filter(Appointment.id == payload.appointment_id)
        .first()
    )
    if not appt:
        raise HTTPException(404, "Appointment not found")

    existing = (
        db.query(VideoSession).filter(VideoSession.appointment_id == appt.id).first()
    )
    if existing:
        return _serialize(db, existing)

    room_id = appt.video_room_id or uuid4().hex[:12]
    appt.video_room_id = room_id
    session = VideoSession(
        room_id=room_id,
        appointment_id=appt.id,
        doctor_user_id=appt.doctor.user_id,
        patient_user_id=appt.patient.user_id,
        status="waiting",
    )
    db.add(session)
    other_id = appt.patient.user_id if user.id == appt.doctor.user_id else appt.doctor.user_id
    db.add(
        Notification(
            user_id=other_id,
            title="Video consultation ready",
            body=f"Join the SevaSetu consultation room {room_id}.",
            category="video",
            severity="info",
            action_url=f"/video/{room_id}",
        )
    )
    db.commit()
    db.refresh(session)
    return _serialize(db, session)


@router.get("/sessions/{room_id}", response_model=VideoSessionOut)
def get_session(
    room_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> VideoSessionOut:
    session = db.query(VideoSession).filter(VideoSession.room_id == room_id).first()
    if not session:
        raise HTTPException(404, "Video room not found")
    return _serialize(db, session)


@router.post("/sessions/{room_id}/join", response_model=VideoSessionOut)
def join_session(
    room_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> VideoSessionOut:
    session = db.query(VideoSession).filter(VideoSession.room_id == room_id).first()
    if not session:
        raise HTTPException(404, "Video room not found")
    if user.id not in (session.doctor_user_id, session.patient_user_id):
        raise HTTPException(403, "You are not a participant of this consultation")
    if session.status == "waiting":
        session.status = "active"
        session.started_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return _serialize(db, session)


from pydantic import BaseModel

class VideoSessionEnd(BaseModel):
    duration: int | None = None

@router.post("/sessions/{room_id}/end", response_model=MessageResponse)
def end_session(
    room_id: str, payload: VideoSessionEnd, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> MessageResponse:
    session = db.query(VideoSession).filter(VideoSession.room_id == room_id).first()
    if not session:
        raise HTTPException(404, "Video room not found")
    session.status = "ended"
    session.ended_at = datetime.now(timezone.utc)
    if payload.duration is not None:
        session.duration = payload.duration
    db.commit()
    return MessageResponse(message="Consultation ended")


@router.get("/config")
def webrtc_config() -> dict:
    """Signalling configuration consumed by the frontend WebRTC client."""
    return {
        "ice_servers": ICE_SERVERS,
        "signalling_url": "/api/v1/video/sessions/{room_id}/signal",
        "media_constraints": {"audio": True, "video": {"width": 1280, "height": 720}},
        "features": {
            "mute": True,
            "camera_toggle": True,
            "chat": True,
            "screen_share": "placeholder",
            "recording": False,
        },
    }
