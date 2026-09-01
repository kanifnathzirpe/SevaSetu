from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_doctor, get_current_user
from app.api.v1.serializers import (
    appointment_out,
    doctor_out,
    patient_out,
    prescription_out,
    report_out,
)
from app.db.session import get_db
from app.models import (
    Appointment,
    AppointmentStatus,
    Doctor,
    Medicine,
    Notification,
    Patient,
    Prescription,
    PrescriptionItem,
    Referral,
    Report,
    ReportType,
    User,
)
from app.schemas import (
    AppointmentOut,
    DoctorOut,
    MedicineOut,
    MessageResponse,
    PatientOut,
    PrescriptionCreate,
    PrescriptionOut,
    ReportCreate,
    ReportOut,
)

router = APIRouter(prefix="/doctor", tags=["doctor"])
public_router = APIRouter(prefix="/doctors", tags=["doctors"])


@public_router.get("", response_model=list[DoctorOut])
def list_doctors(
    db: Session = Depends(get_db),
    search: str | None = None,
    specialization: str | None = None,
    hospital_id: int | None = None,
    online_only: bool = False,
    limit: int = Query(60, le=200),
) -> list[DoctorOut]:
    query = db.query(Doctor).options(joinedload(Doctor.user), joinedload(Doctor.hospital))
    if search:
        pattern = f"%{search}%"
        query = query.join(User, Doctor.user_id == User.id).filter(
            or_(User.full_name.ilike(pattern), Doctor.specialization.ilike(pattern))
        )
    if specialization:
        query = query.filter(Doctor.specialization == specialization)
    if hospital_id:
        query = query.filter(Doctor.hospital_id == hospital_id)
    if online_only:
        query = query.filter(Doctor.is_available_online.is_(True))
    return [doctor_out(d) for d in query.limit(limit).all()]


@public_router.get("/specializations")
def specializations(db: Session = Depends(get_db)) -> list[dict]:
    rows = (
        db.query(Doctor.specialization, func.count(Doctor.id))
        .group_by(Doctor.specialization)
        .order_by(func.count(Doctor.id).desc())
        .all()
    )
    return [{"specialization": name, "doctor_count": count} for name, count in rows]


@public_router.get("/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)) -> DoctorOut:
    doctor = (
        db.query(Doctor)
        .options(joinedload(Doctor.user), joinedload(Doctor.hospital))
        .filter(Doctor.id == doctor_id)
        .first()
    )
    if not doctor:
        raise HTTPException(404, "Doctor not found")
    return doctor_out(doctor)


@public_router.get("/{doctor_id}/slots")
def available_slots(doctor_id: int, on: date | None = None, db: Session = Depends(get_db)) -> dict:
    doctor = db.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(404, "Doctor not found")
    day = on or date.today()
    booked = {
        appt.scheduled_at.astimezone(timezone.utc).strftime("%H:%M")
        for appt in db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor_id,
            func.date(Appointment.scheduled_at) == day,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
        .all()
    }
    slots = []
    cursor = datetime.combine(day, doctor.available_from)
    end = datetime.combine(day, doctor.available_to)
    while cursor < end:
        label = cursor.strftime("%H:%M")
        slots.append({"time": label, "available": label not in booked})
        cursor += timedelta(minutes=20)
    return {"date": day.isoformat(), "doctor_id": doctor_id, "slots": slots}


@router.get("/dashboard")
def doctor_dashboard(
    db: Session = Depends(get_db), doctor: Doctor = Depends(get_current_doctor)
) -> dict:
    today = date.today()
    base = db.query(Appointment).filter(Appointment.doctor_id == doctor.id)
    today_appts = base.filter(func.date(Appointment.scheduled_at) == today)
    week_start = today - timedelta(days=today.weekday())

    weekly = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        weekly.append(
            {
                "day": day.strftime("%a"),
                "appointments": base.filter(func.date(Appointment.scheduled_at) == day).count(),
                "completed": base.filter(
                    func.date(Appointment.scheduled_at) == day,
                    Appointment.status == AppointmentStatus.COMPLETED,
                ).count(),
            }
        )

    upcoming = (
        base.options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user),
            joinedload(Appointment.hospital),
        )
        .filter(Appointment.scheduled_at >= datetime.now(timezone.utc))
        .order_by(Appointment.scheduled_at)
        .limit(6)
        .all()
    )

    return {
        "doctor": doctor_out(doctor).model_dump(),
        "stats": {
            "today_appointments": today_appts.count(),
            "pending_today": today_appts.filter(
                Appointment.status.in_(
                    [AppointmentStatus.SCHEDULED, AppointmentStatus.CHECKED_IN]
                )
            ).count(),
            "completed_today": today_appts.filter(
                Appointment.status == AppointmentStatus.COMPLETED
            ).count(),
            "total_patients": db.query(func.count(func.distinct(Appointment.patient_id)))
            .filter(Appointment.doctor_id == doctor.id)
            .scalar()
            or 0,
            "prescriptions_issued": db.query(Prescription)
            .filter(Prescription.doctor_id == doctor.id)
            .count(),
            "video_consultations": base.filter(Appointment.appointment_type == "video").count(),
        },
        "weekly_trend": weekly,
        "upcoming": [appointment_out(a).model_dump() for a in upcoming],
    }


@router.get("/appointments", response_model=list[AppointmentOut])
def doctor_appointments(
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor),
    on: date | None = None,
    status_filter: str | None = Query(None, alias="status"),
) -> list[AppointmentOut]:
    query = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user),
            joinedload(Appointment.hospital),
        )
        .filter(Appointment.doctor_id == doctor.id)
    )
    if on:
        query = query.filter(func.date(Appointment.scheduled_at) == on)
    if status_filter:
        query = query.filter(Appointment.status == status_filter)
    return [appointment_out(a) for a in query.order_by(Appointment.scheduled_at).all()]


@router.get("/queue")
def doctor_queue(
    db: Session = Depends(get_db), doctor: Doctor = Depends(get_current_doctor)
) -> dict:
    today = date.today()
    appts = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user),
            joinedload(Appointment.hospital),
        )
        .filter(
            Appointment.doctor_id == doctor.id,
            func.date(Appointment.scheduled_at) == today,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
        .order_by(Appointment.token_number)
        .all()
    )
    waiting = [a for a in appts if a.status in (AppointmentStatus.SCHEDULED, AppointmentStatus.CHECKED_IN)]
    in_progress = next((a for a in appts if a.status == AppointmentStatus.IN_PROGRESS), None)
    return {
        "date": today.isoformat(),
        "now_serving": appointment_out(in_progress).model_dump() if in_progress else None,
        "waiting": [appointment_out(a).model_dump() for a in waiting],
        "completed": [
            appointment_out(a).model_dump()
            for a in appts
            if a.status == AppointmentStatus.COMPLETED
        ],
        "average_wait_minutes": 12 + len(waiting) * 3,
    }


@router.post("/queue/{appointment_id}/call", response_model=AppointmentOut)
def call_next_patient(
    appointment_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor),
) -> AppointmentOut:
    appt = db.get(Appointment, appointment_id)
    if not appt or appt.doctor_id != doctor.id:
        raise HTTPException(404, "Appointment not found")
    db.query(Appointment).filter(
        Appointment.doctor_id == doctor.id,
        Appointment.status == AppointmentStatus.IN_PROGRESS,
    ).update({"status": AppointmentStatus.COMPLETED})
    appt.status = AppointmentStatus.IN_PROGRESS
    db.add(
        Notification(
            user_id=appt.patient.user_id,
            title="Your turn is next",
            body=f"Dr. {doctor.user.full_name} is ready to see you now.",
            category="appointment",
            severity="success",
            action_url="/patient/appointments",
        )
    )
    db.commit()
    db.refresh(appt)
    return appointment_out(appt)


@router.get("/patients", response_model=list[PatientOut])
def doctor_patients(
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor),
    search: str | None = None,
) -> list[PatientOut]:
    query = (
        db.query(Patient)
        .options(joinedload(Patient.user))
        .join(Appointment, Appointment.patient_id == Patient.id)
        .filter(Appointment.doctor_id == doctor.id)
    )
    if search:
        query = query.join(User, Patient.user_id == User.id).filter(
            User.full_name.ilike(f"%{search}%")
        )
    return [patient_out(p) for p in query.distinct().limit(100).all()]


@router.get("/patients/{patient_id}/history")
def patient_history(
    patient_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor),
) -> dict:
    patient = db.query(Patient).options(joinedload(Patient.user)).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    appts = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user),
            joinedload(Appointment.hospital),
        )
        .filter(Appointment.patient_id == patient_id)
        .order_by(Appointment.scheduled_at.desc())
        .limit(20)
        .all()
    )
    prescriptions = (
        db.query(Prescription)
        .options(
            joinedload(Prescription.items),
            joinedload(Prescription.patient).joinedload(Patient.user),
            joinedload(Prescription.doctor).joinedload(Doctor.user),
        )
        .filter(Prescription.patient_id == patient_id)
        .order_by(Prescription.issued_on.desc())
        .limit(20)
        .all()
    )
    reports = (
        db.query(Report)
        .filter(Report.patient_id == patient_id)
        .order_by(Report.report_date.desc())
        .limit(20)
        .all()
    )
    return {
        "patient": patient_out(patient).model_dump(),
        "appointments": [appointment_out(a).model_dump() for a in appts],
        "prescriptions": [prescription_out(p).model_dump() for p in prescriptions],
        "reports": [report_out(r).model_dump() for r in reports],
    }


@router.get("/prescriptions", response_model=list[PrescriptionOut])
def doctor_prescriptions(
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor),
    limit: int = Query(50, le=200),
) -> list[PrescriptionOut]:
    rows = (
        db.query(Prescription)
        .options(
            joinedload(Prescription.items),
            joinedload(Prescription.patient).joinedload(Patient.user),
            joinedload(Prescription.doctor).joinedload(Doctor.user),
        )
        .filter(Prescription.doctor_id == doctor.id)
        .order_by(Prescription.issued_on.desc())
        .limit(limit)
        .all()
    )
    return [prescription_out(p) for p in rows]


@router.post("/prescriptions", response_model=PrescriptionOut, status_code=201)
def create_prescription(
    payload: PrescriptionCreate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor),
) -> PrescriptionOut:
    patient = db.get(Patient, payload.patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    pres = Prescription(
        patient_id=payload.patient_id,
        doctor_id=doctor.id,
        appointment_id=payload.appointment_id,
        issued_on=date.today(),
        diagnosis=payload.diagnosis,
        advice=payload.advice,
        follow_up_date=payload.follow_up_date,
    )
    pres.items = [
        PrescriptionItem(
            medicine_id=item.medicine_id,
            medicine_name=item.medicine_name,
            dosage=item.dosage,
            duration_days=item.duration_days,
            instructions=item.instructions,
        )
        for item in payload.items
    ]
    db.add(pres)
    if payload.appointment_id:
        appt = db.get(Appointment, payload.appointment_id)
        if appt:
            appt.status = AppointmentStatus.COMPLETED
            appt.diagnosis = payload.diagnosis
    db.add(
        Notification(
            user_id=patient.user_id,
            title="New prescription issued",
            body=f"Dr. {doctor.user.full_name} issued a prescription for {payload.diagnosis or 'your visit'}.",
            category="prescription",
            severity="info",
            action_url="/patient/prescriptions",
        )
    )
    db.commit()
    db.refresh(pres)
    return prescription_out(pres)


@router.post("/lab-requests", response_model=ReportOut, status_code=201)
def create_lab_request(
    payload: ReportCreate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor),
) -> ReportOut:
    patient = db.get(Patient, payload.patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    report = Report(
        patient_id=payload.patient_id,
        doctor_id=doctor.id,
        hospital_id=doctor.hospital_id,
        report_type=payload.report_type or ReportType.LAB,
        title=payload.title,
        summary=payload.summary or "Lab investigation requested — sample pending collection.",
        result_json=payload.result_json,
        report_date=payload.report_date or date.today(),
        is_abnormal=payload.is_abnormal,
    )
    db.add(report)
    db.add(
        Notification(
            user_id=patient.user_id,
            title="Lab test requested",
            body=f"{payload.title} has been requested by Dr. {doctor.user.full_name}.",
            category="report",
            severity="info",
            action_url="/patient/reports",
        )
    )
    db.commit()
    db.refresh(report)
    return report_out(report)


@router.post("/referrals", response_model=MessageResponse, status_code=201)
def doctor_referral(
    patient_id: int,
    reason: str,
    to_hospital_id: int | None = None,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor),
) -> MessageResponse:
    if not db.get(Patient, patient_id):
        raise HTTPException(404, "Patient not found")
    db.add(
        Referral(
            patient_id=patient_id,
            created_by_user_id=doctor.user_id,
            from_facility=doctor.hospital.name if doctor.hospital else "SevaSetu Teleconsult",
            to_hospital_id=to_hospital_id,
            reason=reason,
        )
    )
    db.commit()
    return MessageResponse(message="Referral created")


@router.get("/medicines", response_model=list[MedicineOut])
def search_medicines(
    search: str | None = None,
    category: str | None = None,
    limit: int = Query(40, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[MedicineOut]:
    query = db.query(Medicine)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(Medicine.name.ilike(pattern), Medicine.generic_name.ilike(pattern))
        )
    if category:
        query = query.filter(Medicine.category == category)
    return [MedicineOut.model_validate(m) for m in query.order_by(Medicine.name).limit(limit).all()]
