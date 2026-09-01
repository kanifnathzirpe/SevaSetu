from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_roles
from app.api.v1.serializers import ambulance_out, doctor_out, hospital_out
from app.db.session import get_db
from app.models import (
    Ambulance,
    Appointment,
    AppointmentStatus,
    AshaWorker,
    Child,
    DiseaseCase,
    Doctor,
    Hospital,
    InventoryItem,
    Medicine,
    Patient,
    PregnancyRecord,
    Referral,
    RiskLevel,
    SosRequest,
    SosStatus,
    User,
    UserRole,
    Vaccination,
    VaccinationStatus,
    Visit,
)
from app.schemas import AmbulanceOut, DoctorOut, HospitalOut, MessageResponse
from app.services.ai import outbreak_forecast

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.DHO))],
)


@router.get("/dashboard")
def admin_dashboard(db: Session = Depends(get_db)) -> dict:
    today = date.today()
    total_patients = db.query(Patient).count()
    appt_trend = []
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        appt_trend.append(
            {
                "date": day.strftime("%d %b"),
                "appointments": db.query(Appointment)
                .filter(func.date(Appointment.scheduled_at) == day)
                .count(),
                "completed": db.query(Appointment)
                .filter(
                    func.date(Appointment.scheduled_at) == day,
                    Appointment.status == AppointmentStatus.COMPLETED,
                )
                .count(),
            }
        )

    facility_split = [
        {"facility_type": ftype, "count": count}
        for ftype, count in db.query(Hospital.facility_type, func.count(Hospital.id))
        .group_by(Hospital.facility_type)
        .all()
    ]

    locality_rows = (
        db.query(Patient.locality, func.count(Patient.id))
        .group_by(Patient.locality)
        .order_by(func.count(Patient.id).desc())
        .limit(12)
        .all()
    )

    beds = db.query(func.sum(Hospital.total_beds), func.sum(Hospital.available_beds)).first()
    total_beds, available_beds = int(beds[0] or 0), int(beds[1] or 0)

    return {
        "stats": {
            "total_patients": total_patients,
            "total_doctors": db.query(Doctor).count(),
            "total_asha_workers": db.query(AshaWorker).count(),
            "total_hospitals": db.query(Hospital).count(),
            "total_ambulances": db.query(Ambulance).count(),
            "appointments_today": db.query(Appointment)
            .filter(func.date(Appointment.scheduled_at) == today)
            .count(),
            "active_sos": db.query(SosRequest)
            .filter(SosRequest.status.notin_([SosStatus.COMPLETED, SosStatus.CANCELLED]))
            .count(),
            "high_risk_pregnancies": db.query(PregnancyRecord)
            .filter(
                PregnancyRecord.delivered.is_(False),
                PregnancyRecord.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL]),
            )
            .count(),
            "immunisation_coverage_percent": _immunisation_coverage(db),
            "bed_occupancy_percent": (
                round((total_beds - available_beds) / total_beds * 100, 1) if total_beds else 0
            ),
            "total_beds": total_beds,
            "available_beds": available_beds,
            "visits_this_month": db.query(Visit)
            .filter(Visit.visit_date >= today.replace(day=1))
            .count(),
            "open_referrals": db.query(Referral).filter(Referral.status == "open").count(),
        },
        "appointment_trend": appt_trend,
        "facility_split": facility_split,
        "patients_by_locality": [
            {"locality": loc, "patients": count} for loc, count in locality_rows
        ],
        "top_specializations": [
            {"specialization": spec, "doctors": count}
            for spec, count in db.query(Doctor.specialization, func.count(Doctor.id))
            .group_by(Doctor.specialization)
            .order_by(func.count(Doctor.id).desc())
            .limit(8)
            .all()
        ],
    }


def _immunisation_coverage(db: Session) -> float:
    total = db.query(Vaccination).count()
    if not total:
        return 0.0
    done = db.query(Vaccination).filter(Vaccination.status == VaccinationStatus.COMPLETED).count()
    return round(done / total * 100, 1)


@router.get("/hospitals", response_model=list[HospitalOut])
def hospitals(db: Session = Depends(get_db), search: str | None = None) -> list[HospitalOut]:
    query = db.query(Hospital)
    if search:
        query = query.filter(Hospital.name.ilike(f"%{search}%"))
    return [hospital_out(h) for h in query.order_by(Hospital.name).all()]


@router.patch("/hospitals/{hospital_id}/beds", response_model=HospitalOut)
def update_beds(
    hospital_id: int,
    available_beds: int,
    available_icu_beds: int,
    db: Session = Depends(get_db),
) -> HospitalOut:
    hospital = db.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(404, "Hospital not found")
    hospital.available_beds = max(0, min(available_beds, hospital.total_beds))
    hospital.available_icu_beds = max(0, min(available_icu_beds, hospital.icu_beds))
    db.commit()
    db.refresh(hospital)
    return hospital_out(hospital)


@router.get("/doctors", response_model=list[DoctorOut])
def doctors(
    db: Session = Depends(get_db),
    search: str | None = None,
    hospital_id: int | None = None,
) -> list[DoctorOut]:
    query = db.query(Doctor).options(joinedload(Doctor.user), joinedload(Doctor.hospital))
    if hospital_id:
        query = query.filter(Doctor.hospital_id == hospital_id)
    if search:
        query = query.join(User, Doctor.user_id == User.id).filter(
            User.full_name.ilike(f"%{search}%")
        )
    return [doctor_out(d) for d in query.limit(200).all()]


@router.patch("/doctors/{doctor_id}/availability", response_model=DoctorOut)
def toggle_doctor_availability(doctor_id: int, db: Session = Depends(get_db)) -> DoctorOut:
    doctor = (
        db.query(Doctor)
        .options(joinedload(Doctor.user), joinedload(Doctor.hospital))
        .filter(Doctor.id == doctor_id)
        .first()
    )
    if not doctor:
        raise HTTPException(404, "Doctor not found")
    doctor.is_available_online = not doctor.is_available_online
    db.commit()
    db.refresh(doctor)
    return doctor_out(doctor)


@router.get("/asha-workers")
def asha_workers(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.query(AshaWorker).options(joinedload(AshaWorker.user)).all()
    return [
        {
            "id": a.id,
            "name": a.user.full_name,
            "asha_code": a.asha_code,
            "phone": a.user.phone,
            "assigned_area": a.assigned_area,
            "households": a.households_count,
            "experience_years": a.experience_years,
            "visits_this_month": db.query(Visit)
            .filter(Visit.asha_worker_id == a.id, Visit.visit_date >= date.today().replace(day=1))
            .count(),
        }
        for a in rows
    ]


@router.get("/inventory")
def inventory(
    db: Session = Depends(get_db),
    hospital_id: int | None = None,
    low_stock_only: bool = False,
    search: str | None = None,
    limit: int = Query(200, le=500),
) -> list[dict]:
    query = db.query(InventoryItem).options(
        joinedload(InventoryItem.medicine), joinedload(InventoryItem.hospital)
    )
    if hospital_id:
        query = query.filter(InventoryItem.hospital_id == hospital_id)
    if low_stock_only:
        query = query.filter(InventoryItem.quantity <= InventoryItem.reorder_level)
    if search:
        query = query.join(Medicine, InventoryItem.medicine_id == Medicine.id).filter(
            Medicine.name.ilike(f"%{search}%")
        )
    items = query.limit(limit).all()
    today = date.today()
    return [
        {
            "id": item.id,
            "hospital_id": item.hospital_id,
            "hospital_name": item.hospital.name,
            "medicine_id": item.medicine_id,
            "medicine_name": item.medicine.name,
            "category": item.medicine.category,
            "strength": item.medicine.strength,
            "batch_no": item.batch_no,
            "quantity": item.quantity,
            "reorder_level": item.reorder_level,
            "expiry_date": item.expiry_date.isoformat(),
            "expiring_soon": (item.expiry_date - today).days <= 90,
            "status": "critical"
            if item.quantity <= item.reorder_level * 0.4
            else "low"
            if item.quantity <= item.reorder_level
            else "healthy",
        }
        for item in items
    ]


@router.patch("/inventory/{item_id}/restock", response_model=MessageResponse)
def restock(item_id: int, quantity: int, db: Session = Depends(get_db)) -> MessageResponse:
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(404, "Inventory item not found")
    item.quantity += max(0, quantity)
    db.commit()
    return MessageResponse(message=f"Restocked {quantity} units — new quantity {item.quantity}")


@router.get("/ambulances", response_model=list[AmbulanceOut])
def ambulances(db: Session = Depends(get_db)) -> list[AmbulanceOut]:
    rows = db.query(Ambulance).options(joinedload(Ambulance.hospital)).all()
    return [ambulance_out(a) for a in rows]


@router.get("/vaccination-dashboard")
def vaccination_dashboard(db: Session = Depends(get_db)) -> dict:
    by_vaccine = (
        db.query(
            Vaccination.vaccine_name,
            func.count(Vaccination.id),
            func.count(Vaccination.administered_date),
        )
        .group_by(Vaccination.vaccine_name)
        .all()
    )
    coverage = [
        {
            "vaccine": name,
            "total": int(total),
            "completed": int(done or 0),
            "coverage_percent": round((done or 0) / total * 100, 1) if total else 0,
        }
        for name, total, done in by_vaccine
    ]
    coverage.sort(key=lambda c: c["coverage_percent"])

    by_locality = (
        db.query(Child.locality, func.count(Child.id)).group_by(Child.locality).all()
    )
    return {
        "overall_coverage_percent": _immunisation_coverage(db),
        "due_this_week": db.query(Vaccination)
        .filter(
            Vaccination.status != VaccinationStatus.COMPLETED,
            Vaccination.scheduled_date <= date.today() + timedelta(days=7),
        )
        .count(),
        "overdue": db.query(Vaccination)
        .filter(
            Vaccination.status != VaccinationStatus.COMPLETED,
            Vaccination.scheduled_date < date.today(),
        )
        .count(),
        "by_vaccine": coverage,
        "children_by_locality": [{"locality": loc, "children": n} for loc, n in by_locality],
    }


@router.get("/disease-heatmap")
def disease_heatmap(days: int = 30, db: Session = Depends(get_db)) -> dict:
    since = date.today() - timedelta(days=days)
    rows = db.query(DiseaseCase).filter(DiseaseCase.reported_on >= since).all()
    points = [
        {
            "disease": c.disease,
            "locality": c.locality,
            "lat": c.latitude,
            "lng": c.longitude,
            "cases": c.case_count,
            "severity": c.severity.value,
            "reported_on": c.reported_on.isoformat(),
        }
        for c in rows
    ]
    by_disease: dict[str, int] = defaultdict(int)
    by_locality: dict[str, int] = defaultdict(int)
    for c in rows:
        by_disease[c.disease] += c.case_count
        by_locality[c.locality] += c.case_count

    weekly: dict[str, list[int]] = defaultdict(lambda: [0, 0, 0, 0])
    for c in rows:
        bucket = min(3, (date.today() - c.reported_on).days // 7)
        weekly[c.disease][3 - bucket] += c.case_count

    return {
        "points": points,
        "totals_by_disease": [
            {"disease": d, "cases": n}
            for d, n in sorted(by_disease.items(), key=lambda kv: kv[1], reverse=True)
        ],
        "totals_by_locality": [
            {"locality": loc, "cases": n}
            for loc, n in sorted(by_locality.items(), key=lambda kv: kv[1], reverse=True)
        ],
        "forecast": outbreak_forecast(dict(weekly), "Pune District"),
    }


@router.get("/reports/summary")
def district_report(db: Session = Depends(get_db)) -> dict:
    today = date.today()
    month_start = today.replace(day=1)
    return {
        "generated_on": today.isoformat(),
        "district": "Pune",
        "sections": [
            {
                "title": "Service delivery",
                "metrics": [
                    {"label": "Appointments this month", "value": db.query(Appointment).filter(Appointment.scheduled_at >= month_start).count()},
                    {"label": "ASHA household visits", "value": db.query(Visit).filter(Visit.visit_date >= month_start).count()},
                    {"label": "Referrals raised", "value": db.query(Referral).filter(Referral.created_at >= month_start).count()},
                ],
            },
            {
                "title": "Maternal & child health",
                "metrics": [
                    {"label": "Active pregnancies", "value": db.query(PregnancyRecord).filter(PregnancyRecord.delivered.is_(False)).count()},
                    {"label": "High-risk pregnancies", "value": db.query(PregnancyRecord).filter(PregnancyRecord.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL])).count()},
                    {"label": "Children tracked", "value": db.query(Child).count()},
                    {"label": "Immunisation coverage %", "value": _immunisation_coverage(db)},
                ],
            },
            {
                "title": "Emergency response",
                "metrics": [
                    {"label": "SOS raised this month", "value": db.query(SosRequest).filter(SosRequest.created_at >= month_start).count()},
                    {"label": "Ambulances available", "value": db.query(Ambulance).filter(Ambulance.status == "available").count()},
                    {"label": "Average response ETA (min)", "value": int(db.query(func.avg(SosRequest.eta_minutes)).scalar() or 0)},
                ],
            },
            {
                "title": "Supply chain",
                "metrics": [
                    {"label": "Medicines tracked", "value": db.query(Medicine).count()},
                    {"label": "Low-stock line items", "value": db.query(InventoryItem).filter(InventoryItem.quantity <= InventoryItem.reorder_level).count()},
                    {"label": "Batches expiring in 90 days", "value": db.query(InventoryItem).filter(InventoryItem.expiry_date <= today + timedelta(days=90)).count()},
                ],
            },
        ],
    }
