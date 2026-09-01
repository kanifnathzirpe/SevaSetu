from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.api.v1.serializers import appointment_out
from app.db.session import get_db
from app.models import (
    Appointment,
    AppointmentStatus,
    AppointmentType,
    Doctor,
    Notification,
    Patient,
    User,
    UserRole,
)
from app.schemas import AppointmentCreate, AppointmentOut, AppointmentUpdate, MessageResponse

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _load(db: Session, appointment_id: int) -> Appointment:
    appt = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user),
            joinedload(Appointment.hospital),
        )
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not appt:
        raise HTTPException(404, "Appointment not found")
    return appt


@router.post("", response_model=AppointmentOut, status_code=201)
def book_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AppointmentOut:
    doctor = db.query(Doctor).options(joinedload(Doctor.user)).filter(Doctor.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(404, "Doctor not found")

    if user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == user.id).first()
        if not patient:
            raise HTTPException(404, "Patient profile not found")
    else:
        if not payload.patient_id:
            raise HTTPException(400, "patient_id is required when booking on behalf of a patient")
        patient = db.get(Patient, payload.patient_id)
        if not patient:
            raise HTTPException(404, "Patient not found")

    clash = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor.id,
            Appointment.scheduled_at == payload.scheduled_at,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
        .first()
    )
    if clash:
        raise HTTPException(409, "This slot is already booked. Please pick another time.")

    token = (
        db.query(func.count(Appointment.id))
        .filter(
            Appointment.doctor_id == doctor.id,
            func.date(Appointment.scheduled_at) == payload.scheduled_at.date(),
        )
        .scalar()
        or 0
    ) + 1

    appt = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        hospital_id=doctor.hospital_id,
        scheduled_at=payload.scheduled_at,
        appointment_type=payload.appointment_type,
        reason=payload.reason,
        token_number=token,
        queue_position=token,
        video_room_id=uuid4().hex[:12] if payload.appointment_type == AppointmentType.VIDEO else None,
    )
    db.add(appt)
    db.add_all(
        [
            Notification(
                user_id=patient.user_id,
                title="Appointment confirmed",
                body=f"Token #{token} with Dr. {doctor.user.full_name} on "
                f"{payload.scheduled_at.strftime('%d %b %Y, %I:%M %p')}.",
                category="appointment",
                severity="success",
                action_url="/patient/appointments",
            ),
            Notification(
                user_id=doctor.user_id,
                title="New appointment booked",
                body=f"{patient.user.full_name} booked token #{token}.",
                category="appointment",
                severity="info",
                action_url="/doctor/appointments",
            ),
        ]
    )
    db.commit()
    return appointment_out(_load(db, appt.id))


@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AppointmentOut:
    return appointment_out(_load(db, appointment_id))


@router.patch("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AppointmentOut:
    appt = _load(db, appointment_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(appt, field, value)
    db.commit()
    return appointment_out(_load(db, appointment_id))


@router.post("/{appointment_id}/cancel", response_model=MessageResponse)
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageResponse:
    appt = _load(db, appointment_id)
    appt.status = AppointmentStatus.CANCELLED
    db.add(
        Notification(
            user_id=appt.doctor.user_id if user.role == UserRole.PATIENT else appt.patient.user_id,
            title="Appointment cancelled",
            body=f"Appointment on {appt.scheduled_at.strftime('%d %b %Y, %I:%M %p')} was cancelled.",
            category="appointment",
            severity="warning",
        )
    )
    db.commit()
    return MessageResponse(message="Appointment cancelled")


@router.post("/{appointment_id}/check-in", response_model=AppointmentOut)
def check_in(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AppointmentOut:
    appt = _load(db, appointment_id)
    appt.status = AppointmentStatus.CHECKED_IN
    waiting = (
        db.query(func.count(Appointment.id))
        .filter(
            Appointment.doctor_id == appt.doctor_id,
            func.date(Appointment.scheduled_at) == appt.scheduled_at.date(),
            Appointment.status == AppointmentStatus.CHECKED_IN,
        )
        .scalar()
        or 0
    )
    appt.queue_position = waiting
    db.commit()
    return appointment_out(_load(db, appointment_id))


@router.post("/{appointment_id}/complete", response_model=AppointmentOut)
def complete(
    appointment_id: int,
    diagnosis: str = "",
    notes: str = "",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AppointmentOut:
    appt = _load(db, appointment_id)
    appt.status = AppointmentStatus.COMPLETED
    if diagnosis:
        appt.diagnosis = diagnosis
    if notes:
        appt.notes = notes
    db.commit()
    return appointment_out(_load(db, appointment_id))


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    upcoming_only: bool = False,
) -> list[AppointmentOut]:
    query = db.query(Appointment).options(
        joinedload(Appointment.patient).joinedload(Patient.user),
        joinedload(Appointment.doctor).joinedload(Doctor.user),
        joinedload(Appointment.hospital),
    )
    if user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == user.id).first()
        query = query.filter(Appointment.patient_id == (patient.id if patient else -1))
    elif user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
        query = query.filter(Appointment.doctor_id == (doctor.id if doctor else -1))
    if upcoming_only:
        query = query.filter(Appointment.scheduled_at >= datetime.now(timezone.utc))
    return [appointment_out(a) for a in query.order_by(Appointment.scheduled_at.desc()).limit(200).all()]
