"""Seed the SevaSetu AI database with realistic Pune district data.

Run with:  python -m app.db.seed        (drops and recreates all tables)
"""

from __future__ import annotations

import json
import random
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.pune_data import (
    ALLERGIES,
    APPOINTMENT_REASONS,
    CHRONIC_CONDITIONS,
    DISEASES,
    FIRST_NAMES_F,
    FIRST_NAMES_M,
    HOSPITALS,
    LAB_PANELS,
    LOCALITIES,
    MEDICINES,
    SPECIALIZATIONS,
    SURNAMES,
    VACCINES_ADULT,
    VACCINES_CHILD,
    WATER_SOURCES,
)
from app.db.session import Base, SessionLocal, engine
from app.models import (
    Ambulance,
    AmbulanceStatus,
    Appointment,
    AppointmentStatus,
    AppointmentType,
    AshaWorker,
    BloodBank,
    ChatMessage,
    ChatThread,
    Child,
    DiseaseCase,
    Doctor,
    FacilityType,
    Gender,
    Hospital,
    Household,
    InventoryItem,
    Medicine,
    MedicineReminder,
    Notification,
    Patient,
    PregnancyRecord,
    Prescription,
    PrescriptionItem,
    Referral,
    ReferralStatus,
    Report,
    ReportType,
    RiskLevel,
    SosRequest,
    SosStatus,
    User,
    UserRole,
    Vaccination,
    VaccinationStatus,
    Visit,
    VisitStatus,
)

random.seed(2026)

DEMO_PASSWORD = "Seva@1234"
TODAY = date.today()


def jitter(value: float, spread: float = 0.012) -> float:
    return round(value + random.uniform(-spread, spread), 6)


def phone() -> str:
    return f"9{random.randint(100000000, 999999999)}"


def person_name(gender: Gender) -> str:
    first = random.choice(FIRST_NAMES_F if gender == Gender.FEMALE else FIRST_NAMES_M)
    return f"{first} {random.choice(SURNAMES)}"


def make_user(
    db: Session,
    full_name: str,
    email: str,
    role: UserRole,
    locality: str,
    password: str = DEMO_PASSWORD,
) -> User:
    user = User(
        full_name=full_name,
        email=email,
        phone=phone(),
        hashed_password=hash_password(password),
        role=role,
        locality=locality,
        preferred_language=random.choice(["en", "mr", "hi"]),
    )
    db.add(user)
    return user


def seed_hospitals(db: Session) -> list[Hospital]:
    loc_map = {loc["name"]: loc for loc in LOCALITIES}
    hospitals: list[Hospital] = []
    for spec in HOSPITALS:
        loc = loc_map[spec["locality"]]
        total = spec["total_beds"]
        icu = spec["icu_beds"]
        hospital = Hospital(
            name=spec["name"],
            facility_type=FacilityType(spec["facility_type"]),
            address=spec["address"],
            locality=spec["locality"],
            pincode=loc["pincode"],
            latitude=jitter(loc["lat"], 0.004),
            longitude=jitter(loc["lng"], 0.004),
            phone=spec["phone"],
            total_beds=total,
            available_beds=int(total * random.uniform(0.12, 0.42)),
            icu_beds=icu,
            available_icu_beds=int(icu * random.uniform(0.1, 0.5)),
            has_emergency=spec.get("has_emergency", True),
            has_blood_bank=spec.get("has_blood_bank", False),
            has_vaccination_center=True,
            open_24x7=spec.get("open_24x7", False),
            rating=spec["rating"],
            services=spec["services"],
        )
        db.add(hospital)
        hospitals.append(hospital)
    db.flush()
    return hospitals


def seed_blood_banks(db: Session, hospitals: list[Hospital]) -> None:
    for hospital in [h for h in hospitals if h.has_blood_bank]:
        db.add(
            BloodBank(
                name=f"{hospital.name} Blood Bank",
                hospital_id=hospital.id,
                locality=hospital.locality,
                phone=hospital.phone,
                latitude=hospital.latitude,
                longitude=hospital.longitude,
                units_a_pos=random.randint(8, 45),
                units_b_pos=random.randint(8, 45),
                units_o_pos=random.randint(10, 60),
                units_ab_pos=random.randint(3, 18),
                units_negative=random.randint(4, 20),
            )
        )
    db.add(
        BloodBank(
            name="Janakalyan Blood Bank, Erandwane",
            locality="Pune City",
            phone="020-25457777",
            latitude=18.5089,
            longitude=73.8322,
            units_a_pos=38,
            units_b_pos=41,
            units_o_pos=52,
            units_ab_pos=12,
            units_negative=15,
        )
    )
    db.flush()


def seed_medicines(db: Session) -> list[Medicine]:
    medicines = []
    for name, generic, category, form, strength, price in MEDICINES:
        medicine = Medicine(
            name=name,
            generic_name=generic,
            category=category,
            form=form,
            strength=strength,
            unit_price=price,
            is_essential=True,
            description=f"{name} ({strength}) — {category} listed in the Maharashtra essential drug list.",
        )
        db.add(medicine)
        medicines.append(medicine)
    db.flush()
    return medicines


def seed_inventory(db: Session, hospitals: list[Hospital], medicines: list[Medicine]) -> None:
    for hospital in hospitals:
        for medicine in random.sample(medicines, k=random.randint(18, len(medicines))):
            reorder = random.choice([40, 60, 80, 120])
            db.add(
                InventoryItem(
                    hospital_id=hospital.id,
                    medicine_id=medicine.id,
                    batch_no=f"B{random.randint(1000, 9999)}-{random.choice('ABCD')}",
                    quantity=random.choice(
                        [random.randint(0, reorder // 2), random.randint(reorder, reorder * 6)]
                    ),
                    reorder_level=reorder,
                    expiry_date=TODAY + timedelta(days=random.randint(30, 900)),
                )
            )
    db.flush()


def seed_doctors(db: Session, hospitals: list[Hospital]) -> list[Doctor]:
    doctors: list[Doctor] = []
    for i in range(40):
        gender = random.choice([Gender.MALE, Gender.FEMALE])
        name = person_name(gender)
        hospital = hospitals[i % len(hospitals)]
        user = make_user(
            db,
            name,
            f"doctor{i + 1}@sevasetu.gov.in",
            UserRole.DOCTOR,
            hospital.locality,
        )
        db.flush()
        specialization = SPECIALIZATIONS[i % len(SPECIALIZATIONS)]
        experience = random.randint(2, 28)
        doctor = Doctor(
            user_id=user.id,
            hospital_id=hospital.id,
            specialization=specialization,
            qualification=random.choice(
                ["MBBS", "MBBS, MD", "MBBS, MS", "MBBS, DNB", "MBBS, MD, DM"]
            ),
            registration_no=f"MMC-{random.randint(100000, 999999)}",
            experience_years=experience,
            consultation_fee=random.choice([0, 0, 0, 50, 100]),
            languages=random.choice(
                ["Marathi, Hindi, English", "Marathi, Hindi", "Marathi, English"]
            ),
            available_from=time(random.choice([8, 9, 10]), 0),
            available_to=time(random.choice([15, 16, 17, 18]), 0),
            is_available_online=random.random() > 0.25,
            rating=round(random.uniform(3.8, 4.9), 1),
            bio=(
                f"{specialization} specialist with {experience} years in the public health system, "
                f"currently posted at {hospital.name}."
            ),
        )
        db.add(doctor)
        doctors.append(doctor)
    db.flush()
    return doctors


def seed_asha_workers(db: Session, hospitals: list[Hospital]) -> list[AshaWorker]:
    workers: list[AshaWorker] = []
    for i in range(25):
        loc = LOCALITIES[i % len(LOCALITIES)]
        name = person_name(Gender.FEMALE)
        user = make_user(db, name, f"asha{i + 1}@sevasetu.gov.in", UserRole.ASHA, loc["name"])
        db.flush()
        hospital = random.choice(
            [h for h in hospitals if h.locality == loc["name"]] or hospitals
        )
        worker = AshaWorker(
            user_id=user.id,
            hospital_id=hospital.id,
            asha_code=f"ASHA-PUN-{1000 + i}",
            assigned_area=loc["name"],
            village_or_ward=f"{loc['name']} Ward {random.randint(1, 12)}",
            households_count=random.randint(45, 130),
            experience_years=random.randint(1, 14),
            daily_visit_target=random.choice([6, 8, 10]),
            supervisor_name=f"ANM {person_name(Gender.FEMALE)}",
        )
        db.add(worker)
        workers.append(worker)
    db.flush()
    return workers


def seed_patients(db: Session, ashas: list[AshaWorker]) -> list[Patient]:
    patients: list[Patient] = []
    for i in range(100):
        gender = random.choices([Gender.FEMALE, Gender.MALE, Gender.OTHER], [0.52, 0.46, 0.02])[0]
        loc = LOCALITIES[i % len(LOCALITIES)]
        name = person_name(gender)
        user = make_user(db, name, f"patient{i + 1}@sevasetu.in", UserRole.PATIENT, loc["name"])
        db.flush()
        age = random.choices(
            [random.randint(1, 14), random.randint(15, 40), random.randint(41, 60), random.randint(61, 88)],
            [0.18, 0.42, 0.26, 0.14],
        )[0]
        dob = TODAY - timedelta(days=age * 365 + random.randint(0, 364))
        chronic = (
            ", ".join(random.sample(CHRONIC_CONDITIONS, k=random.randint(1, 2)))
            if age > 35 and random.random() < 0.55
            else ""
        )
        asha = random.choice([a for a in ashas if a.assigned_area == loc["name"]] or ashas)
        is_pregnant = gender == Gender.FEMALE and 18 <= age <= 42 and random.random() < 0.5
        patient = Patient(
            user_id=user.id,
            health_id=f"PUN-2026-{100000 + i}",
            date_of_birth=dob,
            gender=gender,
            blood_group=random.choice(["A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-"]),
            height_cm=round(random.uniform(145, 182), 1) if age > 16 else round(random.uniform(70, 150), 1),
            weight_kg=round(random.uniform(42, 92), 1) if age > 16 else round(random.uniform(8, 45), 1),
            address=f"{random.randint(1, 240)}, {random.choice(['Shivaji Nagar', 'Gandhi Chowk', 'Krishna Colony', 'Sai Nagar', 'Ambedkar Vasti'])}, {loc['name']}",
            locality=loc["name"],
            pincode=loc["pincode"],
            latitude=jitter(loc["lat"]),
            longitude=jitter(loc["lng"]),
            abha_number=f"{random.randint(10, 99)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}",
            allergies=", ".join(random.sample(ALLERGIES, k=random.randint(0, 2))),
            chronic_conditions=chronic,
            emergency_contact_name=person_name(random.choice([Gender.MALE, Gender.FEMALE])),
            emergency_contact_phone=phone(),
            health_score=random.randint(52, 95),
            risk_level=random.choices(
                [RiskLevel.LOW, RiskLevel.MODERATE, RiskLevel.HIGH, RiskLevel.CRITICAL],
                [0.55, 0.28, 0.13, 0.04],
            )[0],
            asha_worker_id=asha.id,
            is_pregnant=is_pregnant,
        )
        db.add(patient)
        patients.append(patient)
    db.flush()
    return patients


def seed_staff_users(db: Session, hospitals: list[Hospital]) -> dict[str, User]:
    admin = make_user(
        db, "Dr. Rajendra Kulkarni", "admin@sevasetu.gov.in", UserRole.HOSPITAL_ADMIN, "Pune City"
    )
    dho = make_user(
        db, "Dr. Sheetal Deshmukh", "dho@sevasetu.gov.in", UserRole.DHO, "Pune City"
    )
    emergency = make_user(
        db, "Ramesh Gaikwad (108 Control Room)", "emergency@sevasetu.gov.in", UserRole.EMERGENCY, "Shivajinagar"
    )
    db.flush()
    return {"admin": admin, "dho": dho, "emergency": emergency}


def seed_households(db: Session, ashas: list[AshaWorker]) -> list[Household]:
    households: list[Household] = []
    code = 1
    loc_map = {loc["name"]: loc for loc in LOCALITIES}
    for asha in ashas:
        loc = loc_map[asha.assigned_area]
        for _ in range(random.randint(8, 14)):
            household = Household(
                asha_worker_id=asha.id,
                household_code=f"HH-{loc['pincode']}-{code:04d}",
                head_name=person_name(random.choice([Gender.MALE, Gender.FEMALE])),
                phone=phone(),
                address=f"{random.randint(1, 180)}, {random.choice(['Vasti', 'Colony', 'Chawl', 'Society'])} {random.randint(1, 9)}, {loc['name']}",
                locality=loc["name"],
                members_count=random.randint(2, 9),
                latitude=jitter(loc["lat"]),
                longitude=jitter(loc["lng"]),
                has_toilet=random.random() > 0.18,
                water_source=random.choice(WATER_SOURCES),
                risk_level=random.choices(
                    [RiskLevel.LOW, RiskLevel.MODERATE, RiskLevel.HIGH],
                    [0.6, 0.29, 0.11],
                )[0],
                last_visit_date=TODAY - timedelta(days=random.randint(0, 45)),
            )
            db.add(household)
            households.append(household)
            code += 1
    db.flush()
    for asha in ashas:
        asha.households_count = len([h for h in households if h.asha_worker_id == asha.id])
    return households


def seed_visits(db: Session, households: list[Household], patients: list[Patient]) -> None:
    purposes = [
        "Routine household health survey",
        "Antenatal follow-up",
        "Child growth monitoring",
        "Immunisation reminder",
        "TB medication adherence check",
        "Hypertension screening",
        "Diabetes screening",
        "Post-natal care visit",
        "Malnutrition follow-up",
        "Distribution of IFA tablets",
    ]
    for household in households:
        for _ in range(random.randint(1, 5)):
            offset = random.randint(-40, 2)
            visit_date = TODAY + timedelta(days=offset)
            status = (
                VisitStatus.COMPLETED
                if offset < 0 and random.random() > 0.12
                else VisitStatus.PLANNED
                if offset >= 0
                else VisitStatus.MISSED
            )
            db.add(
                Visit(
                    asha_worker_id=household.asha_worker_id,
                    household_id=household.id,
                    patient_id=random.choice(patients).id if random.random() < 0.5 else None,
                    visit_date=visit_date,
                    purpose=random.choice(purposes),
                    status=status,
                    notes=random.choice(
                        [
                            "Family counselled on hygiene and safe drinking water.",
                            "Referred to PHC for further evaluation.",
                            "Vitals within normal limits.",
                            "IFA tablets distributed for one month.",
                            "Advised ORS and zinc for child with loose motions.",
                        ]
                    ),
                    bp_systolic=random.randint(104, 168) if random.random() < 0.7 else None,
                    bp_diastolic=random.randint(64, 104) if random.random() < 0.7 else None,
                    temperature_c=round(random.uniform(36.2, 39.4), 1) if random.random() < 0.5 else None,
                    weight_kg=round(random.uniform(12, 88), 1) if random.random() < 0.5 else None,
                    medicines_given=random.choice(
                        ["", "", "Paracetamol 500mg x 6", "IFA tablets x 30", "ORS sachets x 4"]
                    ),
                    synced=random.random() > 0.12,
                )
            )
    db.flush()


def seed_appointments(
    db: Session, patients: list[Patient], doctors: list[Doctor]
) -> list[Appointment]:
    appointments: list[Appointment] = []
    for _ in range(260):
        patient = random.choice(patients)
        doctor = random.choice(doctors)
        day_offset = random.randint(-25, 12)
        hour = random.randint(9, 16)
        minute = random.choice([0, 20, 40])
        scheduled = datetime.combine(
            TODAY + timedelta(days=day_offset), time(hour, minute)
        ).replace(tzinfo=timezone.utc)
        if day_offset < 0:
            status = random.choices(
                [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
                [0.88, 0.12],
            )[0]
        elif day_offset == 0:
            status = random.choice(
                [
                    AppointmentStatus.SCHEDULED,
                    AppointmentStatus.CHECKED_IN,
                    AppointmentStatus.COMPLETED,
                    AppointmentStatus.IN_PROGRESS,
                ]
            )
        else:
            status = AppointmentStatus.SCHEDULED
        appt_type = random.choices(
            [AppointmentType.IN_PERSON, AppointmentType.VIDEO, AppointmentType.HOME_VISIT],
            [0.6, 0.3, 0.1],
        )[0]
        appt = Appointment(
            patient_id=patient.id,
            doctor_id=doctor.id,
            hospital_id=doctor.hospital_id,
            scheduled_at=scheduled,
            appointment_type=appt_type,
            status=status,
            reason=random.choice(APPOINTMENT_REASONS),
            token_number=random.randint(1, 40),
            queue_position=random.randint(1, 12),
            diagnosis=random.choice(
                ["Viral fever", "Essential hypertension", "Type 2 diabetes", "Iron deficiency anaemia",
                 "Acute gastroenteritis", "Upper respiratory tract infection", ""]
            )
            if status == AppointmentStatus.COMPLETED
            else "",
            video_room_id=f"room{random.randint(100000, 999999)}"
            if appt_type == AppointmentType.VIDEO
            else None,
        )
        db.add(appt)
        appointments.append(appt)
    db.flush()
    return appointments


def seed_prescriptions_and_reports(
    db: Session,
    appointments: list[Appointment],
    medicines: list[Medicine],
    doctors: list[Doctor],
) -> None:
    completed = [a for a in appointments if a.status == AppointmentStatus.COMPLETED]
    for appt in completed:
        pres = Prescription(
            patient_id=appt.patient_id,
            doctor_id=appt.doctor_id,
            appointment_id=appt.id,
            issued_on=appt.scheduled_at.date(),
            diagnosis=appt.diagnosis or "General consultation",
            advice=random.choice(
                [
                    "Plenty of oral fluids, rest for 3 days, return if fever persists.",
                    "Low-salt diet, 30 minutes brisk walk daily, review after 1 month.",
                    "Continue IFA tablets, high-iron diet, repeat haemoglobin after 6 weeks.",
                    "Monitor blood sugar twice weekly and maintain a log.",
                ]
            ),
            follow_up_date=appt.scheduled_at.date() + timedelta(days=random.choice([7, 15, 30])),
        )
        pres.items = [
            PrescriptionItem(
                medicine_id=medicine.id,
                medicine_name=f"{medicine.name} {medicine.strength}",
                dosage=random.choice(["1-0-1", "1-1-1", "0-0-1", "1-0-0"]),
                duration_days=random.choice([3, 5, 7, 15, 30]),
                instructions=random.choice(["After food", "Before food", "At bedtime", "With warm water"]),
            )
            for medicine in random.sample(medicines, k=random.randint(1, 4))
        ]
        db.add(pres)

        if random.random() < 0.55:
            panel = random.choice(LAB_PANELS)
            abnormal = random.random() < 0.35
            results = {}
            for field, (low, high) in panel["fields"].items():
                normal_low, normal_high = panel["normal"][field]
                if abnormal:
                    value = round(random.uniform(low, high), 1)
                else:
                    value = round(random.uniform(normal_low, max(normal_low + 0.1, normal_high)), 1)
                results[field] = value
            db.add(
                Report(
                    patient_id=appt.patient_id,
                    doctor_id=appt.doctor_id,
                    hospital_id=appt.hospital_id,
                    report_type=random.choices(
                        [ReportType.LAB, ReportType.RADIOLOGY, ReportType.DISCHARGE],
                        [0.75, 0.18, 0.07],
                    )[0],
                    title=panel["title"],
                    summary=(
                        "One or more parameters outside the reference range — clinical correlation advised."
                        if abnormal
                        else "All parameters within normal reference range."
                    ),
                    result_json=json.dumps(results),
                    report_date=appt.scheduled_at.date() + timedelta(days=1),
                    is_abnormal=abnormal,
                )
            )
    db.flush()


def seed_pregnancies(
    db: Session, patients: list[Patient], ashas: list[AshaWorker]
) -> list[PregnancyRecord]:
    records = []
    for patient in [p for p in patients if p.is_pregnant]:
        lmp = TODAY - timedelta(days=random.randint(40, 250))
        hb = round(random.uniform(7.4, 13.2), 1)
        systolic = random.randint(104, 158)
        diastolic = random.randint(66, 98)
        risk = RiskLevel.LOW
        if hb < 9 or systolic >= 140:
            risk = RiskLevel.HIGH
        elif hb < 11 or systolic >= 130:
            risk = RiskLevel.MODERATE
        record = PregnancyRecord(
            patient_id=patient.id,
            asha_worker_id=patient.asha_worker_id or random.choice(ashas).id,
            lmp_date=lmp,
            edd_date=lmp + timedelta(days=280),
            gravida=random.randint(1, 4),
            parity=random.randint(0, 3),
            hemoglobin=hb,
            bp_systolic=systolic,
            bp_diastolic=diastolic,
            weight_kg=round(random.uniform(45, 78), 1),
            anc_visits_completed=random.randint(0, 4),
            risk_level=risk,
            notes="Registered under Janani Suraksha Yojana; monthly ASHA follow-up scheduled.",
        )
        db.add(record)
        records.append(record)
    db.flush()
    return records


def seed_children_and_vaccinations(
    db: Session, households: list[Household], patients: list[Patient], hospitals: list[Hospital]
) -> None:
    mothers = [p for p in patients if p.gender == Gender.FEMALE]
    for household in random.sample(households, k=int(len(households) * 0.55)):
        for _ in range(random.randint(1, 2)):
            gender = random.choice([Gender.MALE, Gender.FEMALE])
            age_days = random.randint(20, 1900)
            dob = TODAY - timedelta(days=age_days)
            child = Child(
                mother_patient_id=random.choice(mothers).id if random.random() < 0.5 else None,
                household_id=household.id,
                name=person_name(gender),
                date_of_birth=dob,
                gender=gender,
                birth_weight_kg=round(random.uniform(2.1, 3.8), 2),
                current_weight_kg=round(min(18, 3 + age_days / 160) * random.uniform(0.82, 1.15), 1),
                height_cm=round(min(110, 48 + age_days / 22) * random.uniform(0.94, 1.05), 1),
                nutrition_status=random.choices(
                    ["Normal", "Moderately underweight", "Severely underweight", "Overweight"],
                    [0.7, 0.2, 0.06, 0.04],
                )[0],
                locality=household.locality,
            )
            db.add(child)
            db.flush()
            for vaccine, dose, due_day in VACCINES_CHILD:
                scheduled = dob + timedelta(days=due_day)
                if scheduled > TODAY + timedelta(days=400):
                    continue
                if scheduled < TODAY:
                    status = random.choices(
                        [VaccinationStatus.COMPLETED, VaccinationStatus.OVERDUE], [0.87, 0.13]
                    )[0]
                else:
                    status = VaccinationStatus.DUE
                db.add(
                    Vaccination(
                        child_id=child.id,
                        vaccine_name=vaccine,
                        dose_label=dose,
                        scheduled_date=scheduled,
                        administered_date=scheduled if status == VaccinationStatus.COMPLETED else None,
                        status=status,
                        center_name=f"{household.locality} Sub-Centre",
                        hospital_id=random.choice(hospitals).id,
                    )
                )
    for patient in random.sample(patients, k=60):
        vaccine, dose = random.choice(VACCINES_ADULT)
        scheduled = TODAY + timedelta(days=random.randint(-200, 60))
        status = (
            VaccinationStatus.COMPLETED
            if scheduled < TODAY and random.random() > 0.25
            else VaccinationStatus.OVERDUE
            if scheduled < TODAY
            else VaccinationStatus.DUE
        )
        db.add(
            Vaccination(
                patient_id=patient.id,
                vaccine_name=vaccine,
                dose_label=dose,
                scheduled_date=scheduled,
                administered_date=scheduled if status == VaccinationStatus.COMPLETED else None,
                status=status,
                center_name=f"{patient.locality} Urban Health Centre",
                hospital_id=random.choice(hospitals).id,
            )
        )
    db.flush()


def seed_ambulances(db: Session, hospitals: list[Hospital]) -> list[Ambulance]:
    ambulances = []
    for i in range(20):
        loc = LOCALITIES[i % len(LOCALITIES)]
        hospital = random.choice(hospitals)
        ambulance = Ambulance(
            vehicle_number=f"MH-12-{random.choice('ABCDEFGH')}{random.choice('ABCDEFG')}-{random.randint(1000, 9999)}",
            hospital_id=hospital.id,
            driver_name=person_name(Gender.MALE),
            driver_phone=phone(),
            vehicle_type=random.choices(
                ["108 Advanced Life Support", "108 Basic Life Support", "102 Maternity Van"],
                [0.4, 0.45, 0.15],
            )[0],
            status=random.choices(
                [AmbulanceStatus.AVAILABLE, AmbulanceStatus.ON_DUTY, AmbulanceStatus.MAINTENANCE],
                [0.6, 0.32, 0.08],
            )[0],
            latitude=jitter(loc["lat"], 0.02),
            longitude=jitter(loc["lng"], 0.02),
            current_location=loc["name"],
            has_oxygen=True,
            has_ventilator=random.random() < 0.35,
        )
        db.add(ambulance)
        ambulances.append(ambulance)
    db.flush()
    return ambulances


def seed_sos(
    db: Session, patients: list[Patient], ambulances: list[Ambulance], hospitals: list[Hospital]
) -> None:
    types = ["Cardiac", "Accident", "Obstetric", "Respiratory", "Snake bite", "Poisoning", "Medical"]
    for i in range(18):
        patient = random.choice(patients)
        active = i < 4
        db.add(
            SosRequest(
                patient_id=patient.id,
                raised_by_user_id=patient.user_id,
                emergency_type=random.choice(types),
                description=random.choice(
                    [
                        "Severe chest pain with sweating",
                        "Two-wheeler accident with head injury",
                        "Labour pains, water broke",
                        "Breathlessness, unable to speak full sentences",
                        "Snake bite while working in the field",
                    ]
                ),
                latitude=patient.latitude,
                longitude=patient.longitude,
                address=patient.address,
                status=random.choice([SosStatus.DISPATCHED, SosStatus.EN_ROUTE])
                if active
                else SosStatus.COMPLETED,
                ambulance_id=random.choice(ambulances).id,
                hospital_id=random.choice(hospitals).id,
                eta_minutes=random.randint(5, 25),
                resolved_at=None if active else datetime.now(timezone.utc) - timedelta(days=random.randint(1, 20)),
            )
        )
    db.flush()


def seed_disease_cases(db: Session) -> None:
    for _ in range(320):
        disease, severity = random.choice(DISEASES)
        loc = random.choice(LOCALITIES)
        db.add(
            DiseaseCase(
                disease=disease,
                locality=loc["name"],
                latitude=jitter(loc["lat"], 0.02),
                longitude=jitter(loc["lng"], 0.02),
                case_count=random.randint(1, 9),
                reported_on=TODAY - timedelta(days=random.randint(0, 27)),
                severity=RiskLevel(severity),
            )
        )
    db.flush()


def seed_reminders(db: Session, patients: list[Patient]) -> None:
    catalogue = [
        ("Paracetamol 500mg", "1 tablet", "09:00,21:00"),
        ("Metformin 500mg", "1 tablet", "08:00,20:00"),
        ("Amlodipine 5mg", "1 tablet", "09:00"),
        ("IFA tablet", "1 tablet", "20:00"),
        ("Calcium + Vitamin D3", "1 tablet", "13:00"),
        ("Salbutamol inhaler", "2 puffs", "08:00,14:00,20:00"),
    ]
    for patient in random.sample(patients, k=55):
        for name, dosage, times in random.sample(catalogue, k=random.randint(1, 3)):
            db.add(
                MedicineReminder(
                    patient_id=patient.id,
                    medicine_name=name,
                    dosage=dosage,
                    times_of_day=times,
                    start_date=TODAY - timedelta(days=random.randint(1, 60)),
                    end_date=TODAY + timedelta(days=random.randint(5, 90)),
                    is_active=random.random() > 0.2,
                    adherence_percent=random.randint(58, 100),
                )
            )
    db.flush()


def seed_referrals(
    db: Session, patients: list[Patient], ashas: list[AshaWorker], hospitals: list[Hospital]
) -> None:
    reasons = [
        "Severe anaemia — requires blood transfusion",
        "High-risk pregnancy with raised BP",
        "Suspected pulmonary tuberculosis",
        "Uncontrolled diabetes with foot ulcer",
        "Child with severe acute malnutrition",
        "Chest pain requiring ECG and cardiology review",
    ]
    for _ in range(30):
        asha = random.choice(ashas)
        patient = random.choice(patients)
        db.add(
            Referral(
                patient_id=patient.id,
                created_by_user_id=asha.user_id,
                from_facility=f"{asha.assigned_area} Sub-Centre",
                to_hospital_id=random.choice(hospitals).id,
                reason=random.choice(reasons),
                urgency=random.choice([RiskLevel.MODERATE, RiskLevel.HIGH, RiskLevel.CRITICAL]),
                status=random.choices(
                    [ReferralStatus.OPEN, ReferralStatus.ACCEPTED, ReferralStatus.CLOSED],
                    [0.4, 0.3, 0.3],
                )[0],
                notes="Transport arranged through 102 maternity van where required.",
            )
        )
    db.flush()


def seed_chats(db: Session, patients: list[Patient], doctors: list[Doctor], ashas: list[AshaWorker]) -> None:
    conversations = [
        ("Fever since 3 days, what should I do?", "Please start paracetamol 500mg twice a day and drink plenty of fluids. If the fever crosses 3 days we will test for dengue."),
        ("My BP reading today was 148/94.", "Reduce salt intake and continue amlodipine. Please share readings for the next 5 mornings."),
        ("Child has loose motions since yesterday.", "Give ORS after every loose stool and zinc for 14 days. Bring the child to the PHC if there is vomiting or reduced urine."),
        ("Can I take my diabetes tablet before food?", "Metformin should be taken after food to avoid acidity. Keep the timings consistent."),
    ]
    for i in range(24):
        patient = random.choice(patients)
        counterpart = (
            random.choice(doctors).user_id if i % 3 else random.choice(ashas).user_id
        )
        thread = ChatThread(
            subject=random.choice(["Consultation", "Follow-up", "Health query", "Medication advice"]),
            participant_a_id=patient.user_id,
            participant_b_id=counterpart,
            last_message_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 200)),
        )
        db.add(thread)
        db.flush()
        base_time = thread.last_message_at - timedelta(minutes=40)
        for question, answer in random.sample(conversations, k=random.randint(1, 3)):
            db.add(
                ChatMessage(
                    thread_id=thread.id,
                    sender_id=patient.user_id,
                    body=question,
                    is_read=True,
                    created_at=base_time,
                )
            )
            base_time += timedelta(minutes=random.randint(2, 15))
            db.add(
                ChatMessage(
                    thread_id=thread.id,
                    sender_id=counterpart,
                    body=answer,
                    is_read=random.random() > 0.4,
                    created_at=base_time,
                )
            )
            base_time += timedelta(minutes=random.randint(5, 60))
    db.flush()


def seed_notifications(db: Session, users: list[User]) -> None:
    templates = [
        ("Vaccination due", "Your child's Pentavalent Dose 2 is due this week at the sub-centre.", "vaccination", "warning", "/patient/vaccinations"),
        ("Health camp announcement", "Free NCD screening camp this Sunday at the Urban Health Centre.", "general", "info", "/patient/dashboard"),
        ("Medicine reminder", "Take your evening dose of Metformin 500mg.", "medicine", "info", "/patient/reminders"),
        ("Lab report ready", "Your Complete Blood Count report is now available.", "report", "success", "/patient/reports"),
        ("Dengue advisory", "Dengue cases rising in your locality. Remove stagnant water around your home.", "outbreak", "critical", "/patient/dashboard"),
        ("ANC visit due", "Your next antenatal check-up is scheduled this week.", "pregnancy", "warning", "/patient/pregnancy"),
    ]
    for user in users:
        for title, body, category, severity, url in random.sample(templates, k=random.randint(2, 4)):
            db.add(
                Notification(
                    user_id=user.id,
                    title=title,
                    body=body,
                    category=category,
                    severity=severity,
                    is_read=random.random() > 0.55,
                    action_url=url,
                    created_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 240)),
                )
            )
    db.flush()


def seed_demo_accounts(
    db: Session, hospitals: list[Hospital], ashas: list[AshaWorker], doctors: list[Doctor]
) -> None:
    """Well-known logins used in the demo credential picker."""
    loc = LOCALITIES[0]

    patient_user = make_user(db, "Sunita Jadhav", "patient@sevasetu.in", UserRole.PATIENT, "Hadapsar")
    db.flush()
    patient = Patient(
        user_id=patient_user.id,
        health_id="PUN-2026-000001",
        date_of_birth=TODAY - timedelta(days=29 * 365),
        gender=Gender.FEMALE,
        blood_group="O+",
        height_cm=158,
        weight_kg=57,
        address="12, Sai Nagar, Gadital, Hadapsar",
        locality="Hadapsar",
        pincode="411028",
        latitude=18.5089,
        longitude=73.9260,
        abha_number="12-3456-7890-1234",
        allergies="Penicillin",
        chronic_conditions="Anaemia",
        emergency_contact_name="Mahesh Jadhav",
        emergency_contact_phone=phone(),
        health_score=78,
        risk_level=RiskLevel.MODERATE,
        asha_worker_id=ashas[0].id,
        is_pregnant=True,
    )
    db.add(patient)
    db.flush()

    lmp = TODAY - timedelta(days=170)
    db.add(
        PregnancyRecord(
            patient_id=patient.id,
            asha_worker_id=ashas[0].id,
            lmp_date=lmp,
            edd_date=lmp + timedelta(days=280),
            gravida=2,
            parity=1,
            hemoglobin=9.8,
            bp_systolic=134,
            bp_diastolic=88,
            weight_kg=57,
            anc_visits_completed=2,
            risk_level=RiskLevel.MODERATE,
            notes="Mild anaemia with borderline BP — fortnightly ASHA follow-up advised.",
        )
    )

    doctor_user = make_user(db, "Dr. Anjali Deshpande", "doctor@sevasetu.gov.in", UserRole.DOCTOR, "Pune City")
    db.flush()
    demo_doctor = Doctor(
        user_id=doctor_user.id,
        hospital_id=hospitals[0].id,
        specialization="General Medicine",
        qualification="MBBS, MD (Medicine)",
        registration_no="MMC-482913",
        experience_years=12,
        consultation_fee=0,
        languages="Marathi, Hindi, English",
        available_from=time(9, 0),
        available_to=time(17, 0),
        is_available_online=True,
        rating=4.8,
        bio="Medical officer at Sassoon General Hospital leading the NCD and teleconsultation clinic.",
    )
    db.add(demo_doctor)

    asha_user = make_user(db, "Kavita More", "asha@sevasetu.gov.in", UserRole.ASHA, "Hadapsar")
    db.flush()
    demo_asha = AshaWorker(
        user_id=asha_user.id,
        hospital_id=hospitals[5].id,
        asha_code="ASHA-PUN-0001",
        assigned_area="Hadapsar",
        village_or_ward="Hadapsar Ward 4",
        households_count=0,
        experience_years=7,
        daily_visit_target=8,
        supervisor_name="ANM Rekha Pawar",
    )
    db.add(demo_asha)
    db.flush()

    loc_map = {item["name"]: item for item in LOCALITIES}
    hadapsar = loc_map["Hadapsar"]
    for i in range(12):
        household = Household(
            asha_worker_id=demo_asha.id,
            household_code=f"HH-411028-9{i:03d}",
            head_name=person_name(random.choice([Gender.MALE, Gender.FEMALE])),
            phone=phone(),
            address=f"{random.randint(1, 90)}, Gadital Vasti, Hadapsar",
            locality="Hadapsar",
            members_count=random.randint(3, 8),
            latitude=jitter(hadapsar["lat"]),
            longitude=jitter(hadapsar["lng"]),
            has_toilet=random.random() > 0.2,
            water_source=random.choice(WATER_SOURCES),
            risk_level=random.choice([RiskLevel.LOW, RiskLevel.MODERATE, RiskLevel.HIGH]),
            last_visit_date=TODAY - timedelta(days=random.randint(0, 20)),
        )
        db.add(household)
        db.flush()
        for offset in (-6, -2, 0, 3):
            db.add(
                Visit(
                    asha_worker_id=demo_asha.id,
                    household_id=household.id,
                    visit_date=TODAY + timedelta(days=offset),
                    purpose=random.choice(
                        ["Routine household health survey", "Antenatal follow-up", "Child growth monitoring"]
                    ),
                    status=VisitStatus.COMPLETED if offset < 0 else VisitStatus.PLANNED,
                    notes="Family counselled on hygiene, nutrition and immunisation.",
                    bp_systolic=random.randint(110, 150),
                    bp_diastolic=random.randint(70, 96),
                    temperature_c=round(random.uniform(36.4, 38.2), 1),
                    weight_kg=round(random.uniform(40, 80), 1),
                    synced=offset < 0,
                )
            )
        child = Child(
            household_id=household.id,
            mother_patient_id=patient.id if i == 0 else None,
            name=person_name(random.choice([Gender.MALE, Gender.FEMALE])),
            date_of_birth=TODAY - timedelta(days=random.randint(60, 1200)),
            gender=random.choice([Gender.MALE, Gender.FEMALE]),
            birth_weight_kg=round(random.uniform(2.3, 3.6), 2),
            current_weight_kg=round(random.uniform(5, 14), 1),
            height_cm=round(random.uniform(55, 95), 1),
            nutrition_status=random.choice(["Normal", "Moderately underweight"]),
            locality="Hadapsar",
        )
        db.add(child)
        db.flush()
        for vaccine, dose, due_day in VACCINES_CHILD[:10]:
            scheduled = child.date_of_birth + timedelta(days=due_day)
            status = (
                VaccinationStatus.COMPLETED
                if scheduled < TODAY and random.random() > 0.2
                else VaccinationStatus.OVERDUE
                if scheduled < TODAY
                else VaccinationStatus.DUE
            )
            db.add(
                Vaccination(
                    child_id=child.id,
                    vaccine_name=vaccine,
                    dose_label=dose,
                    scheduled_date=scheduled,
                    administered_date=scheduled if status == VaccinationStatus.COMPLETED else None,
                    status=status,
                    center_name="Hadapsar Urban Health Centre",
                    hospital_id=hospitals[5].id,
                )
            )
    demo_asha.households_count = 12

    for vaccine, dose, offset_days, done in [
        ("Td (Tetanus-diphtheria)", "TD-1", -120, True),
        ("Td (Tetanus-diphtheria)", "TD-2", -90, True),
        ("COVID-19 Precaution", "Booster", -240, True),
        ("Influenza", "Annual", 21, False),
    ]:
        scheduled = TODAY + timedelta(days=offset_days)
        db.add(
            Vaccination(
                patient_id=patient.id,
                vaccine_name=vaccine,
                dose_label=dose,
                scheduled_date=scheduled,
                administered_date=scheduled if done else None,
                status=VaccinationStatus.COMPLETED if done else VaccinationStatus.DUE,
                center_name="Hadapsar Urban Health Centre",
                hospital_id=hospitals[5].id,
            )
        )

    # Put the demo ASHA in charge of a real caseload so her screens are populated.
    patient.asha_worker_id = demo_asha.id
    demo_pregnancy = (
        db.query(PregnancyRecord).filter(PregnancyRecord.patient_id == patient.id).first()
    )
    if demo_pregnancy:
        demo_pregnancy.asha_worker_id = demo_asha.id
    for extra in db.query(Patient).filter(Patient.locality == "Hadapsar").limit(12).all():
        extra.asha_worker_id = demo_asha.id
    handed_over = (
        db.query(PregnancyRecord)
        .filter(PregnancyRecord.delivered.is_(False))
        .order_by(PregnancyRecord.edd_date)
        .limit(5)
        .all()
    )
    for record in handed_over:
        record.asha_worker_id = demo_asha.id
        record.patient.asha_worker_id = demo_asha.id
    db.flush()

    for reason, urgency, status in [
        ("Severe anaemia in pregnancy — needs transfusion workup", RiskLevel.HIGH, ReferralStatus.OPEN),
        ("Child with severe acute malnutrition — NRC admission", RiskLevel.CRITICAL, ReferralStatus.ACCEPTED),
        ("Suspected pulmonary tuberculosis — sputum AFB advised", RiskLevel.MODERATE, ReferralStatus.CLOSED),
    ]:
        db.add(
            Referral(
                patient_id=patient.id,
                created_by_user_id=asha_user.id,
                from_facility="Hadapsar Sub-Centre",
                to_hospital_id=hospitals[0].id,
                reason=reason,
                urgency=urgency,
                status=status,
                notes="Transport arranged through the 102 maternity van.",
            )
        )

    for patient_ref in [patient]:
        for offset, appt_status in [(-8, AppointmentStatus.COMPLETED), (0, AppointmentStatus.CHECKED_IN), (2, AppointmentStatus.SCHEDULED), (5, AppointmentStatus.SCHEDULED)]:
            db.add(
                Appointment(
                    patient_id=patient_ref.id,
                    doctor_id=demo_doctor.id,
                    hospital_id=demo_doctor.hospital_id,
                    scheduled_at=datetime.combine(
                        TODAY + timedelta(days=offset), time(random.randint(9, 15), random.choice([0, 30]))
                    ).replace(tzinfo=timezone.utc),
                    appointment_type=random.choice([AppointmentType.IN_PERSON, AppointmentType.VIDEO]),
                    status=appt_status,
                    reason=random.choice(APPOINTMENT_REASONS),
                    token_number=random.randint(1, 20),
                    queue_position=random.randint(1, 6),
                    diagnosis="Iron deficiency anaemia" if appt_status == AppointmentStatus.COMPLETED else "",
                    video_room_id=f"room{random.randint(100000, 999999)}",
                )
            )
    # Give the demo doctor a full clinic day so the queue screen is populated.
    other_patients = db.query(Patient).limit(14).all()
    for index, other in enumerate(other_patients):
        db.add(
            Appointment(
                patient_id=other.id,
                doctor_id=demo_doctor.id,
                hospital_id=demo_doctor.hospital_id,
                scheduled_at=datetime.combine(TODAY, time(9 + index // 3, (index % 3) * 20)).replace(
                    tzinfo=timezone.utc
                ),
                appointment_type=random.choice([AppointmentType.IN_PERSON, AppointmentType.VIDEO]),
                status=random.choices(
                    [AppointmentStatus.SCHEDULED, AppointmentStatus.CHECKED_IN, AppointmentStatus.COMPLETED],
                    [0.4, 0.4, 0.2],
                )[0],
                reason=random.choice(APPOINTMENT_REASONS),
                token_number=index + 1,
                queue_position=index + 1,
            )
        )

    db.add_all(
        [
            MedicineReminder(
                patient_id=patient.id,
                medicine_name="Ferrous Sulphate + Folic Acid",
                dosage="1 tablet",
                times_of_day="20:00",
                start_date=TODAY - timedelta(days=30),
                end_date=TODAY + timedelta(days=60),
                adherence_percent=86,
            ),
            MedicineReminder(
                patient_id=patient.id,
                medicine_name="Calcium + Vitamin D3",
                dosage="1 tablet",
                times_of_day="13:00",
                start_date=TODAY - timedelta(days=30),
                end_date=TODAY + timedelta(days=60),
                adherence_percent=92,
            ),
        ]
    )
    db.add(
        Report(
            patient_id=patient.id,
            doctor_id=demo_doctor.id,
            hospital_id=hospitals[0].id,
            report_type=ReportType.LAB,
            title="Complete Blood Count (CBC)",
            summary="Haemoglobin below reference range — iron deficiency anaemia. Start IFA supplementation.",
            result_json=json.dumps(
                {"Haemoglobin (g/dL)": 9.8, "WBC (/µL)": 7800, "Platelets (/µL)": 245000}
            ),
            report_date=TODAY - timedelta(days=7),
            is_abnormal=True,
        )
    )

    demo_prescription = Prescription(
        patient_id=patient.id,
        doctor_id=demo_doctor.id,
        issued_on=TODAY - timedelta(days=7),
        diagnosis="Iron deficiency anaemia in pregnancy",
        advice="High-iron diet, IFA daily after meals, review haemoglobin after 4 weeks.",
        follow_up_date=TODAY + timedelta(days=21),
    )
    for medicine_name, dosage, days, instructions in [
        ("Ferrous Sulphate", "0-0-1", 60, "After dinner with citrus juice"),
        ("Folic Acid", "1-0-0", 60, "After breakfast"),
        ("Calcium Carbonate", "0-1-0", 60, "After lunch, avoid with iron"),
    ]:
        medicine = db.query(Medicine).filter(Medicine.name.ilike(f"%{medicine_name}%")).first()
        demo_prescription.items.append(
            PrescriptionItem(
                medicine_id=medicine.id if medicine else None,
                medicine_name=medicine.name if medicine else medicine_name,
                dosage=dosage,
                duration_days=days,
                instructions=instructions,
            )
        )
    db.add(demo_prescription)
    db.flush()

    for counterpart_id, subject, exchange in [
        (
            demo_doctor.user_id,
            "Anaemia follow-up",
            [
                ("patient", "Doctor, I still feel dizzy when I stand up quickly."),
                ("other", "Continue the iron tablets after dinner and add citrus fruit. Any black stools?"),
                ("patient", "No black stools, but mild constipation."),
                ("other", "Add a fibre-rich diet and 3 litres of water daily. Review haemoglobin in 4 weeks."),
            ],
        ),
        (
            asha_user.id,
            "Home visit schedule",
            [
                ("other", "Namaskar, I will visit on Thursday morning for your ANC check."),
                ("patient", "Please come after 10 am, I will keep the MCP card ready."),
                ("other", "Noted. Carry your IFA strip too, I will record the count."),
            ],
        ),
    ]:
        thread = ChatThread(
            subject=subject,
            participant_a_id=patient.user_id,
            participant_b_id=counterpart_id,
            last_message_at=datetime.now(timezone.utc) - timedelta(hours=2),
        )
        db.add(thread)
        db.flush()
        sent_at = thread.last_message_at - timedelta(minutes=45)
        for sender, body in exchange:
            db.add(
                ChatMessage(
                    thread_id=thread.id,
                    sender_id=patient.user_id if sender == "patient" else counterpart_id,
                    body=body,
                    is_read=True,
                    created_at=sent_at,
                )
            )
            sent_at += timedelta(minutes=8)
    db.flush()


def run() -> None:
    print("Dropping and recreating schema…")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        print("Seeding hospitals, blood banks, medicines…")
        hospitals = seed_hospitals(db)
        seed_blood_banks(db, hospitals)
        medicines = seed_medicines(db)
        seed_inventory(db, hospitals, medicines)

        print("Seeding staff, doctors and ASHA workers…")
        seed_staff_users(db, hospitals)
        doctors = seed_doctors(db, hospitals)
        ashas = seed_asha_workers(db, hospitals)

        print("Seeding patients and households…")
        patients = seed_patients(db, ashas)
        households = seed_households(db, ashas)
        seed_visits(db, households, patients)

        print("Seeding clinical activity…")
        appointments = seed_appointments(db, patients, doctors)
        seed_prescriptions_and_reports(db, appointments, medicines, doctors)
        seed_pregnancies(db, patients, ashas)
        seed_children_and_vaccinations(db, households, patients, hospitals)
        seed_reminders(db, patients)
        seed_referrals(db, patients, ashas, hospitals)

        print("Seeding emergency, surveillance and messaging…")
        ambulances = seed_ambulances(db, hospitals)
        seed_sos(db, patients, ambulances, hospitals)
        seed_disease_cases(db)
        seed_chats(db, patients, doctors, ashas)

        print("Seeding demo accounts…")
        seed_demo_accounts(db, hospitals, ashas, doctors)

        seed_notifications(db, db.query(User).all())
        db.commit()
        print_summary(db)
    finally:
        db.close()


def print_summary(db: Session) -> None:
    from app.models import Ambulance as Amb

    counts = {
        "users": db.query(User).count(),
        "patients": db.query(Patient).count(),
        "doctors": db.query(Doctor).count(),
        "asha_workers": db.query(AshaWorker).count(),
        "hospitals": db.query(Hospital).count(),
        "households": db.query(Household).count(),
        "visits": db.query(Visit).count(),
        "appointments": db.query(Appointment).count(),
        "prescriptions": db.query(Prescription).count(),
        "reports": db.query(Report).count(),
        "medicines": db.query(Medicine).count(),
        "inventory_items": db.query(InventoryItem).count(),
        "vaccinations": db.query(Vaccination).count(),
        "children": db.query(Child).count(),
        "pregnancies": db.query(PregnancyRecord).count(),
        "ambulances": db.query(Amb).count(),
        "sos_requests": db.query(SosRequest).count(),
        "disease_cases": db.query(DiseaseCase).count(),
        "chat_threads": db.query(ChatThread).count(),
        "notifications": db.query(Notification).count(),
    }
    print("\nSeed complete:")
    for key, value in counts.items():
        print(f"  {key:<18} {value}")
    print(
        "\nDemo logins (password: Seva@1234)\n"
        "  patient@sevasetu.in         — Patient\n"
        "  asha@sevasetu.gov.in        — ASHA worker\n"
        "  doctor@sevasetu.gov.in      — Doctor\n"
        "  admin@sevasetu.gov.in       — Hospital admin\n"
        "  dho@sevasetu.gov.in         — District health officer\n"
        "  emergency@sevasetu.gov.in   — Emergency response\n"
    )


if __name__ == "__main__":
    run()
