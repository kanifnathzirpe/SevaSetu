"""Voice Assistant Intent Detection and Command Processing Service.

This service provides deterministic intent detection for voice commands,
integrating with existing SevaSetu services to fetch real patient data.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models import (
    Appointment,
    AppointmentStatus,
    Child,
    MedicineReminder,
    Patient,
    Prescription,
    Referral,
    Report,
    Vaccination,
    VaccinationStatus,
)
from app.services.schemes import evaluate_patient_schemes


# Intent constants
class Intent:
    # READ intents
    GET_MEDICATIONS = "GET_MEDICATIONS"
    GET_NEXT_MEDICATION = "GET_NEXT_MEDICATION"
    GET_APPOINTMENTS = "GET_APPOINTMENTS"
    GET_REPORTS = "GET_REPORTS"
    GET_LATEST_REPORT = "GET_LATEST_REPORT"
    GET_REFERRALS = "GET_REFERRALS"
    GET_VACCINATIONS = "GET_VACCINATIONS"
    GET_FAMILY = "GET_FAMILY"
    GET_SCHEMES = "GET_SCHEMES"
    GET_PRESCRIPTIONS = "GET_PRESCRIPTIONS"

    # NAVIGATION intents
    OPEN_DASHBOARD = "OPEN_DASHBOARD"
    OPEN_APPOINTMENTS = "OPEN_APPOINTMENTS"
    OPEN_REPORTS = "OPEN_REPORTS"
    OPEN_REFERRALS = "OPEN_REFERRALS"
    OPEN_PRESCRIPTIONS = "OPEN_PRESCRIPTIONS"
    OPEN_FAMILY = "OPEN_FAMILY"
    OPEN_SCHEMES = "OPEN_SCHEMES"
    OPEN_HEALTH_CARD = "OPEN_HEALTH_CARD"

    # ACTION intents
    BOOK_APPOINTMENT = "BOOK_APPOINTMENT"
    CANCEL_APPOINTMENT = "CANCEL_APPOINTMENT"
    CREATE_REMINDER = "CREATE_REMINDER"

    # EMERGENCY intents
    EMERGENCY_SOS = "EMERGENCY_SOS"

    # GENERAL intents
    GENERAL_HEALTH_QUESTION = "GENERAL_HEALTH_QUESTION"
    UNKNOWN = "UNKNOWN"


# Intent detection patterns - ordered by priority (specific first)
# Includes English, Hindi, Marathi, Bengali, Gujarati, and common transliterations
INTENT_PATTERNS = [
    # EMERGENCY
    (
        Intent.EMERGENCY_SOS,
        [
            "emergency", "sos", "emergency help", "i need emergency help",
            "आपातकाल", "आपातकालीन", "मदद चाहिए", "इमरजेंसी", "एसओएस",
            "आपत्कालीन", "तातडीची मदत", "मदत करा", "इमर्जन्सी",
            "জরুরি", "জরুরী", "সাহায্য", "ইমার্জেন্সি",
            "કટોકટી", "તાત્કાલિક", "મદદ", "ઇમરજન્સી",
        ],
    ),

    # ACTION intents
    (
        Intent.BOOK_APPOINTMENT,
        [
            "book an appointment", "schedule appointment", "new appointment", "make appointment",
            "अपॉइंटमेंट बुक", "बुक अपॉइंटमेंट", "अपॉइंटमेंट लेना", "डॉक्टर से मिलना है",
            "भेट ठरवा", "अपॉइंटमेंट बुक करा", "नवीन अपॉइंटमेंट",
            "অ্যাপয়েন্টমেন্ট বুক", "বুক অ্যাপয়েন্টমেন্ট",
            "એપોઇન્ટમેન્ટ બુક", "બુક એપોઇન્ટમેન્ટ",
        ],
    ),
    (
        Intent.CANCEL_APPOINTMENT,
        [
            "cancel appointment", "cancel my appointment",
            "अपॉइंटमेंट रद्द", "रद्द करें", "रद्द करा", "বাতিল", "રદ",
        ],
    ),
    (
        Intent.CREATE_REMINDER,
        [
            "create a reminder", "set reminder", "add medicine reminder",
            "रिमाइंडर सेट", "रिमाइंडर बनाओ", "रिमाइंडर लावा",
        ],
    ),

    # Navigation - specific keywords to open pages
    (
        Intent.OPEN_REPORTS,
        [
            "open my reports", "show reports page", "go to reports",
            "रिपोर्ट पेज", "रिपोर्ट्स खोलो", "अहवाल पृष्ठ", "अहवाल उघडा",
        ],
    ),
    (
        Intent.OPEN_APPOINTMENTS,
        [
            "open my appointments", "show appointments page", "go to appointments",
            "अपॉइंटमेंट पेज", "अपॉइंटमेंट्स खोलो", "अपॉइंटमेंट पृष्ठ",
        ],
    ),
    (
        Intent.OPEN_PRESCRIPTIONS,
        [
            "open my prescriptions", "show prescriptions page", "go to prescriptions",
            "प्रिस्क्रिप्शन पेज", "पर्चे खोलो", "प्रिस्क्रिप्शन पृष्ठ",
        ],
    ),
    (
        Intent.OPEN_REFERRALS,
        [
            "open my referrals", "show referrals page", "go to referrals",
            "रेफरल पेज", "रेफरल पृष्ठ",
        ],
    ),
    (
        Intent.OPEN_FAMILY,
        [
            "open my family", "show family page", "go to family",
            "परिवार पेज", "कुटुंब पृष्ठ",
        ],
    ),
    (
        Intent.OPEN_SCHEMES,
        [
            "open government schemes", "show schemes page", "go to schemes",
            "योजना पेज", "सरकारी योजना पेज", "शासकीय योजना पृष्ठ",
        ],
    ),
    (
        Intent.OPEN_HEALTH_CARD,
        [
            "open health card", "show health card", "health card",
            "हेल्थ कार्ड", "स्वास्थ्य कार्ड", "आरोग्य कार्ड", "স্বাস্থ্য কার্ড",
        ],
    ),
    (
        Intent.OPEN_DASHBOARD,
        [
            "open dashboard", "go to dashboard", "home",
            "डैशबोर्ड", "मुख्य पृष्ठ", "डॅशबोर्ड", "হোম", "ડેશબોર્ડ",
        ],
    ),

    # READ intents
    (
        Intent.GET_NEXT_MEDICATION,
        [
            "next medicine", "when is my next medicine", "next medication",
            "अगली दवा", "अगली दवाई", "दवा का समय", "पुढील औषध", "पुढचे औषध",
            "পরের ওষুধ", "પછીની દવા",
        ],
    ),
    (
        Intent.GET_MEDICATIONS,
        [
            "what medicines do i take", "my medications", "show my medicines",
            "what medicine", "current medicines", "medicines", "medicine",
            "दवा", "दवाई", "दवाइयां", "दवाएं", "औषध", "औषधे", "माझी औषधे",
            "गोळ्या", "ওষুধ", "ঔষধ", "আমার ওষুধ", "દવા", "દવાઓ", "મારી દવાઓ",
            "dawai", "aushadh", "goli",
        ],
    ),
    (
        Intent.GET_APPOINTMENTS,
        [
            "what is my next appointment", "my appointments", "show my appointments",
            "upcoming appointments", "appointments", "appointment",
            "अपॉइंटमेंट", "मेरी अपॉइंटमेंट", "मुलाकात", "भेट", "माझी भेट", "डॉक्टर भेट",
            "অ্যাপয়েন্টমেন্ট", "আমার অ্যাপয়েন্টমেন্ট",
            "એપોઇન્ટમેન્ટ", "મારી એપોઇન્ટમેન્ટ",
        ],
    ),
    (
        Intent.GET_LATEST_REPORT,
        [
            "latest report", "most recent report", "last report",
            "नवीनतम रिपोर्ट", "आखिरी रिपोर्ट", "शेवटचा अहवाल", "नवीन अहवाल",
            "সর্বশেষ রিপোর্ট", "છેલ્લો રિપોર્ટ",
        ],
    ),
    (
        Intent.GET_REPORTS,
        [
            "show my reports", "my reports", "view reports", "lab reports", "reports", "report",
            "रिपोर्ट", "मेरी रिपोर्ट", "रिपोर्ट्स", "जांच", "टेस्ट रिपोर्ट",
            "अहवाल", "माझे अहवाल", "तपासणी",
            "রিপোর্ট", "আমার রিপোর্ট",
            "રિપોર્ટ", "મારા રિપોર્ટ",
        ],
    ),
    (
        Intent.GET_REFERRALS,
        [
            "what's my referral status", "my referrals", "referral status", "show referrals",
            "referrals", "referral",
            "रेफरल", "मेरा रेफरल", "रेफरल स्थिती", "রেফারাল", "રેફરલ",
        ],
    ),
    (
        Intent.GET_VACCINATIONS,
        [
            "my vaccinations", "show vaccinations", "vaccination status", "due vaccinations",
            "vaccinations", "vaccination", "vaccine",
            "टीका", "टीके", "टीकाकरण", "वैक्सीन", "वैक्सीनेशन",
            "लस", "लसीकरण", "माझी लस",
            "টিকা", "টীকাকরণ", "ভ্যাকসিন",
            "રસી", "રસીકરણ", "વેક્સિન",
        ],
    ),
    (
        Intent.GET_FAMILY,
        [
            "show my family", "my family members", "family list", "family",
            "परिवार", "मेरा परिवार", "बच्चे", "मेरे बच्चे", "परिवार के सदस्य",
            "कुटुंब", "माझे कुटुंब", "कुटुंबातील सदस्य", "मुले",
            "পরিবার", "আমার পরিবার",
            "પરિવાર", "મારો પરિવાર",
        ],
    ),
    (
        Intent.GET_SCHEMES,
        [
            "which government schemes am i eligible for", "government schemes", "eligible schemes",
            "schemes", "scheme",
            "योजना", "योजनाएं", "सरकारी योजना", "सरकारी योजनाएं", "स्कीम",
            "शासकीय योजना", "योजनांची माहिती",
            "প্রকল্প", "সরকারি প্রকল্প", "স্কিম",
            "યોજના", "સરકારી યોજનાઓ", "યોજનાઓ",
        ],
    ),
    (
        Intent.GET_PRESCRIPTIONS,
        [
            "my prescriptions", "show prescriptions", "prescription list",
            "prescriptions", "prescription",
            "पर्चे", "पर्चा", "नुस्खा", "नुस्खे", "प्रिस्क्रिप्शन",
            "माझे प्रिस्क्रिप्शन", "डॉक्टरांचे प्रिस्क्रिप्शन",
            "প্রেসক্রিপশন", "પ્રિસ્ક્રિપ્શન",
        ],
    ),

    # GENERAL
    (
        Intent.GENERAL_HEALTH_QUESTION,
        [
            "what is", "explain", "why do i need", "how does", "what are",
            "क्या है", "समझाओ", "काय आहे", "स्पष्ट करा", "কি", "શું છે",
        ],
    ),
]


def detect_intent(text: str) -> tuple[str, dict[str, Any]]:
    """Detect intent from user text using pattern matching.

    Supports multilingual queries in English, Hindi, Marathi, Bengali, and Gujarati.

    Returns:
        tuple: (intent_name, extracted_parameters)
    """
    text_lower = text.lower().strip()

    # Check each pattern in priority order
    for intent, patterns in INTENT_PATTERNS:
        for pattern in patterns:
            if pattern in text_lower:
                return intent, {}

    # Check for general health questions
    health_keywords = ["what is", "explain", "why do i need", "how does", "what are", "क्या है", "काय आहे"]
    if any(keyword in text_lower for keyword in health_keywords):
        return Intent.GENERAL_HEALTH_QUESTION, {"question": text}

    return Intent.UNKNOWN, {}


def _lang_code(language: str) -> str:
    """Normalize language code to base 2-letter code."""
    if not language:
        return "en"
    code = language.split("-")[0].lower()
    return code if code in ("hi", "mr", "bn", "gu") else "en"


def process_command(
    db: Session,
    patient: Patient,
    intent: str,
    params: dict[str, Any],
    language: str = "en-IN",
) -> dict[str, Any]:
    """Process a voice command and return structured response.

    Args:
        db: Database session
        patient: Authenticated patient
        intent: Detected intent
        params: Extracted parameters
        language: User's preferred language

    Returns:
        dict: Structured response with intent, response_text, speak_text, navigation, etc.
    """
    response = {
        "intent": intent,
        "response_text": "",
        "speak_text": "",
        "navigation": None,
        "action": None,
        "requires_confirmation": False,
        "confirmation_prompt": None,
        "data": None,
    }

    if intent == Intent.GET_MEDICATIONS:
        response.update(_get_medications(db, patient, language))
    elif intent == Intent.GET_NEXT_MEDICATION:
        response.update(_get_medications(db, patient, language))
    elif intent == Intent.GET_APPOINTMENTS:
        response.update(_get_appointments(db, patient, language))
    elif intent == Intent.GET_REPORTS:
        response.update(_get_reports(db, patient, language))
    elif intent == Intent.GET_LATEST_REPORT:
        response.update(_get_reports(db, patient, language))
    elif intent == Intent.GET_REFERRALS:
        response.update(_get_referrals(db, patient, language))
    elif intent == Intent.GET_VACCINATIONS:
        response.update(_get_vaccinations(db, patient, language))
    elif intent == Intent.GET_FAMILY:
        response.update(_get_family(db, patient, language))
    elif intent == Intent.GET_SCHEMES:
        response.update(_get_schemes(db, patient, language))
    elif intent == Intent.GET_PRESCRIPTIONS:
        response.update(_get_prescriptions(db, patient, language))
    elif intent == Intent.OPEN_REPORTS:
        response.update(_navigate_to("reports", language))
    elif intent == Intent.OPEN_APPOINTMENTS:
        response.update(_navigate_to("appointments", language))
    elif intent == Intent.OPEN_PRESCRIPTIONS:
        response.update(_navigate_to("prescriptions", language))
    elif intent == Intent.OPEN_REFERRALS:
        response.update(_navigate_to("referrals", language))
    elif intent == Intent.OPEN_FAMILY:
        response.update(_navigate_to("family", language))
    elif intent == Intent.OPEN_SCHEMES:
        response.update(_navigate_to("schemes", language))
    elif intent == Intent.OPEN_HEALTH_CARD:
        response.update(_navigate_to("health-card", language))
    elif intent == Intent.OPEN_DASHBOARD:
        response.update(_navigate_to("dashboard", language))
    elif intent == Intent.BOOK_APPOINTMENT:
        response.update(_initiate_appointment_booking(language))
    elif intent == Intent.EMERGENCY_SOS:
        response.update(_emergency_sos(language))
    elif intent == Intent.GENERAL_HEALTH_QUESTION:
        response.update(_general_health_question(params.get("question", ""), language))
    elif intent == Intent.UNKNOWN:
        response.update(_unknown_command(language))
    else:
        response.update(_unknown_command(language))

    return response


def _get_medications(db: Session, patient: Patient, language: str) -> dict[str, Any]:
    """Fetch patient's active medicine reminders."""
    reminders = (
        db.query(MedicineReminder)
        .filter(MedicineReminder.patient_id == patient.id, MedicineReminder.is_active.is_(True))
        .all()
    )

    lang = _lang_code(language)

    if not reminders:
        msgs = {
            "hi": "आपका कोई सक्रिय दवा रिमाइंडर नहीं है।",
            "mr": "तुमचे कोणतेही सक्रिय औषध रिमाइंडर नाही.",
            "bn": "আপনার কোনো সক্রিয় ওষুধের অনুস্মারক নেই।",
            "gu": "તમારું કોઈ સક્રિય દવા રીમાઇન્ડર નથી.",
            "en": "You don't have any active medicine reminders.",
        }
        text = msgs[lang]
        return {
            "response_text": text,
            "speak_text": text,
            "data": {"reminders": []},
        }

    if len(reminders) == 1:
        r = reminders[0]
        if lang == "hi":
            text = f"आपका एक सक्रिय दवा रिमाइंडर है: {r.medicine_name} ({r.dosage})।"
        elif lang == "mr":
            text = f"तुमचे एक सक्रिय औषध रिमाइंडर आहे: {r.medicine_name} ({r.dosage})."
        elif lang == "bn":
            text = f"আপনার একটি সক্রিয় ওষুধের অনুস্মারক রয়েছে: {r.medicine_name} ({r.dosage})।"
        elif lang == "gu":
            text = f"તમારું એક સક્રિય દવા રીમાઇન્ડર છે: {r.medicine_name} ({r.dosage})."
        else:
            text = f"You have one active medicine reminder: {r.medicine_name} - {r.dosage}."
    else:
        medicine_names = [f"{r.medicine_name} ({r.dosage})" for r in reminders]
        med_str = ", ".join(medicine_names)
        if lang == "hi":
            text = f"आपके {len(reminders)} सक्रिय दवा रिमाइंडर हैं: {med_str}।"
        elif lang == "mr":
            text = f"तुमची {len(reminders)} सक्रिय औषध रिमाइंडर्स आहेत: {med_str}."
        elif lang == "bn":
            text = f"আপনার {len(reminders)}টি সক্রিয় ওষুধের অনুস্মারক রয়েছে: {med_str}।"
        elif lang == "gu":
            text = f"તમારા {len(reminders)} સક્રિય દવા રીમાઇન્ડર્સ છે: {med_str}."
        else:
            text = f"You have {len(reminders)} active medicine reminders: {med_str}."

    return {
        "response_text": text,
        "speak_text": text,
        "data": {"reminders": [{"name": r.medicine_name, "dosage": r.dosage} for r in reminders]},
    }


def _get_appointments(db: Session, patient: Patient, language: str) -> dict[str, Any]:
    """Fetch patient's upcoming appointments."""
    now = datetime.now(timezone.utc)
    upcoming = (
        db.query(Appointment)
        .filter(
            Appointment.patient_id == patient.id,
            Appointment.scheduled_at >= now,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
        .order_by(Appointment.scheduled_at)
        .first()
    )

    lang = _lang_code(language)

    if not upcoming:
        msgs = {
            "hi": "आपका कोई आगामी अपॉइंटमेंट नहीं है।",
            "mr": "तुमची कोणतीही आगामी अपॉइंटमेंट नाही.",
            "bn": "আপনার কোনো আসন্ন অ্যাপয়েন্টমেন্ট নেই।",
            "gu": "તમારી કોઈ આગામી એપોઇન્ટમેન્ટ નથી.",
            "en": "You don't have any upcoming appointments.",
        }
        text = msgs[lang]
        return {
            "response_text": text,
            "speak_text": text,
            "data": {"appointments": []},
        }

    appt_time = upcoming.scheduled_at.strftime("%B %d at %I:%M %p")
    doc_name = getattr(upcoming, "doctor_name", None) or "Doctor"

    if lang == "hi":
        text = f"आपका अगला अपॉइंटमेंट {appt_time} को {doc_name} के साथ है।"
    elif lang == "mr":
        text = f"तुमची पुढची अपॉइंटमेंट {appt_time} रोजी {doc_name} यांच्यासोबत आहे."
    elif lang == "bn":
        text = f"আপনার পরবর্তী অ্যাপয়েন্টমেন্ট {appt_time} তারিখে {doc_name}-এর সাথে রয়েছে।"
    elif lang == "gu":
        text = f"તમારી આગામી એપોઇન્ટમેન્ટ {appt_time} ના રોજ {doc_name} સાથે છે."
    else:
        text = f"Your next appointment is on {appt_time} with {doc_name}."

    return {
        "response_text": text,
        "speak_text": text,
        "data": {
            "appointments": [
                {
                    "id": upcoming.id,
                    "scheduled_at": upcoming.scheduled_at.isoformat(),
                    "doctor_name": doc_name,
                }
            ]
        },
    }


def _get_reports(db: Session, patient: Patient, language: str) -> dict[str, Any]:
    """Fetch patient's reports."""
    reports = (
        db.query(Report)
        .filter(Report.patient_id == patient.id)
        .order_by(Report.report_date.desc())
        .limit(5)
        .all()
    )

    lang = _lang_code(language)

    if not reports:
        msgs = {
            "hi": "आपके पास अभी तक कोई रिपोर्ट नहीं है।",
            "mr": "तुमचा अद्याप कोणताही अहवाल उपलब्ध नाही.",
            "bn": "আপনার এখনও কোনো রিপোর্ট নেই।",
            "gu": "તમારી પાસે હજી સુધી કોઈ રિપોર્ટ નથી.",
            "en": "You don't have any reports yet.",
        }
        text = msgs[lang]
        return {
            "response_text": text,
            "speak_text": text,
            "data": {"reports": []},
        }

    date_str = reports[0].report_date.strftime("%B %d")
    title = reports[0].title

    if len(reports) == 1:
        if lang == "hi":
            text = f"आपकी एक रिपोर्ट है: {title}, दिनांक {date_str}।"
        elif lang == "mr":
            text = f"तुमचा एक अहवाल उपलब्ध आहे: {title}, तारीख {date_str}."
        elif lang == "bn":
            text = f"আপনার একটি রিপোর্ট রয়েছে: {title}, তারিখ {date_str}।"
        elif lang == "gu":
            text = f"તમારો એક રિપોર્ટ છે: {title}, તારીખ {date_str}."
        else:
            text = f"You have one report: {title} dated {date_str}."
    else:
        if lang == "hi":
            text = f"आपकी {len(reports)} रिपोर्ट उपलब्ध हैं। नवीनतम है: {title} ({date_str})।"
        elif lang == "mr":
            text = f"तुमचे {len(reports)} अहवाल उपलब्ध आहेत. नवीनतम अहवाल: {title} ({date_str})."
        elif lang == "bn":
            text = f"আপনার {len(reports)}টি রিপোর্ট রয়েছে। সর্বশেষ: {title} ({date_str})।"
        elif lang == "gu":
            text = f"તમારા {len(reports)} રિપોર્ટ છે. તાજેતરનો રિપોર્ટ: {title} ({date_str})."
        else:
            text = f"You have {len(reports)} recent reports. Your latest is {title} dated {date_str}."

    return {
        "response_text": text,
        "speak_text": text,
        "data": {
            "reports": [
                {"id": r.id, "title": r.title, "date": r.report_date.isoformat(), "is_abnormal": r.is_abnormal}
                for r in reports
            ]
        },
    }


def _get_referrals(db: Session, patient: Patient, language: str) -> dict[str, Any]:
    """Fetch patient's referrals."""
    referrals = (
        db.query(Referral)
        .filter(Referral.patient_id == patient.id)
        .order_by(Referral.created_at.desc())
        .all()
    )

    lang = _lang_code(language)

    if not referrals:
        msgs = {
            "hi": "आपका कोई रेफरल नहीं है।",
            "mr": "तुमचे कोणतेही रेफरल नाही.",
            "bn": "আপনার কোনো রেফারাল নেই।",
            "gu": "તમારું કોઈ રેફરલ નથી.",
            "en": "You don't have any referrals.",
        }
        text = msgs[lang]
        return {
            "response_text": text,
            "speak_text": text,
            "data": {"referrals": []},
        }

    latest = referrals[0]
    facility = latest.to_hospital_name or "a facility"
    specialty = latest.specialty or "consultation"
    status_val = latest.status.value

    if lang == "hi":
        text = f"आपका नवीनतम रेफरल {facility} के लिए ({specialty}) है। स्थिति: {status_val}।"
    elif lang == "mr":
        text = f"तुमचे नवीनतम रेफरल {facility} येथे ({specialty}) साठी आहे. स्थिती: {status_val}."
    elif lang == "bn":
        text = f"আপনার সর্বশেষ রেফারাল {facility}-এ ({specialty})-এর জন্য। স্থিতি: {status_val}।"
    elif lang == "gu":
        text = f"તમારું તાજેતરનું રેફરલ {facility} ખાતે ({specialty}) માટે છે. સ્થિતિ: {status_val}."
    else:
        text = f"Your latest referral is to {facility} for {specialty}. Status: {status_val}."

    return {
        "response_text": text,
        "speak_text": text,
        "data": {
            "referrals": [
                {
                    "id": latest.id,
                    "to_hospital": latest.to_hospital_name,
                    "specialty": latest.specialty,
                    "status": latest.status.value,
                }
            ]
        },
    }


def _get_vaccinations(db: Session, patient: Patient, language: str) -> dict[str, Any]:
    """Fetch patient's upcoming vaccinations."""
    vaccinations = (
        db.query(Vaccination)
        .filter(
            Vaccination.patient_id == patient.id, Vaccination.status != VaccinationStatus.COMPLETED
        )
        .order_by(Vaccination.scheduled_date)
        .limit(5)
        .all()
    )

    lang = _lang_code(language)

    if not vaccinations:
        msgs = {
            "hi": "आपका कोई आगामी टीकाकरण नहीं है।",
            "mr": "तुमचे कोणतेही आगामी लसीकरण नाही.",
            "bn": "আপনার কোনো আসন্ন টীকাকরণ নেই।",
            "gu": "તમારું કોઈ આગામી રસીકરણ નથી.",
            "en": "You don't have any upcoming vaccinations.",
        }
        text = msgs[lang]
        return {
            "response_text": text,
            "speak_text": text,
            "data": {"vaccinations": []},
        }

    date_str = vaccinations[0].scheduled_date.strftime("%B %d")
    v_name = vaccinations[0].vaccine_name

    if len(vaccinations) == 1:
        if lang == "hi":
            text = f"आपका एक आगामी टीका है: {v_name}, निर्धारित तिथि {date_str}।"
        elif lang == "mr":
            text = f"तुमचे एक आगामी लसीकरण आहे: {v_name}, नियोजित तारीख {date_str}."
        elif lang == "bn":
            text = f"আপনার একটি আসন্ন টীকা রয়েছে: {v_name}, নির্ধারিত তারিখ {date_str}।"
        elif lang == "gu":
            text = f"તમારું એક આગામી રસીકરણ છે: {v_name}, તારીખ {date_str}."
        else:
            text = f"You have one upcoming vaccination: {v_name} scheduled for {date_str}."
    else:
        if lang == "hi":
            text = f"आपके {len(vaccinations)} आगामी टीके हैं। अगला टीका {v_name} ({date_str}) को है।"
        elif lang == "mr":
            text = f"तुमची {len(vaccinations)} आगामी लसीकरणे आहेत. पुढची लस {v_name} ({date_str}) रोजी आहे."
        elif lang == "bn":
            text = f"আপনার {len(vaccinations)}টি আসন্ন টীকা রয়েছে। পরবর্তীটি {v_name} ({date_str}) তারিখে।"
        elif lang == "gu":
            text = f"તમારા {len(vaccinations)} આગામી રસીકરણ છે. પછીની રસી {v_name} ({date_str}) ના રોજ છે."
        else:
            text = f"You have {len(vaccinations)} upcoming vaccinations. The next one is {v_name} on {date_str}."

    return {
        "response_text": text,
        "speak_text": text,
        "data": {
            "vaccinations": [
                {"id": v.id, "vaccine_name": v.vaccine_name, "scheduled_date": v.scheduled_date.isoformat()}
                for v in vaccinations
            ]
        },
    }


def _get_family(db: Session, patient: Patient, language: str) -> dict[str, Any]:
    """Fetch patient's family members (children)."""
    children = db.query(Child).filter(Child.patient_id == patient.id).all()
    lang = _lang_code(language)

    if not children:
        msgs = {
            "hi": "कोई परिवार का सदस्य पंजीकृत नहीं है।",
            "mr": "कुटुंबातील कोणताही सदस्य नोंदणीकृत नाही.",
            "bn": "পরিবারের কোনো সদস্য নিবন্ধিত নেই।",
            "gu": "પરિવારનો કોઈ સભ્ય નોંધાયેલ નથી.",
            "en": "You don't have any family members registered.",
        }
        text = msgs[lang]
        return {
            "response_text": text,
            "speak_text": text,
            "data": {"family": []},
        }

    names = [child.name for child in children]
    names_str = ", ".join(names)

    if lang == "hi":
        text = f"आपके परिवार के {len(children)} सदस्य पंजीकृत हैं: {names_str}।"
    elif lang == "mr":
        text = f"तुमच्या कुटुंबातील {len(children)} सदस्य नोंदणीकृत आहेत: {names_str}."
    elif lang == "bn":
        text = f"আপনার পরিবারের {len(children)} জন সদস্য নিবন্ধিত: {names_str}।"
    elif lang == "gu":
        text = f"તમારા પરિવારના {len(children)} સભ્યો નોંધાયેલા છે: {names_str}."
    else:
        text = f"You have {len(children)} family member(s) registered: {names_str}."

    return {
        "response_text": text,
        "speak_text": text,
        "data": {"family": [{"id": c.id, "name": c.name, "age_months": c.age_months} for c in children]},
    }


def _get_schemes(db: Session, patient: Patient, language: str) -> dict[str, Any]:
    """Fetch government schemes the patient is eligible for."""
    schemes = evaluate_patient_schemes(db, patient)
    lang = _lang_code(language)

    if not schemes:
        msgs = {
            "hi": "आप वर्तमान में किसी सरकारी योजना के लिए पात्र नहीं हैं।",
            "mr": "तुम्ही सध्या कोणत्याही सरकारी योजनेसाठी पात्र नाही.",
            "bn": "আপনি বর্তমানে কোনো সরকারি প্রকল্পের জন্য যোগ্য নন।",
            "gu": "તમે હાલમાં કોઈ સરકારી યોજના માટે પાત્ર નથી.",
            "en": "You are not currently eligible for any government schemes.",
        }
        text = msgs[lang]
        return {
            "response_text": text,
            "speak_text": text,
            "data": {"schemes": []},
        }

    scheme_names = [s.get("name", "Scheme") for s in schemes]
    names_str = ", ".join(scheme_names)

    if lang == "hi":
        text = f"आप {len(schemes)} सरकारी योजनाओं के लिए पात्र हैं: {names_str}।"
    elif lang == "mr":
        text = f"तुम्ही {len(schemes)} सरकारी योजनांसाठी पात्र आहात: {names_str}."
    elif lang == "bn":
        text = f"আপনি {len(schemes)}টি সরকারি প্রকল্পের জন্য যোগ্য: {names_str}।"
    elif lang == "gu":
        text = f"તમે {len(schemes)} સરકારી યોજનાઓ માટે પાત્ર છો: {names_str}."
    else:
        text = f"You are eligible for {len(schemes)} government scheme(s): {names_str}."

    return {
        "response_text": text,
        "speak_text": text,
        "data": {"schemes": schemes},
    }


def _get_prescriptions(db: Session, patient: Patient, language: str) -> dict[str, Any]:
    """Fetch patient's prescriptions."""
    prescriptions = (
        db.query(Prescription)
        .filter(Prescription.patient_id == patient.id)
        .order_by(Prescription.issued_on.desc())
        .limit(5)
        .all()
    )

    lang = _lang_code(language)

    if not prescriptions:
        msgs = {
            "hi": "आपके पास अभी तक कोई नुस्खा (प्रिस्क्रिप्शन) नहीं है।",
            "mr": "तुमच्याकडे अद्याप कोणतेही प्रिस्क्रिप्शन नाही.",
            "bn": "আপনার এখনও কোনো প্রেসক্রিপশন নেই।",
            "gu": "તમારી પાસે હજી સુધી કોઈ પ્રિસ્ક્રિપ્શન નથી.",
            "en": "You don't have any prescriptions yet.",
        }
        text = msgs[lang]
        return {
            "response_text": text,
            "speak_text": text,
            "data": {"prescriptions": []},
        }

    issued_date = prescriptions[0].issued_on.strftime("%B %d")

    if lang == "hi":
        text = f"आपके पास {len(prescriptions)} प्रिस्क्रिप्शन हैं। नवीनतम {issued_date} को जारी किया गया था।"
    elif lang == "mr":
        text = f"तुमच्याकडे {len(prescriptions)} प्रिस्क्रिप्शन आहेत. नवीनतम {issued_date} रोजी जारी केले होते."
    elif lang == "bn":
        text = f"আপনার {len(prescriptions)}টি প্রেসক্রিপশন রয়েছে। সর্বশেষটি {issued_date} তারিখে দেওয়া হয়েছিল।"
    elif lang == "gu":
        text = f"તમારી પાસે {len(prescriptions)} પ્રિસ્ક્રિપ્શન છે. છેલ્લું {issued_date} ના રોજ આપવામાં આવ્યું હતું."
    else:
        text = f"You have {len(prescriptions)} prescription(s). Your latest prescription was issued on {issued_date}."

    return {
        "response_text": text,
        "speak_text": text,
        "data": {
            "prescriptions": [
                {"id": p.id, "issued_on": p.issued_on.isoformat(), "diagnosis": p.diagnosis} for p in prescriptions
            ]
        },
    }


def _navigate_to(page: str, language: str) -> dict[str, Any]:
    """Return navigation response with localized text."""
    lang = _lang_code(language)

    page_names_by_lang = {
        "en": {
            "reports": "Reports", "appointments": "Appointments", "prescriptions": "Prescriptions",
            "referrals": "Referrals", "family": "Family", "schemes": "Government Schemes",
            "health-card": "Health Card", "dashboard": "Dashboard"
        },
        "hi": {
            "reports": "रिपोर्ट्स", "appointments": "अपॉइंटमेंट्स", "prescriptions": "नुस्खे (प्रिस्क्रिप्शन)",
            "referrals": "रेफरल्स", "family": "परिवार", "schemes": "सरकारी योजनाएं",
            "health-card": "हेल्थ कार्ड", "dashboard": "डैशबोर्ड"
        },
        "mr": {
            "reports": "अहवाल", "appointments": "अपॉइंटमेंट्स", "prescriptions": "प्रिस्क्रिप्शन",
            "referrals": "रेफरल्स", "family": "कुटुंब", "schemes": "सरकारी योजना",
            "health-card": "आरोग्य कार्ड", "dashboard": "डॅशबोर्ड"
        },
        "bn": {
            "reports": "রিপোর্ট", "appointments": "অ্যাপয়েন্টমেন্ট", "prescriptions": "প্রেসক্রিপশন",
            "referrals": "রেফারাল", "family": "পরিবার", "schemes": "সরকারি প্রকল্প",
            "health-card": "স্বাস্থ্য কার্ড", "dashboard": "ড্যাশবোর্ড"
        },
        "gu": {
            "reports": "રિપોર્ટ", "appointments": "એપોઇન્ટમેન્ટ", "prescriptions": "પ્રિસ્ક્રિપ્શન",
            "referrals": "રેફરલ", "family": "પરિવાર", "schemes": "સરકારી યોજના",
            "health-card": "હેલ્થ કાર્ડ", "dashboard": "ડેશબોર્ડ"
        },
    }

    display_name = page_names_by_lang.get(lang, page_names_by_lang["en"]).get(page, page)

    if lang == "hi":
        text = f"{display_name} पेज खोला जा रहा है।"
    elif lang == "mr":
        text = f"{display_name} पृष्ठ उघडत आहे."
    elif lang == "bn":
        text = f"{display_name} পৃষ্ঠা খোলা হচ্ছে।"
    elif lang == "gu":
        text = f"{display_name} પેજ ખોલી રહ્યું છે."
    else:
        text = f"Opening {display_name} page."

    return {
        "response_text": text,
        "speak_text": text,
        "navigation": f"/patient/{page}" if page != "dashboard" else "/patient",
    }


def _initiate_appointment_booking(language: str) -> dict[str, Any]:
    """Initiate appointment booking flow with localized prompt."""
    lang = _lang_code(language)
    msgs = {
        "hi": "अपॉइंटमेंट बुक करने के लिए, मुझे कुछ जानकारी चाहिए। आप किस विभाग में जाना चाहते हैं?",
        "mr": "अपॉइंटमेंट बुक करण्यासाठी मला काही माहिती हवी आहे. आपण कोणत्या विभागाला भेट देऊ इच्छिता?",
        "bn": "অ্যাপয়েন্টমেন্ট বুক করার জন্য কিছু তথ্যের প্রয়োজন। আপনি কোন বিভাগে যেতে চান?",
        "gu": "એપોઇન્ટમેન્ટ બુક કરવા માટે મને કેટલીક માહિતીની જરૂર પડશે. તમે કયા વિભાગની મુલાકાત લેવા માંગો છો?",
        "en": "To book an appointment, I'll need some information. Which department would you like to visit?",
    }
    text = msgs[lang]
    return {
        "response_text": text,
        "speak_text": text,
        "action": "BOOK_APPOINTMENT",
        "requires_confirmation": False,
        "next_step": "collect_department",
    }


def _emergency_sos(language: str) -> dict[str, Any]:
    """Handle emergency SOS request with localized prompt."""
    lang = _lang_code(language)
    prompts = {
        "hi": ("यह आपातकालीन एसओएस प्रक्रिया शुरू करेगा। क्या आप जारी रखना चाहते हैं?", "आपातकालीन एसओएस शुरू करें?"),
        "mr": ("यामुळे आपत्कालीन एसओएस प्रक्रिया सुरू होईल. आपण सुरू ठेवू इच्छिता?", "आपत्कालीन एसओएस सुरू करायचे?"),
        "bn": ("এটি জরুরি এসওএস প্রক্রিয়া শুরু করবে। আপনি কি চালিয়ে যেতে চান?", "জরুরি এসওএস শুরু করবেন?"),
        "gu": ("આ કટોકટી એસઓએસ પ્રક્રિયા શરૂ કરશે. શું તમે ચાલુ રાખવા માંગો છો?", "કટોકટી એસઓએસ શરૂ કરીએ?"),
        "en": ("This will start the Emergency SOS process. Do you want to continue?", "Start Emergency SOS?"),
    }
    text, prompt = prompts[lang]
    return {
        "response_text": text,
        "speak_text": text,
        "action": "EMERGENCY_SOS",
        "requires_confirmation": True,
        "confirmation_prompt": prompt,
    }


def _general_health_question(question: str, language: str) -> dict[str, Any]:
    """Handle general health questions with educational responses."""
    question_lower = question.lower()
    lang = _lang_code(language)

    educational_responses = {
        "cbc": "A Complete Blood Count or CBC test measures different parts of your blood including red blood cells, white blood cells, and platelets. It helps diagnose conditions like anemia, infection, and leukemia.",
        "blood pressure": "Blood pressure is the force of blood against your artery walls. It's measured as two numbers - systolic (when heart beats) over diastolic (when heart rests). Normal blood pressure is around 120/80.",
        "blood test": "Blood tests help doctors check for diseases, conditions, and how well your body's organs are working. They can measure enzymes, proteins, and other substances in your blood.",
    }

    for key, response in educational_responses.items():
        if key in question_lower:
            return {
                "response_text": response,
                "speak_text": response,
            }

    disclaimers = {
        "hi": "मैं आपके स्वास्थ्य रिकॉर्ड, अपॉइंटमेंट और नेविगेशन में मदद कर सकता हूँ। विशिष्ट चिकित्सीय सलाह के लिए, कृपया अपने डॉक्टर से परामर्श लें।",
        "mr": "मी तुमच्या आरोग्याच्या नोंदी, अपॉइंटमेंट्स आणि नेव्हिगेशनमध्ये मदत करू शकतो. विशिष्ट वैद्यकीय सल्ल्यासाठी, कृपया तुमच्या डॉक्टरांचा सल्ला घ्या.",
        "bn": "আমি আপনার স্বাস্থ্য রেকর্ড, অ্যাপয়েন্টমেন্ট এবং নেভিগেশনে সাহায্য করতে পারি। নির্দিষ্ট চিকিৎসা সংক্রান্ত পরামর্শের জন্য, আপনার ডাক্তারের সাথে পরামর্শ করুন।",
        "gu": "હું તમારા સ્વાસ્થ્ય રેકોર્ડ, એપોઇન્ટમેન્ટ અને નેવિગેશનમાં મદદ કરી શકું છું. ચોક્કસ તબીબી સલાહ માટે, કૃપા કરીને તમારા ડૉક્ટરની સલાહ લો.",
        "en": "I can help you with your health records, appointments, and navigation. For specific medical advice, please consult your doctor.",
    }
    text = disclaimers[lang]
    return {
        "response_text": text,
        "speak_text": text,
    }


def _unknown_command(language: str) -> dict[str, Any]:
    """Handle unknown commands with localized help message."""
    lang = _lang_code(language)
    msgs = {
        "hi": "मुझे यह समझ नहीं आया। आप मुझसे रिपोर्ट, दवाइयां, अपॉइंटमेंट देखने या पेज खोलने के लिए कह सकते हैं।",
        "mr": "मला समजले नाही. तुम्ही मला तुमचे अहवाल, औषधे, अपॉइंटमेंट पाहण्यासाठी किंवा पृष्ठ उघडण्यासाठी सांगू शकता.",
        "bn": "আমি বুঝতে পারিনি। আপনি আপনার রিপোর্ট, ওষুধ, অ্যাপয়েন্টমেন্ট দেখতে বা পৃষ্ঠা খুলতে বলতে পারেন।",
        "gu": "મને સમજાયું નહીં. તમે મને તમારા રિપોર્ટ, દવાઓ, એપોઇન્ટમેન્ટ જોવા અથવા પેજ ખોલવા માટે કહી શકો છો.",
        "en": "I didn't understand that command. You can ask me to show your reports, medicines, appointments, or navigate to different pages.",
    }
    text = msgs[lang]
    return {
        "response_text": text,
        "speak_text": text,
    }
