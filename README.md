# SevaSetu AI

<div align="center">

**Empowering Rural & Underserved Healthcare Delivery Through Digital Innovation, Explainable AI Triage & Real-Time Teleconsultation**

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python 3.13](https://img.shields.io/badge/Python-3.13-3776AB?style=flat&logo=python)](https://python.org/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql)](https://postgresql.org/)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P_Video-333333?style=flat&logo=webrtc)](https://webrtc.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-5.12-010101?style=flat&logo=socketdotio)](https://socket.io/)
[![TailwindCSS v4](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://docker.com/)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Key Features by Stakeholder](#-key-features-by-stakeholder)
  - [1. Patient Portal](#1-patient-portal-)
  - [2. ASHA Field Worker Portal](#2-asha-field-worker-portal-)
  - [3. Medical Officer / Doctor Portal](#3-medical-officer--doctor-portal-)
  - [4. Hospital Admin & District Health Officer (DHO)](#4-hospital-admin--district-health-officer-dho-)
  - [5. 108 Emergency Response System](#5-108-emergency-response-system-)
- [AI & Clinical Intelligence Engine](#-ai--clinical-intelligence-engine)
- [Real-Time Teleconsultation (WebRTC + Socket.IO)](#-real-time-teleconsultation-webrtc--socketio)
- [Technology Stack](#-technology-stack)
- [Project Directory Layout](#-project-directory-layout)
- [Getting Started & Local Setup](#-getting-started--local-setup)
  - [Prerequisites](#prerequisites)
  - [Option A: Docker Compose (Recommended)](#option-a-docker-compose-recommended)
  - [Option B: Manual Local Setup](#option-b-manual-local-setup)
- [Demo Credentials](#-demo-credentials)
- [API Documentation & Endpoints](#-api-documentation--endpoints)
- [Environment Variables](#-environment-variables)
- [License & Acknowledgements](#-license--acknowledgements)

---

## 🌟 Overview

**SevaSetu AI** is a digital public health platform engineered specifically for rural, remote, and underserved communities. It bridges the critical gap between grassroots community health workers (**ASHAs**), Primary & Community Health Centres (**PHCs/CHCs**), District Hospitals, the **108 Emergency Services**, and the **District Health Administration**.

By combining **explainable rule-based clinical intelligence**, **real-time WebRTC teleconsultation**, **geospatial disease outbreak surveillance**, and **field-ready workflows**, SevaSetu ensures that high-quality medical guidance reaches the last mile without requiring expensive hardware or paid proprietary cloud APIs.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (Next.js 15 + React 19)"]
        P[Patient Web / Mobile PWA]
        A[ASHA Field Portal]
        D[Doctor Telehealth Console]
        ADM[Admin & DHO Dashboard]
        EMG[108 Emergency Dispatch]
    end

    subgraph Gateway ["Reverse Proxy & Routing"]
        RT[FastAPI ASGI Router + CORS]
        SIO[python-socketio ASGI Signaling]
    end

    subgraph ServiceLayer ["Backend Core (FastAPI / Python 3.13)"]
        AuthSvc[JWT Auth & RBAC]
        AISvc[AI Clinical Engine]
        TeleSvc[WebRTC Signaling Service]
        SurvSvc[Geospatial Disease Surveillance]
        EMGSvc[108 Dispatch & SOS Engine]
    end

    subgraph DataLayer ["Data & Storage Layer"]
        PG[(PostgreSQL 16 Database)]
        LocalFS[Uploaded Prescriptions / Reports]
    end

    P & A & D & ADM & EMG -->|HTTP / REST API| RT
    P & D -->|WebRTC Signaling / WebSocket| SIO

    RT --> AuthSvc
    RT --> AISvc
    RT --> SurvSvc
    RT --> EMGSvc
    SIO --> TeleSvc

    AuthSvc & AISvc & SurvSvc & EMGSvc --> PG
    RT --> LocalFS
```

---

## 🎯 Key Features by Stakeholder

### 1. Patient Portal (`/patient`)
- **AI Symptom Triage**: Explainable assessment evaluating symptom urgency, differential risks, and suggested department.
- **Teleconsultation (WebRTC)**: Direct peer-to-peer video & audio calls with doctors.
- **Digital Health Card**: ABHA-style unified health identity card with verifiable QR code.
- **OPD & Telehealth Booking**: Schedule appointments with PHCs, CHCs, and District Hospitals.
- **Prescriptions & Reminders**: Real-time access to digital prescriptions with automated adherence schedules.
- **Maternal & Child Tracking**: ANC milestone reminders, danger sign detection, and immunisation schedules.
- **One-Tap SOS Emergency**: Instant 108 dispatch trigger with geolocation capture.
- **Health Records Vault**: Secure storage for diagnostic reports, blood tests, and imaging.

### 2. ASHA Field Worker Portal (`/asha`)
- **Household & Census Management**: Track families, socio-demographics, and vulnerable members.
- **Daily Target & Visit Planner**: Auto-prioritised home visit schedules.
- **Maternal ANC/PNC Tracking**: High-risk pregnancy flagging, blood pressure/anaemia monitoring.
- **Child Immunisation**: Track national vaccination calendar (BCG, OPV, Pentavalent, Measles/MR).
- **Institutional Referral Pipeline**: Refer emergency/critical patients directly to doctors with preliminary vitals.
- **Offline Sync**: Field-resilient caching for intermittent connectivity.

### 3. Medical Officer / Doctor Portal (`/doctor`)
- **Live OPD Queue**: Unified stream of walk-in and teleconsultation appointments.
- **Integrated Video Consultation Room**: WebRTC calling with live clinical chart overlay.
- **Digital Prescription Writer**: Integrated medicine formulary with batch and dosage assistance.
- **Diagnostic Lab Orders**: Issue lab requisitions and inspect uploaded results directly.
- **Patient Electronic Health Record (EHR)**: Full medical history, past visits, and family health context.

### 4. Hospital Admin & District Health Officer (DHO) (`/admin`)
- **District Health Analytics**: Real-time OPD counts, bed occupancy, and immunisation rates.
- **Geospatial Disease Surveillance**: Interactive Leaflet heatmap displaying active vector-borne, water-borne, and respiratory outbreaks with velocity-based forecasting.
- **Facility & Bed Inventory**: Track ICU, oxygen, and general beds across PHCs, CHCs, and District Hospitals.
- **Workforce Management**: Monitor doctor duty rosters and ASHA field coverage.
- **Automated District Reports**: Generate statutory public health reports and export aggregated data.

### 5. 108 Emergency Response System (`/emergency`)
- **Live SOS Dispatch Console**: Real-time incoming emergency alerts with caller location.
- **Interactive Map Dispatch**: Locate nearest available ambulances and assign response teams.
- **Status Lifecycle Tracking**: Transition incidents from *Dispatched* $\rightarrow$ *En Route* $\rightarrow$ *Arrived* $\rightarrow$ *Resolved*.

---

## 🧠 AI & Clinical Intelligence Engine

The AI subsystem (`backend/app/services/ai.py`) is built using **deterministic, explainable clinical logic** requiring zero external paid API subscriptions:

| Feature | Logic & Methodology | Clinical Benefit |
| --- | --- | --- |
| **Symptom Triage** | Multi-symptom severity weighting & red-flag keyword triggers | Categorises cases into Low, Moderate, High, or Emergency with recommended department. |
| **Pregnancy Risk Evaluator** | Gestational age computation + ANC milestone & danger-sign evaluation | Flags pre-eclampsia, gestational diabetes, and severe anaemia early. |
| **Adherence Generator** | Parses active prescriptions into morning/afternoon/night reminder slots | Reduces missed doses in chronic illness management. |
| **Epidemiological Forecasting** | Calculates 7-day disease velocity across geographical clusters | Identifies emerging hot zones before they develop into full-scale outbreaks. |
| **Contextual Health Chatbot** | Patient record grounding with safe clinical guidance rules | Provides 24/7 empathetic answers in plain language. |

---

## 📹 Real-Time Teleconsultation (WebRTC + Socket.IO)

The platform provides a peer-to-peer video consultation pipeline:

- **WebRTC Core**: Direct media stream transmission (audio/video) with public STUN servers for robust NAT traversal.
- **ASGI Native Signaling**: `python-socketio` mounted directly inside the FastAPI ASGI stack, handling SDP Offer/Answer exchanges and ICE Candidate handshakes.
- **Split-Screen Layout**: 50/50 video grid layout with fallback placeholders and active connection state management.
- **Reverse Proxy Resilience**: Configured for standard headers (`X-Forwarded-Proto`, `X-Forwarded-Host`) and strict CORS origins.

---

## 💻 Technology Stack

| Domain | Technology | Key Libraries / Frameworks |
| --- | --- | --- |
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript | TailwindCSS v4, Radix UI Primitives, Lucide Icons, Framer Motion, TanStack Query, React Hook Form, Recharts, Leaflet / React-Leaflet, Sonner, Socket.IO Client |
| **Backend** | FastAPI, Python 3.13 | Uvicorn, SQLAlchemy 2 (ORM), Pydantic v2, Python-SocketIO, Python-Jose (JWT), Passlib / Bcrypt |
| **Database** | PostgreSQL 16 | Psycopg2-binary, Relational schema with seed datasets |
| **Real-time** | WebSockets / WebRTC | Socket.IO signaling, WebRTC P2P media channels |
| **DevOps** | Docker, Docker Compose | Multi-stage builds, automated health checks & database seeding |

---

## 📂 Project Directory Layout

```
SevaSetu/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── router.py             # Root v1 API router aggregation
│   │   │   ├── sockets.py            # Socket.IO event handlers for WebRTC & chat
│   │   │   └── routers/              # Modular REST route controllers
│   │   │       ├── admin.py          # District analytics, hospitals, ambulances, inventory
│   │   │       ├── appointments.py   # OPD & teleconsultation bookings
│   │   │       ├── asha.py           # Households, visits, surveys, immunisations
│   │   │       ├── auth.py           # Login, registration, token refresh
│   │   │       ├── chat.py           # Real-time messaging
│   │   │       ├── doctors.py        # Prescriptions, lab requests, queue
│   │   │       ├── emergency.py      # 108 SOS dispatch and incident management
│   │   │       ├── hospitals.py      # Facility directory and bed availability
│   │   │       ├── notifications.py  # Push and in-app alerts
│   │   │       ├── patients.py       # Patient health record and vitals
│   │   │       ├── reports.py        # Diagnostic lab reports upload and retrieval
│   │   │       ├── symptoms.py       # AI symptom triage endpoints
│   │   │       └── video.py          # Video session token and state verification
│   │   ├── core/                     # Application configuration and JWT security
│   │   ├── db/                       # Session management and database seeder
│   │   ├── models/                   # SQLAlchemy declarative models
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   ├── services/                 # AI clinical logic and geospatial calculations
│   │   └── main.py                   # FastAPI + Socket.IO ASGI application entrypoint
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                      # Next.js App Router pages
│   │   │   ├── (auth)/               # Login & Registration flows
│   │   │   ├── admin/                # Admin & DHO analytics, inventory, heatmap
│   │   │   ├── asha/                 # ASHA household visits, immunisations, targets
│   │   │   ├── chat/                 # Doctor-Patient messaging interface
│   │   │   ├── doctor/               # Doctor OPD queue, prescriptions, EHR
│   │   │   ├── emergency/            # 108 Dispatch console
│   │   │   ├── patient/              # Patient portal & health dashboard
│   │   │   └── video/                # WebRTC video consultation room
│   │   ├── components/               # Reusable UI widgets, layout shells, charts, maps
│   │   ├── lib/                      # API client, Auth Context, TypeScript types, utils
│   │   └── styles/
│   ├── Dockerfile
│   ├── package.json
│   └── next.config.ts
├── docker-compose.yml                # Unified multi-container orchestrator
└── README.md
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: v20.x or later ([Download](https://nodejs.org/))
- **Python**: v3.11, v3.12, or v3.13 ([Download](https://python.org/))
- **PostgreSQL**: v16.x or Docker
- **Docker & Docker Compose** *(optional, for containerized run)*

---

### Option A: Docker Compose (Recommended)

Run the entire platform (PostgreSQL database, FastAPI backend, and Next.js frontend) with a single command:

```bash
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/docs
- *Note: Database seeding runs automatically on first container startup.*

---

### Option B: Manual Local Setup

#### 1. Database Setup

Create a PostgreSQL database named `sevasetu`:

```bash
# Using PostgreSQL CLI:
createdb sevasetu

# Or using Docker:
docker run -d --name sevasetu-db -e POSTGRES_USER=sevasetu -e POSTGRES_PASSWORD=sevasetu -e POSTGRES_DB=sevasetu -p 5432:5432 postgres:16-alpine
```

#### 2. Backend Setup

```bash
cd backend

# Create and activate Python virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

# Seed database with realistic demonstration data
python -m app.db.seed

# Start the FastAPI + Socket.IO server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API documentation will be accessible at: **http://localhost:8000/docs**

#### 3. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```

The web application will be accessible at: **http://localhost:3000**

---

## 🔑 Demo Credentials

All seeded accounts share the same default password: **`Seva@1234`**

| Role | Email | Access Path | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Patient** | `patient@sevasetu.in` | `/patient` | Symptom triage, appointments, prescriptions, health card, SOS |
| **ASHA Worker** | `asha@sevasetu.gov.in` | `/asha` | Household surveys, ANC/PNC tracking, child immunisations |
| **Doctor** | `doctor@sevasetu.gov.in` | `/doctor` | Live OPD queue, digital prescriptions, video consultation |
| **Hospital Admin** | `admin@sevasetu.gov.in` | `/admin` | Bed capacity, pharmacy inventory, doctor duty allocation |
| **District Health Officer** | `dho@sevasetu.gov.in` | `/admin` | District surveillance, disease heatmap, policy reports |
| **108 Emergency** | `emergency@sevasetu.gov.in` | `/emergency` | Live SOS dispatch, ambulance coordination, response map |

---

## 📡 API Documentation & Endpoints

All backend endpoints are prefixed under `/api/v1` and documented interactively via Swagger UI (`/docs`):

| Endpoint Group | Route Prefix | Description |
| :--- | :--- | :--- |
| `auth` | `/api/v1/auth` | User login, registration, token refresh, current user profile |
| `patients` | `/api/v1/patients` | Vitals, immunisation records, pregnancy history, health cards |
| `asha` | `/api/v1/asha` | Households, field visits, survey records, referrals, targets |
| `doctors` | `/api/v1/doctors` | Doctor profiles, OPD queues, prescriptions, lab orders |
| `appointments` | `/api/v1/appointments` | Booking, rescheduling, and status management |
| `hospitals` | `/api/v1/hospitals` | Facility locations, bed availability, contact details |
| `symptoms` | `/api/v1/symptoms` | AI symptom checking and clinical urgency scoring |
| `reports` | `/api/v1/reports` | Medical file upload, diagnostic reports vault |
| `chat` | `/api/v1/chat` | One-on-one and consultation chat message history |
| `emergency` | `/api/v1/emergency` | 108 SOS trigger, active emergency dispatch console |
| `video` | `/api/v1/video` | Video consultation session initialization & token validation |
| `notifications` | `/api/v1/notifications`| User alerts, reminder broadcasts, appointment updates |

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql+psycopg2://sevasetu:sevasetu@localhost:5432/sevasetu` | PostgreSQL database connection string |
| `SECRET_KEY` | `sevasetu-dev-secret-change-me` | Secret key for signing JWT tokens |
| `ENVIRONMENT` | `development` | Environment mode (`development` / `production`) |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated list of allowed frontend origins |
| `UPLOAD_DIR` | `uploads` | Directory path for storing uploaded reports and images |
| `SEED_ON_STARTUP`| `false` *(set to `true` in Docker)* | Auto-seeds database on server boot if empty |

### Frontend (`frontend/.env.local`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Base URL of the backend FastAPI server |

---

## 📄 License & Acknowledgements

This project is built to strengthen public healthcare access and digital infrastructure in rural and underserved areas.

Designed and developed with ❤️ for frontline health workers, doctors, and rural citizens.
