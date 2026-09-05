from datetime import date

from app.models import (
    Ambulance,
    Appointment,
    Child,
    Doctor,
    Hospital,
    Patient,
    PregnancyRecord,
    Prescription,
    Referral,
    Report,
    SosRequest,
    Vaccination,
    Visit,
)
from app.schemas import (
    AmbulanceOut,
    AppointmentOut,
    ChildOut,
    DoctorOut,
    HospitalOut,
    PatientOut,
    PregnancyOut,
    PrescriptionOut,
    ReferralOut,
    ReportOut,
    SosOut,
    VaccinationOut,
    VisitOut,
)


def age_from_dob(dob: date) -> int:
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def months_from_dob(dob: date) -> int:
    today = date.today()
    return max(0, (today.year - dob.year) * 12 + today.month - dob.month)


def hospital_out(hospital: Hospital, distance_km: float | None = None) -> HospitalOut:
    data = HospitalOut.model_validate(hospital)
    data.distance_km = distance_km
    return data


def doctor_out(doctor: Doctor) -> DoctorOut:
    data = DoctorOut.model_validate(doctor)
    data.full_name = doctor.user.full_name if doctor.user else ""
    data.hospital_name = doctor.hospital.name if doctor.hospital else None
    return data


def patient_out(patient: Patient) -> PatientOut:
    data = PatientOut.model_validate(patient)
    data.full_name = patient.user.full_name if patient.user else ""
    data.phone = patient.user.phone if patient.user else ""
    data.age = age_from_dob(patient.date_of_birth)
    return data


def appointment_out(appt: Appointment) -> AppointmentOut:
    data = AppointmentOut.model_validate(appt)
    data.patient_name = appt.patient.user.full_name if appt.patient and appt.patient.user else ""
    data.doctor_name = appt.doctor.user.full_name if appt.doctor and appt.doctor.user else ""
    data.specialization = appt.doctor.specialization if appt.doctor else ""
    data.hospital_name = appt.hospital.name if appt.hospital else None
    return data


def prescription_out(pres: Prescription) -> PrescriptionOut:
    data = PrescriptionOut.model_validate(pres)
    data.patient_name = pres.patient.user.full_name if pres.patient and pres.patient.user else ""
    data.doctor_name = pres.doctor.user.full_name if pres.doctor and pres.doctor.user else ""
    return data


def report_out(report: Report) -> ReportOut:
    return ReportOut.model_validate(report)


def visit_out(visit: Visit) -> VisitOut:
    data = VisitOut.model_validate(visit)
    if visit.household:
        data.household_name = visit.household.head_name
        data.locality = visit.household.locality
    return data


def vaccination_out(vac: Vaccination, beneficiary_name: str = "") -> VaccinationOut:
    data = VaccinationOut.model_validate(vac)
    data.beneficiary_name = beneficiary_name
    return data


def child_out(child: Child, vaccinations_due: int = 0) -> ChildOut:
    data = ChildOut.model_validate(child)
    data.age_months = months_from_dob(child.date_of_birth)
    data.vaccinations_due = vaccinations_due
    return data


def pregnancy_out(record: PregnancyRecord) -> PregnancyOut:
    data = PregnancyOut.model_validate(record)
    data.patient_name = (
        record.patient.user.full_name if record.patient and record.patient.user else ""
    )
    gest_days = (date.today() - record.lmp_date).days
    data.gestation_weeks = max(0, min(42, gest_days // 7))
    return data


def referral_out(
    ref: Referral,
    hospital_name: str | None = None,
    doctor_name: str | None = None,
    doctor_specialization: str | None = None,
    referred_by_name: str | None = None,
) -> ReferralOut:
    data = ReferralOut.model_validate(ref)
    if ref.patient:
        if ref.patient.user:
            data.patient_name = ref.patient.user.full_name
        if ref.patient.date_of_birth:
            data.patient_age = age_from_dob(ref.patient.date_of_birth)
        if ref.patient.gender:
            data.patient_gender = (
                ref.patient.gender.value
                if hasattr(ref.patient.gender, "value")
                else str(ref.patient.gender)
            )
        data.patient_health_id = ref.patient.health_id
        data.patient_blood_group = ref.patient.blood_group

    if hospital_name:
        data.to_hospital_name = hospital_name
    elif getattr(ref, "to_hospital", None) and ref.to_hospital:
        data.to_hospital_name = ref.to_hospital.name

    if doctor_name:
        data.to_doctor_name = doctor_name
    elif getattr(ref, "to_doctor", None) and ref.to_doctor and ref.to_doctor.user:
        d_name = ref.to_doctor.user.full_name
        data.to_doctor_name = f"Dr. {d_name}" if not d_name.startswith("Dr.") else d_name

    if doctor_specialization:
        data.to_doctor_specialization = doctor_specialization
    elif getattr(ref, "to_doctor", None) and ref.to_doctor:
        data.to_doctor_specialization = ref.to_doctor.specialization

    if referred_by_name:
        data.referred_by_name = referred_by_name

    return data


def ambulance_out(amb: Ambulance, distance_km: float | None = None) -> AmbulanceOut:
    data = AmbulanceOut.model_validate(amb)
    data.status = amb.status.value if hasattr(amb.status, "value") else str(amb.status)
    data.hospital_name = amb.hospital.name if amb.hospital else None
    data.distance_km = distance_km
    return data


def sos_out(sos: SosRequest) -> SosOut:
    data = SosOut.model_validate(sos)
    data.patient_name = sos.patient.user.full_name if sos.patient and sos.patient.user else ""
    if sos.ambulance:
        data.ambulance_number = sos.ambulance.vehicle_number
        data.ambulance_driver = sos.ambulance.driver_name
        data.ambulance_phone = sos.ambulance.driver_phone
    data.hospital_name = sos.hospital.name if sos.hospital else None
    return data
