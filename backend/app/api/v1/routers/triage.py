import json
from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import (
    Appointment,
    Gender,
    Patient,
    Referral,
    Report,
    ReportType,
    RiskLevel,
    SosRequest,
    SymptomCheck,
    User,
    UserRole,
)

router = APIRouter(prefix="/triage", tags=["triage"])


class TriageSessionCreate(BaseModel):
    session_id: str
    patient_health_id: str | None = None
    level: str  # EMERGENCY, URGENT, ROUTINE
    score: int = 50
    symptoms: list[str] = []
    free_text_symptoms: str = ""
    vitals: dict[str, Any] = {}
    triggers: list[dict[str, Any]] = []
    explanation: str = ""
    suggested_department: str = "General Medicine"
    recommended_actions: list[str] = []
    branch_type: str = "routine_booking"
    appointment_id: int | None = None
    referral_id: int | None = None
    sos_id: int | None = None
    referral_note: str | None = None


def _map_risk_level(level_str: str) -> RiskLevel:
    norm = level_str.strip().upper()
    if norm == "EMERGENCY":
        return RiskLevel.CRITICAL
    if norm == "URGENT":
        return RiskLevel.HIGH
    return RiskLevel.LOW


@router.post("/sessions", status_code=201)
def record_triage_session(
    payload: TriageSessionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    patient: Patient | None = None
    if user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    elif payload.patient_health_id:
        patient = db.query(Patient).filter(Patient.health_id == payload.patient_health_id).first()

    if not patient:
        # Fallback to any patient linked or create virtual reference
        patient = db.query(Patient).first()

    risk_enum = _map_risk_level(payload.level)
    details_payload = {
        "session_id": payload.session_id,
        "level": payload.level.upper(),
        "score": payload.score,
        "vitals": payload.vitals,
        "symptoms": payload.symptoms,
        "free_text": payload.free_text_symptoms,
        "triggers": payload.triggers,
        "explanation": payload.explanation,
        "branch_type": payload.branch_type,
        "appointment_id": payload.appointment_id,
        "referral_id": payload.referral_id,
        "sos_id": payload.sos_id,
        "referral_note": payload.referral_note,
        "suggested_department": payload.suggested_department,
    }
    details_json = json.dumps(details_payload)

    # 1. Store in symptom_checks table
    symptom_summary = ", ".join(payload.symptoms)
    if payload.free_text_symptoms:
        symptom_summary = f"{symptom_summary} (Notes: {payload.free_text_symptoms[:100]})" if symptom_summary else payload.free_text_symptoms[:120]

    symptom_check = SymptomCheck(
        patient_id=patient.id if patient else None,
        symptoms=symptom_summary or "Digital Triage Assessment",
        age=patient.age if patient else 30,
        gender=patient.user.gender if hasattr(patient, "user") and hasattr(patient.user, "gender") and patient.user.gender else Gender.MALE,
        duration_days=1,
        predicted_conditions=details_json,
        triage_level=risk_enum,
        suggested_department=payload.suggested_department,
        advice=payload.explanation or "Digital Triage Clinical Evaluation",
    )
    db.add(symptom_check)

    # 2. Add as a Diagnostic / Clinical Report
    report = Report(
        patient_id=patient.id if patient else 1,
        report_type=ReportType.TRIAGE,
        title=f"Digital Triage Assessment — {payload.level.upper()}",
        summary=payload.explanation or f"Triage level {payload.level.upper()} evaluated via protocol.",
        result_json=details_json,
        report_date=date.today(),
        is_abnormal=payload.level.upper() in ["EMERGENCY", "URGENT"],
    )
    db.add(report)

    db.commit()
    db.refresh(symptom_check)

    return {
        "status": "success",
        "session_id": payload.session_id,
        "check_id": symptom_check.id,
        "report_id": report.id,
        "triage_level": payload.level.upper(),
        "created_at": symptom_check.created_at.isoformat(),
        "message": "Triage session successfully recorded and synced.",
    }


@router.get("/sessions")
def list_triage_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    if not patient:
        return []

    records = (
        db.query(SymptomCheck)
        .filter(SymptomCheck.patient_id == patient.id)
        .order_by(SymptomCheck.created_at.desc())
        .limit(50)
        .all()
    )

    results = []
    for r in records:
        details = {}
        try:
            details = json.loads(r.predicted_conditions) if r.predicted_conditions else {}
        except Exception:
            details = {}

        results.append({
            "id": details.get("session_id") or f"chk-{r.id}",
            "check_id": r.id,
            "patient_id": r.patient_id,
            "symptoms": r.symptoms,
            "level": details.get("level") or r.triage_level.value.upper(),
            "explanation": details.get("explanation") or r.advice,
            "suggested_department": r.suggested_department,
            "vitals": details.get("vitals", {}),
            "triggers": details.get("triggers", []),
            "appointment_id": details.get("appointment_id"),
            "referral_id": details.get("referral_id"),
            "sos_id": details.get("sos_id"),
            "created_at": r.created_at.isoformat(),
            "sync_status": "synced",
        })

    return results
