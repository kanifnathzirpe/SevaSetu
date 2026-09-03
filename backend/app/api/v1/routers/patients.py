import json
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_patient
from app.api.v1.serializers import (
    age_from_dob,
    appointment_out,
    child_out,
    patient_out,
    pregnancy_out,
    prescription_out,
    report_out,
    vaccination_out,
)
from app.db.session import get_db
from app.models import (
    Appointment,
    AppointmentStatus,
    Child,
    Doctor,
    MedicineReminder,
    Patient,
    PregnancyRecord,
    Prescription,
    Report,
    Vaccination,
    VaccinationStatus,
)
from app.schemas import (
    ChildOut,
    MedicineReminderCreate,
    MedicineReminderOut,
    MessageResponse,
    PatientOut,
    PatientProfileUpdate,
    PregnancyOut,
    PrescriptionOut,
    ReportOut,
    VaccinationOut,
)
from app.services.ai import health_score, pregnancy_risk
from app.services.schemes import evaluate_patient_schemes

router = APIRouter(prefix="/patient", tags=["patient"])



@router.get("/me", response_model=PatientOut)
def my_profile(patient: Patient = Depends(get_current_patient)) -> PatientOut:
    return patient_out(patient)


@router.patch("/me", response_model=PatientOut)
def update_profile(
    payload: PatientProfileUpdate,
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
) -> PatientOut:
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(patient, field, value)
    bmi = patient.weight_kg / ((patient.height_cm / 100) ** 2) if patient.height_cm else 22
    abnormal = (
        db.query(Report)
        .filter(Report.patient_id == patient.id, Report.is_abnormal.is_(True))
        .count()
    )
    adherence = (
        db.query(func.avg(MedicineReminder.adherence_percent))
        .filter(MedicineReminder.patient_id == patient.id)
        .scalar()
        or 90
    )
    patient.health_score = health_score(
        age_from_dob(patient.date_of_birth), bmi, patient.chronic_conditions, abnormal, int(adherence)
    )
    db.commit()
    db.refresh(patient)
    return patient_out(patient)


@router.get("/dashboard")
def patient_dashboard(
    db: Session = Depends(get_db), patient: Patient = Depends(get_current_patient)
) -> dict:
    now = datetime.now(timezone.utc)
    upcoming = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user),
            joinedload(Appointment.hospital),
        )
        .filter(
            Appointment.patient_id == patient.id,
            Appointment.scheduled_at >= now,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
        .order_by(Appointment.scheduled_at)
        .limit(5)
        .all()
    )
    reports = (
        db.query(Report)
        .filter(Report.patient_id == patient.id)
        .order_by(Report.report_date.desc())
        .limit(5)
        .all()
    )
    reminders = (
        db.query(MedicineReminder)
        .filter(MedicineReminder.patient_id == patient.id, MedicineReminder.is_active.is_(True))
        .all()
    )
    vaccinations = (
        db.query(Vaccination)
        .filter(
            Vaccination.patient_id == patient.id,
            Vaccination.status != VaccinationStatus.COMPLETED,
        )
        .order_by(Vaccination.scheduled_date)
        .limit(5)
        .all()
    )
    bmi = round(patient.weight_kg / ((patient.height_cm / 100) ** 2), 1) if patient.height_cm else 0

    vitals_trend = []
    for i in range(6, -1, -1):
        day = date.today() - timedelta(days=i * 5)
        seed = (patient.id + i) % 7
        vitals_trend.append(
            {
                "date": day.strftime("%d %b"),
                "systolic": 118 + seed * 2,
                "diastolic": 76 + seed,
                "pulse": 72 + seed,
                "sugar": 96 + seed * 3,
            }
        )

    return {
        "patient": patient_out(patient).model_dump(),
        "stats": {
            "health_score": patient.health_score,
            "bmi": bmi,
            "upcoming_appointments": len(upcoming),
            "active_reminders": len(reminders),
            "pending_vaccinations": len(vaccinations),
            "total_reports": db.query(Report).filter(Report.patient_id == patient.id).count(),
            "prescriptions": db.query(Prescription)
            .filter(Prescription.patient_id == patient.id)
            .count(),
        },
        "upcoming_appointments": [appointment_out(a).model_dump() for a in upcoming],
        "recent_reports": [report_out(r).model_dump() for r in reports],
        "medicine_reminders": [MedicineReminderOut.model_validate(r).model_dump() for r in reminders],
        "vaccinations_due": [vaccination_out(v, patient.user.full_name).model_dump() for v in vaccinations],
        "vitals_trend": vitals_trend,
    }


@router.get("/health-card")
def health_card(
    db: Session = Depends(get_db), patient: Patient = Depends(get_current_patient)
) -> dict:
    return {
        "health_id": patient.health_id,
        "abha_number": patient.abha_number,
        "full_name": patient.user.full_name,
        "age": age_from_dob(patient.date_of_birth),
        "gender": patient.gender.value,
        "blood_group": patient.blood_group,
        "locality": patient.locality,
        "district": "District",
        "state": "Maharashtra",
        "emergency_contact": {
            "name": patient.emergency_contact_name,
            "phone": patient.emergency_contact_phone,
        },
        "allergies": [a.strip() for a in patient.allergies.split(",") if a.strip()],
        "chronic_conditions": [c.strip() for c in patient.chronic_conditions.split(",") if c.strip()],
        "issued_on": patient.created_at.date().isoformat(),
        "qr_payload": json.dumps(
            {"health_id": patient.health_id, "name": patient.user.full_name, "bg": patient.blood_group}
        ),
    }


@router.get("/medical-history")
def medical_history(
    db: Session = Depends(get_db), patient: Patient = Depends(get_current_patient)
) -> dict:
    appts = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user),
            joinedload(Appointment.hospital),
        )
        .filter(Appointment.patient_id == patient.id)
        .order_by(Appointment.scheduled_at.desc())
        .all()
    )
    prescriptions = (
        db.query(Prescription)
        .options(
            joinedload(Prescription.items),
            joinedload(Prescription.patient).joinedload(Patient.user),
            joinedload(Prescription.doctor).joinedload(Doctor.user),
        )
        .filter(Prescription.patient_id == patient.id)
        .order_by(Prescription.issued_on.desc())
        .all()
    )
    timeline = [
        {
            "type": "appointment",
            "date": a.scheduled_at.date().isoformat(),
            "title": f"Consultation with Dr. {a.doctor.user.full_name}",
            "detail": a.diagnosis or a.reason,
            "status": a.status.value,
        }
        for a in appts
    ] + [
        {
            "type": "prescription",
            "date": p.issued_on.isoformat(),
            "title": f"Prescription — {p.diagnosis or 'General'}",
            "detail": ", ".join(i.medicine_name for i in p.items),
            "status": "issued",
        }
        for p in prescriptions
    ]
    timeline.sort(key=lambda item: item["date"], reverse=True)
    return {
        "patient": patient_out(patient).model_dump(),
        "timeline": timeline,
        "appointments": [appointment_out(a).model_dump() for a in appts],
        "prescriptions": [prescription_out(p).model_dump() for p in prescriptions],
    }


@router.get("/prescriptions", response_model=list[PrescriptionOut])
def my_prescriptions(
    db: Session = Depends(get_db), patient: Patient = Depends(get_current_patient)
) -> list[PrescriptionOut]:
    rows = (
        db.query(Prescription)
        .options(
            joinedload(Prescription.items),
            joinedload(Prescription.patient).joinedload(Patient.user),
            joinedload(Prescription.doctor).joinedload(Doctor.user),
        )
        .filter(Prescription.patient_id == patient.id)
        .order_by(Prescription.issued_on.desc())
        .all()
    )
    return [prescription_out(p) for p in rows]


@router.get("/reports", response_model=list[ReportOut])
def my_reports(
    report_type: str | None = None,
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
) -> list[ReportOut]:
    query = db.query(Report).filter(Report.patient_id == patient.id)
    if report_type:
        query = query.filter(Report.report_type == report_type)
    return [report_out(r) for r in query.order_by(Report.report_date.desc()).all()]


@router.get("/reminders", response_model=list[MedicineReminderOut])
def my_reminders(
    db: Session = Depends(get_db), patient: Patient = Depends(get_current_patient)
) -> list[MedicineReminderOut]:
    rows = (
        db.query(MedicineReminder)
        .filter(MedicineReminder.patient_id == patient.id)
        .order_by(MedicineReminder.is_active.desc(), MedicineReminder.id.desc())
        .all()
    )
    return [MedicineReminderOut.model_validate(r) for r in rows]


@router.post("/reminders", response_model=MedicineReminderOut, status_code=201)
def create_reminder(
    payload: MedicineReminderCreate,
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
) -> MedicineReminderOut:
    reminder = MedicineReminder(
        patient_id=patient.id,
        medicine_name=payload.medicine_name,
        dosage=payload.dosage,
        times_of_day=payload.times_of_day,
        start_date=payload.start_date or date.today(),
        end_date=payload.end_date,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return MedicineReminderOut.model_validate(reminder)


@router.patch("/reminders/{reminder_id}/toggle", response_model=MedicineReminderOut)
def toggle_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
) -> MedicineReminderOut:
    reminder = db.get(MedicineReminder, reminder_id)
    if not reminder or reminder.patient_id != patient.id:
        raise HTTPException(404, "Reminder not found")
    reminder.is_active = not reminder.is_active
    db.commit()
    db.refresh(reminder)
    return MedicineReminderOut.model_validate(reminder)


@router.delete("/reminders/{reminder_id}", response_model=MessageResponse)
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
) -> MessageResponse:
    reminder = db.get(MedicineReminder, reminder_id)
    if not reminder or reminder.patient_id != patient.id:
        raise HTTPException(404, "Reminder not found")
    db.delete(reminder)
    db.commit()
    return MessageResponse(message="Reminder deleted")


@router.get("/vaccinations", response_model=list[VaccinationOut])
def my_vaccinations(
    db: Session = Depends(get_db), patient: Patient = Depends(get_current_patient)
) -> list[VaccinationOut]:
    rows = (
        db.query(Vaccination)
        .filter(Vaccination.patient_id == patient.id)
        .order_by(Vaccination.scheduled_date.desc())
        .all()
    )
    return [vaccination_out(v, patient.user.full_name) for v in rows]


@router.post("/vaccinations/{vaccination_id}/complete", response_model=VaccinationOut)
def complete_vaccination(
    vaccination_id: int,
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
) -> VaccinationOut:
    vac = db.get(Vaccination, vaccination_id)
    if not vac:
        raise HTTPException(404, "Vaccination record not found")
    vac.status = VaccinationStatus.COMPLETED
    vac.administered_date = date.today()
    db.commit()
    db.refresh(vac)
    return vaccination_out(vac, patient.user.full_name)


@router.get("/children", response_model=list[ChildOut])
def my_children(
    db: Session = Depends(get_db), patient: Patient = Depends(get_current_patient)
) -> list[ChildOut]:
    children = db.query(Child).filter(Child.mother_patient_id == patient.id).all()
    result = []
    for child in children:
        due = (
            db.query(Vaccination)
            .filter(
                Vaccination.child_id == child.id,
                Vaccination.status != VaccinationStatus.COMPLETED,
            )
            .count()
        )
        result.append(child_out(child, due))
    return result


@router.get("/children/{child_id}/immunisation", response_model=list[VaccinationOut])
def child_immunisation(
    child_id: int,
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
) -> list[VaccinationOut]:
    child = db.get(Child, child_id)
    if not child or child.mother_patient_id != patient.id:
        raise HTTPException(404, "Child not found")
    rows = (
        db.query(Vaccination)
        .filter(Vaccination.child_id == child_id)
        .order_by(Vaccination.scheduled_date)
        .all()
    )
    return [vaccination_out(v, child.name) for v in rows]


@router.get("/pregnancy", response_model=PregnancyOut | None)
def my_pregnancy(
    db: Session = Depends(get_db), patient: Patient = Depends(get_current_patient)
) -> PregnancyOut | None:
    record = (
        db.query(PregnancyRecord)
        .options(joinedload(PregnancyRecord.patient).joinedload(Patient.user))
        .filter(PregnancyRecord.patient_id == patient.id, PregnancyRecord.delivered.is_(False))
        .order_by(PregnancyRecord.id.desc())
        .first()
    )
    return pregnancy_out(record) if record else None


@router.get("/pregnancy/insights")
def pregnancy_insights(
    db: Session = Depends(get_db), patient: Patient = Depends(get_current_patient)
) -> dict:
    record = (
        db.query(PregnancyRecord)
        .filter(PregnancyRecord.patient_id == patient.id, PregnancyRecord.delivered.is_(False))
        .order_by(PregnancyRecord.id.desc())
        .first()
    )
    if not record:
        return {"has_record": False, "risk_level": "low", "reasons": [], "milestones": []}
    level, reasons = pregnancy_risk(
        record.hemoglobin,
        record.bp_systolic,
        record.bp_diastolic,
        age_from_dob(patient.date_of_birth),
        record.gravida,
        record.anc_visits_completed,
    )
    weeks = max(0, (date.today() - record.lmp_date).days // 7)
    milestones = [
        {"week": 12, "label": "First ANC visit + registration", "done": weeks >= 12},
        {"week": 20, "label": "Anomaly scan + IFA tablets", "done": weeks >= 20},
        {"week": 26, "label": "Second ANC + TT booster", "done": weeks >= 26},
        {"week": 32, "label": "Third ANC + growth scan", "done": weeks >= 32},
        {"week": 36, "label": "Fourth ANC + delivery planning", "done": weeks >= 36},
    ]
    return {
        "has_record": True,
        "gestation_weeks": weeks,
        "edd": record.edd_date.isoformat(),
        "risk_level": level,
        "reasons": reasons,
        "milestones": milestones,
        "anc_visits_completed": record.anc_visits_completed,
    }


@router.get("/nutrition")
def nutrition_plan(patient: Patient = Depends(get_current_patient)) -> dict:
    bmi = round(patient.weight_kg / ((patient.height_cm / 100) ** 2), 1) if patient.height_cm else 22
    if bmi < 18.5:
        band, calories = "Underweight", 2400
    elif bmi < 25:
        band, calories = "Healthy", 2100
    elif bmi < 30:
        band, calories = "Overweight", 1800
    else:
        band, calories = "Obese", 1600
    return {
        "bmi": bmi,
        "band": band,
        "target_calories": calories,
        "macros": {"carbs_g": int(calories * 0.55 / 4), "protein_g": int(calories * 0.2 / 4), "fat_g": int(calories * 0.25 / 9)},
        "meal_plan": [
            {"meal": "Breakfast", "items": "Poha with peanuts, sprouts, 1 glass milk"},
            {"meal": "Mid-morning", "items": "Seasonal fruit (guava / papaya)"},
            {"meal": "Lunch", "items": "2 jowar bhakri, dal, seasonal sabzi, curd"},
            {"meal": "Evening", "items": "Roasted chana, herbal tea"},
            {"meal": "Dinner", "items": "Bajra roti, palak dal, salad"},
        ],
        "tips": [
            "Use iodised salt, limit to 5g/day",
            "Include iron-rich foods — palak, jaggery, ragi",
            "Drink boiled or filtered water during monsoon",
        ],
    }


@router.get("/health-score")
def compute_health_score(
    db: Session = Depends(get_db), patient: Patient = Depends(get_current_patient)
) -> dict:
    bmi = patient.weight_kg / ((patient.height_cm / 100) ** 2) if patient.height_cm else 22
    abnormal = (
        db.query(Report)
        .filter(Report.patient_id == patient.id, Report.is_abnormal.is_(True))
        .count()
    )
    adherence = int(
        db.query(func.avg(MedicineReminder.adherence_percent))
        .filter(MedicineReminder.patient_id == patient.id)
        .scalar()
        or 90
    )
    score = health_score(
        age_from_dob(patient.date_of_birth), bmi, patient.chronic_conditions, abnormal, adherence
    )
    patient.health_score = score
    db.commit()
    return {
        "score": score,
        "bmi": round(bmi, 1),
        "medication_adherence": adherence,
        "abnormal_reports": abnormal,
        "breakdown": [
            {"factor": "Body mass index", "value": round(bmi, 1)},
            {"factor": "Chronic conditions", "value": len([c for c in patient.chronic_conditions.split(",") if c.strip()])},
            {"factor": "Abnormal reports (lifetime)", "value": abnormal},
            {"factor": "Medication adherence %", "value": adherence},
        ],
    }


@router.get("/appointments")
def my_appointments(
    upcoming_only: bool = Query(False),
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
) -> list[dict]:
    query = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user),
            joinedload(Appointment.hospital),
        )
        .filter(Appointment.patient_id == patient.id)
    )
    if upcoming_only:
        query = query.filter(Appointment.scheduled_at >= datetime.now(timezone.utc))
    return [
        appointment_out(a).model_dump()
        for a in query.order_by(Appointment.scheduled_at.desc()).all()
    ]


@router.get("/schemes")
def get_eligible_schemes(
    patient: Patient = Depends(get_current_patient),
) -> dict:
    patient_data = {
        "full_name": patient.user.full_name if patient.user else "Patient",
        "health_id": patient.health_id,
        "abha_number": patient.abha_number,
        "age": age_from_dob(patient.date_of_birth),
        "gender": patient.gender.value if hasattr(patient.gender, "value") else str(patient.gender),
        "locality": patient.locality,
        "chronic_conditions": patient.chronic_conditions,
        "is_pregnant": patient.is_pregnant,
        "health_score": patient.health_score,
    }
    return evaluate_patient_schemes(patient_data)


@router.post("/schemes/check")
def check_custom_schemes(
    payload: dict,
    patient: Patient = Depends(get_current_patient),
) -> dict:
    patient_data = {
        "full_name": payload.get("full_name") or (patient.user.full_name if patient.user else "Patient"),
        "health_id": patient.health_id,
        "abha_number": payload.get("abha_number") or patient.abha_number,
        "age": int(payload.get("age", age_from_dob(patient.date_of_birth))),
        "gender": str(payload.get("gender", patient.gender.value if hasattr(patient.gender, "value") else str(patient.gender))).lower(),
        "locality": str(payload.get("locality", patient.locality)),
        "chronic_conditions": str(payload.get("chronic_conditions", patient.chronic_conditions)),
        "is_pregnant": bool(payload.get("is_pregnant", patient.is_pregnant)),
        "health_score": int(payload.get("health_score", patient.health_score)),
    }
    return evaluate_patient_schemes(patient_data)

