from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_asha
from app.api.v1.serializers import (
    age_from_dob,
    child_out,
    patient_out,
    pregnancy_out,
    referral_out,
    visit_out,
)
from app.db.session import get_db
from app.models import (
    AshaWorker,
    Child,
    Hospital,
    Household,
    Notification,
    Patient,
    PregnancyRecord,
    Referral,
    RiskLevel,
    Vaccination,
    VaccinationStatus,
    Visit,
    VisitStatus,
)
from app.schemas import (
    ChildOut,
    HouseholdOut,
    HouseholdSurvey,
    MessageResponse,
    PatientOut,
    PregnancyOut,
    ReferralCreate,
    ReferralOut,
    VisitCreate,
    VisitOut,
)
from app.services.ai import pregnancy_risk

router = APIRouter(prefix="/asha", tags=["asha"])


@router.get("/dashboard")
def asha_dashboard(db: Session = Depends(get_db), asha: AshaWorker = Depends(get_current_asha)) -> dict:
    today = date.today()
    visits = db.query(Visit).filter(Visit.asha_worker_id == asha.id)
    households = db.query(Household).filter(Household.asha_worker_id == asha.id)
    pregnancies = (
        db.query(PregnancyRecord)
        .options(joinedload(PregnancyRecord.patient).joinedload(Patient.user))
        .filter(PregnancyRecord.asha_worker_id == asha.id, PregnancyRecord.delivered.is_(False))
    )
    high_risk_pregnancies = pregnancies.filter(
        PregnancyRecord.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL])
    ).all()

    trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        trend.append(
            {
                "day": day.strftime("%a"),
                "planned": visits.filter(Visit.visit_date == day).count(),
                "completed": visits.filter(
                    Visit.visit_date == day, Visit.status == VisitStatus.COMPLETED
                ).count(),
            }
        )

    today_visits = visits.options(joinedload(Visit.household)).filter(Visit.visit_date == today).all()
    completed_today = len([v for v in today_visits if v.status == VisitStatus.COMPLETED])

    return {
        "asha": {
            "id": asha.id,
            "name": asha.user.full_name,
            "asha_code": asha.asha_code,
            "assigned_area": asha.assigned_area,
            "village_or_ward": asha.village_or_ward,
            "supervisor_name": asha.supervisor_name,
            "daily_visit_target": asha.daily_visit_target,
        },
        "stats": {
            "households": households.count(),
            "assigned_patients": db.query(Patient).filter(Patient.asha_worker_id == asha.id).count(),
            "visits_today": len(today_visits),
            "completed_today": completed_today,
            "target_completion_percent": min(
                100, int(completed_today / max(asha.daily_visit_target, 1) * 100)
            ),
            "pregnancies_tracked": pregnancies.count(),
            "high_risk_cases": len(high_risk_pregnancies),
            "pending_sync": visits.filter(Visit.synced.is_(False)).count(),
            "vaccinations_due": db.query(Vaccination)
            .join(Child, Vaccination.child_id == Child.id)
            .join(Household, Child.household_id == Household.id)
            .filter(
                Household.asha_worker_id == asha.id,
                Vaccination.status != VaccinationStatus.COMPLETED,
            )
            .count(),
        },
        "weekly_trend": trend,
        "today_visits": [visit_out(v).model_dump() for v in today_visits],
        "high_risk": [pregnancy_out(p).model_dump() for p in high_risk_pregnancies],
    }


@router.get("/households", response_model=list[HouseholdOut])
def households(
    search: str | None = None,
    risk: str | None = None,
    db: Session = Depends(get_db),
    asha: AshaWorker = Depends(get_current_asha),
) -> list[HouseholdOut]:
    query = db.query(Household).filter(Household.asha_worker_id == asha.id)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (Household.head_name.ilike(pattern)) | (Household.household_code.ilike(pattern))
        )
    if risk:
        query = query.filter(Household.risk_level == risk)
    return [HouseholdOut.model_validate(h) for h in query.order_by(Household.head_name).all()]


@router.get("/households/{household_id}")
def household_detail(
    household_id: int,
    db: Session = Depends(get_db),
    asha: AshaWorker = Depends(get_current_asha),
) -> dict:
    household = db.get(Household, household_id)
    if not household or household.asha_worker_id != asha.id:
        raise HTTPException(404, "Household not found")
    visits = (
        db.query(Visit)
        .options(joinedload(Visit.household))
        .filter(Visit.household_id == household_id)
        .order_by(Visit.visit_date.desc())
        .all()
    )
    children = db.query(Child).filter(Child.household_id == household_id).all()
    return {
        "household": HouseholdOut.model_validate(household).model_dump(),
        "visits": [visit_out(v).model_dump() for v in visits],
        "children": [child_out(c).model_dump() for c in children],
    }


@router.patch("/households/{household_id}/survey", response_model=HouseholdOut)
def submit_survey(
    household_id: int,
    payload: HouseholdSurvey,
    db: Session = Depends(get_db),
    asha: AshaWorker = Depends(get_current_asha),
) -> HouseholdOut:
    household = db.get(Household, household_id)
    if not household or household.asha_worker_id != asha.id:
        raise HTTPException(404, "Household not found")
    for field, value in payload.model_dump(exclude_none=True, exclude={"notes"}).items():
        setattr(household, field, value)
    household.last_visit_date = date.today()
    db.commit()
    db.refresh(household)
    return HouseholdOut.model_validate(household)


@router.get("/visits", response_model=list[VisitOut])
def list_visits(
    on: date | None = None,
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    asha: AshaWorker = Depends(get_current_asha),
) -> list[VisitOut]:
    query = (
        db.query(Visit).options(joinedload(Visit.household)).filter(Visit.asha_worker_id == asha.id)
    )
    if on:
        query = query.filter(Visit.visit_date == on)
    if status_filter:
        query = query.filter(Visit.status == status_filter)
    return [visit_out(v) for v in query.order_by(Visit.visit_date.desc()).limit(200).all()]


@router.post("/visits", response_model=VisitOut, status_code=201)
def create_visit(
    payload: VisitCreate,
    db: Session = Depends(get_db),
    asha: AshaWorker = Depends(get_current_asha),
) -> VisitOut:
    household = db.get(Household, payload.household_id)
    if not household or household.asha_worker_id != asha.id:
        raise HTTPException(404, "Household not found")
    visit = Visit(asha_worker_id=asha.id, **payload.model_dump())
    db.add(visit)
    if payload.status == VisitStatus.COMPLETED:
        household.last_visit_date = payload.visit_date
    db.commit()
    db.refresh(visit)
    return visit_out(visit)


@router.post("/visits/{visit_id}/complete", response_model=VisitOut)
def complete_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    asha: AshaWorker = Depends(get_current_asha),
) -> VisitOut:
    visit = db.get(Visit, visit_id)
    if not visit or visit.asha_worker_id != asha.id:
        raise HTTPException(404, "Visit not found")
    visit.status = VisitStatus.COMPLETED
    if visit.household:
        visit.household.last_visit_date = visit.visit_date
    db.commit()
    db.refresh(visit)
    return visit_out(visit)


@router.post("/sync", response_model=MessageResponse)
def sync_offline_records(
    db: Session = Depends(get_db), asha: AshaWorker = Depends(get_current_asha)
) -> MessageResponse:
    pending = (
        db.query(Visit)
        .filter(Visit.asha_worker_id == asha.id, Visit.synced.is_(False))
        .update({"synced": True})
    )
    db.commit()
    return MessageResponse(message=f"{pending} offline record(s) synced with the district server")


@router.get("/patients", response_model=list[PatientOut])
def assigned_patients(
    db: Session = Depends(get_db), asha: AshaWorker = Depends(get_current_asha)
) -> list[PatientOut]:
    rows = (
        db.query(Patient)
        .options(joinedload(Patient.user))
        .filter(Patient.asha_worker_id == asha.id)
        .all()
    )
    return [patient_out(p) for p in rows]


@router.get("/pregnancies", response_model=list[PregnancyOut])
def pregnancies(
    db: Session = Depends(get_db), asha: AshaWorker = Depends(get_current_asha)
) -> list[PregnancyOut]:
    rows = (
        db.query(PregnancyRecord)
        .options(joinedload(PregnancyRecord.patient).joinedload(Patient.user))
        .filter(PregnancyRecord.asha_worker_id == asha.id, PregnancyRecord.delivered.is_(False))
        .order_by(PregnancyRecord.edd_date)
        .all()
    )
    return [pregnancy_out(p) for p in rows]


@router.post("/pregnancies/{record_id}/anc", response_model=PregnancyOut)
def record_anc_visit(
    record_id: int,
    hemoglobin: float,
    bp_systolic: int,
    bp_diastolic: int,
    weight_kg: float,
    db: Session = Depends(get_db),
    asha: AshaWorker = Depends(get_current_asha),
) -> PregnancyOut:
    record = (
        db.query(PregnancyRecord)
        .options(joinedload(PregnancyRecord.patient).joinedload(Patient.user))
        .filter(PregnancyRecord.id == record_id)
        .first()
    )
    if not record or record.asha_worker_id != asha.id:
        raise HTTPException(404, "Pregnancy record not found")
    record.hemoglobin = hemoglobin
    record.bp_systolic = bp_systolic
    record.bp_diastolic = bp_diastolic
    record.weight_kg = weight_kg
    record.anc_visits_completed += 1
    level, reasons = pregnancy_risk(
        hemoglobin,
        bp_systolic,
        bp_diastolic,
        age_from_dob(record.patient.date_of_birth),
        record.gravida,
        record.anc_visits_completed,
    )
    record.risk_level = RiskLevel(level)
    record.notes = "; ".join(reasons)
    if record.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
        db.add(
            Notification(
                user_id=record.patient.user_id,
                title="High-risk pregnancy alert",
                body="Your latest ANC readings need a doctor review. Please visit your PHC within 24 hours.",
                category="pregnancy",
                severity="critical",
                action_url="/patient/pregnancy",
            )
        )
    db.commit()
    db.refresh(record)
    return pregnancy_out(record)


@router.get("/children", response_model=list[ChildOut])
def asha_children(
    db: Session = Depends(get_db), asha: AshaWorker = Depends(get_current_asha)
) -> list[ChildOut]:
    children = (
        db.query(Child)
        .join(Household, Child.household_id == Household.id)
        .filter(Household.asha_worker_id == asha.id)
        .all()
    )
    result = []
    for child in children:
        due = (
            db.query(Vaccination)
            .filter(Vaccination.child_id == child.id, Vaccination.status != VaccinationStatus.COMPLETED)
            .count()
        )
        result.append(child_out(child, due))
    return result


@router.post("/vaccinations/{vaccination_id}/administer", response_model=MessageResponse)
def administer_vaccination(
    vaccination_id: int,
    db: Session = Depends(get_db),
    asha: AshaWorker = Depends(get_current_asha),
) -> MessageResponse:
    vac = db.get(Vaccination, vaccination_id)
    if not vac:
        raise HTTPException(404, "Vaccination not found")
    vac.status = VaccinationStatus.COMPLETED
    vac.administered_date = date.today()
    vac.center_name = asha.assigned_area + " Sub-Centre"
    db.commit()
    return MessageResponse(message=f"{vac.vaccine_name} {vac.dose_label} recorded")


@router.get("/vaccinations")
def due_vaccinations(
    db: Session = Depends(get_db), asha: AshaWorker = Depends(get_current_asha)
) -> list[dict]:
    rows = (
        db.query(Vaccination, Child)
        .join(Child, Vaccination.child_id == Child.id)
        .join(Household, Child.household_id == Household.id)
        .filter(
            Household.asha_worker_id == asha.id,
            Vaccination.status != VaccinationStatus.COMPLETED,
        )
        .order_by(Vaccination.scheduled_date)
        .limit(120)
        .all()
    )
    return [
        {
            "id": vac.id,
            "child_id": child.id,
            "child_name": child.name,
            "vaccine_name": vac.vaccine_name,
            "dose_label": vac.dose_label,
            "scheduled_date": vac.scheduled_date.isoformat(),
            "status": vac.status.value,
            "locality": child.locality,
        }
        for vac, child in rows
    ]


@router.post("/referrals", response_model=ReferralOut, status_code=201)
def create_referral(
    payload: ReferralCreate,
    db: Session = Depends(get_db),
    asha: AshaWorker = Depends(get_current_asha),
) -> ReferralOut:
    patient = db.query(Patient).options(joinedload(Patient.user)).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    hospital = db.get(Hospital, payload.to_hospital_id) if payload.to_hospital_id else None
    referral = Referral(
        patient_id=payload.patient_id,
        created_by_user_id=asha.user_id,
        from_facility=f"{asha.assigned_area} Sub-Centre",
        to_hospital_id=payload.to_hospital_id,
        reason=payload.reason,
        urgency=payload.urgency,
        notes=payload.notes,
    )
    db.add(referral)
    db.add(
        Notification(
            user_id=patient.user_id,
            title="You have been referred",
            body=f"{asha.user.full_name} referred you to {hospital.name if hospital else 'a district facility'}: {payload.reason}",
            category="referral",
            severity="warning",
            action_url="/patient/dashboard",
        )
    )
    db.commit()
    db.refresh(referral)
    return referral_out(referral, hospital.name if hospital else None)


@router.get("/referrals", response_model=list[ReferralOut])
def list_referrals(
    db: Session = Depends(get_db), asha: AshaWorker = Depends(get_current_asha)
) -> list[ReferralOut]:
    rows = (
        db.query(Referral)
        .options(joinedload(Referral.patient).joinedload(Patient.user))
        .filter(Referral.created_by_user_id == asha.user_id)
        .order_by(Referral.created_at.desc())
        .all()
    )
    hospitals = {h.id: h.name for h in db.query(Hospital).all()}
    return [referral_out(r, hospitals.get(r.to_hospital_id)) for r in rows]


@router.get("/targets")
def daily_targets(db: Session = Depends(get_db), asha: AshaWorker = Depends(get_current_asha)) -> dict:
    today = date.today()
    completed = (
        db.query(func.count(Visit.id))
        .filter(
            Visit.asha_worker_id == asha.id,
            Visit.visit_date == today,
            Visit.status == VisitStatus.COMPLETED,
        )
        .scalar()
        or 0
    )
    anc_due = (
        db.query(PregnancyRecord)
        .filter(
            PregnancyRecord.asha_worker_id == asha.id,
            PregnancyRecord.delivered.is_(False),
            PregnancyRecord.anc_visits_completed < 4,
        )
        .count()
    )
    vac_due = (
        db.query(Vaccination)
        .join(Child, Vaccination.child_id == Child.id)
        .join(Household, Child.household_id == Household.id)
        .filter(
            Household.asha_worker_id == asha.id,
            Vaccination.status != VaccinationStatus.COMPLETED,
            Vaccination.scheduled_date <= today,
        )
        .count()
    )
    return {
        "date": today.isoformat(),
        "targets": [
            {"label": "Household visits", "done": completed, "target": asha.daily_visit_target},
            {"label": "ANC follow-ups pending", "done": max(0, 4 - anc_due), "target": 4},
            {"label": "Immunisations due", "done": 0, "target": vac_due},
        ],
        "completion_percent": min(100, int(completed / max(asha.daily_visit_target, 1) * 100)),
    }
