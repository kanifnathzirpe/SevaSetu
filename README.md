# SevaSetu AI

**Accessibility and Quality of Public Healthcare Services in Rural and Underserved Areas**

SevaSetu AI is a government-grade digital public health platform for rural and underserved areas. It connects patients, ASHA workers, doctors, hospital administrators, the District Health Officer and the 108 emergency control room on a single stack, with AI-assisted triage, geospatial disease surveillance, teleconsultation and last-mile field workflows.

---

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15 (App Router), TypeScript, TailwindCSS v4, ShadCN-style primitives, Framer Motion, Lucide, React Hook Form, TanStack Query, Recharts, Leaflet, Sonner, next-themes |
| Backend | FastAPI, Python 3.13, SQLAlchemy 2, Pydantic v2 |
| Database | PostgreSQL 16 |
| Auth | JWT access + refresh tokens, bcrypt password hashing, role-based routing |
| Storage | Local uploads (`backend/uploads`), served at `/uploads` |
| Infra | Docker + docker compose |

---

## Roles

| Role | Home | Highlights |
| --- | --- | --- |
| Patient | `/patient` | Dashboard, appointments, AI symptom checker, nearby facilities, SOS, reminders, vaccinations, pregnancy, nutrition, reports, prescriptions, health card, chat, video |
| ASHA worker | `/asha` | Households, visit planner, surveys, pregnancy monitoring, child immunisation, referrals, daily targets, offline sync |
| Doctor | `/doctor` | Dashboard, appointments, live queue, patient charts, prescriptions, lab requests, medicine index, teleconsultation |
| Hospital admin / DHO | `/admin` | District analytics, hospitals & beds, doctors, ASHA workforce, inventory, ambulances, vaccination coverage, disease heatmap, district reports |
| Emergency response | `/emergency` | 108 dispatch console, live response map, case history |

---

## Quick start

### 1. Database

```bash
createdb sevasetu   # or: docker run -e POSTGRES_USER=sevasetu -e POSTGRES_PASSWORD=sevasetu -e POSTGRES_DB=sevasetu -p 5432:5432 postgres:16-alpine
```

### 2. Backend

```bash
cd backend
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.db.seed        # creates tables and loads realistic data
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

App: http://localhost:3000

### Docker (everything at once)

```bash
docker compose up --build
```

The backend container seeds the database on first boot (`SEED_ON_STARTUP=true`).

---

## Demo logins

Password for every account: `Seva@1234`

| Email | Role |
| --- | --- |
| `patient@sevasetu.in` | Patient |
| `asha@sevasetu.gov.in` | ASHA worker |
| `doctor@sevasetu.gov.in` | Doctor |
| `admin@sevasetu.gov.in` | Hospital admin |
| `dho@sevasetu.gov.in` | District Health Officer |
| `emergency@sevasetu.gov.in` | Emergency response |

---

## Seed data

`python -m app.db.seed` recreates the schema and loads a connected dataset: 15 government facilities (district hospitals, sub-district hospitals, urban health centres, PHCs, sub-centres), 40 doctors, 25 ASHA workers, 100 patients across localities, 20 ambulances, households, field visits, appointments, prescriptions, lab reports, medicine inventory with batch expiry, immunisation schedules, pregnancy records, disease surveillance cases, chats and notifications.

---

## API

All routes are versioned under `/api/v1`:

`auth` · `patient` · `asha` · `doctor` · `doctors` · `admin` · `appointments` · `hospitals` · `reports` · `chat` · `symptoms` · `ai` · `emergency` · `video` · `notifications`

Every response is Pydantic-validated. Interactive documentation is generated at `/docs`.

---

## AI features

Deterministic, explainable clinical logic in `backend/app/services/ai.py` — no external paid model required:

- symptom triage with urgency, likely conditions and suggested department
- patient risk scoring and health score breakdown
- pregnancy danger-sign alerts and ANC milestones
- medicine reminder generation from active prescriptions
- disease outbreak forecasting from weekly case velocity (drives the district heatmap)
- medical chatbot grounded in the patient's own record

---

## Project layout

```
backend/
  app/
    api/v1/routers/   # auth, patient, asha, doctor, admin, appointments, hospitals,
                      # reports, chat, symptoms, emergency, video, notifications
    core/             # settings, JWT + bcrypt security
    db/               # session, reference data, seeder
    models/           # SQLAlchemy models + enums
    schemas/          # Pydantic schemas
    services/         # AI + geospatial helpers
frontend/
  src/app/            # landing, auth, patient, asha, doctor, admin, emergency, chat, video
  src/components/     # UI primitives, layout shell, charts, Leaflet map
  src/lib/            # API client with refresh handling, auth context, nav, types, utils
```
