from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import (
    DiseaseCase,
    Patient,
    RiskLevel,
    SymptomCheck,
    Report,
    User,
)
from app.schemas import (
    ChatbotRequest,
    ChatbotResponse,
    SymptomCheckRequest,
    SymptomCheckResponse,
)
from app.services.ai import analyse_symptoms, chatbot_reply, outbreak_forecast

router = APIRouter(prefix="/symptoms", tags=["ai"])
ai_router = APIRouter(prefix="/ai", tags=["ai"])

COMMON_SYMPTOMS = [
    "Fever", "Cough", "Headache", "Body ache", "Chills", "Sore throat", "Runny nose",
    "Shortness of breath", "Chest pain", "Wheezing", "Vomiting", "Diarrhea", "Abdominal pain",
    "Dehydration", "Rash", "Itching", "Joint pain", "Night sweats", "Weight loss", "Fatigue",
    "Dizziness", "Blurred vision", "Frequent urination", "Burning urination", "Excessive thirst",
    "Swelling", "Palpitations", "Nausea", "Blood in sputum", "Light sensitivity", "Pale skin",
]


@router.get("/catalog")
def symptom_catalog() -> dict:
    return {
        "symptoms": COMMON_SYMPTOMS,
        "durations": [1, 2, 3, 5, 7, 14, 30],
        "disclaimer": "SevaSetu AI triage supports — never replaces — a qualified medical opinion.",
    }


@router.post("/check", response_model=SymptomCheckResponse)
def check_symptoms(
    payload: SymptomCheckRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SymptomCheckResponse:
    result = analyse_symptoms(
        payload.symptoms, payload.age, payload.gender.value, payload.duration_days
    )
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    db.add(
        SymptomCheck(
            patient_id=patient.id if patient else None,
            symptoms=", ".join(payload.symptoms),
            age=payload.age,
            gender=payload.gender,
            duration_days=payload.duration_days,
            predicted_conditions=str(result.predicted_conditions),
            triage_level=RiskLevel(result.triage_level),
            suggested_department=result.suggested_department,
            advice=" | ".join(result.advice),
        )
    )
    db.commit()
    return SymptomCheckResponse(
        triage_level=RiskLevel(result.triage_level),
        suggested_department=result.suggested_department,
        predicted_conditions=result.predicted_conditions,
        advice=result.advice,
        red_flags=result.red_flags,
        recommended_action=result.recommended_action,
        self_care=result.self_care,
    )


@router.get("/history")
def symptom_history(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict]:
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    if not patient:
        return []
    rows = (
        db.query(SymptomCheck)
        .filter(SymptomCheck.patient_id == patient.id)
        .order_by(SymptomCheck.created_at.desc())
        .limit(30)
        .all()
    )
    return [
        {
            "id": r.id,
            "symptoms": r.symptoms,
            "triage_level": r.triage_level.value,
            "suggested_department": r.suggested_department,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@ai_router.post("/chatbot", response_model=ChatbotResponse)
def chatbot(payload: ChatbotRequest, _: User = Depends(get_current_user)) -> ChatbotResponse:
    reply, suggestions = chatbot_reply(payload.message)
    return ChatbotResponse(reply=reply, suggestions=suggestions)


@ai_router.get("/insights")
def health_insights(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    insights: list[dict] = []
    if patient:
        bmi = patient.weight_kg / ((patient.height_cm / 100) ** 2) if patient.height_cm else 22
        if bmi >= 25:
            insights.append(
                {
                    "title": "Weight management",
                    "severity": "warning",
                    "detail": f"Your BMI is {bmi:.1f}. A 30-minute daily walk and reduced fried food can bring this into the healthy range.",
                }
            )
        if patient.chronic_conditions:
            insights.append(
                {
                    "title": "Chronic condition follow-up",
                    "severity": "info",
                    "detail": f"You are being tracked for {patient.chronic_conditions}. Book a quarterly review at your PHC.",
                }
            )
        abnormal = (
            db.query(Report)
            .filter(Report.patient_id == patient.id, Report.is_abnormal.is_(True))
            .count()
        )
        if abnormal:
            insights.append(
                {
                    "title": "Abnormal lab findings",
                    "severity": "critical" if abnormal > 2 else "warning",
                    "detail": f"{abnormal} report(s) flagged abnormal. Share these with your doctor at the next consultation.",
                }
            )
        if patient.is_pregnant:
            insights.append(
                {
                    "title": "Pregnancy care",
                    "severity": "info",
                    "detail": "Complete all four ANC visits and take IFA tablets daily. Your ASHA worker will visit monthly.",
                }
            )
    if not insights:
        insights.append(
            {
                "title": "You are on track",
                "severity": "success",
                "detail": "No risk factors detected from your current records. Keep up the preventive check-ups.",
            }
        )
    return {"insights": insights, "generated_on": date.today().isoformat()}


@ai_router.get("/outbreak-prediction")
def outbreak_prediction(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    since = date.today() - timedelta(days=28)
    rows = (
        db.query(DiseaseCase.disease, DiseaseCase.reported_on, func.sum(DiseaseCase.case_count))
        .filter(DiseaseCase.reported_on >= since)
        .group_by(DiseaseCase.disease, DiseaseCase.reported_on)
        .all()
    )
    weekly: dict[str, list[int]] = {}
    for disease, reported_on, cases in rows:
        bucket = min(3, (date.today() - reported_on).days // 7)
        series = weekly.setdefault(disease, [0, 0, 0, 0])
        series[3 - bucket] += int(cases)
    return outbreak_forecast(weekly, "District")


@ai_router.get("/risk-prediction")
def risk_prediction(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    if not patient:
        return {"risk_level": "low", "factors": [], "score": 0}
    factors = []
    score = 0
    bmi = patient.weight_kg / ((patient.height_cm / 100) ** 2) if patient.height_cm else 22
    if bmi >= 30:
        score += 25
        factors.append({"factor": "Obesity (BMI ≥ 30)", "weight": 25})
    elif bmi >= 25:
        score += 12
        factors.append({"factor": "Overweight (BMI 25-30)", "weight": 12})
    conditions = [c.strip() for c in patient.chronic_conditions.split(",") if c.strip()]
    for condition in conditions:
        score += 15
        factors.append({"factor": f"Chronic condition: {condition}", "weight": 15})
    if patient.is_pregnant:
        score += 10
        factors.append({"factor": "Active pregnancy monitoring", "weight": 10})
    level = "low" if score < 20 else "moderate" if score < 40 else "high" if score < 60 else "critical"
    return {
        "risk_level": level,
        "score": min(100, score),
        "factors": factors,
        "recommendation": {
            "low": "Continue annual screening at your Urban Health Centre.",
            "moderate": "Schedule a check-up within the next month.",
            "high": "Book a doctor consultation this week and repeat baseline labs.",
            "critical": "Immediate specialist review advised.",
        }[level],
    }


@ai_router.get("/medicine-reminders/suggest")
def suggest_reminders(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict]:
    from app.models import Prescription, PrescriptionItem

    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    if not patient:
        return []
    items = (
        db.query(PrescriptionItem)
        .join(Prescription, PrescriptionItem.prescription_id == Prescription.id)
        .filter(Prescription.patient_id == patient.id)
        .order_by(Prescription.issued_on.desc())
        .limit(10)
        .all()
    )
    suggestions = []
    for item in items:
        slots = {"1-0-1": "09:00,21:00", "1-1-1": "08:00,14:00,20:00", "0-0-1": "21:00", "1-0-0": "08:00"}
        suggestions.append(
            {
                "medicine_name": item.medicine_name,
                "dosage": item.dosage,
                "times_of_day": slots.get(item.dosage, "09:00,21:00"),
                "duration_days": item.duration_days,
                "instructions": item.instructions,
            }
        )
    return suggestions
