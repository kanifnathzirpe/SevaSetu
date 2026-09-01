from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.api.v1.serializers import doctor_out, hospital_out
from app.db.session import get_db
from app.models import BloodBank, Doctor, Hospital
from app.schemas import DoctorOut, HospitalOut
from app.services.geo import haversine_km

router = APIRouter(prefix="/hospitals", tags=["hospitals"])


@router.get("", response_model=list[HospitalOut])
def list_hospitals(
    db: Session = Depends(get_db),
    search: str | None = None,
    facility_type: str | None = None,
    locality: str | None = None,
    has_emergency: bool | None = None,
    lat: float | None = None,
    lng: float | None = None,
    limit: int = Query(60, le=200),
) -> list[HospitalOut]:
    query = db.query(Hospital)
    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(Hospital.name.ilike(pattern), Hospital.locality.ilike(pattern)))
    if facility_type:
        query = query.filter(Hospital.facility_type == facility_type)
    if locality:
        query = query.filter(Hospital.locality.ilike(f"%{locality}%"))
    if has_emergency is not None:
        query = query.filter(Hospital.has_emergency.is_(has_emergency))

    hospitals = query.limit(limit).all()
    results = [
        hospital_out(
            h,
            haversine_km(lat, lng, h.latitude, h.longitude) if lat is not None and lng is not None else None,
        )
        for h in hospitals
    ]
    if lat is not None and lng is not None:
        results.sort(key=lambda h: h.distance_km or 0)
    return results


@router.get("/nearby", response_model=list[HospitalOut])
def nearby_hospitals(
    lat: float = 18.5204,
    lng: float = 73.8567,
    radius_km: float = 15,
    limit: int = 12,
    db: Session = Depends(get_db),
) -> list[HospitalOut]:
    hospitals = db.query(Hospital).all()
    scored = [
        hospital_out(h, haversine_km(lat, lng, h.latitude, h.longitude)) for h in hospitals
    ]
    scored = [h for h in scored if (h.distance_km or 0) <= radius_km]
    scored.sort(key=lambda h: h.distance_km or 0)
    return scored[:limit]


@router.get("/blood-banks")
def blood_banks(db: Session = Depends(get_db)) -> list[dict]:
    return [
        {
            "id": b.id,
            "name": b.name,
            "locality": b.locality,
            "phone": b.phone,
            "latitude": b.latitude,
            "longitude": b.longitude,
            "units": {
                "A+": b.units_a_pos,
                "B+": b.units_b_pos,
                "O+": b.units_o_pos,
                "AB+": b.units_ab_pos,
                "Negative groups": b.units_negative,
            },
            "total_units": b.units_a_pos
            + b.units_b_pos
            + b.units_o_pos
            + b.units_ab_pos
            + b.units_negative,
        }
        for b in db.query(BloodBank).all()
    ]


@router.get("/vaccination-centers", response_model=list[HospitalOut])
def vaccination_centers(db: Session = Depends(get_db)) -> list[HospitalOut]:
    hospitals = db.query(Hospital).filter(Hospital.has_vaccination_center.is_(True)).all()
    return [hospital_out(h) for h in hospitals]


@router.get("/{hospital_id}", response_model=HospitalOut)
def get_hospital(hospital_id: int, db: Session = Depends(get_db)) -> HospitalOut:
    hospital = db.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(404, "Hospital not found")
    return hospital_out(hospital)


@router.get("/{hospital_id}/doctors", response_model=list[DoctorOut])
def hospital_doctors(hospital_id: int, db: Session = Depends(get_db)) -> list[DoctorOut]:
    doctors = (
        db.query(Doctor)
        .options(joinedload(Doctor.user), joinedload(Doctor.hospital))
        .filter(Doctor.hospital_id == hospital_id)
        .all()
    )
    return [doctor_out(d) for d in doctors]
