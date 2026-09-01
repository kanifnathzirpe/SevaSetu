from datetime import date, datetime, time, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import (
    AmbulanceStatus,
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


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def enum_col(enum_cls, **kwargs):
    return SAEnum(enum_cls, native_enum=False, values_callable=lambda e: [i.value for i in e], **kwargs)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(20), index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(enum_col(UserRole), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(20), default="en")
    locality: Mapped[str | None] = mapped_column(String(120), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="user", uselist=False)
    doctor: Mapped["Doctor"] = relationship(back_populates="user", uselist=False)
    asha: Mapped["AshaWorker"] = relationship(back_populates="user", uselist=False)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Hospital(Base, TimestampMixin):
    __tablename__ = "hospitals"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    facility_type: Mapped[FacilityType] = mapped_column(enum_col(FacilityType), index=True)
    address: Mapped[str] = mapped_column(String(300))
    locality: Mapped[str] = mapped_column(String(120), index=True)
    district: Mapped[str] = mapped_column(String(120), default="District")
    state: Mapped[str] = mapped_column(String(120), default="Maharashtra")
    pincode: Mapped[str] = mapped_column(String(10))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    phone: Mapped[str] = mapped_column(String(20))
    total_beds: Mapped[int] = mapped_column(Integer, default=0)
    available_beds: Mapped[int] = mapped_column(Integer, default=0)
    icu_beds: Mapped[int] = mapped_column(Integer, default=0)
    available_icu_beds: Mapped[int] = mapped_column(Integer, default=0)
    has_emergency: Mapped[bool] = mapped_column(Boolean, default=True)
    has_blood_bank: Mapped[bool] = mapped_column(Boolean, default=False)
    has_vaccination_center: Mapped[bool] = mapped_column(Boolean, default=True)
    rating: Mapped[float] = mapped_column(Float, default=4.0)
    open_24x7: Mapped[bool] = mapped_column(Boolean, default=False)
    services: Mapped[str] = mapped_column(Text, default="")

    doctors: Mapped[list["Doctor"]] = relationship(back_populates="hospital")
    ambulances: Mapped[list["Ambulance"]] = relationship(back_populates="hospital")
    inventory: Mapped[list["InventoryItem"]] = relationship(back_populates="hospital")


class Doctor(Base, TimestampMixin):
    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    hospital_id: Mapped[int | None] = mapped_column(ForeignKey("hospitals.id"), nullable=True)
    specialization: Mapped[str] = mapped_column(String(120), index=True)
    qualification: Mapped[str] = mapped_column(String(160))
    registration_no: Mapped[str] = mapped_column(String(60), unique=True)
    experience_years: Mapped[int] = mapped_column(Integer, default=1)
    consultation_fee: Mapped[int] = mapped_column(Integer, default=0)
    languages: Mapped[str] = mapped_column(String(160), default="Marathi, Hindi, English")
    available_from: Mapped[time] = mapped_column(Time, default=time(9, 0))
    available_to: Mapped[time] = mapped_column(Time, default=time(17, 0))
    is_available_online: Mapped[bool] = mapped_column(Boolean, default=True)
    rating: Mapped[float] = mapped_column(Float, default=4.5)
    bio: Mapped[str] = mapped_column(Text, default="")

    user: Mapped[User] = relationship(back_populates="doctor")
    hospital: Mapped[Hospital | None] = relationship(back_populates="doctors")


class Patient(Base, TimestampMixin):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    health_id: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    date_of_birth: Mapped[date] = mapped_column(Date)
    gender: Mapped[Gender] = mapped_column(enum_col(Gender))
    blood_group: Mapped[str] = mapped_column(String(6), default="O+")
    height_cm: Mapped[float] = mapped_column(Float, default=165)
    weight_kg: Mapped[float] = mapped_column(Float, default=62)
    address: Mapped[str] = mapped_column(String(300), default="")
    locality: Mapped[str] = mapped_column(String(120), index=True)
    pincode: Mapped[str] = mapped_column(String(10), default="411001")
    latitude: Mapped[float] = mapped_column(Float, default=18.5204)
    longitude: Mapped[float] = mapped_column(Float, default=73.8567)
    abha_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    allergies: Mapped[str] = mapped_column(Text, default="")
    chronic_conditions: Mapped[str] = mapped_column(Text, default="")
    emergency_contact_name: Mapped[str] = mapped_column(String(120), default="")
    emergency_contact_phone: Mapped[str] = mapped_column(String(20), default="")
    health_score: Mapped[int] = mapped_column(Integer, default=75)
    risk_level: Mapped[RiskLevel] = mapped_column(enum_col(RiskLevel), default=RiskLevel.LOW)
    asha_worker_id: Mapped[int | None] = mapped_column(ForeignKey("asha_workers.id"), nullable=True)
    is_pregnant: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship(back_populates="patient")
    asha_worker: Mapped["AshaWorker | None"] = relationship(back_populates="patients")


class AshaWorker(Base, TimestampMixin):
    __tablename__ = "asha_workers"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    hospital_id: Mapped[int | None] = mapped_column(ForeignKey("hospitals.id"), nullable=True)
    asha_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    assigned_area: Mapped[str] = mapped_column(String(160), index=True)
    village_or_ward: Mapped[str] = mapped_column(String(160), default="")
    households_count: Mapped[int] = mapped_column(Integer, default=0)
    experience_years: Mapped[int] = mapped_column(Integer, default=2)
    daily_visit_target: Mapped[int] = mapped_column(Integer, default=8)
    supervisor_name: Mapped[str] = mapped_column(String(120), default="")

    user: Mapped[User] = relationship(back_populates="asha")
    patients: Mapped[list[Patient]] = relationship(back_populates="asha_worker")
    households: Mapped[list["Household"]] = relationship(back_populates="asha_worker")


class Household(Base, TimestampMixin):
    __tablename__ = "households"

    id: Mapped[int] = mapped_column(primary_key=True)
    asha_worker_id: Mapped[int] = mapped_column(ForeignKey("asha_workers.id"), index=True)
    household_code: Mapped[str] = mapped_column(String(30), unique=True)
    head_name: Mapped[str] = mapped_column(String(140))
    phone: Mapped[str] = mapped_column(String(20), default="")
    address: Mapped[str] = mapped_column(String(300))
    locality: Mapped[str] = mapped_column(String(120), index=True)
    members_count: Mapped[int] = mapped_column(Integer, default=4)
    latitude: Mapped[float] = mapped_column(Float, default=18.5204)
    longitude: Mapped[float] = mapped_column(Float, default=73.8567)
    has_toilet: Mapped[bool] = mapped_column(Boolean, default=True)
    water_source: Mapped[str] = mapped_column(String(80), default="Municipal tap")
    risk_level: Mapped[RiskLevel] = mapped_column(enum_col(RiskLevel), default=RiskLevel.LOW)
    last_visit_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    asha_worker: Mapped[AshaWorker] = relationship(back_populates="households")
    visits: Mapped[list["Visit"]] = relationship(back_populates="household")


class Visit(Base, TimestampMixin):
    __tablename__ = "visits"

    id: Mapped[int] = mapped_column(primary_key=True)
    asha_worker_id: Mapped[int] = mapped_column(ForeignKey("asha_workers.id"), index=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id"), index=True)
    patient_id: Mapped[int | None] = mapped_column(ForeignKey("patients.id"), nullable=True)
    visit_date: Mapped[date] = mapped_column(Date, index=True)
    purpose: Mapped[str] = mapped_column(String(160))
    status: Mapped[VisitStatus] = mapped_column(enum_col(VisitStatus), default=VisitStatus.PLANNED)
    notes: Mapped[str] = mapped_column(Text, default="")
    bp_systolic: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bp_diastolic: Mapped[int | None] = mapped_column(Integer, nullable=True)
    temperature_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    medicines_given: Mapped[str] = mapped_column(Text, default="")
    synced: Mapped[bool] = mapped_column(Boolean, default=True)

    household: Mapped[Household] = relationship(back_populates="visits")


class Appointment(Base, TimestampMixin):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), index=True)
    hospital_id: Mapped[int | None] = mapped_column(ForeignKey("hospitals.id"), nullable=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    appointment_type: Mapped[AppointmentType] = mapped_column(
        enum_col(AppointmentType), default=AppointmentType.IN_PERSON
    )
    status: Mapped[AppointmentStatus] = mapped_column(
        enum_col(AppointmentStatus), default=AppointmentStatus.SCHEDULED, index=True
    )
    reason: Mapped[str] = mapped_column(String(300), default="")
    token_number: Mapped[int] = mapped_column(Integer, default=1)
    queue_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    diagnosis: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    video_room_id: Mapped[str | None] = mapped_column(String(60), nullable=True)

    patient: Mapped[Patient] = relationship()
    doctor: Mapped[Doctor] = relationship()
    hospital: Mapped[Hospital | None] = relationship()


class Medicine(Base, TimestampMixin):
    __tablename__ = "medicines"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(140), index=True)
    generic_name: Mapped[str] = mapped_column(String(140), default="")
    category: Mapped[str] = mapped_column(String(80), index=True)
    form: Mapped[str] = mapped_column(String(40), default="Tablet")
    strength: Mapped[str] = mapped_column(String(40), default="500mg")
    unit_price: Mapped[float] = mapped_column(Float, default=10.0)
    is_essential: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[str] = mapped_column(Text, default="")


class InventoryItem(Base, TimestampMixin):
    __tablename__ = "inventory_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    hospital_id: Mapped[int] = mapped_column(ForeignKey("hospitals.id"), index=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id"), index=True)
    batch_no: Mapped[str] = mapped_column(String(40), default="")
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    reorder_level: Mapped[int] = mapped_column(Integer, default=50)
    expiry_date: Mapped[date] = mapped_column(Date)

    hospital: Mapped[Hospital] = relationship(back_populates="inventory")
    medicine: Mapped[Medicine] = relationship()


class Prescription(Base, TimestampMixin):
    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), index=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), nullable=True)
    issued_on: Mapped[date] = mapped_column(Date, default=date.today)
    diagnosis: Mapped[str] = mapped_column(String(300), default="")
    advice: Mapped[str] = mapped_column(Text, default="")
    follow_up_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    items: Mapped[list["PrescriptionItem"]] = relationship(
        back_populates="prescription", cascade="all, delete-orphan"
    )
    patient: Mapped[Patient] = relationship()
    doctor: Mapped[Doctor] = relationship()


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    prescription_id: Mapped[int] = mapped_column(
        ForeignKey("prescriptions.id", ondelete="CASCADE"), index=True
    )
    medicine_id: Mapped[int | None] = mapped_column(ForeignKey("medicines.id"), nullable=True)
    medicine_name: Mapped[str] = mapped_column(String(140))
    dosage: Mapped[str] = mapped_column(String(60), default="1-0-1")
    duration_days: Mapped[int] = mapped_column(Integer, default=5)
    instructions: Mapped[str] = mapped_column(String(200), default="After food")

    prescription: Mapped[Prescription] = relationship(back_populates="items")


class Report(Base, TimestampMixin):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    hospital_id: Mapped[int | None] = mapped_column(ForeignKey("hospitals.id"), nullable=True)
    report_type: Mapped[ReportType] = mapped_column(enum_col(ReportType), default=ReportType.LAB)
    title: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str] = mapped_column(Text, default="")
    result_json: Mapped[str] = mapped_column(Text, default="{}")
    file_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    report_date: Mapped[date] = mapped_column(Date, default=date.today)
    is_abnormal: Mapped[bool] = mapped_column(Boolean, default=False)

    patient: Mapped[Patient] = relationship()


class Vaccination(Base, TimestampMixin):
    __tablename__ = "vaccinations"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int | None] = mapped_column(ForeignKey("patients.id"), nullable=True)
    child_id: Mapped[int | None] = mapped_column(ForeignKey("children.id"), nullable=True)
    vaccine_name: Mapped[str] = mapped_column(String(120), index=True)
    dose_label: Mapped[str] = mapped_column(String(60), default="Dose 1")
    scheduled_date: Mapped[date] = mapped_column(Date, index=True)
    administered_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[VaccinationStatus] = mapped_column(
        enum_col(VaccinationStatus), default=VaccinationStatus.DUE, index=True
    )
    center_name: Mapped[str] = mapped_column(String(160), default="")
    hospital_id: Mapped[int | None] = mapped_column(ForeignKey("hospitals.id"), nullable=True)


class Child(Base, TimestampMixin):
    __tablename__ = "children"

    id: Mapped[int] = mapped_column(primary_key=True)
    mother_patient_id: Mapped[int | None] = mapped_column(ForeignKey("patients.id"), nullable=True)
    household_id: Mapped[int | None] = mapped_column(ForeignKey("households.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(140))
    date_of_birth: Mapped[date] = mapped_column(Date)
    gender: Mapped[Gender] = mapped_column(enum_col(Gender), default=Gender.MALE)
    birth_weight_kg: Mapped[float] = mapped_column(Float, default=2.9)
    current_weight_kg: Mapped[float] = mapped_column(Float, default=8.0)
    height_cm: Mapped[float] = mapped_column(Float, default=70)
    nutrition_status: Mapped[str] = mapped_column(String(60), default="Normal")
    locality: Mapped[str] = mapped_column(String(120), default="City")


class PregnancyRecord(Base, TimestampMixin):
    __tablename__ = "pregnancy_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    asha_worker_id: Mapped[int | None] = mapped_column(ForeignKey("asha_workers.id"), nullable=True)
    lmp_date: Mapped[date] = mapped_column(Date)
    edd_date: Mapped[date] = mapped_column(Date)
    gravida: Mapped[int] = mapped_column(Integer, default=1)
    parity: Mapped[int] = mapped_column(Integer, default=0)
    hemoglobin: Mapped[float] = mapped_column(Float, default=11.5)
    bp_systolic: Mapped[int] = mapped_column(Integer, default=118)
    bp_diastolic: Mapped[int] = mapped_column(Integer, default=76)
    weight_kg: Mapped[float] = mapped_column(Float, default=58)
    anc_visits_completed: Mapped[int] = mapped_column(Integer, default=1)
    risk_level: Mapped[RiskLevel] = mapped_column(enum_col(RiskLevel), default=RiskLevel.LOW)
    notes: Mapped[str] = mapped_column(Text, default="")
    delivered: Mapped[bool] = mapped_column(Boolean, default=False)

    patient: Mapped[Patient] = relationship()


class Referral(Base, TimestampMixin):
    __tablename__ = "referrals"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    from_facility: Mapped[str] = mapped_column(String(160), default="")
    to_hospital_id: Mapped[int | None] = mapped_column(ForeignKey("hospitals.id"), nullable=True)
    reason: Mapped[str] = mapped_column(String(300))
    urgency: Mapped[RiskLevel] = mapped_column(enum_col(RiskLevel), default=RiskLevel.MODERATE)
    status: Mapped[ReferralStatus] = mapped_column(
        enum_col(ReferralStatus), default=ReferralStatus.OPEN, index=True
    )
    notes: Mapped[str] = mapped_column(Text, default="")

    patient: Mapped[Patient] = relationship()


class Ambulance(Base, TimestampMixin):
    __tablename__ = "ambulances"

    id: Mapped[int] = mapped_column(primary_key=True)
    vehicle_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    hospital_id: Mapped[int | None] = mapped_column(ForeignKey("hospitals.id"), nullable=True)
    driver_name: Mapped[str] = mapped_column(String(120))
    driver_phone: Mapped[str] = mapped_column(String(20))
    vehicle_type: Mapped[str] = mapped_column(String(40), default="108 Advanced Life Support")
    status: Mapped[AmbulanceStatus] = mapped_column(
        enum_col(AmbulanceStatus), default=AmbulanceStatus.AVAILABLE, index=True
    )
    latitude: Mapped[float] = mapped_column(Float, default=18.5204)
    longitude: Mapped[float] = mapped_column(Float, default=73.8567)
    current_location: Mapped[str] = mapped_column(String(120), default="Shivajinagar")
    has_oxygen: Mapped[bool] = mapped_column(Boolean, default=True)
    has_ventilator: Mapped[bool] = mapped_column(Boolean, default=False)

    hospital: Mapped[Hospital | None] = relationship(back_populates="ambulances")


class SosRequest(Base, TimestampMixin):
    __tablename__ = "sos_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int | None] = mapped_column(ForeignKey("patients.id"), nullable=True)
    raised_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    emergency_type: Mapped[str] = mapped_column(String(80), default="Medical")
    description: Mapped[str] = mapped_column(Text, default="")
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    address: Mapped[str] = mapped_column(String(300), default="")
    status: Mapped[SosStatus] = mapped_column(
        enum_col(SosStatus), default=SosStatus.REQUESTED, index=True
    )
    ambulance_id: Mapped[int | None] = mapped_column(ForeignKey("ambulances.id"), nullable=True)
    hospital_id: Mapped[int | None] = mapped_column(ForeignKey("hospitals.id"), nullable=True)
    eta_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    ambulance: Mapped[Ambulance | None] = relationship()
    hospital: Mapped[Hospital | None] = relationship()
    patient: Mapped[Patient | None] = relationship()


class ChatThread(Base, TimestampMixin):
    __tablename__ = "chat_threads"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject: Mapped[str] = mapped_column(String(200), default="Consultation")
    participant_a_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    participant_b_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    last_message_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="thread", cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[int] = mapped_column(
        ForeignKey("chat_threads.id", ondelete="CASCADE"), index=True
    )
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    body: Mapped[str] = mapped_column(Text)
    attachment_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    thread: Mapped[ChatThread] = relationship(back_populates="messages")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(60), default="general")
    severity: Mapped[str] = mapped_column(String(20), default="info")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    action_url: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class MedicineReminder(Base, TimestampMixin):
    __tablename__ = "medicine_reminders"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    medicine_name: Mapped[str] = mapped_column(String(140))
    dosage: Mapped[str] = mapped_column(String(60), default="1 tablet")
    times_of_day: Mapped[str] = mapped_column(String(120), default="09:00,21:00")
    start_date: Mapped[date] = mapped_column(Date, default=date.today)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    adherence_percent: Mapped[int] = mapped_column(Integer, default=90)


class SymptomCheck(Base):
    __tablename__ = "symptom_checks"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int | None] = mapped_column(ForeignKey("patients.id"), nullable=True)
    symptoms: Mapped[str] = mapped_column(Text)
    age: Mapped[int] = mapped_column(Integer, default=30)
    gender: Mapped[Gender] = mapped_column(enum_col(Gender), default=Gender.MALE)
    duration_days: Mapped[int] = mapped_column(Integer, default=1)
    predicted_conditions: Mapped[str] = mapped_column(Text, default="[]")
    triage_level: Mapped[RiskLevel] = mapped_column(enum_col(RiskLevel), default=RiskLevel.LOW)
    suggested_department: Mapped[str] = mapped_column(String(120), default="General Medicine")
    advice: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class DiseaseCase(Base):
    __tablename__ = "disease_cases"

    id: Mapped[int] = mapped_column(primary_key=True)
    disease: Mapped[str] = mapped_column(String(120), index=True)
    locality: Mapped[str] = mapped_column(String(120), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    case_count: Mapped[int] = mapped_column(Integer, default=1)
    reported_on: Mapped[date] = mapped_column(Date, default=date.today, index=True)
    severity: Mapped[RiskLevel] = mapped_column(enum_col(RiskLevel), default=RiskLevel.LOW)


class BloodBank(Base, TimestampMixin):
    __tablename__ = "blood_banks"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    hospital_id: Mapped[int | None] = mapped_column(ForeignKey("hospitals.id"), nullable=True)
    locality: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20), default="")
    latitude: Mapped[float] = mapped_column(Float, default=18.5204)
    longitude: Mapped[float] = mapped_column(Float, default=73.8567)
    units_a_pos: Mapped[int] = mapped_column(Integer, default=10)
    units_b_pos: Mapped[int] = mapped_column(Integer, default=10)
    units_o_pos: Mapped[int] = mapped_column(Integer, default=10)
    units_ab_pos: Mapped[int] = mapped_column(Integer, default=5)
    units_negative: Mapped[int] = mapped_column(Integer, default=6)


class VideoSession(Base):
    __tablename__ = "video_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), nullable=True)
    doctor_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    patient_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(30), default="waiting")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
