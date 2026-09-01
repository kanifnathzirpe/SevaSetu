"""End-to-end smoke test for every SevaSetu AI API surface."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
PASSWORD = "Seva@1234"
failures: list[str] = []


def login(email: str) -> dict[str, str]:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert resp.status_code == 200, f"login {email}: {resp.status_code} {resp.text[:200]}"
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def check(method: str, url: str, headers: dict | None = None, expect: int = 200, **kwargs) -> dict:
    resp = client.request(method, url, headers=headers, **kwargs)
    if resp.status_code != expect:
        failures.append(f"{method} {url} -> {resp.status_code} {resp.text[:160]}")
        return {}
    print(f"  ok  {method:<6} {url}")
    try:
        return resp.json()
    except ValueError:
        return {}


patient = login("patient@sevasetu.in")
doctor = login("doctor@sevasetu.gov.in")
asha = login("asha@sevasetu.gov.in")
admin = login("admin@sevasetu.gov.in")
dho = login("dho@sevasetu.gov.in")
emergency = login("emergency@sevasetu.gov.in")

print("\n[auth]")
check("GET", "/api/v1/auth/me", patient)
check("PATCH", "/api/v1/auth/me", patient, json={"preferred_language": "mr"})

print("\n[public]")
check("GET", "/health")
check("GET", "/api/v1/hospitals")
check("GET", "/api/v1/hospitals/nearby?lat=18.52&lng=73.85")
check("GET", "/api/v1/hospitals/blood-banks")
check("GET", "/api/v1/hospitals/vaccination-centers")
check("GET", "/api/v1/hospitals/1")
check("GET", "/api/v1/hospitals/1/doctors")
check("GET", "/api/v1/doctors")
check("GET", "/api/v1/doctors/specializations")
check("GET", "/api/v1/doctors/1")
check("GET", "/api/v1/doctors/1/slots")

print("\n[patient]")
check("GET", "/api/v1/patient/me", patient)
check("PATCH", "/api/v1/patient/me", patient, json={"weight_kg": 58})
check("GET", "/api/v1/patient/dashboard", patient)
check("GET", "/api/v1/patient/health-card", patient)
check("GET", "/api/v1/patient/medical-history", patient)
check("GET", "/api/v1/patient/prescriptions", patient)
check("GET", "/api/v1/patient/reports", patient)
check("GET", "/api/v1/patient/reminders", patient)
reminder = check(
    "POST", "/api/v1/patient/reminders", patient, expect=201,
    json={"medicine_name": "Paracetamol 500mg", "dosage": "1 tablet", "times_of_day": "09:00,21:00"},
)
if reminder:
    check("PATCH", f"/api/v1/patient/reminders/{reminder['id']}/toggle", patient)
    check("DELETE", f"/api/v1/patient/reminders/{reminder['id']}", patient)
check("GET", "/api/v1/patient/vaccinations", patient)
check("GET", "/api/v1/patient/children", patient)
check("GET", "/api/v1/patient/pregnancy", patient)
check("GET", "/api/v1/patient/pregnancy/insights", patient)
check("GET", "/api/v1/patient/nutrition", patient)
check("GET", "/api/v1/patient/health-score", patient)
check("GET", "/api/v1/patient/appointments", patient)

print("\n[appointments]")
slots = check("GET", "/api/v1/doctors/1/slots")
free = next((s["time"] for s in slots.get("slots", []) if s["available"]), "11:20")
from datetime import date, timedelta

when = f"{(date.today() + timedelta(days=3)).isoformat()}T{free}:00"
appt = check(
    "POST", "/api/v1/appointments", patient, expect=201,
    json={"doctor_id": 1, "scheduled_at": when, "appointment_type": "video", "reason": "Smoke test"},
)
if appt:
    check("GET", f"/api/v1/appointments/{appt['id']}", patient)
    check("PATCH", f"/api/v1/appointments/{appt['id']}", patient, json={"notes": "checked"})
    check("POST", f"/api/v1/appointments/{appt['id']}/check-in", patient)
    video = check("POST", "/api/v1/video/sessions", patient, expect=201, json={"appointment_id": appt["id"]})
    if video:
        check("GET", f"/api/v1/video/sessions/{video['room_id']}", patient)
        check("POST", f"/api/v1/video/sessions/{video['room_id']}/join", patient)
        check("POST", f"/api/v1/video/sessions/{video['room_id']}/end", patient)
    check("POST", f"/api/v1/appointments/{appt['id']}/cancel", patient)
check("GET", "/api/v1/appointments", patient)
check("GET", "/api/v1/video/config")

print("\n[ai]")
check("GET", "/api/v1/symptoms/catalog")
check("POST", "/api/v1/symptoms/check", patient, json={"symptoms": ["fever", "chills", "headache"], "age": 29, "gender": "female", "duration_days": 3})
check("GET", "/api/v1/symptoms/history", patient)
check("POST", "/api/v1/ai/chatbot", patient, json={"message": "I have fever since 2 days"})
check("GET", "/api/v1/ai/insights", patient)
check("GET", "/api/v1/ai/outbreak-prediction", patient)
check("GET", "/api/v1/ai/risk-prediction", patient)
check("GET", "/api/v1/ai/medicine-reminders/suggest", patient)

print("\n[emergency]")
sos = check("POST", "/api/v1/emergency/sos", patient, expect=201, json={"emergency_type": "Cardiac", "description": "Chest pain", "latitude": 18.51, "longitude": 73.92, "address": "Hadapsar"})
check("GET", "/api/v1/emergency/sos/active", patient)
check("GET", "/api/v1/emergency/sos", patient)
if sos:
    check("GET", f"/api/v1/emergency/sos/{sos['id']}", patient)
    check("PATCH", f"/api/v1/emergency/sos/{sos['id']}/status", emergency, json={"status": "completed"})
check("GET", "/api/v1/emergency/ambulances/nearby")
check("GET", "/api/v1/emergency/phc/nearest")
check("GET", "/api/v1/emergency/contacts")
check("GET", "/api/v1/emergency/console", emergency)

print("\n[doctor]")
check("GET", "/api/v1/doctor/dashboard", doctor)
check("GET", "/api/v1/doctor/appointments", doctor)
queue = check("GET", "/api/v1/doctor/queue", doctor)
if queue.get("waiting"):
    check("POST", f"/api/v1/doctor/queue/{queue['waiting'][0]['id']}/call", doctor)
patients = check("GET", "/api/v1/doctor/patients", doctor)
if patients:
    pid = patients[0]["id"]
    check("GET", f"/api/v1/doctor/patients/{pid}/history", doctor)
    check("POST", "/api/v1/doctor/prescriptions", doctor, expect=201, json={"patient_id": pid, "diagnosis": "Viral fever", "advice": "Rest", "items": [{"medicine_name": "Paracetamol 500mg", "dosage": "1-0-1", "duration_days": 5, "instructions": "After food"}]})
    check("POST", "/api/v1/doctor/lab-requests", doctor, expect=201, json={"patient_id": pid, "title": "Complete Blood Count (CBC)", "report_type": "lab"})
    check("POST", f"/api/v1/doctor/referrals?patient_id={pid}&reason=Needs%20cardiology", doctor, expect=201)
check("GET", "/api/v1/doctor/medicines?search=para", doctor)

print("\n[asha]")
check("GET", "/api/v1/asha/dashboard", asha)
households = check("GET", "/api/v1/asha/households", asha)
if households:
    hid = households[0]["id"]
    check("GET", f"/api/v1/asha/households/{hid}", asha)
    check("PATCH", f"/api/v1/asha/households/{hid}/survey", asha, json={"members_count": 5, "has_toilet": True, "water_source": "Borewell", "risk_level": "moderate"})
    visit = check("POST", "/api/v1/asha/visits", asha, expect=201, json={"household_id": hid, "visit_date": date.today().isoformat(), "purpose": "Routine survey", "status": "planned"})
    if visit:
        check("POST", f"/api/v1/asha/visits/{visit['id']}/complete", asha)
check("GET", "/api/v1/asha/visits", asha)
check("POST", "/api/v1/asha/sync", asha)
check("GET", "/api/v1/asha/patients", asha)
pregs = check("GET", "/api/v1/asha/pregnancies", asha)
if pregs:
    check("POST", f"/api/v1/asha/pregnancies/{pregs[0]['id']}/anc?hemoglobin=10.2&bp_systolic=132&bp_diastolic=86&weight_kg=59", asha)
check("GET", "/api/v1/asha/children", asha)
vacs = check("GET", "/api/v1/asha/vaccinations", asha)
if vacs:
    check("POST", f"/api/v1/asha/vaccinations/{vacs[0]['id']}/administer", asha)
check("GET", "/api/v1/asha/targets", asha)
apatients = check("GET", "/api/v1/asha/patients", asha)
if apatients:
    check("POST", "/api/v1/asha/referrals", asha, expect=201, json={"patient_id": apatients[0]["id"], "reason": "Severe anaemia", "urgency": "high"})
check("GET", "/api/v1/asha/referrals", asha)

print("\n[admin]")
check("GET", "/api/v1/admin/dashboard", admin)
check("GET", "/api/v1/admin/hospitals", admin)
check("PATCH", "/api/v1/admin/hospitals/1/beds?available_beds=100&available_icu_beds=10", admin)
check("GET", "/api/v1/admin/doctors", admin)
check("PATCH", "/api/v1/admin/doctors/1/availability", admin)
check("GET", "/api/v1/admin/asha-workers", admin)
inventory = check("GET", "/api/v1/admin/inventory?low_stock_only=true", admin)
if inventory:
    check("PATCH", f"/api/v1/admin/inventory/{inventory[0]['id']}/restock?quantity=100", admin)
check("GET", "/api/v1/admin/ambulances", admin)
check("GET", "/api/v1/admin/vaccination-dashboard", dho)
check("GET", "/api/v1/admin/disease-heatmap", dho)
check("GET", "/api/v1/admin/reports/summary", dho)
check("GET", "/api/v1/admin/dashboard", patient, expect=403)

print("\n[reports & chat & notifications]")
reports = check("GET", "/api/v1/reports", patient)
if reports:
    rid = reports[0]["id"]
    check("GET", f"/api/v1/reports/{rid}", patient)
    check("GET", f"/api/v1/reports/{rid}/download", patient)
pres = check("GET", "/api/v1/patient/prescriptions", patient)
if pres:
    check("GET", f"/api/v1/reports/prescriptions/{pres[0]['id']}/download", patient)
contacts = check("GET", "/api/v1/chat/contacts", patient)
if contacts:
    thread = check("POST", "/api/v1/chat/threads", patient, expect=201, json={"participant_id": contacts[0]["id"], "subject": "Smoke test"})
    if thread:
        check("POST", f"/api/v1/chat/threads/{thread['id']}/messages", patient, expect=201, json={"body": "Hello doctor"})
        check("GET", f"/api/v1/chat/threads/{thread['id']}/messages", patient)
        check("POST", f"/api/v1/chat/threads/{thread['id']}/read", patient)
check("GET", "/api/v1/chat/threads", patient)
check("GET", "/api/v1/notifications", patient)
check("GET", "/api/v1/notifications/unread-count", patient)
notifications = check("GET", "/api/v1/notifications?unread_only=true", patient)
if notifications:
    check("POST", f"/api/v1/notifications/{notifications[0]['id']}/read", patient)
check("POST", "/api/v1/notifications/read-all", patient)

print("\n[register/refresh/logout]")
import uuid

email = f"smoke-{uuid.uuid4().hex[:8]}@sevasetu.in"
reg = check("POST", "/api/v1/auth/register", expect=201, json={"full_name": "Smoke Test", "email": email, "phone": "9876543210", "password": "Seva@1234", "role": "patient", "locality": "Baner"})
if reg:
    refreshed = check("POST", "/api/v1/auth/refresh", json={"refresh_token": reg["refresh_token"]})
    if refreshed:
        check("POST", "/api/v1/auth/logout", {"Authorization": f"Bearer {refreshed['access_token']}"}, json={"refresh_token": refreshed["refresh_token"]})

print("\n" + "=" * 60)
if failures:
    print(f"{len(failures)} FAILURE(S):")
    for failure in failures:
        print("  -", failure)
    raise SystemExit(1)
print("All endpoint checks passed.")
