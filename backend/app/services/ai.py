"""Rule-based clinical intelligence engine.

The MVP ships a deterministic, explainable engine (weighted symptom-to-condition
matching + red-flag triage) so demos never depend on an external LLM key. The
public functions mirror the shape an LLM-backed implementation would return.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

CONDITION_RULES: list[dict] = [
    {
        "condition": "Malaria",
        "department": "General Medicine",
        "weight": {"fever": 3, "chills": 3, "headache": 2, "sweating": 2, "body ache": 2, "vomiting": 1},
        "description": "Mosquito-borne infection common in monsoon months across Pune district.",
        "base_triage": "moderate",
    },
    {
        "condition": "Dengue",
        "department": "General Medicine",
        "weight": {"fever": 3, "rash": 3, "joint pain": 3, "headache": 2, "eye pain": 2, "vomiting": 1},
        "description": "Viral fever with severe joint pain; platelet monitoring required.",
        "base_triage": "high",
    },
    {
        "condition": "Upper Respiratory Tract Infection",
        "department": "General Medicine",
        "weight": {"cough": 3, "sore throat": 3, "runny nose": 3, "fever": 1, "sneezing": 2},
        "description": "Common self-limiting viral infection of the nose and throat.",
        "base_triage": "low",
    },
    {
        "condition": "Pulmonary Tuberculosis",
        "department": "Pulmonology",
        "weight": {"cough": 3, "weight loss": 3, "night sweats": 3, "fever": 2, "blood in sputum": 4, "fatigue": 1},
        "description": "Notifiable disease under NTEP; sputum testing at nearest PHC advised.",
        "base_triage": "high",
    },
    {
        "condition": "Acute Gastroenteritis",
        "department": "General Medicine",
        "weight": {"diarrhea": 3, "vomiting": 3, "abdominal pain": 2, "dehydration": 3, "fever": 1},
        "description": "Usually water- or food-borne; ORS and hydration are first-line.",
        "base_triage": "moderate",
    },
    {
        "condition": "Acute Coronary Syndrome",
        "department": "Cardiology",
        "weight": {"chest pain": 4, "shortness of breath": 3, "sweating": 2, "left arm pain": 4, "palpitations": 2},
        "description": "Possible cardiac event — needs immediate ECG and emergency care.",
        "base_triage": "critical",
    },
    {
        "condition": "Hypertension",
        "department": "General Medicine",
        "weight": {"headache": 2, "dizziness": 2, "blurred vision": 2, "palpitations": 2, "nosebleed": 1},
        "description": "Raised blood pressure; needs monitoring and lifestyle correction.",
        "base_triage": "moderate",
    },
    {
        "condition": "Type 2 Diabetes Mellitus",
        "department": "Endocrinology",
        "weight": {"frequent urination": 3, "excessive thirst": 3, "weight loss": 2, "fatigue": 2, "blurred vision": 2},
        "description": "Suggestive of hyperglycaemia; fasting glucose and HbA1c advised.",
        "base_triage": "moderate",
    },
    {
        "condition": "Anaemia",
        "department": "General Medicine",
        "weight": {"fatigue": 3, "pale skin": 3, "dizziness": 2, "shortness of breath": 2, "palpitations": 1},
        "description": "Highly prevalent in women and adolescent girls; haemoglobin test advised.",
        "base_triage": "moderate",
    },
    {
        "condition": "Asthma / Reactive Airway Disease",
        "department": "Pulmonology",
        "weight": {"wheezing": 4, "shortness of breath": 3, "cough": 2, "chest tightness": 3},
        "description": "Airway narrowing often triggered by dust and seasonal change.",
        "base_triage": "high",
    },
    {
        "condition": "Migraine",
        "department": "Neurology",
        "weight": {"headache": 3, "nausea": 2, "light sensitivity": 3, "blurred vision": 2},
        "description": "Recurrent throbbing headache with sensory sensitivity.",
        "base_triage": "low",
    },
    {
        "condition": "Urinary Tract Infection",
        "department": "General Medicine",
        "weight": {"burning urination": 4, "frequent urination": 3, "abdominal pain": 2, "fever": 2},
        "description": "Bacterial infection of the urinary tract; urine culture advised.",
        "base_triage": "moderate",
    },
    {
        "condition": "Pre-eclampsia (pregnancy)",
        "department": "Obstetrics & Gynaecology",
        "weight": {"swelling": 3, "headache": 2, "blurred vision": 3, "abdominal pain": 2, "high bp": 4},
        "description": "Pregnancy-specific hypertensive disorder requiring urgent review.",
        "base_triage": "critical",
    },
    {
        "condition": "Skin Allergy / Dermatitis",
        "department": "Dermatology",
        "weight": {"rash": 3, "itching": 4, "swelling": 2},
        "description": "Contact or seasonal allergic reaction of the skin.",
        "base_triage": "low",
    },
]

RED_FLAGS = {
    "chest pain": "Chest pain can indicate a cardiac emergency.",
    "shortness of breath": "Breathing difficulty needs urgent oxygen assessment.",
    "unconscious": "Loss of consciousness is a medical emergency.",
    "seizure": "Seizure activity requires emergency evaluation.",
    "blood in sputum": "Coughing blood needs same-day medical review.",
    "severe bleeding": "Uncontrolled bleeding requires immediate care.",
    "left arm pain": "Radiating arm pain with chest discomfort suggests cardiac cause.",
    "high bp": "Very high blood pressure needs urgent review.",
    "dehydration": "Dehydration in children and elderly escalates quickly.",
}

TRIAGE_ORDER = ["low", "moderate", "high", "critical"]

SELF_CARE = {
    "low": [
        "Rest and drink 3-4 litres of safe drinking water daily",
        "Take paracetamol 500mg if fever crosses 100°F",
        "Return if symptoms persist beyond 3 days",
    ],
    "moderate": [
        "Book an appointment at your nearest PHC within 24-48 hours",
        "Keep a written log of temperature and symptoms",
        "Avoid self-medicating with antibiotics",
    ],
    "high": [
        "Visit the nearest Community Health Centre or District Hospital today",
        "Carry previous prescriptions and reports",
        "Arrange someone to accompany you",
    ],
    "critical": [
        "Call 108 immediately or use the SOS button in the app",
        "Do not drive yourself to the hospital",
        "Keep the patient calm, seated and warm until help arrives",
    ],
}


@dataclass
class TriageResult:
    triage_level: str
    suggested_department: str
    predicted_conditions: list[dict]
    advice: list[str]
    red_flags: list[str]
    recommended_action: str
    self_care: list[str]


def _normalise(symptoms: list[str]) -> list[str]:
    return [s.strip().lower() for s in symptoms if s and s.strip()]


def analyse_symptoms(
    symptoms: list[str], age: int = 30, gender: str = "other", duration_days: int = 1
) -> TriageResult:
    normalised = _normalise(symptoms)
    scored: list[tuple[float, dict]] = []

    for rule in CONDITION_RULES:
        score = 0.0
        matched = 0
        for symptom in normalised:
            for key, weight in rule["weight"].items():
                if key in symptom or symptom in key:
                    score += weight
                    matched += 1
                    break
        if score > 0:
            coverage = matched / max(len(rule["weight"]), 1)
            scored.append((score * (0.6 + 0.4 * coverage), rule))

    scored.sort(key=lambda item: item[0], reverse=True)
    top = scored[:4]

    max_score = top[0][0] if top else 1.0
    predicted = [
        {
            "condition": rule["condition"],
            "confidence": max(18, min(94, int(round(score / max_score * 88)))),
            "description": rule["description"],
        }
        for score, rule in top
    ]

    triage = "low"
    if top:
        triage = top[0][1]["base_triage"]

    flags = [msg for key, msg in RED_FLAGS.items() if any(key in s for s in normalised)]
    if flags:
        triage = TRIAGE_ORDER[max(TRIAGE_ORDER.index(triage), 2)]
    if any("chest pain" in s for s in normalised) and any(
        "shortness of breath" in s for s in normalised
    ):
        triage = "critical"
    if duration_days >= 7 and triage == "low":
        triage = "moderate"
    if age >= 65 or age <= 5:
        triage = TRIAGE_ORDER[min(TRIAGE_ORDER.index(triage) + 1, 3)]

    department = top[0][1]["department"] if top else "General Medicine"
    if gender == "female" and any("pregnan" in s for s in normalised):
        department = "Obstetrics & Gynaecology"

    advice = [
        f"Symptoms reported for {duration_days} day(s); triage assessed as {triage.upper()}.",
        f"Recommended department: {department}.",
    ]
    if not top:
        advice.append(
            "No strong pattern matched — describe symptoms in more detail or consult a doctor."
        )

    action_map = {
        "low": "Self-care at home with monitoring. Teleconsult if it worsens.",
        "moderate": "Book a consultation at your nearest PHC or Urban Health Centre.",
        "high": "Visit a District Hospital or CHC today for examination and tests.",
        "critical": "Emergency — trigger SOS for a 108 ambulance immediately.",
    }

    return TriageResult(
        triage_level=triage,
        suggested_department=department,
        predicted_conditions=predicted,
        advice=advice,
        red_flags=flags,
        recommended_action=action_map[triage],
        self_care=SELF_CARE[triage],
    )


def health_score(
    age: int,
    bmi: float,
    chronic_conditions: str,
    recent_abnormal_reports: int,
    adherence_percent: int,
) -> int:
    score = 100
    if bmi >= 30:
        score -= 18
    elif bmi >= 25:
        score -= 9
    elif bmi < 18.5:
        score -= 10
    conditions = [c for c in chronic_conditions.split(",") if c.strip()]
    score -= min(24, len(conditions) * 8)
    score -= min(20, recent_abnormal_reports * 5)
    score -= max(0, (90 - adherence_percent) // 5)
    if age >= 60:
        score -= 8
    elif age >= 45:
        score -= 4
    return max(20, min(100, score))


def pregnancy_risk(
    hemoglobin: float, bp_systolic: int, bp_diastolic: int, age: int, gravida: int, anc_visits: int
) -> tuple[str, list[str]]:
    reasons: list[str] = []
    level = 0
    if hemoglobin < 7:
        level = max(level, 3)
        reasons.append(f"Severe anaemia (Hb {hemoglobin} g/dL)")
    elif hemoglobin < 11:
        level = max(level, 1)
        reasons.append(f"Mild/moderate anaemia (Hb {hemoglobin} g/dL)")
    if bp_systolic >= 160 or bp_diastolic >= 110:
        level = max(level, 3)
        reasons.append(f"Severe hypertension ({bp_systolic}/{bp_diastolic} mmHg)")
    elif bp_systolic >= 140 or bp_diastolic >= 90:
        level = max(level, 2)
        reasons.append(f"Raised blood pressure ({bp_systolic}/{bp_diastolic} mmHg)")
    if age >= 35 or age <= 18:
        level = max(level, 1)
        reasons.append(f"Age-related risk ({age} years)")
    if gravida >= 4:
        level = max(level, 1)
        reasons.append(f"Grand multipara (gravida {gravida})")
    if anc_visits < 2:
        level = max(level, 1)
        reasons.append("Fewer than 2 ANC visits completed")
    if not reasons:
        reasons.append("All monitored parameters within normal range")
    return TRIAGE_ORDER[level], reasons


def outbreak_forecast(cases_by_week: dict[str, list[int]], locality: str) -> dict:
    """Simple trend extrapolation used for the district outbreak widget."""
    forecasts = []
    for disease, series in cases_by_week.items():
        if len(series) < 2:
            continue
        recent = series[-1]
        previous = series[-2] or 1
        growth = (recent - previous) / previous
        projected = max(0, int(round(recent * (1 + growth))))
        if growth > 0.4 and recent >= 8:
            risk = "high"
        elif growth > 0.15:
            risk = "moderate"
        else:
            risk = "low"
        forecasts.append(
            {
                "disease": disease,
                "current_cases": recent,
                "projected_next_week": projected,
                "growth_percent": round(growth * 100, 1),
                "risk": risk,
            }
        )
    forecasts.sort(key=lambda f: f["growth_percent"], reverse=True)
    return {"locality": locality, "generated_on": date.today().isoformat(), "forecasts": forecasts}


CHATBOT_RULES: list[tuple[tuple[str, ...], str, list[str]]] = [
    (
        ("fever", "temperature", "taap"),
        "For fever: rest, sip warm fluids, and take paracetamol 500mg every 6 hours if needed. "
        "If fever crosses 3 days, or comes with rash, breathlessness or confusion, get tested for "
        "dengue/malaria at your nearest PHC.",
        ["Book an appointment", "Run the Symptom Checker", "Find nearby PHC"],
    ),
    (
        ("pregnan", "anc", "garbh"),
        "Pregnant mothers should complete at least 4 ANC visits, take IFA tablets daily and get "
        "haemoglobin checked each trimester. Your ASHA worker can register you under the Janani "
        "Suraksha Yojana at the nearest sub-centre.",
        ["Open pregnancy tracker", "Contact my ASHA worker", "ANC checklist"],
    ),
    (
        ("vaccin", "immuni", "tika"),
        "India's universal immunisation schedule covers BCG, OPV, Pentavalent, Rotavirus, MR, and "
        "DPT boosters up to 5 years. Open the vaccination tracker to see exactly which doses are "
        "due for your child.",
        ["Open vaccination tracker", "Find vaccination centre"],
    ),
    (
        ("ambulance", "emergency", "sos", "108"),
        "For emergencies press the red SOS button — SevaSetu dispatches the nearest free 108 "
        "ambulance and shares your live location with the district emergency room.",
        ["Trigger SOS", "See nearest hospital"],
    ),
    (
        ("medicine", "dawa", "tablet", "dose"),
        "Never stop antibiotics midway and never share prescriptions. You can set reminders in the "
        "Medicine Reminders page and check live stock of essential medicines at your PHC.",
        ["Open medicine reminders", "Check medicine stock"],
    ),
    (
        ("diabet", "sugar"),
        "Target fasting sugar is 80-130 mg/dL. Walk 30 minutes daily, avoid sugary drinks, and get "
        "HbA1c tested twice a year. Free screening is available at Urban Health Centres.",
        ["Book screening", "See my reports"],
    ),
    (
        ("bp", "blood pressure", "hypertension"),
        "Normal BP is below 120/80 mmHg. Cut salt to under 5g/day, avoid tobacco, and take "
        "medication at the same time daily. Reading above 140/90 on two occasions needs review.",
        ["Book appointment", "Open health profile"],
    ),
    (
        ("tb", "tuberculosis", "cough"),
        "A cough lasting more than 2 weeks with weight loss or night sweats needs a free sputum TB "
        "test under NTEP. Treatment and Nikshay Poshan Yojana support are free at government PHCs.",
        ["Find nearest PHC", "Run the Symptom Checker"],
    ),
]


def chatbot_reply(message: str) -> tuple[str, list[str]]:
    text = message.lower()
    for keywords, reply, suggestions in CHATBOT_RULES:
        if any(k in text for k in keywords):
            return reply, suggestions
    return (
        "I'm SevaSetu Sahayak, your public-health assistant. I can help with fever, pregnancy care, "
        "child immunisation, medicines, chronic disease advice, and emergencies. Describe your "
        "symptoms or ask about a health scheme.",
        ["Run the Symptom Checker", "Find nearby hospitals", "Book an appointment", "Trigger SOS"],
    )
