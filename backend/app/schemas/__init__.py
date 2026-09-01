from datetime import date, datetime, time
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import (
    AppointmentStatus,
    AppointmentType,
    FacilityType,
    Gender,
    ReferralStatus,
    ReportType,
    RiskLevel,
    SosStatus,
    UserRole,
    VaccinationStatus,
    VisitStatus,
)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------- auth
class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=15)
    password: str = Field(min_length=6, max_length=72)
    role: UserRole = UserRole.PATIENT
    locality: str | None = None
    date_of_birth: date | None = None
    gender: Gender = Gender.OTHER


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(ORMModel):
    id: int
    full_name: str
    email: EmailStr
    phone: str
    role: UserRole
    is_active: bool
    locality: str | None = None
    avatar_url: str | None = None
    preferred_language: str
    created_at: datetime


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserOut


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    locality: str | None = None
    preferred_language: str | None = None
    avatar_url: str | None = None


# ---------------------------------------------------------------- hospital / doctor
class HospitalOut(ORMModel):
    id: int
    name: str
    facility_type: FacilityType
    address: str
    locality: str
    district: str
    pincode: str
    latitude: float
    longitude: float
    phone: str
    total_beds: int
    available_beds: int
    icu_beds: int
    available_icu_beds: int
    has_emergency: bool
    has_blood_bank: bool
    has_vaccination_center: bool
    open_24x7: bool
    rating: float
    services: str
    distance_km: float | None = None


class DoctorOut(ORMModel):
    id: int
    full_name: str = ""
    specialization: str
    qualification: str
    registration_no: str
    experience_years: int
    consultation_fee: int
    languages: str
    available_from: time
    available_to: time
    is_available_online: bool
    rating: float
    bio: str
    hospital_id: int | None = None
    hospital_name: str | None = None


# ---------------------------------------------------------------- patient
class PatientOut(ORMModel):
    id: int
    user_id: int
    full_name: str = ""
    phone: str = ""
    health_id: str
    date_of_birth: date
    age: int = 0
    gender: Gender
    blood_group: str
    height_cm: float
    weight_kg: float
    address: str
    locality: str
    pincode: str
    latitude: float
    longitude: float
    abha_number: str | None = None
    allergies: str
    chronic_conditions: str
    emergency_contact_name: str
    emergency_contact_phone: str
    health_score: int
    risk_level: RiskLevel
    is_pregnant: bool


class PatientProfileUpdate(BaseModel):
    blood_group: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    address: str | None = None
    locality: str | None = None
    pincode: str | None = None
    allergies: str | None = None
    chronic_conditions: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    latitude: float | None = None
    longitude: float | None = None


# ---------------------------------------------------------------- appointments
class AppointmentCreate(BaseModel):
    doctor_id: int
    scheduled_at: datetime
    appointment_type: AppointmentType = AppointmentType.IN_PERSON
    reason: str = ""
    patient_id: int | None = None


class AppointmentUpdate(BaseModel):
    status: AppointmentStatus | None = None
    scheduled_at: datetime | None = None
    diagnosis: str | None = None
    notes: str | None = None
    queue_position: int | None = None


class AppointmentOut(ORMModel):
    id: int
    patient_id: int
    doctor_id: int
    hospital_id: int | None = None
    patient_name: str = ""
    doctor_name: str = ""
    hospital_name: str | None = None
    specialization: str = ""
    scheduled_at: datetime
    appointment_type: AppointmentType
    status: AppointmentStatus
    reason: str
    token_number: int
    queue_position: int | None = None
    diagnosis: str
    notes: str
    video_room_id: str | None = None


# ---------------------------------------------------------------- prescriptions / reports
class PrescriptionItemIn(BaseModel):
    medicine_id: int | None = None
    medicine_name: str
    dosage: str = "1-0-1"
    duration_days: int = 5
    instructions: str = "After food"


class PrescriptionItemOut(ORMModel):
    id: int
    medicine_name: str
    dosage: str
    duration_days: int
    instructions: str


class PrescriptionCreate(BaseModel):
    patient_id: int
    appointment_id: int | None = None
    diagnosis: str = ""
    advice: str = ""
    follow_up_date: date | None = None
    items: list[PrescriptionItemIn] = []


class PrescriptionOut(ORMModel):
    id: int
    patient_id: int
    doctor_id: int
    patient_name: str = ""
    doctor_name: str = ""
    issued_on: date
    diagnosis: str
    advice: str
    follow_up_date: date | None = None
    items: list[PrescriptionItemOut] = []


class ReportCreate(BaseModel):
    patient_id: int
    report_type: ReportType = ReportType.LAB
    title: str
    summary: str = ""
    result_json: str = "{}"
    report_date: date | None = None
    is_abnormal: bool = False


class ReportOut(ORMModel):
    id: int
    patient_id: int
    patient_name: str = ""
    report_type: ReportType
    title: str
    summary: str
    result_json: str
    file_url: str | None = None
    report_date: date
    is_abnormal: bool
    doctor_name: str | None = None
    hospital_name: str | None = None


class MedicineOut(ORMModel):
    id: int
    name: str
    generic_name: str
    category: str
    form: str
    strength: str
    unit_price: float
    is_essential: bool
    description: str


class MedicineReminderCreate(BaseModel):
    medicine_name: str
    dosage: str = "1 tablet"
    times_of_day: str = "09:00,21:00"
    start_date: date | None = None
    end_date: date | None = None


class MedicineReminderOut(ORMModel):
    id: int
    medicine_name: str
    dosage: str
    times_of_day: str
    start_date: date
    end_date: date | None = None
    is_active: bool
    adherence_percent: int


class VaccinationOut(ORMModel):
    id: int
    vaccine_name: str
    dose_label: str
    scheduled_date: date
    administered_date: date | None = None
    status: VaccinationStatus
    center_name: str
    patient_id: int | None = None
    child_id: int | None = None
    beneficiary_name: str = ""


class ChildOut(ORMModel):
    id: int
    name: str
    date_of_birth: date
    gender: Gender
    birth_weight_kg: float
    current_weight_kg: float
    height_cm: float
    nutrition_status: str
    locality: str
    age_months: int = 0
    vaccinations_due: int = 0


class PregnancyOut(ORMModel):
    id: int
    patient_id: int
    patient_name: str = ""
    lmp_date: date
    edd_date: date
    gestation_weeks: int = 0
    gravida: int
    parity: int
    hemoglobin: float
    bp_systolic: int
    bp_diastolic: int
    weight_kg: float
    anc_visits_completed: int
    risk_level: RiskLevel
    notes: str
    delivered: bool


# ---------------------------------------------------------------- ASHA
class HouseholdOut(ORMModel):
    id: int
    household_code: str
    head_name: str
    phone: str
    address: str
    locality: str
    members_count: int
    latitude: float
    longitude: float
    has_toilet: bool
    water_source: str
    risk_level: RiskLevel
    last_visit_date: date | None = None


class HouseholdSurvey(BaseModel):
    members_count: int | None = None
    has_toilet: bool | None = None
    water_source: str | None = None
    risk_level: RiskLevel | None = None
    notes: str = ""


class VisitCreate(BaseModel):
    household_id: int
    patient_id: int | None = None
    visit_date: date
    purpose: str
    notes: str = ""
    bp_systolic: int | None = None
    bp_diastolic: int | None = None
    temperature_c: float | None = None
    weight_kg: float | None = None
    medicines_given: str = ""
    status: VisitStatus = VisitStatus.PLANNED


class VisitOut(ORMModel):
    id: int
    household_id: int
    household_name: str = ""
    locality: str = ""
    patient_id: int | None = None
    visit_date: date
    purpose: str
    status: VisitStatus
    notes: str
    bp_systolic: int | None = None
    bp_diastolic: int | None = None
    temperature_c: float | None = None
    weight_kg: float | None = None
    medicines_given: str
    synced: bool


class ReferralCreate(BaseModel):
    patient_id: int
    to_hospital_id: int | None = None
    reason: str
    urgency: RiskLevel = RiskLevel.MODERATE
    notes: str = ""


class ReferralOut(ORMModel):
    id: int
    patient_id: int
    patient_name: str = ""
    from_facility: str
    to_hospital_id: int | None = None
    to_hospital_name: str | None = None
    reason: str
    urgency: RiskLevel
    status: ReferralStatus
    notes: str
    created_at: datetime


# ---------------------------------------------------------------- emergency
class SosCreate(BaseModel):
    emergency_type: str = "Medical"
    description: str = ""
    latitude: float = 18.5204
    longitude: float = 73.8567
    address: str = ""


class SosOut(ORMModel):
    id: int
    patient_id: int | None = None
    patient_name: str = ""
    emergency_type: str
    description: str
    latitude: float
    longitude: float
    address: str
    status: SosStatus
    eta_minutes: int | None = None
    ambulance_number: str | None = None
    ambulance_driver: str | None = None
    ambulance_phone: str | None = None
    hospital_name: str | None = None
    created_at: datetime


class SosStatusUpdate(BaseModel):
    status: SosStatus


class AmbulanceOut(ORMModel):
    id: int
    vehicle_number: str
    driver_name: str
    driver_phone: str
    vehicle_type: str
    status: str
    latitude: float
    longitude: float
    current_location: str
    has_oxygen: bool
    has_ventilator: bool
    hospital_name: str | None = None
    distance_km: float | None = None


# ---------------------------------------------------------------- chat / video
class ChatThreadOut(ORMModel):
    id: int
    subject: str
    participant_a_id: int
    participant_b_id: int
    other_party_name: str = ""
    other_party_role: str = ""
    last_message: str = ""
    last_message_at: datetime
    unread_count: int = 0


class ChatMessageOut(ORMModel):
    id: int
    thread_id: int
    sender_id: int
    sender_name: str = ""
    body: str
    attachment_url: str | None = None
    is_read: bool
    created_at: datetime


class ChatMessageCreate(BaseModel):
    body: str = Field(min_length=1)
    attachment_url: str | None = None


class ChatThreadCreate(BaseModel):
    participant_id: int
    subject: str = "Consultation"


class VideoSessionOut(ORMModel):
    id: int
    room_id: str
    appointment_id: int | None = None
    doctor_user_id: int
    patient_user_id: int
    status: str
    doctor_name: str = ""
    patient_name: str = ""
    ice_servers: list[dict[str, Any]] = []


class VideoSessionCreate(BaseModel):
    appointment_id: int


# ---------------------------------------------------------------- AI
class SymptomCheckRequest(BaseModel):
    symptoms: list[str] = Field(min_length=1)
    age: int = 30
    gender: Gender = Gender.OTHER
    duration_days: int = 1
    additional_notes: str = ""


class PredictedCondition(BaseModel):
    condition: str
    confidence: int
    description: str


class SymptomCheckResponse(BaseModel):
    triage_level: RiskLevel
    suggested_department: str
    predicted_conditions: list[PredictedCondition]
    advice: list[str]
    red_flags: list[str]
    recommended_action: str
    self_care: list[str]


class ChatbotRequest(BaseModel):
    message: str
    history: list[dict[str, str]] = []


class ChatbotResponse(BaseModel):
    reply: str
    suggestions: list[str] = []


class NotificationOut(ORMModel):
    id: int
    title: str
    body: str
    category: str
    severity: str
    is_read: bool
    action_url: str | None = None
    created_at: datetime


class MessageResponse(BaseModel):
    message: str
    success: bool = True
