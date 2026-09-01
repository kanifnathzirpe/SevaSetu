from enum import Enum


class UserRole(str, Enum):
    PATIENT = "patient"
    ASHA = "asha"
    DOCTOR = "doctor"
    HOSPITAL_ADMIN = "hospital_admin"
    DHO = "dho"
    EMERGENCY = "emergency"


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class FacilityType(str, Enum):
    PHC = "phc"
    SUB_CENTER = "sub_center"
    DISTRICT_HOSPITAL = "district_hospital"
    URBAN_HEALTH_CENTER = "urban_health_center"
    COMMUNITY_HEALTH_CENTER = "community_health_center"


class AppointmentType(str, Enum):
    IN_PERSON = "in_person"
    VIDEO = "video"
    HOME_VISIT = "home_visit"


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CHECKED_IN = "checked_in"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SosStatus(str, Enum):
    REQUESTED = "requested"
    DISPATCHED = "dispatched"
    EN_ROUTE = "en_route"
    ARRIVED = "arrived"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AmbulanceStatus(str, Enum):
    AVAILABLE = "available"
    ON_DUTY = "on_duty"
    MAINTENANCE = "maintenance"


class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class VisitStatus(str, Enum):
    PLANNED = "planned"
    COMPLETED = "completed"
    MISSED = "missed"


class VaccinationStatus(str, Enum):
    DUE = "due"
    COMPLETED = "completed"
    OVERDUE = "overdue"


class ReferralStatus(str, Enum):
    OPEN = "open"
    ACCEPTED = "accepted"
    CLOSED = "closed"


class ReportType(str, Enum):
    LAB = "lab"
    RADIOLOGY = "radiology"
    DISCHARGE = "discharge"
    PRESCRIPTION = "prescription"
