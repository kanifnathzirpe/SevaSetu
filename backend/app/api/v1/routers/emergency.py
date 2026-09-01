from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_roles
from app.api.v1.serializers import ambulance_out, hospital_out, sos_out
from app.db.session import get_db
from app.models import (
    Ambulance,
    AmbulanceStatus,
    Hospital,
    Notification,
    Patient,
    SosRequest,
    SosStatus,
    User,
    UserRole,
)
from app.schemas import AmbulanceOut, HospitalOut, SosCreate, SosOut, SosStatusUpdate
from app.services.geo import eta_minutes, haversine_km

router = APIRouter(prefix="/emergency", tags=["emergency"])


@router.post("/sos", response_model=SosOut, status_code=201)
def raise_sos(
    payload: SosCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SosOut:
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()

    ambulances = (
        db.query(Ambulance)
        .options(joinedload(Ambulance.hospital))
        .filter(Ambulance.status == AmbulanceStatus.AVAILABLE)
        .all()
    )
    nearest_amb = min(
        ambulances,
        key=lambda a: haversine_km(payload.latitude, payload.longitude, a.latitude, a.longitude),
        default=None,
    )
    hospitals = db.query(Hospital).filter(Hospital.has_emergency.is_(True)).all()
    nearest_hospital = min(
        hospitals,
        key=lambda h: haversine_km(payload.latitude, payload.longitude, h.latitude, h.longitude),
        default=None,
    )

    distance = (
        haversine_km(payload.latitude, payload.longitude, nearest_amb.latitude, nearest_amb.longitude)
        if nearest_amb
        else 6.0
    )

    sos = SosRequest(
        patient_id=patient.id if patient else None,
        raised_by_user_id=user.id,
        emergency_type=payload.emergency_type,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address or (patient.address if patient else ""),
        status=SosStatus.DISPATCHED if nearest_amb else SosStatus.REQUESTED,
        ambulance_id=nearest_amb.id if nearest_amb else None,
        hospital_id=nearest_hospital.id if nearest_hospital else None,
        eta_minutes=eta_minutes(distance),
    )
    if nearest_amb:
        nearest_amb.status = AmbulanceStatus.ON_DUTY
    db.add(sos)
    db.add(
        Notification(
            user_id=user.id,
            title="SOS dispatched",
            body=(
                f"Ambulance {nearest_amb.vehicle_number} is on the way — ETA {sos.eta_minutes} min."
                if nearest_amb
                else "Your SOS was received. The district emergency room is assigning an ambulance."
            ),
            category="emergency",
            severity="critical",
            action_url="/patient/emergency",
        )
    )
    for officer in db.query(User).filter(User.role.in_([UserRole.EMERGENCY, UserRole.DHO])).all():
        db.add(
            Notification(
                user_id=officer.id,
                title=f"New SOS — {payload.emergency_type}",
                body=f"{user.full_name} raised an SOS near {payload.address or 'the area'}.",
                category="emergency",
                severity="critical",
                action_url="/emergency/console",
            )
        )
    db.commit()
    db.refresh(sos)
    return sos_out(sos)


@router.get("/sos/active", response_model=list[SosOut])
def active_sos(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[SosOut]:
    query = (
        db.query(SosRequest)
        .options(
            joinedload(SosRequest.ambulance),
            joinedload(SosRequest.hospital),
            joinedload(SosRequest.patient).joinedload(Patient.user),
        )
        .filter(SosRequest.status.notin_([SosStatus.COMPLETED, SosStatus.CANCELLED]))
    )
    if user.role == UserRole.PATIENT:
        query = query.filter(SosRequest.raised_by_user_id == user.id)
    return [sos_out(s) for s in query.order_by(SosRequest.created_at.desc()).all()]


@router.get("/sos", response_model=list[SosOut])
def sos_history(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[SosOut]:
    query = (
        db.query(SosRequest)
        .options(
            joinedload(SosRequest.ambulance),
            joinedload(SosRequest.hospital),
            joinedload(SosRequest.patient).joinedload(Patient.user),
        )
    )
    if user.role == UserRole.PATIENT:
        query = query.filter(SosRequest.raised_by_user_id == user.id)
    return [sos_out(s) for s in query.order_by(SosRequest.created_at.desc()).limit(100).all()]


@router.get("/sos/{sos_id}", response_model=SosOut)
def sos_detail(sos_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> SosOut:
    sos = (
        db.query(SosRequest)
        .options(
            joinedload(SosRequest.ambulance),
            joinedload(SosRequest.hospital),
            joinedload(SosRequest.patient).joinedload(Patient.user),
        )
        .filter(SosRequest.id == sos_id)
        .first()
    )
    if not sos:
        raise HTTPException(404, "SOS request not found")
    return sos_out(sos)


@router.patch("/sos/{sos_id}/status", response_model=SosOut)
def update_sos_status(
    sos_id: int,
    payload: SosStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SosOut:
    sos = (
        db.query(SosRequest)
        .options(
            joinedload(SosRequest.ambulance),
            joinedload(SosRequest.hospital),
            joinedload(SosRequest.patient).joinedload(Patient.user),
        )
        .filter(SosRequest.id == sos_id)
        .first()
    )
    if not sos:
        raise HTTPException(404, "SOS request not found")
    sos.status = payload.status
    if payload.status in (SosStatus.COMPLETED, SosStatus.CANCELLED):
        sos.resolved_at = datetime.now(timezone.utc)
        if sos.ambulance:
            sos.ambulance.status = AmbulanceStatus.AVAILABLE
    db.add(
        Notification(
            user_id=sos.raised_by_user_id,
            title=f"Emergency status: {payload.status.value.replace('_', ' ')}",
            body="Your emergency request status has been updated.",
            category="emergency",
            severity="info",
            action_url="/patient/emergency",
        )
    )
    db.commit()
    db.refresh(sos)
    return sos_out(sos)


@router.get("/ambulances/nearby", response_model=list[AmbulanceOut])
def nearby_ambulances(
    lat: float = 18.5204,
    lng: float = 73.8567,
    limit: int = 8,
    db: Session = Depends(get_db),
) -> list[AmbulanceOut]:
    rows = db.query(Ambulance).options(joinedload(Ambulance.hospital)).all()
    out = [ambulance_out(a, haversine_km(lat, lng, a.latitude, a.longitude)) for a in rows]
    out.sort(key=lambda a: (a.status != "available", a.distance_km or 0))
    return out[:limit]


@router.get("/phc/nearest", response_model=list[HospitalOut])
def nearest_phc(
    lat: float = 18.5204, lng: float = 73.8567, limit: int = 5, db: Session = Depends(get_db)
) -> list[HospitalOut]:
    rows = db.query(Hospital).filter(Hospital.has_emergency.is_(True)).all()
    out = [hospital_out(h, haversine_km(lat, lng, h.latitude, h.longitude)) for h in rows]
    out.sort(key=lambda h: h.distance_km or 0)
    return out[:limit]


@router.get("/contacts")
def emergency_contacts() -> list[dict]:
    return [
        {"name": "Ambulance (108)", "number": "108", "category": "Ambulance"},
        {"name": "National Emergency", "number": "112", "category": "Emergency"},
        {"name": "Municipal Corporation Health", "number": "020-25501000", "category": "Municipal"},
        {"name": "PCMC Health Department", "number": "020-67331111", "category": "Municipal"},
        {"name": "Sassoon General Hospital", "number": "020-26128000", "category": "Hospital"},
        {"name": "Women Helpline", "number": "181", "category": "Helpline"},
        {"name": "Child Helpline", "number": "1098", "category": "Helpline"},
        {"name": "Blood Bank Helpline", "number": "104", "category": "Blood"},
        {"name": "Mental Health (Tele-MANAS)", "number": "14416", "category": "Helpline"},
    ]


@router.get(
    "/console",
    dependencies=[Depends(require_roles(UserRole.EMERGENCY, UserRole.DHO, UserRole.HOSPITAL_ADMIN))],
)
def emergency_console(db: Session = Depends(get_db)) -> dict:
    active = (
        db.query(SosRequest)
        .options(
            joinedload(SosRequest.ambulance),
            joinedload(SosRequest.hospital),
            joinedload(SosRequest.patient).joinedload(Patient.user),
        )
        .filter(SosRequest.status.notin_([SosStatus.COMPLETED, SosStatus.CANCELLED]))
        .order_by(SosRequest.created_at.desc())
        .all()
    )
    ambulances = db.query(Ambulance).options(joinedload(Ambulance.hospital)).all()
    return {
        "stats": {
            "active_cases": len(active),
            "ambulances_total": len(ambulances),
            "ambulances_available": len([a for a in ambulances if a.status == AmbulanceStatus.AVAILABLE]),
            "ambulances_on_duty": len([a for a in ambulances if a.status == AmbulanceStatus.ON_DUTY]),
            "critical_cases": len([s for s in active if s.emergency_type in ("Cardiac", "Accident", "Obstetric")]),
        },
        "active_sos": [sos_out(s).model_dump() for s in active],
        "ambulances": [ambulance_out(a).model_dump() for a in ambulances],
        "hospitals": [
            hospital_out(h).model_dump()
            for h in db.query(Hospital).filter(Hospital.has_emergency.is_(True)).all()
        ],
    }
