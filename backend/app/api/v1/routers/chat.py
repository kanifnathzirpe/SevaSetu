from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import ChatMessage, ChatThread, Notification, User
from app.schemas import (
    ChatMessageCreate,
    ChatMessageOut,
    ChatThreadCreate,
    ChatThreadOut,
    MessageResponse,
)

router = APIRouter(prefix="/chat", tags=["chat"])


def _thread_for_user(db: Session, thread_id: int, user: User) -> ChatThread:
    thread = db.get(ChatThread, thread_id)
    if not thread or user.id not in (thread.participant_a_id, thread.participant_b_id):
        raise HTTPException(404, "Conversation not found")
    return thread


@router.get("/threads", response_model=list[ChatThreadOut])
def list_threads(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[ChatThreadOut]:
    threads = (
        db.query(ChatThread)
        .filter(
            or_(ChatThread.participant_a_id == user.id, ChatThread.participant_b_id == user.id)
        )
        .order_by(ChatThread.last_message_at.desc())
        .all()
    )
    result = []
    for thread in threads:
        other_id = (
            thread.participant_b_id if thread.participant_a_id == user.id else thread.participant_a_id
        )
        other = db.get(User, other_id)
        last = (
            db.query(ChatMessage)
            .filter(ChatMessage.thread_id == thread.id)
            .order_by(ChatMessage.created_at.desc())
            .first()
        )
        unread = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.thread_id == thread.id,
                ChatMessage.sender_id != user.id,
                ChatMessage.is_read.is_(False),
            )
            .count()
        )
        data = ChatThreadOut.model_validate(thread)
        data.other_party_name = other.full_name if other else "Unknown"
        data.other_party_role = other.role.value if other else ""
        data.last_message = last.body if last else ""
        data.unread_count = unread
        result.append(data)
    return result


@router.post("/threads", response_model=ChatThreadOut, status_code=201)
def create_thread(
    payload: ChatThreadCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatThreadOut:
    other = db.get(User, payload.participant_id)
    if not other:
        raise HTTPException(404, "Participant not found")
    existing = (
        db.query(ChatThread)
        .filter(
            or_(
                (ChatThread.participant_a_id == user.id)
                & (ChatThread.participant_b_id == other.id),
                (ChatThread.participant_a_id == other.id)
                & (ChatThread.participant_b_id == user.id),
            )
        )
        .first()
    )
    thread = existing or ChatThread(
        subject=payload.subject, participant_a_id=user.id, participant_b_id=other.id
    )
    if not existing:
        db.add(thread)
        db.commit()
        db.refresh(thread)
    data = ChatThreadOut.model_validate(thread)
    data.other_party_name = other.full_name
    data.other_party_role = other.role.value
    return data


@router.get("/threads/{thread_id}/messages", response_model=list[ChatMessageOut])
def thread_messages(
    thread_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[ChatMessageOut]:
    _thread_for_user(db, thread_id, user)
    db.query(ChatMessage).filter(
        ChatMessage.thread_id == thread_id, ChatMessage.sender_id != user.id
    ).update({"is_read": True})
    db.commit()
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    names = {u.id: u.full_name for u in db.query(User).all()}
    result = []
    for message in messages:
        data = ChatMessageOut.model_validate(message)
        data.sender_name = names.get(message.sender_id, "")
        result.append(data)
    return result


@router.post("/threads/{thread_id}/messages", response_model=ChatMessageOut, status_code=201)
def send_message(
    thread_id: int,
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatMessageOut:
    thread = _thread_for_user(db, thread_id, user)
    message = ChatMessage(
        thread_id=thread_id,
        sender_id=user.id,
        body=payload.body,
        attachment_url=payload.attachment_url,
    )
    thread.last_message_at = datetime.now(timezone.utc)
    db.add(message)
    other_id = thread.participant_b_id if thread.participant_a_id == user.id else thread.participant_a_id
    db.add(
        Notification(
            user_id=other_id,
            title=f"New message from {user.full_name}",
            body=payload.body[:120],
            category="chat",
            severity="info",
            action_url="/chat",
        )
    )
    db.commit()
    db.refresh(message)
    data = ChatMessageOut.model_validate(message)
    data.sender_name = user.full_name
    return data


@router.post("/threads/{thread_id}/read", response_model=MessageResponse)
def mark_read(
    thread_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> MessageResponse:
    _thread_for_user(db, thread_id, user)
    db.query(ChatMessage).filter(
        ChatMessage.thread_id == thread_id, ChatMessage.sender_id != user.id
    ).update({"is_read": True})
    db.commit()
    return MessageResponse(message="Conversation marked as read")


@router.get("/contacts")
def chat_contacts(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict]:
    """People the current user can start a conversation with."""
    from app.models import UserRole

    role_targets = {
        UserRole.PATIENT: [UserRole.DOCTOR, UserRole.ASHA],
        UserRole.DOCTOR: [UserRole.PATIENT, UserRole.ASHA],
        UserRole.ASHA: [UserRole.PATIENT, UserRole.DOCTOR],
        UserRole.HOSPITAL_ADMIN: [UserRole.DOCTOR, UserRole.ASHA],
        UserRole.DHO: [UserRole.DOCTOR, UserRole.ASHA, UserRole.HOSPITAL_ADMIN],
        UserRole.EMERGENCY: [UserRole.DOCTOR, UserRole.PATIENT],
    }
    targets = role_targets.get(user.role, [UserRole.DOCTOR])
    rows = (
        db.query(User)
        .filter(User.role.in_(targets), User.id != user.id)
        .order_by(User.full_name)
        .limit(60)
        .all()
    )
    return [
        {"id": u.id, "full_name": u.full_name, "role": u.role.value, "locality": u.locality}
        for u in rows
    ]
